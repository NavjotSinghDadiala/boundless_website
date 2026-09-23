import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  isValidState,
  isValidDistrict,
  canonicalizeState,
  canonicalizeDistrict,
} from "@/lib/indiaLocations";

export interface StudentDocument {
  uid: string;
  email: string;
  name: string;
  studentId: string;
  gender: string;
  dob: string;
  phone: string;
  whatsapp: string;
  residence: string;
  state?: string;
  cityDistrict?: string;
  studentIdVerified: boolean;
  createdAt: any;
  updatedAt: any;
}

/**
 * Extract standard student profile fields from a generic formData dictionary.
 */
export function extractStudentFieldsFromFormData(formData: Record<string, any> = {}) {
  const keys = Object.keys(formData);

  // Full Name
  const nameKey = keys.find(
    (k) =>
      k.toLowerCase() === "name" ||
      k.toLowerCase() === "fullname" ||
      k.toLowerCase() === "full name" ||
      (k.toLowerCase().includes("name") &&
        !k.toLowerCase().includes("father") &&
        !k.toLowerCase().includes("mother") &&
        !k.toLowerCase().includes("emergency"))
  );
  const name = nameKey ? String(formData[nameKey] || "").trim() : "";

  // Student ID / Roll Number
  const idKey = keys.find(
    (k) =>
      k.toLowerCase() === "roll number" ||
      k.toLowerCase() === "roll no" ||
      k.toLowerCase() === "rollno" ||
      k.toLowerCase() === "student id" ||
      k.toLowerCase() === "student id number" ||
      k.toLowerCase().includes("roll")
  );
  const studentId = idKey ? String(formData[idKey] || "").trim() : "";

  // Gender
  const genderKey = keys.find(
    (k) => k.toLowerCase().includes("gender") || k.toLowerCase() === "sex"
  );
  let gender = "";
  if (genderKey) {
    const val = String(formData[genderKey] || "").toLowerCase().trim();
    if (val.startsWith("f")) gender = "female";
    else if (val.startsWith("m")) gender = "male";
    else if (val) gender = "other";
  }

  // Date of Birth
  const dobKey = keys.find(
    (k) =>
      k.toLowerCase().includes("dob") ||
      k.toLowerCase().includes("birth") ||
      k.toLowerCase() === "date of birth"
  );
  const dob = dobKey ? String(formData[dobKey] || "").trim() : "";

  // Phone / Contact Number
  const phoneKey = keys.find(
    (k) =>
      k.toLowerCase() === "phone" ||
      k.toLowerCase() === "contact" ||
      k.toLowerCase() === "mobile" ||
      k.toLowerCase() === "contact number" ||
      k.toLowerCase() === "phone number" ||
      (k.toLowerCase().includes("phone") &&
        !k.toLowerCase().includes("emergency") &&
        !k.toLowerCase().includes("parent")) ||
      (k.toLowerCase().includes("contact") &&
        !k.toLowerCase().includes("emergency") &&
        !k.toLowerCase().includes("parent"))
  );
  const phone = phoneKey ? String(formData[phoneKey] || "").trim() : "";

  // WhatsApp Number
  const whatsappKey = keys.find((k) => k.toLowerCase().includes("whatsapp"));
  const whatsapp = whatsappKey ? String(formData[whatsappKey] || "").trim() : (phone || "");

  // Residence / Hostel / Address (historical string preserved untouched)
  const residenceKey = keys.find(
    (k) =>
      k.toLowerCase().includes("residence") ||
      k.toLowerCase().includes("hostel") ||
      k.toLowerCase().includes("address") ||
      k.toLowerCase() === "residence address"
  );
  const residence = residenceKey ? String(formData[residenceKey] || "").trim() : "";

  // State
  const stateKey = keys.find(
    (k) =>
      k.toLowerCase() === "state" ||
      (k.toLowerCase().includes("state") && !k.toLowerCase().includes("statement"))
  );
  const state = stateKey ? String(formData[stateKey] || "").trim() : "";

  // City / District
  const districtKey = keys.find(
    (k) =>
      k.toLowerCase() === "city / district" ||
      k.toLowerCase() === "city/district" ||
      k.toLowerCase() === "citydistrict" ||
      k.toLowerCase() === "city or district" ||
      k.toLowerCase() === "district" ||
      (k.toLowerCase().includes("district") && !k.toLowerCase().includes("state"))
  );
  const cityDistrict = districtKey ? String(formData[districtKey] || "").trim() : "";

  return { name, studentId, gender, dob, phone, whatsapp, residence, state, cityDistrict };
}

/**
 * Format Firestore Timestamps into ISO strings for API serialization.
 */
function serializeStudentDoc(data: any): StudentDocument {
  return {
    uid: data.uid || "",
    email: data.email || "",
    name: data.name || "",
    studentId: data.studentId || "",
    gender: data.gender || "unknown",
    dob: data.dob || "",
    phone: data.phone || "",
    whatsapp: data.whatsapp || "",
    residence: data.residence || "",
    state: data.state || "",
    cityDistrict: data.cityDistrict || "",
    studentIdVerified: Boolean(data.studentIdVerified),
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
  };
}

/**
 * Obtain or seed the canonical student profile in students/{uid}.
 * Never blindly overwrites existing student data.
 */
export async function getOrCreateStudentProfile(
  uid: string,
  email: string,
  defaultName?: string
): Promise<StudentDocument> {
  if (!uid || !email) {
    throw new Error("Missing required student identity (uid, email)");
  }

  const studentDocRef = adminDb.collection("students").doc(uid);
  const studentSnap = await studentDocRef.get();

  if (studentSnap.exists) {
    const data = studentSnap.data() || {};
    // If email is missing or desynced, update it
    if (!data.email || data.email !== email) {
      await studentDocRef.update({
        email,
        updatedAt: FieldValue.serverTimestamp(),
      });
      data.email = email;
    }
    return serializeStudentDoc(data);
  }

  // Look for legacy profile in user_profiles/{email}
  let legacyFormData: Record<string, any> = {};
  const profileSnap = await adminDb.collection("user_profiles").doc(email).get();
  if (profileSnap.exists) {
    legacyFormData = profileSnap.data()?.formData || {};
  }

  // Check if past registrations exist for this student to determine past ID verification & fallback data
  let isIdVerified = false;
  const [pastCanonicalSnap, pastLegacySnap] = await Promise.all([
    adminDb.collection("tripRegistrations").where("uid", "==", uid).get(),
    adminDb.collection("user-registrations").where("email", "==", email).get(),
  ]);

  const allPastDocs = [...pastCanonicalSnap.docs, ...pastLegacySnap.docs];

  if (allPastDocs.length > 0) {
    isIdVerified = allPastDocs.some((d) => d.data().studentIdVerified === true);

    if (Object.keys(legacyFormData).length === 0) {
      const sorted = [...allPastDocs].sort((a, b) => {
        const tA = a.data().submittedAt?.toDate?.()?.getTime() || 0;
        const tB = b.data().submittedAt?.toDate?.()?.getTime() || 0;
        return tB - tA;
      });
      legacyFormData = sorted[0].data()?.formData || {};
    }
  }

  const extracted = extractStudentFieldsFromFormData(legacyFormData);

  const initialDoc: Record<string, any> = {
    uid,
    email,
    name: extracted.name || defaultName || "",
    studentId: extracted.studentId || "",
    gender: extracted.gender || "unknown",
    dob: extracted.dob || "",
    phone: extracted.phone || "",
    whatsapp: extracted.whatsapp || extracted.phone || "",
    residence: extracted.residence || "",
    state: extracted.state && isValidState(extracted.state) ? canonicalizeState(extracted.state) || "" : "",
    cityDistrict:
      extracted.cityDistrict && extracted.state && isValidDistrict(extracted.state, extracted.cityDistrict)
        ? canonicalizeDistrict(extracted.state, extracted.cityDistrict) || ""
        : "",
    studentIdVerified: isIdVerified,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await studentDocRef.set(initialDoc);

  const createdSnap = await studentDocRef.get();
  return serializeStudentDoc(createdSnap.data() || initialDoc);
}

/**
 * Safely update an existing student document in students/{uid}.
 * Protects immutable fields (uid, email, studentIdVerified, createdAt).
 */
export async function updateStudentProfile(
  uid: string,
  updates: Record<string, any>
): Promise<StudentDocument> {
  if (!uid) {
    throw new Error("Missing uid for student update");
  }

  const allowedKeys = [
    "name",
    "studentId",
    "gender",
    "dob",
    "phone",
    "whatsapp",
    "residence",
    "state",
    "cityDistrict",
  ];
  const sanitizedUpdates: Record<string, any> = {};

  for (const key of allowedKeys) {
    if (updates[key] !== undefined && typeof updates[key] === "string") {
      sanitizedUpdates[key] = updates[key].trim();
    }
  }

  if (Object.keys(sanitizedUpdates).length === 0) {
    throw new Error("No valid fields provided for profile update.");
  }

  // Server-side validation for state and cityDistrict
  if (sanitizedUpdates.state !== undefined) {
    if (!sanitizedUpdates.state || !isValidState(sanitizedUpdates.state)) {
      throw new Error("Invalid state: Please select a valid Indian State or Union Territory.");
    }
    sanitizedUpdates.state = canonicalizeState(sanitizedUpdates.state)!;
  }

  if (sanitizedUpdates.cityDistrict !== undefined) {
    let targetState = sanitizedUpdates.state;
    if (!targetState) {
      const existingSnap = await adminDb.collection("students").doc(uid).get();
      targetState = existingSnap.data()?.state;
    }
    if (!targetState) {
      throw new Error("Please select your state before selecting a city or district.");
    }
    if (!sanitizedUpdates.cityDistrict || !isValidDistrict(targetState, sanitizedUpdates.cityDistrict)) {
      throw new Error(`Invalid city/district "${sanitizedUpdates.cityDistrict}" for state "${targetState}".`);
    }
    sanitizedUpdates.cityDistrict = canonicalizeDistrict(targetState, sanitizedUpdates.cityDistrict)!;
  }

  sanitizedUpdates.updatedAt = FieldValue.serverTimestamp();

  const studentDocRef = adminDb.collection("students").doc(uid);
  await studentDocRef.set(sanitizedUpdates, { merge: true });

  const updatedSnap = await studentDocRef.get();
  const studentData = updatedSnap.data() || {};

  // Maintain backward compatibility: sync known attributes to user_profiles/{email}
  if (studentData.email) {
    const profileRef = adminDb.collection("user_profiles").doc(studentData.email);
    const formDataUpdates: Record<string, any> = {};
    if (sanitizedUpdates.name) formDataUpdates["Full Name"] = sanitizedUpdates.name;
    if (sanitizedUpdates.studentId) formDataUpdates["Roll Number"] = sanitizedUpdates.studentId;
    if (sanitizedUpdates.phone) formDataUpdates["Contact Number"] = sanitizedUpdates.phone;
    if (sanitizedUpdates.gender) formDataUpdates["Gender"] = sanitizedUpdates.gender;
    if (sanitizedUpdates.state) formDataUpdates["State"] = sanitizedUpdates.state;
    if (sanitizedUpdates.cityDistrict) formDataUpdates["City / District"] = sanitizedUpdates.cityDistrict;

    await profileRef.set(
      {
        email: studentData.email,
        uid,
        formData: formDataUpdates,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return serializeStudentDoc(studentData);
}

/**
 * Synchronize profile data into students/{uid} from incoming trip registration formData.
 */
export async function syncStudentFromRegistration(
  uid: string,
  email: string,
  formData: Record<string, any>,
  isIdVerified?: boolean
): Promise<void> {
  if (!uid || !email) return;

  try {
    // Ensure the student document exists first
    await getOrCreateStudentProfile(uid, email);

    const extracted = extractStudentFieldsFromFormData(formData || {});
    const updatePayload: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (extracted.name) updatePayload.name = extracted.name;
    if (extracted.studentId) updatePayload.studentId = extracted.studentId;
    if (extracted.gender && extracted.gender !== "unknown") updatePayload.gender = extracted.gender;
    if (extracted.dob) updatePayload.dob = extracted.dob;
    if (extracted.phone) updatePayload.phone = extracted.phone;
    if (extracted.whatsapp) updatePayload.whatsapp = extracted.whatsapp;
    if (extracted.residence) updatePayload.residence = extracted.residence;
    if (extracted.state && isValidState(extracted.state)) {
      updatePayload.state = canonicalizeState(extracted.state);
    }
    if (extracted.cityDistrict) {
      const targetState =
        updatePayload.state ||
        (await adminDb.collection("students").doc(uid).get()).data()?.state;
      if (targetState && isValidDistrict(targetState, extracted.cityDistrict)) {
        updatePayload.cityDistrict = canonicalizeDistrict(targetState, extracted.cityDistrict);
      }
    }
    if (isIdVerified === true) updatePayload.studentIdVerified = true;

    if (Object.keys(updatePayload).length > 1) {
      await adminDb.collection("students").doc(uid).set(updatePayload, { merge: true });
    }
  } catch (err) {
    console.error("Error syncing student profile from registration:", err);
  }
}
