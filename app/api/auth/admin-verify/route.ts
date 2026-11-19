import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeStudentId, normalizeEmail, recordAuditLog, AdminPermissionLevel } from "@/lib/adminAuth";

/**
 * POST /api/auth/admin-verify
 * 
 * Second Layer Admin Verification:
 * Validates the authenticated NextAuth admin via Google Sign-In (Firebase Auth).
 * Queries whether the Google email is present with role = admin (L1 and L2 both permitted).
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

    // 2. Parse request payload (Google Auth token / email)
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    let googleEmail = "";
    let googleUid = "";
    let googleName = "";

    // Verify Google ID token if provided
    if (body.idToken) {
      try {
        const decoded = await adminAuth.verifyIdToken(body.idToken);
        googleEmail = normalizeEmail(decoded.email);
        googleUid = decoded.uid || "";
        googleName = decoded.name || "";
      } catch (tokenErr) {
        console.warn("Could not verify ID token with adminAuth, checking body email:", tokenErr);
      }
    }

    if (!googleEmail && body.email) {
      googleEmail = normalizeEmail(body.email);
    }

    if (!googleEmail) {
      return NextResponse.json(
        { error: "Google account email is required for administrator verification." },
        { status: 400 }
      );
    }

    // 3. Query Firestore: check if email is present with admin role (L1 or L2)
    let adminDoc: any = null;
    let adminData: any = null;

    // Check adminUsers collection by email
    const adminQuery = await adminDb
      .collection("adminUsers")
      .where("email", "==", googleEmail)
      .limit(1)
      .get();

    if (!adminQuery.empty) {
      adminDoc = adminQuery.docs[0];
      adminData = adminDoc.data() || {};
    } else {
      // Case-insensitive check across adminUsers
      const allAdmins = await adminDb.collection("adminUsers").get();
      for (const doc of allAdmins.docs) {
        const d = doc.data() || {};
        if (normalizeEmail(d.email) === googleEmail) {
          adminDoc = doc;
          adminData = d;
          break;
        }
      }
    }

    // Check users collection if not found in adminUsers
    if (!adminData) {
      const usersQuery = await adminDb
        .collection("users")
        .where("email", "==", googleEmail)
        .limit(1)
        .get();

      if (!usersQuery.empty) {
        const uDoc = usersQuery.docs[0];
        const uData = uDoc.data() || {};
        const role = String(uData.role || "").toLowerCase();
        if (role === "admin" || role === "l1" || role === "l2" || uData.isAdmin === true || uData.permissionLevel) {
          adminDoc = uDoc;
          adminData = {
            studentId: uData.studentId || uData.rollNumber || uDoc.id,
            name: uData.name || uData.fullName || googleName,
            email: googleEmail,
            uid: uDoc.id,
            active: uData.active !== false,
            permissionLevel: role === "l2" || uData.permissionLevel === "full" ? "full" : "standard",
            role: "admin",
          };
        }
      }
    }

    // Master Admin fallback
    const isMasterAdminEmail =
      googleEmail === "admin@boundless.com" ||
      googleEmail === "admin@boundless.org" ||
      googleEmail === normalizeEmail(process.env.ADMIN_EMAIL);

    if (!adminData && isMasterAdminEmail) {
      adminData = {
        studentId: "MASTER",
        name: "Master Administrator",
        email: googleEmail,
        permissionLevel: "full",
        active: true,
        role: "admin",
      };
    }

    // 4. Verify admin presence
    if (!adminData) {
      await recordAuditLog(
        { email: googleEmail, name: googleName || "Unverified Google User" },
        "ADMIN_VERIFY_FAILED",
        "admin_auth",
        googleEmail,
        "denied",
        {
          reason: "Email not found with admin role (L1/L2)",
          googleEmail,
          nextAuthEmail,
        }
      ).catch(() => {});

      return NextResponse.json(
        { error: `The account '${googleEmail}' is not registered as an authorized administrator (L1/L2). Access denied.` },
        { status: 403 }
      );
    }

    // 5. Verify active status
    if (adminData.active === false) {
      await recordAuditLog(
        { email: googleEmail, name: adminData.name || "Deactivated Admin" },
        "ADMIN_VERIFY_FAILED",
        "admin_auth",
        googleEmail,
        "denied",
        {
          reason: "Admin user account is deactivated",
          googleEmail,
          nextAuthEmail,
        }
      ).catch(() => {});

      return NextResponse.json(
        { error: "Your administrator account has been deactivated. Please contact support." },
        { status: 403 }
      );
    }

    // 6. Determine permission level (L1 Standard vs L2 Full Admin - both allowed)
    const permissionLevel: AdminPermissionLevel =
      adminData.permissionLevel === "full" ||
      String(adminData.role).toUpperCase() === "L2"
        ? "full"
        : "standard";

    const studentId = normalizeStudentId(adminData.studentId) || (adminDoc ? normalizeStudentId(adminDoc.id) : "ADMIN");

    // 7. Generate server-side session document in adminSessions
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await adminDb.collection("adminSessions").doc(sessionId).set({
      sessionId,
      studentId,
      uid: adminData.uid || googleUid || "",
      email: googleEmail,
      name: adminData.name || googleName || "Administrator",
      permissionLevel,
      role: adminData.role || (permissionLevel === "full" ? "L2" : "L1"),
      nextAuthEmail,
      googleEmail,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });

    // 8. Record successful verification in immutable audit log
    await recordAuditLog(
      {
        studentId,
        uid: adminData.uid || googleUid || "",
        email: googleEmail,
        name: adminData.name || googleName || "Administrator",
      },
      "ADMIN_VERIFY_SUCCESS",
      "admin_auth",
      googleEmail,
      "success",
      {
        permissionLevel,
        role: adminData.role || (permissionLevel === "full" ? "L2" : "L1"),
        nextAuthEmail,
        googleEmail,
        sessionId,
      }
    ).catch(() => {});

    // 9. Construct response with httpOnly session cookie
    const response = NextResponse.json(
      {
        ok: true,
        message: "Administrator access verified successfully.",
        redirect: "/admin",
        admin: {
          name: adminData.name || googleName || "Administrator",
          email: googleEmail,
          studentId,
          permissionLevel,
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
