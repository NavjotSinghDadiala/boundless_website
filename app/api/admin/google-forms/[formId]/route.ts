import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/coordinatorAuth";
import { adminDb } from "@/lib/firebase-admin";
import { updateGoogleFormDefinition } from "@/lib/googleForms";
import { formatIsoTimestamp } from "@/lib/tripRegistration";

/**
 * GET /api/admin/google-forms/[formId]
 * Get details for a specific Google Form definition. Admin-only.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const isAdmin = await isAuthorizedAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized access: Admin session required." },
        { status: 401 }
      );
    }

    const { formId } = await params;
    if (!formId) {
      return NextResponse.json({ error: "formId is required" }, { status: 400 });
    }

    const docSnap = await adminDb.collection("googleForms").doc(formId).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: `Google Form '${formId}' not found.` }, { status: 404 });
    }

    const d = docSnap.data() || {};
    const form = {
      formId: docSnap.id,
      tripId: d.tripId || "",
      name: d.name || "",
      description: d.description || "",
      type: "google_form",
      status: d.status || "active",
      formUrl: d.formUrl || d.url || "",
      tokenFieldEntryId: d.tokenFieldEntryId || "",
      emailFieldEntryId: d.emailFieldEntryId || "",
      studentIdFieldEntryId: d.studentIdFieldEntryId || "",
      responseKey: d.responseKey || "",
      fieldMappings: d.fieldMappings || {},
      createdAt: formatIsoTimestamp(d.createdAt),
      updatedAt: formatIsoTimestamp(d.updatedAt),
      createdBy: d.createdBy || "",
    };

    return NextResponse.json({ form }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/admin/google-forms/[formId] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Google Form" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/google-forms/[formId]
 * Update a specific Google Form definition. Admin-only.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const isAdmin = await isAuthorizedAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized access: Admin session required." },
        { status: 401 }
      );
    }

    const { formId } = await params;
    if (!formId) {
      return NextResponse.json({ error: "formId is required" }, { status: 400 });
    }

    const body = await req.json();
    const updates = body.updates || body;

    const updatedForm = await updateGoogleFormDefinition(formId, updates);
    return NextResponse.json({ success: true, form: updatedForm }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/admin/google-forms/[formId] Error:", error);
    const statusCode = error.message?.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to update Google Form" },
      { status: statusCode }
    );
  }
}
