import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getSecretSession, requireSecretAccess, recordAuditLog } from "@/lib/adminAuth";

/**
 * GET /api/secret/auth
 * Check if the caller has an active /secret session.
 */
export async function GET(req: Request) {
  try {
    const session = await getSecretSession(req);
    return NextResponse.json({ authenticated: session.authenticated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}

/**
 * POST /api/secret/auth
 * Authenticate against systemConfig/adminAccess or update master credentials.
 * Zero hardcoding. Zero hashing.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, username, password, newUsername, newPassword } = body;

    // Sub-action: Change master credentials
    if (action === "change_credentials") {
      await requireSecretAccess(req);

      if (!newUsername || !newPassword || typeof newUsername !== "string" || typeof newPassword !== "string") {
        return NextResponse.json(
          { error: "New username and new password are required." },
          { status: 400 }
        );
      }

      if (newUsername.trim().length < 3 || newPassword.trim().length < 4) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters and password at least 4 characters." },
          { status: 400 }
        );
      }

      await adminDb.collection("systemConfig").doc("adminAccess").set(
        {
          username: newUsername.trim(),
          password: newPassword.trim(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await recordAuditLog(
        { studentId: "MASTER_SECRET", name: "Master Console" },
        "SECRET_CREDENTIALS_UPDATED",
        "system_config",
        "adminAccess",
        "success",
        { updatedUser: newUsername.trim() }
      ).catch(() => {});

      return NextResponse.json(
        { success: true, message: "Master credentials updated successfully." },
        { status: 200 }
      );
    }

    // Default action: Master Login
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    // Read authoritative master credentials from systemConfig/adminAccess
    const configDoc = await adminDb.collection("systemConfig").doc("adminAccess").get();
    if (!configDoc.exists) {
      return NextResponse.json(
        { error: "System configuration not initialized. Please seed adminAccess record first." },
        { status: 500 }
      );
    }

    const configData = configDoc.data() || {};
    const validUsername = String(configData.username || "").trim();
    const validPassword = String(configData.password || "").trim();

    // Verification - ZERO HASHING RULE strictly observed
    const submittedUsername = String(username).trim();
    const submittedPassword = String(password).trim();

    if (submittedUsername !== validUsername || submittedPassword !== validPassword) {
      await recordAuditLog(
        { studentId: "UNVERIFIED", name: "Anonymous" },
        "SECRET_LOGIN_FAILED",
        "secret_auth",
        submittedUsername,
        "denied",
        { attemptedUsername: submittedUsername }
      ).catch(() => {});

      return NextResponse.json(
        { error: "Invalid master credentials." },
        { status: 401 }
      );
    }

    // Generate session token - UUID, zero hashing
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await adminDb.collection("secretSessions").doc(sessionId).set({
      username: submittedUsername,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });

    await recordAuditLog(
      { studentId: "MASTER_SECRET", name: "Master Admin" },
      "SECRET_LOGIN_SUCCESS",
      "secret_auth",
      submittedUsername,
      "success"
    ).catch(() => {});

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("boundless_secret_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json(
      { success: true, message: "Secret access granted.", sessionId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("POST /api/secret/auth error:", error);
    return NextResponse.json({ error: error.message || "Authentication failed." }, { status: 500 });
  }
}

/**
 * DELETE /api/secret/auth
 * Logout and invalidate secret session.
 */
export async function DELETE(req: Request) {
  try {
    const session = await getSecretSession(req);
    if (session.sessionId) {
      await adminDb.collection("secretSessions").doc(session.sessionId).delete().catch(() => {});
    }

    const cookieStore = await cookies();
    cookieStore.set("boundless_secret_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return NextResponse.json({ success: true, message: "Logged out from secret console." }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to log out." }, { status: 500 });
  }
}
