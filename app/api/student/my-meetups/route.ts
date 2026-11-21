import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateMeetupStudent } from "@/lib/meetupStudentAuth";
import {
  normalizeCampaignDoc,
  normalizeCityMeetupDoc,
  normalizeMeetupRegistrationDoc,
} from "@/lib/cityMeetups";

export async function GET(request: Request) {
  try {
    const authRes = await authenticateMeetupStudent(request);
    if (!authRes.ok) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const { student } = authRes;

    const regsSnap = await adminDb
      .collection("meetup_registrations")
      .where("uid", "==", student.uid)
      .get();

    if (regsSnap.empty) {
      return NextResponse.json({
        success: true,
        student,
        upcomingMeetups: [],
        pastMeetups: [],
        activeMeetupIds: [],
        stats: { total: 0, upcomingCount: 0, pastCount: 0, attendedCount: 0 },
      });
    }

    const registrations = regsSnap.docs.map((doc) =>
      normalizeMeetupRegistrationDoc(doc.id, doc.data() || {})
    );

    const meetupIds = Array.from(
      new Set(registrations.map((r) => r.meetupId).filter(Boolean))
    );

    const meetupMap = new Map<string, ReturnType<typeof normalizeCityMeetupDoc>>();
    if (meetupIds.length > 0) {
      const refs = meetupIds.map((mid) => adminDb.collection("city_meetups").doc(mid));
      const snaps = await adminDb.getAll(...refs);
      for (const snap of snaps) {
        if (snap.exists) {
          meetupMap.set(snap.id, normalizeCityMeetupDoc(snap.id, snap.data() || {}));
        }
      }
    }

    const campaignIds = Array.from(
      new Set(
        Array.from(meetupMap.values())
          .map((m) => m.campaignId)
          .filter((cid): cid is string => Boolean(cid))
      )
    );

    const campaignMap = new Map<string, ReturnType<typeof normalizeCampaignDoc>>();
    if (campaignIds.length > 0) {
      const refs = campaignIds.map((cid) => adminDb.collection("meetup_campaigns").doc(cid));
      const snaps = await adminDb.getAll(...refs);
      for (const snap of snaps) {
        if (snap.exists) {
          campaignMap.set(snap.id, normalizeCampaignDoc(snap.id, snap.data() || {}));
        }
      }
    }

    const upcomingMeetups: any[] = [];
    const pastMeetups: any[] = [];
    const activeMeetupIds: string[] = [];
    let attendedCount = 0;

    for (const reg of registrations) {
      const meetup = meetupMap.get(reg.meetupId);
      if (!meetup) continue;

      const campaign = meetup.campaignId ? campaignMap.get(meetup.campaignId) || null : null;
      const isActiveReg = reg.status === "registered";

      if (isActiveReg) {
        activeMeetupIds.push(reg.meetupId);
      }
      if (reg.attended) {
        attendedCount += 1;
      }

      const isEventPastOrClosed =
        meetup.status === "completed" || meetup.status === "cancelled";
      const canCancel = isActiveReg && meetup.status !== "completed" && meetup.status !== "cancelled";

      const entry = {
        registrationId: reg.id,
        meetupId: reg.meetupId,
        campaignId: meetup.campaignId,
        registrationStatus: reg.status,
        attended: reg.attended,
        checkedInAt: reg.checkedInAt,
        registeredAt: reg.registeredAt,
        cancelledAt: reg.cancelledAt,
        canCancel,
        meetup: {
          id: meetup.id,
          cityName: meetup.cityName,
          title: meetup.title || meetup.cityName,
          meetupType: meetup.meetupType,
          status: meetup.status,
          eventDate: meetup.eventDate,
          startTime: meetup.startTime,
          endTime: meetup.endTime,
          venue: meetup.venue || "",
          capacity: meetup.capacity,
          registeredCount: meetup.registeredCount,
          registrationOpen: meetup.registrationOpen,
          img: meetup.img || "",
          // Only expose WhatsApp group link to active registrants of non-cancelled meetups
          whatsappGroupLink:
            isActiveReg && meetup.status !== "cancelled"
              ? meetup.whatsappGroupLink || null
              : null,
        },
        campaign: campaign
          ? {
              id: campaign.id,
              title: campaign.title,
              edition: campaign.edition || "",
              img: campaign.img || "",
              logo: campaign.logo || "",
              status: campaign.status,
            }
          : null,
      };

      if (isActiveReg && !isEventPastOrClosed) {
        upcomingMeetups.push(entry);
      } else {
        pastMeetups.push(entry);
      }
    }

    upcomingMeetups.sort((a, b) =>
      String(a.meetup.eventDate || "9999").localeCompare(String(b.meetup.eventDate || "9999"))
    );
    pastMeetups.sort((a, b) =>
      String(b.meetup.eventDate || "").localeCompare(String(a.meetup.eventDate || ""))
    );

    return NextResponse.json({
      success: true,
      student,
      upcomingMeetups,
      pastMeetups,
      activeMeetupIds,
      stats: {
        total: upcomingMeetups.length + pastMeetups.length,
        upcomingCount: upcomingMeetups.length,
        pastCount: pastMeetups.length,
        attendedCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/student/my-meetups error:", error);
    return NextResponse.json(
      { error: "Failed to load your meetup registrations." },
      { status: 500 }
    );
  }
}
