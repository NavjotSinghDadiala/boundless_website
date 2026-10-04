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
import { createProfiler } from "@/lib/perfMetrics";
import { isQuotaError } from "@/lib/firebase-fallback";
import { randomBytes } from "crypto";

/*
 * Registration request correlation.
 * Request IDs are plain random identifiers (NOT hashes) of the form REG-XXXXXXXXXX.
 * The browser may supply its own ID via the X-Request-Id header so that even
 * network failures have a reference the student can quote; otherwise one is generated.
 */
const REQUEST_ID_PATTERN = /^REG-[A-Z0-9]{6,20}$/;
function resolveRequestId(request) {
  const incoming = String(request.headers.get("x-request-id") || "").trim().toUpperCase();
  if (REQUEST_ID_PATTERN.test(incoming)) return incoming;
  return `REG-${randomBytes(5).toString("hex").toUpperCase()}`;
}

// Maps the stage an unexpected exception occurred in to a safe error code.
function codeForStage(stage) {
  switch (stage) {
    case "pre_reads":
    case "legacy_profile_lookup":
    case "id_verification_lookup":
    case "gender_profile_sync":
      return "FIREBASE_ERROR";
    case "registration_transaction":
      return "TRANSACTION_FAILED";
    default:
      return "INTERNAL_ERROR";
  }
}

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

    // 1 & 2: Run registration fetch and canonical student profile concurrently (2 deterministic gets)
    const [regResult, studentProfile] = await Promise.all([
      tripId
        ? getOrBackfillTripRegistration(tripId, uid, email)
        : Promise.resolve({ registration: null }),
      getOrCreateStudentProfile(uid, email, decodedToken.name).catch((profErr) => {
        console.error("Error obtaining canonical student profile in GET:", profErr);
        return null;
      }),
    ]);

    const registration = regResult?.registration || null;

    // 3. Resolve autofill data: prefer existing registration formData, then canonical studentProfile
    let autofillData = registration?.formData ? { ...registration.formData } : null;
    if (!autofillData && studentProfile) {
      autofillData = {};
      if (studentProfile.name) autofillData["Full Name"] = studentProfile.name;
      if (studentProfile.studentId) autofillData["Roll Number"] = studentProfile.studentId;
      if (studentProfile.phone) autofillData["Contact Number"] = studentProfile.phone;
      if (studentProfile.gender && studentProfile.gender !== "unknown") {
        autofillData["Gender"] = studentProfile.gender.charAt(0).toUpperCase() + studentProfile.gender.slice(1);
      }
      if (studentProfile.state) autofillData["State"] = studentProfile.state;
      if (studentProfile.cityDistrict) autofillData["City / District"] = studentProfile.cityDistrict;
    }

    // Only fallback to legacy user_profiles if studentProfile was empty or missing core fields
    if (!autofillData || !autofillData["Full Name"]) {
      try {
        const profileSnap = await adminDb.collection("user_profiles").doc(email).get();
        if (profileSnap.exists) {
          autofillData = { ...(profileSnap.data()?.formData || {}), ...(autofillData || {}) };
        }
      } catch (_) {}
    }

    // If autofillData is missing any fields, supplement from canonical students/{uid}
    if (studentProfile && autofillData) {
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
    let sanitizedRegistration = registration;
    if (registration && registration.externalRegistrationToken !== undefined) {
      const { externalRegistrationToken, ...rest } = registration;
      sanitizedRegistration = rest;
    }

    return Response.json(
      { registration: sanitizedRegistration, autofillData, studentProfile },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error("GET user-registration error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST → Create new registration */
export async function POST(request) {
  const requestId = resolveRequestId(request);
  const startedAt = Date.now();
  let stage = "start";
  let tripIdForLog = "";

  // PII-free structured logging. Never log tokens, formData, phone, address, consent text or document URLs.
  const log = (msg) =>
    console.log(`[REGISTRATION][${requestId}] ${msg} elapsedMs=${Date.now() - startedAt}`);

  // Safe, structured, expected (4xx) rejection.
  const reject = (status, code, error, { extra = {}, headers = {} } = {}) => {
    console.warn(
      `[REGISTRATION][${requestId}] REJECTED route=/api/user-registration method=POST stage=${stage} code=${code} status=${status} elapsedMs=${Date.now() - startedAt}${tripIdForLog ? ` tripId=${tripIdForLog}` : ""}`
    );
    return Response.json(
      { success: false, error, code, requestId, ...extra },
      { status, headers: { "X-Request-Id": requestId, ...headers } }
    );
  };

  try {
    log("start");
    stage = "parse_request";
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

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return reject(400, "VALIDATION_FAILED", "The registration request was malformed. Please try again.");
    }
    const { tripId, formData, consentResponses } = body || {};
    tripIdForLog = typeof tripId === "string" ? tripId.slice(0, 64) : "";

    stage = "auth";
    if (!token) {
      return reject(401, "AUTH_FAILED", "Missing authentication token");
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      console.warn(`[REGISTRATION][${requestId}] token verification failed firebaseCode=${err?.code || "n/a"}`);
      return reject(401, "AUTH_FAILED", "Invalid token");
    }

    // UID and email MUST strictly come from verified token, never trusted from client
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email || !email.endsWith("iitm.ac.in")) {
      return reject(403, "AUTH_FAILED", "Unauthorized domain. Only IITM emails are allowed.");
    }
    log("auth verified");

    stage = "rate_limit";
    const isStaff = await isStaffRequest(null, token);
    if (!isStaff) {
      const ip = getClientIp(request);
      // Campus NAT accommodates up to 2000 requests/min per public proxy IP, while protecting per-user abuse with 15/min limit
      const ipRl = checkRateLimit(`register:ip:${ip}`, { limit: 2000, windowMs: 60_000 });
      const userRl = checkRateLimit(`register:uid:${uid}`, { limit: 15, windowMs: 60_000 });
      if (!ipRl.allowed || !userRl.allowed) {
        return reject(429, "RATE_LIMITED", "Too many requests. Please wait a few moments before trying again.", {
          headers: { "Retry-After": "60" },
        });
      }
    }

    stage = "validate_request";
    if (!tripId || !formData || typeof formData !== "object") {
      return reject(400, "VALIDATION_FAILED", "Missing required fields (tripId, formData)");
    }

    const profiler = createProfiler("student registration");
    stage = "pre_reads";

    // Parallel pre-read: Canonical trip metadata, student profile, and registration in 1 roundtrip
    const [tripSnap, studentDocSnap, regDocSnap] = await profiler.step(
      "parallel pre-reads",
      () =>
        Promise.all([
          adminDb.collection("trips").doc(tripId).get(),
          adminDb.collection("students").doc(uid).get(),
          adminDb.collection("tripRegistrations").doc(`${tripId}_${uid}`).get(),
        ]),
      { reads: 3 }
    );

    log(`pre-reads loaded trip=${tripSnap.exists} profile=${studentDocSnap.exists} existingReg=${regDocSnap.exists}`);

    stage = "trip_checks";
    if (!tripSnap.exists) {
      profiler.end();
      return reject(404, "TRIP_NOT_FOUND", "Trip not found");
    }
    const tripData = tripSnap.data() || {};
    if (tripData.registrationOpen === false) {
      profiler.end();
      return reject(400, "REGISTRATION_CLOSED", "Registration for this trip is closed");
    }

    stage = "existing_registration_check";
    if (regDocSnap.exists) {
      const existingStatus = (regDocSnap.data()?.status || "").toLowerCase().trim();
      if (existingStatus !== "rejected") {
        profiler.end();
        return reject(400, "ALREADY_REGISTERED", "You are already registered for this trip.", {
          extra: { id: regDocSnap.id },
        });
      }
    }

    const studentDocData = studentDocSnap.exists ? studentDocSnap.data() || {} : {};
    stage = "legacy_profile_lookup";

    // Reuse past Student ID copy if student did not upload a replacement
    if (!formData["Student ID Card Copy"] && studentDocData.studentIdUrl) {
      formData["Student ID Card Copy"] = studentDocData.studentIdUrl;
    }

    // Only query past form data if student ID copy is still missing or read-only configured fields exist
    const hasReadOnlyFields = tripData?.form?.fields?.some((f) => f.allowEditIfPrefilled === false);
    if (!formData["Student ID Card Copy"] || hasReadOnlyFields) {
      try {
        const profileSnap = await adminDb.collection("user_profiles").doc(email).get();
        if (profileSnap.exists) {
          const pastFormData = profileSnap.data()?.formData || {};
          if (!formData["Student ID Card Copy"] && pastFormData["Student ID Card Copy"]) {
            formData["Student ID Card Copy"] = pastFormData["Student ID Card Copy"];
          }
          if (tripData?.form?.fields) {
            tripData.form.fields.forEach((field) => {
              if (field.allowEditIfPrefilled === false && pastFormData[field.name] !== undefined) {
                formData[field.name] = pastFormData[field.name];
              }
            });
          }
        }
      } catch (_) {}
    }

    // Automatically detect gender from formData keys (e.g. key containing "gender" or "sex")
    const genderKey = Object.keys(formData).find(
      (k) => k.toLowerCase().includes("gender") || k.toLowerCase() === "sex"
    );
    let gender = "unknown";
    let rawGenderVal = "";
    if (genderKey && formData[genderKey]) {
      rawGenderVal = String(formData[genderKey]).toLowerCase().trim();
      if (rawGenderVal.startsWith("f")) gender = "female";
      else if (rawGenderVal.startsWith("m")) gender = "male";
      else if (rawGenderVal === "unknown") gender = "unknown";
      else if (rawGenderVal) gender = "other";
    }
    if (gender === "unknown" && rawGenderVal !== "unknown" && studentDocData.gender && studentDocData.gender !== "unknown") {
      gender = studentDocData.gender;
    }

    const isConfirmedUnknown = Boolean(
      body.confirmUnknownGender ||
      formData.confirmUnknownGender ||
      rawGenderVal === "unknown" ||
      body.confirmedUnknown
    );

    stage = "validate_gender";
    if (gender === "unknown") {
      if (isConfirmedUnknown) {
        formData["Gender"] = "Unknown";
      } else {
        return reject(400, "VALIDATION_FAILED", "Gender is required. Please select your gender to complete registration.", {
          extra: { field: "gender" },
        });
      }
    } else {
      formData["Gender"] = gender.charAt(0).toUpperCase() + gender.slice(1);
      // Optional: sync to student profile ONLY if student explicitly opted in
      if (body.alsoUpdateProfileGender) {
        stage = "gender_profile_sync";
        // FIX: `studentDocRef` was previously referenced here without ever being defined in this
        // handler, throwing a ReferenceError (-> HTTP 500) for every student who ticked
        // "Also update my Boundless profile with this gender".
        await adminDb
          .collection("students")
          .doc(uid)
          .set({ gender, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
          .catch((err) =>
            console.warn(
              `[REGISTRATION][${requestId}] non-fatal: gender profile sync failed firebaseCode=${err?.code || "n/a"}`
            )
          );
      }
    }
    delete formData["gender"];
    delete formData["sex"];
    delete formData["confirmUnknownGender"];

    // Check if user has a verified Student ID
    stage = "id_verification_lookup";
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

    // Contact phone snapshot & compulsory validation
    const submittedPhone =
      formData["Contact Number"] || formData["Phone"] || formData["Phone Number"] || formData["phone"];
    stage = "validate_phone";
    const finalPhone = submittedPhone || studentDocData.phone;
    if (!finalPhone || !String(finalPhone).trim()) {
      return reject(400, "VALIDATION_FAILED", "Phone number is required. Please enter a valid 10-digit mobile number.", {
        extra: { field: "phone" },
      });
    }
    let digits = String(finalPhone).replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return reject(400, "VALIDATION_FAILED", "Invalid mobile phone number. Please enter a valid 10-digit Indian mobile number.", {
        extra: { field: "phone" },
      });
    }
    formData["Contact Number"] = digits;
    delete formData["Phone"];
    delete formData["Phone Number"];
    delete formData["phone"];

    // Location snapshot & compulsory validation (State + City / District)
    const submittedState = formData["State"] || formData["state"];
    const submittedDistrict =
      formData["City / District"] || formData["cityDistrict"] || formData["district"];

    const finalState = submittedState || studentDocData.state;
    const finalDistrict = submittedDistrict || studentDocData.cityDistrict;

    stage = "validate_location";
    if (!finalState || !String(finalState).trim()) {
      return reject(400, "VALIDATION_FAILED", "State is required. Please select your residential state.", {
        extra: { field: "state" },
      });
    }
    if (!isValidState(finalState)) {
      return reject(400, "VALIDATION_FAILED", "Invalid state. Please select a valid Indian State or Union Territory.", {
        extra: { field: "state" },
      });
    }
    const canonicalState = canonicalizeState(finalState);
    formData["State"] = canonicalState;
    delete formData["state"];

    if (!finalDistrict || !String(finalDistrict).trim()) {
      return reject(400, "VALIDATION_FAILED", "City / District is required. Please select your district.", {
        extra: { field: "cityDistrict" },
      });
    }
    if (!isValidDistrict(canonicalState, finalDistrict)) {
      return reject(400, "VALIDATION_FAILED", `Invalid city/district "${finalDistrict}" for state "${canonicalState}".`, {
        extra: { field: "cityDistrict" },
      });
    }
    formData["City / District"] = canonicalizeDistrict(canonicalState, finalDistrict);
    delete formData["cityDistrict"];
    delete formData["district"];

    log("validation passed");

    // Save with atomic transaction on canonical ID tripRegistrations/{tripId}_{uid}
    stage = "registration_transaction";
    log("registration transaction started");
    const { canonicalId, alreadyExists } = await profiler.step(
      "transaction and dual-writes",
      () =>
        saveDualTripRegistration({
          tripId,
          uid,
          email,
          formData,
          gender,
          studentIdVerified: isIdVerified,
          consentResponses: consentResponses || [],
          studentName: studentDocData.name || decodedToken.name || "",
          studentRoll: studentDocData.studentId || "",
          studentPhone: finalPhone,
          cachedStudentData: studentDocData,
        }),
      { writes: 3, transactions: 1 }
    );

    profiler.end();

    if (alreadyExists) {
      return reject(400, "ALREADY_REGISTERED", "You are already registered for this trip.", {
        extra: { id: canonicalId },
      });
    }

    stage = "done";
    log(`success tripId=${tripIdForLog}`);
    return Response.json(
      { success: true, message: "Trip Registration successful!", id: canonicalId, requestId },
      { status: 200, headers: { "X-Request-Id": requestId } }
    );
  } catch (error) {
    const quota = isQuotaError(error);
    const code = quota ? "QUOTA_EXHAUSTED" : codeForStage(stage);
    const status = quota ? 429 : 500;
    // Full technical detail stays server-side only.
    console.error(
      `[REGISTRATION][${requestId}] FAILED route=/api/user-registration method=POST stage=${stage} code=${code} firebaseCode=${error?.code ?? "n/a"} status=${status} elapsedMs=${Date.now() - startedAt}${tripIdForLog ? ` tripId=${tripIdForLog}` : ""} errorName=${error?.name || "Error"} error=${error?.message || String(error)}`,
      error?.stack || ""
    );
    if (quota) {
      return Response.json(
        {
          success: false,
          error: "Service is temporarily busy (database quota reached). Please retry in a few moments.",
          code,
          requestId,
        },
        { status, headers: { "X-Request-Id": requestId, "Retry-After": "30" } }
      );
    }
    return Response.json(
      {
        success: false,
        error: "We couldn't complete your registration right now.",
        code,
        stage,
        requestId,
      },
      { status, headers: { "X-Request-Id": requestId } }
    );
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
      const ipRl = checkRateLimit(`patch-reg:ip:${ip}`, { limit: 2000, windowMs: 60_000 });
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
    if (isQuotaError(error)) {
      return Response.json(
        {
          error: "Service is temporarily busy (database quota reached). Please retry in a few moments.",
          code: "RESOURCE_EXHAUSTED",
        },
        { status: 429 }
      );
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}