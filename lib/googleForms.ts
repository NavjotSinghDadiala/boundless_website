import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomBytes } from "crypto";
import {
  getCanonicalTripRegDocId,
  getOrBackfillTripRegistration,
  formatIsoTimestamp,
} from "@/lib/tripRegistration";

export interface GoogleFormDefinition {
  formId: string;
  tripId: string;
  name: string;
  description?: string;
  type: "google_form";
  status: "active" | "inactive";
  formUrl?: string;
  tokenFieldEntryId?: string;
  emailFieldEntryId?: string;
  studentIdFieldEntryId?: string;
  responseKey?: string;
  fieldMappings?: Record<string, string>;
  createdAt: any;
  updatedAt: any;
  createdBy?: string;
}

export interface ExternalFormAssociation {
  formId: string;
  tripId: string;
  uid: string;
  responseId: string;
  source: "google_forms";
  status: "matched";
  submittedAt: any;
  matchedAt: any;
  matchedBy: "boundless_token" | "verified_uid" | "verified_email" | "student_id" | "admin";
  data: Record<string, any>;
  responseHistory?: Array<{
    responseId: string;
    submittedAt: any;
    data: Record<string, any>;
    replacedAt: any;
  }>;
}

export interface ExternalFormResponseIntake {
  id: string; // ${formId}_${responseId}
  formId: string;
  tripId: string;
  responseId: string;
  source: "google_forms";
  status: "matched" | "unmatched" | "needs_review" | "rejected";
  submittedAt: any;
  candidateEmail?: string | null;
  candidateStudentId?: string | null;
  candidateToken?: string | null;
  candidateUid?: string | null;
  matchedUid?: string | null;
  matchedAt?: any;
  matchedBy?: string | null;
  ambiguityReason?: string | null;
  data: Record<string, any>;
  createdAt: any;
  updatedAt: any;
}

export interface IngestResponseParams {
  formId: string;
  tripId: string;
  responseId: string;
  submittedAt?: any;
  candidateToken?: string;
  candidateUid?: string;
  candidateEmail?: string;
  candidateStudentId?: string;
  data: Record<string, any>;
}

export interface IngestResponseResult {
  success: boolean;
  status: "matched" | "unmatched" | "needs_review" | "rejected";
  matched: boolean;
  intakeId: string;
  uid?: string | null;
  matchedBy?: string | null;
  ambiguityReason?: string | null;
  message?: string;
}

/**
 * Generate a cryptographically random, unguessable external registration token.
 * Format: BLD-XXXXXXXX (e.g. BLD-8F29A1C7).
 * Never exposes UID, email, roll number, or personal details.
 */
export function generateExternalRegistrationToken(): string {
  const hex = randomBytes(4).toString("hex").toUpperCase();
  return `BLD-${hex}`;
}

/**
 * Generate a personalized Google Form launch URL prefilling correlation fields.
 * Prefills:
 * - externalRegistrationToken (via tokenFieldEntryId)
 * - student email (via emailFieldEntryId)
 * - student ID (via studentIdFieldEntryId)
 * If no prefill entry IDs are configured, returns formUrl as-is.
 */
export function generatePersonalizedFormLaunchUrl({
  formUrl,
  token,
  email,
  studentId,
  tokenFieldEntryId,
  emailFieldEntryId,
  studentIdFieldEntryId,
}: {
  formUrl: string;
  token?: string | null;
  email?: string | null;
  studentId?: string | null;
  tokenFieldEntryId?: string | null;
  emailFieldEntryId?: string | null;
  studentIdFieldEntryId?: string | null;
}): string {
  if (!formUrl || typeof formUrl !== "string") return "";
  const cleanUrl = formUrl.trim();
  if (!cleanUrl) return "";

  try {
    const url = new URL(cleanUrl);
    const cleanToken = token ? token.trim() : "";
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const cleanStudentId = studentId ? studentId.trim().toUpperCase() : "";

    const hasPrefill =
      Boolean(tokenFieldEntryId && cleanToken) ||
      Boolean(emailFieldEntryId && cleanEmail) ||
      Boolean(studentIdFieldEntryId && cleanStudentId);

    if (hasPrefill) {
      url.searchParams.set("usp", "pp_url");

      if (tokenFieldEntryId && cleanToken) {
        const key = tokenFieldEntryId.trim().startsWith("entry.")
          ? tokenFieldEntryId.trim()
          : `entry.${tokenFieldEntryId.trim()}`;
        url.searchParams.set(key, cleanToken);
      }

      if (emailFieldEntryId && cleanEmail) {
        const key = emailFieldEntryId.trim().startsWith("entry.")
          ? emailFieldEntryId.trim()
          : `entry.${emailFieldEntryId.trim()}`;
        url.searchParams.set(key, cleanEmail);
      }

      if (studentIdFieldEntryId && cleanStudentId) {
        const key = studentIdFieldEntryId.trim().startsWith("entry.")
          ? studentIdFieldEntryId.trim()
          : `entry.${studentIdFieldEntryId.trim()}`;
        url.searchParams.set(key, cleanStudentId);
      }
    }

    return url.toString();
  } catch (err) {
    return cleanUrl;
  }
}

/**
 * Create or register a new Google Form definition for a trip.
 * Rule: One form belongs to exactly one trip.
 */
export async function createGoogleFormDefinition({
  formId,
  tripId,
  name,
  description,
  status = "active",
  formUrl,
  tokenFieldEntryId,
  emailFieldEntryId,
  studentIdFieldEntryId,
  responseKey,
  fieldMappings = {},
  createdBy,
}: {
  formId: string;
  tripId: string;
  name: string;
  description?: string;
  status?: "active" | "inactive";
  formUrl?: string;
  tokenFieldEntryId?: string;
  emailFieldEntryId?: string;
  studentIdFieldEntryId?: string;
  responseKey?: string;
  fieldMappings?: Record<string, string>;
  createdBy?: string;
}): Promise<GoogleFormDefinition> {
  const cleanFormId = (formId || "").trim();
  const cleanTripId = (tripId || "").trim();
  const cleanName = (name || "").trim();

  if (!cleanFormId) {
    throw new Error("formId is required");
  }
  if (!cleanTripId) {
    throw new Error("tripId is required");
  }
  if (!cleanName) {
    throw new Error("name is required");
  }

  // Verify trip existence in Firestore
  const tripSnap = await adminDb.collection("trips").doc(cleanTripId).get();
  if (!tripSnap.exists) {
    throw new Error(`Trip '${cleanTripId}' does not exist.`);
  }

  const formDocRef = adminDb.collection("googleForms").doc(cleanFormId);
  const existing = await formDocRef.get();
  if (existing.exists) {
    throw new Error(`Google Form with formId '${cleanFormId}' already exists.`);
  }

  const now = FieldValue.serverTimestamp();
  const docData: Record<string, any> = {
    formId: cleanFormId,
    tripId: cleanTripId,
    name: cleanName,
    description: description ? description.trim() : "",
    type: "google_form",
    status: status === "inactive" ? "inactive" : "active",
    formUrl: formUrl ? formUrl.trim() : "",
    tokenFieldEntryId: tokenFieldEntryId ? tokenFieldEntryId.trim() : "",
    emailFieldEntryId: emailFieldEntryId ? emailFieldEntryId.trim() : "",
    studentIdFieldEntryId: studentIdFieldEntryId ? studentIdFieldEntryId.trim() : "",
    responseKey: responseKey ? responseKey.trim() : "",
    fieldMappings: fieldMappings && typeof fieldMappings === "object" ? fieldMappings : {},
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy || "admin",
  };

  await formDocRef.set(docData);

  return {
    ...docData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as GoogleFormDefinition;
}

/**
 * Retrieve all registered Google Forms for a specific trip.
 */
export async function getGoogleFormsForTrip(tripId: string): Promise<GoogleFormDefinition[]> {
  if (!tripId) return [];

  const snap = await adminDb
    .collection("googleForms")
    .where("tripId", "==", tripId.trim())
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data() || {};
    return {
      formId: doc.id,
      tripId: d.tripId || "",
      name: d.name || "",
      description: d.description || "",
      type: "google_form",
      status: d.status || "active",
      formUrl: d.formUrl || d.url || "",
      tokenFieldEntryId: d.tokenFieldEntryId || "",
      emailFieldEntryId: d.emailFieldEntryId || "",
      studentIdFieldEntryId: d.studentIdFieldEntryId || "",
      responseKey: d.responseKey || "",
      fieldMappings: d.fieldMappings || {},
      createdAt: formatIsoTimestamp(d.createdAt),
      updatedAt: formatIsoTimestamp(d.updatedAt),
      createdBy: d.createdBy || "",
    } as GoogleFormDefinition;
  });
}

/**
 * Update an existing Google Form definition.
 */
export async function updateGoogleFormDefinition(
  formId: string,
  updates: Partial<
    Pick<
      GoogleFormDefinition,
      | "name"
      | "description"
      | "status"
      | "formUrl"
      | "tokenFieldEntryId"
      | "emailFieldEntryId"
      | "studentIdFieldEntryId"
      | "responseKey"
      | "fieldMappings"
    >
  >
): Promise<GoogleFormDefinition> {
  const cleanFormId = (formId || "").trim();
  if (!cleanFormId) {
    throw new Error("formId is required");
  }

  const formDocRef = adminDb.collection("googleForms").doc(cleanFormId);
  const snap = await formDocRef.get();
  if (!snap.exists) {
    throw new Error(`Google Form '${cleanFormId}' not found.`);
  }

  const updateData: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.description !== undefined) updateData.description = updates.description.trim();
  if (updates.status !== undefined) {
    updateData.status = updates.status === "inactive" ? "inactive" : "active";
  }
  if (updates.formUrl !== undefined) updateData.formUrl = updates.formUrl.trim();
  if (updates.tokenFieldEntryId !== undefined) updateData.tokenFieldEntryId = updates.tokenFieldEntryId.trim();
  if (updates.emailFieldEntryId !== undefined) updateData.emailFieldEntryId = updates.emailFieldEntryId.trim();
  if (updates.studentIdFieldEntryId !== undefined) updateData.studentIdFieldEntryId = updates.studentIdFieldEntryId.trim();
  if (updates.responseKey !== undefined) updateData.responseKey = updates.responseKey.trim();
  if (updates.fieldMappings !== undefined && typeof updates.fieldMappings === "object") {
    updateData.fieldMappings = updates.fieldMappings;
  }

  await formDocRef.update(updateData);

  const updatedSnap = await formDocRef.get();
  const d = updatedSnap.data() || {};
  return {
    formId: cleanFormId,
    tripId: d.tripId || "",
    name: d.name || "",
    description: d.description || "",
    type: "google_form",
    status: d.status || "active",
    formUrl: d.formUrl || d.url || "",
    tokenFieldEntryId: d.tokenFieldEntryId || "",
    emailFieldEntryId: d.emailFieldEntryId || "",
    studentIdFieldEntryId: d.studentIdFieldEntryId || "",
    responseKey: d.responseKey || "",
    fieldMappings: d.fieldMappings || {},
    createdAt: formatIsoTimestamp(d.createdAt),
    updatedAt: formatIsoTimestamp(d.updatedAt),
    createdBy: d.createdBy || "",
  } as GoogleFormDefinition;
}

/**
 * Deterministic matching pipeline to associate an external form response with an existing canonical registration.
 *
 * Matching Order:
 * 1. Boundless-controlled registration token (externalRegistrationToken)
 * 2. Verified Firebase UID
 * 3. Exact IITM student email
 * 4. Exact student ID / Roll Number
 *
 * If ambiguity is detected, returns status: "needs_review".
 */
export async function matchCandidateToRegistration({
  tripId,
  candidateToken,
  candidateUid,
  candidateEmail,
  candidateStudentId,
}: {
  tripId: string;
  candidateToken?: string;
  candidateUid?: string;
  candidateEmail?: string;
  candidateStudentId?: string;
}): Promise<{
  matchedUid: string | null;
  matchedBy: "boundless_token" | "verified_uid" | "verified_email" | "student_id" | null;
  status: "matched" | "unmatched" | "needs_review";
  ambiguityReason?: string;
}> {
  // 1. Priority 1: Boundless-controlled registration token
  if (candidateToken && typeof candidateToken === "string" && candidateToken.trim()) {
    const cleanToken = candidateToken.trim().toUpperCase();
    const tokenQuery = await adminDb
      .collection("tripRegistrations")
      .where("tripId", "==", tripId)
      .where("externalRegistrationToken", "==", cleanToken)
      .get();

    if (tokenQuery.docs.length === 1) {
      const doc = tokenQuery.docs[0];
      return {
        matchedUid: doc.data().uid || null,
        matchedBy: "boundless_token",
        status: "matched",
      };
    } else if (tokenQuery.docs.length > 1) {
      return {
        matchedUid: null,
        matchedBy: null,
        status: "needs_review",
        ambiguityReason: `Ambiguous registration token '${cleanToken}': multiple registrations found.`,
      };
    }
  }

  // 2. Priority 2: Verified Firebase UID
  if (candidateUid && typeof candidateUid === "string" && candidateUid.trim()) {
    const cleanUid = candidateUid.trim();
    const regDocId = getCanonicalTripRegDocId(tripId, cleanUid);
    const canonicalSnap = await adminDb.collection("tripRegistrations").doc(regDocId).get();

    if (canonicalSnap.exists) {
      return {
        matchedUid: cleanUid,
        matchedBy: "verified_uid",
        status: "matched",
      };
    }

    // Check if legacy user-registrations has this UID and can be backfilled
    const legacySnap = await adminDb
      .collection("user-registrations")
      .where("tripId", "==", tripId)
      .where("uid", "==", cleanUid)
      .limit(1)
      .get();

    if (!legacySnap.empty) {
      const legDoc = legacySnap.docs[0];
      const legEmail = legDoc.data().email || "";
      await getOrBackfillTripRegistration(tripId, cleanUid, legEmail);
      return {
        matchedUid: cleanUid,
        matchedBy: "verified_uid",
        status: "matched",
      };
    }
  }

  // 3. Priority 3: Exact IITM student email
  if (candidateEmail && typeof candidateEmail === "string" && candidateEmail.trim()) {
    const cleanEmail = candidateEmail.trim().toLowerCase();

    // Check canonical registrations by email
    const emailQuery = await adminDb
      .collection("tripRegistrations")
      .where("tripId", "==", tripId)
      .where("email", "==", cleanEmail)
      .get();

    if (emailQuery.docs.length === 1) {
      const doc = emailQuery.docs[0];
      return {
        matchedUid: doc.data().uid || null,
        matchedBy: "verified_email",
        status: "matched",
      };
    } else if (emailQuery.docs.length > 1) {
      return {
        matchedUid: null,
        matchedBy: null,
        status: "needs_review",
        ambiguityReason: `Ambiguous email '${cleanEmail}': multiple canonical registrations found for trip.`,
      };
    }

    // Check legacy user-registrations by email
    const legacyEmailSnap = await adminDb
      .collection("user-registrations")
      .where("tripId", "==", tripId)
      .where("email", "==", cleanEmail)
      .get();

    if (legacyEmailSnap.docs.length === 1) {
      const legacyDoc = legacyEmailSnap.docs[0];
      const legacyData = legacyDoc.data() || {};
      let resolvedUid = legacyData.uid;

      if (!resolvedUid) {
        // Try resolving UID from students collection by email
        const studentSnap = await adminDb
          .collection("students")
          .where("email", "==", cleanEmail)
          .limit(1)
          .get();
        if (!studentSnap.empty) {
          resolvedUid = studentSnap.docs[0].id;
        }
      }

      if (resolvedUid) {
        await getOrBackfillTripRegistration(tripId, resolvedUid, cleanEmail);
        return {
          matchedUid: resolvedUid,
          matchedBy: "verified_email",
          status: "matched",
        };
      }
    } else if (legacyEmailSnap.docs.length > 1) {
      return {
        matchedUid: null,
        matchedBy: null,
        status: "needs_review",
        ambiguityReason: `Ambiguous email '${cleanEmail}': multiple legacy registrations found for trip.`,
      };
    }
  }

  // 4. Priority 4: Exact student ID / Roll Number
  if (candidateStudentId && typeof candidateStudentId === "string" && candidateStudentId.trim()) {
    const cleanStudentId = candidateStudentId.trim().toUpperCase();

    const studentQuery = await adminDb
      .collection("students")
      .where("studentId", "==", cleanStudentId)
      .get();

    if (studentQuery.docs.length === 1) {
      const studentDoc = studentQuery.docs[0];
      const studentUid = studentDoc.id;

      // Check if this student has an existing registration for this trip
      const canonicalRegDocId = getCanonicalTripRegDocId(tripId, studentUid);
      const regSnap = await adminDb.collection("tripRegistrations").doc(canonicalRegDocId).get();

      if (regSnap.exists) {
        return {
          matchedUid: studentUid,
          matchedBy: "student_id",
          status: "matched",
        };
      }

      // If student profile exists but NO trip registration exists:
      // It is UNMATCHED for this trip (do not create registration automatically)
      return {
        matchedUid: null,
        matchedBy: null,
        status: "unmatched",
      };
    } else if (studentQuery.docs.length > 1) {
      return {
        matchedUid: null,
        matchedBy: null,
        status: "needs_review",
        ambiguityReason: `Ambiguous studentId '${cleanStudentId}': multiple student profiles found.`,
      };
    }
  }

  // No deterministic match found
  return {
    matchedUid: null,
    matchedBy: null,
    status: "unmatched",
  };
}

/**
 * Ingest an external Google Form response.
 *
 * Rules:
 * 1. formId + responseId is the external response identity for deduplication.
 * 2. Unmatched responses go to externalFormResponses/{formId}_{responseId} with status "unmatched" or "needs_review".
 *    NEVER automatically creates students/{uid} or tripRegistrations/{tripId}_{uid}.
 * 3. Matched responses attach to tripRegistrations/{tripId}_{uid}/externalForms/{formId}.
 * 4. Multiple submissions to the same form preserve response history.
 * 5. External data NEVER overwrites students/{uid} or tripRegistrations.formData.
 */
export async function ingestExternalFormResponse({
  formId,
  tripId,
  responseId,
  submittedAt,
  candidateToken,
  candidateUid,
  candidateEmail,
  candidateStudentId,
  data = {},
}: IngestResponseParams): Promise<IngestResponseResult> {
  const cleanFormId = (formId || "").trim();
  const cleanTripId = (tripId || "").trim();
  const cleanResponseId = (responseId || "").trim();

  if (!cleanFormId || !cleanTripId || !cleanResponseId) {
    throw new Error("formId, tripId, and responseId are required for response ingestion");
  }

  // 1. Verify form definition exists and matches trip
  const formRef = adminDb.collection("googleForms").doc(cleanFormId);
  const formSnap = await formRef.get();
  if (!formSnap.exists) {
    throw new Error(`Google Form definition '${cleanFormId}' does not exist.`);
  }
  const formData = formSnap.data() || {};
  if (formData.tripId !== cleanTripId) {
    throw new Error(`Form '${cleanFormId}' belongs to trip '${formData.tripId}', not '${cleanTripId}'.`);
  }

  const intakeDocId = `${cleanFormId}_${cleanResponseId}`;
  const intakeRef = adminDb.collection("externalFormResponses").doc(intakeDocId);
  const intakeSnap = await intakeRef.get();

  const now = FieldValue.serverTimestamp();
  const rawSubmittedAt = submittedAt || now;

  // 2. Run deterministic matching pipeline
  const matchResult = await matchCandidateToRegistration({
    tripId: cleanTripId,
    candidateToken,
    candidateUid,
    candidateEmail,
    candidateStudentId,
  });

  // 3. Handle UNMATCHED or NEEDS_REVIEW
  if (matchResult.status !== "matched" || !matchResult.matchedUid) {
    const intakePayload: Record<string, any> = {
      id: intakeDocId,
      formId: cleanFormId,
      tripId: cleanTripId,
      responseId: cleanResponseId,
      source: "google_forms",
      status: matchResult.status, // "unmatched" | "needs_review"
      submittedAt: rawSubmittedAt,
      candidateEmail: candidateEmail ? candidateEmail.trim().toLowerCase() : null,
      candidateStudentId: candidateStudentId ? candidateStudentId.trim().toUpperCase() : null,
      candidateToken: candidateToken ? candidateToken.trim().toUpperCase() : null,
      candidateUid: candidateUid ? candidateUid.trim() : null,
      matchedUid: null,
      matchedAt: null,
      matchedBy: null,
      ambiguityReason: matchResult.ambiguityReason || null,
      data: data || {},
      updatedAt: now,
    };

    if (!intakeSnap.exists) {
      intakePayload.createdAt = now;
    }

    await intakeRef.set(intakePayload, { merge: true });

    return {
      success: true,
      status: matchResult.status,
      matched: false,
      intakeId: intakeDocId,
      ambiguityReason: matchResult.ambiguityReason || null,
      message:
        matchResult.status === "needs_review"
          ? "Response saved with status 'needs_review' due to ambiguous matching candidate."
          : "Response saved with status 'unmatched'. No student or trip registration was created.",
    };
  }

  // 4. Handle MATCHED response
  const matchedUid = matchResult.matchedUid;
  const matchedBy = matchResult.matchedBy!;
  const canonicalRegDocId = getCanonicalTripRegDocId(cleanTripId, matchedUid);

  // Subcollection path: tripRegistrations/{tripId}_{uid}/externalForms/{formId}
  const formAssocRef = adminDb
    .collection("tripRegistrations")
    .doc(canonicalRegDocId)
    .collection("externalForms")
    .doc(cleanFormId);

  const formAssocSnap = await formAssocRef.get();

  let responseHistory: Array<any> = [];

  if (formAssocSnap.exists) {
    const existing = formAssocSnap.data() || {};

    // Deduplication check: if exact same responseId was already recorded
    if (existing.responseId === cleanResponseId) {
      // Idempotent re-run: update data without polluting response history
      await formAssocRef.update({
        data: data || {},
        updatedAt: now,
      });

      await intakeRef.set(
        {
          id: intakeDocId,
          formId: cleanFormId,
          tripId: cleanTripId,
          responseId: cleanResponseId,
          source: "google_forms",
          status: "matched",
          matchedUid,
          matchedAt: existing.matchedAt || now,
          matchedBy,
          submittedAt: rawSubmittedAt,
          data: data || {},
          updatedAt: now,
        },
        { merge: true }
      );

      return {
        success: true,
        status: "matched",
        matched: true,
        intakeId: intakeDocId,
        uid: matchedUid,
        matchedBy,
        message: "Duplicate response processed idempotently. Association preserved.",
      };
    }

    // Different responseId for same form: preserve existing submission in responseHistory
    const previousHistory = Array.isArray(existing.responseHistory) ? existing.responseHistory : [];
    responseHistory = [
      ...previousHistory,
      {
        responseId: existing.responseId,
        submittedAt: existing.submittedAt,
        data: existing.data || {},
        replacedAt: new Date().toISOString(),
      },
    ];
  }

  // Write new / updated form association document
  const assocPayload: Record<string, any> = {
    formId: cleanFormId,
    tripId: cleanTripId,
    uid: matchedUid,
    responseId: cleanResponseId,
    source: "google_forms",
    status: "matched",
    submittedAt: rawSubmittedAt,
    matchedAt: now,
    matchedBy,
    data: data || {},
    responseHistory,
    updatedAt: now,
  };

  await formAssocRef.set(assocPayload, { merge: true });

  // Update intake collection record
  const intakePayload: Record<string, any> = {
    id: intakeDocId,
    formId: cleanFormId,
    tripId: cleanTripId,
    responseId: cleanResponseId,
    source: "google_forms",
    status: "matched",
    candidateEmail: candidateEmail ? candidateEmail.trim().toLowerCase() : null,
    candidateStudentId: candidateStudentId ? candidateStudentId.trim().toUpperCase() : null,
    candidateToken: candidateToken ? candidateToken.trim().toUpperCase() : null,
    candidateUid: candidateUid ? candidateUid.trim() : null,
    matchedUid,
    matchedAt: now,
    matchedBy,
    submittedAt: rawSubmittedAt,
    data: data || {},
    updatedAt: now,
  };

  if (!intakeSnap.exists) {
    intakePayload.createdAt = now;
  }

  await intakeRef.set(intakePayload, { merge: true });

  return {
    success: true,
    status: "matched",
    matched: true,
    intakeId: intakeDocId,
    uid: matchedUid,
    matchedBy,
    message: "External form response successfully matched and associated with canonical registration.",
  };
}

/**
 * Retrieve all external form responses for a given trip (Admin inspection).
 * Returns both matched form associations across registrations and unmatched intake submissions.
 */
export async function getTripExternalFormResponses(
  tripId: string,
  formId?: string
): Promise<{
  matchedResponses: ExternalFormAssociation[];
  unmatchedResponses: ExternalFormResponseIntake[];
}> {
  if (!tripId) {
    return { matchedResponses: [], unmatchedResponses: [] };
  }

  const cleanTripId = tripId.trim();

  // 1. Fetch unmatched and needs_review responses from intake collection
  let intakeQuery = adminDb
    .collection("externalFormResponses")
    .where("tripId", "==", cleanTripId);

  if (formId) {
    intakeQuery = intakeQuery.where("formId", "==", formId.trim());
  }

  const intakeSnap = await intakeQuery.get();
  const unmatchedResponses: ExternalFormResponseIntake[] = [];

  for (const doc of intakeSnap.docs) {
    const d = doc.data() || {};
    if (d.status === "unmatched" || d.status === "needs_review" || d.status === "rejected") {
      unmatchedResponses.push({
        id: doc.id,
        formId: d.formId || "",
        tripId: d.tripId || "",
        responseId: d.responseId || "",
        source: "google_forms",
        status: d.status,
        submittedAt: formatIsoTimestamp(d.submittedAt),
        candidateEmail: d.candidateEmail || null,
        candidateStudentId: d.candidateStudentId || null,
        candidateToken: d.candidateToken || null,
        candidateUid: d.candidateUid || null,
        matchedUid: d.matchedUid || null,
        matchedAt: formatIsoTimestamp(d.matchedAt),
        matchedBy: d.matchedBy || null,
        ambiguityReason: d.ambiguityReason || null,
        data: d.data || {},
        createdAt: formatIsoTimestamp(d.createdAt),
        updatedAt: formatIsoTimestamp(d.updatedAt),
      });
    }
  }

  // 2. Fetch matched responses from registration subcollections
  const regSnap = await adminDb
    .collection("tripRegistrations")
    .where("tripId", "==", cleanTripId)
    .get();

  const matchedResponses: ExternalFormAssociation[] = [];

  for (const regDoc of regSnap.docs) {
    let subColQuery = regDoc.ref.collection("externalForms");
    if (formId) {
      const singleDoc = await subColQuery.doc(formId.trim()).get();
      if (singleDoc.exists) {
        const d = singleDoc.data() || {};
        matchedResponses.push({
          formId: d.formId || singleDoc.id,
          tripId: d.tripId || cleanTripId,
          uid: d.uid || regDoc.data().uid,
          responseId: d.responseId || "",
          source: "google_forms",
          status: "matched",
          submittedAt: formatIsoTimestamp(d.submittedAt),
          matchedAt: formatIsoTimestamp(d.matchedAt),
          matchedBy: d.matchedBy || "admin",
          data: d.data || {},
          responseHistory: d.responseHistory || [],
        });
      }
    } else {
      const subSnap = await subColQuery.get();
      for (const formDoc of subSnap.docs) {
        const d = formDoc.data() || {};
        matchedResponses.push({
          formId: d.formId || formDoc.id,
          tripId: d.tripId || cleanTripId,
          uid: d.uid || regDoc.data().uid,
          responseId: d.responseId || "",
          source: "google_forms",
          status: "matched",
          submittedAt: formatIsoTimestamp(d.submittedAt),
          matchedAt: formatIsoTimestamp(d.matchedAt),
          matchedBy: d.matchedBy || "admin",
          data: d.data || {},
          responseHistory: d.responseHistory || [],
        });
      }
    }
  }

  return { matchedResponses, unmatchedResponses };
}
