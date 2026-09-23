import { formatTripDates } from "../../tripDateUtils.js";

/**
 * Escapes HTML characters to prevent XSS or malformed email markup.
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Builds the subject line for the trip approval confirmation email.
 */
export function buildTripApprovalSubject({ studentName, tripName }) {
  const cleanName = studentName ? String(studentName).trim() : "Student";
  const cleanTrip = tripName ? String(tripName).trim() : "Trip";
  return `🎉 Congratulations ${cleanName}! Your ${cleanTrip} Registration Is Confirmed`;
}

/**
 * Builds the premium HTML email for student trip approval.
 * 
 * Strict email styling requirements:
 * - Table-based responsive layout (max-width 600px).
 * - Safe web fonts (system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif).
 * - Inline CSS for full client compatibility (Gmail, Apple Mail, Outlook).
 * - Very prominent WhatsApp CTA button and container.
 * - Prominent coordinator details with click-to-call.
 * - High quality travel confirmation design in Boundless brand colors (#3B001B, #FCE16D, #FAF9F6).
 * - Fully mobile responsive with no horizontal overflow.
 */
export function buildTripApprovalEmail({
  student,
  trip,
  coordinator,
  whatsappLink,
  qrCodeUrl,
}) {
  const studentName = escapeHtml(student?.name || "Student");
  const tripName = escapeHtml(trip?.name || "Boundless Expedition");
  const destination = escapeHtml(trip?.destination || "Expedition Destination");

  // Format trip dates cleanly e.g. "12 — 15 OCTOBER 2026"
  const formattedDates = trip?.startDate
    ? formatTripDates(trip.startDate, trip.endDate)
    : null;
  const datesDisplay = escapeHtml(formattedDates || "Dates to be announced");

  // Trip Image
  const images = Array.isArray(trip?.images) ? trip.images : [];
  const primaryImage = images.length > 0 ? images[0] : null;
  const imageUrl = primaryImage
    ? typeof primaryImage === "object"
      ? primaryImage.url || primaryImage.preview
      : String(primaryImage)
    : null;

  // Coordinator Contact
  const coordinatorName = coordinator?.name ? escapeHtml(coordinator.name) : "Assigned Trip Coordinator";
  const coordinatorPhone = coordinator?.phone ? String(coordinator.phone).trim() : "";
  const coordinatorEmail = coordinator?.email ? String(coordinator.email).trim() : "";
  const coordinatorRole = coordinator?.assignedOption
    ? escapeHtml(`Coordinator (${coordinator.assignedOption})`)
    : "Trip Coordinator";

  // Important Info (supports string or array of bullet strings)
  let importantInfo = "";
  if (Array.isArray(trip?.importantInformation)) {
    importantInfo = trip.importantInformation.map(item => `• ${item}`).join("\n");
  } else if (trip?.importantInformation) {
    importantInfo = String(trip.importantInformation).trim();
  }

  // Itinerary Highlights (supports itinerary or itineraryDays, and itineraryLink or itineraryUrl)
  const rawItinerary = trip?.itinerary || trip?.itineraryDays;
  const itinerary = Array.isArray(rawItinerary) ? rawItinerary : [];
  const itineraryLink = trip?.itineraryLink || trip?.itineraryUrl ? String(trip.itineraryLink || trip.itineraryUrl).trim() : "";

  // WhatsApp Link
  const validWhatsappLink = whatsappLink && String(whatsappLink).startsWith("http")
    ? String(whatsappLink).trim()
    : null;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Your Trip Registration is Confirmed!</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; max-width: 100%; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding-left: 18px !important; padding-right: 18px !important; }
      .hero-title { font-size: 26px !important; line-height: 32px !important; }
      .mobile-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .mobile-center { text-align: center !important; }
      .whatsapp-btn { padding: 16px 24px !important; font-size: 15px !important; display: block !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF6ED; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #2D3748;">
  
  <!-- Preheader text (preview in inbox) -->
  <div style="display: none; font-size: 1px; color: #FAF6ED; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    🎉 Congratulations ${studentName}! Your registration for ${tripName} has been approved. Join the official WhatsApp group and connect with your coordinator.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF6ED; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 24px 12px 40px 12px;">
        
        <!-- Main Email Container (600px max) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 36px rgba(59, 0, 27, 0.08); border: 1px solid #EBE4D8;">
          
          <!-- BRAND HEADER -->
          <tr>
            <td align="center" style="background-color: #3B001B; padding: 26px 24px 22px 24px; border-bottom: 3px solid #FFE878;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 11px; font-weight: 800; color: #FFE878; letter-spacing: 3px; text-transform: uppercase; display: block; margin-bottom: 4px;">
                      IIT MADRAS STUDENT TRAVEL SOCIETY
                    </span>
                    <span style="font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: 1px; text-transform: uppercase; font-family: Georgia, serif;">
                      BOUNDLESS
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONGRATULATIONS HERO SECTION -->
          <tr>
            <td align="center" class="mobile-padding" style="background: linear-gradient(180deg, #FFFDF8 0%, #FFF8EE 100%); padding: 36px 36px 28px 36px; border-bottom: 1px solid #F0E8DC;">
              
              <!-- Celebration Pill -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50px; padding: 6px 16px;">
                    <span style="font-size: 12px; font-weight: 800; color: #065F46; letter-spacing: 0.5px; text-transform: uppercase;">
                      ✓ REGISTRATION APPROVED &amp; CONFIRMED
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Main Title -->
              <h1 class="hero-title" style="margin: 0 0 12px 0; font-size: 28px; line-height: 36px; font-weight: 800; color: #3B001B; text-align: center; letter-spacing: -0.5px;">
                Congratulations, ${studentName}! 🎒
              </h1>
              
              <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 24px; color: #4A5568; text-align: center;">
                Pack your bags! Your registration has been officially approved by the Boundless team for:
              </p>

              <p style="margin: 0; font-size: 20px; line-height: 26px; font-weight: 800; color: #3B001B; text-align: center; font-family: Georgia, serif;">
                ${tripName}
              </p>
            </td>
          </tr>

          <!-- TRIP CARD WITH IMAGE & KEY DETAILS -->
          <tr>
            <td class="mobile-padding" style="padding: 28px 36px 12px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF9F6; border: 1px solid #E5DFD5; border-radius: 16px; overflow: hidden;">
                
                ${imageUrl ? `
                <tr>
                  <td style="padding: 0; line-height: 0;">
                    <img src="${escapeHtml(imageUrl)}" alt="${tripName}" width="600" style="width: 100%; height: auto; max-height: 260px; object-fit: cover; display: block;" />
                  </td>
                </tr>
                ` : ""}

                <tr>
                  <td style="padding: 22px 24px;">
                    
                    <!-- Destination & Dates Table -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="top" style="padding-bottom: 12px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="middle" style="font-size: 18px; padding-right: 8px;">📍</td>
                              <td valign="middle">
                                <span style="font-size: 11px; font-weight: 700; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Destination</span>
                                <span style="font-size: 16px; font-weight: 800; color: #1A202C;">${destination}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding-bottom: 12px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="middle" style="font-size: 18px; padding-right: 8px;">📅</td>
                              <td valign="middle">
                                <span style="font-size: 11px; font-weight: 700; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Expedition Dates</span>
                                <span style="font-size: 15px; font-weight: 700; color: #3B001B;">${datesDisplay}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="middle" style="font-size: 18px; padding-right: 8px;">🎫</td>
                              <td valign="middle">
                                <span style="font-size: 11px; font-weight: 700; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Registration Status</span>
                                <span style="font-size: 14px; font-weight: 800; color: #059669;">CONFIRMED &amp; APPROVED</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- VERY PROMINENT WHATSAPP GROUP SECTION -->
          <tr>
            <td class="mobile-padding" style="padding: 20px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #128C7E 0%, #075E54 100%); border-radius: 16px; border: 2px solid #25D366; box-shadow: 0 8px 24px rgba(18, 140, 126, 0.25); overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 28px 24px; text-align: center;">
                    
                    <!-- WhatsApp Icon Badge -->
                    <div style="font-size: 32px; line-height: 36px; margin-bottom: 6px;">💬</div>
                    
                    <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.3px; text-transform: uppercase;">
                      Join The Official Trip WhatsApp Group
                    </h2>
                    
                    <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 20px; color: #E0F2F1; max-width: 440px;">
                      Real-time updates, travel logistics, meeting points, bus details, and coordinator announcements will strictly happen inside this group.
                    </p>

                    ${validWhatsappLink ? `
                    <!-- Big Prominent CTA Button -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="border-radius: 50px; background-color: #25D366; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);">
                          <a href="${validWhatsappLink}" target="_blank" rel="noopener noreferrer" class="whatsapp-btn" style="display: inline-block; padding: 15px 34px; font-size: 16px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 50px; letter-spacing: 0.5px; text-transform: uppercase;">
                            👉 JOIN WHATSAPP GROUP NOW
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 14px 0 0 0; font-size: 11px; color: #B2DFDB;">
                      Link: <a href="${validWhatsappLink}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: underline; word-break: break-all;">${validWhatsappLink}</a>
                    </p>
                    ` : `
                    <div style="background-color: rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 12px 18px; display: inline-block;">
                      <p style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff;">
                        📢 Your WhatsApp group link will be shared separately by your coordinator.
                      </p>
                    </div>
                    `}

                    ${qrCodeUrl ? `
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                      <tr>
                        <td align="center">
                          <a href="${escapeHtml(qrCodeUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; font-size: 11px; color: #E0F2F1; text-decoration: underline;">
                            View WhatsApp QR Code ↗
                          </a>
                        </td>
                      </tr>
                    </table>
                    ` : ""}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TRIP COORDINATOR SECTION -->
          <tr>
            <td class="mobile-padding" style="padding: 10px 36px 20px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFDF9; border: 1px solid #EADBCC; border-left: 5px solid #3B001B; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <span style="font-size: 11px; font-weight: 800; color: #3B001B; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">
                      📞 YOUR TRIP COORDINATOR
                    </span>
                    <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: #1A202C;">
                      ${coordinatorName}
                    </h3>
                    <p style="margin: 0 0 14px 0; font-size: 12px; color: #718096; font-weight: 500;">
                      ${coordinatorRole}
                    </p>

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        ${coordinatorPhone ? `
                        <td class="mobile-stack" style="padding-right: 12px; padding-bottom: 8px;">
                          <a href="tel:${escapeHtml(coordinatorPhone)}" style="display: inline-block; background-color: #3B001B; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 9px 18px; border-radius: 8px;">
                            📞 Call: ${escapeHtml(coordinatorPhone)}
                          </a>
                        </td>
                        ` : `
                        <td class="mobile-stack" style="padding-bottom: 8px;">
                          <span style="font-size: 12px; color: #718096; font-style: italic;">Contact details available inside WhatsApp group</span>
                        </td>
                        `}
                        ${coordinatorEmail ? `
                        <td class="mobile-stack" style="padding-bottom: 8px;">
                          <a href="mailto:${escapeHtml(coordinatorEmail)}" style="display: inline-block; background-color: #FAF0E6; color: #3B001B; font-size: 13px; font-weight: 600; text-decoration: none; padding: 9px 16px; border-radius: 8px; border: 1px solid #EADBCC;">
                            ✉️ ${escapeHtml(coordinatorEmail)}
                          </a>
                        </td>
                        ` : ""}
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${importantInfo ? `
          <!-- IMPORTANT GUIDELINES SECTION -->
          <tr>
            <td class="mobile-padding" style="padding: 10px 36px 20px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px;">
                <tr>
                  <td style="padding: 18px 22px;">
                    <span style="font-size: 11px; font-weight: 800; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">
                      📌 IMPORTANT GUIDELINES &amp; INSTRUCTIONS
                    </span>
                    <div style="font-size: 13px; line-height: 20px; color: #78350F;">
                      ${escapeHtml(importantInfo).replace(/\n/g, "<br/>")}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          ${itinerary && itinerary.length > 0 ? `
          <!-- JOURNEY ITINERARY HIGHLIGHTS -->
          <tr>
            <td class="mobile-padding" style="padding: 10px 36px 20px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF9F6; border: 1px solid #E5DFD5; border-radius: 12px;">
                <tr>
                  <td style="padding: 18px 22px;">
                    <span style="font-size: 11px; font-weight: 800; color: #3B001B; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 12px;">
                      🗺️ EXPEDITION ITINERARY SNAPSHOT
                    </span>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      ${itinerary.slice(0, 4).map((item, idx) => {
                        const dayLabel = typeof item === "object" ? item.day || `Day ${idx + 1}` : `Day ${idx + 1}`;
                        const titleText = typeof item === "object" ? item.title || item.description || "Scheduled Expedition" : String(item);
                        return `
                        <tr>
                          <td valign="top" style="padding-bottom: 8px; width: 64px;">
                            <span style="display: inline-block; background-color: #3B001B; color: #FFE878; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">
                              ${escapeHtml(dayLabel)}
                            </span>
                          </td>
                          <td valign="top" style="padding-bottom: 8px; font-size: 13px; font-weight: 600; color: #2D3748;">
                            ${escapeHtml(titleText)}
                          </td>
                        </tr>
                        `;
                      }).join("")}
                    </table>

                    ${itineraryLink ? `
                    <div style="margin-top: 10px; text-align: right;">
                      <a href="${escapeHtml(itineraryLink)}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; font-weight: 700; color: #3B001B; text-decoration: underline;">
                        View Full Schedule ↗
                      </a>
                    </div>
                    ` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- NEXT STEPS / CLOSING -->
          <tr>
            <td class="mobile-padding" style="padding: 10px 36px 28px 36px;">
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #4A5568; text-align: center;">
                We are thrilled to embark on this journey with you. Should you have any questions prior to departure, feel free to reach out to your coordinator directly or message in the trip WhatsApp group.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background-color: #FAF6ED; padding: 26px 24px; border-top: 1px solid #EBE4D8; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #3B001B; letter-spacing: 0.5px;">
                BOUNDLESS TRAVEL SOCIETY
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #718096; line-height: 16px;">
                IIT Madras Student Travel Community • Chennai, Tamil Nadu, India
              </p>
              <p style="margin: 0; font-size: 10px; color: #A0AEC0; line-height: 14px;">
                This automated confirmation email was sent because your trip registration for ${tripName} was approved. Questions? Contact your trip coordinator.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
