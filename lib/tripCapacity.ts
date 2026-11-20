/**
 * BOUNDLESS SOCIETY — TRIP CAPACITY, GENDER-AWARE SEAT ALLOCATION & FIFO WAITLIST ENGINE
 *
 * CORE PRINCIPLES:
 * 1. REGISTRATION != SEAT: All registrations in tripRegistrations/{tripId}_{uid} are permanent.
 * 2. ZERO DELETIONS: All student records and historical fields are preserved untouched.
 * 3. GENDER-AWARE & TOTAL CAPACITY SAFETY:
 *    - Enforces BOTH overall capacity (`totalSeats`) AND gender-specific reserved quotas
 *      (`maleReservedSeats`, `femaleReservedSeats`).
 *    - Unused reserved seats of one gender are NEVER consumed by another gender unless
 *      an explicit `releasedSeats > 0` policy permits it.
 *    - Historical over-allocations (e.g. 26/25 male) are preserved untouched; no new
 *      approvals can worsen over-allocation, and withdrawals self-heal before promoting.
 * 4. TRANSACTION-SAFE PER-GENDER FIFO WAITLIST:
 *    - Separate male / female / other FIFO queues with server-assigned 1-based positions.
 *    - Deterministic ordering: `waitlistedAt` -> `waitlistEnteredAtMs` -> `submittedAt` -> doc ID.
 *    - All waitlist queries execute INSIDE the Firestore transaction via `transaction.get(query)`.
 *    - Automatic 1-based position recalculation whenever a student is promoted or withdrawn.
 * 5. IDEMPOTENT NOTIFICATIONS WITH DURABLE FALLBACK:
 *    - Promotion & waitlist emails are dispatched with registration-level idempotency flags;
 *      transient Brevo failures fall back to `durable_jobs` without corrupting seat state.
 * 6. ZERO HASHING: Uses natural keys (`tripId`, `uid`, `${tripId}_${uid}`).
 */

import { adminDb } from "./firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { buildDeterministicJobId, enqueueDurableJob } from "./durableQueue";
import { recordAuditLog, AdminContext } from "./adminAuth";
import { invalidateTripCache } from "./tripCache";
import { runFastTransaction } from "./firebase-fallback";
import { sendTripApprovalEmail } from "./email/mailer";

export type WaitlistGenderCategory = "male" | "female" | "other";

export interface TripCapacityRecord {
  name?: string;
  totalSeats?: number;
  maleReservedSeats?: number;
  femaleReservedSeats?: number;
  totalJoined?: number;
  maleJoined?: number;
  femaleJoined?: number;
  waitlistedCount?: number;
  maleWaitlistedCount?: number;
  femaleWaitlistedCount?: number;
  waitlistCounter?: number;
  releasedSeats?: number;
  releasedSeatsType?: "all" | "female_only" | string;
  emailsDisabled?: boolean;
  coordinators?: unknown[];
  whatsappLink?: string;
  qrCodeUrl?: string;
  cityWhatsappSettings?: Record<string, { whatsappLink?: string; qrCodeUrl?: string }>;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

interface ReleaseTransactionResult {
  promotedStudentInfo: PromotionResult["promotedStudent"];
  remainingWaitlistCount: number;
  tripData: TripCapacityRecord;
  released: boolean;
}

export interface SeatAvailabilitySnapshot {
  totalSeats: number;
  totalJoined: number;
  totalRemaining: number;
  maleReservedSeats: number;
  femaleReservedSeats: number;
  maleJoined: number;
  femaleJoined: number;
  otherJoined: number;
  releasedSeats: number;
  releasedSeatsType: "all" | "female_only";
  maleRemaining: number;
  femaleRemaining: number;
  otherRemaining: number;
  canAllocate: boolean;
  category: WaitlistGenderCategory;
  reason?: string;
}

export interface SeatAllocationResult {
  allocated: boolean;
  alreadyAllocated?: boolean;
  status: "approved_to_pay" | "waitlisted" | "mail_sent" | "paid" | string;
  waitlistPosition?: number;
  waitlistGender?: WaitlistGenderCategory;
  availableSeats: number;
  categoryRemaining: number;
  totalJoined: number;
  totalSeats: number;
  maleJoined: number;
  femaleJoined: number;
  promoted?: boolean;
}

export interface PromotionResult {
  promoted: boolean;
  promotedStudent?: {
    uid: string;
    email: string;
    name: string;
    studentId: string;
    gender: WaitlistGenderCategory;
    waitlistPosition: number;
    regDocId: string;
    formData?: Record<string, any>;
    alreadyEmailed?: boolean;
  };
  remainingWaitlistCount: number;
  emailDispatched?: boolean;
  emailFallbackQueued?: boolean;
}

/**
 * Normalizes any gender string into a canonical seat/waitlist bucket.
 */
export function normalizeWaitlistGender(rawGender?: string | null): WaitlistGenderCategory {
  const g = String(rawGender || "").toLowerCase().trim();
  if (g === "male" || g.startsWith("m")) return "male";
  if (g === "female" || g.startsWith("f")) return "female";
  return "other";
}

/**
 * Pure, deterministic seat-availability evaluator enforcing BOTH total capacity
 * and gender-specific reserved quotas (plus explicit released-seat policy).
 *
 * Interaction with `releasedSeats`:
 * - `baseUnreservedPool = max(0, totalSeats - maleReservedSeats - femaleReservedSeats)`
 * - If `releasedSeatsType === "female_only"`, `releasedSeats` expands only female capacity
 *   (still bounded by `totalSeats - totalJoined`).
 * - If `releasedSeatsType === "all"`, `releasedSeats` expands the shared general pool
 *   (still bounded by `totalSeats - totalJoined`).
 * - Unused reserved seats of one gender are NEVER treated as freely available to another
 *   gender when `releasedSeats === 0`.
 */
export function evaluateSeatAvailability(
  tripData: Record<string, any>,
  rawGender?: string | null
): SeatAvailabilitySnapshot {
  const category = normalizeWaitlistGender(rawGender);

  const totalSeats = Math.max(0, Number(tripData.totalSeats ?? 50));
  const totalJoined = Math.max(0, Number(tripData.totalJoined ?? 0));
  const femaleReservedSeats = Math.max(0, Number(tripData.femaleReservedSeats ?? 0));
  const maleReservedSeats =
    tripData.maleReservedSeats !== undefined && tripData.maleReservedSeats !== null
      ? Math.max(0, Number(tripData.maleReservedSeats))
      : Math.max(0, totalSeats - femaleReservedSeats);

  const maleJoined = Math.max(0, Number(tripData.maleJoined ?? 0));
  const femaleJoined = Math.max(0, Number(tripData.femaleJoined ?? 0));
  const otherJoined = Math.max(0, totalJoined - maleJoined - femaleJoined);

  const releasedSeats = Math.max(0, Number(tripData.releasedSeats ?? 0));
  const releasedSeatsType: "all" | "female_only" =
    tripData.releasedSeatsType === "female_only" ? "female_only" : "all";

  const totalRemaining = Math.max(0, totalSeats - totalJoined);

  // Unreserved pool (seats not reserved for either gender) + explicitly released cross-category seats
  const baseUnreservedPool = Math.max(0, totalSeats - maleReservedSeats - femaleReservedSeats);
  const crossCategoryPool =
    releasedSeatsType === "all" ? baseUnreservedPool + releasedSeats : baseUnreservedPool;

  const maleOverflow = Math.max(0, maleJoined - maleReservedSeats);
  const femaleEffectiveReserved =
    releasedSeatsType === "female_only"
      ? femaleReservedSeats + releasedSeats
      : femaleReservedSeats;
  const femaleOverflow = Math.max(0, femaleJoined - femaleEffectiveReserved);

  const crossCategoryConsumed = maleOverflow + femaleOverflow + otherJoined;
  const crossCategoryRemaining = Math.max(0, crossCategoryPool - crossCategoryConsumed);

  const maleDirectRemaining = Math.max(0, maleReservedSeats - maleJoined);
  const femaleDirectRemaining = Math.max(0, femaleEffectiveReserved - femaleJoined);

  const maleRemaining = Math.min(totalRemaining, maleDirectRemaining + crossCategoryRemaining);
  const femaleRemaining = Math.min(totalRemaining, femaleDirectRemaining + crossCategoryRemaining);
  const otherRemaining = Math.min(totalRemaining, crossCategoryRemaining);

  let categoryRemaining = otherRemaining;
  if (category === "male") categoryRemaining = maleRemaining;
  else if (category === "female") categoryRemaining = femaleRemaining;

  const canAllocate = totalRemaining > 0 && categoryRemaining > 0;
  let reason: string | undefined;
  if (!canAllocate) {
    if (totalRemaining <= 0) {
      reason = "total_capacity_full";
    } else {
      reason = `${category}_quota_full`;
    }
  }

  return {
    totalSeats,
    totalJoined,
    totalRemaining,
    maleReservedSeats,
    femaleReservedSeats,
    maleJoined,
    femaleJoined,
    otherJoined,
    releasedSeats,
    releasedSeatsType,
    maleRemaining,
    femaleRemaining,
    otherRemaining,
    canAllocate,
    category,
    reason,
  };
}

/**
 * Extracts a numeric epoch timestamp for deterministic FIFO ordering.
 */
function toEpochMs(val: any): number {
  if (!val) return Number.MAX_SAFE_INTEGER;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val?.toMillis === "function") return val.toMillis();
  if (typeof val?.toDate === "function") return val.toDate().getTime();
  if (val instanceof Date) return val.getTime();
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Deterministic FIFO comparator for waitlisted registrations.
 * Order: waitlistedAt / waitlistEnteredAtMs -> submittedAt -> stored waitlistPosition -> doc.id
 */
export function compareWaitlistEntries(
  a: { id: string; data: Record<string, any> },
  b: { id: string; data: Record<string, any> }
): number {
  const aWait = Math.min(
    toEpochMs(a.data.waitlistedAt),
    toEpochMs(a.data.waitlistEnteredAtMs)
  );
  const bWait = Math.min(
    toEpochMs(b.data.waitlistedAt),
    toEpochMs(b.data.waitlistEnteredAtMs)
  );
  if (aWait !== bWait) return aWait - bWait;

  const aSub = toEpochMs(a.data.submittedAt);
  const bSub = toEpochMs(b.data.submittedAt);
  if (aSub !== bSub) return aSub - bSub;

  const aPos = Number(a.data.waitlistPosition || Number.MAX_SAFE_INTEGER);
  const bPos = Number(b.data.waitlistPosition || Number.MAX_SAFE_INTEGER);
  if (aPos !== bPos) return aPos - bPos;

  return a.id.localeCompare(b.id);
}

/**
 * Helper to resolve coordinator & WhatsApp details for promotion emails.
 */
function resolvePromotionEmailDetails(tripData: Record<string, any>, formData: Record<string, any> = {}) {
  const coordinators = Array.isArray(tripData.coordinators) ? tripData.coordinators : [];
  let coordinator: any = null;
  if (coordinators.length === 1) {
    coordinator = typeof coordinators[0] === "object" && coordinators[0] !== null
      ? coordinators[0]
      : { name: String(coordinators[0]) };
  } else if (coordinators.length > 1) {
    const answers = Object.values(formData || {})
      .filter((v) => typeof v === "string")
      .map((v) => String(v).trim().toLowerCase());
    for (const c of coordinators) {
      if (typeof c === "object" && c !== null && c.assignedOption) {
        const opt = String(c.assignedOption).trim().toLowerCase();
        if (answers.some((ans) => ans === opt || ans.includes(opt) || opt.includes(ans))) {
          coordinator = c;
          break;
        }
      }
    }
    if (!coordinator) {
      coordinator = typeof coordinators[0] === "object" && coordinators[0] !== null
        ? coordinators[0]
        : { name: String(coordinators[0]) };
    }
  }

  let whatsappLink = tripData.whatsappLink || "";
  let qrCodeUrl = tripData.qrCodeUrl || "";
  const citySettings = tripData.cityWhatsappSettings || {};
  for (const ans of Object.values(formData || {})) {
    if (typeof ans === "string") {
      const trimmed = ans.trim().toLowerCase();
      const matchedKey = Object.keys(citySettings).find((k) => k.toLowerCase() === trimmed);
      if (matchedKey && citySettings[matchedKey]) {
        if (citySettings[matchedKey].whatsappLink) whatsappLink = citySettings[matchedKey].whatsappLink;
        if (citySettings[matchedKey].qrCodeUrl) qrCodeUrl = citySettings[matchedKey].qrCodeUrl;
        break;
      }
    }
  }

  return { coordinator, whatsappLink, qrCodeUrl };
}

/**
 * Atomically checks BOTH total capacity and gender-specific allocation and either:
 * - allocates a confirmed seat (`approved_to_pay`), OR
 * - places the registration into its gender-specific FIFO waiting list with a server-assigned 1-based position.
 *
 * All reads (trip, registration, active waitlist docs) execute inside the Firestore transaction.
 */
export async function allocateSeatOrWaitlistTransaction(params: {
  transaction?: FirebaseFirestore.Transaction;
  db?: FirebaseFirestore.Firestore;
  tripId: string;
  uid: string;
  regDocId: string;
  gender?: string;
  studentName?: string;
  studentId?: string;
  studentEmail?: string;
  adminEmail?: string;
}): Promise<SeatAllocationResult> {
  const db = params.db || adminDb;
  if (!params.transaction) {
    return runFastTransaction(db, async (t) => {
      return allocateSeatOrWaitlistTransaction({ ...params, db, transaction: t });
    });
  }

  const {
    transaction,
    tripId,
    regDocId,
    gender = "unknown",
    adminEmail = "system",
  } = params;

  const tripRef = db.collection("trips").doc(tripId);
  const regRef = db.collection("tripRegistrations").doc(regDocId);
  const waitlistQuery = db
    .collection("tripRegistrations")
    .where("tripId", "==", tripId)
    .where("status", "==", "waitlisted");

  // Transactional reads BEFORE any writes
  const [tripSnap, regSnap, waitlistSnap] = await Promise.all([
    transaction.get(tripRef),
    transaction.get(regRef),
    transaction.get(waitlistQuery),
  ]);

  if (!tripSnap.exists) {
    throw new Error(`Trip ${tripId} not found`);
  }
  if (!regSnap.exists) {
    throw new Error(`Registration ${regDocId} not found`);
  }

  const tripData = tripSnap.data() || {};
  const regData = regSnap.data() || {};

  const category = normalizeWaitlistGender(gender || regData.gender);
  const availability = evaluateSeatAvailability(tripData, category);

  // If already confirmed, idempotent no-op (never double-count!)
  const currentStatus = regData.status || "registered";
  if (currentStatus === "approved_to_pay" || currentStatus === "mail_sent" || currentStatus === "paid") {
    return {
      allocated: true,
      alreadyAllocated: true,
      status: currentStatus,
      availableSeats: availability.totalRemaining,
      categoryRemaining:
        category === "male"
          ? availability.maleRemaining
          : category === "female"
          ? availability.femaleRemaining
          : availability.otherRemaining,
      totalJoined: availability.totalJoined,
      totalSeats: availability.totalSeats,
      maleJoined: availability.maleJoined,
      femaleJoined: availability.femaleJoined,
    };
  }

  const now = FieldValue.serverTimestamp();
  const nowMs = Date.now();

  // Group currently waitlisted registrations by gender (excluding target if it's being re-evaluated)
  const allWaitlisted = waitlistSnap.docs.map((d) => ({
    id: d.id,
    ref: d.ref,
    data: d.data() || {},
    category: normalizeWaitlistGender((d.data() || {}).waitlistGender || (d.data() || {}).gender),
  }));

  // 1. ALLOCATE SEAT ONLY IF BOTH TOTAL CAPACITY AND GENDER QUOTA PERMIT IT
  if (availability.canAllocate) {
    const newTotalJoined = availability.totalJoined + 1;
    const newFemaleJoined = category === "female" ? availability.femaleJoined + 1 : availability.femaleJoined;
    const newMaleJoined = category === "male" ? availability.maleJoined + 1 : availability.maleJoined;

    const remainingWaitlisted = allWaitlisted.filter((w) => w.id !== regDocId);
    const sameGenderRemaining = remainingWaitlisted
      .filter((w) => w.category === category)
      .sort(compareWaitlistEntries);

    // If the student was previously waitlisted, compact remaining positions in their gender queue
    if (currentStatus === "waitlisted") {
      sameGenderRemaining.forEach((entry, idx) => {
        const expectedPos = idx + 1;
        if (Number(entry.data.waitlistPosition) !== expectedPos) {
          transaction.update(entry.ref, {
            waitlistPosition: expectedPos,
            updatedAt: now,
          });
        }
      });
    }

    const maleWaitlistedCount = remainingWaitlisted.filter((w) => w.category === "male").length;
    const femaleWaitlistedCount = remainingWaitlisted.filter((w) => w.category === "female").length;

    transaction.update(tripRef, {
      totalJoined: newTotalJoined,
      femaleJoined: newFemaleJoined,
      maleJoined: newMaleJoined,
      waitlistedCount: remainingWaitlisted.length,
      maleWaitlistedCount,
      femaleWaitlistedCount,
      updatedAt: now,
    });

    transaction.update(regRef, {
      status: "approved_to_pay",
      waitlistPosition: FieldValue.delete(),
      waitlistGender: FieldValue.delete(),
      approvedAt: now,
      approvedBy: adminEmail,
      updatedAt: now,
    });

    const newCategoryRemaining = Math.max(
      0,
      (category === "male"
        ? availability.maleRemaining
        : category === "female"
        ? availability.femaleRemaining
        : availability.otherRemaining) - 1
    );

    return {
      allocated: true,
      status: "approved_to_pay",
      availableSeats: Math.max(0, availability.totalRemaining - 1),
      categoryRemaining: newCategoryRemaining,
      totalJoined: newTotalJoined,
      totalSeats: availability.totalSeats,
      maleJoined: newMaleJoined,
      femaleJoined: newFemaleJoined,
    };
  }

  // 2. NO ELIGIBLE SEAT AVAILABLE -> ASSIGN TO GENDER-SPECIFIC FIFO WAITLIST
  const sameGenderExisting = allWaitlisted
    .filter((w) => w.category === category)
    .sort(compareWaitlistEntries);

  // Idempotent check: if already waitlisted in this queue, preserve timestamp & return live 1-based position
  const existingIdx = sameGenderExisting.findIndex((w) => w.id === regDocId);
  if (currentStatus === "waitlisted" && existingIdx !== -1) {
    const livePosition = existingIdx + 1;
    if (Number(regData.waitlistPosition) !== livePosition || regData.waitlistGender !== category) {
      transaction.update(regRef, {
        waitlistPosition: livePosition,
        waitlistGender: category,
        updatedAt: now,
      });
    }
    return {
      allocated: false,
      status: "waitlisted",
      waitlistPosition: livePosition,
      waitlistGender: category,
      availableSeats: availability.totalRemaining,
      categoryRemaining: 0,
      totalJoined: availability.totalJoined,
      totalSeats: availability.totalSeats,
      maleJoined: availability.maleJoined,
      femaleJoined: availability.femaleJoined,
    };
  }

  // Re-index existing same-gender waitlisted docs if any gaps exist, then append target at end (FIFO)
  sameGenderExisting.forEach((entry, idx) => {
    const expectedPos = idx + 1;
    if (Number(entry.data.waitlistPosition) !== expectedPos) {
      transaction.update(entry.ref, {
        waitlistPosition: expectedPos,
        updatedAt: now,
      });
    }
  });

  const assignedPosition = sameGenderExisting.length + 1;
  const newTotalWaitlisted = allWaitlisted.length + (existingIdx === -1 ? 1 : 0);
  const maleWaitlistedCount =
    allWaitlisted.filter((w) => w.category === "male" && w.id !== regDocId).length +
    (category === "male" ? 1 : 0);
  const femaleWaitlistedCount =
    allWaitlisted.filter((w) => w.category === "female" && w.id !== regDocId).length +
    (category === "female" ? 1 : 0);

  transaction.update(tripRef, {
    waitlistCounter: Math.max(Number(tripData.waitlistCounter || 0) + 1, newTotalWaitlisted),
    waitlistedCount: newTotalWaitlisted,
    maleWaitlistedCount,
    femaleWaitlistedCount,
    updatedAt: now,
  });

  transaction.update(regRef, {
    status: "waitlisted",
    waitlistGender: category,
    waitlistPosition: assignedPosition,
    waitlistedAt: regData.waitlistedAt || now,
    waitlistEnteredAtMs: regData.waitlistEnteredAtMs || nowMs,
    updatedAt: now,
  });

  return {
    allocated: false,
    status: "waitlisted",
    waitlistPosition: assignedPosition,
    waitlistGender: category,
    availableSeats: availability.totalRemaining,
    categoryRemaining: 0,
    totalJoined: availability.totalJoined,
    totalSeats: availability.totalSeats,
    maleJoined: availability.maleJoined,
    femaleJoined: availability.femaleJoined,
  };
}

/**
 * Atomically releases a confirmed seat (due to withdrawal, rejection, decline, revocation, or correction)
 * and promotes the earliest eligible waitlisted student strictly respecting:
 * - Total trip capacity (`totalJoined < totalSeats`)
 * - Gender-specific reserved quotas (never promotes a male into a female-reserved seat or vice versa)
 * - Over-capacity self-healing (e.g. if male is 26/25 and 1 male withdraws -> 25/25, 0 promotions!)
 * - Deterministic FIFO ordering + 1-based position recalculation for remaining queue members.
 */
export async function releaseSeatAndPromoteWaitlist(params: {
  db?: FirebaseFirestore.Firestore;
  sendApprovalEmailFn?: typeof sendTripApprovalEmail;
  enqueueJobFn?: typeof enqueueDurableJob;
  skipSideEffects?: boolean;
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
  const {
    tripId,
    regDocId,
    newStatus,
    reason = "",
    adminEmail = "system",
    skipSideEffects = false,
  } = params;
  const db = params.db || adminDb;
  const dispatchApprovalEmail = params.sendApprovalEmailFn || sendTripApprovalEmail;
  const enqueueJob = params.enqueueJobFn || enqueueDurableJob;

  const tripRef = db.collection("trips").doc(tripId);
  const regRef = db.collection("tripRegistrations").doc(regDocId);
  const waitlistQuery = db
    .collection("tripRegistrations")
    .where("tripId", "==", tripId)
    .where("status", "==", "waitlisted");

  const txResult: ReleaseTransactionResult = await runFastTransaction(db, async (transaction): Promise<ReleaseTransactionResult> => {
    let promotedStudentInfo: PromotionResult["promotedStudent"] = undefined;

    // ALL reads executed transactionally before any writes (prevents concurrent duplicate promotion)
    const [tripSnap, regSnap, waitlistSnap] = await Promise.all([
      transaction.get(tripRef),
      transaction.get(regRef),
      transaction.get(waitlistQuery),
    ]);

    if (!tripSnap.exists) throw new Error(`Trip ${tripId} not found`);
    if (!regSnap.exists) throw new Error(`Registration ${regDocId} not found`);

    const tripData = tripSnap.data() || {};
    const regData = regSnap.data() || {};
    const oldStatus = regData.status || "registered";
    const wasConfirmed =
      oldStatus === "approved_to_pay" || oldStatus === "mail_sent" || oldStatus === "paid";
    const wasWaitlisted = oldStatus === "waitlisted";
    const vacatedGender = normalizeWaitlistGender(regData.waitlistGender || regData.gender);

    const now = FieldValue.serverTimestamp();

    // 1. Update the target registration (NEVER DELETE IT)
    const regUpdate: Record<string, any> = {
      status: newStatus,
      updatedAt: now,
      statusChangedAt: now,
      statusChangedBy: adminEmail,
    };
    if (reason) regUpdate.issueText = reason;
    if (newStatus === "withdrawn") regUpdate.withdrawnAt = now;
    if (newStatus === "rejected") regUpdate.rejectedAt = now;
    if (wasWaitlisted) {
      regUpdate.waitlistPosition = FieldValue.delete();
      regUpdate.waitlistGender = FieldValue.delete();
    }

    transaction.update(regRef, regUpdate);

    // Remaining active waitlisted docs excluding the target
    const remainingWaitlisted = waitlistSnap.docs
      .filter((d) => d.id !== regDocId)
      .map((d) => ({
        id: d.id,
        ref: d.ref,
        data: d.data() || {},
        category: normalizeWaitlistGender((d.data() || {}).waitlistGender || (d.data() || {}).gender),
      }));

    // Case A: Target was only waitlisted -> remove from queue & recalculate remaining positions in its gender queue
    if (wasWaitlisted) {
      const sameGenderQueue = remainingWaitlisted
        .filter((w) => w.category === vacatedGender)
        .sort(compareWaitlistEntries);

      sameGenderQueue.forEach((entry, idx) => {
        const expectedPos = idx + 1;
        if (Number(entry.data.waitlistPosition) !== expectedPos) {
          transaction.update(entry.ref, {
            waitlistPosition: expectedPos,
            updatedAt: now,
          });
        }
      });

      transaction.update(tripRef, {
        waitlistedCount: remainingWaitlisted.length,
        maleWaitlistedCount: remainingWaitlisted.filter((w) => w.category === "male").length,
        femaleWaitlistedCount: remainingWaitlisted.filter((w) => w.category === "female").length,
        updatedAt: now,
      });

      return {
        promotedStudentInfo: undefined,
        remainingWaitlistCount: remainingWaitlisted.length,
        tripData,
        released: false,
      };
    }

    // Case B: Target was neither confirmed nor waitlisted -> no seat freed
    if (!wasConfirmed) {
      return {
        promotedStudentInfo: undefined,
        remainingWaitlistCount: remainingWaitlisted.length,
        tripData,
        released: false,
      };
    }

    // Case C: Target WAS confirmed -> vacate 1 seat in its gender bucket
    let totalJoined = Math.max(0, Number(tripData.totalJoined || 0) - 1);
    let femaleJoined =
      vacatedGender === "female"
        ? Math.max(0, Number(tripData.femaleJoined || 0) - 1)
        : Number(tripData.femaleJoined || 0);
    let maleJoined =
      vacatedGender === "male"
        ? Math.max(0, Number(tripData.maleJoined || 0) - 1)
        : Number(tripData.maleJoined || 0);

    const postReleaseTripState = {
      ...tripData,
      totalJoined,
      femaleJoined,
      maleJoined,
    };

    // Prioritize the vacated gender's FIFO queue first; only check other queues if released-seat policy permits
    const sameGenderCandidates = remainingWaitlisted
      .filter((w) => w.category === vacatedGender)
      .sort(compareWaitlistEntries);
    const otherGenderCandidates = remainingWaitlisted
      .filter((w) => w.category !== vacatedGender)
      .sort(compareWaitlistEntries);

    const orderedCandidates = [...sameGenderCandidates, ...otherGenderCandidates];

    // Find earliest FIFO candidate whose gender category & total capacity BOTH allow allocation
    let selectedCandidate: (typeof orderedCandidates)[number] | null = null;
    for (const candidate of orderedCandidates) {
      const check = evaluateSeatAvailability(postReleaseTripState, candidate.category);
      if (check.canAllocate) {
        selectedCandidate = candidate;
        break;
      }
    }

    if (selectedCandidate) {
      const candData = selectedCandidate.data;
      const candGender = selectedCandidate.category;

      totalJoined += 1;
      if (candGender === "female") femaleJoined += 1;
      else if (candGender === "male") maleJoined += 1;

      const afterPromotionWaitlist = remainingWaitlisted.filter(
        (w) => w.id !== selectedCandidate!.id
      );

      // Recalculate 1-based positions for remaining waitlisted students in promoted student's gender queue
      const remainingInPromotedQueue = afterPromotionWaitlist
        .filter((w) => w.category === candGender)
        .sort(compareWaitlistEntries);

      remainingInPromotedQueue.forEach((entry, idx) => {
        const expectedPos = idx + 1;
        if (Number(entry.data.waitlistPosition) !== expectedPos) {
          transaction.update(entry.ref, {
            waitlistPosition: expectedPos,
            updatedAt: now,
          });
        }
      });

      transaction.update(tripRef, {
        totalJoined,
        femaleJoined,
        maleJoined,
        waitlistedCount: afterPromotionWaitlist.length,
        maleWaitlistedCount: afterPromotionWaitlist.filter((w) => w.category === "male").length,
        femaleWaitlistedCount: afterPromotionWaitlist.filter((w) => w.category === "female").length,
        updatedAt: now,
      });

      const existingHistory = Array.isArray(candData.conversationHistory)
        ? [...candData.conversationHistory]
        : [];
      existingHistory.push({
        type: "waitlist_promoted",
        actor: adminEmail,
        message: `Promoted from ${candGender} waiting list (Position #${Number(candData.waitlistPosition || 1)}) after seat vacated.`,
        timestamp: new Date().toISOString(),
      });

      transaction.update(selectedCandidate.ref, {
        status: "approved_to_pay",
        waitlistPosition: FieldValue.delete(),
        waitlistGender: FieldValue.delete(),
        promotedFromWaitlist: true,
        promotedAt: now,
        approvedAt: now,
        approvedBy: adminEmail,
        conversationHistory: existingHistory,
        updatedAt: now,
      });

      promotedStudentInfo = {
        uid: candData.uid || selectedCandidate.id.split("_")[1] || "",
        email: candData.email || "",
        name:
          candData.name ||
          candData.studentName ||
          candData.formData?.["Full Name"] ||
          "Student",
        studentId:
          candData.studentId ||
          candData.formData?.["Roll Number"] ||
          candData.formData?.["Student ID Number"] ||
          "",
        gender: candGender,
        waitlistPosition: Number(candData.waitlistPosition || 1),
        regDocId: selectedCandidate.id,
        formData: candData.formData || {},
        alreadyEmailed: Boolean(
          candData.approvalEmailSentAt ||
            candData.approvalEmailStatus === "sent" ||
            candData.status === "mail_sent"
        ),
      };

      return {
        promotedStudentInfo,
        remainingWaitlistCount: afterPromotionWaitlist.length,
        tripData: { ...tripData, totalJoined, femaleJoined, maleJoined },
        released: true,
      };
    }

    // No eligible waitlisted candidate (e.g. queue empty, or over-allocation self-healed 26->25)
    transaction.update(tripRef, {
      totalJoined,
      femaleJoined,
      maleJoined,
      waitlistedCount: remainingWaitlisted.length,
      maleWaitlistedCount: remainingWaitlisted.filter((w) => w.category === "male").length,
      femaleWaitlistedCount: remainingWaitlisted.filter((w) => w.category === "female").length,
      updatedAt: now,
    });

    return {
      promotedStudentInfo: undefined,
      remainingWaitlistCount: remainingWaitlisted.length,
      tripData: { ...tripData, totalJoined, femaleJoined, maleJoined },
      released: true,
    };
  });

  const { promotedStudentInfo, remainingWaitlistCount, tripData, released } = txResult;

  if (!skipSideEffects) {
    invalidateTripCache(tripId);
  }

  let emailDispatched = false;
  let emailFallbackQueued = false;

  // Post-transaction side effects for promoted student (never allowed to corrupt seat allocation)
  if (promotedStudentInfo) {
    const promotedRegRef = db.collection("tripRegistrations").doc(promotedStudentInfo.regDocId);
    const legacyDocId = promotedStudentInfo.email ? `${tripId}_${promotedStudentInfo.email}` : null;

    // 1. Dispatch approval email synchronously if not already sent & emails not disabled
    if (!promotedStudentInfo.alreadyEmailed && !tripData.emailsDisabled && promotedStudentInfo.email) {
      const { coordinator, whatsappLink, qrCodeUrl } = resolvePromotionEmailDetails(
        tripData,
        promotedStudentInfo.formData
      );
      try {
        const emailResult = await dispatchApprovalEmail({
          student: {
            name: promotedStudentInfo.name,
            email: promotedStudentInfo.email,
            studentId: promotedStudentInfo.studentId,
          },
          trip: tripData,
          coordinator,
          whatsappLink,
          qrCodeUrl,
        });

        if (emailResult?.success) {
          emailDispatched = true;
          const emailUpdate = {
            status: "mail_sent",
            approvalEmailSentAt: FieldValue.serverTimestamp(),
            approvalEmailStatus: "sent",
            approvalEmailMessageId: emailResult.messageId || "sent",
            approvalEmailError: null,
            approvalEmailLastAttemptAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          await promotedRegRef.update(emailUpdate).catch(() => {});
          if (legacyDocId) {
            await db.collection("user-registrations").doc(legacyDocId).set(emailUpdate, { merge: true }).catch(() => {});
          }
        } else {
          // Transient Brevo failure -> record failed state & enqueue durable fallback
          const failUpdate = {
            approvalEmailStatus: "failed",
            approvalEmailError: emailResult?.error || "Failed to dispatch promotion email",
            approvalEmailLastAttemptAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          await promotedRegRef.update(failUpdate).catch(() => {});
          if (legacyDocId) {
            await db.collection("user-registrations").doc(legacyDocId).set({ status: "approved_to_pay", ...failUpdate }, { merge: true }).catch(() => {});
          }

          const jobId = buildDeterministicJobId("approval_email", [tripId, promotedStudentInfo.uid, "promoted"]);
          await enqueueJob({
            jobId,
            jobType: "approval_email",
            payload: {
              tripId,
              uid: promotedStudentInfo.uid,
              regDocId: promotedStudentInfo.regDocId,
              email: promotedStudentInfo.email,
              studentName: promotedStudentInfo.name,
              studentId: promotedStudentInfo.studentId,
              trip: tripData || {},
              coordinator,
              whatsappLink,
              qrCodeUrl,
              isPromotion: true,
            },
          }).then(() => {
            emailFallbackQueued = true;
          }).catch((err) => console.error("Error enqueuing promotion email fallback:", err));
        }
      } catch (err: any) {
        const safeErr = err?.message || "Exception dispatching promotion email";
        await promotedRegRef.update({
          approvalEmailStatus: "failed",
          approvalEmailError: safeErr,
          approvalEmailLastAttemptAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }).catch(() => {});
        const jobId = buildDeterministicJobId("approval_email", [tripId, promotedStudentInfo.uid, "promoted"]);
        await enqueueJob({
          jobId,
          jobType: "approval_email",
          payload: {
            tripId,
            uid: promotedStudentInfo.uid,
            regDocId: promotedStudentInfo.regDocId,
            email: promotedStudentInfo.email,
            studentName: promotedStudentInfo.name,
            studentId: promotedStudentInfo.studentId,
            trip: tripData || {},
            isPromotion: true,
          },
        }).then(() => {
          emailFallbackQueued = true;
        }).catch(() => {});
      }
    } else if (legacyDocId) {
      // Ensure legacy mirror reflects approved_to_pay even when email skipped/disabled
      await db
        .collection("user-registrations")
        .doc(legacyDocId)
        .set({ status: "approved_to_pay", updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        .catch(() => {});
    }

    if (!skipSideEffects) {
      recordAuditLog(
        { uid: "system", email: adminEmail },
        "WAITLIST_PROMOTED",
        "trip_registration",
        promotedStudentInfo.regDocId,
        "success",
        {
          tripId,
          gender: promotedStudentInfo.gender,
          originalWaitlistPosition: promotedStudentInfo.waitlistPosition,
          promotedReason: `Seat vacated by registration ${regDocId} (${newStatus})`,
          emailDispatched,
          emailFallbackQueued,
        }
      ).catch(() => {});
    }
  }

  return {
    released,
    promoted: Boolean(promotedStudentInfo),
    promotedRegDocId: promotedStudentInfo?.regDocId,
    promotedStudent: promotedStudentInfo,
    promotion: {
      promoted: Boolean(promotedStudentInfo),
      promotedStudent: promotedStudentInfo,
      remainingWaitlistCount,
      emailDispatched,
      emailFallbackQueued,
    },
  };
}

/**
 * Handles capacity adjustment on a trip safely respecting gender quotas.
 * - When capacity increases: Promotes only eligible waitlisted students in FIFO order
 *   whose gender category & new total capacity allow allocation.
 * - When capacity decreases: NEVER deletes or demotes existing approved students;
 *   marks `overCapacity: true` if `newCapacity < totalJoined`.
 */
export async function adjustTripCapacity(params: {
  db?: FirebaseFirestore.Firestore;
  sendApprovalEmailFn?: typeof sendTripApprovalEmail;
  enqueueJobFn?: typeof enqueueDurableJob;
  skipSideEffects?: boolean;
  tripId: string;
  newCapacity: number;
  maleReservedSeats?: number;
  femaleReservedSeats?: number;
  adminContext?: AdminContext | null;
}): Promise<{
  success: boolean;
  promotedCount: number;
  overCapacity: boolean;
  totalSeats: number;
  totalJoined: number;
}> {
  const {
    tripId,
    newCapacity,
    maleReservedSeats,
    femaleReservedSeats,
    adminContext,
    skipSideEffects = false,
  } = params;
  if (!tripId || newCapacity < 0) {
    throw new Error("Invalid tripId or capacity");
  }

  const db = params.db || adminDb;
  const dispatchApprovalEmail = params.sendApprovalEmailFn || sendTripApprovalEmail;
  const enqueueJob = params.enqueueJobFn || enqueueDurableJob;
  const adminEmail = adminContext?.email || "admin";
  const tripRef = db.collection("trips").doc(tripId);
  const waitlistQuery = db
    .collection("tripRegistrations")
    .where("tripId", "==", tripId)
    .where("status", "==", "waitlisted");

  let promotedStudents: Array<any> = [];
  let isOverCapacity = false;
  let finalJoined = 0;
  let savedTripData: Record<string, any> = {};

  await runFastTransaction(db, async (transaction) => {
    const [tripSnap, waitlistSnap] = await Promise.all([
      transaction.get(tripRef),
      transaction.get(waitlistQuery),
    ]);
    if (!tripSnap.exists) throw new Error(`Trip ${tripId} not found`);

    const tripData = tripSnap.data() || {};
    const nextTripState: Record<string, any> = {
      ...tripData,
      totalSeats: newCapacity,
      ...(maleReservedSeats !== undefined ? { maleReservedSeats: Number(maleReservedSeats) } : {}),
      ...(femaleReservedSeats !== undefined ? { femaleReservedSeats: Number(femaleReservedSeats) } : {}),
    };
    savedTripData = nextTripState;

    const currentJoined = Number(tripData.totalJoined || 0);
    const now = FieldValue.serverTimestamp();

    if (newCapacity < currentJoined) {
      // Preserve existing approved students — NEVER delete or cancel anyone
      isOverCapacity = true;
      finalJoined = currentJoined;
      transaction.update(tripRef, {
        totalSeats: newCapacity,
        ...(maleReservedSeats !== undefined ? { maleReservedSeats: Number(maleReservedSeats) } : {}),
        ...(femaleReservedSeats !== undefined ? { femaleReservedSeats: Number(femaleReservedSeats) } : {}),
        overCapacity: true,
        updatedAt: now,
      });
      return;
    }

    isOverCapacity = false;

    const waitlistedEntries = waitlistSnap.docs
      .map((d) => ({
        id: d.id,
        ref: d.ref,
        data: d.data() || {},
        category: normalizeWaitlistGender((d.data() || {}).waitlistGender || (d.data() || {}).gender),
      }))
      .sort(compareWaitlistEntries);

    let runningTotal = currentJoined;
    let runningMale = Number(tripData.maleJoined || 0);
    let runningFemale = Number(tripData.femaleJoined || 0);
    const promotedIds = new Set<string>();

    for (const entry of waitlistedEntries) {
      const check = evaluateSeatAvailability(
        { ...nextTripState, totalJoined: runningTotal, maleJoined: runningMale, femaleJoined: runningFemale },
        entry.category
      );
      if (!check.canAllocate) continue;

      runningTotal += 1;
      if (entry.category === "male") runningMale += 1;
      else if (entry.category === "female") runningFemale += 1;
      promotedIds.add(entry.id);

      transaction.update(entry.ref, {
        status: "approved_to_pay",
        waitlistPosition: FieldValue.delete(),
        waitlistGender: FieldValue.delete(),
        promotedFromWaitlist: true,
        promotedAt: now,
        approvedAt: now,
        approvedBy: adminEmail,
        updatedAt: now,
      });

      promotedStudents.push({
        uid: entry.data.uid || entry.id.split("_")[1] || "",
        email: entry.data.email || "",
        name: entry.data.name || entry.data.studentName || entry.data.formData?.["Full Name"] || "Student",
        studentId: entry.data.studentId || entry.data.formData?.["Roll Number"] || "",
        regDocId: entry.id,
        formData: entry.data.formData || {},
        alreadyEmailed: Boolean(entry.data.approvalEmailSentAt || entry.data.approvalEmailStatus === "sent"),
      });
    }

    // Recalculate 1-based positions per gender for remaining waitlisted students
    const remaining = waitlistedEntries.filter((e) => !promotedIds.has(e.id));
    for (const cat of ["male", "female", "other"] as WaitlistGenderCategory[]) {
      const catQueue = remaining.filter((e) => e.category === cat).sort(compareWaitlistEntries);
      catQueue.forEach((entry, idx) => {
        const expectedPos = idx + 1;
        if (Number(entry.data.waitlistPosition) !== expectedPos) {
          transaction.update(entry.ref, {
            waitlistPosition: expectedPos,
            updatedAt: now,
          });
        }
      });
    }

    finalJoined = runningTotal;
    transaction.update(tripRef, {
      totalSeats: newCapacity,
      ...(maleReservedSeats !== undefined ? { maleReservedSeats: Number(maleReservedSeats) } : {}),
      ...(femaleReservedSeats !== undefined ? { femaleReservedSeats: Number(femaleReservedSeats) } : {}),
      totalJoined: runningTotal,
      maleJoined: runningMale,
      femaleJoined: runningFemale,
      waitlistedCount: remaining.length,
      maleWaitlistedCount: remaining.filter((e) => e.category === "male").length,
      femaleWaitlistedCount: remaining.filter((e) => e.category === "female").length,
      overCapacity: false,
      updatedAt: now,
    });
  });

  if (!skipSideEffects) {
    invalidateTripCache(tripId);
  }

  // Dispatch approval emails for newly promoted students (with durable fallback on failure)
  for (const student of promotedStudents) {
    if (student.alreadyEmailed || savedTripData.emailsDisabled || !student.email) continue;
    const { coordinator, whatsappLink, qrCodeUrl } = resolvePromotionEmailDetails(
      savedTripData,
      student.formData
    );
    try {
      const emailResult = await dispatchApprovalEmail({
        student: { name: student.name, email: student.email, studentId: student.studentId },
        trip: savedTripData,
        coordinator,
        whatsappLink,
        qrCodeUrl,
      });
      if (emailResult?.success) {
        await db.collection("tripRegistrations").doc(student.regDocId).update({
          status: "mail_sent",
          approvalEmailSentAt: FieldValue.serverTimestamp(),
          approvalEmailStatus: "sent",
          approvalEmailMessageId: emailResult.messageId || "sent",
          approvalEmailError: null,
          updatedAt: FieldValue.serverTimestamp(),
        }).catch(() => {});
      } else {
        const jobId = buildDeterministicJobId("approval_email", [tripId, student.uid, "promoted_capacity"]);
        await enqueueJob({
          jobId,
          jobType: "approval_email",
          payload: {
            tripId,
            uid: student.uid,
            regDocId: student.regDocId,
            email: student.email,
            studentName: student.name,
            studentId: student.studentId,
            trip: savedTripData,
            coordinator,
            whatsappLink,
            qrCodeUrl,
            isPromotion: true,
          },
        }).catch(() => {});
      }
    } catch {
      const jobId = buildDeterministicJobId("approval_email", [tripId, student.uid, "promoted_capacity"]);
      await enqueueJob({
        jobId,
        jobType: "approval_email",
        payload: {
          tripId,
          uid: student.uid,
          regDocId: student.regDocId,
          email: student.email,
          studentName: student.name,
          studentId: student.studentId,
          trip: savedTripData,
          isPromotion: true,
        },
      }).catch(() => {});
    }
  }

  if (!skipSideEffects) {
    recordAuditLog(
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
    ).catch(() => {});
  }

  return {
    success: true,
    promotedCount: promotedStudents.length,
    overCapacity: isOverCapacity,
    totalSeats: newCapacity,
    totalJoined: finalJoined,
  };
}

/**
 * Enqueues a dedicated "Trip Waitlist Confirmation" email via the durable queue (used as fallback).
 */
export async function enqueueWaitlistNotificationEmail(params: {
  tripId: string;
  uid: string;
  regDocId?: string;
  email?: string;
  studentEmail?: string;
  studentName: string;
  tripName: string;
  waitlistPosition: number;
  waitlistGender?: WaitlistGenderCategory;
  startDate?: string;
  tripStartDate?: string;
  endDate?: string;
  enqueueJobFn?: typeof enqueueDurableJob;
}): Promise<string> {
  const { tripId, uid, regDocId, studentName, tripName, waitlistPosition, waitlistGender } = params;
  const email = params.email || params.studentEmail || "";
  const startDate = params.startDate || params.tripStartDate || null;
  const endDate = params.endDate || null;
  const enqueueJob = params.enqueueJobFn || enqueueDurableJob;
  const jobId = `waitlist_email_${tripId}_${uid}`;

  await enqueueJob({
    jobId,
    jobType: "custom",
    payload: {
      action: "send_waitlist_email",
      tripId,
      uid,
      regDocId: regDocId || `${tripId}_${uid}`,
      email,
      studentName,
      tripName,
      waitlistPosition,
      waitlistGender: waitlistGender || null,
      startDate,
      endDate,
    },
  });

  return jobId;
}
