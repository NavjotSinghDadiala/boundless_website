import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getCompletedTripWithParticipants } from "@/lib/tripHistory";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/previous-trips/[id]
 * 
 * Fetches completed trip details along with the full historical participants roster.
 * Links each participant to their canonical student profile /admin/students/[uid].
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await requireAdmin(request);
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Unauthorized access." }, { status: authErr.status || 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing trip ID" }, { status: 400 });
    }

    const result = await getCompletedTripWithParticipants(id);

    if (!result.trip) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      trip: result.trip,
      participants: result.participants,
      participantCount: result.participants.length,
    }, {
      status: 200,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error: any) {
    console.error("GET /api/admin/previous-trips/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch historical trip details." }, { status: 500 });
  }
}
