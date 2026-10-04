/**
 * BOUNDLESS SOCIETY — PERMANENT TRIP HISTORY & COMPLETION SYSTEM
 * 
 * Invariants:
 * 1. ZERO HASHING: Uses natural keys (tripId, uid).
 * 2. NON-DESTRUCTIVE: Completing a trip preserves trips/{tripId} and tripRegistrations/{tripId}_{uid}.
 * 3. IDEMPOTENT: Running completion twice updates existing previousTripRecords without duplication.
 * 4. STRICT ACCESS: Operations require administrator authorization with audit logging.
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { AdminContext, recordAuditLog } from "@/lib/adminAuth";
import { invalidateTripCache } from "@/lib/tripCache";
import { invalidateStudentDirectoryCache } from "./studentDirectory";

export interface CompletedTripRecord {
  tripId: string;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  completedAt: string;
  participantCount: number;
  approvedCount: number;
  femaleCount: number;
  maleCount: number;
  totalRegistered: number;
  coordinators: Array<any>;
  coordinatorSummary: string;
  fee: number;
  coverImage: string;
  images: Array<any>;
  itinerary: Array<any>;
  faqs: Array<any>;
  description: string;
  status: "completed";
  createdAt: any;
  updatedAt: any;
}

export interface HistoricalTripParticipant {
  uid: string;
  studentId: string;
  name: string;
  email: string;
  gender: string;
  status: string;
  registeredAt: string | null;
  paymentVerifiedAt: string | null;
  phone?: string;
  profileLink: string;
}

/**
 * Idempotently mark a trip as completed and create/update previousTripRecords/{tripId}.
 * Original trips/{tripId} and tripRegistrations/{tripId}_{uid} are strictly preserved.
 */
export async function completeTripAndRecordHistory(
  tripId: string,
  admin?: AdminContext | null
): Promise<{ success: boolean; record: CompletedTripRecord }> {
  if (!tripId || typeof tripId !== "string") {
    throw new Error("Invalid tripId provided for completion");
  }

  const tripRef = adminDb.collection("trips").doc(tripId);
  const tripSnap = await tripRef.get();

  if (!tripSnap.exists) {
    throw new Error(`Trip ${tripId} not found in database`);
  }

  const tripData = tripSnap.data() || {};

  // 1. Fetch canonical and legacy registrations for this trip in parallel
  const [regSnap, legacyRegSnap] = await Promise.all([
    adminDb.collection("tripRegistrations").where("tripId", "==", tripId).get(),
    adminDb.collection("user-registrations").where("tripId", "==", tripId).get(),
  ]);

  const participantsMap = new Map<string, {
    uid: string;
    studentId: string;
    name: string;
    email: string;
    gender: string;
    status: string;
    submittedAt: any;
    paymentVerifiedAt: any;
  }>();

  for (const doc of regSnap.docs) {
    const data = doc.data() || {};
    const uid = data.uid || doc.id.split("_")[1] || "";
    const email = data.email || "";
    const key = uid || email || doc.id;

    participantsMap.set(key, {
      uid,
      studentId: data.studentId || data.formData?.["Roll Number"] || data.formData?.["Student ID Number"] || "",
      name: data.name || data.studentName || data.formData?.["Full Name"] || "Student",
      email,
      gender: data.gender || "unknown",
      status: data.status || "registered",
      submittedAt: data.submittedAt || null,
      paymentVerifiedAt: data.paymentVerifiedAt || null,
    });
  }

  for (const doc of legacyRegSnap.docs) {
    const data = doc.data() || {};
    const uid = data.uid || "";
    const email = data.email || "";
    const key = uid || email || doc.id;

    if (!participantsMap.has(key)) {
      participantsMap.set(key, {
        uid,
        studentId: data.studentId || data.formData?.["Roll Number"] || data.formData?.["Student ID Number"] || "",
        name: data.name || data.studentName || data.formData?.["Full Name"] || "Student",
        email,
        gender: data.gender || "unknown",
        status: data.status || "registered",
        submittedAt: data.submittedAt || null,
        paymentVerifiedAt: data.paymentVerifiedAt || null,
      });
    }
  }

  const allRegistrations = Array.from(participantsMap.values());
  const approvedStatuses = new Set(["approved_to_pay", "mail_sent", "paid"]);
  
  const approvedParticipants = allRegistrations.filter((r) => 
    approvedStatuses.has(r.status.toLowerCase().trim())
  );

  let femaleCount = 0;
  let maleCount = 0;

  approvedParticipants.forEach((p) => {
    const g = String(p.gender).toLowerCase().trim();
    if (g.startsWith("f")) femaleCount++;
    else if (g.startsWith("m")) maleCount++;
  });

  const coordinators = Array.isArray(tripData.coordinators) ? tripData.coordinators : [];
  const coordNames = coordinators
    .map((c: any) => (typeof c === "object" && c !== null ? c.name : String(c)))
    .filter(Boolean)
    .join(", ");

  const now = FieldValue.serverTimestamp();
  const completedAtIso = new Date().toISOString();

  // Images resolution
  const tripImages = Array.isArray(tripData.images) ? tripData.images : [];
  let coverImage = "";
  if (tripImages.length > 0) {
    coverImage = typeof tripImages[0] === "string" ? tripImages[0] : tripImages[0].url || "";
  }

  const historyRecordPayload: Record<string, any> = {
    tripId,
    tripName: tripData.name || tripData.title || "Unnamed Expedition",
    destination: tripData.destination || tripData.venue || "",
    startDate: tripData.startDate || "",
    endDate: tripData.endDate || "",
    completedAt: completedAtIso,
    participantCount: approvedParticipants.length > 0 ? approvedParticipants.length : Number(tripData.totalJoined || 0),
    approvedCount: approvedParticipants.length,
    femaleCount: femaleCount > 0 ? femaleCount : Number(tripData.femaleJoined || 0),
    maleCount: maleCount > 0 ? maleCount : Number(tripData.maleJoined || 0),
    totalRegistered: allRegistrations.length,
    coordinators,
    coordinatorSummary: coordNames || "Boundless Staff",
    fee: Number(tripData.fee || 0),
    coverImage,
    images: tripImages,
    itinerary: Array.isArray(tripData.itinerary) ? tripData.itinerary : [],
    faqs: Array.isArray(tripData.faqs) ? tripData.faqs : [],
    description: tripData.description || "",
    status: "completed",
    updatedAt: now,
  };

  const historyRef = adminDb.collection("previousTripRecords").doc(tripId);
  const existingHistory = await historyRef.get();

  if (!existingHistory.exists) {
    historyRecordPayload.createdAt = now;
  }

  // 2. Persist to previousTripRecords and 3. update original trip in parallel
  await Promise.all([
    historyRef.set(historyRecordPayload, { merge: true }),
    tripRef.update({
      isCompleted: true,
      registrationOpen: false,
      completedAt: completedAtIso,
      updatedAt: now,
    }),
  ]);

  // 4. Update student lastTrip metadata for approved participants
  const batch = adminDb.batch();
  let batchCount = 0;

  for (const p of approvedParticipants) {
    if (p.uid) {
      const studentRef = adminDb.collection("students").doc(p.uid);
      batch.set(
        studentRef,
        {
          lastTripId: tripId,
          lastTripName: tripData.name || "Trip",
          lastTripDate: tripData.endDate || tripData.startDate || completedAtIso,
          updatedAt: now,
        },
        { merge: true }
      );
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  // 5. Invalidate caches
  invalidateTripCache(tripId);
  invalidateStudentDirectoryCache();

  // 6. Record audit log
  if (admin) {
    await recordAuditLog(
      admin,
      "TRIP_COMPLETED",
      "trip",
      tripId,
      "success",
      {
        tripName: historyRecordPayload.tripName,
        participantCount: historyRecordPayload.participantCount,
        approvedCount: historyRecordPayload.approvedCount,
      }
    ).catch(() => {});
  }

  return {
    success: true,
    record: historyRecordPayload as CompletedTripRecord,
  };
}

/**
 * Fetch all completed trip records for the Previous Trips view.
 */
export async function getCompletedTripRecords(): Promise<CompletedTripRecord[]> {
  const [historySnap, legacyPreviousSnap] = await Promise.all([
    adminDb.collection("previousTripRecords").orderBy("completedAt", "desc").get(),
    adminDb.collection("previous_trips").orderBy("createdAt", "desc").get().catch(() => null),
  ]);

  const records: CompletedTripRecord[] = [];
  const seenTripIds = new Set<string>();

  historySnap.forEach((doc) => {
    const data = doc.data() as any;
    seenTripIds.add(doc.id);
    records.push({
      tripId: doc.id,
      tripName: data.tripName || "Completed Trip",
      destination: data.destination || "",
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      completedAt: data.completedAt || "",
      participantCount: Number(data.participantCount || 0),
      approvedCount: Number(data.approvedCount || 0),
      femaleCount: Number(data.femaleCount || 0),
      maleCount: Number(data.maleCount || 0),
      totalRegistered: Number(data.totalRegistered || 0),
      coordinators: data.coordinators || [],
      coordinatorSummary: data.coordinatorSummary || "",
      fee: Number(data.fee || 0),
      coverImage: data.coverImage || "",
      images: data.images || [],
      itinerary: data.itinerary || [],
      faqs: data.faqs || [],
      description: data.description || "",
      status: "completed",
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    });
  });

  // Seamlessly incorporate any legacy previous_trips records if not already in previousTripRecords
  if (legacyPreviousSnap) {
    legacyPreviousSnap.forEach((doc) => {
      if (!seenTripIds.has(doc.id)) {
        const d = doc.data();
        records.push({
          tripId: doc.id,
          tripName: d.heading || "Past Trip",
          destination: d.venue || "",
          startDate: "",
          endDate: "",
          completedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          participantCount: Number(d.participants || 0),
          approvedCount: Number(d.participants || 0),
          femaleCount: 0,
          maleCount: 0,
          totalRegistered: Number(d.participants || 0),
          coordinators: [],
          coordinatorSummary: "Staff",
          fee: 0,
          coverImage: d.img || "",
          images: Array.isArray(d.photos) ? d.photos.map((p: any) => ({ url: p })) : [],
          itinerary: [],
          faqs: [],
          description: d.summary || d.subHeading || "",
          status: "completed",
          createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: null,
        });
      }
    });
  }

  return records;
}

/**
 * Fetch historical completed trip detail along with participants list.
 */
export async function getCompletedTripWithParticipants(tripId: string): Promise<{
  trip: CompletedTripRecord | null;
  participants: HistoricalTripParticipant[];
}> {
  let tripRecord: CompletedTripRecord | null = null;

  // 1. Try previousTripRecords first
  const historyDoc = await adminDb.collection("previousTripRecords").doc(tripId).get();
  if (historyDoc.exists) {
    const d = historyDoc.data() as any;
    tripRecord = {
      tripId: historyDoc.id,
      tripName: d.tripName || "Trip",
      destination: d.destination || "",
      startDate: d.startDate || "",
      endDate: d.endDate || "",
      completedAt: d.completedAt || "",
      participantCount: Number(d.participantCount || 0),
      approvedCount: Number(d.approvedCount || 0),
      femaleCount: Number(d.femaleCount || 0),
      maleCount: Number(d.maleCount || 0),
      totalRegistered: Number(d.totalRegistered || 0),
      coordinators: d.coordinators || [],
      coordinatorSummary: d.coordinatorSummary || "",
      fee: Number(d.fee || 0),
      coverImage: d.coverImage || "",
      images: d.images || [],
      itinerary: d.itinerary || [],
      faqs: d.faqs || [],
      description: d.description || "",
      status: "completed",
      createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
    };
  } else {
    // Check main trips collection
    const tripDoc = await adminDb.collection("trips").doc(tripId).get();
    if (tripDoc.exists) {
      const d = tripDoc.data() || {};
      const tripImages = Array.isArray(d.images) ? d.images : [];
      let coverImage = "";
      if (tripImages.length > 0) {
        coverImage = typeof tripImages[0] === "string" ? tripImages[0] : tripImages[0].url || "";
      }
      tripRecord = {
        tripId: tripDoc.id,
        tripName: d.name || "Trip",
        destination: d.destination || "",
        startDate: d.startDate || "",
        endDate: d.endDate || "",
        completedAt: d.completedAt || "",
        participantCount: Number(d.totalJoined || 0),
        approvedCount: Number(d.totalJoined || 0),
        femaleCount: Number(d.femaleJoined || 0),
        maleCount: Number(d.maleJoined || 0),
        totalRegistered: Number(d.totalJoined || 0),
        coordinators: d.coordinators || [],
        coordinatorSummary: "Staff",
        fee: Number(d.fee || 0),
        coverImage,
        images: tripImages,
        itinerary: d.itinerary || [],
        faqs: d.faqs || [],
        description: d.description || "",
        status: "completed",
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: null,
      };
    }
  }

  // 2. Fetch canonical participants
  const [canRegSnap, legRegSnap] = await Promise.all([
    adminDb.collection("tripRegistrations").where("tripId", "==", tripId).get(),
    adminDb.collection("user-registrations").where("tripId", "==", tripId).get().catch(() => null),
  ]);

  const pMap = new Map<string, HistoricalTripParticipant>();

  for (const doc of canRegSnap.docs) {
    const data = doc.data() || {};
    const uid = data.uid || doc.id.split("_")[1] || "";
    const email = data.email || "";
    const key = uid || email || doc.id;

    pMap.set(key, {
      uid,
      studentId: data.studentId || data.formData?.["Roll Number"] || data.formData?.["Student ID Number"] || "",
      name: data.name || data.studentName || data.formData?.["Full Name"] || "Student",
      email,
      gender: data.gender || "unknown",
      status: data.status || "registered",
      registeredAt: data.submittedAt?.toDate?.()?.toISOString() || data.submittedAt || null,
      paymentVerifiedAt: data.paymentVerifiedAt?.toDate?.()?.toISOString() || data.paymentVerifiedAt || null,
      phone: data.phone || data.formData?.["Contact Number"] || "",
      profileLink: uid ? `/admin/students/${uid}` : "",
    });
  }

  if (legRegSnap) {
    for (const doc of legRegSnap.docs) {
      const data = doc.data() || {};
      const uid = data.uid || "";
      const email = data.email || "";
      const key = uid || email || doc.id;

      if (!pMap.has(key)) {
        pMap.set(key, {
          uid,
          studentId: data.studentId || data.formData?.["Roll Number"] || data.formData?.["Student ID Number"] || "",
          name: data.name || data.studentName || data.formData?.["Full Name"] || "Student",
          email,
          gender: data.gender || "unknown",
          status: data.status || "registered",
          registeredAt: data.submittedAt?.toDate?.()?.toISOString() || data.submittedAt || null,
          paymentVerifiedAt: data.paymentVerifiedAt?.toDate?.()?.toISOString() || data.paymentVerifiedAt || null,
          phone: data.phone || data.formData?.["Contact Number"] || "",
          profileLink: uid ? `/admin/students/${uid}` : "",
        });
      }
    }
  }

  return {
    trip: tripRecord,
    participants: Array.from(pMap.values()),
  };
}
