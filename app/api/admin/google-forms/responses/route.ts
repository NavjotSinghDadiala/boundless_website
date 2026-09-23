import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/coordinatorAuth";
import {
  ingestExternalFormResponse,
  getTripExternalFormResponses,
} from "@/lib/googleForms";

/**
 * GET /api/admin/google-forms/responses?tripId=...&formId=...
 * Inspect external form responses (both matched and unmatched intake records) for a trip. Admin-only.
 */
export async function GET(req: Request) {
  try {
    const isAdmin = await isAuthorizedAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized access: Admin session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");
    const formId = searchParams.get("formId") || undefined;

    if (!tripId) {
      return NextResponse.json({ error: "tripId query parameter is required" }, { status: 400 });
    }

    const responses = await getTripExternalFormResponses(tripId, formId);
    return NextResponse.json(responses, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/google-forms/responses Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch form responses" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/google-forms/responses
 * Ingest an external Google Form response.
 * Runs deterministic matching pipeline against canonical trip registrations.
 * Admin-only protected endpoint.
 */
export async function POST(req: Request) {
  try {
    const isAdmin = await isAuthorizedAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized access: Admin session required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      formId,
      tripId,
      responseId,
      submittedAt,
      candidateToken,
      candidateUid,
      candidateEmail,
      candidateStudentId,
      data,
    } = body;

    if (!formId || !tripId || !responseId) {
      return NextResponse.json(
        { error: "Missing required fields: formId, tripId, and responseId are required." },
        { status: 400 }
      );
    }

    const result = await ingestExternalFormResponse({
      formId,
      tripId,
      responseId,
      submittedAt,
      candidateToken,
      candidateUid,
      candidateEmail,
      candidateStudentId,
      data: data || {},
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/admin/google-forms/responses Error:", error);
    const statusCode =
      error.message?.includes("does not exist") || error.message?.includes("belongs to trip")
        ? 400
        : 500;
    return NextResponse.json(
      { error: error.message || "Failed to ingest external form response" },
      { status: statusCode }
    );
  }
}
