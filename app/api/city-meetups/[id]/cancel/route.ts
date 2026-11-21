import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { authenticateMeetupStudent } from "@/lib/meetupStudentAuth";
import {
  buildMeetupRegistrationId,
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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authRes = await authenticateMeetupStudent(request);
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const { student } = authRes;
    const { id } = await context.params;
    const meetupId = String(id || "").trim();

    if (!meetupId) {
      return NextResponse.json({ error: "Meetup ID is required." }, { status: 400 });
    }

    // Explicitly reject attempts to cancel on behalf of another student
    let body: Record<string, any> = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      // Empty body is valid
    }
    if (body?.uid && String(body.uid).trim() !== student.uid) {
      return NextResponse.json(
        { error: "Forbidden: cannot cancel registration on behalf of another student." },
        { status: 403 }
      );
    }

    const registrationId = buildMeetupRegistrationId(meetupId, student.uid);
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
        throw new TxHttpError("No registration found for this city meetup.", 404, "REG_NOT_FOUND");
      }

      const meetup = normalizeCityMeetupDoc(meetupSnap.id, meetupSnap.data() || {});
      const reg = normalizeMeetupRegistrationDoc(regSnap.id, regSnap.data() || {});

      // Verify ownership strictly
      if (reg.uid !== student.uid) {
        throw new TxHttpError(
          "Forbidden: you can only cancel your own registration.",
          403,
          "FORBIDDEN"
        );
      }

      if (meetup.status === "completed") {
        throw new TxHttpError(
          "Cannot cancel registration for a completed meetup.",
          409,
          "COMPLETED"
        );
      }

      if (reg.status === "cancelled") {
        throw new TxHttpError(
          "Your registration for this city meetup is already cancelled.",
          409,
          "ALREADY_CANCELLED"
        );
      }

      const nextRegisteredCount = Math.max(0, meetup.registeredCount - 1);
      const nextCheckedInCount = reg.attended
        ? Math.max(0, meetup.checkedInCount - 1)
        : meetup.checkedInCount;
      const nowIso = new Date().toISOString();

      // Preserve registration document and history; transition status to cancelled
      tx.update(regRef, {
        status: "cancelled",
        attended: false,
        checkedInAt: null,
        checkedInBy: null,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const meetupUpdate: Record<string, any> = {
        registeredCount: nextRegisteredCount,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (reg.attended) {
        meetupUpdate.checkedInCount = nextCheckedInCount;
      }
      tx.update(meetupRef, meetupUpdate);

      return {
        registeredCount: nextRegisteredCount,
        checkedInCount: nextCheckedInCount,
        registration: {
          ...reg,
          status: "cancelled" as const,
          attended: false,
          checkedInAt: null,
          checkedInBy: null,
          cancelledAt: nowIso,
          updatedAt: nowIso,
        },
      };
    });

    return NextResponse.json({
      success: true,
      registration: txResult.registration,
      registeredCount: txResult.registeredCount,
    });
  } catch (error: any) {
    if (error instanceof TxHttpError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("POST /api/city-meetups/[id]/cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel meetup registration." },
      { status: 500 }
    );
  }
}
