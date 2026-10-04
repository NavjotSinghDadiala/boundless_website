import { sendTripApprovalEmail } from "@/lib/email/mailer";

export async function sendApprovalEmail(toEmail, toName, tripName, whatsappLink, qrCodeUrl, tripDetails = {}) {
  const coordinators = Array.isArray(tripDetails?.coordinators) ? tripDetails.coordinators : [];
  const primaryCoordinator = coordinators.length > 0
    ? (typeof coordinators[0] === "object" ? coordinators[0] : { name: String(coordinators[0]) })
    : null;

  const result = await sendTripApprovalEmail({
    student: { email: toEmail, name: toName },
    trip: { ...tripDetails, name: tripName },
    coordinator: primaryCoordinator,
    whatsappLink,
    qrCodeUrl,
  });

  return result.success ? { messageId: result.messageId } : null;
}

/**
 * Send a correction / re-upload request email to the student.
 * Uses raw HTML (no template) so no extra Brevo template setup is needed.
 */
export async function sendCorrectionRequestEmail(toEmail, toName, tripName, issueText, actionFields, tripId) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("Brevo API Key is missing. Correction email was not sent.");
    return null;
  }

  const fieldsHtml = actionFields && actionFields.length > 0
    ? `<ul style="margin:8px 0 0 0;padding:0 0 0 20px;color:#4B1A36;">
        ${actionFields.map(f => `<li style="margin-bottom:4px;">${f}</li>`).join("")}
       </ul>`
    : "";

  const messageHtml = issueText
    ? `<p style="margin:12px 0 0 0;color:#3E1126;font-size:15px;">${issueText.replace(/\n/g, "<br/>")}</p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:2px solid #e5e7eb;overflow:hidden;max-width:96vw;">
        <tr>
          <td style="background:#3E1126;padding:28px 32px;">
            <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:1px;">⚠️ Action Required – ${tripName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px 0;color:#111;font-size:15px;">Hi <strong>${toName}</strong>,</p>
            <p style="margin:0 0 16px 0;color:#444;font-size:15px;">
              The coordinators for <strong>${tripName}</strong> have reviewed your registration and need you to make some corrections or provide additional information.
            </p>
            ${messageHtml}
            ${fieldsHtml ? `<div style="margin-top:16px;padding:16px;background:#FFF8F0;border-left:4px solid #F59E0B;border-radius:8px;">
              <p style="margin:0 0 6px 0;font-weight:bold;color:#92400E;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Fields to correct:</p>
              ${fieldsHtml}
            </div>` : ""}
            <div style="margin-top:28px;text-align:center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://boundlesssociety.in"}/trip-registration?tripId=${tripId}" 
                 style="background:#3E1126;color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:bold;font-size:15px;display:inline-block;">
                Submit Corrections →
              </a>
            </div>
            <p style="margin:24px 0 0 0;color:#999;font-size:12px;text-align:center;">
              You are receiving this email because you registered for ${tripName} with Boundless Travel Society.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const senderName = process.env.BREVO_SENDER_NAME || "Boundless Travel Society";
  const replyTo = process.env.BREVO_REPLY_TO || "";

  let cachedSenderEmail = null;
  let cachedSenderExpiresAt = 0;

  async function getResolvedSender(apiKey) {
    const envSender = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || "")
      .replace(/^["']|["']$/g, "")
      .trim();
    if (envSender && envSender.includes("@")) {
      return envSender;
    }

    const now = Date.now();
    if (cachedSenderEmail && now < cachedSenderExpiresAt) {
      return cachedSenderEmail;
    }

    try {
      const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
        headers: { "accept": "application/json", "api-key": apiKey },
        signal: AbortSignal.timeout(5000),
      });
      if (sendersRes.ok) {
        const sendersData = await sendersRes.json();
        const activeSender = (sendersData.senders || []).find(s => s.active);
        cachedSenderEmail = activeSender?.email || sendersData.senders?.[0]?.email || null;
        cachedSenderExpiresAt = now + 60 * 60 * 1000; // 1-hour cache TTL
        return cachedSenderEmail;
      }
    } catch (senderErr) {
      console.warn("Could not fetch Brevo senders:", senderErr);
    }

    return "notifications@boundlesssociety.in";
  }

  const senderEmail = await getResolvedSender(apiKey);

  if (!senderEmail) {
    console.error("No verified Brevo sender found. Correction email not sent.");
    return null;
  }

  const payload = {
    to: [{ email: toEmail, name: toName }],
    sender: { name: senderName, email: senderEmail },
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    subject: `⚠️ Action Required: Correction Requested for ${tripName}`,
    htmlContent: html,
  };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Brevo API returned error ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    console.log("Correction request email sent:", data);
    return data;
  } catch (error) {
    console.error("Error sending correction request email:", error);
    return null; // non-fatal — don't block the status update
  }
}

/**
 * Compatible object-parameter wrapper for queue processors
 */
export async function sendCorrectionEmailBrevo(params = {}) {
  const { toEmail, toName, tripName, issueText, actionRequiredFields, tripId } = params;
  return sendCorrectionRequestEmail(toEmail, toName, tripName, issueText, actionRequiredFields, tripId);
}

/**
 * Send a dedicated Trip Waitlist Confirmation email via Brevo.
 * Informs the student of their sequential waiting list position and explains FIFO promotion.
 */
export async function sendTripWaitlistEmail(params = {}) {
  const {
    toEmail,
    toName = "Student",
    tripName = "Boundless Expedition",
    waitlistPosition = 1,
    tripDates = "",
    tripId = "",
  } = params;

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("Brevo API Key is missing. Waitlist confirmation email was not dispatched.");
    return { success: false, error: "Brevo API Key missing" };
  }

  const senderName = process.env.BREVO_SENDER_NAME || "Boundless Travel Society";
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || "notifications@boundlesssociety.in")
    .replace(/^["']|["']$/g, "")
    .trim();
  const replyTo = process.env.BREVO_REPLY_TO || "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;border:2px solid #e5e7eb;overflow:hidden;max-width:96vw;box-shadow:0 10px 25px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#3E1126;padding:32px 36px;text-align:center;">
            <div style="font-size:28px;margin-bottom:8px;">⏳</div>
            <h1 style="margin:0;color:#FFE878;font-size:24px;letter-spacing:1px;font-family:'Trebuchet MS',Arial,sans-serif;">WAITING LIST CONFIRMATION</h1>
            <p style="margin:6px 0 0 0;color:#ffffff;opacity:0.85;font-size:14px;">Boundless Travel Society</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 16px 0;color:#111;font-size:16px;">Hi <strong>${toName}</strong>,</p>
            <p style="margin:0 0 16px 0;color:#444;font-size:15px;line-height:1.6;">
              Your registration for <strong>${tripName}</strong> has been successfully received and safely recorded in our system.
            </p>
            <div style="background:#FFFBEB;border:2px solid #FDE68A;border-radius:14px;padding:20px;margin:20px 0;text-align:center;">
              <span style="display:inline-block;padding:4px 12px;background:#F59E0B;color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;border-radius:20px;margin-bottom:8px;">Current Status</span>
              <h2 style="margin:4px 0;color:#92400E;font-size:22px;letter-spacing:0.5px;">WAITLISTED — Position #${waitlistPosition}</h2>
              <p style="margin:8px 0 0 0;color:#78350F;font-size:13px;line-height:1.5;">
                This expedition has reached full seat capacity. Your submission is preserved and ranked in sequential order.
              </p>
            </div>
            
            <div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin:20px 0;border:1px solid #e5e7eb;">
              <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#374151;">
                <tr>
                  <td width="35%" style="color:#6B7280;font-weight:bold;">Trip:</td>
                  <td style="font-weight:600;color:#111827;">${tripName}</td>
                </tr>
                ${tripDates ? `<tr>
                  <td style="color:#6B7280;font-weight:bold;">Dates:</td>
                  <td style="font-weight:600;color:#111827;">${tripDates}</td>
                </tr>` : ""}
                <tr>
                  <td style="color:#6B7280;font-weight:bold;">Waitlist Queue:</td>
                  <td style="font-weight:bold;color:#D97706;">#${waitlistPosition} in line</td>
                </tr>
              </table>
            </div>

            <h3 style="color:#3E1126;font-size:15px;margin:24px 0 8px 0;">What happens next?</h3>
            <p style="margin:0 0 16px 0;color:#555;font-size:14px;line-height:1.6;">
              If a confirmed participant backs out, withdraws, or additional seats open up, students are automatically promoted from the waiting list in order. If a seat becomes available for you, you will receive an immediate approval confirmation email.
            </p>

            <div style="margin-top:28px;text-align:center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://boundlesssociety.in"}/my-trips" 
                 style="background:#3E1126;color:#FFE878;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:bold;font-size:14px;display:inline-block;letter-spacing:0.5px;">
                Check Trip Status in Dashboard →
              </a>
            </div>

            <p style="margin:28px 0 0 0;color:#9CA3AF;font-size:12px;text-align:center;line-height:1.5;">
              Your registration has not been rejected or deleted. All your submitted documents and details remain securely saved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const payload = {
    to: [{ email: toEmail, name: toName }],
    sender: { name: senderName, email: senderEmail },
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    subject: `⏳ Waiting List Confirmation: ${tripName} (Position #${waitlistPosition})`,
    htmlContent: html,
  };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Brevo waitlist email returned error ${res.status}: ${errorText}`);
      return { success: false, error: errorText };
    }

    const data = await res.json();
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error("Error sending waitlist confirmation email via Brevo:", err);
    return { success: false, error: err.message || "Failed to send waitlist email" };
  }
}

