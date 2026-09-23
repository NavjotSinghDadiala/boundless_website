import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getCoordinatorProfile, normalizeEmail } from "@/lib/coordinatorAuth";

/**
 * GET /api/auth/coordinator-status
 * Verifies the incoming Firebase ID token and determines whether the authenticated
 * IITM user is an active coordinator in the `coordinators` collection.
 * 
 * Strict Zero-Hashing Rule: uses normalized email and Firebase UID only.
 * Identity is derived strictly from the cryptographic token.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    let token = "";

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else {
      const url = new URL(request.url);
      token = url.searchParams.get("token") || "";
    }

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Firebase authentication token required." },
        { status: 401 }
      );
    }

    // Cryptographic token verification - never trust client query params or body
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (tokenErr) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired Firebase authentication token." },
        { status: 401 }
      );
    }

    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { error: "Unauthorized: Email not present in authentication token." },
        { status: 401 }
      );
    }

    const normalizedEmail = normalizeEmail(decoded.email);

    // Validate IITM domain
    if (!normalizedEmail.endsWith("iitm.ac.in")) {
      return NextResponse.json(
        { error: "Forbidden: Only IIT Madras email addresses are permitted." },
        { status: 403 }
      );
    }

    // Look up canonical student profile to check studentId
    let studentId = "";
    try {
      const { adminDb } = await import("@/lib/firebase-admin");
      const studentSnap = await adminDb.collection("students").doc(decoded.uid).get();
      if (studentSnap.exists) {
        studentId = studentSnap.data()?.studentId || "";
      }
    } catch (_) {}

    // Check allowlist in coordinators collection by email or studentId
    const profile = await getCoordinatorProfile({ email: normalizedEmail, studentId });

    if (profile && profile.active) {
      return NextResponse.json({
        isCoordinator: true,
        name: profile.name,
        studentId: profile.studentId || studentId || "",
        email: profile.email || normalizedEmail,
      });
    }

    return NextResponse.json({
      isCoordinator: false,
    });
  } catch (error) {
    console.error("Coordinator Status API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
