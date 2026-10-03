import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getStudentsDirectory } from "@/lib/studentDirectory";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/students
 * 
 * Fetches the central student directory with pagination, search, filters, and summary stats.
 * Strictly requires Administrator authorization. Coordinators cannot access.
 */
export async function GET(request: Request) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(request);
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Unauthorized access." }, { status: authErr.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const verification = (searchParams.get("verification") as any) || undefined;
    const hasCompletedTrips = (searchParams.get("hasCompletedTrips") as any) || undefined;
    const hasUpcomingTrips = (searchParams.get("hasUpcomingTrips") as any) || undefined;
    const gender = (searchParams.get("gender") as any) || undefined;
    const state = searchParams.get("state") || undefined;
    const cityDistrict = searchParams.get("cityDistrict") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || undefined;
    const sortOrder = (searchParams.get("sortOrder") as any) || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 20;

    const data = await getStudentsDirectory({
      search,
      verification,
      hasCompletedTrips,
      hasUpcomingTrips,
      gender,
      state,
      cityDistrict,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error: any) {
    console.error("GET /api/admin/students error:", error);
    return NextResponse.json({ error: "Failed to fetch student directory." }, { status: 500 });
  }
}
