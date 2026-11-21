import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin, recordAuditLog, type AdminContext } from "@/lib/adminAuth";
import {
  buildMeetupRegistrationId,
  normalizeCampaignDoc,
  normalizeCityMeetupDoc,
  normalizeMeetupRegistrationDoc,
} from "@/lib/cityMeetups";

class TxHttpError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * GET /api/admin/city-meetups/[id]/participants
 * Admin-only participant roster and live counts for a single city meetup event.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await requireAdmin(request);
    } catch (authErr: any) {
      return NextResponse.json(
        { error: authErr?.message || "Unauthorized" },
        { status: authErr?.status || 401 }
      );
    }

    const { id } = await context.params;
    const meetupId = String(id || "").trim();
    if (!meetupId) {
      return NextResponse.json({ error: "Meetup ID is required." }, { status: 400 });
    }

    const meetupSnap = await adminDb.collection("city_meetups").doc(meetupId).get();
    if (!meetupSnap.exists) {
      return NextResponse.json({ error: "City meetup not found." }, { status: 404 });
    }

    const meetup = normalizeCityMeetupDoc(meetupSnap.id, meetupSnap.data() || {});

    let campaign = null;
    if (meetup.campaignId) {
      const campSnap = await adminDb
        .collection("meetup_campaigns")
        .doc(meetup.campaignId)
        .get();
      if (campSnap.exists) {
        campaign = normalizeCampaignDoc(campSnap.id, campSnap.data() || {});
      }
    }

    const regsSnap = await adminDb
      .collection("meetup_registrations")
      .where("meetupId", "==", meetupId)
      .get();

    const participants = regsSnap.docs
      .map((doc) => normalizeMeetupRegistrationDoc(doc.id, doc.data() || {}))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "registered" ? -1 : 1;
        return (a.studentName || a.studentEmail).localeCompare(
          b.studentName || b.studentEmail
        );
      });

    const registeredCount = participants.filter((p) => p.status === "registered").length;
    const cancelledCount = participants.filter((p) => p.status === "cancelled").length;
    const checkedInCount = participants.filter(
      (p) => p.status === "registered" && p.attended
    ).length;

    return NextResponse.json({
      success: true,
      meetup,
      campaign,
      participants,
      counts: {
        registered: registeredCount,
        cancelled: cancelledCount,
        checkedIn: checkedInCount,
        capacity: meetup.capacity,
        storedRegisteredCount: meetup.registeredCount,
        storedCheckedInCount: meetup.checkedInCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/city-meetups/[id]/participants error:", error);
    return NextResponse.json(
      { error: "Failed to load city meetup participants." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/city-meetups/[id]/participants
 * Idempotent transactional attendance check-in / reversal for a single student in a city meetup.
 * Body: { uid: string, attended: boolean }
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    let admin: AdminContext;
    try {
      admin = await requireAdmin(request);
    } catch (authErr: any) {
      return NextResponse.json(
        { error: authErr?.message || "Unauthorized" },
        { status: authErr?.status || 401 }
      );
    }

    const { id } = await context.params;
    const meetupId = String(id || "").trim();
    if (!meetupId) {
      return NextResponse.json({ error: "Meetup ID is required." }, { status: 400 });
    }

    let body: Record<string, any> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const uid = String(body.uid || "").trim();
    if (!uid) {
      return NextResponse.json({ error: "Student uid is required." }, { status: 400 });
    }
    if (typeof body.attended !== "boolean") {
      return NextResponse.json(
        { error: "attended must be a boolean (true or false)." },
        { status: 400 }
      );
    }

    const desiredAttended: boolean = body.attended;
    const registrationId = buildMeetupRegistrationId(meetupId, uid);
    const meetupRef = adminDb.collection("city_meetups").doc(meetupId);
    const regRef = adminDb.collection("meetup_registrations").doc(registrationId);

    const txResult = await adminDb.runTransaction(async (tx) => {
      const [meetupSnap, regSnap] = await Promise.all([
        tx.get(meetupRef),
        tx.get(regRef),
      ]);

      if (!meetupSnap.exists) {
        throw new TxHttpError("City meetup not found.", 404, "NOT_FOUND");
      }
      if (!regSnap.exists) {
        throw new TxHttpError("Participant registration not found.", 404, "REG_NOT_FOUND");
      }

      const meetup = normalizeCityMeetupDoc(meetupSnap.id, meetupSnap.data() || {});
      const reg = normalizeMeetupRegistrationDoc(regSnap.id, regSnap.data() || {});

      if (reg.status !== "registered") {
        throw new TxHttpError(
          "Cannot update attendance for a cancelled registration.",
          409,
          "REGISTRATION_CANCELLED"
        );
      }

      // Idempotency guard: if already in desired state, perform NO write and do NOT alter checkedInCount
      if (reg.attended === desiredAttended) {
        return {
          idempotent: true,
          checkedInCount: meetup.checkedInCount,
          registration: reg,
          cityName: meetup.cityName,
        };
      }

      const nextCheckedInCount = desiredAttended
        ? meetup.checkedInCount + 1
        : Math.max(0, meetup.checkedInCount - 1);

      const nowIso = new Date().toISOString();

      tx.update(regRef, {
        attended: desiredAttended,
        checkedInAt: desiredAttended ? FieldValue.serverTimestamp() : null,
        checkedInBy: desiredAttended ? admin.email : null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(meetupRef, {
        checkedInCount: nextCheckedInCount,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        idempotent: false,
        checkedInCount: nextCheckedInCount,
        cityName: meetup.cityName,
        registration: {
          ...reg,
          attended: desiredAttended,
          checkedInAt: desiredAttended ? nowIso : null,
          checkedInBy: desiredAttended ? admin.email : null,
          updatedAt: nowIso,
        },
      };
    });

    if (!txResult.idempotent) {
      await recordAuditLog(
        admin,
        desiredAttended
          ? "CITY_MEETUP_ATTENDANCE_MARKED"
          : "CITY_MEETUP_ATTENDANCE_REVERSED",
        "meetup_registration",
        registrationId,
        "success",
        {
          meetupId,
          cityName: txResult.cityName,
          studentUid: uid,
          attended: desiredAttended,
          checkedInCount: txResult.checkedInCount,
        }
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      idempotent: txResult.idempotent,
      checkedInCount: txResult.checkedInCount,
      registration: txResult.registration,
    });
  } catch (error: any) {
    if (error instanceof TxHttpError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("PATCH /api/admin/city-meetups/[id]/participants error:", error);
    return NextResponse.json(
      { error: "Failed to update participant attendance." },
      { status: 500 }
    );
  }
}
