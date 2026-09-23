import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

/* ─────────────────────────────────────────────────────────────
   Auth helper — validates Firebase ID token from Bearer header.
   Returns { uid, email } strictly from the verified token.
   Any client-supplied ?uid= query param is completely ignored.
───────────────────────────────────────────────────────────── */
async function authenticateStudent(request: Request) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return { error: "Missing authentication token", status: 401 };
  }

  let decoded: any;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return { error: "Invalid or expired authentication token", status: 401 };
  }

  const uid: string = decoded.uid;
  const email: string = decoded.email || "";

  if (!email || !email.toLowerCase().endsWith("iitm.ac.in")) {
    return {
      error: "Unauthorized domain. Only IITM student emails are allowed.",
      status: 403,
    };
  }

  return { uid, email, name: decoded.name || "" };
}

/* ─────────────────────────────────────────────────────────────
   Status mapping: canonical Firestore status → human label.
───────────────────────────────────────────────────────────── */
function mapStatus(status: string): string {
  switch (status) {
    case "registered":
      return "Pending Approval";
    case "action_required":
      return "Action Required";
    case "approved_to_pay":
    case "mail_sent":
    case "paid":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Pending Approval";
  }
}

function isApprovedStatus(status: string): boolean {
  return ["approved_to_pay", "mail_sent", "paid"].includes(status);
}

/* ─────────────────────────────────────────────────────────────
   Sanitize a trip record based on registration status.
   Coordinator phone and whatsappLink are ONLY exposed when
   the student has an approved status.
───────────────────────────────────────────────────────────── */
function sanitizeTripForStudent(tripData: any, isApproved: boolean) {
  const coordinators = (tripData.coordinators || []).map((c: any) => {
    if (isApproved) {
      return {
        name: c.name || "",
        email: c.email || "",
        phone: c.phone || "",
      };
    }
    // Strip phone for non-approved students
    return {
      name: c.name || "",
      email: c.email || "",
    };
  });

  // Extract cover image from all possible schema locations
  const resolvedCoverImage =
    tripData.imageUrl ||
    tripData.coverImage ||
    (Array.isArray(tripData.images) && tripData.images.length > 0
      ? typeof tripData.images[0] === "string"
        ? tripData.images[0]
        : tripData.images[0]?.url
      : null) ||
    null;

  return {
    id: tripData.id || "",
    name: tripData.name || "Unnamed Trip",
    destination: tripData.destination || tripData.location || "",
    startDate: tripData.startDate || null,
    endDate: tripData.endDate || null,
    imageUrl: resolvedCoverImage,
    coverImage: resolvedCoverImage,
    images: Array.isArray(tripData.images) ? tripData.images : [],
    fee: tripData.fee || null,
    coordinators,
    // whatsappLink only exposed when approved
    whatsappLink: isApproved ? (tripData.whatsappLink || null) : null,
  };
}

/* ─────────────────────────────────────────────────────────────
   GET /api/student/my-trips
───────────────────────────────────────────────────────────── */
export async function GET(request: Request) {
  try {
    const authResult = await authenticateStudent(request);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { uid, email, name } = authResult;

    // ── 1. Fetch canonical student profile ──────────────────
    const studentSnap = await adminDb.collection("students").doc(uid).get();
    const studentData = studentSnap.exists ? studentSnap.data() || {} : {};

    const studentProfile = {
      uid,
      email,
      name: studentData.name || name || "",
      studentId: studentData.studentId || "",
      gender: studentData.gender || "unknown",
      studentIdVerified: Boolean(studentData.studentIdVerified),
      state: studentData.state || "",
      cityDistrict: studentData.cityDistrict || "",
    };

    // ── 2. Fetch active registrations (canonical) ───────────
    const canonicalSnap = await adminDb
      .collection("tripRegistrations")
      .where("uid", "==", uid)
      .get();

    // ── 3. Fetch legacy registrations by email ──────────────
    const legacySnap = await adminDb
      .collection("user-registrations")
      .where("email", "==", email)
      .get();

    // ── 4. Merge canonical + legacy, dedup by tripId ────────
    const registrationsByTripId = new Map<string, any>();

    for (const doc of canonicalSnap.docs) {
      const data = doc.data() || {};
      const tripId = data.tripId;
      if (!tripId) continue;
      // Canonical takes priority
      registrationsByTripId.set(tripId, { ...data, _docId: doc.id, _source: "canonical" });
    }

    for (const doc of legacySnap.docs) {
      const data = doc.data() || {};
      const tripId = data.tripId;
      if (!tripId) continue;
      // Only add if no canonical entry exists
      if (!registrationsByTripId.has(tripId)) {
        registrationsByTripId.set(tripId, { ...data, _docId: doc.id, _source: "legacy" });
      }
    }

    // ── 5. Fetch archived_rosters appearances ───────────────
    const archiveSnap = await adminDb.collection("archived_rosters").get();
    const archivedTripIds = new Set<string>();

    for (const doc of archiveSnap.docs) {
      const data = doc.data() || {};
      const attendees: any[] = data.attendees || [];
      const appeared = attendees.some(
        (a: any) =>
          (a.uid && a.uid === uid) ||
          (a.email && a.email.toLowerCase() === email.toLowerCase())
      );
      if (appeared) {
        archivedTripIds.add(data.tripId || doc.id);
      }
    }

    // ── 6. Collect all unique tripIds to fetch ─────────────
    const allTripIds = new Set<string>([
      ...registrationsByTripId.keys(),
      ...archivedTripIds,
    ]);

    if (allTripIds.size === 0) {
      return NextResponse.json({
        success: true,
        student: studentProfile,
        upcomingTrips: [],
        pastTrips: [],
        stats: { totalTrips: 0, upcomingCount: 0, pastCount: 0 },
      });
    }

    // ── 7. Batch-fetch trip metadata ────────────────────────
    const tripIds = Array.from(allTripIds);
    const tripFetches = tripIds.map((id) =>
      adminDb.collection("trips").doc(id).get()
    );
    const tripSnaps = await Promise.all(tripFetches);

    const tripsById = new Map<string, any>();
    for (const snap of tripSnaps) {
      if (snap.exists) {
        tripsById.set(snap.id, { id: snap.id, ...(snap.data() || {}) });
      }
    }

    const now = new Date();

    // ── 8. Build upcoming trips from active registrations ───
    const upcomingTrips: any[] = [];
    const upcomingTripIds = new Set<string>();

    for (const [tripId, reg] of registrationsByTripId.entries()) {
      const tripData = tripsById.get(tripId);
      if (!tripData) continue;

      // Determine if the trip is still "upcoming"
      const endDate = tripData.endDate
        ? new Date(
            typeof tripData.endDate === "string"
              ? tripData.endDate
              : tripData.endDate.toDate?.() || tripData.endDate
          )
        : null;

      const isCompleted = tripData.isCompleted === true || tripData.finalRosterSaved === true;
      const isPast = isCompleted || (endDate !== null && endDate < now);

      if (isPast) {
        // Will be handled as a past trip below
        continue;
      }

      const rawStatus: string = reg.status || "registered";
      const humanStatus = mapStatus(rawStatus);
      const approved = isApprovedStatus(rawStatus);

      upcomingTripIds.add(tripId);

      upcomingTrips.push({
        tripId,
        registrationId: reg._docId,
        humanStatus,
        rawStatus,
        submittedAt: reg.submittedAt?.toDate?.()?.toISOString() || reg.submittedAt || null,
        // Action Required extras
        issueText: rawStatus === "action_required" ? (reg.issueText || null) : null,
        actionRequiredFields: rawStatus === "action_required" ? (reg.actionRequiredFields || []) : [],
        // Rejection reason
        rejectionReason: rawStatus === "rejected" ? (reg.rejectionReason || null) : null,
        registrationLocation:
          reg.formData?.["City / District"] ||
          reg.formData?.cityDistrict ||
          reg.formData?.["State"] ||
          reg.formData?.state ||
          null,
        trip: sanitizeTripForStudent(tripData, approved),
      });
    }

    // Sort upcoming: Action Required first, then Pending, then Approved, then Rejected
    const statusOrder: Record<string, number> = {
      "Action Required": 0,
      "Pending Approval": 1,
      "Approved": 2,
      "Rejected": 3,
    };
    upcomingTrips.sort(
      (a, b) =>
        (statusOrder[a.humanStatus] ?? 99) - (statusOrder[b.humanStatus] ?? 99)
    );

    // ── 9. Build past trips ─────────────────────────────────
    const pastTrips: any[] = [];
    const seenPastTripIds = new Set<string>();

    // 9a. Trips that are completed and the student had a paid/approved reg
    for (const [tripId, reg] of registrationsByTripId.entries()) {
      const tripData = tripsById.get(tripId);
      if (!tripData) continue;
      if (upcomingTripIds.has(tripId)) continue; // already in upcoming

      const endDate = tripData.endDate
        ? new Date(
            typeof tripData.endDate === "string"
              ? tripData.endDate
              : tripData.endDate.toDate?.() || tripData.endDate
          )
        : null;

      const isCompleted = tripData.isCompleted === true || tripData.finalRosterSaved === true;
      const isPast = isCompleted || (endDate !== null && endDate < now);

      if (!isPast) continue;

      // Only include students who were approved/paid
      const rawStatus: string = reg.status || "registered";
      if (!isApprovedStatus(rawStatus) && rawStatus !== "paid") continue;

      if (!seenPastTripIds.has(tripId)) {
        seenPastTripIds.add(tripId);
        pastTrips.push({
          tripId,
          humanStatus: "Completed",
          rawStatus,
          submittedAt: reg.submittedAt?.toDate?.()?.toISOString() || reg.submittedAt || null,
          source: "registration",
          trip: sanitizeTripForStudent(tripData, true), // approved = true for past trips
        });
      }
    }

    // 9b. Trips from archived_rosters not already captured
    for (const tripId of archivedTripIds) {
      if (seenPastTripIds.has(tripId)) continue;
      if (upcomingTripIds.has(tripId)) continue;

      const tripData = tripsById.get(tripId);
      if (!tripData) continue;

      seenPastTripIds.add(tripId);
      pastTrips.push({
        tripId,
        humanStatus: "Completed",
        rawStatus: "paid",
        submittedAt: null,
        source: "archived_roster",
        trip: sanitizeTripForStudent(tripData, true),
      });
    }

    // Sort past trips: most recent end date first
    pastTrips.sort((a, b) => {
      const endA = a.trip.endDate ? new Date(a.trip.endDate).getTime() : 0;
      const endB = b.trip.endDate ? new Date(b.trip.endDate).getTime() : 0;
      return endB - endA;
    });

    // ── 10. Compute stats ────────────────────────────────────
    const upcomingCount = upcomingTrips.length;
    const pastCount = pastTrips.length;
    const totalTrips = upcomingCount + pastCount;

    return NextResponse.json({
      success: true,
      student: studentProfile,
      upcomingTrips,
      pastTrips,
      stats: { totalTrips, upcomingCount, pastCount },
    });
  } catch (error: any) {
    console.error("GET /api/student/my-trips error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
