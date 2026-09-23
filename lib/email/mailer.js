import { buildTripApprovalEmail, buildTripApprovalSubject } from "./templates/tripApproval.js";

/**
 * Resolves the active sender for Brevo.
 * Priority:
 * 1. BREVO_SENDER_EMAIL in environment variables
 * 2. Active verified sender fetched from Brevo API
 * 3. Default fallback address
 */
async function resolveBrevoSender(apiKey) {
  const envSender = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || "")
    .replace(/^["']|["']$/g, "")
    .trim();
  if (envSender && envSender.includes("@")) {
    return envSender;
  }

  try {
    const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
      headers: { accept: "application/json", "api-key": apiKey },
    });
    if (sendersRes.ok) {
      const sendersData = await sendersRes.json();
      const activeSender = (sendersData.senders || []).find((s) => s.active);
      if (activeSender?.email) return activeSender.email;
      if (sendersData.senders?.[0]?.email) return sendersData.senders[0].email;
    }
  } catch (err) {
    console.warn("Could not fetch Brevo senders:", err.message);
  }

  return "notifications@boundlesssociety.in";
}

/**
 * Sends a trip approval email to the student via Brevo server-side API.
 * 
 * @param {Object} params
 * @param {Object} params.student - { name, email, studentId }
 * @param {Object} params.trip - Trip document data
 * @param {Object} [params.coordinator] - Assigned coordinator { name, phone, email, assignedOption }
 * @param {string} [params.whatsappLink] - Option-specific or global WhatsApp invite URL
 * @param {string} [params.qrCodeUrl] - Option-specific or global QR code image URL
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendTripApprovalEmail({
  student,
  trip,
  coordinator,
  whatsappLink,
  qrCodeUrl,
}) {
  const apiKey = (process.env.BREVO_API_KEY || "").replace(/^["']|["']$/g, "").trim();

  if (!apiKey) {
    const errorMsg = "BREVO_API_KEY is not configured on the server.";
    console.warn(errorMsg);
    return { success: false, error: errorMsg };
  }

  const toEmail = student?.email
    ? String(student.email).replace(/^["']|["']$/g, "").trim().toLowerCase()
    : "";
  const toName = student?.name ? String(student.name).trim() : "Student";
  const tripName = trip?.name ? String(trip.name).trim() : "Trip";

  if (!toEmail || !toEmail.includes("@")) {
    const errorMsg = `Invalid or missing recipient email address: "${toEmail}".`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const senderEmail = await resolveBrevoSender(apiKey);
  const senderName = (process.env.BREVO_SENDER_NAME || process.env.EMAIL_FROM_NAME || "Boundless Travel Society")
    .replace(/^["']|["']$/g, "")
    .trim();

  // Validate replyTo: only include if it's a genuine email address and not a placeholder
  const rawReplyTo = (process.env.BREVO_REPLY_TO || "").replace(/^["']|["']$/g, "").trim();
  const validReplyTo =
    rawReplyTo && rawReplyTo.includes("@") && !rawReplyTo.toLowerCase().includes("your_")
      ? rawReplyTo
      : null;

  const subject = buildTripApprovalSubject({ studentName: toName, tripName });
  const htmlContent = buildTripApprovalEmail({
    student: { ...student, name: toName, email: toEmail },
    trip,
    coordinator,
    whatsappLink,
    qrCodeUrl,
  });

  const payload = {
    to: [{ email: toEmail, name: toName }],
    sender: { name: senderName, email: senderEmail },
    ...(validReplyTo ? { replyTo: { email: validReplyTo } } : {}),
    subject,
    htmlContent,
  };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      // Mask any potential secret tokens if present in response
      const safeError = `Brevo API HTTP ${res.status}: ${errorText.slice(0, 300)}`;
      console.error(safeError);
      return { success: false, error: safeError };
    }

    const data = await res.json();
    const messageId = data?.messageId || data?.messageIds?.[0] || "dispatched";
    console.log(`[Approval Email] Successfully dispatched to ${toEmail} for ${tripName}. MessageId: ${messageId}`);

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    const safeError = error?.message || "Network exception sending approval email.";
    console.error("[Approval Email Exception]:", safeError);
    return { success: false, error: safeError };
  }
}
