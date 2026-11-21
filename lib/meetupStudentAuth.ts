import { adminAuth, adminDb } from "@/lib/firebase-admin";

export interface AuthenticatedStudent {
  uid: string;
  email: string;
  name: string;
  studentId: string;
  phone: string;
  studentIdVerified: boolean;
  hasCanonicalProfile: boolean;
}

export type StudentAuthResult =
  | { ok: true; student: AuthenticatedStudent }
  | { ok: false; error: string; status: number };

/**
 * Verifies the Firebase ID token from the Authorization Bearer header
 * and loads the canonical `students/{uid}` profile.
 * Never trusts client-supplied uid/email parameters.
 */
export async function authenticateMeetupStudent(
  request: Request
): Promise<StudentAuthResult> {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : "";

  if (!token) {
    return { ok: false, error: "Authentication required. Please sign in with your IITM account.", status: 401 };
  }

  let decoded: any;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return { ok: false, error: "Invalid or expired authentication token.", status: 401 };
  }

  const uid = String(decoded.uid || "").trim();
  const email = String(decoded.email || "").trim().toLowerCase();

  if (!uid || !email || !email.endsWith("iitm.ac.in")) {
    return {
      ok: false,
      error: "Unauthorized domain. Only IITM student accounts (@iitm.ac.in) are permitted.",
      status: 403,
    };
  }

  const studentSnap = await adminDb.collection("students").doc(uid).get();
  const studentData = studentSnap.exists ? studentSnap.data() || {} : {};

  return {
    ok: true,
    student: {
      uid,
      email,
      name: String(studentData.name || decoded.name || "").trim(),
      studentId: String(studentData.studentId || "").trim(),
      phone: String(studentData.phone || "").trim(),
      studentIdVerified: Boolean(studentData.studentIdVerified),
      hasCanonicalProfile: studentSnap.exists,
    },
  };
}
