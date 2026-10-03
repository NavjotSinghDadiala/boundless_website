import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getAdminDashboardSummaryStats } from "@/lib/studentDirectory";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dashboard-stats
 * 
 * Returns real, aggregated counts for:
 * - Total Students (unique students/{uid})
 * - Verified Students
 * - Unverified Students
 * - Students with trips
 * - Completed trips
 * - Upcoming trips
 * - Total approved participations
 * 
 * Uses index-backed count() aggregations with 60s in-memory caching.
 */
export async function GET(request: Request) {
  try {
    try {
      await requireAdmin(request);
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Unauthorized access." }, { status: authErr.status || 401 });
    }

    const stats = await getAdminDashboardSummaryStats();

    return NextResponse.json({
      success: true,
      stats,
    }, {
      status: 200,
      headers: { "Cache-Control": "private, s-maxage=30, max-age=30" },
    });
  } catch (error: any) {
    console.error("GET /api/admin/dashboard-stats error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard statistics." }, { status: 500 });
  }
}
