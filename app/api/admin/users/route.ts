import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeStudentId, normalizeEmail, requireFullAdmin, recordAuditLog } from "@/lib/adminAuth";

/**
 * GET /api/admin/users
 * 
 * Lists authorized admin users or searches students for promotion.
 * Strictly requires Level 2 Full Admin.
 */
export async function GET(request: Request) {
  try {
    let admin = null;
    try {
      admin = await requireFullAdmin(request, { resourceType: "adminUser" });
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchStudentQuery = (searchParams.get("searchStudent") || "").trim();

    // If searching for eligible students to add as admin
    if (searchStudentQuery) {
      const q = searchStudentQuery.toLowerCase();
      const studentsSnap = await adminDb.collection("students").limit(100).get();
      const results: any[] = [];

      studentsSnap.forEach((doc) => {
        const data = doc.data() || {};
        const sId = (data.studentId || "").toLowerCase();
        const sEmail = (data.email || "").toLowerCase();
        const sName = (data.name || data.fullName || "").toLowerCase();

        if (sId.includes(q) || sEmail.includes(q) || sName.includes(q)) {
          results.push({
            uid: doc.id,
            studentId: normalizeStudentId(data.studentId || ""),
            name: data.name || data.fullName || "Student",
            email: normalizeEmail(data.email || ""),
          });
        }
      });

      return NextResponse.json({ students: results.slice(0, 10) }, { status: 200 });
    }

    // Default: List all admin users
    const adminSnap = await adminDb.collection("adminUsers").get();
    const admins: any[] = [];

    adminSnap.forEach((doc) => {
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
          ? (data.createdBy.studentId || data.createdBy.name || data.createdBy.email || "system")
          : String(data.createdBy || "system"),
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
        updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null,
      });
    });

    // Sort active first, then Full admins first, then alphabetically by studentId
    admins.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (a.permissionLevel !== b.permissionLevel) return a.permissionLevel === "full" ? -1 : 1;
      return a.studentId.localeCompare(b.studentId);
    });

    return NextResponse.json({ admins }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json({ error: "Failed to fetch admin users." }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * 
 * Adds a new administrator to adminUsers.
 * Strictly requires Level 2 Full Admin.
 */
export async function POST(request: Request) {
  try {
    let admin = null;
    try {
      admin = await requireFullAdmin(request, { resourceType: "adminUser" });
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await request.json().catch(() => ({}));
    const studentId = normalizeStudentId(body.studentId || "");
    const permissionLevel = body.permissionLevel === "full" ? "full" : "standard";
    const active = body.active !== undefined ? Boolean(body.active) : true;
    let name = (body.name || "").trim();
    let email = normalizeEmail(body.email || "");

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    // Check if admin already exists
    const existingDoc = await adminDb.collection("adminUsers").doc(studentId).get();
    if (existingDoc.exists) {
      return NextResponse.json(
        { error: `An administrator with Student ID '${studentId}' already exists.` },
        { status: 409 }
      );
    }

    // Also check by query in case doc ID differs
    const existingQuery = await adminDb
      .collection("adminUsers")
      .where("studentId", "==", studentId)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      return NextResponse.json(
        { error: `An administrator with Student ID '${studentId}' already exists.` },
        { status: 409 }
      );
    }

    // Try canonical student profile lookup if name or email missing
    let uid = "";
    if (!name || !email) {
      const studentQuery = await adminDb
        .collection("students")
        .where("studentId", "==", studentId)
        .limit(1)
        .get();

      if (!studentQuery.empty) {
        const stDoc = studentQuery.docs[0];
        const stData = stDoc.data() || {};
        name = name || stData.name || stData.fullName || "";
        email = email || normalizeEmail(stData.email || "");
        uid = stDoc.id;
      }
    }

    if (!name) {
      name = `Admin (${studentId})`;
    }

    const newAdminData = {
      studentId,
      name,
      email,
      uid,
      permissionLevel,
      active,
      createdBy: admin.studentId || admin.email || "full_admin",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection("adminUsers").doc(studentId).set(newAdminData);

    // Record audit log
    await recordAuditLog(admin, "CREATE_ADMIN", "adminUser", studentId, "success", {
      targetStudentId: studentId,
      name,
      permissionLevel,
      active,
    }).catch(() => {});

    return NextResponse.json(
      { success: true, message: `Administrator ${studentId} created successfully.`, admin: newAdminData },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json({ error: "Failed to create administrator." }, { status: 500 });
  }
}

/**
 * PUT /api/admin/users
 * 
 * Updates permission level, active status, or details for an administrator.
 * Strictly requires Level 2 Full Admin.
 * Protects against deactivating or demoting the last active Full Admin.
 */
export async function PUT(request: Request) {
  try {
    let admin = null;
    try {
      admin = await requireFullAdmin(request, { resourceType: "adminUser" });
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await request.json().catch(() => ({}));
    const studentId = normalizeStudentId(body.studentId || "");

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    // Locate admin document
    let targetDocRef = adminDb.collection("adminUsers").doc(studentId);
    let targetDocSnap = await targetDocRef.get();

    if (!targetDocSnap.exists) {
      const q = await adminDb.collection("adminUsers").where("studentId", "==", studentId).limit(1).get();
      if (q.empty) {
        return NextResponse.json({ error: `Administrator '${studentId}' not found.` }, { status: 404 });
      }
      targetDocRef = q.docs[0].ref;
      targetDocSnap = q.docs[0];
    }

    const currentData = targetDocSnap.data() || {};
    const currentIsActiveFullAdmin = currentData.permissionLevel === "full" && currentData.active !== false;

    // Check if this update would deactivate or demote an active Full Admin
    const targetWillBeActive = body.active !== undefined ? Boolean(body.active) : currentData.active !== false;
    const targetWillBeFull = body.permissionLevel !== undefined ? body.permissionLevel === "full" : currentData.permissionLevel === "full";

    if (currentIsActiveFullAdmin && (!targetWillBeActive || !targetWillBeFull)) {
      // Count total active Full Admins
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

    await targetDocRef.update(updatePayload);

    // Record audit log
    await recordAuditLog(admin, "UPDATE_ADMIN", "adminUser", studentId, "success", {
      targetStudentId: studentId,
      changes: {
        permissionLevel: updatePayload.permissionLevel,
        active: updatePayload.active,
        name: updatePayload.name,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: `Administrator ${studentId} updated successfully.` }, { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/admin/users error:", error);
    return NextResponse.json({ error: "Failed to update administrator." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users
 * 
 * Removes an administrator record.
 * Strictly requires Level 2 Full Admin.
 * Protects against deleting the last active Full Admin.
 */
export async function DELETE(request: Request) {
  try {
    let admin = null;
    try {
      admin = await requireFullAdmin(request, { resourceType: "adminUser" });
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    let studentId = normalizeStudentId(searchParams.get("studentId") || "");

    if (!studentId) {
      const body = await request.json().catch(() => ({}));
      studentId = normalizeStudentId(body.studentId || "");
    }

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    // Locate doc
    let targetDocRef = adminDb.collection("adminUsers").doc(studentId);
    let targetDocSnap = await targetDocRef.get();

    if (!targetDocSnap.exists) {
      const q = await adminDb.collection("adminUsers").where("studentId", "==", studentId).limit(1).get();
      if (q.empty) {
        return NextResponse.json({ error: `Administrator '${studentId}' not found.` }, { status: 404 });
      }
      targetDocRef = q.docs[0].ref;
      targetDocSnap = q.docs[0];
    }

    const currentData = targetDocSnap.data() || {};
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

    await targetDocRef.delete();

    // Record audit log
    await recordAuditLog(admin, "DELETE_ADMIN", "adminUser", studentId, "success", {
      targetStudentId: studentId,
      name: currentData.name,
      permissionLevel: currentData.permissionLevel,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: `Administrator ${studentId} removed successfully.` }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/admin/users error:", error);
    return NextResponse.json({ error: "Failed to delete administrator." }, { status: 500 });
  }
}
