import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getDeduplicatedRegistrationsForTrip } from "@/lib/tripRegistration";
import {
  isAuthorizedAdmin,
  getAuthenticatedCoordinator,
  getCoordinatorTripScope,
  isApprovedRegistrationStatus,
} from "@/lib/coordinatorAuth";
import { extractStudentFieldsFromFormData } from "@/lib/studentProfile";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("tripId");
    const studentEmail = searchParams.get("studentEmail");

    const isAdmin = await isAuthorizedAdmin();
    let coordinatorEmail = null;
    let assignedOption = null;

    if (!isAdmin) {
      const coordinatorToken = await getAuthenticatedCoordinator(request);
      if (!coordinatorToken) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }

      coordinatorEmail = coordinatorToken.email;

      if (tripId) {
        const scope = await getCoordinatorTripScope(coordinatorEmail, tripId);
        if (!scope.isAssigned) {
          return NextResponse.json(
            { error: "Forbidden: You are not assigned to coordinate this trip." },
            { status: 403 }
          );
        }
        assignedOption = scope.assignedOption;
      }
    }

    let q = adminDb.collection("coordinator_concerns");

    if (tripId && studentEmail) {
      q = q.where("tripId", "==", tripId).where("studentEmail", "==", studentEmail.toLowerCase());
    } else if (studentEmail) {
      q = q.where("studentEmail", "==", studentEmail.toLowerCase());
    } else if (tripId) {
      q = q.where("tripId", "==", tripId);
    }

    const snapshot = await q.get();
    let concerns = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    // If caller is a coordinator, enforce strict student data privacy and assignedOption scoping
    if (!isAdmin) {
      const allRegs = tripId ? await getDeduplicatedRegistrationsForTrip(tripId) : [];
      const regMap = new Map();
      for (const reg of allRegs) {
        if (reg.email) {
          const extracted = extractStudentFieldsFromFormData(reg.formData || {});
          let matchesScope = true;
          if (assignedOption) {
            const opt = assignedOption.toLowerCase().trim();
            matchesScope = Object.values(reg.formData || {}).some(
              (val) => typeof val === "string" && val.trim().toLowerCase() === opt
            );
          }
          regMap.set(reg.email.toLowerCase(), {
            name: extracted.name || "Student",
            phone: extracted.phone || "",
            matchesScope,
          });
        }
      }

      // Filter out concerns for students outside assignedOption scope, and strip studentEmail
      concerns = concerns
        .filter((c) => {
          if (!assignedOption) return true;
          const info = regMap.get(c.studentEmail?.toLowerCase());
          return info ? info.matchesScope : false;
        })
        .map((c) => {
          const info = regMap.get(c.studentEmail?.toLowerCase());
          return {
            id: c.id,
            tripId: c.tripId,
            studentName: info?.name || "Student",
            studentPhone: info?.phone || "",
            concernText: c.concernText,
            coordinatorEmail: c.coordinatorEmail,
            createdAt: c.createdAt,
          };
        });
    } else if (assignedOption && tripId) {
      const allRegs = await getDeduplicatedRegistrationsForTrip(tripId);
      const studentEmailsToKeep = new Set(
        allRegs
          .filter((reg) => {
            const fd = reg.formData || {};
            return Object.values(fd).some(
              (val) => typeof val === "string" && val.trim().toLowerCase() === assignedOption
            );
          })
          .map((reg) => reg.email?.toLowerCase())
      );
      concerns = concerns.filter((c) => studentEmailsToKeep.has(c.studentEmail?.toLowerCase()));
    }

    // Sort in-memory by createdAt desc
    concerns.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ concerns }, { status: 200 });
  } catch (error) {
    console.error("GET Concerns Error:", error);
    return NextResponse.json({ error: "Failed to fetch concerns. Please try again." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.clone().json();
    const { tripId, studentEmail, registrationId, studentPhone, concernText } = body;

    let targetEmail = studentEmail ? studentEmail.toLowerCase().trim() : null;

    if (!tripId || !concernText) {
      return NextResponse.json(
        { error: "Missing required fields (tripId, concernText)" },
        { status: 400 }
      );
    }

    const isAdmin = await isAuthorizedAdmin();
    let coordinatorEmail = "admin";
    let scope = null;

    if (!isAdmin) {
      const coordinatorToken = await getAuthenticatedCoordinator(request);
      if (!coordinatorToken) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }

      coordinatorEmail = coordinatorToken.email;

      scope = await getCoordinatorTripScope(coordinatorEmail, tripId);
      if (!scope.isAssigned) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to coordinate this trip." },
          { status: 403 }
        );
      }
    }

    // Support resolution of studentEmail from registrationId or studentPhone
    if (!targetEmail && (registrationId || studentPhone)) {
      const allRegs = await getDeduplicatedRegistrationsForTrip(tripId);
      const matched = allRegs.find((r) => {
        if (registrationId && (r.id === registrationId || `${r.tripId}_${r.uid}` === registrationId)) {
          return true;
        }
        if (studentPhone) {
          const extracted = extractStudentFieldsFromFormData(r.formData || {});
          return extracted.phone && extracted.phone.trim() === String(studentPhone).trim();
        }
        return false;
      });
      if (matched && matched.email) {
        targetEmail = matched.email.toLowerCase().trim();
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: "Target student not identified. Provide studentEmail, registrationId, or studentPhone." },
        { status: 400 }
      );
    }

    if (!isAdmin) {
      // Verify student registration exists and is APPROVED
      const allRegs = await getDeduplicatedRegistrationsForTrip(tripId);
      const studentReg = allRegs.find(
        (r) => r.email?.toLowerCase() === targetEmail.toLowerCase()
      );

      if (!studentReg) {
        return NextResponse.json({ error: "Student registration not found." }, { status: 404 });
      }

      if (!isApprovedRegistrationStatus(studentReg.status)) {
        return NextResponse.json(
          { error: "Forbidden: Coordinators can only raise concerns on approved student registrations." },
          { status: 403 }
        );
      }

      // If coordinator has assignedOption restriction, verify student registration matches
      if (scope.assignedOption) {
        const assignedOption = scope.assignedOption;
        const matches = Object.values(studentReg.formData || {}).some(
          (val) => typeof val === "string" && val.trim().toLowerCase() === assignedOption
        );
        if (!matches) {
          return NextResponse.json(
            { error: "Unauthorized: Registration does not belong to your assigned option/city." },
            { status: 403 }
          );
        }
      }
    }

    // Check if trip is completed
    const tripSnap = await adminDb.collection("trips").doc(tripId).get();
    if (tripSnap.exists && tripSnap.data()?.isCompleted) {
      return NextResponse.json(
        { error: "Trip is completed. Cannot add concerns." },
        { status: 400 }
      );
    }

    const docRef = await adminDb.collection("coordinator_concerns").add({
      tripId,
      studentEmail: targetEmail,
      coordinatorEmail,
      concernText,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("POST Concerns Error:", error);
    return NextResponse.json({ error: "An internal error occurred." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const isAdmin = await isAuthorizedAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can delete concern records." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Concern ID is required" }, { status: 400 });
    }

    await adminDb.collection("coordinator_concerns").doc(id).delete();
    return NextResponse.json({ success: true, message: "Concern deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Concern Error:", error);
    return NextResponse.json({ error: "Failed to delete concern. Please try again." }, { status: 500 });
  }
}
