import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireSecretAccess } from "@/lib/adminAuth";

/**
 * GET /api/secret/overview
 * Provides high-level security stats, counts, and recent activity.
 */
export async function GET(req: Request) {
  try {
    await requireSecretAccess(req);

    // 1. Fetch admin users count and breakdown
    const adminSnap = await adminDb.collection("adminUsers").get();
    let totalAdmins = 0;
    let activeFullAdmins = 0;
    let activeStandardAdmins = 0;
    let revokedAdmins = 0;

    adminSnap.forEach((doc) => {
      const data = doc.data() || {};
      totalAdmins++;
      const isActive = data.active !== false;
      if (!isActive) {
        revokedAdmins++;
      } else if (data.permissionLevel === "full") {
        activeFullAdmins++;
      } else {
        activeStandardAdmins++;
      }
    });

    // 2. Fetch coordinator counts
    const coordinatorsSnap = await adminDb.collection("coordinators").get();
    let totalCoordinators = 0;
    let activeCoordinators = 0;
    coordinatorsSnap.forEach((doc) => {
      totalCoordinators++;
      if (doc.data()?.active !== false) activeCoordinators++;
    });

    // 3. Fetch audit logs summary
    const auditLogsSnap = await adminDb
      .collection("adminAuditLogs")
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();

    let deniedAttemptsCount = 0;
    const recentActivity: any[] = [];

    auditLogsSnap.forEach((doc) => {
      const data = doc.data() || {};
      if (data.result === "denied") {
        deniedAttemptsCount++;
      }
      if (recentActivity.length < 10) {
        recentActivity.push({
          id: doc.id,
          actorStudentId: data.actorStudentId || "—",
          actorName: data.actorName || "—",
          actorEmail: data.actorEmail || "—",
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          result: data.result,
          timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp) : null,
          metadata: data.metadata || {},
        });
      }
    });

    return NextResponse.json(
      {
        stats: {
          totalAdmins,
          activeFullAdmins,
          activeStandardAdmins,
          revokedAdmins,
          totalCoordinators,
          activeCoordinators,
          deniedAttemptsCount,
          totalAuditEventsSample: auditLogsSnap.size,
        },
        recentActivity,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET /api/secret/overview error:", error);
    return NextResponse.json({ error: error.message || "Failed to load security overview." }, { status: error.status || 500 });
  }
}
