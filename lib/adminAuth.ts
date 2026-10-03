import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export type AdminPermissionLevel = "standard" | "full";

export interface AdminContext {
  authenticated: boolean;
  studentId: string;
  uid: string;
  email: string;
  name: string;
  permissionLevel: AdminPermissionLevel;
  active: boolean;
  sessionId?: string;
  nextAuthEmail?: string;
}

export interface AdminAuthResult {
  ok: boolean;
  status: number;
  error?: string;
  admin?: AdminContext;
}

export interface AuditLogPayload {
  action: string;
  resourceType: string;
  resourceId: string;
  result: "success" | "denied" | "failed";
  metadata?: Record<string, any>;
}

/**
 * Normalizes Student ID to uppercase and trims whitespace.
 * Strict zero-hashing rule observed.
 */
export function normalizeStudentId(id?: string | null): string {
  if (!id || typeof id !== "string") return "";
  return id.toUpperCase().trim();
}

/**
 * Normalizes email to lowercase and trims whitespace.
 * Strict zero-hashing rule observed.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email || typeof email !== "string") return "";
  return email.toLowerCase().trim();
}

/**
 * Extract the admin session cookie from a Request or Next.js cookies context.
 */
async function extractAdminSessionId(req?: Request): Promise<string> {
  // 1. Try reading from Request headers
  if (req) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/boundless_admin_session=([^;]+)/);
    if (match) return match[1].trim();

    // Support bearer session id for programmatic testing
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Session ")) {
      return authHeader.substring(8).trim();
    }
  }

  // 2. Try Next.js cookies() API
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("boundless_admin_session");
    if (sessionCookie?.value) {
      return sessionCookie.value.trim();
    }
  } catch {
    // cookies() unavailable in some execution contexts
  }

  return "";
}

/**
 * Authoritatively verify admin access on the server.
 * Requires:
 * 1. Active NextAuth admin session.
 * 2. Active second-factor adminSessions document in Firestore.
 * 3. Real-time active status in adminUsers (active === true).
 * 
 * Never trusts the client for identity, roles, or authorization.
 */
export async function getAdminAccess(req?: Request): Promise<AdminAuthResult> {
  try {
    // Step 1: Validate NextAuth session
    let nextAuthSession: any = null;
    try {
      nextAuthSession = await getServerSession(authOptions as any);
    } catch {
      nextAuthSession = null;
    }
    if (!nextAuthSession?.user?.email) {
      return {
        ok: false,
        status: 401,
        error: "Unauthorized: Administrator session required.",
      };
    }

    const nextAuthEmail = normalizeEmail(nextAuthSession.user.email);

    // Step 2: Validate second-layer verification session from Firestore
    const sessionId = await extractAdminSessionId(req);
    if (!sessionId) {
      return {
        ok: false,
        status: 401,
        error: "Unverified: Student ID verification required.",
      };
    }

    const sessionDoc = await adminDb.collection("adminSessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return {
        ok: false,
        status: 401,
        error: "Session expired or invalid. Please re-verify admin access.",
      };
    }

    const sessionData = sessionDoc.data() || {};

    // Check expiration
    if (sessionData.expiresAt) {
      const expDate = sessionData.expiresAt.toDate ? sessionData.expiresAt.toDate() : new Date(sessionData.expiresAt);
      if (expDate.getTime() < Date.now()) {
        await adminDb.collection("adminSessions").doc(sessionId).delete().catch(() => {});
        return {
          ok: false,
          status: 401,
          error: "Admin verification session expired. Please re-verify.",
        };
      }
    }

    const sessionStudentId = normalizeStudentId(sessionData.studentId);
    if (!sessionStudentId) {
      return {
        ok: false,
        status: 401,
        error: "Corrupt admin session.",
      };
    }

    // Step 3: Re-query adminUsers in real time from database
    // Ensures immediate access revocation if active === false or record is removed
    const adminUserQuery = await adminDb
      .collection("adminUsers")
      .where("studentId", "==", sessionStudentId)
      .limit(1)
      .get();

    if (adminUserQuery.empty) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden: Admin user record not found or revoked.",
      };
    }

    const adminUserDoc = adminUserQuery.docs[0];
    const adminUserData = adminUserDoc.data() || {};

    // Strict active check
    if (adminUserData.active !== true) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden: Admin account has been deactivated. Please contact an administrator.",
      };
    }

    const permissionLevel: AdminPermissionLevel =
      adminUserData.permissionLevel === "full" ? "full" : "standard";

    const adminContext: AdminContext = {
      authenticated: true,
      studentId: sessionStudentId,
      uid: adminUserData.uid || sessionData.uid || "",
      email: normalizeEmail(adminUserData.email || sessionData.email || nextAuthEmail),
      name: adminUserData.name || sessionData.name || "Administrator",
      permissionLevel,
      active: true,
      sessionId,
      nextAuthEmail,
    };

    return {
      ok: true,
      status: 200,
      admin: adminContext,
    };
  } catch (err: any) {
    if (err?.digest === "DYNAMIC_SERVER_USAGE" || err?.message?.includes("Dynamic server usage")) {
      throw err;
    }
    console.error("Error in getAdminAccess:", err);
    return {
      ok: false,
      status: 500,
      error: "Internal server error during authorization check.",
    };
  }
}

/**
 * Centralized gate for Standard Admin operations (Level 1 & Level 2).
 */
export async function requireAdmin(req?: Request): Promise<AdminContext> {
  const result = await getAdminAccess(req);
  if (!result.ok || !result.admin) {
    const error: any = new Error(result.error || "Administrator access required.");
    error.status = result.status || 401;
    throw error;
  }
  return result.admin;
}

/**
 * Centralized gate for Full Admin operations (Level 2 only).
 * Automatically logs an access denied audit record if attempted by Level 1.
 */
export async function requireFullAdmin(
  req?: Request,
  resourceContext?: { resourceType?: string; resourceId?: string }
): Promise<AdminContext> {
  const result = await getAdminAccess(req);

  if (!result.ok || !result.admin) {
    const error: any = new Error(result.error || "Administrator access required.");
    error.status = result.status || 401;
    throw error;
  }

  const admin = result.admin;

  if (admin.permissionLevel !== "full") {
    // Record unauthorized attempt in audit log
    await recordAuditLog(
      admin,
      "ACCESS_DENIED_FULL_ADMIN_REQUIRED",
      resourceContext?.resourceType || "admin_restricted_section",
      resourceContext?.resourceId || (req?.url ? new URL(req.url, "http://localhost").pathname : "unknown"),
      "denied",
      {
        requestedUrl: req?.url || "",
        currentPermissionLevel: admin.permissionLevel,
        message: "Attempted to access Level 2 Full Admin feature with Level 1 Standard Admin privileges.",
      }
    ).catch(() => {});

    const error: any = new Error("Forbidden: Full Administrator privileges required.");
    error.status = 403;
    throw error;
  }

  return admin;
}

/**
 * Immutable audit logging function.
 * Appends a tamper-proof record to adminAuditLogs.
 * Normal admins cannot modify or delete these logs.
 */
export async function recordAuditLog(
  actor: AdminContext | { studentId?: string; uid?: string; email?: string; name?: string } | null,
  action: string,
  resourceType: string,
  resourceId: string,
  result: "success" | "denied" | "failed",
  metadata?: Record<string, any>
): Promise<string> {
  try {
    const sanitizedMetadata: Record<string, any> = {};

    if (metadata && typeof metadata === "object") {
      for (const [k, v] of Object.entries(metadata)) {
        // Strip sensitive keys
        const lowerKey = k.toLowerCase();
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("token") ||
          lowerKey.includes("privatekey") ||
          lowerKey.includes("apikey")
        ) {
          sanitizedMetadata[k] = "[REDACTED]";
        } else if (v !== undefined) {
          sanitizedMetadata[k] = v;
        }
      }
    }

    const logEntry = {
      actorStudentId: actor?.studentId || "SYSTEM",
      actorUid: actor?.uid || "SYSTEM",
      actorEmail: actor?.email || "system@boundlesssociety.in",
      actorName: actor?.name || "System Operation",
      action: action.toUpperCase().trim(),
      resourceType: resourceType.toLowerCase().trim(),
      resourceId: String(resourceId || "").trim(),
      timestamp: FieldValue.serverTimestamp(),
      result,
      metadata: sanitizedMetadata,
    };

    const docRef = await adminDb.collection("adminAuditLogs").add(logEntry);
    return docRef.id;
  } catch (err) {
    console.error("CRITICAL: Failed to write to adminAuditLogs:", err);
    return "";
  }
}

/**
 * Verify /secret page session from secretSessions collection.
 */
export async function getSecretSession(req?: Request): Promise<{ authenticated: boolean; sessionId?: string }> {
  try {
    let sessionId = "";

    if (req) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/boundless_secret_session=([^;]+)/);
      if (match) sessionId = match[1].trim();

      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      if (authHeader.startsWith("SecretSession ")) {
        sessionId = authHeader.substring(14).trim();
      }
    }

    if (!sessionId) {
      try {
        const cookieStore = await cookies();
        const cookie = cookieStore.get("boundless_secret_session");
        if (cookie?.value) sessionId = cookie.value.trim();
      } catch {}
    }

    if (!sessionId) return { authenticated: false };

    const doc = await adminDb.collection("secretSessions").doc(sessionId).get();
    if (!doc.exists) return { authenticated: false };

    const data = doc.data() || {};
    if (data.expiresAt) {
      const expDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      if (expDate.getTime() < Date.now()) {
        await adminDb.collection("secretSessions").doc(sessionId).delete().catch(() => {});
        return { authenticated: false };
      }
    }

    return { authenticated: true, sessionId };
  } catch (err: any) {
    if (err?.digest === "DYNAMIC_SERVER_USAGE" || err?.message?.includes("Dynamic server usage")) {
      throw err;
    }
    console.error("Error checking secret session:", err);
    return { authenticated: false };
  }
}

/**
 * Enforce authentication for /secret API endpoints.
 */
export async function requireSecretAccess(req?: Request): Promise<void> {
  const session = await getSecretSession(req);
  if (!session.authenticated) {
    const error: any = new Error("Unauthorized: Secret administrative session required.");
    error.status = 401;
    throw error;
  }
}
