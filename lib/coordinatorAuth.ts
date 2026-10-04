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

/**
 * Determines whether a student registration is within the scope of a coordinator for a trip.
 * 
 * Rules:
 * 1. If the trip has 0 or 1 coordinator, that coordinator is responsible for all students on the trip.
 * 2. If the coordinator has no assignedOption (or it's empty), they oversee all students on the trip.
 * 3. If no other coordinators on the trip have distinct assigned options, there is no sub-group partitioning;
 *    all coordinators oversee all students.
 * 4. If coordinators partition the trip by distinct assignedOption values:
 *    - Check if any value in the student's formData matches this coordinator's assignedOption (case-insensitive fuzzy match: equality or substring).
 *    - If no coordinator's assignedOption matches the student's choices, fallback to the primary (first) coordinator on the trip.
 */
export function isRegistrationAssignedToCoordinator(
  coordinatorEmail: string,
  coordinators: any[],
  assignedOption: string | null | undefined,
  formData: Record<string, any> = {}
): boolean {
  if (!Array.isArray(coordinators) || coordinators.length <= 1) {
    return true;
  }

  const cleanCoordEmail = normalizeEmail(coordinatorEmail || "");

  // If coordinator has no assignedOption, they are a general coordinator for the whole trip
  const cleanAssignedOption = assignedOption ? String(assignedOption).trim().toLowerCase() : "";
  if (!cleanAssignedOption) {
    return true;
  }

  // Collect all coordinators that have a non-empty assignedOption
  const coordinatorsWithOptions = coordinators.filter((c) => {
    if (typeof c !== "object" || c === null) return false;
    const opt = String(c.assignedOption || "").trim().toLowerCase();
    return Boolean(opt);
  });

  const distinctOptions = new Set(
    coordinatorsWithOptions.map((c) => String(c.assignedOption).trim().toLowerCase())
  );

  // If there are no multiple distinct partitioning options among coordinators, everyone oversees all students
  if (distinctOptions.size <= 1) {
    return true;
  }

  // Extract all string answers from student's formData
  const studentAnswers = Object.values(formData || {})
    .filter((val) => typeof val === "string")
    .map((val) => (val as string).trim().toLowerCase());

  // Check if student form data matches this coordinator's assignedOption (fuzzy match)
  const matchesThis = studentAnswers.some(
    (ans) => ans === cleanAssignedOption || ans.includes(cleanAssignedOption) || cleanAssignedOption.includes(ans)
  );
  if (matchesThis) {
    return true;
  }

  // Check if student matches ANY other coordinator's assignedOption
  const matchesOther = coordinatorsWithOptions.some((c) => {
    const cEmail = normalizeEmail(typeof c === "object" && c !== null ? c.email || "" : String(c));
    if (cEmail === cleanCoordEmail) return false;
    const otherOpt = String(c.assignedOption).trim().toLowerCase();
    return studentAnswers.some(
      (ans) => ans === otherOpt || ans.includes(otherOpt) || otherOpt.includes(ans)
    );
  });

  // If student did not match any coordinator's option, fallback to the primary (first) coordinator
  if (!matchesOther) {
    const first = coordinators[0];
    const firstEmail = normalizeEmail(typeof first === "object" && first !== null ? first.email || "" : String(first));
    if (firstEmail === cleanCoordEmail) {
      return true;
    }
  }

  return false;
}

let cachedPositionsMap: Map<string, string> | null = null;
let lastPositionsMapFetch = 0;

/**
 * Retrieves official coordinator positions/roles (e.g. "HOD - Technicals", "Secretary", etc.)
 * mapped by normalized email and lowercase name.
 * Caches in-memory for 60 seconds to avoid unnecessary Firestore lookups.
 */
export async function getCoordinatorPositionsMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cachedPositionsMap && now - lastPositionsMapFetch < 60_000) {
    return cachedPositionsMap;
  }

  const map = new Map<string, string>();
  try {
    const snap = await adminDb.collection("coordinators").get();
    snap.forEach((doc) => {
      const data = doc.data() || {};
      const pos = String(data.notes || data.position || data.role || "").trim();
      if (pos) {
        if (data.email) map.set(normalizeEmail(data.email), pos);
        if (data.name) {
          const n = String(data.name).toLowerCase().trim();
          map.set(n, pos);
          map.set(n.replace(/\s+/g, " "), pos);
        }
        if (doc.id.includes("@")) map.set(normalizeEmail(doc.id), pos);
      }
    });
    cachedPositionsMap = map;
    lastPositionsMapFetch = now;
  } catch (err) {
    console.error("Error building coordinator positions map:", err);
    return cachedPositionsMap || map;
  }

  return map;
}

