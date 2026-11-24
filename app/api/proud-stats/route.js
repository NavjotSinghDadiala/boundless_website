import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";
import {
  CACHE_KEYS,
  CACHE_TTLS,
  getOrSetCacheWithMeta,
  invalidateCacheKeys,
} from "@/lib/cache/redisCache";

// Import local data for seeding
import { stats } from "@/data/stats";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

// Function to seed Firestore if empty
async function seedIfEmpty() {
  try {
    const statsRef = adminDb.collection("proud_stats");
    const qSnapshot = await statsRef.limit(1).get();
    if (qSnapshot.empty) {
      console.log("Proud stats collection is empty. Seeding initial data...");
      const batch = adminDb.batch();
      stats.forEach((s, idx) => {
        const docRef = statsRef.doc();
        batch.set(docRef, {
          number: typeof s.number === "number" ? s.number : parseInt(s.number) || 0,
          label: s.label,
          sortOrder: idx,
          createdAt: new Date(),
        });
      });
      await batch.commit();
      console.log("Successfully seeded proud stats.");
    }
  } catch (error) {
    console.error("Error seeding proud stats:", error);
  }
}

/* GET All Stats OR Single Stat (if ?id= is passed) */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const docSnap = await adminDb.collection("proud_stats").doc(id).get();
      if (!docSnap.exists) {
        return NextResponse.json({ error: "Stat not found" }, { status: 404 });
      }
      return NextResponse.json(
        { id: docSnap.id, ...docSnap.data() },
        { status: 200, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { data, cacheStatus } = await getOrSetCacheWithMeta(
      CACHE_KEYS.HOMEPAGE_PROUD_STATS,
      CACHE_TTLS.HOMEPAGE,
      async () => {
        await seedIfEmpty();

        const querySnapshot = await adminDb
          .collection("proud_stats")
          .orderBy("createdAt", "desc")
          .get();

        const list = querySnapshot.docs.map((d) => {
          const raw = d.data() || {};
          return {
            id: d.id,
            ...raw,
            createdAt: raw.createdAt?.toDate ? raw.createdAt.toDate().toISOString() : (raw.createdAt ?? null),
            updatedAt: raw.updatedAt?.toDate ? raw.updatedAt.toDate().toISOString() : (raw.updatedAt ?? null),
          };
        });

        list.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        return list;
      }
    );

    return NextResponse.json(
      { stats: data },
      { status: 200, headers: { ...PUBLIC_CACHE_HEADERS, "X-Cache": cacheStatus } }
    );
  } catch (error) {
    console.error("GET Stats Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

/* POST: Save new stat */
export async function POST(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    if (body.number === undefined || !body.label) {
      return NextResponse.json({ error: "Number and label are required" }, { status: 400 });
    }

    const statData = {
      number: typeof body.number === "number" ? body.number : parseInt(body.number) || 0,
      label: body.label,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (body.sortOrder !== undefined) {
      statData.sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : parseInt(body.sortOrder) || 0;
    }

    const docRef = await adminDb.collection("proud_stats").add(statData);

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_PROUD_STATS);

    await recordAuditLog(admin, "CREATE_PROUD_STAT", "proud_stat", docRef.id, "success", {
      label: body.label,
      number: statData.number,
    }).catch(() => {});

    return NextResponse.json({ message: "Stat added", id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("POST Stats Error:", error);
    return NextResponse.json({ error: "Failed to save stat" }, { status: 500 });
  }
}

/* PUT: Update stat */
export async function PUT(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    const { id, number, label, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const updateData = {
      number: typeof number === "number" ? number : parseInt(number) || 0,
      label,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (sortOrder !== undefined) {
      updateData.sortOrder = typeof sortOrder === "number" ? sortOrder : parseInt(sortOrder) || 0;
    }

    await adminDb.collection("proud_stats").doc(id).update(updateData);

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_PROUD_STATS);

    await recordAuditLog(admin, "UPDATE_PROUD_STAT", "proud_stat", id, "success", {
      label,
      number: updateData.number,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Stat updated" }, { status: 200 });
  } catch (error) {
    console.error("PUT Stats Error:", error);
    return NextResponse.json({ error: "Failed to update stat" }, { status: 500 });
  }
}

/* DELETE: Remove stat */
export async function DELETE(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await adminDb.collection("proud_stats").doc(id).delete();

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_PROUD_STATS);

    await recordAuditLog(admin, "DELETE_PROUD_STAT", "proud_stat", id, "success").catch(() => {});

    return NextResponse.json({ success: true, message: "Stat deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Stat Error:", error);
    return NextResponse.json({ error: "Failed to delete stat" }, { status: 500 });
  }
}
