import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/coordinatorAuth";
import { buildTripApprovalEmail, buildTripApprovalSubject } from "@/lib/email/templates/tripApproval";
import { sendTripApprovalEmail } from "@/lib/email/mailer";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Standard sample trip & student data for live preview
const SAMPLE_PREVIEW_DATA = {
  student: {
    name: "Navjot Singh Dadiala",
    email: "navjot@smail.iitm.ac.in",
    studentId: "AE22B042",
  },
  trip: {
    id: "sample-trip-manali-spiti",
    name: "Himalayan High Passes Expedition",
    destination: "Manali & Spiti Valley, Himachal Pradesh",
    startDate: "2026-10-12",
    endDate: "2026-10-18",
    images: [
      {
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80",
      },
    ],
    importantInformation: [
      "Please arrive at the assembly point (IITM Main Gate) by 05:30 AM sharp on Day 1.",
      "Carry your original government-issued photo ID along with your valid IITM Student ID card.",
      "Pack thermal base layers, sturdy trekking boots, and personal medications.",
      "A completed and signed physical copy of the medical fitness declaration is mandatory at boarding.",
    ],
    itineraryDays: [
      { day: 1, title: "Assembly at Campus & Overnight Transit" },
      { day: 2, title: "Base Camp Arrival & High Altitude Acclimatization" },
      { day: 3, title: "Ridge Ascent & Panoramic Glacial Vista" },
      { day: 4, title: "Spiti High Pass Crossing & Stargazing Camp" },
      { day: 5, title: "Descent, Cultural Village Immersion & Celebration" },
      { day: 6, title: "Return Journey to Chennai" },
    ],
    itineraryUrl: "https://boundlesssociety.in/trips/sample-trip-manali-spiti",
  },
  coordinator: {
    name: "Aman Verma",
    phone: "+91 98765 43210",
    email: "aman.coordinator@boundlesssociety.in",
  },
  whatsappLink: "https://chat.whatsapp.com/BoundlessExpeditionSpiti",
  qrCodeUrl: "",
};

/**
 * GET: Admin-only preview of approval email HTML
 * Usage:
 *  - /api/admin/email-preview (renders HTML directly in browser)
 *  - /api/admin/email-preview?format=json (returns JSON with html & subject)
 *  - /api/admin/email-preview?tripId=... (uses real trip if found)
 */
export async function GET(req) {
  try {
    const isAdmin = await isAuthorizedAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access: Admin only" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    const tripId = searchParams.get("tripId");

    let previewData = { ...SAMPLE_PREVIEW_DATA };

    if (tripId && adminDb) {
      const tripSnap = await adminDb.collection("trips").doc(tripId).get();
      if (tripSnap.exists) {
        const tripData = tripSnap.data() || {};
        previewData.trip = {
          ...tripData,
          id: tripId,
          name: tripData.name || previewData.trip.name,
          destination: tripData.destination || previewData.trip.destination,
        };
        if (tripData.coordinators && tripData.coordinators.length > 0) {
          previewData.coordinator = tripData.coordinators[0];
        }
        if (tripData.whatsappLink) {
          previewData.whatsappLink = tripData.whatsappLink;
        }
      }
    }

    const subject = buildTripApprovalSubject({
      studentName: previewData.student.name,
      tripName: previewData.trip.name,
    });
    const html = buildTripApprovalEmail(previewData);

    if (format === "json") {
      return NextResponse.json({
        success: true,
        subject,
        html,
        data: previewData,
      });
    }

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("GET email-preview error:", err);
    return NextResponse.json({ error: "Failed to render email preview: " + err.message }, { status: 500 });
  }
}

/**
 * POST: Admin-only safe test email dispatch
 * Sends a real email to the admin or specified test email without affecting any registration
 */
export async function POST(req) {
  try {
    const isAdmin = await isAuthorizedAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access: Admin only" }, { status: 401 });
    }

    const body = await req.json();
    const { testEmail, tripId } = body;

    if (!testEmail || !testEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid test recipient email is required." },
        { status: 400 }
      );
    }

    let testData = {
      ...SAMPLE_PREVIEW_DATA,
      student: {
        ...SAMPLE_PREVIEW_DATA.student,
        email: testEmail.trim().toLowerCase(),
      },
    };

    if (tripId && adminDb) {
      const tripSnap = await adminDb.collection("trips").doc(tripId).get();
      if (tripSnap.exists) {
        const tripData = tripSnap.data() || {};
        testData.trip = { ...tripData, id: tripId };
        if (tripData.coordinators && tripData.coordinators.length > 0) {
          testData.coordinator = tripData.coordinators[0];
        }
        if (tripData.whatsappLink) {
          testData.whatsappLink = tripData.whatsappLink;
        }
      }
    }

    const result = await sendTripApprovalEmail(testData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test approval email dispatched successfully to ${testEmail}`,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send test email.",
        },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("POST email-preview error:", err);
    return NextResponse.json({ error: "Internal error: " + err.message }, { status: 500 });
  }
}
