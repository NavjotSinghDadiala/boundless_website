import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/coordinatorAuth";
import {
  createGoogleFormDefinition,
  getGoogleFormsForTrip,
  updateGoogleFormDefinition,
} from "@/lib/googleForms";

/**
 * GET /api/admin/google-forms?tripId=...
 * Retrieve all registered Google Forms for a trip. Admin-only.
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

    if (!tripId) {
      return NextResponse.json({ error: "tripId query parameter is required" }, { status: 400 });
    }

    const forms = await getGoogleFormsForTrip(tripId);
    return NextResponse.json({ forms }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/google-forms Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Google Forms" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/google-forms
 * Register a new Google Form definition for a trip. Admin-only.
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
      name,
      description,
      status,
      formUrl,
      tokenFieldEntryId,
      emailFieldEntryId,
      studentIdFieldEntryId,
      responseKey,
      fieldMappings,
    } = body;

    if (!formId || !tripId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: formId, tripId, and name are required." },
        { status: 400 }
      );
    }

    const form = await createGoogleFormDefinition({
      formId,
      tripId,
      name,
      description,
      status,
      formUrl,
      tokenFieldEntryId,
      emailFieldEntryId,
      studentIdFieldEntryId,
      responseKey,
      fieldMappings,
    });

    return NextResponse.json({ success: true, form }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/google-forms Error:", error);
    const statusCode = error.message?.includes("already exists") || error.message?.includes("does not exist")
      ? 400
      : 500;
    return NextResponse.json(
      { error: error.message || "Failed to register Google Form" },
      { status: statusCode }
    );
  }
}

/**
 * PATCH /api/admin/google-forms
 * Update an existing Google Form definition. Admin-only.
 */
export async function PATCH(req: Request) {
  try {
    const isAdmin = await isAuthorizedAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized access: Admin session required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { formId, updates } = body;

    if (!formId || !updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Missing required fields: formId and updates object are required." },
        { status: 400 }
      );
    }

    const updatedForm = await updateGoogleFormDefinition(formId, updates);
    return NextResponse.json({ success: true, form: updatedForm }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/admin/google-forms Error:", error);
    const statusCode = error.message?.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to update Google Form" },
      { status: statusCode }
    );
  }
}
