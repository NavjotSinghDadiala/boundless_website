import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sanitizeMediaUrls } from "@/lib/previous-trip-media";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";
import {
  CACHE_KEYS,
  CACHE_TTLS,
  getOrSetCacheWithMeta,
  invalidateCacheKeys,
} from "@/lib/cache/redisCache";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

/* GET All Trips OR Single Trip (if ?id= is passed) */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Fetch single item for the Edit page
    if (id) {
      const docSnap = await adminDb.collection("previous_trips").doc(id).get();
      if (!docSnap.exists) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      return NextResponse.json(
        { id: docSnap.id, ...docSnap.data() },
        { status: 200, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // Fetch all items for the Manage List page
    const { data: trips, cacheStatus } = await getOrSetCacheWithMeta(
      CACHE_KEYS.HOMEPAGE_PREVIOUS_TRIPS,
      CACHE_TTLS.HOMEPAGE,
      async () => {
        const querySnapshot = await adminDb
          .collection("previous_trips")
          .orderBy("createdAt", "desc")
          .get();

        return querySnapshot.docs.map((d) => {
          const raw = d.data() || {};
          return {
            id: d.id,
            ...raw,
            createdAt: raw.createdAt?.toDate ? raw.createdAt.toDate().toISOString() : (raw.createdAt ?? null),
            updatedAt: raw.updatedAt?.toDate ? raw.updatedAt.toDate().toISOString() : (raw.updatedAt ?? null),
          };
        });
      }
    );

    return NextResponse.json(
      { trips },
      { status: 200, headers: { ...PUBLIC_CACHE_HEADERS, "X-Cache": cacheStatus } }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}

/* POST: Save a new trip */
export async function POST(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    const tripData = {
      heading: body.heading,
      subHeading: body.subHeading,
      img: body.img, 
      link: body.link || "",
      
      // New fields
      venue: body.venue || "",
      participants: body.participants !== undefined ? Number(body.participants) : 0,
      summary: body.summary || "",
      graphData: Array.isArray(body.graphData) ? body.graphData.map(item => ({
        x: item.x !== undefined ? String(item.x) : "",
        y: item.y !== undefined ? String(item.y) : ""
      })) : [],
      photos: sanitizeMediaUrls(body.photos),
      videos: sanitizeMediaUrls(body.videos),
      
      createdAt: FieldValue.serverTimestamp(),
    };
    const docRef = await adminDb.collection("previous_trips").add(tripData);

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_PREVIOUS_TRIPS);

    recordAuditLog(admin, "CREATE_PREVIOUS_TRIP", "previous_trip", docRef.id, "success", {
      heading: body.heading,
      venue: body.venue,
    }).catch(() => {});

    return NextResponse.json({ message: "Trip added", id: docRef.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save trip" }, { status: 500 });
  }
}

/* PUT: Update trip */
export async function PUT(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    const {
      id,
      heading,
      subHeading, 
      img, 
      link,
      venue,
      participants,
      summary,
      graphData,
      photos,
      videos,
    } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await adminDb.collection("previous_trips").doc(id).update({
      heading, 
      subHeading, 
      img, 
      link: link || "",
      venue: venue || "",
      participants: participants !== undefined ? Number(participants) : 0,
      summary: summary || "",
      graphData: Array.isArray(graphData) ? graphData.map(item => ({
        x: item.x !== undefined ? String(item.x) : "",
        y: item.y !== undefined ? String(item.y) : ""
      })) : [],
      photos: sanitizeMediaUrls(photos),
      videos: sanitizeMediaUrls(videos),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_PREVIOUS_TRIPS);

    recordAuditLog(admin, "UPDATE_PREVIOUS_TRIP", "previous_trip", id, "success", {
      heading,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Trip updated" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

/* DELETE: Remove trip */
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

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await adminDb.collection("previous_trips").doc(id).delete();

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_PREVIOUS_TRIPS);

    recordAuditLog(admin, "DELETE_PREVIOUS_TRIP", "previous_trip", id, "success").catch(() => {});

    return NextResponse.json({ success: true, message: "Trip deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}