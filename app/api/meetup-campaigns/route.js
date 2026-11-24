import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";
import {
  CAMPAIGN_STATUSES,
  normalizeCampaignDoc,
  normalizeCityMeetupDoc,
  parseNonNegativeInt,
  sanitizeSafeUrl,
  sortMeetupsMostRecentFirst,
} from "@/lib/cityMeetups";
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

/* GET -> All Flagship Campaigns OR Single Campaign (?id=, optional ?includeCities=true). Zero writes. */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();
    const includeCities = searchParams.get("includeCities") === "true";

    if (id) {
      const docSnap = await adminDb.collection("meetup_campaigns").doc(id).get();
      if (!docSnap.exists) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const citiesSnap = await adminDb
        .collection("city_meetups")
        .where("campaignId", "==", id)
        .get();

      const cities = sortMeetupsMostRecentFirst(
        citiesSnap.docs.map((c) => normalizeCityMeetupDoc(c.id, c.data() || {}))
      );

      const campaign = normalizeCampaignDoc(docSnap.id, docSnap.data() || {}, cities.length);
      return NextResponse.json(
        includeCities ? { campaign, cities } : { campaign },
        { status: 200, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { data, cacheStatus } = await getOrSetCacheWithMeta(
      CACHE_KEYS.MEETUPS_CAMPAIGNS,
      CACHE_TTLS.MEETUPS,
      async () => {
        const [campaignsSnap, linkedCitiesSnap] = await Promise.all([
          adminDb.collection("meetup_campaigns").get(),
          adminDb.collection("city_meetups").where("meetupType", "==", "campaign_city").get(),
        ]);

        const cityCountMap = new Map();
        linkedCitiesSnap.docs.forEach((doc) => {
          const cId = doc.data()?.campaignId;
          if (typeof cId === "string" && cId.trim()) {
            cityCountMap.set(cId.trim(), (cityCountMap.get(cId.trim()) || 0) + 1);
          }
        });

        const list = campaignsSnap.docs.map((doc) =>
          normalizeCampaignDoc(doc.id, doc.data() || {}, cityCountMap.get(doc.id) || 0)
        );

        // Sort by createdAt desc (preserving existing slider ordering)
        list.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        return list;
      }
    );

    return NextResponse.json(
      { campaigns: data },
      { status: 200, headers: { ...PUBLIC_CACHE_HEADERS, "X-Cache": cacheStatus } }
    );
  } catch (error) {
    console.error("GET Campaigns Error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

/* POST -> Create Flagship Campaign */
export async function POST(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json(
        { error: authErr.message || "Unauthorized" },
        { status: authErr.status || 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const city =
      typeof body.city === "string" && body.city.trim() ? body.city.trim() : title;
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required." },
        { status: 400 }
      );
    }

    const imgCheck = sanitizeSafeUrl(body.img, "img", true);
    if (!imgCheck.ok) {
      return NextResponse.json({ error: imgCheck.error }, { status: 400 });
    }

    const logoCheck = sanitizeSafeUrl(body.logo, "logo", false);
    if (!logoCheck.ok) {
      return NextResponse.json({ error: logoCheck.error }, { status: 400 });
    }

    const status = body.status ? String(body.status).trim() : "published";
    if (!CAMPAIGN_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Expected one of: ${CAMPAIGN_STATUSES.join(", ")}.` },
        { status: 400 }
      );
    }

    const sortCheck = parseNonNegativeInt(body.sortOrder, "sortOrder", 0);
    if (!sortCheck.ok) {
      return NextResponse.json({ error: sortCheck.error }, { status: 400 });
    }

    const campaignData = {
      city,
      title,
      edition: typeof body.edition === "string" ? body.edition.trim() : "",
      description,
      img: imgCheck.value,
      badge: typeof body.badge === "string" ? body.badge.trim() : "",
      logo: logoCheck.value,
      status,
      sortOrder: sortCheck.value,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("meetup_campaigns").add(campaignData);

    await invalidateCacheKeys(CACHE_KEYS.MEETUPS_CAMPAIGNS);

    await recordAuditLog(admin, "CREATE_MEETUP_CAMPAIGN", "meetup_campaign", docRef.id, "success", {
      city,
      title,
      edition: campaignData.edition,
      status,
    }).catch(() => {});

    return NextResponse.json({ message: "Campaign added", id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("POST Campaign Error:", error);
    return NextResponse.json({ error: "Failed to save campaign" }, { status: 500 });
  }
}

/* PUT -> Update Flagship Campaign (Campaign-level metadata only; never mutates child city events) */
export async function PUT(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json(
        { error: authErr.message || "Unauthorized" },
        { status: authErr.status || 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const docRef = adminDb.collection("meetup_campaigns").doc(id);
    const existingSnap = await docRef.get();
    if (!existingSnap.exists) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const updateData = {};

    if (body.title !== undefined) {
      const cleanTitle = typeof body.title === "string" ? body.title.trim() : "";
      if (!cleanTitle) {
        return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
      }
      updateData.title = cleanTitle;
    }

    if (body.city !== undefined) {
      const cleanCity = typeof body.city === "string" ? body.city.trim() : "";
      if (cleanCity) updateData.city = cleanCity;
    }

    if (body.description !== undefined) {
      const cleanDesc = typeof body.description === "string" ? body.description.trim() : "";
      if (!cleanDesc) {
        return NextResponse.json({ error: "Description cannot be empty." }, { status: 400 });
      }
      updateData.description = cleanDesc;
    }

    if (body.edition !== undefined) {
      updateData.edition = typeof body.edition === "string" ? body.edition.trim() : "";
    }

    if (body.badge !== undefined) {
      updateData.badge = typeof body.badge === "string" ? body.badge.trim() : "";
    }

    if (body.img !== undefined) {
      const imgCheck = sanitizeSafeUrl(body.img, "img", false);
      if (!imgCheck.ok) return NextResponse.json({ error: imgCheck.error }, { status: 400 });
      updateData.img = imgCheck.value;
    }

    if (body.logo !== undefined) {
      const logoCheck = sanitizeSafeUrl(body.logo, "logo", false);
      if (!logoCheck.ok) return NextResponse.json({ error: logoCheck.error }, { status: 400 });
      updateData.logo = logoCheck.value;
    }

    if (body.status !== undefined) {
      const nextStatus = String(body.status).trim();
      if (!CAMPAIGN_STATUSES.includes(nextStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Expected one of: ${CAMPAIGN_STATUSES.join(", ")}.` },
          { status: 400 }
        );
      }
      updateData.status = nextStatus;
    }

    if (body.sortOrder !== undefined) {
      const sortCheck = parseNonNegativeInt(body.sortOrder, "sortOrder", 0);
      if (!sortCheck.ok) return NextResponse.json({ error: sortCheck.error }, { status: 400 });
      updateData.sortOrder = sortCheck.value;
    }

    updateData.updatedAt = FieldValue.serverTimestamp();

    await docRef.update(updateData);

    await invalidateCacheKeys(CACHE_KEYS.MEETUPS_CAMPAIGNS);

    await recordAuditLog(admin, "UPDATE_MEETUP_CAMPAIGN", "meetup_campaign", id, "success", {
      city: updateData.city || existingSnap.data()?.city || "",
      title: updateData.title || existingSnap.data()?.title || "",
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Campaign updated" }, { status: 200 });
  } catch (error) {
    console.error("PUT Campaign Error:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

/* DELETE -> Remove Flagship Campaign (Blocked with 409 if child city events exist) */
export async function DELETE(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json(
        { error: authErr.message || "Unauthorized" },
        { status: authErr.status || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const docRef = adminDb.collection("meetup_campaigns").doc(id);
    const existingSnap = await docRef.get();
    if (!existingSnap.exists) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const childCitiesSnap = await adminDb
      .collection("city_meetups")
      .where("campaignId", "==", id)
      .limit(1)
      .get();

    if (!childCitiesSnap.empty) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a flagship campaign that still has linked city events. Remove or archive its city events first.",
        },
        { status: 409 }
      );
    }

    await docRef.delete();

    await invalidateCacheKeys(CACHE_KEYS.MEETUPS_CAMPAIGNS);

    await recordAuditLog(admin, "DELETE_MEETUP_CAMPAIGN", "meetup_campaign", id, "success", {
      title: existingSnap.data()?.title || "",
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Campaign deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Campaign Error:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
