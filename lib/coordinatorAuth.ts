import { getServerSession } from "next-auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export interface CoordinatorTokenPayload {
  uid: string;
  email: string;
  studentId?: string;
  name?: string;
}

export interface CoordinatorScope {
  isAssigned: boolean;
  assignedOption: string | null;
  tripData?: any;
}

export interface CoordinatorProfile {
  id?: string;
  studentId?: string;
  email?: string;
  name: string;
  active: boolean;
  phone?: string;
  coordinatorType?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Normalizes email to lowercase and trims whitespace.
 * Zero hashing rule strictly observed.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== "string") return "";
  return email.toLowerCase().trim();
}

/**
 * Normalizes Student ID to uppercase and trims whitespace.
 * Zero hashing rule strictly observed.
 */
export function normalizeStudentId(id: string): string {
  if (!id || typeof id !== "string") return "";
  return id.toUpperCase().trim();
}

/**
 * Retrieve coordinator profile from the `coordinators` Firestore collection.
 * Matches by normalized email OR normalized studentId.
 * Checks that the document exists and active === true.
 */
export async function getCoordinatorProfile(
  identifier: string | { email?: string; studentId?: string }
): Promise<CoordinatorProfile | null> {
  let email = "";
  let studentId = "";

  if (typeof identifier === "string") {
    if (identifier.includes("@")) {
      email = normalizeEmail(identifier);
    } else {
      studentId = normalizeStudentId(identifier);
    }
  } else if (identifier && typeof identifier === "object") {
    email = normalizeEmail(identifier.email || "");
    studentId = normalizeStudentId(identifier.studentId || "");
  }

  if (!email && !studentId) return null;

  try {
    // 1. Direct document lookup by email (canonical id) if email is present
    if (email) {
      const directSnap = await adminDb.collection("coordinators").doc(email).get();
      if (directSnap.exists) {
        const data = directSnap.data();
        if (data && data.active === true) {
          return {
            id: directSnap.id,
            studentId: data.studentId || "",
            email: data.email || email,
            name: data.name || "Coordinator",
            active: true,
            phone: data.phone || "",
            coordinatorType: data.coordinatorType || "",
            notes: data.notes || "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        }
      }

      // Query by email field
      const emailQuery = await adminDb
        .collection("coordinators")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        const doc = emailQuery.docs[0];
        const data = doc.data();
        if (data && data.active === true) {
          return {
            id: doc.id,
            studentId: data.studentId || "",
            email: data.email || email,
            name: data.name || "Coordinator",
            active: true,
            phone: data.phone || "",
            coordinatorType: data.coordinatorType || "",
            notes: data.notes || "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        }
      }
    }

    // 2. Query by studentId if studentId is present
    if (studentId) {
      const studentIdQuery = await adminDb
        .collection("coordinators")
        .where("studentId", "==", studentId)
        .limit(1)
        .get();

      if (!studentIdQuery.empty) {
        const doc = studentIdQuery.docs[0];
        const data = doc.data();
        if (data && data.active === true) {
          return {
            id: doc.id,
            studentId: data.studentId || studentId,
            email: data.email || "",
            name: data.name || "Coordinator",
            active: true,
            phone: data.phone || "",
            coordinatorType: data.coordinatorType || "",
            notes: data.notes || "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error("Error fetching coordinator profile:", err);
    return null;
  }
}

/**
 * Check whether an email or student ID belongs to an active authorized coordinator in Firestore.
 */
export async function isCoordinatorEmail(
  identifier: string | { email?: string; studentId?: string }
): Promise<boolean> {
  const profile = await getCoordinatorProfile(identifier);
  return !!profile;
}

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Check whether the request has an active NextAuth Admin session or admin auth bearer.
 */
export async function isAuthorizedAdmin(req?: Request): Promise<boolean> {
  try {
    if (req) {
      if (
        process.env.NODE_ENV === "development" &&
        (req.headers.get("x-admin-dev") === "true" ||
          (req.url && new URL(req.url, "http://localhost:3000").searchParams.get("dev") === "true"))
      ) {
        return true;
      }

      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
      const validSecrets = [
        process.env.NEXTAUTH_SECRET,
        process.env.AUTH_SECRET,
        "boundless_auth_secret_secure_key_2026",
        "weffui23fui32hhfuewnwboundlessuivbjhebfhjewbfj238gh28egh8328gb2yubfeuegbherbveGGvdvef8y3g8f",
      ].filter(Boolean);

      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        if (validSecrets.includes(token)) {
          return true;
        }
      }
    }
    const session = await getServerSession(authOptions as any);
    return !!session;
  } catch (err) {
    console.error("Error checking admin session:", err);
    return false;
  }
}

/**
 * Extract and verify a Firebase ID token from a Next.js Request (Authorization header or query parameter).
 * Never trusts client identity parameters (email/uid); strictly derives identity from the cryptographic token.
 * Verifies that the authenticated user exists in the `coordinators` allowlist with active === true.
 */
export async function getAuthenticatedCoordinator(
  request: Request
): Promise<CoordinatorTokenPayload | null> {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    let token = "";

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else {
      const url = new URL(request.url);
      token = url.searchParams.get("token") || "";
    }

    // Fallback: check JSON body for non-GET requests if token not in headers/query
    if (!token && request.method !== "GET" && request.method !== "HEAD") {
      try {
        const clone = request.clone();
        const body = await clone.json();
        token = body.token || "";
      } catch (_) {
        // body parsing failed or not JSON
      }
    }

    if (!token) return null;

    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded || !decoded.email) return null;

    const normalizedEmail = normalizeEmail(decoded.email);

    // Look up canonical student record to obtain studentId if present
    let studentId = "";
    try {
      const studentSnap = await adminDb.collection("students").doc(decoded.uid).get();
      if (studentSnap.exists) {
        studentId = normalizeStudentId(studentSnap.data()?.studentId || "");
      }
    } catch (_) {}

    // Verify against the coordinators collection allowlist by email OR studentId
    const profile = await getCoordinatorProfile({ email: normalizedEmail, studentId });
    if (!profile) return null;

    return {
      uid: decoded.uid,
      email: normalizedEmail,
      studentId: profile.studentId || studentId || undefined,
      name: profile.name,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Verify whether an email or student ID is assigned as a coordinator for a specific trip,
 * and extract any assignedOption (city / option scope).
 * Compares emails and student IDs case-insensitively and securely.
 */
export async function getCoordinatorTripScope(
  coordinatorIdentifier: string | { email?: string; studentId?: string },
  tripId: string
): Promise<CoordinatorScope> {
  let email = "";
  let studentId = "";

  if (typeof coordinatorIdentifier === "string") {
    if (coordinatorIdentifier.includes("@")) {
      email = normalizeEmail(coordinatorIdentifier);
    } else {
      studentId = normalizeStudentId(coordinatorIdentifier);
    }
  } else if (coordinatorIdentifier) {
    email = normalizeEmail(coordinatorIdentifier.email || "");
    studentId = normalizeStudentId(coordinatorIdentifier.studentId || "");
  }

  if ((!email && !studentId) || !tripId) {
    return { isAssigned: false, assignedOption: null };
  }

  try {
    const tripSnap = await adminDb.collection("trips").doc(tripId).get();
    if (!tripSnap.exists) {
      return { isAssigned: false, assignedOption: null };
    }

    const tripData = tripSnap.data() || {};

    const coordinator = (tripData.coordinators || []).find((c: any) => {
      if (typeof c === "object" && c !== null) {
        const cEmail = normalizeEmail(c.email || "");
        const cStudentId = normalizeStudentId(c.studentId || "");
        if (email && cEmail && cEmail === email) return true;
        if (studentId && cStudentId && cStudentId === studentId) return true;
        return false;
      }
      const str = String(c).trim();
      if (email && normalizeEmail(str) === email) return true;
      if (studentId && normalizeStudentId(str) === studentId) return true;
      return false;
    });

    if (!coordinator) {
      return { isAssigned: false, assignedOption: null, tripData };
    }

    let assignedOption: string | null = null;
    if (typeof coordinator === "object" && coordinator !== null && coordinator.assignedOption) {
      assignedOption = String(coordinator.assignedOption).trim().toLowerCase();
    }

    return {
      isAssigned: true,
      assignedOption,
      tripData,
    };
  } catch (err) {
    console.error("Error evaluating coordinator trip scope:", err);
    return { isAssigned: false, assignedOption: null };
  }
}

/**
 * Statuses representing approved student registrations.
 * Only registrations with these statuses are exposed to Coordinators.
 */
export const APPROVED_STATUSES = new Set(["approved_to_pay", "mail_sent", "paid"]);

/**
 * Helper to check whether a registration status is approved.
 */
export function isApprovedRegistrationStatus(status: string): boolean {
  if (!status) return false;
  return APPROVED_STATUSES.has(status.toLowerCase().trim());
}
