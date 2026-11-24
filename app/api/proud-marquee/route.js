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
import { curvedMarque } from "@/data/curvedMarquee";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

// Function to seed Firestore if empty
async function seedIfEmpty() {
  try {
    const marqueeRef = adminDb.collection("proud_marquee");
    const qSnapshot = await marqueeRef.limit(1).get();
    if (qSnapshot.empty) {
      console.log("Proud marquee collection is empty. Seeding initial data...");
      const batch = adminDb.batch();
      curvedMarque.forEach((m, idx) => {
        const docRef = marqueeRef.doc();
        batch.set(docRef, {
          title: m.title,
          img: m.img || "",
          sortOrder: idx,
          createdAt: new Date(),
        });
      });
      await batch.commit();
      console.log("Successfully seeded proud marquee items.");
    }
  } catch (error) {
    console.error("Error seeding proud marquee:", error);
  }
}

/* GET All Marquee Items OR Single Item (if ?id= is passed) */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const docSnap = await adminDb.collection("proud_marquee").doc(id).get();
      if (!docSnap.exists) {
        return NextResponse.json({ error: "Marquee item not found" }, { status: 404 });
      }
      return NextResponse.json(
        { id: docSnap.id, ...docSnap.data() },
        { status: 200, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { data, cacheStatus } = await getOrSetCacheWithMeta(
      CACHE_KEYS.HOMEPAGE_PROUD_MARQUEE,
      CACHE_TTLS.HOMEPAGE,
      async () => {
        await seedIfEmpty();

        const querySnapshot = await adminDb
          .collection("proud_marquee")
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
      { marquee: data },
      { status: 200, headers: { ...PUBLIC_CACHE_HEADERS, "X-Cache": cacheStatus } }
    );
  } catch (error) {
    console.error("GET Marquee Error:", error);
    return NextResponse.json({ error: "Failed to fetch marquee items" }, { status: 500 });
  }
}

/* POST: Save new marquee item */
export async function POST(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    if (!body.title || !body.img) {
      return NextResponse.json({ error: "Title and image are required" }, { status: 400 });
    }

    const marqueeData = {
      title: body.title,
      img: body.img,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (body.sortOrder !== undefined) {
      marqueeData.sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : parseInt(body.sortOrder) || 0;
    }

    const docRef = await adminDb.collection("proud_marquee").add(marqueeData);

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_PROUD_MARQUEE);

    await recordAuditLog(admin, "CREATE_PROUD_MARQUEE", "proud_marquee", docRef.id, "success", {
      title: body.title,
    }).catch(() => {});

    return NextResponse.json({ message: "Marquee item added", id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("POST Marquee Error:", error);
    return NextResponse.json({ error: "Failed to save marquee item" }, { status: 500 });
  }
}

/* PUT: Update marquee item */
export async function PUT(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    const { id, title, img, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const updateData = {
      title,
      img: img || "",
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (sortOrder !== undefined) {
      updateData.sortOrder = typeof sortOrder === "number" ? sortOrder : parseInt(sortOrder) || 0;
    }

    await adminDb.collection("proud_marquee").doc(id).update(updateData);

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_PROUD_MARQUEE);

    await recordAuditLog(admin, "UPDATE_PROUD_MARQUEE", "proud_marquee", id, "success", {
      title,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Marquee item updated" }, { status: 200 });
  } catch (error) {
    console.error("PUT Marquee Error:", error);
    return NextResponse.json({ error: "Failed to update marquee item" }, { status: 500 });
  }
}

/* DELETE: Remove marquee item */
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

    await adminDb.collection("proud_marquee").doc(id).delete();

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_PROUD_MARQUEE);

    await recordAuditLog(admin, "DELETE_PROUD_MARQUEE", "proud_marquee", id, "success").catch(() => {});

    return NextResponse.json({ success: true, message: "Marquee item deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Marquee Error:", error);
    return NextResponse.json({ error: "Failed to delete marquee item" }, { status: 500 });
  }
}
