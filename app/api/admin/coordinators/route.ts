import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  isAuthorizedAdmin,
  normalizeEmail,
  normalizeStudentId,
} from "@/lib/coordinatorAuth";

/**
 * GET /api/admin/coordinators
 * List all registered trip coordinators with optional search and filter.
 * Strictly protected by admin session or secret token.
 */
export async function GET(request: Request) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Administrator access required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = (searchParams.get("q") || "").toLowerCase().trim();
    const activeFilter = searchParams.get("active"); // "true" | "false" | null

    // 1. Fetch all coordinators
    const coordinatorsSnap = await adminDb.collection("coordinators").get();

    // 2. Fetch all trips to calculate assigned trips count for each coordinator
    const tripsSnap = await adminDb.collection("trips").get();
    const tripAssignmentCounts = new Map<string, number>();

    tripsSnap.forEach((tripDoc) => {
      const tripData = tripDoc.data() || {};
      const coordinators = tripData.coordinators || [];
      coordinators.forEach((c: any) => {
        const cEmail = normalizeEmail(typeof c === "object" && c !== null ? c.email : String(c));
        const cStudentId = normalizeStudentId(typeof c === "object" && c !== null ? c.studentId : "");
        if (cEmail) {
          tripAssignmentCounts.set(cEmail, (tripAssignmentCounts.get(cEmail) || 0) + 1);
        }
        if (cStudentId) {
          tripAssignmentCounts.set(cStudentId, (tripAssignmentCounts.get(cStudentId) || 0) + 1);
        }
      });
    });

    let coordinators: any[] = [];
    let activeCount = 0;
    let inactiveCount = 0;

    coordinatorsSnap.forEach((doc) => {
      const data = doc.data() || {};
      const studentId = normalizeStudentId(data.studentId || "");
      const email = normalizeEmail(data.email || (doc.id.includes("@") ? doc.id : ""));
      const name = data.name || "Coordinator";
      const phone = data.phone || "";
      const active = data.active !== false; // default true if undefined
      const notes = data.notes || "";
      const createdAt = data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null;
      const updatedAt = data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null;

      if (active) activeCount++;
      else inactiveCount++;

      // Compute assigned trips count (by email or studentId)
      const assignedTripsCount = Math.max(
        tripAssignmentCounts.get(email) || 0,
        tripAssignmentCounts.get(studentId) || 0
      );

      coordinators.push({
        id: doc.id,
        studentId,
        email,
        name,
        phone,
        active,
        notes,
        assignedTripsCount,
        createdAt,
        updatedAt,
      });
    });

    // Sort by name or creation
    coordinators.sort((a, b) => a.name.localeCompare(b.name));

    // Filter by search query if provided
    if (searchQuery) {
      coordinators = coordinators.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery) ||
          c.studentId.toLowerCase().includes(searchQuery) ||
          c.email.toLowerCase().includes(searchQuery) ||
          c.phone.toLowerCase().includes(searchQuery) ||
          c.notes.toLowerCase().includes(searchQuery)
      );
    }

    // Filter by active status if specified
    if (activeFilter === "true") {
      coordinators = coordinators.filter((c) => c.active);
    } else if (activeFilter === "false") {
      coordinators = coordinators.filter((c) => !c.active);
    }

    return NextResponse.json({
      success: true,
      coordinators,
      stats: {
        total: coordinatorsSnap.size,
        active: activeCount,
        inactive: inactiveCount,
      },
    });
  } catch (error: any) {
    console.error("Admin Coordinators GET Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load coordinators." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/coordinators
 * Create a new coordinator with Student ID, Name, Email, Phone, Status.
 */
export async function POST(request: Request) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Administrator access required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const studentId = normalizeStudentId(body.studentId || "");
    const name = (body.name || "").trim();
    const email = normalizeEmail(body.email || "");
    const phone = (body.phone || "").trim();
    const active = body.active !== undefined ? Boolean(body.active) : true;
    const notes = (body.notes || "").trim();

    // Validation: studentId and name are required
    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required (e.g. AE22B042, 23f2000835)." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Coordinator name is required." },
        { status: 400 }
      );
    }

    // Check duplicate Student ID
    const studentIdSnap = await adminDb
      .collection("coordinators")
      .where("studentId", "==", studentId)
      .limit(1)
      .get();

    if (!studentIdSnap.empty) {
      return NextResponse.json(
        { error: `Coordinator with Student ID '${studentId}' already exists.` },
        { status: 409 }
      );
    }

    // Check duplicate Email if provided
    if (email) {
      const emailSnap = await adminDb
        .collection("coordinators")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!emailSnap.empty) {
        return NextResponse.json(
          { error: `Coordinator with email '${email}' already exists.` },
          { status: 409 }
        );
      }

      const docByIdSnap = await adminDb.collection("coordinators").doc(email).get();
      if (docByIdSnap.exists) {
        return NextResponse.json(
          { error: `Coordinator with email '${email}' already exists.` },
          { status: 409 }
        );
      }
    }

    // Document ID: use email if available, otherwise random unique doc ID
    const docRef = email
      ? adminDb.collection("coordinators").doc(email)
      : adminDb.collection("coordinators").doc();

    const coordinatorData = {
      studentId,
      name,
      email: email || "",
      phone,
      active,
      notes,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(coordinatorData);

    return NextResponse.json(
      {
        success: true,
        coordinator: {
          id: docRef.id,
          ...coordinatorData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Admin Coordinators POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create coordinator." },
      { status: 500 }
    );
  }
}

/**
 * PUT / PATCH /api/admin/coordinators
 * Update coordinator details or toggle active status.
 */
export async function PUT(request: Request) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Administrator access required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = (body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Coordinator document ID is required for update." },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection("coordinators").doc(id);
    const existingSnap = await docRef.get();

    if (!existingSnap.exists) {
      return NextResponse.json(
        { error: "Coordinator record not found." },
        { status: 404 }
      );
    }

    const updates: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.studentId !== undefined) {
      const studentId = normalizeStudentId(body.studentId);
      if (!studentId) {
        return NextResponse.json(
          { error: "Student ID cannot be empty." },
          { status: 400 }
        );
      }
      // Check duplicate studentId
      const studentIdSnap = await adminDb
        .collection("coordinators")
        .where("studentId", "==", studentId)
        .get();

      const isDuplicate = studentIdSnap.docs.some((d) => d.id !== id);
      if (isDuplicate) {
        return NextResponse.json(
          { error: `Another coordinator with Student ID '${studentId}' already exists.` },
          { status: 409 }
        );
      }
      updates.studentId = studentId;
    }

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      }
      updates.name = name;
    }

    if (body.email !== undefined) {
      const email = normalizeEmail(body.email);
      if (email) {
        const emailSnap = await adminDb
          .collection("coordinators")
          .where("email", "==", email)
          .get();

        const isDuplicate = emailSnap.docs.some((d) => d.id !== id);
        if (isDuplicate) {
          return NextResponse.json(
            { error: `Another coordinator with email '${email}' already exists.` },
            { status: 409 }
          );
        }
      }
      updates.email = email;
    }

    if (body.phone !== undefined) {
      updates.phone = body.phone.trim();
    }

    if (body.active !== undefined) {
      updates.active = Boolean(body.active);
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes.trim();
    }

    await docRef.update(updates);

    return NextResponse.json({
      success: true,
      message: "Coordinator updated successfully.",
      updates,
    });
  } catch (error: any) {
    console.error("Admin Coordinators PUT Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update coordinator." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/coordinators
 * Remove a coordinator by id.
 */
export async function DELETE(request: Request) {
  try {
    const isAdmin = await isAuthorizedAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Administrator access required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Coordinator ID parameter required." },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection("coordinators").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Coordinator not found." },
        { status: 404 }
      );
    }

    await docRef.delete();

    return NextResponse.json({
      success: true,
      message: "Coordinator deleted successfully.",
    });
  } catch (error: any) {
    console.error("Admin Coordinators DELETE Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete coordinator." },
      { status: 500 }
    );
  }
}

export { PUT as PATCH };

