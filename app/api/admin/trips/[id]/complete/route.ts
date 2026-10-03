import { NextResponse } from "next/server";
import { requireFullAdmin } from "@/lib/adminAuth";
import { completeTripAndRecordHistory } from "@/lib/tripHistory";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/trips/[id]/complete
 * 
 * Authoritatively marks a trip as completed and indexes historical participant data
 * into previousTripRecords/{tripId} without destroying or altering original registrations.
 * Strictly requires Full Administrator privileges.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let admin = null;
    try {
      admin = await requireFullAdmin(request, { resourceType: "trip" });
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Full Administrator access required." }, { status: authErr.status || 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing trip ID." }, { status: 400 });
    }

    const result = await completeTripAndRecordHistory(id, admin);

    return NextResponse.json({
      success: true,
      message: `Trip "${result.record.tripName}" successfully completed and indexed into historical records.`,
      record: result.record,
    }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/admin/trips/[id]/complete error:", error);
    return NextResponse.json({ error: error.message || "Failed to complete trip." }, { status: 500 });
  }
}
