import { NextResponse } from "next/server";
import { acquireDueJobs, completeDurableJob, failDurableJob, DurableJob } from "@/lib/durableQueue";
import { sendTripApprovalEmail } from "@/lib/email/mailer.js";
import { sendCorrectionEmailBrevo, sendTripWaitlistEmail } from "@/lib/brevo.js";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

/**
 * Background Queue Processor
 * Can be triggered by:
 * - Vercel Cron (GET /api/cron/process-queue)
 * - Admin manual retry trigger
 * - Internal background runner
 */
export async function GET(request: Request) {
  return handleProcessQueue(request);
}

export async function POST(request: Request) {
  return handleProcessQueue(request);
}

async function handleProcessQueue(request: Request) {
  // Authorization verification
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET || process.env.SESSION_SECRET || "";
  
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  const isAuthorized =
    (cronSecret && (token === cronSecret || querySecret === cronSecret)) ||
    process.env.NODE_ENV === "development";

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workerId = `worker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const jobs = await acquireDueJobs({ workerId, batchSize: 20, leaseSeconds: 60 });

  if (jobs.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: "Queue is empty or all jobs leased" });
  }

  const results: { id: string; type: string; status: string; error?: string }[] = [];

  for (const job of jobs) {
    try {
      if (job.jobType === "approval_email") {
        const payload = job.payload || {};
        const emailResult = await sendTripApprovalEmail({
          student: {
            name: payload.studentName || "Student",
            email: payload.email || "",
            studentId: payload.studentId || "",
          },
          trip: payload.trip || {},
          coordinator: payload.coordinator,
          whatsappLink: payload.whatsappLink,
          qrCodeUrl: payload.qrCodeUrl,
        });

        if (emailResult.success) {
          await completeDurableJob(job.id, { messageId: emailResult.messageId });
          results.push({ id: job.id, type: job.jobType, status: "completed" });
        } else {
          const failRes = await failDurableJob(job, emailResult.error || "Brevo dispatch failed");
          results.push({ id: job.id, type: job.jobType, status: failRes.status, error: emailResult.error });
        }
      } else if (job.jobType === "correction_email") {
        const payload = job.payload || {};
        const emailResult = await sendCorrectionEmailBrevo({
          toEmail: payload.email || "",
          toName: payload.studentName || "Student",
          tripName: payload.tripName || "Trip",
          issueText: payload.issueText || "Details need correction",
          actionRequiredFields: payload.actionRequiredFields || [],
        });

        if (emailResult) {
          await completeDurableJob(job.id, { result: "sent" });
          results.push({ id: job.id, type: job.jobType, status: "completed" });
        } else {
          const failRes = await failDurableJob(job, "Correction email dispatch failed");
          results.push({ id: job.id, type: job.jobType, status: failRes.status });
        }
      } else if (job.jobType === "custom" && job.payload?.action === "send_waitlist_email") {
        const payload = job.payload || {};
        const emailResult = await sendTripWaitlistEmail({
          toEmail: payload.email || "",
          toName: payload.studentName || "Student",
          tripName: payload.tripName || "Trip",
          waitlistPosition: Number(payload.waitlistPosition || 1),
          tripDates: payload.startDate ? `${payload.startDate} to ${payload.endDate || ""}` : "",
          tripId: payload.tripId || "",
        });

        if (emailResult.success) {
          await completeDurableJob(job.id, { messageId: emailResult.messageId });
          results.push({ id: job.id, type: job.jobType, status: "completed" });
        } else {
          const failRes = await failDurableJob(job, emailResult.error || "Waitlist email dispatch failed");
          results.push({ id: job.id, type: job.jobType, status: failRes.status, error: emailResult.error });
        }
      } else if (job.jobType === "drive_upload") {
        const payload = job.payload || {};
        const driveUploadUrl = process.env.DRIVE_UPLOAD_URL;
        if (!driveUploadUrl) {
          const failRes = await failDurableJob(job, "DRIVE_UPLOAD_URL not configured");
          results.push({ id: job.id, type: job.jobType, status: failRes.status, error: "DRIVE_UPLOAD_URL missing" });
          continue;
        }

        const driveTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Drive upload worker timed out after 30 seconds")), 30000)
        );

        try {
          const driveRes = await Promise.race([
            fetch(driveUploadUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: payload.fileName || "Student-ID.pdf",
                mimeType: payload.mimeType || "application/pdf",
                fileBase64: payload.fileBase64 || "",
                email: payload.email || "anonymous",
                tripName: payload.tripName || "Event",
                subFolderType: payload.subFolderType || "Student IDs",
                secret: process.env.DRIVE_UPLOAD_SECRET || "",
                uid: payload.uid || "",
                tripId: payload.tripId || "",
                studentName: payload.studentName || "",
                studentEmail: payload.email || "anonymous",
                studentId: payload.studentId || "",
                gender: payload.gender || "",
                documentType: payload.documentType || "Student ID",
                fieldName: payload.fieldName || "Student ID Card Copy",
              }),
              redirect: "follow",
            }),
            driveTimeout,
          ]);

          const rawText = await driveRes.text();
          let driveResult: any = {};
          try {
            driveResult = JSON.parse(rawText);
          } catch {
            throw new Error(`Non-JSON response from Google Apps Script (HTTP ${driveRes.status})`);
          }

          if (driveResult.status === "success" && driveResult.fileUrl) {
            const fileUrl = driveResult.fileUrl;
            const fileId = driveResult.fileId || driveResult.driveFileId || "";

            // Update registration in Firestore if tripId and uid are present
            if (payload.tripId && payload.uid) {
              const regDocId = `${payload.tripId}_${payload.uid}`;
              const regRef = adminDb.collection("tripRegistrations").doc(regDocId);
              await regRef.set(
                {
                  formData: {
                    ["Student ID Card Copy"]: fileUrl,
                    studentIdFileId: fileId,
                  },
                  studentIdDocument: {
                    documentType: "student_id",
                    fieldName: "Student ID Card Copy",
                    driveFileId: fileId || null,
                    driveUrl: fileUrl,
                    fileName: payload.fileName || "Student-ID.pdf",
                    uploadedAt: new Date().toISOString(),
                  },
                  updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            }

            await completeDurableJob(job.id, { fileUrl, fileId });
            results.push({ id: job.id, type: job.jobType, status: "completed" });
          } else {
            throw new Error(driveResult.error || "Drive upload returned non-success status");
          }
        } catch (driveErr: any) {
          const failRes = await failDurableJob(job, driveErr.message || "Drive upload failed");
          results.push({ id: job.id, type: job.jobType, status: failRes.status, error: driveErr.message });
        }
      } else {
        // Unknown or custom job type
        await completeDurableJob(job.id, { notice: "No specific handler; marked complete" });
        results.push({ id: job.id, type: job.jobType, status: "completed" });
      }
    } catch (err: any) {
      const failRes = await failDurableJob(job, err);
      results.push({ id: job.id, type: job.jobType, status: failRes.status, error: err?.message });
    }
  }

  return NextResponse.json({
    success: true,
    processed: jobs.length,
    results,
  });
}
