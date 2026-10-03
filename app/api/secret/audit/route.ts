import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireSecretAccess } from "@/lib/adminAuth";

/**
 * GET /api/secret/audit
 * Filter and query immutable audit log records.
 */
export async function GET(req: Request) {
  try {
    await requireSecretAccess(req);

    const { searchParams } = new URL(req.url);
    const limitParam = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 10), 200);
    const actionFilter = (searchParams.get("action") || "").toUpperCase().trim();
    const resultFilter = (searchParams.get("result") || "").toLowerCase().trim();
    const actorFilter = (searchParams.get("actor") || "").toLowerCase().trim();

    let query: FirebaseFirestore.Query = adminDb.collection("adminAuditLogs");

    // Fetch ordered by timestamp desc
    query = query.orderBy("timestamp", "desc").limit(limitParam);

    const snap = await query.get();
    let logs: any[] = [];

    snap.forEach((doc) => {
      const data = doc.data() || {};
      const studentId = String(data.actorStudentId || "").toLowerCase();
      const email = String(data.actorEmail || "").toLowerCase();
      const name = String(data.actorName || "").toLowerCase();
      const action = String(data.action || "").toUpperCase();
      const result = String(data.result || "").toLowerCase();

      // In-memory filters if specified
      if (actionFilter && !action.includes(actionFilter)) return;
      if (resultFilter && resultFilter !== "all" && result !== resultFilter) return;
      if (actorFilter && !studentId.includes(actorFilter) && !email.includes(actorFilter) && !name.includes(actorFilter)) return;

      logs.push({
        id: doc.id,
        actorStudentId: data.actorStudentId || "SYSTEM",
        actorEmail: data.actorEmail || "system@boundlesssociety.in",
        actorName: data.actorName || "System",
        actorUid: data.actorUid || "",
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        result: data.result,
        timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp) : null,
        metadata: data.metadata || {},
      });
    });

    return NextResponse.json({ logs, total: logs.length }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/secret/audit error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch audit logs." }, { status: error.status || 500 });
  }
}
