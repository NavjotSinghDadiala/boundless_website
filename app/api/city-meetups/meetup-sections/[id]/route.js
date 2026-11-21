import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";

export async function DELETE(request, { params }) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(request);
    } catch (authErr) {
      return NextResponse.json(
        { error: authErr.message || "Unauthorized" },
        { status: authErr.status || 401 }
      );
    }

    const resolvedParams = await params;
    const id = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "Section ID is required." }, { status: 400 });
    }

    const docRef = adminDb.collection("meetup_sections").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    await docRef.delete();

    await recordAuditLog(admin, "DELETE_MEETUP_SECTION", "meetup_section", id, "success", {
      name: snap.data()?.name || "",
    }).catch(() => {});

    return NextResponse.json({ message: "Section deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(request);
    } catch (authErr) {
      return NextResponse.json(
        { error: authErr.message || "Unauthorized" },
        { status: authErr.status || 401 }
      );
    }

    const resolvedParams = await params;
    const id = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "Section ID is required." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Section name is required" }, { status: 400 });
    }

    const docRef = adminDb.collection("meetup_sections").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    await docRef.update({
      name,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await recordAuditLog(admin, "UPDATE_MEETUP_SECTION", "meetup_section", id, "success", {
      name,
    }).catch(() => {});

    return NextResponse.json({ message: "Section updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}
