import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedCoordinator,
  getCoordinatorTripScope,
  APPROVED_STATUSES,
} from "@/lib/coordinatorAuth";
import { getDeduplicatedRegistrationsForTrip } from "@/lib/tripRegistration";
import { extractStudentFieldsFromFormData } from "@/lib/studentProfile";

export async function GET(request: Request) {
  try {
    // 1. Derive coordinator identity exclusively from the verified Firebase ID token
    const coordinator = await getAuthenticatedCoordinator(request);
    if (!coordinator || !coordinator.email) {
      return NextResponse.json(
        { error: "Unauthorized: Valid coordinator authentication token required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("tripId");

    // 2. If no tripId requested, return all trips assigned to this coordinator
    if (!tripId) {
      const tripsSnapshot = await adminDb
        .collection("trips")
        .orderBy("createdAt", "desc")
        .get();

      const assignedTrips = tripsSnapshot.docs
        .filter((doc) => {
          const data = doc.data() || {};
          return (data.coordinators || []).some((c: any) => {
            const email = typeof c === "object" && c !== null ? c.email : String(c);
            return String(email || "").toLowerCase().trim() === coordinator.email;
          });
        })
        .map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            name: data.name || "",
            destination: data.destination || "",
            startDate: data.startDate || "",
            endDate: data.endDate || "",
            totalSeats: data.totalSeats !== undefined ? Number(data.totalSeats) : 0,
            totalJoined: data.totalJoined !== undefined ? Number(data.totalJoined) : 0,
            isCompleted: Boolean(data.isCompleted),
            images: Array.isArray(data.images) ? data.images : [],
          };
        });

      return NextResponse.json({ trips: assignedTrips }, { status: 200 });
    }

    // 3. Verify coordinator is assigned to the requested tripId
    const scope = await getCoordinatorTripScope(coordinator.email, tripId);
    if (!scope.isAssigned) {
      return NextResponse.json(
        { error: "Forbidden: You are not assigned to coordinate this trip." },
        { status: 403 }
      );
    }

    const tripData = scope.tripData || {};

    // 4. Sanitize coordinator info for the trip
    const sanitizedCoordinators = (tripData.coordinators || []).map((c: any) => {
      const cEmail = typeof c === "object" && c !== null ? c.email : String(c);
      const isMe = cEmail && String(cEmail).toLowerCase().trim() === coordinator.email;
      if (isMe) {
        return {
          name: typeof c === "object" && c !== null ? c.name || cEmail : cEmail,
          email: coordinator.email,
          phone: typeof c === "object" && c !== null ? String(c.phone || "") : "",
          assignedOption: typeof c === "object" && c !== null ? c.assignedOption || null : null,
        };
      }
      return {
        name: typeof c === "object" && c !== null ? c.name || "Coordinator" : String(c),
      };
    });

    const formattedTrip = {
      id: tripId,
      name: tripData.name || "",
      destination: tripData.destination || "",
      startDate: tripData.startDate || "",
      endDate: tripData.endDate || "",
      description: tripData.description || "",
      capacity: tripData.totalSeats !== undefined ? Number(tripData.totalSeats) : 0,
      totalSeats: tripData.totalSeats !== undefined ? Number(tripData.totalSeats) : 0,
      totalJoined: tripData.totalJoined !== undefined ? Number(tripData.totalJoined) : 0,
      itinerary: Array.isArray(tripData.itinerary) ? tripData.itinerary : [],
      importantInformation: tripData.importantInformation || "",
      thingsToCarry: Array.isArray(tripData.thingsToCarry) ? tripData.thingsToCarry : [],
      images: Array.isArray(tripData.images) ? tripData.images : [],
      isCompleted: Boolean(tripData.isCompleted),
      coordinators: sanitizedCoordinators,
    };

    // 5. Fetch registrations and enforce APPROVED-ONLY server-side filter
    const allRegistrations = await getDeduplicatedRegistrationsForTrip(tripId);

    // Filter strictly to approved statuses
    let approvedRegistrations = allRegistrations.filter((reg) => {
      const st = String(reg.status || "").toLowerCase().trim();
      return APPROVED_STATUSES.has(st);
    });

    // If coordinator has an assignedOption (city / option scope), filter matching registrations
    if (scope.assignedOption) {
      const opt = scope.assignedOption.toLowerCase().trim();
      approvedRegistrations = approvedRegistrations.filter((reg) => {
        const fd = reg.formData || {};
        return Object.values(fd).some(
          (val) => typeof val === "string" && val.trim().toLowerCase() === opt
        );
      });
    }

    // 6. Map approved registrations to NAME + PHONE ONLY
    // Absolutely NO email, student ID, DOB, gender, residence, documents, or formData
    const approvedStudents = approvedRegistrations.map((reg) => {
      const extracted = extractStudentFieldsFromFormData(reg.formData || {});
      const name = extracted.name || "Student";
      const phone = extracted.phone || "";
      return {
        id: reg.id || `${tripId}_${reg.uid}`,
        name,
        phone,
      };
    });

    // 7. Fetch coordinator concerns for this trip
    const concernsSnap = await adminDb
      .collection("coordinator_concerns")
      .where("tripId", "==", tripId)
      .get();

    // Build email-to-student map to resolve studentName and studentPhone without exposing email
    const regEmailMap = new Map<string, { name: string; phone: string; matchesScope: boolean }>();
    for (const reg of allRegistrations) {
      if (reg.email) {
        const extracted = extractStudentFieldsFromFormData(reg.formData || {});
        let matchesScope = true;
        if (scope.assignedOption) {
          const opt = scope.assignedOption.toLowerCase().trim();
          matchesScope = Object.values(reg.formData || {}).some(
            (val) => typeof val === "string" && val.trim().toLowerCase() === opt
          );
        }
        regEmailMap.set(reg.email.toLowerCase(), {
          name: extracted.name || "Student",
          phone: extracted.phone || "",
          matchesScope,
        });
      }
    }

    const concerns = concernsSnap.docs
      .map((doc) => {
        const data = doc.data() || {};
        const studentInfo = regEmailMap.get(String(data.studentEmail || "").toLowerCase());

        // If assignedOption scope applies and student doesn't match scope, exclude
        if (scope.assignedOption && studentInfo && !studentInfo.matchesScope) {
          return null;
        }

        return {
          id: doc.id,
          studentName: studentInfo?.name || "Student",
          studentPhone: studentInfo?.phone || "",
          concernText: data.concernText || "",
          coordinatorEmail: data.coordinatorEmail || "",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });

    const stats = {
      totalApproved: approvedStudents.length,
      totalSeats: formattedTrip.totalSeats,
      totalJoined: formattedTrip.totalJoined,
      remainingSeats: Math.max(0, formattedTrip.totalSeats - formattedTrip.totalJoined),
    };

    return NextResponse.json(
      {
        trip: formattedTrip,
        approvedStudents,
        concerns,
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Coordinator Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to load coordinator dashboard data." },
      { status: 500 }
    );
  }
}
