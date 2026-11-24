import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";
import { serializeTimestamp } from "@/lib/cityMeetups";
import {
  CACHE_KEYS,
  CACHE_TTLS,
  getOrSetCacheWithMeta,
  invalidateCacheKeys,
} from "@/lib/cache/redisCache";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

export async function GET() {
  try {
    const { data: sections, cacheStatus } = await getOrSetCacheWithMeta(
      CACHE_KEYS.MEETUPS_SECTIONS,
      CACHE_TTLS.MEETUPS,
      async () => {
        const querySnapshot = await adminDb.collection("meetup_sections").get();

        const list = querySnapshot.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            id: doc.id,
            ...data,
            createdAt: serializeTimestamp(data.createdAt) ?? data.createdAt ?? null,
          };
        });

        list.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        return list;
      }
    );

    return NextResponse.json(
      { sections },
      { status: 200, headers: { ...PUBLIC_CACHE_HEADERS, "X-Cache": cacheStatus } }
    );
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
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
      return NextResponse.json({ error: "Section name is required." }, { status: 400 });
    }

    const sectionData = {
      name,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (body.priority !== undefined) {
      sectionData.priority = Number(body.priority) || 0;
    }

    const docRef = await adminDb.collection("meetup_sections").add(sectionData);

    await invalidateCacheKeys(CACHE_KEYS.MEETUPS_SECTIONS);

    await recordAuditLog(admin, "CREATE_MEETUP_SECTION", "meetup_section", docRef.id, "success", {
      name,
    }).catch(() => {});

    return NextResponse.json({ message: "Section added", id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("Error adding section:", error);
    return NextResponse.json({ error: "Failed to save section" }, { status: 500 });
  }
}
