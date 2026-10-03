/**
 * BOUNDLESS SOCIETY — TRIP CAPACITY, WAITLIST & SEAT ALLOCATION ENGINE
 * 
 * CORE PRINCIPLES:
 * 1. REGISTRATION != SEAT: All registrations in tripRegistrations/{tripId}_{uid} are permanent.
 * 2. ZERO DELETIONS: A trip with capacity C and N > C registrations preserves all N registrations.
 * 3. TRANSACTION SAFETY (Anti-Overselling): Seat allocation and waitlist promotions execute in
 *    Firestore transactions to prevent race conditions when concurrent admins approve.
 * 4. FIRST-CLASS WAITLIST: Sequential FIFO order (waitlistPosition = 1, 2, 3...) assigned by server.
 * 5. AUTOMATIC PROMOTION: When an approved seat is vacated (withdraw, decline, reject, revoke),
 *    the next eligible waitlisted student is atomically promoted to approved_to_pay.
 * 6. ZERO HASHING: Uses natural keys (tripId, uid, deterministic queue IDs).
 */

import { adminDb } from "./firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { buildDeterministicJobId, enqueueDurableJob } from "./durableQueue";
import { recordAuditLog, AdminContext } from "./adminAuth";
import { invalidateTripCache } from "./tripCache";

export interface SeatAllocationResult {
  allocated: boolean;
  alreadyAllocated?: boolean;
  status: "approved_to_pay" | "waitlisted" | "mail_sent" | string;
  waitlistPosition?: number;
  availableSeats: number;
  totalJoined: number;
  totalSeats: number;
  promoted?: boolean;
}

export interface PromotionResult {
  promoted: boolean;
  promotedStudent?: {
    uid: string;
    email: string;
    name: string;
    studentId: string;
    waitlistPosition: number;
    regDocId: string;
  };
  remainingWaitlistCount: number;
}

/**
 * Atomically checks capacity and allocates either a confirmed seat or a waitlist position.
 * Must run inside a Firestore transaction to ensure race-safety between concurrent approvals.
 */
export async function allocateSeatOrWaitlistTransaction(params: {
  transaction?: FirebaseFirestore.Transaction;
  tripId: string;
  uid: string;
  regDocId: string;
  gender?: string;
  studentName?: string;
  studentId?: string;
  studentEmail?: string;
  adminEmail?: string;
}): Promise<SeatAllocationResult> {
  if (!params.transaction) {
    return adminDb.runTransaction(async (t) => {
      return allocateSeatOrWaitlistTransaction({ ...params, transaction: t });
    });
  }

  const {
    transaction,
    tripId,
    uid,
    regDocId,
    gender = "unknown",
    adminEmail = "system",
  } = params;

  const tripRef = adminDb.collection("trips").doc(tripId);
  const regRef = adminDb.collection("tripRegistrations").doc(regDocId);

  const [tripSnap, regSnap] = await Promise.all([
    transaction.get(tripRef),
    transaction.get(regRef),
  ]);

  if (!tripSnap.exists) {
    throw new Error(`Trip ${tripId} not found`);
  }
  if (!regSnap.exists) {
    throw new Error(`Registration ${regDocId} not found`);
  }

  const tripData = tripSnap.data() || {};
  const regData = regSnap.data() || {};

  const totalSeats = Number(tripData.totalSeats || 50);
  const currentTotalJoined = Number(tripData.totalJoined || 0);
  const femaleJoined = Number(tripData.femaleJoined || 0);
  const maleJoined = Number(tripData.maleJoined || 0);
  const femaleReservedSeats = Number(tripData.femaleReservedSeats || 0);

  const cleanGender = (gender || regData.gender || "unknown").toLowerCase().trim();
  const isFemale = cleanGender === "female";
  const isMale = cleanGender === "male";

  // Check available seats
  const availableSeats = Math.max(0, totalSeats - currentTotalJoined);

  // If already confirmed, idempotent no-op
  const currentStatus = regData.status || "registered";
  if (currentStatus === "approved_to_pay" || currentStatus === "mail_sent" || currentStatus === "paid") {
    return {
      allocated: true,
      alreadyAllocated: true,
      status: currentStatus,
      availableSeats,
      totalJoined: currentTotalJoined,
      totalSeats,
    };
  }

  const now = FieldValue.serverTimestamp();

  // If seats are available, allocate seat
  if (availableSeats > 0) {
    const newTotalJoined = currentTotalJoined + 1;
    const newFemaleJoined = isFemale ? femaleJoined + 1 : femaleJoined;
    const newMaleJoined = isMale ? maleJoined + 1 : maleJoined;

    const tripUpdate: Record<string, any> = {
      totalJoined: newTotalJoined,
      femaleJoined: newFemaleJoined,
      maleJoined: newMaleJoined,
      updatedAt: now,
    };

    // If waitlisted before, decrement waitlist count
    if (currentStatus === "waitlisted") {
      tripUpdate.waitlistedCount = Math.max(0, Number(tripData.waitlistedCount || 0) - 1);
    }

    transaction.update(tripRef, tripUpdate);

    transaction.update(regRef, {
      status: "approved_to_pay",
      waitlistPosition: FieldValue.delete(),
      approvedAt: now,
      approvedBy: adminEmail,
      updatedAt: now,
    });

    return {
      allocated: true,
      status: "approved_to_pay",
      availableSeats: availableSeats - 1,
      totalJoined: newTotalJoined,
      totalSeats,
    };
  }

  // NO SEATS AVAILABLE → Assign deterministic FIFO waitlist position
  const currentWaitlistCounter = Number(tripData.waitlistCounter || 0);
  const nextWaitlistPosition = currentWaitlistCounter + 1;
  const currentWaitlistedCount = Number(tripData.waitlistedCount || 0);

  // If already waitlisted, keep existing position
  if (currentStatus === "waitlisted" && regData.waitlistPosition) {
    return {
      allocated: false,
      status: "waitlisted",
      waitlistPosition: Number(regData.waitlistPosition),
      availableSeats: 0,
      totalJoined: currentTotalJoined,
      totalSeats,
    };
  }

  transaction.update(tripRef, {
    waitlistCounter: nextWaitlistPosition,
    waitlistedCount: currentWaitlistedCount + 1,
    updatedAt: now,
  });

  transaction.update(regRef, {
    status: "waitlisted",
    waitlistPosition: nextWaitlistPosition,
    waitlistedAt: now,
    updatedAt: now,
  });

  return {
    allocated: false,
    status: "waitlisted",
    waitlistPosition: nextWaitlistPosition,
    availableSeats: 0,
    totalJoined: currentTotalJoined,
    totalSeats,
  };
}

/**
 * Atomically releases an approved seat (due to withdrawal, rejection, decline, or revoke)
 * and automatically promotes the next eligible waitlisted student in FIFO order.
 */
export async function releaseSeatAndPromoteWaitlist(params: {
  tripId: string;
  regDocId: string;
  newStatus: "rejected" | "withdrawn" | "declined" | "registered" | "action_required";
  reason?: string;
  adminEmail?: string;
}): Promise<{
  released: boolean;
  promoted: boolean;
  promotedRegDocId?: string;
  promotedStudent?: PromotionResult["promotedStudent"];
  promotion: PromotionResult;
}> {
  const { tripId, regDocId, newStatus, reason = "", adminEmail = "system" } = params;

  const tripRef = adminDb.collection("trips").doc(tripId);
  const regRef = adminDb.collection("tripRegistrations").doc(regDocId);

  const txResult = await adminDb.runTransaction(async (transaction) => {
    let promotedStudentInfo: PromotionResult["promotedStudent"] = undefined;
    let remainingWaitlistCount = 0;

    const [tripSnap, regSnap] = await Promise.all([
      transaction.get(tripRef),
      transaction.get(regRef),
    ]);

    if (!tripSnap.exists) throw new Error(`Trip ${tripId} not found`);
    if (!regSnap.exists) throw new Error(`Registration ${regDocId} not found`);

    const tripData = tripSnap.data() || {};
    const regData = regSnap.data() || {};
    const oldStatus = regData.status || "registered";
    const wasConfirmed = oldStatus === "approved_to_pay" || oldStatus === "mail_sent" || oldStatus === "paid";
    const wasWaitlisted = oldStatus === "waitlisted";
    const regGender = (regData.gender || "unknown").toLowerCase().trim();

    const now = FieldValue.serverTimestamp();

    // 1. Update the target registration to newStatus (NEVER DELETE IT)
    const regUpdate: Record<string, any> = {
      status: newStatus,
      updatedAt: now,
      statusChangedAt: now,
      statusChangedBy: adminEmail,
    };
    if (reason) regUpdate.issueText = reason;
    if (newStatus === "withdrawn") regUpdate.withdrawnAt = now;
    if (newStatus === "rejected") regUpdate.rejectedAt = now;
    if (wasWaitlisted) regUpdate.waitlistPosition = FieldValue.delete();

    transaction.update(regRef, regUpdate);

    // If the student was only waitlisted, simply decrement waitlistedCount
    if (wasWaitlisted) {
      const currentWaitlistedCount = Math.max(0, Number(tripData.waitlistedCount || 0) - 1);
      transaction.update(tripRef, {
        waitlistedCount: currentWaitlistedCount,
        updatedAt: now,
      });
      return {
        promotedStudentInfo: undefined,
        remainingWaitlistCount: currentWaitlistedCount,
      };
    }

    // If the student was not confirmed, no seat is freed
    if (!wasConfirmed) {
      return {
        promotedStudentInfo: undefined,
        remainingWaitlistCount: Number(tripData.waitlistedCount || 0),
      };
    }

    // The student WAS confirmed -> a seat is freed!
    let totalJoined = Math.max(0, Number(tripData.totalJoined || 0) - 1);
    let femaleJoined = regGender === "female"
      ? Math.max(0, Number(tripData.femaleJoined || 0) - 1)
      : Number(tripData.femaleJoined || 0);
    let maleJoined = regGender === "male"
      ? Math.max(0, Number(tripData.maleJoined || 0) - 1)
      : Number(tripData.maleJoined || 0);

    // 2. Find next eligible waitlist candidate: status === "waitlisted" ordered by waitlistPosition asc
    const tripRegsSnap = await adminDb
      .collection("tripRegistrations")
      .where("tripId", "==", tripId)
      .get();

    const waitlistedCandidates = tripRegsSnap.docs
      .filter((d) => (d.data().status || "").trim() === "waitlisted")
      .sort((a, b) => (Number(a.data().waitlistPosition) || 999999) - (Number(b.data().waitlistPosition) || 999999));

    if (waitlistedCandidates.length > 0) {
      const candidateDoc = waitlistedCandidates[0];
      const candidateRef = candidateDoc.ref;
      const candidateData = candidateDoc.data() || {};
      const candidateGender = (candidateData.gender || "unknown").toLowerCase().trim();

      // Atomically promote this candidate
      totalJoined += 1;
      if (candidateGender === "female") femaleJoined += 1;
      else if (candidateGender === "male") maleJoined += 1;

      const newWaitlistedCount = Math.max(0, Number(tripData.waitlistedCount || 0) - 1);

      transaction.update(tripRef, {
        totalJoined,
        femaleJoined,
        maleJoined,
        waitlistedCount: newWaitlistedCount,
        updatedAt: now,
      });

      transaction.update(candidateRef, {
        status: "approved_to_pay",
        waitlistPosition: FieldValue.delete(),
        promotedFromWaitlist: true,
        promotedAt: now,
        approvedAt: now,
        updatedAt: now,
      });

      remainingWaitlistCount = newWaitlistedCount;

      promotedStudentInfo = {
        uid: candidateData.uid || candidateDoc.id.split("_")[1] || "",
        email: candidateData.email || "",
        name: candidateData.name || candidateData.studentName || candidateData.formData?.["Full Name"] || "Student",
        studentId: candidateData.studentId || candidateData.formData?.["Roll Number"] || candidateData.formData?.["Student ID Number"] || "",
        waitlistPosition: Number(candidateData.waitlistPosition || 1),
        regDocId: candidateDoc.id,
      };
    } else {
      // No waitlisted student to promote
      transaction.update(tripRef, {
        totalJoined,
        femaleJoined,
        maleJoined,
        updatedAt: now,
      });
      remainingWaitlistCount = 0;
    }

    return {
      promotedStudentInfo,
      remainingWaitlistCount,
    };
  });

  const { promotedStudentInfo, remainingWaitlistCount } = txResult;

  invalidateTripCache(tripId);

  // If a student was promoted, enqueue their approval email and record audit log
  if (promotedStudentInfo) {
    const tripSnap = await adminDb.collection("trips").doc(tripId).get();
    const tripData = tripSnap.data() || {};

    const jobId = buildDeterministicJobId("approval_email", [tripId, promotedStudentInfo.uid, "promoted"]);
    await enqueueDurableJob({
      jobId,
      jobType: "approval_email",
      payload: {
        tripId,
        uid: promotedStudentInfo.uid,
        email: promotedStudentInfo.email,
        studentName: promotedStudentInfo.name,
        studentId: promotedStudentInfo.studentId,
        trip: tripData,
        isPromotion: true,
      },
    });

    await recordAuditLog(
      { uid: "system", email: adminEmail },
      "WAITLIST_PROMOTED",
      "trip_registration",
      promotedStudentInfo.regDocId,
      "success",
      {
        tripId,
        studentName: promotedStudentInfo.name,
        studentEmail: promotedStudentInfo.email,
        originalWaitlistPosition: promotedStudentInfo.waitlistPosition,
        promotedReason: `Seat vacated by registration ${regDocId} (${newStatus})`,
      }
    );
  }

  return {
    released: true,
    promoted: Boolean(promotedStudentInfo),
    promotedRegDocId: promotedStudentInfo?.regDocId,
    promotedStudent: promotedStudentInfo,
    promotion: {
      promoted: Boolean(promotedStudentInfo),
      promotedStudent: promotedStudentInfo,
      remainingWaitlistCount,
    },
  };
}

/**
 * Handles capacity adjustment on a trip.
 * - When capacity increases (e.g. 50 -> 60): Promotes up to (newCapacity - totalJoined) waitlisted students in FIFO order.
 * - When capacity decreases (e.g. 60 -> 50): NEVER destructively deletes or rejects students;
 *   preserves all approved registrations and marks the trip overCapacity: true if needed.
 */
export async function adjustTripCapacity(params: {
  tripId: string;
  newCapacity: number;
  adminContext?: AdminContext | null;
}): Promise<{
  success: boolean;
  promotedCount: number;
  overCapacity: boolean;
  totalSeats: number;
  totalJoined: number;
}> {
  const { tripId, newCapacity, adminContext } = params;
  if (!tripId || newCapacity < 0) {
    throw new Error("Invalid tripId or capacity");
  }

  const adminEmail = adminContext?.email || "admin";
  const tripRef = adminDb.collection("trips").doc(tripId);

  let promotedStudents: Array<any> = [];
  let isOverCapacity = false;
  let finalJoined = 0;

  await adminDb.runTransaction(async (transaction) => {
    const tripSnap = await transaction.get(tripRef);
    if (!tripSnap.exists) throw new Error(`Trip ${tripId} not found`);

    const tripData = tripSnap.data() || {};
    const oldCapacity = Number(tripData.totalSeats || 0);
    const currentJoined = Number(tripData.totalJoined || 0);

    const now = FieldValue.serverTimestamp();

    if (newCapacity < currentJoined) {
      // Over-capacity condition: Preserve existing approved students, do NOT delete or cancel anyone
      isOverCapacity = true;
      finalJoined = currentJoined;
      transaction.update(tripRef, {
        totalSeats: newCapacity,
        overCapacity: true,
        updatedAt: now,
      });
      return;
    }

    isOverCapacity = false;
    const availableSeats = newCapacity - currentJoined;

    if (availableSeats > 0) {
      // Query eligible waitlist registrations in FIFO order
      const tripRegsSnap = await adminDb
        .collection("tripRegistrations")
        .where("tripId", "==", tripId)
        .get();

      const eligibleWaitlistedDocs = tripRegsSnap.docs
        .filter((d) => (d.data().status || "").trim() === "waitlisted")
        .sort((a, b) => (Number(a.data().waitlistPosition) || 999999) - (Number(b.data().waitlistPosition) || 999999))
        .slice(0, availableSeats);

      let newlyPromotedCount = 0;
      let addedFemale = 0;
      let addedMale = 0;

      for (const doc of eligibleWaitlistedDocs) {
        const d = doc.data() || {};
        const g = (d.gender || "unknown").toLowerCase().trim();
        if (g === "female") addedFemale++;
        else if (g === "male") addedMale++;

        transaction.update(doc.ref, {
          status: "approved_to_pay",
          waitlistPosition: FieldValue.delete(),
          promotedFromWaitlist: true,
          promotedAt: now,
          approvedAt: now,
          updatedAt: now,
        });

        promotedStudents.push({
          uid: d.uid || doc.id.split("_")[1] || "",
          email: d.email || "",
          name: d.name || d.studentName || d.formData?.["Full Name"] || "Student",
          studentId: d.studentId || d.formData?.["Roll Number"] || "",
          regDocId: doc.id,
        });

        newlyPromotedCount++;
      }

      const newTotalJoined = currentJoined + newlyPromotedCount;
      finalJoined = newTotalJoined;
      const currentWaitlistedCount = Number(tripData.waitlistedCount || 0);

      transaction.update(tripRef, {
        totalSeats: newCapacity,
        totalJoined: newTotalJoined,
        femaleJoined: Number(tripData.femaleJoined || 0) + addedFemale,
        maleJoined: Number(tripData.maleJoined || 0) + addedMale,
        waitlistedCount: Math.max(0, currentWaitlistedCount - newlyPromotedCount),
        overCapacity: false,
        updatedAt: now,
      });
    } else {
      finalJoined = currentJoined;
      transaction.update(tripRef, {
        totalSeats: newCapacity,
        overCapacity: false,
        updatedAt: now,
      });
    }
  });

  invalidateTripCache(tripId);

  // Enqueue approval emails for newly promoted students
  if (promotedStudents.length > 0) {
    const tripSnap = await adminDb.collection("trips").doc(tripId).get();
    const tripData = tripSnap.data() || {};

    for (const student of promotedStudents) {
      const jobId = buildDeterministicJobId("approval_email", [tripId, student.uid, "promoted_capacity"]);
      await enqueueDurableJob({
        jobId,
        jobType: "approval_email",
        payload: {
          tripId,
          uid: student.uid,
          email: student.email,
          studentName: student.name,
          studentId: student.studentId,
          trip: tripData,
          isPromotion: true,
        },
      });

      await recordAuditLog(
        { uid: "system", email: adminEmail },
        "WAITLIST_PROMOTED_CAPACITY_INCREASE",
        "trip_registration",
        student.regDocId,
        "success",
        {
          tripId,
          studentName: student.name,
          newCapacity,
        }
      );
    }
  }

  await recordAuditLog(
    { uid: "system", email: adminEmail },
    "TRIP_CAPACITY_CHANGED",
    "trip",
    tripId,
    "success",
    {
      newCapacity,
      promotedCount: promotedStudents.length,
      overCapacity: isOverCapacity,
    }
  );

  return {
    success: true,
    promotedCount: promotedStudents.length,
    overCapacity: isOverCapacity,
    totalSeats: newCapacity,
    totalJoined: finalJoined,
  };
}

/**
 * Enqueues a dedicated "Trip Waitlist Confirmation" email via the durable queue.
 */
export async function enqueueWaitlistNotificationEmail(params: {
  tripId: string;
  uid: string;
  email?: string;
  studentEmail?: string;
  studentName: string;
  tripName: string;
  waitlistPosition: number;
  startDate?: string;
  tripStartDate?: string;
  endDate?: string;
}): Promise<string> {
  const { tripId, uid, studentName, tripName, waitlistPosition } = params;
  const email = params.email || params.studentEmail || "";
  const startDate = params.startDate || params.tripStartDate || null;
  const endDate = params.endDate || null;
  const jobId = `waitlist_email_${tripId}_${uid}`;

  await enqueueDurableJob({
    jobId,
    jobType: "custom",
    payload: {
      action: "send_waitlist_email",
      tripId,
      uid,
      email,
      studentName,
      tripName,
      waitlistPosition,
      startDate,
      endDate,
    },
  });

  return jobId;
}
