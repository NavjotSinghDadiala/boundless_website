import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getCompletedTripRecords } from "@/lib/tripHistory";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/previous-trips
 * 
 * Fetches all completed expeditions and historical trip records.
 * Accessible to Administrators.
 */
export async function GET(request: Request) {
  try {
    try {
      await requireAdmin(request);
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Unauthorized access." }, { status: authErr.status || 401 });
    }

    const trips = await getCompletedTripRecords();

    return NextResponse.json({
      success: true,
      trips,
      count: trips.length,
    }, {
      status: 200,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error: any) {
    console.error("GET /api/admin/previous-trips error:", error);
    return NextResponse.json({ error: "Failed to fetch previous trips." }, { status: 500 });
  }
}
