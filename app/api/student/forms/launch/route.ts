import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  generatePersonalizedFormLaunchUrl,
} from "@/lib/googleForms";
import {
  getOrBackfillTripRegistration,
  ensureRegistrationExternalToken,
} from "@/lib/tripRegistration";

/**
 * GET /api/student/forms/launch?tripId=...&formId=...
 *
 * Authenticated student endpoint to generate a personalized Google Form launch URL.
 * Strictly derives identity from the verified Firebase ID token.
 * Never trusts client-supplied uid, studentId, or externalRegistrationToken.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header." },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing authentication token." },
        { status: 401 }
      );
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (authErr: any) {
      return NextResponse.json(
        { error: "Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    const email = (decodedToken.email || "").trim().toLowerCase();
    const uid = decodedToken.uid;

    if (!email || !email.endsWith("iitm.ac.in")) {
      return NextResponse.json(
        { error: "Unauthorized domain. Only IITM student accounts (@study.iitm.ac.in / @iitm.ac.in) are allowed." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tripId = (searchParams.get("tripId") || "").trim();
    const formId = (searchParams.get("formId") || "").trim();

    if (!tripId || !formId) {
      return NextResponse.json(
        { error: "tripId and formId query parameters are required." },
        { status: 400 }
      );
    }

    // 1. Verify student's canonical registration for this trip
    const { registration } = await getOrBackfillTripRegistration(tripId, uid, email);
    if (!registration) {
      return NextResponse.json(
        { error: "No trip registration found for this student and trip." },
        { status: 404 }
      );
    }

    // 2. Fetch Google Form definition
    const formDocRef = adminDb.collection("googleForms").doc(formId);
    const formSnap = await formDocRef.get();
    if (!formSnap.exists) {
      return NextResponse.json(
        { error: `Google Form '${formId}' does not exist.` },
        { status: 404 }
      );
    }

    const formDef = formSnap.data() || {};
    if (formDef.tripId !== tripId) {
      return NextResponse.json(
        { error: `Form '${formId}' is not associated with trip '${tripId}'.` },
        { status: 400 }
      );
    }

    if (formDef.status === "inactive") {
      return NextResponse.json(
        { error: "This form is currently inactive." },
        { status: 400 }
      );
    }

    // 3. Obtain internal correlation token from registration
    const token =
      registration.externalRegistrationToken ||
      (await ensureRegistrationExternalToken(tripId, uid));

    // 4. Resolve student ID if available
    let studentId: string | null = null;
    try {
      const studentSnap = await adminDb.collection("students").doc(uid).get();
      if (studentSnap.exists) {
        studentId = studentSnap.data()?.studentId || null;
      }
    } catch (e) {}

    // 5. Generate personalized launch URL
    const rawFormUrl = formDef.formUrl || formDef.url || "";
    const personalizedUrl = generatePersonalizedFormLaunchUrl({
      formUrl: rawFormUrl,
      token,
      email,
      studentId,
      tokenFieldEntryId: formDef.tokenFieldEntryId,
      emailFieldEntryId: formDef.emailFieldEntryId,
      studentIdFieldEntryId: formDef.studentIdFieldEntryId,
    });

    return NextResponse.json(
      {
        success: true,
        url: personalizedUrl || rawFormUrl,
        formId,
        name: formDef.name || formId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET /api/student/forms/launch Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate form launch link." },
      { status: 500 }
    );
  }
}
