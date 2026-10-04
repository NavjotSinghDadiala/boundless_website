/**
 * BOUNDLESS SOCIETY — DURABLE EVENT & BACKGROUND JOB QUEUE
 * 
 * CORE ARCHITECTURAL PRINCIPLES:
 * 1. DATABASE FIRST, QUEUE SECOND, EXTERNAL SERVICES THIRD.
 * 2. ZERO HASHING: Uses natural, deterministic business identifiers (tripId, uid, jobType).
 * 3. AT-LEAST-ONCE DELIVERY with idempotent execution.
 * 4. LEASE LOCKING: Prevents concurrent workers from processing the same job.
 * 5. EXPONENTIAL BACKOFF: Prevents hammering failing external services (Brevo, Drive).
 * 6. DEAD-LETTER ROUTING: Moves unrecoverable jobs to dead_letter_jobs for admin inspection.
 */

import { adminDb } from "./firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export type JobType = 
  | "approval_email"
  | "correction_email"
  | "drive_upload"
  | "legacy_sync"
  | "audit_replication"
  | "custom";

export type JobStatus = 
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "dead_letter";

export interface DurableJobPayload {
  tripId?: string;
  uid?: string;
  email?: string;
  studentId?: string;
  studentName?: string;
  action?: string;
  details?: Record<string, any>;
  [key: string]: any;
}

export interface DurableJob {
  id: string; // Natural key: e.g. `${jobType}_${tripId}_${uid}`
  jobType: JobType;
  status: JobStatus;
  payload: DurableJobPayload;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  scheduledAt: Timestamp | Date;
  lockedUntil?: Timestamp | null;
  lockedBy?: string | null;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  completedAt?: Timestamp | null;
}

/**
 * Builds a deterministic natural key for a job without hashing.
 * Example: "approval_email_kodaikanal_2026_stu_abc123"
 */
export function buildDeterministicJobId(jobType: JobType, naturalParts: (string | undefined | null)[]): string {
  const cleanParts = naturalParts
    .filter(Boolean)
    .map((p) => String(p).trim().replace(/[^a-zA-Z0-9_-]/g, "_"));
  return `${jobType}_${cleanParts.join("_")}`;
}

/**
 * Enqueues a durable background job.
 * If the job with this deterministic ID already exists and is pending or completed, it will not be duplicated.
 */
export async function enqueueDurableJob(params: {
  jobId: string;
  jobType: JobType;
  payload: DurableJobPayload;
  maxAttempts?: number;
  delaySeconds?: number;
}): Promise<{ enqueued: boolean; id: string; status: string }> {
  const { jobId, jobType, payload, maxAttempts = 5, delaySeconds = 0 } = params;
  const jobRef = adminDb.collection("durable_jobs").doc(jobId);

  const now = new Date();
  const scheduledTime = new Date(now.getTime() + delaySeconds * 1000);

  const snap = await jobRef.get();
  if (snap.exists) {
    const data = snap.data();
    // If already completed or actively pending, preserve idempotency
    if (data?.status === "completed" || data?.status === "processing") {
      return { enqueued: false, id: jobId, status: data?.status || "existing" };
    }
    // If failed or dead_letter, permit retry if payload was updated
    if (data?.status === "failed") {
      await jobRef.update({
        status: "pending",
        scheduledAt: Timestamp.fromDate(scheduledTime),
        updatedAt: FieldValue.serverTimestamp(),
        attempts: 0,
        lastError: null,
        payload: { ...data.payload, ...payload },
      });
      return { enqueued: true, id: jobId, status: "retried" };
    }
    return { enqueued: false, id: jobId, status: data?.status || "pending" };
  }

  const newJob: Record<string, any> = {
    id: jobId,
    jobType,
    status: "pending",
    payload,
    attempts: 0,
    maxAttempts,
    scheduledAt: Timestamp.fromDate(scheduledTime),
    lockedUntil: null,
    lockedBy: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await jobRef.set(newJob);
  return { enqueued: true, id: jobId, status: "pending" };
}

/**
 * Acquires a batch of due jobs for processing, applying lease locks.
 * Optimized to use default single-field Firestore indexes (no composite index required).
 */
export async function acquireDueJobs(params: {
  workerId: string;
  batchSize?: number;
  leaseSeconds?: number;
  jobType?: JobType;
}): Promise<DurableJob[]> {
  const { workerId, batchSize = 10, leaseSeconds = 60, jobType } = params;
  const nowMs = Date.now();
  const leaseExpiry = Timestamp.fromDate(new Date(nowMs + leaseSeconds * 1000));

  // Query pending jobs using default single-field index on "status"
  let pendingQuery = adminDb
    .collection("durable_jobs")
    .where("status", "==", "pending")
    .limit(batchSize * 2);

  if (jobType) {
    pendingQuery = pendingQuery.where("jobType", "==", jobType);
  }

  const snap = await pendingQuery.get();
  const acquired: DurableJob[] = [];

  for (const doc of snap.docs) {
    if (acquired.length >= batchSize) break;
    const data = doc.data() as DurableJob;

    // Check if scheduled time has arrived
    const scheduledMs = data.scheduledAt instanceof Timestamp 
      ? data.scheduledAt.toMillis() 
      : new Date(data.scheduledAt).getTime();

    if (scheduledMs > nowMs) {
      continue; // Not yet due (under backoff delay)
    }

    try {
      await adminDb.runTransaction(async (transaction) => {
        const freshSnap = await transaction.get(doc.ref);
        if (!freshSnap.exists) return;
        const freshData = freshSnap.data() as DurableJob;

        if (freshData.status !== "pending") {
          return; // Concurrently claimed or finished
        }

        transaction.update(doc.ref, {
          status: "processing",
          lockedUntil: leaseExpiry,
          lockedBy: workerId,
          attempts: (freshData.attempts || 0) + 1,
          updatedAt: FieldValue.serverTimestamp(),
        });

        acquired.push({
          ...freshData,
          attempts: (freshData.attempts || 0) + 1,
          status: "processing",
          lockedUntil: leaseExpiry,
          lockedBy: workerId,
        });
      });
    } catch {
      // Transaction collision under high concurrency — skip to next
    }
  }

  return acquired;
}

/**
 * Marks a job as successfully completed.
 */
export async function completeDurableJob(jobId: string, resultDetails?: Record<string, any>): Promise<void> {
  const jobRef = adminDb.collection("durable_jobs").doc(jobId);
  await jobRef.update({
    status: "completed",
    lockedUntil: null,
    lockedBy: null,
    resultDetails: resultDetails || null,
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Marks a job failure, applying exponential backoff or moving to dead_letter_jobs.
 */
export async function failDurableJob(
  job: DurableJob,
  error: Error | string
): Promise<{ status: "failed" | "dead_letter"; nextRetryDelaySeconds: number }> {
  const errorMessage = typeof error === "string" ? error : error?.message || "Unknown error";
  const jobRef = adminDb.collection("durable_jobs").doc(job.id);
  const nextAttempt = job.attempts;

  if (nextAttempt >= job.maxAttempts) {
    // Dead-letter escalation
    const dlqRef = adminDb.collection("dead_letter_jobs").doc(job.id);
    const deadPayload = {
      ...job,
      status: "dead_letter",
      finalError: errorMessage,
      deadLetteredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const batch = adminDb.batch();
    batch.set(dlqRef, deadPayload);
    batch.update(jobRef, {
      status: "dead_letter",
      lastError: errorMessage,
      lockedUntil: null,
      lockedBy: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return { status: "dead_letter", nextRetryDelaySeconds: 0 };
  }

  // Exponential backoff: 5s, 15s, 45s, 135s, 405s...
  const delaySeconds = Math.min(600, 5 * Math.pow(3, nextAttempt - 1));
  const nextScheduled = Timestamp.fromDate(new Date(Date.now() + delaySeconds * 1000));

  await jobRef.update({
    status: "pending",
    lastError: errorMessage,
    scheduledAt: nextScheduled,
    lockedUntil: null,
    lockedBy: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { status: "failed", nextRetryDelaySeconds: delaySeconds };
}
