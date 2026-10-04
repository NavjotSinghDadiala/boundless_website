import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendApprovalEmail, sendCorrectionRequestEmail } from "@/lib/brevo";
import { sendTripApprovalEmail } from "@/lib/email/mailer";
import {
  getDeduplicatedRegistrationsForTrip,
  getCanonicalTripRegDocId,
  mergeLegacyIntoCanonical,
} from "@/lib/tripRegistration";
import {
  isAuthorizedAdmin,
  getAuthenticatedCoordinator,
  getCoordinatorTripScope,
  isApprovedRegistrationStatus,
} from "@/lib/coordinatorAuth";
import { requireFullAdmin, recordAuditLog } from "@/lib/adminAuth";
import { invalidateTripCache } from "@/lib/tripCache";
import { completeTripAndRecordHistory } from "@/lib/tripHistory";
import {
  allocateSeatOrWaitlistTransaction,
  releaseSeatAndPromoteWaitlist,
  adjustTripCapacity,
  enqueueWaitlistNotificationEmail,
} from "@/lib/tripCapacity";
import { invalidateStudentDirectoryCache } from "@/lib/studentDirectory";
import { isQuotaError } from "@/lib/firebase-fallback";

// Helper to resolve the coordinator assigned to a student's chosen option
function resolveAssignedCoordinator(coordinators, formData) {
  if (!Array.isArray(coordinators) || coordinators.length === 0) return null;
  if (coordinators.length === 1) {
    const c = coordinators[0];
    return typeof c === "object" && c !== null ? c : { name: String(c) };
  }

  const studentAnswers = Object.values(formData || {})
    .filter((val) => typeof val === "string")
    .map((val) => val.trim().toLowerCase());

  // Match coordinator by assignedOption against student's form choices
  for (const c of coordinators) {
    if (typeof c === "object" && c !== null && c.assignedOption) {
      const opt = String(c.assignedOption).trim().toLowerCase();
      if (studentAnswers.some((ans) => ans === opt || ans.includes(opt) || opt.includes(ans))) {
        return c;
      }
    }
  }

  // Fallback to the first coordinator
  const first = coordinators[0];
  return typeof first === "object" && first !== null ? first : { name: String(first) };
}

// Helper to resolve city/option-specific WhatsApp Link & QR Code
function resolveWhatsappDetails(tripData, formData) {
  let whatsappLink = tripData?.whatsappLink || "";
  let qrCodeUrl = tripData?.qrCodeUrl || "";

  const studentAnswers = Object.values(formData || {});
  const citySettings = tripData?.cityWhatsappSettings || {};
  for (const ans of studentAnswers) {
    if (typeof ans === "string") {
      const trimmed = ans.trim();
      const matchedKey = Object.keys(citySettings).find(
        (k) => k.toLowerCase() === trimmed.toLowerCase()
      );
      if (matchedKey && citySettings[matchedKey]) {
        if (citySettings[matchedKey].whatsappLink) {
          whatsappLink = citySettings[matchedKey].whatsappLink;
        }
        if (citySettings[matchedKey].qrCodeUrl) {
          qrCodeUrl = citySettings[matchedKey].qrCodeUrl;
        }
        break;
      }
    }
  }

  return { whatsappLink, qrCodeUrl };
}

// Helper function to archive the attendee and coordinator rosters
async function archiveEventRoster(tripId) {
  try {
    const tripDocRef = adminDb.collection("trips").doc(tripId);
    const tripSnap = await tripDocRef.get();
    if (!tripSnap.exists) return;
    const tripData = tripSnap.data() || {};

    // 1. Fetch all paid attendees for this trip from both canonical and legacy
    const [canSnap, legSnap] = await Promise.all([
      adminDb.collection("tripRegistrations").where("tripId", "==", tripId).where("status", "==", "paid").get(),
      adminDb.collection("user-registrations").where("tripId", "==", tripId).where("status", "==", "paid").get(),
    ]);

    const attendeesMap = new Map();
    const seenEmails = new Set();

    for (const d of canSnap.docs) {
      const data = d.data() || {};
      const nameKey = Object.keys(data.formData || {}).find(
        (k) => k.toLowerCase().includes("name") || k.toLowerCase().includes("fullname")
      );
      const studentName = nameKey ? data.formData[nameKey] : "Student";
      const key = data.uid || data.email || d.id;
      attendeesMap.set(key, {
        uid: data.uid,
        email: data.email,
        name: studentName,
        gender: data.gender || "unknown",
        paymentVerifiedAt: data.paymentVerifiedAt?.toDate?.()?.toISOString() || data.paymentVerifiedAt || null,
      });
      if (data.email) seenEmails.add(data.email.toLowerCase());
    }

    for (const d of legSnap.docs) {
      const data = d.data() || {};
      const uid = data.uid;
      const email = (data.email || "").toLowerCase();
      if ((!uid || !attendeesMap.has(uid)) && (!email || !seenEmails.has(email))) {
        const nameKey = Object.keys(data.formData || {}).find(
          (k) => k.toLowerCase().includes("name") || k.toLowerCase().includes("fullname")
        );
        const studentName = nameKey ? data.formData[nameKey] : "Student";
        const key = uid || email || d.id;
        attendeesMap.set(key, {
          uid: data.uid,
          email: data.email,
          name: studentName,
          gender: data.gender || "unknown",
          paymentVerifiedAt: data.paymentVerifiedAt?.toDate?.()?.toISOString() || data.paymentVerifiedAt || null,
        });
      }
    }

    const attendees = Array.from(attendeesMap.values());

    // 2. Save archived roster
    const archiveRef = adminDb.collection("archived_rosters").doc(tripId);
    await archiveRef.set({
      tripId,
      tripName: tripData.name || "Unnamed Trip",
      coordinators: tripData.coordinators || [],
      attendees,
      closedAt: new Date(),
    });

    // 3. Mark trip roster as saved
    await tripDocRef.update({
      finalRosterSaved: true,
    });
    console.log(`Successfully archived event roster for trip ${tripId} with ${attendees.length} paid attendees.`);
  } catch (error) {
    console.error("Error archiving event roster:", error);
  }
}

/* GET → Retrieve registrations for a trip with role-based visibility */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");

    if (!tripId) {
      return NextResponse.json({ error: "Trip ID is required" }, { status: 400 });
    }

    try {
      await requireFullAdmin(req, { resourceType: "registration" });
    } catch (authErr) {
      if (authErr.status === 403) {
        return NextResponse.json(
          { error: "Forbidden: Full Administrator privileges required to access registrations." },
          { status: 403 }
        );
      }
      const coordinatorToken = await getAuthenticatedCoordinator(req);
      if (coordinatorToken) {
        return NextResponse.json(
          { error: "Forbidden: Trip Coordinators cannot access administrative registration data. Please use /api/coordinator/dashboard." },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Retrieve all deduplicated registrations for this trip (canonical precedence)
    let registrations = await getDeduplicatedRegistrationsForTrip(tripId);

    // Sort in-memory by submittedAt desc
    registrations.sort((a, b) => {
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ registrations }, { status: 200 });
  } catch (error) {
    console.error("GET Admin Registrations Error:", error);
    return NextResponse.json({ error: "Failed to fetch registrations. Please try again." }, { status: 500 });
  }
}

/* POST → Update individual registration status (Admin Only - Coordinators Blocked with 403) */
export async function POST(req) {
  try {
    let admin = null;
    try {
      admin = await requireFullAdmin(req, { resourceType: "registration" });
    } catch (authErr) {
      if (authErr.status === 403) {
        return NextResponse.json(
          { error: "Forbidden: Full Administrator privileges required to modify registrations." },
          { status: 403 }
        );
      }
      const coordinatorToken = await getAuthenticatedCoordinator(req);
      if (coordinatorToken) {
        return NextResponse.json(
          { error: "Forbidden: Trip Coordinators have read-only access and cannot modify registrations." },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    let adminEmail = admin?.email || "Admin";

    const body = await req.json();
    const {
      registrationId,
      action,
      status: directStatus,
      reason,
      issueText,
      actionRequiredFields,
      studentIdVerified,
      consentFormVerified,
      verifiedConsentForms,
      consentTemplateId,
      verified,
    } = body;

    if (!registrationId) {
      return NextResponse.json(
        { error: "Missing registrationId" },
        { status: 400 }
      );
    }

    // Resolve registration: check canonical first, then legacy
    let regSnap = null;
    let isCanonical = false;
    let canonicalDocId = null;
    let legacyDocId = null;

    const canRef = adminDb.collection("tripRegistrations").doc(registrationId);
    const canSnap = await canRef.get();
    if (canSnap.exists) {
      regSnap = canSnap;
      isCanonical = true;
      canonicalDocId = canSnap.id;
    } else {
      const legRef = adminDb.collection("user-registrations").doc(registrationId);
      const legSnap = await legRef.get();
      if (legSnap.exists) {
        regSnap = legSnap;
        isCanonical = false;
        legacyDocId = legSnap.id;
      }
    }

    if (!regSnap || !regSnap.exists) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const regData = regSnap.data() || {};
    const tripId = regData.tripId;
    const uid = regData.uid;
    const email = regData.email;
    const oldStatus = regData.status || "registered";
    const gender = (regData.gender || "unknown").toLowerCase();

    if (isCanonical) {
      if (email) legacyDocId = `${tripId}_${email}`;
    } else {
      if (uid) canonicalDocId = getCanonicalTripRegDocId(tripId, uid);
    }

    // Fetch trip document
    const tripDocRef = adminDb.collection("trips").doc(tripId);
    const tripSnap = await tripDocRef.get();
    const tripData = tripSnap.exists ? tripSnap.data() || {} : {};

    const userEmail = email || regData.email || "";

    const nameKey = Object.keys(regData.formData || {}).find(
      (k) => k.toLowerCase().includes("name") || k.toLowerCase().includes("fullname")
    );
    const userName = (nameKey && regData.formData[nameKey]) || regData.name || regData.userName || "Student";

    const updatePayload = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    let auditEntry = null;
    let emailResultDetails = null;

    // Helper to evaluate confirmed state
    const isConfirmedState = (s) => s === "approved_to_pay" || s === "paid" || s === "mail_sent";

    // 1. Direct checkpoint toggles or batch verifications
    if (verifiedConsentForms !== undefined) {
      const existingMap = regData.verifiedConsentForms || {};
      const newMap = { ...existingMap, ...verifiedConsentForms };
      updatePayload.verifiedConsentForms = newMap;

      const templates = tripData.consentTemplates && tripData.consentTemplates.length > 0
        ? tripData.consentTemplates
        : (tripData.consentFormTemplateUrl ? [{ id: "legacy-consent" }] : []);

      if (templates.length > 0) {
        updatePayload.consentFormVerified = templates.every((t) => newMap[t.id]);
      }
    }

    if (consentFormVerified !== undefined) {
      updatePayload.consentFormVerified = Boolean(consentFormVerified);
    }

    if (studentIdVerified !== undefined) {
      updatePayload.studentIdVerified = Boolean(studentIdVerified);
    }

    // 2. Action routing
    if (action === "verify_student_id") {
      const isVerified = studentIdVerified !== undefined
        ? Boolean(studentIdVerified)
        : (verified !== undefined ? Boolean(verified) : true);
      updatePayload.studentIdVerified = isVerified;
      auditEntry = {
        type: "checkpoint_verified",
        actor: adminEmail,
        message: isVerified ? "Student ID document verified" : "Student ID verification revoked",
        timestamp: new Date().toISOString(),
      };
    } else if (action === "verify_consent_form") {
      const tId = consentTemplateId || "legacy-consent";
      const isVerified = verified !== undefined ? Boolean(verified) : true;
      const currentMap = regData.verifiedConsentForms || {};
      const updatedMap = { ...currentMap, [tId]: isVerified };
      updatePayload.verifiedConsentForms = updatedMap;

      const templates = tripData.consentTemplates && tripData.consentTemplates.length > 0
        ? tripData.consentTemplates
        : (tripData.consentFormTemplateUrl ? [{ id: "legacy-consent" }] : []);

      if (templates.length > 0) {
        updatePayload.consentFormVerified = templates.every((t) => updatedMap[t.id]);
      }
      auditEntry = {
        type: "checkpoint_verified",
        actor: adminEmail,
        message: `Consent Form (${tId}) ${isVerified ? "verified" : "unverified"}`,
        timestamp: new Date().toISOString(),
      };
    } else if (action === "approve" || directStatus === "approved_to_pay" || directStatus === "mail_sent") {
      // CHECKPOINT VALIDATION:
      // 1. Student ID must be verified
      const isStudentIdOk = updatePayload.studentIdVerified !== undefined
        ? updatePayload.studentIdVerified
        : Boolean(regData.studentIdVerified);
      if (!isStudentIdOk) {
        return NextResponse.json(
          { error: "Student ID must be verified before approving registration." },
          { status: 400 }
        );
      }

      // 2. Consent Forms must be verified if required
      const requiredTemplates = tripData.consentTemplates && tripData.consentTemplates.length > 0
        ? tripData.consentTemplates
        : (tripData.consentFormTemplateUrl ? [{ id: "legacy-consent" }] : []);

      if (requiredTemplates.length > 0) {
        const isConsentOk = updatePayload.consentFormVerified !== undefined
          ? updatePayload.consentFormVerified
          : Boolean(regData.consentFormVerified);
        if (!isConsentOk) {
          return NextResponse.json(
            { error: "All required consent forms must be verified before approving registration." },
            { status: 400 }
          );
        }
      }

      // SEAT ALLOCATION / WAITLIST TRANSACTION
      let allocationResult;
      await adminDb.runTransaction(async (transaction) => {
        allocationResult = await allocateSeatOrWaitlistTransaction({
          transaction,
          tripId,
          uid: uid || regData.uid,
          regDocId: canonicalDocId || registrationId,
          gender,
          studentName: userName,
          studentId: regData.formData?.["Student ID Number"] || regData.formData?.["Roll Number"] || "",
          studentEmail: userEmail,
          adminEmail,
        });
      });

      invalidateTripCache(tripId);

      if (allocationResult.allocated) {
        // Allocated a seat: proceed to approval email flow
        updatePayload.status = "approved_to_pay";

        const alreadySent = Boolean(
          regData.approvalEmailSentAt ||
          regData.approvalEmailStatus === "sent" ||
          regData.status === "mail_sent"
        );
        let emailDispatched = false;

        if (!alreadySent && !tripData.emailsDisabled) {
          const tripName = tripData.name || "Trip";
          const { whatsappLink, qrCodeUrl } = resolveWhatsappDetails(tripData, regData.formData);
          const assignedCoordinator = resolveAssignedCoordinator(tripData.coordinators, regData.formData);

          try {
            const emailResult = await sendTripApprovalEmail({
              student: {
                name: userName,
                email: userEmail,
                studentId: regData.formData?.["Student ID Number"] || regData.formData?.["Roll Number"] || "",
              },
              trip: tripData,
              coordinator: assignedCoordinator,
              whatsappLink,
              qrCodeUrl,
            });

            updatePayload.approvalEmailLastAttemptAt = FieldValue.serverTimestamp();

            if (emailResult.success) {
              updatePayload.approvalEmailSentAt = FieldValue.serverTimestamp();
              updatePayload.approvalEmailStatus = "sent";
              updatePayload.approvalEmailMessageId = emailResult.messageId || "sent";
              updatePayload.approvalEmailError = null;
              updatePayload.status = "mail_sent";
              emailDispatched = true;
              emailResultDetails = { sent: true, status: "sent", messageId: emailResult.messageId };
            } else {
              updatePayload.approvalEmailStatus = "failed";
              updatePayload.approvalEmailError = emailResult.error || "Failed to dispatch email";
              updatePayload.status = "approved_to_pay";
              emailResultDetails = { sent: false, status: "failed", error: emailResult.error };
            }
          } catch (emailErr) {
            console.error("Failed to send Brevo approval email:", emailErr);
            const safeError = emailErr?.message || "Failed to send approval email";
            updatePayload.approvalEmailStatus = "failed";
            updatePayload.approvalEmailError = safeError;
            updatePayload.approvalEmailLastAttemptAt = FieldValue.serverTimestamp();
            updatePayload.status = "approved_to_pay";
            emailResultDetails = { sent: false, status: "failed", error: safeError };
          }
        } else {
          updatePayload.status = regData.status === "mail_sent" ? "mail_sent" : "approved_to_pay";
          if (alreadySent) {
            emailResultDetails = { sent: false, status: "already_sent", skipped: true };
          } else if (tripData.emailsDisabled) {
            updatePayload.approvalEmailStatus = "disabled";
            emailResultDetails = { sent: false, status: "disabled", skipped: true };
          }
        }

        auditEntry = {
          type: "approved",
          actor: adminEmail,
          message: emailDispatched
            ? "Registration approved and confirmation email sent."
            : alreadySent
            ? "Registration approved (confirmation email was already sent)."
            : tripData.emailsDisabled
            ? "Registration approved (trip emails disabled)."
            : `Registration approved (email delivery failed: ${updatePayload.approvalEmailError || "unknown error"}).`,
          timestamp: new Date().toISOString(),
        };
      } else {
        // No seats available: automatically assigned to waiting list
        updatePayload.status = "waitlisted";
        updatePayload.waitlistPosition = allocationResult.waitlistPosition;
        emailResultDetails = { waitlisted: true, position: allocationResult.waitlistPosition };

        if (!tripData.emailsDisabled) {
          try {
            await enqueueWaitlistNotificationEmail({
              tripId,
              uid: uid || regData.uid,
              email: userEmail,
              studentName: userName,
              tripName: tripData.name || "Expedition",
              waitlistPosition: allocationResult.waitlistPosition,
              startDate: tripData.startDate,
              endDate: tripData.endDate,
            });
          } catch (wErr) {
            console.warn("Failed to enqueue waitlist email:", wErr);
          }
        }

        auditEntry = {
          type: "waitlisted",
          actor: adminEmail,
          message: `Trip capacity reached. Registration placed on waiting list at position #${allocationResult.waitlistPosition}.`,
          timestamp: new Date().toISOString(),
        };
      }
    } else if (action === "resend_approval_email") {
      if (!isConfirmedState(regData.status)) {
        return NextResponse.json(
          { error: "Cannot resend email: Registration is not currently approved." },
          { status: 400 }
        );
      }

      const tripName = tripData.name || "Trip";
      const { whatsappLink, qrCodeUrl } = resolveWhatsappDetails(tripData, regData.formData);
      const assignedCoordinator = resolveAssignedCoordinator(tripData.coordinators, regData.formData);

      let resendSuccess = false;
      let resendError = null;

      try {
        const emailResult = await sendTripApprovalEmail({
          student: {
            name: userName,
            email: userEmail,
            studentId: regData.formData?.["Student ID Number"] || regData.formData?.["Roll Number"] || "",
          },
          trip: tripData,
          coordinator: assignedCoordinator,
          whatsappLink,
          qrCodeUrl,
        });

        updatePayload.approvalEmailLastAttemptAt = FieldValue.serverTimestamp();

        if (emailResult.success) {
          updatePayload.approvalEmailSentAt = FieldValue.serverTimestamp();
          updatePayload.approvalEmailStatus = "sent";
          updatePayload.approvalEmailMessageId = emailResult.messageId || "sent";
          updatePayload.approvalEmailError = null;
          updatePayload.status = "mail_sent";
          resendSuccess = true;
          emailResultDetails = { sent: true, status: "sent", messageId: emailResult.messageId };
        } else {
          updatePayload.approvalEmailStatus = "failed";
          updatePayload.approvalEmailError = emailResult.error || "Failed to dispatch email";
          resendError = emailResult.error;
          emailResultDetails = { sent: false, status: "failed", error: emailResult.error };
        }
      } catch (err) {
        console.error("Resend approval email error:", err);
        const safeError = err?.message || "Failed to send email";
        updatePayload.approvalEmailStatus = "failed";
        updatePayload.approvalEmailError = safeError;
        updatePayload.approvalEmailLastAttemptAt = FieldValue.serverTimestamp();
        resendError = safeError;
        emailResultDetails = { sent: false, status: "failed", error: safeError };
      }

      auditEntry = {
        type: "approval_email_resent",
        actor: adminEmail,
        message: resendSuccess
          ? "Approval confirmation email resent successfully."
          : `Resending approval email failed: ${resendError || "unknown error"}.`,
        timestamp: new Date().toISOString(),
      };
    } else if (action === "reject" || directStatus === "rejected") {
      const rejectReason = (reason || issueText || "").trim();
      if (!rejectReason) {
        return NextResponse.json(
          { error: "Rejection reason is mandatory." },
          { status: 400 }
        );
      }

      await releaseSeatAndPromoteWaitlist({
        tripId,
        regDocId: canonicalDocId || registrationId,
        newStatus: "rejected",
        reason: rejectReason,
        adminEmail,
      });

      updatePayload.status = "rejected";
      updatePayload.issueText = rejectReason;

      auditEntry = {
        type: "rejected",
        actor: adminEmail,
        reason: rejectReason,
        message: rejectReason,
        timestamp: new Date().toISOString(),
      };
    } else if (action === "request_reupload" || directStatus === "action_required") {
      const correctionReason = (reason || issueText || "").trim();
      if (!correctionReason) {
        return NextResponse.json(
          { error: "Correction reason is mandatory." },
          { status: 400 }
        );
      }

      const fields = Array.isArray(actionRequiredFields) ? actionRequiredFields : [];
      if (fields.length === 0) {
        return NextResponse.json(
          { error: "At least one field or document must be selected for correction." },
          { status: 400 }
        );
      }

      await releaseSeatAndPromoteWaitlist({
        tripId,
        regDocId: canonicalDocId || registrationId,
        newStatus: "action_required",
        reason: correctionReason,
        adminEmail,
      });

      updatePayload.status = "action_required";
      updatePayload.issueText = correctionReason;
      updatePayload.actionRequiredFields = fields;

      if (!tripData.emailsDisabled) {
        // Dispatch correction request email (non-blocking so admin mutation resolves immediately)
        sendCorrectionRequestEmail(
          regData.email,
          userName,
          tripData.name || "Trip",
          correctionReason,
          fields,
          tripId
        ).catch((emailErr) => {
          console.error("Failed to send correction request email:", emailErr);
        });
      }

      auditEntry = {
        type: "reupload_requested",
        actor: adminEmail,
        reason: correctionReason,
        message: correctionReason,
        fields,
        timestamp: new Date().toISOString(),
      };
    } else if (action === "revoke_approval") {
      const revokeReason = (reason || issueText || "").trim();
      if (!revokeReason) {
        return NextResponse.json(
          { error: "Revocation reason is mandatory." },
          { status: 400 }
        );
      }

      await releaseSeatAndPromoteWaitlist({
        tripId,
        regDocId: canonicalDocId || registrationId,
        newStatus: "registered",
        reason: revokeReason,
        adminEmail,
      });

      updatePayload.status = "registered";
      updatePayload.issueText = revokeReason;

      auditEntry = {
        type: "approval_revoked",
        actor: adminEmail,
        reason: revokeReason,
        message: revokeReason,
        timestamp: new Date().toISOString(),
      };
    } else if (action === "withdrawn" || directStatus === "withdrawn") {
      await releaseSeatAndPromoteWaitlist({
        tripId,
        regDocId: canonicalDocId || registrationId,
        newStatus: "withdrawn",
        reason: reason || "Student withdrawn",
        adminEmail,
      });

      updatePayload.status = "withdrawn";

      auditEntry = {
        type: "withdrawn",
        actor: adminEmail,
        message: "Registration marked as withdrawn",
        timestamp: new Date().toISOString(),
      };
    } else if (action === "declined" || directStatus === "declined") {
      await releaseSeatAndPromoteWaitlist({
        tripId,
        regDocId: canonicalDocId || registrationId,
        newStatus: "declined",
        reason: reason || "Student declined",
        adminEmail,
      });

      updatePayload.status = "declined";

      auditEntry = {
        type: "declined",
        actor: adminEmail,
        message: "Registration marked as declined",
        timestamp: new Date().toISOString(),
      };
    } else if (directStatus !== undefined) {
      updatePayload.status = directStatus;
      if (issueText !== undefined) updatePayload.issueText = issueText;
      if (actionRequiredFields !== undefined) updatePayload.actionRequiredFields = actionRequiredFields;
    }

    // 3. Append to conversation/audit history
    if (auditEntry) {
      const existingHistory = Array.isArray(regData.conversationHistory)
        ? [...regData.conversationHistory]
        : [];
      existingHistory.push(auditEntry);
      updatePayload.conversationHistory = existingHistory;
    }

    // 4. Dual-write updates in parallel without redundant gets
    const writePromises = [];

    if (canonicalDocId) {
      const canonicalRef = adminDb.collection("tripRegistrations").doc(canonicalDocId);
      if (isCanonical) {
        writePromises.push(canonicalRef.update(updatePayload));
      } else {
        writePromises.push(
          (async () => {
            const cSnap = await canonicalRef.get();
            if (cSnap.exists) {
              await canonicalRef.update(updatePayload);
            } else {
              const backfilled = mergeLegacyIntoCanonical({}, regData, uid, email, tripId);
              await canonicalRef.set({ ...backfilled, ...updatePayload });
            }
          })()
        );
      }
    }

    if (legacyDocId) {
      const legacyRef = adminDb.collection("user-registrations").doc(legacyDocId);
      writePromises.push(legacyRef.set(updatePayload, { merge: true }));
    }

    await Promise.all(writePromises);

    // 5. Sync verified status to canonical students/{uid} collection
    if (updatePayload.studentIdVerified === true) {
      const studentUid = regData.uid;
      if (studentUid) {
        adminDb
          .collection("students")
          .doc(studentUid)
          .set(
            {
              studentIdVerified: true,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
          .catch((err) => console.error("Error updating students collection ID verified:", err));
      }
    }

    // Invalidate student directory cache so stats and registration counts refresh
    invalidateStudentDirectoryCache();

    // Record audit log for registration mutation (non-blocking)
    recordAuditLog(
      admin,
      action ? action.toUpperCase() : (directStatus ? `SET_STATUS_${directStatus.toUpperCase()}` : "UPDATE_REGISTRATION"),
      "registration",
      registrationId,
      "success",
      {
        action: action || directStatus,
        tripId,
        studentName: userName,
        studentEmail: userEmail,
        status: updatePayload.status || regData.status,
      }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Registration updated successfully",
      status: updatePayload.status || regData.status,
      registrationStatus: updatePayload.status || regData.status,
      email: emailResultDetails || undefined,
    });
  } catch (error) {
    console.error("POST Admin Registration Status Error:", error);
    if (isQuotaError(error)) {
      return NextResponse.json(
        {
          error: "Service is temporarily busy (database quota reached). Please retry in a few moments.",
          code: "RESOURCE_EXHAUSTED",
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Failed to update registration. Please try again." }, { status: 500 });
  }
}

/* PUT → Update event-level configuration (switches, seats, quota) - Full Admin Only */
export async function PUT(req) {
  try {
    let admin = null;
    try {
      admin = await requireFullAdmin(req, { resourceType: "trip_settings" });
    } catch (authErr) {
      if (authErr.status === 403) {
        return NextResponse.json(
          { error: "Forbidden: Full Administrator privileges required to modify event settings." },
          { status: 403 }
        );
      }
      const coordinatorToken = await getAuthenticatedCoordinator(req);
      if (coordinatorToken) {
        return NextResponse.json(
          { error: "Forbidden: Trip Coordinators cannot modify event settings." },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const {
      tripId,
      registrationOpen,
      totalSeats,
      femaleReservedSeats,
      maleReservedSeats,
      isCompleted,
    } = body;

    if (!tripId) {
      return NextResponse.json({ error: "Trip ID is required" }, { status: 400 });
    }

    const tripRef = adminDb.collection("trips").doc(tripId);

    const updateData = {};
    if (registrationOpen !== undefined) updateData.registrationOpen = registrationOpen;
    if (totalSeats !== undefined) {
      await adjustTripCapacity({
        tripId,
        newCapacity: Number(totalSeats),
        adminContext: admin,
      });
    }
    if (femaleReservedSeats !== undefined) updateData.femaleReservedSeats = Number(femaleReservedSeats);
    if (maleReservedSeats !== undefined) updateData.maleReservedSeats = Number(maleReservedSeats);
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      if (isCompleted === true) {
        updateData.registrationOpen = false;
      }
    }

    await tripRef.update(updateData);

    // Record audit log for trip settings update (non-blocking)
    recordAuditLog(
      admin,
      "UPDATE_EVENT_SETTINGS",
      "trip",
      tripId,
      "success",
      {
        changedFields: Object.keys(updateData),
        updateData,
      }
    ).catch(() => {});

    // If registrations were toggled to CLOSED, or marked completed, trigger roster archive non-blocking
    if (registrationOpen === false || isCompleted === true) {
      archiveEventRoster(tripId).catch((err) => {
        console.error("Error archiving event roster:", err);
      });
    }

    if (isCompleted === true) {
      await completeTripAndRecordHistory(tripId, admin).catch((err) => {
        console.error("Error creating historical trip record in PUT /api/admin/registrations:", err);
      });
    }

    return NextResponse.json({ success: true, message: "Trip settings updated successfully" });
  } catch (error) {
    console.error("PUT Trip Settings Error:", error);
    if (isQuotaError(error)) {
      return NextResponse.json(
        {
          error: "Service is temporarily busy (database quota reached). Please retry in a few moments.",
          code: "RESOURCE_EXHAUSTED",
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Failed to update trip settings. Please try again." }, { status: 500 });
  }
}
