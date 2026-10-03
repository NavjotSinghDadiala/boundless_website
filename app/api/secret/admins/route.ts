import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireSecretAccess, normalizeStudentId, normalizeEmail, recordAuditLog } from "@/lib/adminAuth";

/**
 * GET /api/secret/admins
 * List all admins with detailed auth metadata.
 */
export async function GET(req: Request) {
  try {
    await requireSecretAccess(req);

    const snapshot = await adminDb.collection("adminUsers").get();
    const admins: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      admins.push({
        id: doc.id,
        studentId: normalizeStudentId(data.studentId || doc.id),
        name: data.name || "Administrator",
        email: normalizeEmail(data.email || ""),
        uid: data.uid || "",
        permissionLevel: data.permissionLevel === "full" ? "full" : "standard",
        active: data.active !== false,
        createdBy: typeof data.createdBy === "object" && data.createdBy !== null
          ? (data.createdBy.studentId || data.createdBy.name || data.createdBy.email || "master")
          : String(data.createdBy || "master"),
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
        updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null,
      });
    });

    admins.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (a.permissionLevel !== b.permissionLevel) return a.permissionLevel === "full" ? -1 : 1;
      return a.studentId.localeCompare(b.studentId);
    });

    return NextResponse.json({ admins }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load admins" }, { status: error.status || 500 });
  }
}

/**
 * POST /api/secret/admins
 * Add an admin from master console.
 */
export async function POST(req: Request) {
  try {
    await requireSecretAccess(req);

    const body = await req.json().catch(() => ({}));
    const studentId = normalizeStudentId(body.studentId || "");
    const permissionLevel = body.permissionLevel === "full" ? "full" : "standard";
    const active = body.active !== undefined ? Boolean(body.active) : true;
    let name = (body.name || "").trim();
    let email = normalizeEmail(body.email || "");

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    const existingDoc = await adminDb.collection("adminUsers").doc(studentId).get();
    if (existingDoc.exists) {
      return NextResponse.json({ error: `Administrator '${studentId}' already exists.` }, { status: 409 });
    }

    // Try finding student record in students collection
    let uid = "";
    if (!name || !email) {
      const studentQuery = await adminDb.collection("students").where("studentId", "==", studentId).limit(1).get();
      if (!studentQuery.empty) {
        const stDoc = studentQuery.docs[0];
        const stData = stDoc.data() || {};
        name = name || stData.name || stData.fullName || "";
        email = email || normalizeEmail(stData.email || "");
        uid = stDoc.id;
      }
    }

    if (!name) name = `Admin (${studentId})`;

    const newAdmin = {
      studentId,
      name,
      email,
      uid,
      permissionLevel,
      active,
      createdBy: "master_secret",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection("adminUsers").doc(studentId).set(newAdmin);

    await recordAuditLog(
      { studentId: "MASTER_SECRET", name: "Master Admin" },
      "SECRET_CREATE_ADMIN",
      "adminUser",
      studentId,
      "success",
      { permissionLevel, active, name }
    ).catch(() => {});

    return NextResponse.json({ success: true, message: `Admin ${studentId} created.`, admin: newAdmin }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create admin" }, { status: error.status || 500 });
  }
}

/**
 * PUT /api/secret/admins
 * Update an admin from master console.
 */
export async function PUT(req: Request) {
  try {
    await requireSecretAccess(req);

    const body = await req.json().catch(() => ({}));
    const studentId = normalizeStudentId(body.studentId || "");

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    const docRef = adminDb.collection("adminUsers").doc(studentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: `Admin '${studentId}' not found.` }, { status: 404 });
    }

    const currentData = docSnap.data() || {};
    const currentIsActiveFullAdmin = currentData.permissionLevel === "full" && currentData.active !== false;

    const targetWillBeActive = body.active !== undefined ? Boolean(body.active) : currentData.active !== false;
    const targetWillBeFull = body.permissionLevel !== undefined ? body.permissionLevel === "full" : currentData.permissionLevel === "full";

    // Last Full Admin lockout guard
    if (currentIsActiveFullAdmin && (!targetWillBeActive || !targetWillBeFull)) {
      const fullAdminsSnap = await adminDb
        .collection("adminUsers")
        .where("permissionLevel", "==", "full")
        .where("active", "==", true)
        .get();

      if (fullAdminsSnap.size <= 1) {
        return NextResponse.json(
          { error: "Operation rejected: Cannot deactivate or demote the last remaining active Full Administrator." },
          { status: 400 }
        );
      }
    }

    const updatePayload: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.permissionLevel !== undefined) {
      updatePayload.permissionLevel = body.permissionLevel === "full" ? "full" : "standard";
    }
    if (body.active !== undefined) {
      updatePayload.active = Boolean(body.active);
    }
    if (body.name !== undefined && body.name.trim()) {
      updatePayload.name = body.name.trim();
    }
    if (body.email !== undefined) {
      updatePayload.email = normalizeEmail(body.email);
    }

    await docRef.update(updatePayload);

    await recordAuditLog(
      { studentId: "MASTER_SECRET", name: "Master Admin" },
      "SECRET_UPDATE_ADMIN",
      "adminUser",
      studentId,
      "success",
      { changes: updatePayload }
    ).catch(() => {});

    return NextResponse.json({ success: true, message: `Admin ${studentId} updated.` }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update admin" }, { status: error.status || 500 });
  }
}

/**
 * DELETE /api/secret/admins
 * Remove an admin from master console.
 */
export async function DELETE(req: Request) {
  try {
    await requireSecretAccess(req);

    const { searchParams } = new URL(req.url);
    const studentId = normalizeStudentId(searchParams.get("studentId") || "");

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    const docRef = adminDb.collection("adminUsers").doc(studentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: `Admin '${studentId}' not found.` }, { status: 404 });
    }

    const currentData = docSnap.data() || {};
    const currentIsActiveFullAdmin = currentData.permissionLevel === "full" && currentData.active !== false;

    if (currentIsActiveFullAdmin) {
      const fullAdminsSnap = await adminDb
        .collection("adminUsers")
        .where("permissionLevel", "==", "full")
        .where("active", "==", true)
        .get();

      if (fullAdminsSnap.size <= 1) {
        return NextResponse.json(
          { error: "Operation rejected: Cannot delete the last remaining active Full Administrator." },
          { status: 400 }
        );
      }
    }

    await docRef.delete();

    await recordAuditLog(
      { studentId: "MASTER_SECRET", name: "Master Admin" },
      "SECRET_DELETE_ADMIN",
      "adminUser",
      studentId,
      "success",
      { deletedAdmin: studentId }
    ).catch(() => {});

    return NextResponse.json({ success: true, message: `Admin ${studentId} removed.` }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete admin" }, { status: error.status || 500 });
  }
}
