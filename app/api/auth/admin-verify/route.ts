import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeStudentId, normalizeEmail, recordAuditLog } from "@/lib/adminAuth";

/**
 * POST /api/auth/admin-verify
 * 
 * Second Layer Admin Verification:
 * Validates the authenticated NextAuth admin's registered Student ID against adminUsers.
 * Zero-trust: Never trusts client-provided UID, email, or role.
 * Zero hashing: Uses standard UUID-keyed server session.
 */
export async function POST(req: Request) {
  try {
    // 1. Verify primary NextAuth session
    const nextAuthSession: any = await getServerSession(authOptions as any);
    if (!nextAuthSession?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in with admin credentials first." },
        { status: 401 }
      );
    }

    const nextAuthEmail = normalizeEmail(nextAuthSession.user.email);

    // 2. Parse submitted Student ID
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const rawStudentId = body.studentId;
    const studentId = normalizeStudentId(rawStudentId);

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required for administrator verification." },
        { status: 400 }
      );
    }

    // 3. Query adminUsers collection for active authorized record
    const adminQuery = await adminDb
      .collection("adminUsers")
      .where("studentId", "==", studentId)
      .limit(1)
      .get();

    if (adminQuery.empty) {
      await recordAuditLog(
        { studentId, email: nextAuthEmail, name: "Unverified Admin" },
        "ADMIN_VERIFY_FAILED",
        "admin_auth",
        studentId,
        "denied",
        {
          reason: "Student ID not found in adminUsers",
          attemptedStudentId: studentId,
          nextAuthEmail,
        }
      ).catch(() => {});

      return NextResponse.json(
        { error: "Your Student ID is not authorized for admin access." },
        { status: 403 }
      );
    }

    const adminDoc = adminQuery.docs[0];
    const adminData = adminDoc.data() || {};

    // 4. Verify Active status
    if (adminData.active !== true) {
      await recordAuditLog(
        { studentId, email: adminData.email || nextAuthEmail, name: adminData.name || "Deactivated Admin" },
        "ADMIN_VERIFY_FAILED",
        "admin_auth",
        studentId,
        "denied",
        {
          reason: "Admin user account is deactivated",
          studentId,
          nextAuthEmail,
        }
      ).catch(() => {});

      return NextResponse.json(
        { error: "Your Student ID is not authorized for admin access." },
        { status: 403 }
      );
    }

    // 5. Verify identity correspondence
    const canonicalEmail = normalizeEmail(adminData.email);
    const isMasterAdminEmail =
      nextAuthEmail === "admin@boundless.com" ||
      nextAuthEmail === "admin@boundless.org" ||
      nextAuthEmail === normalizeEmail(process.env.ADMIN_EMAIL);

    if (!isMasterAdminEmail && canonicalEmail && canonicalEmail !== nextAuthEmail) {
      await recordAuditLog(
        { studentId, email: nextAuthEmail, name: adminData.name },
        "ADMIN_VERIFY_IDENTITY_MISMATCH",
        "admin_auth",
        studentId,
        "denied",
        {
          reason: "NextAuth email does not match registered student email for this Student ID",
          studentId,
          nextAuthEmail,
          registeredEmail: canonicalEmail,
        }
      ).catch(() => {});

      return NextResponse.json(
        { error: "Your Student ID is not authorized for admin access." },
        { status: 403 }
      );
    }

    // 6. Generate server-side session document in adminSessions (Zero hashing)
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await adminDb.collection("adminSessions").doc(sessionId).set({
      sessionId,
      studentId,
      uid: adminData.uid || "",
      email: canonicalEmail || nextAuthEmail,
      name: adminData.name || "Administrator",
      permissionLevel: adminData.permissionLevel === "full" ? "full" : "standard",
      nextAuthEmail,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });

    // 7. Record successful verification in immutable audit log
    await recordAuditLog(
      {
        studentId,
        uid: adminData.uid || "",
        email: canonicalEmail || nextAuthEmail,
        name: adminData.name || "Administrator",
      },
      "ADMIN_VERIFY_SUCCESS",
      "admin_auth",
      studentId,
      "success",
      {
        permissionLevel: adminData.permissionLevel,
        nextAuthEmail,
        sessionId,
      }
    ).catch(() => {});

    // 8. Construct response with httpOnly cookie
    const response = NextResponse.json(
      {
        ok: true,
        message: "Administrator access verified successfully.",
        redirect: "/admin",
        admin: {
          name: adminData.name,
          studentId,
          permissionLevel: adminData.permissionLevel,
        },
      },
      { status: 200 }
    );

    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set("boundless_admin_session", sessionId, {
      path: "/",
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error("Admin verification error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during admin verification." },
      { status: 500 }
    );
  }
}
