import { NextResponse } from "next/server";
import { requireAdmin, requireFullAdmin, recordAuditLog } from "@/lib/adminAuth";
import { getStudentWithTripHistory } from "@/lib/studentDirectory";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/students/[uid]
 * 
 * Fetches complete student profile along with their full Boundless trip history.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    try {
      await requireAdmin(request);
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Unauthorized access." }, { status: authErr.status || 401 });
    }

    const { uid } = await params;
    if (!uid) {
      return NextResponse.json({ error: "Missing student UID" }, { status: 400 });
    }

    const profileData = await getStudentWithTripHistory(uid);
    if (!profileData) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(profileData, {
      status: 200,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error: any) {
    console.error("GET /api/admin/students/[uid] error:", error);
    return NextResponse.json({ error: "Failed to fetch student profile and history." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/students/[uid]
 * 
 * Updates student verification or profile fields. Requires Full Admin privileges.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    let admin = null;
    try {
      admin = await requireFullAdmin(request, { resourceType: "student" });
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Full Administrator access required." }, { status: authErr.status || 401 });
    }

    const { uid } = await params;
    if (!uid) {
      return NextResponse.json({ error: "Missing student UID" }, { status: 400 });
    }

    const body = await request.json();
    const { studentIdVerified, notes } = body;

    const studentRef = adminDb.collection("students").doc(uid);
    const existingSnap = await studentRef.get();

    if (!existingSnap.exists) {
      return NextResponse.json({ error: "Student document not found." }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (studentIdVerified !== undefined) {
      updates.studentIdVerified = Boolean(studentIdVerified);
    }

    if (notes !== undefined) {
      updates.adminNotes = String(notes || "").trim();
    }

    await studentRef.update(updates);

    await recordAuditLog(
      admin,
      studentIdVerified !== undefined ? (studentIdVerified ? "VERIFY_STUDENT_ID" : "UNVERIFY_STUDENT_ID") : "UPDATE_STUDENT_PROFILE",
      "student",
      uid,
      "success",
      {
        studentEmail: existingSnap.data()?.email,
        studentId: existingSnap.data()?.studentId,
        studentName: existingSnap.data()?.name,
        changedFields: Object.keys(updates),
      }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Student profile updated successfully.",
      updates,
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/students/[uid] error:", error);
    return NextResponse.json({ error: "Failed to update student profile." }, { status: 500 });
  }
}
