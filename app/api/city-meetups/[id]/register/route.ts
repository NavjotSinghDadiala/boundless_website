import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { authenticateMeetupStudent } from "@/lib/meetupStudentAuth";
import {
  buildMeetupRegistrationId,
  evaluateRegistrationEligibility,
  normalizeCityMeetupDoc,
  normalizeMeetupRegistrationDoc,
} from "@/lib/cityMeetups";

class TxHttpError extends Error {
  status: number;
  code?: string;
  extra?: Record<string, any>;
  constructor(message: string, status: number, code?: string, extra?: Record<string, any>) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
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

    // Explicitly reject attempts to act on behalf of another student if body supplies a mismatched uid
    let body: Record<string, any> = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      // Empty or non-JSON body is fine; student identity comes solely from the verified token
    }
    if (body?.uid && String(body.uid).trim() !== student.uid) {
      return NextResponse.json(
        { error: "Forbidden: cannot register on behalf of another student." },
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

      const meetup = normalizeCityMeetupDoc(meetupSnap.id, meetupSnap.data() || {});

      // Check existing registration first for clean duplicate handling
      const existingReg = regSnap.exists
        ? normalizeMeetupRegistrationDoc(regSnap.id, regSnap.data() || {})
        : null;

      if (existingReg && existingReg.status === "registered") {
        throw new TxHttpError(
          "You are already registered for this city meetup.",
          409,
          "ALREADY_REGISTERED",
          {
            alreadyRegistered: true,
            registration: existingReg,
            registeredCount: meetup.registeredCount,
          }
        );
      }

      // Check parent campaign status if this is a campaign city event
      if (meetup.campaignId) {
        const campaignRef = adminDb.collection("meetup_campaigns").doc(meetup.campaignId);
        const campaignSnap = await tx.get(campaignRef);
        if (campaignSnap.exists) {
          const campData = campaignSnap.data() || {};
          if (campData.status === "archived" || campData.status === "completed") {
            throw new TxHttpError(
              "The parent campaign for this city meetup is no longer open for registration.",
              409,
              "CAMPAIGN_CLOSED"
            );
          }
        }
      }

      // Evaluate meetup eligibility (archive, status, window, deadline, capacity)
      const eligibility = evaluateRegistrationEligibility(meetup, new Date());
      if (!eligibility.eligible) {
        throw new TxHttpError(
          eligibility.reason || "Registration is not available for this meetup.",
          409,
          eligibility.code
        );
      }

      const nextRegisteredCount = meetup.registeredCount + 1;
      const nowIso = new Date().toISOString();

      if (existingReg && existingReg.status === "cancelled") {
        // Re-registration: preserve original registeredAt history, reactivate cleanly
        const updatePayload = {
          status: "registered",
          studentName: student.name || existingReg.studentName,
          studentEmail: student.email,
          studentId: student.studentId || existingReg.studentId,
          phone: student.phone || existingReg.phone,
          cityName: meetup.cityName,
          campaignId: meetup.campaignId,
          attended: false,
          checkedInAt: null,
          checkedInBy: null,
          cancelledAt: null,
          reRegisteredAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        tx.update(regRef, updatePayload);
        tx.update(meetupRef, {
          registeredCount: nextRegisteredCount,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return {
          status: 200,
          reRegistered: true,
          registeredCount: nextRegisteredCount,
          registration: {
            ...existingReg,
            status: "registered" as const,
            studentName: updatePayload.studentName,
            studentEmail: updatePayload.studentEmail,
            studentId: updatePayload.studentId,
            phone: updatePayload.phone,
            attended: false,
            checkedInAt: null,
            checkedInBy: null,
            cancelledAt: null,
            reRegisteredAt: nowIso,
            updatedAt: nowIso,
          },
        };
      }

      // Brand-new registration
      const newDoc = {
        meetupId,
        campaignId: meetup.campaignId,
        cityName: meetup.cityName,
        uid: student.uid,
        studentName: student.name,
        studentEmail: student.email,
        studentId: student.studentId,
        phone: student.phone,
        status: "registered",
        attended: false,
        checkedInAt: null,
        checkedInBy: null,
        registeredAt: FieldValue.serverTimestamp(),
        reRegisteredAt: null,
        cancelledAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      };

      tx.set(regRef, newDoc);
      tx.update(meetupRef, {
        registeredCount: nextRegisteredCount,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        status: 201,
        reRegistered: false,
        registeredCount: nextRegisteredCount,
        registration: {
          id: registrationId,
          meetupId,
          campaignId: meetup.campaignId,
          cityName: meetup.cityName,
          uid: student.uid,
          studentName: student.name,
          studentEmail: student.email,
          studentId: student.studentId,
          phone: student.phone,
          status: "registered" as const,
          attended: false,
          checkedInAt: null,
          checkedInBy: null,
          registeredAt: nowIso,
          reRegisteredAt: null,
          cancelledAt: null,
          updatedAt: nowIso,
        },
      };
    });

    return NextResponse.json(
      {
        success: true,
        reRegistered: txResult.reRegistered,
        registration: txResult.registration,
        registeredCount: txResult.registeredCount,
      },
      { status: txResult.status }
    );
  } catch (error: any) {
    if (error instanceof TxHttpError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          ...(error.extra || {}),
        },
        { status: error.status }
      );
    }
    console.error("POST /api/city-meetups/[id]/register error:", error);
    return NextResponse.json(
      { error: "Failed to complete meetup registration." },
      { status: 500 }
    );
  }
}
