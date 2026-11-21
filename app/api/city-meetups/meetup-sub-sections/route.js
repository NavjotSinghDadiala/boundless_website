import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";
import { serializeTimestamp } from "@/lib/cityMeetups";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId")?.trim();

    let queryRef = adminDb.collection("meetup_sub_sections");
    if (sectionId) {
      queryRef = queryRef.where("sectionId", "==", sectionId);
    }

    const querySnapshot = await queryRef.get();

    const subSections = querySnapshot.docs
      .map((doc) => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          ...data,
          createdAt: serializeTimestamp(data.createdAt) ?? data.createdAt ?? null,
        };
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

    return NextResponse.json({ subSections }, { status: 200 });
  } catch (error) {
    console.error("Error fetching sub-sections:", error);
    return NextResponse.json({ error: "Failed to fetch sub-sections" }, { status: 500 });
  }
}

export async function POST(request) {
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

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Sub-section name is required." }, { status: 400 });
    }

    const subSectionData = {
      name,
      sectionId: typeof body.sectionId === "string" && body.sectionId.trim() ? body.sectionId.trim() : null,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (body.priority !== undefined) {
      subSectionData.priority = Number(body.priority) || 0;
    }

    const docRef = await adminDb.collection("meetup_sub_sections").add(subSectionData);

    await recordAuditLog(admin, "CREATE_MEETUP_SUB_SECTION", "meetup_sub_section", docRef.id, "success", {
      name,
      sectionId: subSectionData.sectionId,
    }).catch(() => {});

    return NextResponse.json({ message: "Sub Section added", id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("Error adding sub-section:", error);
    return NextResponse.json({ error: "Failed to save sub-section" }, { status: 500 });
  }
}
