import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { checkRateLimit, getClientIp, isStaffRequest } from "@/lib/rateLimit";
import { getOrCreateStudentProfile, syncStudentFromRegistration } from "@/lib/studentProfile";
import {
  isValidState,
  isValidDistrict,
  canonicalizeState,
  canonicalizeDistrict,
} from "@/lib/indiaLocations";
import {
  getOrBackfillTripRegistration,
  checkIsDuplicateTripRegistration,
  saveDualTripRegistration,
  updateDualTripRegistration,
} from "@/lib/tripRegistration";

/* GET → Check if registered & fetch autofill profile data */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : searchParams.get("token");
    const tripId = searchParams.get("tripId");

    if (!token) {
      return Response.json({ error: "Missing authentication token" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const email = decodedToken.email;
    const uid = decodedToken.uid;

    if (!email || !email.endsWith("iitm.ac.in")) {
      return Response.json({ error: "Unauthorized domain. Only IITM emails are allowed." }, { status: 403 });
    }

    // 1. Fetch current registration status for this specific trip (canonical first, lazy backfill fallback)
    let registration = null;
    if (tripId) {
      const regResult = await getOrBackfillTripRegistration(tripId, uid, email);
      registration = regResult.registration;
    }

    // 2. Obtain or seed canonical student document in students/{uid}
    let studentProfile = null;
    try {
      studentProfile = await getOrCreateStudentProfile(uid, email, decodedToken.name);
    } catch (profErr) {
      console.error("Error obtaining canonical student profile in GET:", profErr);
    }

    // 3. Fetch past registration data to auto-fill (try master profile first, fallback to past registrations)
    let autofillData = null;
    const profileSnap = await adminDb.collection("user_profiles").doc(email).get();
    if (profileSnap.exists) {
      autofillData = profileSnap.data().formData || null;
    } else {
      // Check canonical tripRegistrations first
      const pastCanonicalSnap = await adminDb
        .collection("tripRegistrations")
        .where("uid", "==", uid)
        .get();

      let pastDocs = [...pastCanonicalSnap.docs];

      // Fallback to legacy user-registrations
      if (pastDocs.length === 0) {
        const pastLegacySnap = await adminDb
          .collection("user-registrations")
          .where("email", "==", email)
          .get();
        pastDocs = [...pastLegacySnap.docs];
      }

      if (pastDocs.length > 0) {
        const sortedDocs = pastDocs.sort((a, b) => {
          const timeA = a.data().submittedAt?.toDate?.()?.getTime() || 0;
          const timeB = b.data().submittedAt?.toDate?.()?.getTime() || 0;
          return timeB - timeA;
        });
        autofillData = sortedDocs[0].data().formData || null;
      }
    }

    // If autofillData is missing any fields, supplement from canonical students/{uid}
    if (studentProfile) {
      if (!autofillData) autofillData = {};
      if (!autofillData["Full Name"] && studentProfile.name) autofillData["Full Name"] = studentProfile.name;
      if (!autofillData["Roll Number"] && studentProfile.studentId) autofillData["Roll Number"] = studentProfile.studentId;
      if (!autofillData["Contact Number"] && studentProfile.phone) autofillData["Contact Number"] = studentProfile.phone;
      if (!autofillData["Gender"] && studentProfile.gender && studentProfile.gender !== "unknown") {
        autofillData["Gender"] = studentProfile.gender.charAt(0).toUpperCase() + studentProfile.gender.slice(1);
      }
      if (!autofillData["State"] && studentProfile.state) autofillData["State"] = studentProfile.state;
      if (!autofillData["City / District"] && studentProfile.cityDistrict) {
        autofillData["City / District"] = studentProfile.cityDistrict;
      }
    }

    // 4. Sanitize registration payload: never expose externalRegistrationToken to the student browser.
    // The token remains securely in Firestore tripRegistrations/{tripId}_{uid} as an internal correlation identifier.
    let sanitizedRegistration = registration;
    if (registration && registration.externalRegistrationToken !== undefined) {
      const { externalRegistrationToken, ...rest } = registration;
      sanitizedRegistration = rest;
    }

    return Response.json({ registration: sanitizedRegistration, autofillData, studentProfile }, { status: 200 });
  } catch (error) {
    console.error("GET user-registration error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST → Create new registration */
export async function POST(request) {
  try {
    let token = null;
    const authHeader = request.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      try {
        const clone = request.clone();
        const body = await clone.json();
        token = body.token;
      } catch (e) {}
    }

    const body = await request.json();
    const { tripId, formData, consentResponses } = body;

    if (!token) {
      return Response.json({ error: "Missing authentication token" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    // UID and email MUST strictly come from verified token, never trusted from client
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email || !email.endsWith("iitm.ac.in")) {
      return Response.json({ error: "Unauthorized domain. Only IITM emails are allowed." }, { status: 403 });
    }

    const isStaff = await isStaffRequest(null, token);
    if (!isStaff) {
      const ip = getClientIp(request);
      const ipRl = checkRateLimit(`register:ip:${ip}`, { limit: 60, windowMs: 60_000 });
      const userRl = checkRateLimit(`register:uid:${uid}`, { limit: 15, windowMs: 60_000 });
      if (!ipRl.allowed || !userRl.allowed) {
        return Response.json(
          { error: "Too many requests. Please wait a few moments before trying again." },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    if (!tripId || !formData) {
      return Response.json({ error: "Missing required fields (tripId, formData)" }, { status: 400 });
    }

    // Ensure canonical student profile document exists in students/{uid}
    await getOrCreateStudentProfile(uid, email, decodedToken.name);

    // Check if trip registration is open
    const tripSnap = await adminDb.collection("trips").doc(tripId).get();
    if (!tripSnap.exists) {
      return Response.json({ error: "Trip not found" }, { status: 404 });
    }
    const tripData = tripSnap.data();
    if (tripData.registrationOpen === false) {
      return Response.json({ error: "Registration for this trip is closed" }, { status: 400 });
    }

    // Prevent duplicate registrations using canonical UID-first check (alias-proof)
    const isDuplicate = await checkIsDuplicateTripRegistration(tripId, uid, email);
    if (isDuplicate) {
      return Response.json({ error: "You are already registered for this trip." }, { status: 400 });
    }

    // Fetch user's past registrations to enforce read-only prefilled data
    let pastFormData = null;
    const pastCanonicalSnap = await adminDb
      .collection("tripRegistrations")
      .where("uid", "==", uid)
      .get();
    let pastDocs = [...pastCanonicalSnap.docs];

    if (pastDocs.length === 0) {
      const pastLegacySnap = await adminDb
        .collection("user-registrations")
        .where("email", "==", email)
        .get();
      pastDocs = [...pastLegacySnap.docs];
    }

    if (pastDocs.length > 0) {
      const sortedDocs = pastDocs.sort((a, b) => {
        const timeA = a.data().submittedAt?.toDate?.()?.getTime() || 0;
        const timeB = b.data().submittedAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      pastFormData = sortedDocs[0].data().formData || null;
    }

    if (pastFormData) {
      // Force reuse of past Student ID copy if it exists
      const pastIdCopy = pastFormData["Student ID Card Copy"];
      if (pastIdCopy) {
        formData["Student ID Card Copy"] = pastIdCopy;
      }

      // Enforce read-only logic on fields configured by the admin
      if (tripData?.form?.fields) {
        tripData.form.fields.forEach((field) => {
          if (field.allowEditIfPrefilled === false && pastFormData[field.name] !== undefined) {
            formData[field.name] = pastFormData[field.name];
          }
        });
      }
    }

    // Automatically detect gender from formData keys (e.g. key containing "gender" or "sex")
    const genderKey = Object.keys(formData).find(
      (k) => k.toLowerCase().includes("gender") || k.toLowerCase() === "sex"
    );
    let gender = "unknown";
    if (genderKey) {
      const val = String(formData[genderKey]).toLowerCase();
      if (val.startsWith("f")) gender = "female";
      else if (val.startsWith("m")) gender = "male";
      else gender = "other";
    }

    // Check if user has a verified Student ID in canonical students/{uid} or past registrations
    const studentDocSnap = await adminDb.collection("students").doc(uid).get();
    let isIdVerified = studentDocSnap.exists && studentDocSnap.data()?.studentIdVerified === true;

    if (!isIdVerified) {
      const pastRegsSnap = await adminDb
        .collection("user-registrations")
        .where("email", "==", email)
        .where("studentIdVerified", "==", true)
        .limit(1)
        .get();
      isIdVerified = !pastRegsSnap.empty;
    }

    // Location snapshot & validation (State + City / District)
    const submittedState = formData["State"] || formData["state"];
    const submittedDistrict =
      formData["City / District"] || formData["cityDistrict"] || formData["district"];

    const studentDocData = studentDocSnap.exists ? studentDocSnap.data() || {} : {};
    const finalState = submittedState || studentDocData.state;
    const finalDistrict = submittedDistrict || studentDocData.cityDistrict;

    if (finalState) {
      if (!isValidState(finalState)) {
        return Response.json(
          { error: "Invalid state. Please select a valid Indian State or Union Territory." },
          { status: 400 }
        );
      }
      formData["State"] = canonicalizeState(finalState);
    }

    if (finalDistrict) {
      if (!finalState || !isValidDistrict(finalState, finalDistrict)) {
        return Response.json(
          { error: `Invalid city/district "${finalDistrict}" for state "${finalState}".` },
          { status: 400 }
        );
      }
      formData["City / District"] = canonicalizeDistrict(finalState, finalDistrict);
    }

    // Dual-write:
    // 1. tripRegistrations/{tripId}_{uid} (Canonical)
    // 2. user-registrations/{tripId}_{email} (Legacy)
    // 3. user_profiles/{email} (Legacy User Profile)
    // 4. students/{uid} (Canonical Student Profile)
    const { canonicalId } = await saveDualTripRegistration({
      tripId,
      uid,
      email,
      formData,
      gender,
      studentIdVerified: isIdVerified,
      consentResponses: consentResponses || [],
    });

    return Response.json(
      { success: true, message: "Trip Registration successful!", id: canonicalId },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST user-registration error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* PATCH → Update registration (e.g. re-upload documents) */
export async function PATCH(request) {
  try {
    let token = null;
    const authHeader = request.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      try {
        const clone = request.clone();
        const body = await clone.json();
        token = body.token;
      } catch (e) {}
    }

    const body = await request.json();
    const { tripId, formDataUpdates, studentNote } = body;

    if (!token) {
      return Response.json({ error: "Missing authentication token" }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    // UID and email derived strictly from verified token (client cannot patch another student's registration)
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email || !email.endsWith("iitm.ac.in")) {
      return Response.json({ error: "Unauthorized domain. Only IITM emails are allowed." }, { status: 403 });
    }

    const isStaff = await isStaffRequest(null, token);
    if (!isStaff) {
      const ip = getClientIp(request);
      const ipRl = checkRateLimit(`patch-reg:ip:${ip}`, { limit: 60, windowMs: 60_000 });
      const userRl = checkRateLimit(`patch-reg:uid:${uid}`, { limit: 20, windowMs: 60_000 });
      if (!ipRl.allowed || !userRl.allowed) {
        return Response.json(
          { error: "Too many requests. Please wait before retrying." },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    if (!tripId || (!formDataUpdates && !studentNote)) {
      return Response.json({ error: "Missing required fields (tripId, formDataUpdates or studentNote)" }, { status: 400 });
    }

    // Find canonical registration (lazy backfills from legacy if not yet done)
    const { registration } = await getOrBackfillTripRegistration(tripId, uid, email);
    if (!registration) {
      return Response.json({ error: "Registration not found." }, { status: 404 });
    }

    const existingData = registration;

    // Allow-list: only accept keys that belong to this trip's form fields or special document fields
    const tripSnap = await adminDb.collection("trips").doc(tripId).get();
    const tripFields = tripSnap.exists ? (tripSnap.data()?.form?.fields || []) : [];
    const allowedKeys = new Set([
      ...tripFields.map((f) => f.name),
      "Student ID Card Copy",
      "Completed Consent Form",
      "User Reply",
      "Custom Reply",
      "Notes for Coordinator",
      "Student Note",
    ]);

    const safeUpdates = Object.fromEntries(
      Object.entries(formDataUpdates || {}).filter(([k]) => {
        return allowedKeys.has(k) || k.startsWith("Completed Consent -");
      })
    );

    const rawStudentNote = typeof studentNote === "string" ? studentNote.trim() : null;
    if (rawStudentNote) {
      safeUpdates["Custom Reply"] = rawStudentNote;
      safeUpdates["Notes for Coordinator"] = rawStudentNote;
    }

    if (Object.keys(safeUpdates).length === 0) {
      return Response.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const newFormData = { ...(existingData.formData || {}), ...safeUpdates };

    // Build conversation history entry for the student's reply
    const studentReplyText =
      rawStudentNote ||
      safeUpdates["Notes for Coordinator"] ||
      safeUpdates["Custom Reply"] ||
      safeUpdates["User Reply"] ||
      safeUpdates["Student Note"] ||
      "";

    const fileFields = Object.entries(safeUpdates)
      .filter(([, v]) => typeof v === "string" && v.startsWith("http"))
      .map(([k]) => k);

    const replyKeys = new Set(["Custom Reply", "User Reply", "Notes for Coordinator", "Student Note"]);
    const updatedFields = Object.keys(safeUpdates).filter((k) => !replyKeys.has(k));

    const existingHistory = Array.isArray(existingData.conversationHistory)
      ? [...existingData.conversationHistory]
      : [];

    existingHistory.push({
      type: "student_reply",
      message: studentReplyText || "",
      updatedFields,
      fileFields,
      timestamp: new Date().toISOString(),
    });

    const updatePayload = {
      formData: newFormData,
      status: "registered", // send back to under review
      issueText: "", // clear any issues
      actionRequiredFields: [], // clear flagged fields
      conversationHistory: existingHistory,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // If ID Copy is updated, reset ID verification so coordinator must review again
    if (safeUpdates["Student ID Card Copy"] !== undefined) {
      updatePayload.studentIdVerified = false;
    }

    // If any Consent Form is updated, reset the verification map so coordinator must review again
    const verifiedConsentForms = { ...(existingData.verifiedConsentForms || {}) };
    let consentReset = false;

    if (safeUpdates["Completed Consent Form"] !== undefined) {
      verifiedConsentForms["legacy-consent"] = false;
      consentReset = true;
    }

    const tripData = tripSnap.exists ? tripSnap.data() : {};
    const consentTemplates = tripData.consentTemplates || [];

    for (const [k] of Object.entries(safeUpdates)) {
      if (k.startsWith("Completed Consent -")) {
        const templateName = k.substring("Completed Consent - ".length);
        const matchTemplate = consentTemplates.find((t) => t.name === templateName);
        if (matchTemplate) {
          verifiedConsentForms[matchTemplate.id] = false;
          consentReset = true;
        }
      }
    }

    if (consentReset) {
      updatePayload.verifiedConsentForms = verifiedConsentForms;
      updatePayload.consentFormVerified = false;
    }

    // Dual-update: Canonical tripRegistrations, legacy user-registrations, user_profiles, students
    await updateDualTripRegistration({
      tripId,
      uid,
      email,
      updatePayload,
    });

    return Response.json({ success: true, message: "Registration updated successfully." }, { status: 200 });
  } catch (error) {
    console.error("PATCH user-registration error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}