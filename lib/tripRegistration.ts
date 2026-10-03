import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { syncStudentFromRegistration, extractStudentFieldsFromFormData } from "@/lib/studentProfile";
import { generateExternalRegistrationToken, generatePersonalizedFormLaunchUrl } from "@/lib/googleForms";

export interface CanonicalTripRegistration {
  id?: string;
  uid: string;
  email: string;
  name?: string;
  studentName?: string;
  studentId?: string;
  phone?: string;
  tripId: string;
  status: string;
  gender: string;
  formData: Record<string, any>;
  studentIdVerified: boolean;
  consentFormVerified: boolean;
  verifiedConsentForms: Record<string, boolean>;
  consentResponses?: Array<{
    statementId: string;
    statementText: string;
    accepted: boolean;
    acceptedAt?: string;
  }>;
  issueText: string;
  actionRequiredFields: string[];
  conversationHistory: Array<any>;
  submittedAt: any;
  updatedAt: any;
  externalRegistrationToken?: string;
  externalForms?: Array<any>;
  razorpayPaymentId?: string;
  paymentVerifiedAt?: any;
  consentFormFileUrl?: string;
  aadhaarVerified?: boolean;
  studentIdFileId?: string;
  studentIdDocument?: {
    documentType: string;
    fieldName: string;
    driveFileId: string | null;
    driveUrl: string;
    fileName: string;
    uploadedAt: string;
  };
  [key: string]: any;
}

/**
 * Deterministic canonical registration document ID.
 */
export function getCanonicalTripRegDocId(tripId: string, uid: string): string {
  if (!tripId || !uid) {
    throw new Error("tripId and uid are required for canonical registration ID");
  }
  return `${tripId}_${uid}`;
}

/**
 * Helper to convert Firestore Timestamps or dates to ISO strings for API serialization.
 */
export function formatIsoTimestamp(val: any): string | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val.toDate === "function") return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  return null;
}

/**
 * Serialize a Firestore registration document snapshot or data object.
 */
export function serializeTripRegistration(id: string, data: Record<string, any>): CanonicalTripRegistration {
  return {
    id,
    uid: data.uid || "",
    email: data.email || "",
    ...(data.name ? { name: data.name } : {}),
    ...(data.studentName ? { studentName: data.studentName } : {}),
    ...(data.studentId ? { studentId: data.studentId } : {}),
    ...(data.phone ? { phone: data.phone } : {}),
    tripId: data.tripId || "",
    status: data.status || "registered",
    gender: data.gender || "unknown",
    formData: data.formData || {},
    studentIdVerified: Boolean(data.studentIdVerified),
    consentFormVerified: Boolean(data.consentFormVerified),
    verifiedConsentForms: data.verifiedConsentForms || {},
    issueText: data.issueText || "",
    actionRequiredFields: Array.isArray(data.actionRequiredFields) ? data.actionRequiredFields : [],
    conversationHistory: (Array.isArray(data.conversationHistory) ? data.conversationHistory : [])
      .map((entry: any) => {
        if (!entry || typeof entry !== "object") return null;
        return {
          type: typeof entry.type === "string" ? entry.type : "admin_request",
          actor: typeof entry.actor === "string" ? entry.actor : undefined,
          message:
            typeof entry.message === "string"
              ? entry.message
              : typeof entry.text === "string"
              ? entry.text
              : "",
          reason: typeof entry.reason === "string" ? entry.reason : undefined,
          fields: Array.isArray(entry.fields) ? entry.fields : [],
          updatedFields: Array.isArray(entry.updatedFields) ? entry.updatedFields : [],
          fileFields: Array.isArray(entry.fileFields) ? entry.fileFields : [],
          timestamp: formatIsoTimestamp(entry.timestamp) || (typeof entry.timestamp === "string" ? entry.timestamp : null),
        };
      })
      .filter(Boolean),
    submittedAt: formatIsoTimestamp(data.submittedAt),
    updatedAt: formatIsoTimestamp(data.updatedAt),
    ...(data.approvalEmailSentAt ? { approvalEmailSentAt: formatIsoTimestamp(data.approvalEmailSentAt) } : {}),
    ...(data.approvalEmailStatus !== undefined ? { approvalEmailStatus: data.approvalEmailStatus } : {}),
    ...(data.approvalEmailError !== undefined ? { approvalEmailError: data.approvalEmailError } : {}),
    ...(data.approvalEmailLastAttemptAt ? { approvalEmailLastAttemptAt: formatIsoTimestamp(data.approvalEmailLastAttemptAt) } : {}),
    ...(data.approvalEmailMessageId !== undefined ? { approvalEmailMessageId: data.approvalEmailMessageId } : {}),
    ...(data.externalRegistrationToken !== undefined ? { externalRegistrationToken: data.externalRegistrationToken } : {}),
    ...(Array.isArray(data.externalForms) ? { externalForms: data.externalForms } : {}),
    // Preserve historical / legacy fields
    ...(data.razorpayPaymentId !== undefined ? { razorpayPaymentId: data.razorpayPaymentId } : {}),
    ...(data.paymentVerifiedAt ? { paymentVerifiedAt: formatIsoTimestamp(data.paymentVerifiedAt) } : {}),
    ...(data.consentFormFileUrl !== undefined ? { consentFormFileUrl: data.consentFormFileUrl } : {}),
    ...(data.aadhaarVerified !== undefined ? { aadhaarVerified: data.aadhaarVerified } : {}),
    ...(Array.isArray(data.consentResponses) ? { consentResponses: data.consentResponses } : {}),
    ...(data.studentIdFileId ? { studentIdFileId: data.studentIdFileId } : {}),
    ...(data.studentIdDocument ? { studentIdDocument: data.studentIdDocument } : {}),
  };
}

/**
 * Safely merge legacy registration data into canonical registration data.
 * Rule: Non-empty canonical values are NEVER overwritten by empty or missing legacy values.
 */
export function mergeLegacyIntoCanonical(
  canonicalData: Record<string, any> = {},
  legacyData: Record<string, any> = {},
  uid: string,
  email: string,
  tripId: string
): Record<string, any> {
  const merged: Record<string, any> = { ...canonicalData };

  // Identity is strictly anchored
  merged.uid = uid || canonicalData.uid || legacyData.uid || "";
  merged.email = email || canonicalData.email || legacyData.email || "";
  merged.tripId = tripId || canonicalData.tripId || legacyData.tripId || "";

  // Status
  if (!merged.status || merged.status === "registered") {
    merged.status = legacyData.status || merged.status || "registered";
  }

  // Gender
  if (!merged.gender || merged.gender === "unknown") {
    merged.gender = legacyData.gender || merged.gender || "unknown";
  }

  // FormData: merge keys, preserving canonical if present
  const mergedFormData = { ...(legacyData.formData || {}), ...(canonicalData.formData || {}) };
  merged.formData = mergedFormData;

  // Verifications: preserve truthy states
  merged.studentIdVerified = Boolean(canonicalData.studentIdVerified || legacyData.studentIdVerified);
  merged.consentFormVerified = Boolean(canonicalData.consentFormVerified || legacyData.consentFormVerified);

  // Verified consent forms map
  const legacyConsentMap = legacyData.verifiedConsentForms || {};
  const canonicalConsentMap = canonicalData.verifiedConsentForms || {};
  merged.verifiedConsentForms = { ...legacyConsentMap, ...canonicalConsentMap };

  // Issue text & action required fields
  if (canonicalData.issueText === undefined || canonicalData.issueText === "") {
    merged.issueText = legacyData.issueText || "";
  }
  if (!Array.isArray(canonicalData.actionRequiredFields) || canonicalData.actionRequiredFields.length === 0) {
    merged.actionRequiredFields = Array.isArray(legacyData.actionRequiredFields)
      ? legacyData.actionRequiredFields
      : [];
  }

  // Conversation history: preserve or take legacy
  if (!Array.isArray(canonicalData.conversationHistory) || canonicalData.conversationHistory.length === 0) {
    merged.conversationHistory = Array.isArray(legacyData.conversationHistory)
      ? legacyData.conversationHistory
      : [];
  }

  // Timestamps
  if (!merged.submittedAt) {
    merged.submittedAt = legacyData.submittedAt || FieldValue.serverTimestamp();
  }
  merged.updatedAt = canonicalData.updatedAt || legacyData.updatedAt || FieldValue.serverTimestamp();

  // Historical fields preservation
  if (canonicalData.razorpayPaymentId === undefined && legacyData.razorpayPaymentId !== undefined) {
    merged.razorpayPaymentId = legacyData.razorpayPaymentId;
  }
  if (canonicalData.paymentVerifiedAt === undefined && legacyData.paymentVerifiedAt !== undefined) {
    merged.paymentVerifiedAt = legacyData.paymentVerifiedAt;
  }
  if (canonicalData.consentFormFileUrl === undefined && legacyData.consentFormFileUrl !== undefined) {
    merged.consentFormFileUrl = legacyData.consentFormFileUrl;
  }
  if (!merged.approvalEmailStatus && legacyData.approvalEmailStatus) {
    merged.approvalEmailStatus = legacyData.approvalEmailStatus;
  }
  if (!merged.approvalEmailSentAt && legacyData.approvalEmailSentAt) {
    merged.approvalEmailSentAt = legacyData.approvalEmailSentAt;
  }
  if (!merged.approvalEmailError && legacyData.approvalEmailError) {
    merged.approvalEmailError = legacyData.approvalEmailError;
  }
  if (!merged.approvalEmailLastAttemptAt && legacyData.approvalEmailLastAttemptAt) {
    merged.approvalEmailLastAttemptAt = legacyData.approvalEmailLastAttemptAt;
  }
  if (!merged.approvalEmailMessageId && legacyData.approvalEmailMessageId) {
    merged.approvalEmailMessageId = legacyData.approvalEmailMessageId;
  }
  if (canonicalData.aadhaarVerified === undefined && legacyData.aadhaarVerified !== undefined) {
    merged.aadhaarVerified = legacyData.aadhaarVerified;
  }
  if (!merged.studentIdDocument && (canonicalData.studentIdDocument || legacyData.studentIdDocument)) {
    merged.studentIdDocument = canonicalData.studentIdDocument || legacyData.studentIdDocument;
  }
  if (!merged.studentIdFileId && (canonicalData.studentIdFileId || legacyData.studentIdFileId)) {
    merged.studentIdFileId = canonicalData.studentIdFileId || legacyData.studentIdFileId;
  }
  if (!Array.isArray(canonicalData.consentResponses) || canonicalData.consentResponses.length === 0) {
    if (Array.isArray(legacyData.consentResponses) && legacyData.consentResponses.length > 0) {
      merged.consentResponses = legacyData.consentResponses;
    }
  }

  // External registration token
  merged.externalRegistrationToken =
    canonicalData.externalRegistrationToken ||
    legacyData.externalRegistrationToken ||
    generateExternalRegistrationToken();

  return merged;
}

/**
 * Check if a registration already exists for this trip + student identity.
 * Duplicate check MUST be based primarily on tripId + Firebase Auth UID.
 */
export async function checkIsDuplicateTripRegistration(
  tripId: string,
  uid: string,
  email: string
): Promise<boolean> {
  if (!tripId || !uid) return false;

  // 1. Check canonical collection by deterministic document ID
  const canonicalDocId = getCanonicalTripRegDocId(tripId, uid);
  const canonicalSnap = await adminDb.collection("tripRegistrations").doc(canonicalDocId).get();
  if (canonicalSnap.exists) {
    const data = canonicalSnap.data() || {};
    if (data.status !== "rejected") {
      return true;
    }
  }

  // 2. Check legacy user-registrations by UID
  const legacyUidSnap = await adminDb
    .collection("user-registrations")
    .where("tripId", "==", tripId)
    .where("uid", "==", uid)
    .limit(1)
    .get();
  if (!legacyUidSnap.empty) {
    const data = legacyUidSnap.docs[0].data() || {};
    if (data.status !== "rejected") {
      return true;
    }
  }

  // 3. Check legacy user-registrations by deterministic legacy doc ID or email
  if (email) {
    const legacyDocSnap = await adminDb.collection("user-registrations").doc(`${tripId}_${email}`).get();
    if (legacyDocSnap.exists) {
      const data = legacyDocSnap.data() || {};
      if (data.status !== "rejected") {
        return true;
      }
    }
    const legacyEmailSnap = await adminDb
      .collection("user-registrations")
      .where("tripId", "==", tripId)
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!legacyEmailSnap.empty) {
      const data = legacyEmailSnap.docs[0].data() || {};
      if (data.status !== "rejected") {
        return true;
      }
    }
  }

  return false;
}

/**
 * Helper to resolve external forms for a registration:
 * Combines student's matched responses with any registered Google Forms for the trip.
 * Generates personalized launch URLs using externalRegistrationToken and student identity.
 */
// In-memory 30s cache for trip-level Google Forms definitions to eliminate repeated queries under rush
const tripGoogleFormsCache = new Map<string, { expiresAt: number; docs: Array<{ id: string; data: Record<string, any> }> }>();

async function getCachedTripGoogleForms(tripId: string): Promise<Array<{ id: string; data: Record<string, any> }>> {
  const now = Date.now();
  const cached = tripGoogleFormsCache.get(tripId);
  if (cached && now < cached.expiresAt) {
    return cached.docs;
  }
  try {
    const snap = await adminDb.collection("googleForms").where("tripId", "==", tripId).get();
    const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() || {} }));
    tripGoogleFormsCache.set(tripId, { expiresAt: now + 30_000, docs });
    return docs;
  } catch (e) {
    return [];
  }
}

async function resolveExternalFormsForRegistration(
  canonicalRef: FirebaseFirestore.DocumentReference,
  tripId: string,
  studentContext?: {
    token?: string | null;
    email?: string | null;
    studentId?: string | null;
  }
): Promise<Array<any>> {
  const formsSnap = await canonicalRef.collection("externalForms").get();
  const matchedMap = new Map<string, any>();
  formsSnap.docs.forEach((doc) => {
    matchedMap.set(doc.id, doc.data() || {});
  });

  const tripFormsDocs = await getCachedTripGoogleForms(tripId);

  let regToken = studentContext?.token;
  let regEmail = studentContext?.email;
  let studentId = studentContext?.studentId;

  if (!regToken || !regEmail) {
    const regSnap = await canonicalRef.get();
    if (regSnap.exists) {
      const rd = regSnap.data() || {};
      regToken = regToken || rd.externalRegistrationToken;
      regEmail = regEmail || rd.email;
      if (!studentId && rd.uid) {
        try {
          const stSnap = await adminDb.collection("students").doc(rd.uid).get();
          if (stSnap.exists) {
            studentId = stSnap.data()?.studentId || null;
          }
        } catch (e) {}
      }
    }
  }

  const externalFormsMap = new Map<string, any>();

  // 1. Add all registered forms for this trip
  if (tripFormsDocs && tripFormsDocs.length > 0) {
    tripFormsDocs.forEach((doc) => {
      const def = doc.data || {};
      const matched = matchedMap.get(doc.id);
      const rawFormUrl = def.formUrl || def.url || "";
      const openUrl = generatePersonalizedFormLaunchUrl({
        formUrl: rawFormUrl,
        token: regToken,
        email: regEmail,
        studentId: studentId,
        tokenFieldEntryId: def.tokenFieldEntryId,
        emailFieldEntryId: def.emailFieldEntryId,
        studentIdFieldEntryId: def.studentIdFieldEntryId,
      });

      externalFormsMap.set(doc.id, {
        formId: doc.id,
        tripId,
        name: def.name || doc.id,
        description: def.description || "",
        source: "google_forms",
        status: matched
          ? matched.status || "matched"
          : def.status === "inactive"
          ? "inactive"
          : "pending",
        submittedAt: matched ? formatIsoTimestamp(matched.submittedAt) : null,
        matchedAt: matched ? formatIsoTimestamp(matched.matchedAt) : null,
        openUrl: openUrl || rawFormUrl,
        ...(matched?.data ? { data: matched.data } : {}),
      });
    });
  }

  // 2. Include any matched forms not present in googleForms trip query
  formsSnap.docs.forEach((doc) => {
    if (!externalFormsMap.has(doc.id)) {
      const fd = doc.data() || {};
      const rawFormUrl = fd.formUrl || fd.url || "";
      externalFormsMap.set(doc.id, {
        formId: doc.id,
        tripId: fd.tripId || tripId,
        name: fd.name || doc.id,
        description: fd.description || "",
        source: "google_forms",
        status: fd.status || "matched",
        submittedAt: formatIsoTimestamp(fd.submittedAt),
        matchedAt: formatIsoTimestamp(fd.matchedAt),
        openUrl: rawFormUrl,
        data: fd.data || {},
      });
    }
  });

  return Array.from(externalFormsMap.values());
}

/**
 * Get or backfill a student's trip registration for GET /api/user-registration.
 * - Checks canonical tripRegistrations/{tripId}_{uid} first.
 * - If not found, checks legacy user-registrations.
 * - If legacy found, backfills tripRegistrations/{tripId}_{uid} safely without deleting legacy.
 */
export async function getOrBackfillTripRegistration(
  tripId: string,
  uid: string,
  email: string
): Promise<{ registration: CanonicalTripRegistration | null; source: "canonical" | "backfilled" | null }> {
  if (!tripId || !uid) {
    return { registration: null, source: null };
  }

  const canonicalDocId = getCanonicalTripRegDocId(tripId, uid);
  const canonicalRef = adminDb.collection("tripRegistrations").doc(canonicalDocId);
  const canonicalSnap = await canonicalRef.get();

  // 1. If canonical document exists, return it
  if (canonicalSnap.exists) {
    const data = canonicalSnap.data() || {};
    if (!data.externalRegistrationToken) {
      data.externalRegistrationToken = generateExternalRegistrationToken();
      await canonicalRef.update({
        externalRegistrationToken: data.externalRegistrationToken,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const externalForms = await resolveExternalFormsForRegistration(canonicalRef, tripId, {
      token: data.externalRegistrationToken,
      email: data.email,
    });

    return {
      registration: serializeTripRegistration(canonicalDocId, {
        ...data,
        externalForms,
      }),
      source: "canonical",
    };
  }

  // 2. Check legacy user-registrations
  let legacySnap: FirebaseFirestore.DocumentSnapshot | null = null;

  // Check direct deterministic legacy doc ID
  if (email) {
    const directLegacyRef = adminDb.collection("user-registrations").doc(`${tripId}_${email}`);
    const directSnap = await directLegacyRef.get();
    if (directSnap.exists) {
      legacySnap = directSnap;
    }
  }

  // Query legacy by tripId + email if not found
  if (!legacySnap && email) {
    const queryEmailSnap = await adminDb
      .collection("user-registrations")
      .where("tripId", "==", tripId)
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!queryEmailSnap.empty) {
      legacySnap = queryEmailSnap.docs[0];
    }
  }

  // Query legacy by tripId + uid if not found
  if (!legacySnap && uid) {
    const queryUidSnap = await adminDb
      .collection("user-registrations")
      .where("tripId", "==", tripId)
      .where("uid", "==", uid)
      .limit(1)
      .get();
    if (!queryUidSnap.empty) {
      legacySnap = queryUidSnap.docs[0];
    }
  }

  // 3. If legacy exists, perform safe lazy backfill into canonical
  if (legacySnap && legacySnap.exists) {
    const legacyData = legacySnap.data() || {};

    const backfilledData = mergeLegacyIntoCanonical(
      {},
      legacyData,
      uid,
      email || legacyData.email || "",
      tripId
    );

    // Save to canonical collection (does not delete legacy)
    await canonicalRef.set(backfilledData);

    const savedCanonicalSnap = await canonicalRef.get();
    const externalForms = await resolveExternalFormsForRegistration(canonicalRef, tripId, {
      token: backfilledData.externalRegistrationToken,
      email: backfilledData.email,
    });
    return {
      registration: serializeTripRegistration(canonicalDocId, {
        ...(savedCanonicalSnap.data() || backfilledData),
        externalForms,
      }),
      source: "backfilled",
    };
  }

  return { registration: null, source: null };
}

/**
 * Save new trip registration with dual-write to:
 * 1. tripRegistrations/{tripId}_{uid} (Canonical)
 * 2. user-registrations/{tripId}_{email} (Legacy)
 * 3. students/{uid} (Canonical Student Profile)
 * 4. user_profiles/{email} (Legacy User Profile)
 */
export async function saveDualTripRegistration({
  tripId,
  uid,
  email,
  formData,
  gender,
  studentIdVerified = false,
  consentResponses = [],
  studentName,
  studentRoll,
}: {
  tripId: string;
  uid: string;
  email: string;
  formData: Record<string, any>;
  gender: string;
  studentIdVerified?: boolean;
  consentResponses?: any[];
  studentName?: string;
  studentRoll?: string;
}): Promise<{ canonicalId: string; legacyId: string; alreadyExists?: boolean }> {
  const canonicalId = getCanonicalTripRegDocId(tripId, uid);
  const legacyId = `${tripId}_${email}`;

  const now = FieldValue.serverTimestamp();
  const externalRegistrationToken = generateExternalRegistrationToken();

  // Extract student identity details
  const extractedStudent = extractStudentFieldsFromFormData(formData || {});
  let resolvedStudentName = studentName || extractedStudent.name || "";
  let resolvedStudentRoll = studentRoll || extractedStudent.studentId || "";
  let resolvedStudentPhone =
    extractedStudent.phone ||
    formData?.["Contact Number"] ||
    formData?.["Phone Number"] ||
    formData?.["Phone"] ||
    formData?.["phone"] ||
    "";

  if (!resolvedStudentName || !resolvedStudentPhone) {
    try {
      const studentSnap = await adminDb.collection("students").doc(uid).get();
      if (studentSnap.exists) {
        const sData = studentSnap.data() || {};
        if (!resolvedStudentName) resolvedStudentName = sData.name || sData.fullName || "";
        if (!resolvedStudentRoll) resolvedStudentRoll = sData.studentId || "";
        if (!resolvedStudentPhone) resolvedStudentPhone = sData.phone || sData.whatsapp || "";
      }
    } catch (_) {}
  }

  // Extract Drive file ID and build structured studentIdDocument
  const studentIdUrl = formData?.["Student ID Card Copy"] || "";
  let studentIdFileId = formData?.["studentIdFileId"] || "";
  if (!studentIdFileId && studentIdUrl && typeof studentIdUrl === "string") {
    const match = studentIdUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      studentIdFileId = match[1];
    }
  }

  let studentIdDocument: any = null;
  if (studentIdUrl && typeof studentIdUrl === "string" && studentIdUrl.startsWith("http")) {
    let ext = "pdf";
    if (studentIdUrl.includes(".png")) ext = "png";
    else if (studentIdUrl.includes(".jpg") || studentIdUrl.includes(".jpeg")) ext = "jpg";
    studentIdDocument = {
      documentType: "student_id",
      fieldName: "Student ID Card Copy",
      driveFileId: studentIdFileId || null,
      driveUrl: studentIdUrl,
      fileName: `Student-ID.${ext}`,
      uploadedAt: new Date().toISOString(),
    };
  }

  const canonicalPayload: Record<string, any> = {
    uid,
    email,
    tripId,
    status: "registered",
    gender: gender || "unknown",
    name: resolvedStudentName,
    studentName: resolvedStudentName,
    studentId: resolvedStudentRoll,
    phone: resolvedStudentPhone,
    formData: formData || {},
    consentResponses: consentResponses || [],
    studentIdVerified: Boolean(studentIdVerified),
    consentFormVerified: false,
    verifiedConsentForms: {},
    issueText: "",
    actionRequiredFields: [],
    conversationHistory: [],
    externalRegistrationToken,
    submittedAt: now,
    updatedAt: now,
    ...(studentIdFileId ? { studentIdFileId } : {}),
    ...(studentIdDocument ? { studentIdDocument } : {}),
  };

  const legacyPayload: Record<string, any> = {
    uid,
    email,
    tripId,
    status: "registered",
    gender: gender || "unknown",
    name: resolvedStudentName,
    studentName: resolvedStudentName,
    studentId: resolvedStudentRoll,
    phone: resolvedStudentPhone,
    formData: formData || {},
    consentResponses: consentResponses || [],
    studentIdVerified: Boolean(studentIdVerified),
    submittedAt: now,
    ...(studentIdFileId ? { studentIdFileId } : {}),
    ...(studentIdDocument ? { studentIdDocument } : {}),
  };

  const canonicalRef = adminDb.collection("tripRegistrations").doc(canonicalId);

  // 1. Atomic registration creation via transaction (prevents race condition & double-submits)
  const txResult = await adminDb.runTransaction(async (transaction) => {
    const canonicalSnap = await transaction.get(canonicalRef);
    if (canonicalSnap.exists) {
      const existingData = canonicalSnap.data() || {};
      const status = (existingData.status || "").toLowerCase().trim();
      // Only block if registration is in an active non-rejected state
      if (status !== "rejected") {
        return { alreadyExists: true };
      }

      // Reapplying after rejection:
      // Preserve previous audit trail and record reapplication event
      const previousHistory = Array.isArray(existingData.conversationHistory)
        ? [...existingData.conversationHistory]
        : [];
      previousHistory.push({
        type: "reapplied",
        actor: email,
        message: "Student reapplied with fresh registration details.",
        timestamp: new Date().toISOString(),
      });
      canonicalPayload.conversationHistory = previousHistory;
      if (existingData.studentIdVerified === true) {
        canonicalPayload.studentIdVerified = true;
      }
      transaction.set(canonicalRef, canonicalPayload);
      return { alreadyExists: false };
    }
    transaction.set(canonicalRef, canonicalPayload);
    return { alreadyExists: false };
  });

  if (txResult.alreadyExists) {
    return { canonicalId, legacyId, alreadyExists: true };
  }

  // 2. Parallel non-blocking legacy dual-writes (preserves backward compatibility without blocking)
  await Promise.all([
    adminDb.collection("user-registrations").doc(legacyId).set(legacyPayload),
    adminDb.collection("user_profiles").doc(email).set(
      {
        email,
        uid,
        formData: formData || {},
        updatedAt: now,
      },
      { merge: true }
    ),
    syncStudentFromRegistration(uid, email, formData, studentIdVerified),
  ]).catch((err) => {
    console.error("Non-critical error writing legacy registration records:", err);
  });

  return { canonicalId, legacyId, alreadyExists: false };
}

/**
 * Update trip registration (e.g. re-upload documents, student replies) with dual-write.
 */
export async function updateDualTripRegistration({
  tripId,
  uid,
  email,
  updatePayload,
}: {
  tripId: string;
  uid: string;
  email: string;
  updatePayload: Record<string, any>;
}): Promise<void> {
  const canonicalId = getCanonicalTripRegDocId(tripId, uid);
  const legacyId = `${tripId}_${email}`;

  // 1. Update Canonical registration
  if (updatePayload.formData) {
    const updatedIdUrl = updatePayload.formData["Student ID Card Copy"];
    if (updatedIdUrl && typeof updatedIdUrl === "string") {
      let updatedFileId = updatePayload.formData["studentIdFileId"] || "";
      if (!updatedFileId) {
        const match = updatedIdUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) updatedFileId = match[1];
      }
      let ext = "pdf";
      if (updatedIdUrl.includes(".png")) ext = "png";
      else if (updatedIdUrl.includes(".jpg") || updatedIdUrl.includes(".jpeg")) ext = "jpg";

      updatePayload.studentIdDocument = {
        documentType: "student_id",
        fieldName: "Student ID Card Copy",
        driveFileId: updatedFileId || null,
        driveUrl: updatedIdUrl,
        fileName: `Student-ID.${ext}`,
        uploadedAt: new Date().toISOString(),
      };
      if (updatedFileId) {
        updatePayload.studentIdFileId = updatedFileId;
      }
    }
  }

  const canonicalRef = adminDb.collection("tripRegistrations").doc(canonicalId);
  const canonicalSnap = await canonicalRef.get();
  if (canonicalSnap.exists) {
    await canonicalRef.update(updatePayload);
  } else {
    // If not in canonical yet, backfill from legacy then update
    const { registration } = await getOrBackfillTripRegistration(tripId, uid, email);
    if (registration) {
      await canonicalRef.update(updatePayload);
    } else {
      await canonicalRef.set({
        uid,
        email,
        tripId,
        submittedAt: FieldValue.serverTimestamp(),
        ...updatePayload,
      });
    }
  }

  // 2. Update Legacy registration if it exists
  const legacyRef = adminDb.collection("user-registrations").doc(legacyId);
  const legacySnap = await legacyRef.get();
  if (legacySnap.exists) {
    await legacyRef.update(updatePayload);
  } else {
    // Check if legacy exists by query
    const legacyQuery = await adminDb
      .collection("user-registrations")
      .where("tripId", "==", tripId)
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!legacyQuery.empty) {
      await legacyQuery.docs[0].ref.update(updatePayload);
    }
  }

  // 3. Update Legacy master user profile
  if (updatePayload.formData) {
    await adminDb.collection("user_profiles").doc(email).set(
      {
        email,
        formData: updatePayload.formData,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 4. Sync Canonical student profile in students/{uid}
    await syncStudentFromRegistration(uid, email, updatePayload.formData);
  }
}

/**
 * Retrieve deduplicated registrations for a given trip for Admin and Coordinator views.
 * Queries both canonical `tripRegistrations` and legacy `user-registrations`.
 * Deduplicates by UID (or fallback to email).
 * Canonical registrations ALWAYS take precedence over legacy records.
 */
export async function getDeduplicatedRegistrationsForTrip(
  tripId: string
): Promise<CanonicalTripRegistration[]> {
  if (!tripId) return [];

  // 1. Query canonical tripRegistrations
  const canonicalSnap = await adminDb
    .collection("tripRegistrations")
    .where("tripId", "==", tripId)
    .get();

  // 2. Query legacy user-registrations
  const legacySnap = await adminDb
    .collection("user-registrations")
    .where("tripId", "==", tripId)
    .get();

  const registrationsMap = new Map<string, CanonicalTripRegistration>();
  const seenEmails = new Set<string>();

  // First pass: add all canonical registrations (source of truth)
  for (const doc of canonicalSnap.docs) {
    const data = doc.data() || {};
    const serialized = serializeTripRegistration(doc.id, data);
    const key = serialized.uid || serialized.email || doc.id;
    registrationsMap.set(key, serialized);
    if (serialized.email) {
      seenEmails.add(serialized.email.toLowerCase());
    }
  }

  // Second pass: add legacy registrations ONLY if student is not already represented
  for (const doc of legacySnap.docs) {
    const data = doc.data() || {};
    const uid = data.uid;
    const email = (data.email || "").toLowerCase();

    // Check if this student is already in the map by UID or email
    const alreadyPresentByUid = uid && registrationsMap.has(uid);
    const alreadyPresentByEmail = email && seenEmails.has(email);

    if (!alreadyPresentByUid && !alreadyPresentByEmail) {
      const serialized = serializeTripRegistration(doc.id, data);
      const key = uid || email || doc.id;
      registrationsMap.set(key, serialized);
      if (email) {
        seenEmails.add(email);
      }
    }
  }

  const allRegistrations = Array.from(registrationsMap.values());

  // 3. Batch-enrich registrations with student profile data (name, studentId)
  const uids = Array.from(new Set(allRegistrations.map((r) => r.uid).filter(Boolean)));
  if (uids.length > 0) {
    const studentMap = new Map<string, any>();
    const userMap = new Map<string, any>();

    const chunks: string[][] = [];
    for (let i = 0; i < uids.length; i += 100) {
      chunks.push(uids.slice(i, i + 100));
    }

    await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const studentRefs = chunk.map((uid) => adminDb.collection("students").doc(uid));
          const snaps = await adminDb.getAll(...studentRefs);
          snaps.forEach((snap) => {
            if (snap.exists) {
              studentMap.set(snap.id, snap.data());
            }
          });
        } catch (err) {
          console.warn("Failed to batch-fetch student docs:", err);
        }
      })
    );

    const missingUids = uids.filter((uid) => !studentMap.get(uid)?.name);
    if (missingUids.length > 0) {
      const userChunks: string[][] = [];
      for (let i = 0; i < missingUids.length; i += 100) {
        userChunks.push(missingUids.slice(i, i + 100));
      }
      await Promise.all(
        userChunks.map(async (chunk) => {
          try {
            const userRefs = chunk.map((uid) => adminDb.collection("users").doc(uid));
            const snaps = await adminDb.getAll(...userRefs);
            snaps.forEach((snap) => {
              if (snap.exists) {
                userMap.set(snap.id, snap.data());
              }
            });
          } catch (err) {
            console.warn("Failed to batch-fetch user docs:", err);
          }
        })
      );
    }

    for (const reg of allRegistrations) {
      const studentData = studentMap.get(reg.uid);
      const userData = userMap.get(reg.uid);

      const resolvedName =
        reg.name ||
        reg.studentName ||
        studentData?.name ||
        studentData?.fullName ||
        userData?.name ||
        userData?.displayName ||
        reg.formData?.["Full Name"] ||
        reg.formData?.["full name"] ||
        reg.formData?.["Name"] ||
        reg.formData?.["name"] ||
        reg.formData?.["Student Name"] ||
        "";

      const resolvedStudentId =
        reg.studentId ||
        studentData?.studentId ||
        reg.formData?.["Student ID Number"] ||
        reg.formData?.["Roll Number"] ||
        reg.formData?.["Student ID"] ||
        "";

      if (resolvedName) {
        reg.name = resolvedName;
        reg.studentName = resolvedName;
      }
      if (resolvedStudentId) {
        reg.studentId = resolvedStudentId;
      }
      const resolvedPhone =
        reg.phone ||
        studentData?.phone ||
        studentData?.whatsapp ||
        userData?.phone ||
        reg.formData?.["Contact Number"] ||
        reg.formData?.["Phone Number"] ||
        reg.formData?.["Phone"] ||
        reg.formData?.["phone"] ||
        reg.formData?.["contact"] ||
        reg.formData?.["mobile"] ||
        "";
      if (resolvedPhone) {
        reg.phone = resolvedPhone;
      }
    }
  }

  // Also check if any registration still lacks a name or phone and has an email
  const missingEnrichmentRegs = allRegistrations.filter((r) => (!r.name || !r.phone) && r.email);
  if (missingEnrichmentRegs.length > 0) {
    await Promise.all(
      missingEnrichmentRegs.map(async (reg) => {
        try {
          const profSnap = await adminDb.collection("user_profiles").doc(reg.email).get();
          if (profSnap.exists) {
            const pData = profSnap.data() || {};
            const pForm = pData.formData || {};
            const pName = pData.name || pForm["Full Name"] || pForm["Name"] || pForm["name"];
            if (!reg.name && pName) {
              reg.name = pName;
              reg.studentName = pName;
            }
            const pPhone =
              pData.phone ||
              pForm["Contact Number"] ||
              pForm["Phone Number"] ||
              pForm["Phone"] ||
              pForm["phone"];
            if (!reg.phone && pPhone) {
              reg.phone = pPhone;
            }
          }
        } catch (_) {}
      })
    );
  }

  return allRegistrations;
}

/**
 * Ensure a canonical trip registration document has an externalRegistrationToken.
 */
export async function ensureRegistrationExternalToken(tripId: string, uid: string): Promise<string> {
  const canonicalDocId = getCanonicalTripRegDocId(tripId, uid);
  const docRef = adminDb.collection("tripRegistrations").doc(canonicalDocId);
  const snap = await docRef.get();
  if (snap.exists) {
    const data = snap.data() || {};
    if (data.externalRegistrationToken) {
      return data.externalRegistrationToken;
    }
    const token = generateExternalRegistrationToken();
    await docRef.update({
      externalRegistrationToken: token,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return token;
  }
  return generateExternalRegistrationToken();
}

