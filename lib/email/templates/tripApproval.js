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
 * Generates clean 2-letter initials for coordinator avatar circles.
 */
function getInitials(name) {
  if (!name) return "BC";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
 * Builds the premium, eye-catchy HTML email for student trip approval.
 * 
 * Strict email styling requirements:
 * - Table-based responsive layout (max-width 600px).
 * - Safe web fonts (system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif).
 * - Inline CSS for full client compatibility (Gmail, Apple Mail, Outlook).
 * - Only Join WhatsApp Group button without redundant URL text below it.
 * - Comprehensive list of ALL coordinators involved in the expedition with clean call/email pills.
 * - High quality travel confirmation design in Boundless brand colors (#3B001B, #FFE878, #FAF7F2).
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

  // Format trip dates cleanly e.g. "12 — 18 OCTOBER 2026"
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

  // Retrieve ALL coordinators involved in the expedition
  const rawTripCoords = Array.isArray(trip?.coordinators) ? trip.coordinators : [];
  let allCoordinators = [];
  const seenEmails = new Set();
  const seenNames = new Set();

  function addCoordinator(c, isAssigned = false) {
    if (!c) return;
    let name = "";
    let email = "";
    let rawPhone = "";
    let roleTag = "";

    if (typeof c === "string") {
      name = c.trim();
    } else if (typeof c === "object" && c !== null) {
      name = String(c.name || "").trim();
      email = String(c.email || "").trim().toLowerCase();
      rawPhone = String(c.phone || "").trim();
      roleTag = c.assignedOption
        ? String(c.assignedOption).trim()
        : (c.position || c.role || c.notes || "");
    }

    if (!name && !email) return;

    // Filter out invalid phones e.g. "-", "null", "undefined", "none"
    const cleanPhone =
      rawPhone &&
      rawPhone !== "-" &&
      rawPhone.toLowerCase() !== "null" &&
      rawPhone.toLowerCase() !== "undefined" &&
      rawPhone.toLowerCase() !== "none"
        ? rawPhone
        : "";

    const emailKey = email || null;
    const nameKey = name ? name.toLowerCase() : null;

    // Check if coordinator is already added: if so, enrich missing data
    const existing = allCoordinators.find(
      (item) => (emailKey && item.email === emailKey) || (nameKey && item.name.toLowerCase() === nameKey)
    );

    if (existing) {
      if (!existing.email && email) existing.email = email;
      if (!existing.phone && cleanPhone) existing.phone = cleanPhone;
      if (!existing.assignedOption && roleTag) existing.assignedOption = roleTag;
      if (isAssigned) existing.isAssigned = true;
      return;
    }

    if (emailKey) seenEmails.add(emailKey);
    if (nameKey) seenNames.add(nameKey);

    allCoordinators.push({
      name: name || "Trip Coordinator",
      email: email || "",
      phone: cleanPhone,
      assignedOption: roleTag,
      initials: getInitials(name || "TC"),
      isAssigned: Boolean(isAssigned),
    });
  }

  // Include assigned coordinator first if present
  if (coordinator) {
    addCoordinator(coordinator, true);
  }
  // Include all coordinators registered on the trip
  rawTripCoords.forEach((c) => addCoordinator(c, false));

  // Graceful fallback if no coordinators exist
  if (allCoordinators.length === 0) {
    allCoordinators.push({
      name: "Boundless Society Operations Team",
      email: "contact@boundlesssociety.in",
      phone: "",
      assignedOption: "Trip Logistics",
      initials: "BT",
      isAssigned: false,
    });
  }

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
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .hero-title { font-size: 26px !important; line-height: 32px !important; }
      .mobile-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .mobile-center { text-align: center !important; }
      .whatsapp-btn { padding: 16px 28px !important; font-size: 15px !important; display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .coord-actions { display: block !important; width: 100% !important; margin-top: 8px !important; }
      .coord-btn { display: block !important; width: 100% !important; text-align: center !important; margin-bottom: 8px !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F5EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1F2937;">
  
  <!-- Preheader text (preview in inbox) -->
  <div style="display: none; font-size: 1px; color: #F8F5EE; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    🎉 Congratulations ${studentName}! Your registration for ${tripName} is confirmed. Join the official WhatsApp group and meet your coordinators.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8F5EE; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 28px 12px 48px 12px;">
        
        <!-- Main Email Container (600px max) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 16px 44px rgba(59, 0, 27, 0.10); border: 1px solid #EBE3D5;">
          
          <!-- TOP ACCENT BAR -->
          <tr>
            <td style="background: linear-gradient(90deg, #F59E0B 0%, #FFE878 50%, #F59E0B 100%); height: 5px; font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <!-- BRAND HEADER -->
          <tr>
            <td align="center" style="background-color: #3B001B; padding: 28px 24px 24px 24px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 11px; font-weight: 800; color: #FFE878; letter-spacing: 3.5px; text-transform: uppercase; display: block; margin-bottom: 6px;">
                      ✦ IIT MADRAS STUDENT TRAVEL SOCIETY ✦
                    </span>
                    <span style="font-size: 30px; font-weight: 900; color: #ffffff; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                      BOUNDLESS
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONGRATULATIONS HERO SECTION -->
          <tr>
            <td align="center" class="mobile-padding" style="background: linear-gradient(180deg, #FFFDF9 0%, #FFF8EE 100%); padding: 36px 36px 30px 36px; border-bottom: 1px solid #F0E8DC;">
              
              <!-- Celebration Pill Badge -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 18px;">
                <tr>
                  <td style="background-color: #ECFDF5; border: 1.5px solid #6EE7B7; border-radius: 50px; padding: 7px 18px; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.15);">
                    <span style="font-size: 12px; font-weight: 800; color: #065F46; letter-spacing: 0.8px; text-transform: uppercase;">
                      ✓ OFFICIAL EXPEDITION PASS CONFIRMED
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Main Greeting Title -->
              <h1 class="hero-title" style="margin: 0 0 12px 0; font-size: 30px; line-height: 38px; font-weight: 800; color: #3B001B; text-align: center; letter-spacing: -0.5px;">
                Congratulations, ${studentName}! 🎒
              </h1>
              
              <p style="margin: 0 0 10px 0; font-size: 15px; line-height: 24px; color: #4B5563; text-align: center; max-width: 480px;">
                Your application has been officially reviewed and approved by the Boundless Team for:
              </p>

              <!-- Trip Name Banner -->
              <div style="background-color: #FAF0E6; border: 1px solid #EADBCC; border-radius: 12px; padding: 12px 20px; display: inline-block; margin-top: 4px;">
                <span style="font-size: 21px; line-height: 28px; font-weight: 800; color: #3B001B; font-family: Georgia, serif;">
                  ${tripName}
                </span>
              </div>

            </td>
          </tr>

          <!-- TRIP SHOWCASE CARD WITH IMAGE & KEY METRICS -->
          <tr>
            <td class="mobile-padding" style="padding: 26px 36px 12px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFDF9; border: 1px solid #E5DFD5; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
                
                ${imageUrl ? `
                <tr>
                  <td style="padding: 0; line-height: 0;">
                    <img src="${escapeHtml(imageUrl)}" alt="${tripName}" width="600" style="width: 100%; height: auto; max-height: 260px; object-fit: cover; display: block;" />
                  </td>
                </tr>
                ` : ""}

                <tr>
                  <td style="padding: 24px;">
                    
                    <!-- Metrics Table -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="top" style="padding-bottom: 14px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="middle" style="font-size: 22px; padding-right: 12px; line-height: 1;">📍</td>
                              <td valign="middle">
                                <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.6px; display: block; margin-bottom: 2px;">Destination</span>
                                <span style="font-size: 16px; font-weight: 800; color: #111827;">${destination}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding-bottom: 14px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="middle" style="font-size: 22px; padding-right: 12px; line-height: 1;">📅</td>
                              <td valign="middle">
                                <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.6px; display: block; margin-bottom: 2px;">Expedition Dates</span>
                                <span style="font-size: 16px; font-weight: 800; color: #3B001B;">${datesDisplay}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td valign="middle" style="font-size: 22px; padding-right: 12px; line-height: 1;">🎫</td>
                              <td valign="middle">
                                <span style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.6px; display: block; margin-bottom: 2px;">Student Pass Status</span>
                                <span style="font-size: 14px; font-weight: 800; color: #059669; letter-spacing: 0.3px;">CONFIRMED &amp; APPROVED</span>
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

          <!-- EYE-CATCHY WHATSAPP COMMUNITY SECTION (ONLY BUTTON - NO LINK BELOW) -->
          <tr>
            <td class="mobile-padding" style="padding: 16px 36px 20px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #075E54 0%, #128C7E 50%, #064E3B 100%); border-radius: 20px; border: 2px solid #25D366; box-shadow: 0 10px 28px rgba(18, 140, 126, 0.30); overflow: hidden;">
                <tr>
                  <td align="center" style="padding: 32px 24px; text-align: center;">
                    
                    <!-- WhatsApp Chat Icon -->
                    <div style="font-size: 38px; line-height: 42px; margin-bottom: 8px;">💬</div>
                    
                    <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">
                      Join The Official Trip WhatsApp Group
                    </h2>
                    
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #E0F2F1; max-width: 460px;">
                      Real-time updates, travel logistics, meeting points, bus details, and coordinator announcements will strictly happen inside this group.
                    </p>

                    ${validWhatsappLink ? `
                    <!-- Prominent WhatsApp CTA Button (ONLY button, strictly no link below) -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="border-radius: 50px; background-color: #25D366; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);">
                          <a href="${validWhatsappLink}" target="_blank" rel="noopener noreferrer" class="whatsapp-btn" style="display: inline-block; background-color: #25D366; padding: 18px 42px; font-size: 16px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 50px; letter-spacing: 0.6px; text-transform: uppercase; border: 1.5px solid #86EFAC;">
                            👉 JOIN WHATSAPP GROUP NOW
                          </a>
                        </td>
                      </tr>
                    </table>
                    ` : `
                    <div style="background-color: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 14px 20px; display: inline-block;">
                      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #ffffff;">
                        📢 Your WhatsApp group link will be shared directly by your coordinators.
                      </p>
                    </div>
                    `}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- COMPLETE TRIP COORDINATORS SECTION (ALL INVOLVED) -->
          <tr>
            <td class="mobile-padding" style="padding: 10px 36px 20px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFDF9; border: 1px solid #EADBCC; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
                <tr>
                  <td style="padding: 24px 24px 18px 24px;">
                    
                    <!-- Section Header -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                      <tr>
                        <td>
                          <span style="font-size: 11px; font-weight: 800; color: #3B001B; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">
                            🧭 EXPEDITION COORDINATION TEAM
                          </span>
                          <h3 style="margin: 0 0 4px 0; font-size: 19px; font-weight: 800; color: #111827;">
                            Your Trip Coordinators (${allCoordinators.length})
                          </h3>
                          <p style="margin: 0; font-size: 13px; color: #6B7280; line-height: 18px;">
                            The following coordinators are actively managing this expedition. Feel free to connect for any questions, assistance, or preparation tips:
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Roster of ALL Coordinators Involved -->
                    ${allCoordinators.map((c, idx) => `
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #EBE4D8; border-left: 4px solid #3B001B; border-radius: 12px; margin-bottom: ${idx === allCoordinators.length - 1 ? "0" : "12px"};">
                      <tr>
                        <td style="padding: 16px 18px;">
                          
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <!-- Avatar Initials Circle -->
                              <td valign="top" style="width: 44px; padding-right: 14px;">
                                <div style="width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #3B001B 0%, #6B1238 100%); color: #FFE878; font-weight: 800; font-size: 15px; text-align: center; line-height: 42px; display: inline-block; box-shadow: 0 2px 6px rgba(59,0,27,0.25);">
                                  ${c.initials}
                                </div>
                              </td>

                              <!-- Coordinator Info -->
                              <td valign="top">
                                <span style="font-size: 16px; font-weight: 800; color: #111827; display: block; margin-bottom: 2px;">
                                  ${escapeHtml(c.name)}
                                </span>
                                
                                <div style="margin-bottom: 10px;">
                                  <span style="display: inline-block; background-color: #FAF0E6; color: #3B001B; border: 1px solid #EADBCC; border-radius: 20px; font-size: 11px; font-weight: 700; padding: 2px 10px;">
                                    ${c.assignedOption ? `Coordinator • ${escapeHtml(c.assignedOption)}` : (c.isAssigned ? "Assigned Coordinator" : "Trip Coordinator")}
                                  </span>
                                </div>

                                <!-- Contact Actions (Phone rendered only if valid, never placeholder) -->
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                  <tr>
                                    ${c.phone ? `
                                    <td class="coord-btn" style="padding-right: 8px; padding-bottom: 6px;">
                                      <a href="tel:${escapeHtml(c.phone)}" style="display: inline-block; background-color: #3B001B; color: #ffffff; font-size: 12px; font-weight: 700; text-decoration: none; padding: 8px 14px; border-radius: 8px; box-shadow: 0 2px 5px rgba(59,0,27,0.2);">
                                        📞 Call: ${escapeHtml(c.phone)}
                                      </a>
                                    </td>
                                    ` : ""}
                                    ${c.email ? `
                                    <td class="coord-btn" style="padding-bottom: 6px;">
                                      <a href="mailto:${escapeHtml(c.email)}" style="display: inline-block; background-color: #FAF9F6; color: #3B001B; font-size: 12px; font-weight: 600; text-decoration: none; padding: 8px 14px; border-radius: 8px; border: 1px solid #E5DFD5;">
                                        ✉️ ${escapeHtml(c.email)}
                                      </a>
                                    </td>
                                    ` : ""}
                                    ${!c.phone && !c.email ? `
                                    <td style="padding-bottom: 6px;">
                                      <span style="font-size: 12px; color: #9CA3AF; font-style: italic;">
                                        💬 Available via Trip WhatsApp Group
                                      </span>
                                    </td>
                                    ` : ""}
                                  </tr>
                                </table>

                              </td>
                            </tr>
                          </table>

                        </td>
                      </tr>
                    </table>
                    `).join("")}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${importantInfo ? `
          <!-- MANDATORY GUIDELINES SECTION -->
          <tr>
            <td class="mobile-padding" style="padding: 10px 36px 20px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #D97706; border-radius: 14px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <span style="font-size: 11px; font-weight: 800; color: #92400E; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 8px;">
                      📌 MANDATORY GUIDELINES &amp; TRAVEL INSTRUCTIONS
                    </span>
                    <div style="font-size: 13px; line-height: 22px; color: #78350F; font-weight: 500;">
                      ${escapeHtml(importantInfo).replace(/\n/g, "<br/>")}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          ${itinerary && itinerary.length > 0 ? `
          <!-- EXPEDITION ITINERARY HIGHLIGHTS -->
          <tr>
            <td class="mobile-padding" style="padding: 10px 36px 20px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFDF9; border: 1px solid #E5DFD5; border-radius: 14px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <span style="font-size: 11px; font-weight: 800; color: #3B001B; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 14px;">
                      🗺️ EXPEDITION ITINERARY SNAPSHOT
                    </span>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      ${itinerary.slice(0, 5).map((item, idx) => {
                        const dayLabel = typeof item === "object" ? item.day || `Day ${idx + 1}` : `Day ${idx + 1}`;
                        const titleText = typeof item === "object" ? item.title || item.description || "Scheduled Expedition" : String(item);
                        return `
                        <tr>
                          <td valign="top" style="padding-bottom: 10px; width: 68px;">
                            <span style="display: inline-block; background-color: #3B001B; color: #FFE878; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                              ${escapeHtml(dayLabel)}
                            </span>
                          </td>
                          <td valign="top" style="padding-bottom: 10px; font-size: 13px; font-weight: 600; color: #374151; line-height: 18px;">
                            ${escapeHtml(titleText)}
                          </td>
                        </tr>
                        `;
                      }).join("")}
                    </table>

                    ${itineraryLink ? `
                    <div style="margin-top: 12px; text-align: right;">
                      <a href="${escapeHtml(itineraryLink)}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; font-weight: 800; color: #3B001B; text-decoration: underline;">
                        View Full Expedition Schedule ↗
                      </a>
                    </div>
                    ` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- NEXT STEPS / COMMUNITY SIGN-OFF -->
          <tr>
            <td class="mobile-padding" style="padding: 10px 36px 30px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F2; border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #3B001B; text-align: center;">
                      Ready for the journey of a lifetime?
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6B7280; text-align: center;">
                      We cannot wait to travel with you. Should you have any questions prior to departure, reach out to your coordinators directly or ask in the trip WhatsApp group.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background-color: #3B001B; padding: 28px 24px; text-align: center; border-top: 3px solid #FFE878;">
              <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 900; color: #ffffff; letter-spacing: 1px;">
                BOUNDLESS TRAVEL SOCIETY
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #FFE878; line-height: 16px; font-weight: 600;">
                IIT Madras Student Travel Community • Chennai, Tamil Nadu, India
              </p>
              <p style="margin: 0; font-size: 10px; color: #D1C5B8; line-height: 14px; max-width: 480px;">
                This automated registration confirmation pass was issued for ${tripName}. For inquiries or emergency updates, contact your assigned coordinators.
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
