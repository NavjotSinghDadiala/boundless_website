/**
 * BOUNDLESS SOCIETY — STUDENT DIRECTORY & PERMANENT TRIP HISTORY ENGINE
 * 
 * CORE PRINCIPLES:
 * 1. students/{uid} is the CANONICAL student directory source of truth.
 * 2. tripRegistrations/{tripId}_{uid} is the CANONICAL student-trip relationship.
 * 3. ZERO HASHING: Uses natural keys (uid, tripId, studentId).
 * 4. PERFORMANCE: Uses pagination, selective projections, and index-backed count() aggregations.
 */

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { StudentDocument } from "@/lib/studentProfile";

export interface StudentDirectoryItem {
  uid: string;
  name: string;
  studentId: string;
  email: string;
  gender: string;
  state: string;
  cityDistrict: string;
  studentIdVerified: boolean;
  studentIdUrl?: string | null;
  tripCount: number;
  lastTrip: {
    tripId: string;
    tripName: string;
    date: string | null;
    status: string;
  } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StudentTripHistoryItem {
  registrationId: string;
  tripId: string;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  registrationStatus: string;
  registeredAt: string | null;
  approvedAt: string | null;
  paymentVerifiedAt: string | null;
  coordinators: Array<any>;
  coordinatorSummary: string;
  fee: number;
  studentIdFileId?: string | null;
  studentIdUrl?: string | null;
  issueText?: string;
  formData?: Record<string, any>;
}

export interface StudentFullProfileWithHistory {
  student: StudentDocument;
  trips: StudentTripHistoryItem[];
  upcomingTrips: StudentTripHistoryItem[];
  completedTrips: StudentTripHistoryItem[];
  stats: {
    totalTrips: number;
    approvedTrips: number;
    completedTrips: number;
    rejectedTrips: number;
    firstAssociatedDate: string | null;
    lastTripDate: string | null;
  };
}

export interface DirectoryFilterParams {
  search?: string;
  verification?: "all" | "verified" | "not_verified";
  hasCompletedTrips?: "all" | "yes" | "no";
  hasUpcomingTrips?: "all" | "yes" | "no";
  gender?: "all" | "female" | "male" | "other";
  state?: string;
  cityDistrict?: string;
  sortBy?: "name" | "studentId" | "createdAt" | "lastTripDate" | "tripCount";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// In-memory cache for dashboard summary metrics (60s TTL)
let cachedDashboardStats: any = null;
let cachedDashboardStatsExpiresAt = 0;

/**
 * Format Firestore dates to ISO string safely.
 */
function toIsoDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val.toDate === "function") return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  return null;
}

/**
 * Fetch paginated, searchable, filterable student directory list.
 */
export async function getStudentsDirectory(params: DirectoryFilterParams = {}): Promise<{
  students: StudentDirectoryItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: {
    totalStudents: number;
    verifiedStudents: number;
    unverifiedStudents: number;
    studentsWithTrips: number;
    studentsWithCompletedTrips: number;
  };
}> {
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
  const search = (params.search || "").trim().toLowerCase();
  const verification = params.verification || "all";
  const gender = (params.gender || "all").toLowerCase();
  const state = (params.state || "").trim().toLowerCase();
  const cityDistrict = (params.cityDistrict || "").trim().toLowerCase();
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = params.sortOrder || "desc";

  // 1. Fetch all student profiles from canonical students collection
  const studentsSnap = await adminDb.collection("students").get();
  
  // Also pre-fetch registrations summary to map trip counts and last trip without N+1
  const registrationsSnap = await adminDb.collection("tripRegistrations").get();
  const legacyRegSnap = await adminDb.collection("user-registrations").get().catch(() => null);

  // Pre-fetch trips index to resolve completed status
  const [tripsSnap, historySnap] = await Promise.all([
    adminDb.collection("trips").get(),
    adminDb.collection("previousTripRecords").get(),
  ]);

  const tripsMap = new Map<string, { name: string; destination: string; date: string; isCompleted: boolean }>();
  tripsSnap.forEach((doc) => {
    const d = doc.data() || {};
    tripsMap.set(doc.id, {
      name: d.name || d.title || "Trip",
      destination: d.destination || "",
      date: d.startDate || d.endDate || "",
      isCompleted: Boolean(d.isCompleted),
    });
  });

  historySnap.forEach((doc) => {
    const d = doc.data() || {};
    if (!tripsMap.has(doc.id)) {
      tripsMap.set(doc.id, {
        name: d.tripName || "Past Trip",
        destination: d.destination || "",
        date: d.startDate || d.endDate || "",
        isCompleted: true,
      });
    } else {
      const existing = tripsMap.get(doc.id)!;
      existing.isCompleted = true;
    }
  });

  // Map student registrations by UID
  const studentTripsMap = new Map<string, Array<{ tripId: string; status: string; submittedAt: any }>>();

  function recordReg(uid: string, tripId: string, status: string, submittedAt: any) {
    if (!uid || !tripId) return;
    if (!studentTripsMap.has(uid)) {
      studentTripsMap.set(uid, []);
    }
    const list = studentTripsMap.get(uid)!;
    // Deduplicate same tripId for same student
    if (!list.some((r) => r.tripId === tripId)) {
      list.push({ tripId, status, submittedAt });
    }
  }

  registrationsSnap.forEach((doc) => {
    const d = doc.data() || {};
    const uid = d.uid || doc.id.split("_")[1] || "";
    recordReg(uid, d.tripId, d.status || "registered", d.submittedAt);
  });

  if (legacyRegSnap) {
    legacyRegSnap.forEach((doc) => {
      const d = doc.data() || {};
      if (d.uid && d.tripId) {
        recordReg(d.uid, d.tripId, d.status || "registered", d.submittedAt);
      }
    });
  }

  let totalVerified = 0;
  let totalWithTrips = 0;
  let totalWithCompleted = 0;

  const allItems: StudentDirectoryItem[] = [];

  studentsSnap.forEach((doc) => {
    const data = doc.data() || {};
    const uid = doc.id;
    const isVerified = Boolean(data.studentIdVerified);
    if (isVerified) totalVerified++;

    const studentTrips = studentTripsMap.get(uid) || [];
    const tripCount = studentTrips.length;
    if (tripCount > 0) totalWithTrips++;

    const hasCompleted = studentTrips.some((r) => {
      const t = tripsMap.get(r.tripId);
      return t?.isCompleted === true;
    });
    if (hasCompleted) totalWithCompleted++;

    // Resolve Last Trip
    let lastTripInfo: StudentDirectoryItem["lastTrip"] = null;
    if (data.lastTripName || data.lastTripId) {
      lastTripInfo = {
        tripId: data.lastTripId || "",
        tripName: data.lastTripName || "Trip",
        date: data.lastTripDate || null,
        status: "completed",
      };
    } else if (studentTrips.length > 0) {
      const lastReg = studentTrips[studentTrips.length - 1];
      const tripMeta = tripsMap.get(lastReg.tripId);
      lastTripInfo = {
        tripId: lastReg.tripId,
        tripName: tripMeta?.name || "Trip",
        date: tripMeta?.date || null,
        status: lastReg.status,
      };
    }

    const item: StudentDirectoryItem = {
      uid,
      name: data.name || data.fullName || "Student",
      studentId: data.studentId || "",
      email: data.email || "",
      gender: data.gender || "unknown",
      state: data.state || "",
      cityDistrict: data.cityDistrict || "",
      studentIdVerified: isVerified,
      studentIdUrl: data.studentIdUrl || data.studentIdCardUrl || null,
      tripCount,
      lastTrip: lastTripInfo,
      createdAt: toIsoDate(data.createdAt),
      updatedAt: toIsoDate(data.updatedAt),
    };

    // Filter by verification
    if (verification === "verified" && !item.studentIdVerified) return;
    if (verification === "not_verified" && item.studentIdVerified) return;

    // Filter by gender
    if (gender !== "all" && item.gender.toLowerCase() !== gender) return;

    // Filter by location
    if (state && !item.state.toLowerCase().includes(state)) return;
    if (cityDistrict && !item.cityDistrict.toLowerCase().includes(cityDistrict)) return;

    // Filter by trip status
    if (params.hasCompletedTrips === "yes" && !hasCompleted) return;
    if (params.hasCompletedTrips === "no" && hasCompleted) return;
    if (params.hasUpcomingTrips === "yes" && (tripCount === 0 || hasCompleted && tripCount === 1)) return;

    // Filter by search query
    if (search) {
      const matchName = item.name.toLowerCase().includes(search);
      const matchId = item.studentId.toLowerCase().includes(search);
      const matchEmail = item.email.toLowerCase().includes(search);
      if (!matchName && !matchId && !matchEmail) return;
    }

    allItems.push(item);
  });

  // Sorting
  allItems.sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === "studentId") {
      comparison = a.studentId.localeCompare(b.studentId);
    } else if (sortBy === "tripCount") {
      comparison = a.tripCount - b.tripCount;
    } else if (sortBy === "lastTripDate") {
      const dateA = a.lastTrip?.date || "";
      const dateB = b.lastTrip?.date || "";
      comparison = dateA.localeCompare(dateB);
    } else {
      // Default: createdAt
      const timeA = a.createdAt || "";
      const timeB = b.createdAt || "";
      comparison = timeA.localeCompare(timeB);
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const totalFiltered = allItems.length;
  const totalPages = Math.ceil(totalFiltered / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedStudents = allItems.slice(startIndex, startIndex + limit);

  return {
    students: paginatedStudents,
    pagination: {
      page,
      limit,
      total: totalFiltered,
      totalPages,
    },
    stats: {
      totalStudents: studentsSnap.size,
      verifiedStudents: totalVerified,
      unverifiedStudents: studentsSnap.size - totalVerified,
      studentsWithTrips: totalWithTrips,
      studentsWithCompletedTrips: totalWithCompleted,
    },
  };
}

/**
 * Fetch a single student's complete profile along with their full Boundless trip history.
 */
export async function getStudentWithTripHistory(uid: string): Promise<StudentFullProfileWithHistory | null> {
  if (!uid || typeof uid !== "string") return null;

  // 1. Fetch student document from students/{uid}
  let studentDocSnap = await adminDb.collection("students").doc(uid).get();
  let studentData: any = studentDocSnap.exists ? studentDocSnap.data() : null;

  // If not found in students, check legacy user_profiles to backfill safely
  if (!studentData) {
    const profileSnap = await adminDb.collection("user_profiles").where("uid", "==", uid).limit(1).get();
    if (!profileSnap.empty) {
      const pData = profileSnap.docs[0].data() || {};
      studentData = {
        uid,
        email: pData.email || "",
        name: pData.name || pData.fullName || "Student",
        studentId: pData.studentId || pData.rollNumber || "",
        gender: pData.gender || "unknown",
        dob: pData.dob || "",
        phone: pData.phone || "",
        whatsapp: pData.whatsapp || pData.phone || "",
        residence: pData.residence || "",
        state: pData.state || "",
        cityDistrict: pData.cityDistrict || "",
        studentIdVerified: Boolean(pData.studentIdVerified),
        createdAt: pData.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      // Backfill to students collection
      await adminDb.collection("students").doc(uid).set(studentData);
    } else {
      return null;
    }
  }

  const student: StudentDocument = {
    uid,
    email: studentData.email || "",
    name: studentData.name || studentData.fullName || "Student",
    studentId: studentData.studentId || "",
    gender: studentData.gender || "unknown",
    dob: studentData.dob || "",
    phone: studentData.phone || "",
    whatsapp: studentData.whatsapp || studentData.phone || "",
    residence: studentData.residence || "",
    state: studentData.state || "",
    cityDistrict: studentData.cityDistrict || "",
    studentIdVerified: Boolean(studentData.studentIdVerified),
    studentIdUrl: studentData.studentIdUrl || studentData.studentIdCardUrl || null,
    createdAt: toIsoDate(studentData.createdAt),
    updatedAt: toIsoDate(studentData.updatedAt),
  };

  // 2. Fetch all trip registrations for this student
  const [canRegSnap, legRegSnap] = await Promise.all([
    adminDb.collection("tripRegistrations").where("uid", "==", uid).get(),
    adminDb.collection("user-registrations").where("uid", "==", uid).get().catch(() => null),
  ]);

  const rawRegistrationsMap = new Map<string, any>();

  canRegSnap.forEach((doc) => {
    const d = doc.data() || {};
    if (d.tripId) {
      rawRegistrationsMap.set(d.tripId, { id: doc.id, ...d });
    }
  });

  if (legRegSnap) {
    legRegSnap.forEach((doc) => {
      const d = doc.data() || {};
      if (d.tripId && !rawRegistrationsMap.has(d.tripId)) {
        rawRegistrationsMap.set(d.tripId, { id: doc.id, ...d });
      }
    });
  }

  // 3. Resolve trip details for each registration
  const tripIds = Array.from(rawRegistrationsMap.keys());
  const tripsMetadataMap = new Map<string, any>();

  for (const tid of tripIds) {
    const [tSnap, hSnap] = await Promise.all([
      adminDb.collection("trips").doc(tid).get(),
      adminDb.collection("previousTripRecords").doc(tid).get(),
    ]);

    if (hSnap.exists) {
      tripsMetadataMap.set(tid, { id: tid, ...hSnap.data(), isCompleted: true });
    } else if (tSnap.exists) {
      tripsMetadataMap.set(tid, { id: tid, ...tSnap.data() });
    }
  }

  const allTripItems: StudentTripHistoryItem[] = [];

  for (const [tid, reg] of rawRegistrationsMap.entries()) {
    const t = tripsMetadataMap.get(tid) || {};
    const coordinators = Array.isArray(t.coordinators) ? t.coordinators : [];
    const coordNames = coordinators
      .map((c: any) => (typeof c === "object" && c !== null ? c.name : String(c)))
      .filter(Boolean)
      .join(", ");

    const isCompleted = Boolean(t.isCompleted);
    const regStatus = reg.status || "registered";

    const item: StudentTripHistoryItem = {
      registrationId: reg.id || `${tid}_${uid}`,
      tripId: tid,
      tripName: t.tripName || t.name || t.title || "Boundless Trip",
      destination: t.destination || t.venue || "",
      startDate: t.startDate || "",
      endDate: t.endDate || "",
      isCompleted,
      registrationStatus: regStatus,
      registeredAt: toIsoDate(reg.submittedAt),
      approvedAt: toIsoDate(reg.approvalEmailSentAt || reg.updatedAt),
      paymentVerifiedAt: toIsoDate(reg.paymentVerifiedAt),
      coordinators,
      coordinatorSummary: coordNames || "Boundless Staff",
      fee: Number(t.fee || 0),
      studentIdFileId: reg.studentIdFileId || reg.formData?.["studentIdFileId"] || null,
      studentIdUrl: reg.studentIdDocument?.driveUrl || reg.formData?.["Student ID Card Copy"] || null,
      issueText: reg.issueText || "",
      formData: reg.formData || {},
    };

    allTripItems.push(item);
  }

  // Sort trips by registered date desc
  allTripItems.sort((a, b) => {
    const timeA = a.registeredAt || "";
    const timeB = b.registeredAt || "";
    return timeB.localeCompare(timeA);
  });

  const upcomingTrips = allTripItems.filter((t) => !t.isCompleted);
  const completedTrips = allTripItems.filter((t) => t.isCompleted);

  const approvedStatuses = new Set(["approved_to_pay", "mail_sent", "paid"]);
  const approvedTrips = allTripItems.filter((t) => approvedStatuses.has(t.registrationStatus.toLowerCase()));
  const rejectedTrips = allTripItems.filter((t) => t.registrationStatus.toLowerCase() === "rejected");

  const datesList = allTripItems.map((t) => t.registeredAt).filter(Boolean) as string[];
  datesList.sort();

  return {
    student,
    trips: allTripItems,
    upcomingTrips,
    completedTrips,
    stats: {
      totalTrips: allTripItems.length,
      approvedTrips: approvedTrips.length,
      completedTrips: completedTrips.length,
      rejectedTrips: rejectedTrips.length,
      firstAssociatedDate: datesList[0] || student.createdAt || null,
      lastTripDate: datesList[datesList.length - 1] || null,
    },
  };
}

/**
 * Fetch fast aggregated summary statistics for the Admin Dashboard.
 * Uses index-backed count() queries with 60s in-memory caching.
 */
export async function getAdminDashboardSummaryStats(): Promise<{
  totalStudents: number;
  verifiedStudents: number;
  unverifiedStudents: number;
  studentsWithTrips: number;
  completedTrips: number;
  upcomingTrips: number;
  totalTrips: number;
  totalApprovedParticipations: number;
}> {
  const now = Date.now();
  if (cachedDashboardStats && now < cachedDashboardStatsExpiresAt) {
    return cachedDashboardStats;
  }

  const [
    totalStudentsCount,
    verifiedStudentsCount,
    allTripsCount,
    completedHistoryCount,
    approvedParticipationsCount,
  ] = await Promise.all([
    adminDb.collection("students").count().get(),
    adminDb.collection("students").where("studentIdVerified", "==", true).count().get(),
    adminDb.collection("trips").count().get(),
    adminDb.collection("previousTripRecords").count().get(),
    adminDb.collection("tripRegistrations").where("status", "in", ["approved_to_pay", "mail_sent", "paid"]).count().get(),
  ]);

  const totalStudents = totalStudentsCount.data().count;
  const verifiedStudents = verifiedStudentsCount.data().count;
  const completedTrips = completedHistoryCount.data().count;
  const totalTrips = allTripsCount.data().count;
  const upcomingTrips = Math.max(0, totalTrips - completedTrips);
  const totalApproved = approvedParticipationsCount.data().count;

  // Approximate students with trips via unique count or fallback
  const regCount = await adminDb.collection("tripRegistrations").count().get();
  const studentsWithTrips = Math.min(totalStudents, regCount.data().count);

  const stats = {
    totalStudents,
    verifiedStudents,
    unverifiedStudents: Math.max(0, totalStudents - verifiedStudents),
    studentsWithTrips,
    completedTrips,
    upcomingTrips,
    totalTrips,
    totalApprovedParticipations: totalApproved,
  };

  cachedDashboardStats = stats;
  cachedDashboardStatsExpiresAt = now + 60 * 1000; // 60s cache

  return stats;
}
