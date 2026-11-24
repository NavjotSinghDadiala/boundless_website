import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";
import { sanitizeMediaUrls } from "@/lib/previous-trip-media";
import {
  MEETUP_TYPES,
  MEETUP_STATUSES,
  normalizeCityMeetupDoc,
  parseNonNegativeInt,
  sanitizeGraphData,
  sanitizeSafeUrl,
  sortMeetupsMostRecentFirst,
} from "@/lib/cityMeetups";
import { resolveCanonicalCityLocation } from "@/lib/cityMapLocations";
import {
  CACHE_KEYS,
  CACHE_TTLS,
  getOrSetCacheWithMeta,
  invalidateCacheKeys,
} from "@/lib/cache/redisCache";

const PUBLIC_MEETUPS_LIVE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
};

const PUBLIC_COMPLETED_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

/* GET -> List All (with optional ?campaignId= / ?meetupType= / ?status=) OR Single (?id=) */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();
    const campaignIdFilter = searchParams.get("campaignId")?.trim();
    const meetupTypeFilter = searchParams.get("meetupType")?.trim();
    const statusFilter = searchParams.get("status")?.trim();

    if (id) {
      const docSnap = await adminDb.collection("city_meetups").doc(id).get();
      if (!docSnap.exists) {
        return NextResponse.json({ error: "City meetup not found." }, { status: 404 });
      }
      return NextResponse.json(
        { meetup: normalizeCityMeetupDoc(docSnap.id, docSnap.data() || {}) },
        { status: 200, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // Completed / archived public meetups have no live registration slots — safe to cache in Redis
    const isCompletedPublicQuery =
      !campaignIdFilter &&
      (meetupTypeFilter === "legacy_archive" || statusFilter === "completed");

    if (isCompletedPublicQuery) {
      const { data: completedMeetups, cacheStatus } = await getOrSetCacheWithMeta(
        CACHE_KEYS.MEETUPS_COMPLETED,
        CACHE_TTLS.MEETUPS,
        async () => {
          const querySnapshot = await adminDb.collection("city_meetups").get();
          const allNormalized = querySnapshot.docs.map((doc) =>
            normalizeCityMeetupDoc(doc.id, doc.data() || {})
          );
          const completed = allNormalized.filter(
            (m) => m.recordOrigin === "legacy_archive" || m.status === "completed"
          );
          return sortMeetupsMostRecentFirst(completed);
        }
      );

      const filtered =
        meetupTypeFilter === "legacy_archive"
          ? completedMeetups.filter((m) => m.recordOrigin === "legacy_archive")
          : completedMeetups;

      return NextResponse.json(
        { meetups: filtered },
        { status: 200, headers: { ...PUBLIC_COMPLETED_CACHE_HEADERS, "X-Cache": cacheStatus } }
      );
    }

    // Active / unfiltered meetups carry live registeredCount & capacity — always read live from Firestore
    let queryRef = adminDb.collection("city_meetups");
    if (campaignIdFilter) {
      queryRef = queryRef.where("campaignId", "==", campaignIdFilter);
    }

    const querySnapshot = await queryRef.get();

    let meetups = querySnapshot.docs.map((doc) =>
      normalizeCityMeetupDoc(doc.id, doc.data() || {})
    );

    if (meetupTypeFilter) {
      if (MEETUP_TYPES.includes(meetupTypeFilter)) {
        meetups = meetups.filter(
          (m) => m.recordOrigin === "structured" && m.meetupType === meetupTypeFilter
        );
      }
    }

    if (statusFilter) {
      meetups = meetups.filter((m) => m.status === statusFilter);
    }

    meetups = sortMeetupsMostRecentFirst(meetups);

    return NextResponse.json(
      { meetups },
      { status: 200, headers: PUBLIC_MEETUPS_LIVE_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("GET city meetups error:", error);
    return NextResponse.json({ error: "Failed to fetch city meetups" }, { status: 500 });
  }
}

/* POST -> Create Standalone or Campaign City Meetup */
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

    const cityName = typeof body.cityName === "string" ? body.cityName.trim() : "";
    if (!cityName) {
      return NextResponse.json({ error: "cityName is required." }, { status: 400 });
    }

    const meetupType = body.meetupType ? String(body.meetupType).trim() : "standalone";
    if (!MEETUP_TYPES.includes(meetupType)) {
      return NextResponse.json(
        { error: `Invalid meetupType. Expected one of: ${MEETUP_TYPES.join(", ")}.` },
        { status: 400 }
      );
    }

    let campaignId = null;
    if (meetupType === "campaign_city") {
      campaignId = typeof body.campaignId === "string" ? body.campaignId.trim() : "";
      if (!campaignId) {
        return NextResponse.json(
          { error: "campaignId is required when meetupType is 'campaign_city'." },
          { status: 400 }
        );
      }
      const parentSnap = await adminDb.collection("meetup_campaigns").doc(campaignId).get();
      if (!parentSnap.exists) {
        return NextResponse.json(
          { error: "Parent flagship campaign not found." },
          { status: 404 }
        );
      }
    }

    const status = body.status ? String(body.status).trim() : "published";
    if (!MEETUP_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Expected one of: ${MEETUP_STATUSES.join(", ")}.` },
        { status: 400 }
      );
    }

    const imgCheck = sanitizeSafeUrl(body.img, "img", false);
    if (!imgCheck.ok) return NextResponse.json({ error: imgCheck.error }, { status: 400 });

    const linkCheck = sanitizeSafeUrl(body.link, "link", false);
    if (!linkCheck.ok) return NextResponse.json({ error: linkCheck.error }, { status: 400 });

    const galleryCheck = sanitizeSafeUrl(body.galleryLink, "galleryLink", false);
    if (!galleryCheck.ok) return NextResponse.json({ error: galleryCheck.error }, { status: 400 });

    const whatsappCheck = sanitizeSafeUrl(body.whatsappGroupLink, "whatsappGroupLink", false);
    if (!whatsappCheck.ok) return NextResponse.json({ error: whatsappCheck.error }, { status: 400 });

    const participantsCheck = parseNonNegativeInt(body.participants, "participants", 0);
    if (!participantsCheck.ok) {
      return NextResponse.json({ error: participantsCheck.error }, { status: 400 });
    }

    const capacityCheck = parseNonNegativeInt(body.capacity, "capacity", 0);
    if (!capacityCheck.ok) {
      return NextResponse.json({ error: capacityCheck.error }, { status: 400 });
    }

    const resolvedLoc = resolveCanonicalCityLocation({
      cityKey: typeof body.cityKey === "string" ? body.cityKey : null,
      cityName,
      mapX: typeof body.mapX === "number" ? body.mapX : null,
      mapY: typeof body.mapY === "number" ? body.mapY : null,
    });

    const meetupData = {
      meetupType,
      campaignId,
      cityName: resolvedLoc.matched ? resolvedLoc.canonicalName : cityName,
      ...(resolvedLoc.matched
        ? {
            cityKey: resolvedLoc.key,
            mapX: resolvedLoc.x,
            mapY: resolvedLoc.y,
          }
        : {}),
      title: typeof body.title === "string" ? body.title.trim() : "",
      status,
      eventDate: typeof body.eventDate === "string" ? body.eventDate.trim() : "",
      startTime: typeof body.startTime === "string" ? body.startTime.trim() : "",
      endTime: typeof body.endTime === "string" ? body.endTime.trim() : "",
      registrationDeadline:
        typeof body.registrationDeadline === "string" ? body.registrationDeadline.trim() : "",
      registrationOpen: Boolean(body.registrationOpen),
      capacity: capacityCheck.value,
      registeredCount: 0,
      checkedInCount: 0,
      whatsappGroupLink: whatsappCheck.value,
      // Legacy archive-compatible fields preserved
      mainSection: typeof body.mainSection === "string" ? body.mainSection.trim() : "",
      subSection: typeof body.subSection === "string" ? body.subSection.trim() : "",
      color: typeof body.color === "string" && body.color.trim() ? body.color.trim() : "#FEFAE7",
      img: imgCheck.value,
      caption: typeof body.caption === "string" ? body.caption.trim() : "",
      galleryLink: galleryCheck.value,
      venue: typeof body.venue === "string" ? body.venue.trim() : "",
      participants: participantsCheck.value,
      summary: typeof body.summary === "string" ? body.summary.trim() : "",
      instagramHandle:
        typeof body.instagramHandle === "string" ? body.instagramHandle.trim() : "",
      link: linkCheck.value,
      graphData: sanitizeGraphData(body.graphData),
      photos: sanitizeMediaUrls(body.photos),
      videos: sanitizeMediaUrls(body.videos),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("city_meetups").add(meetupData);

    await invalidateCacheKeys([
      CACHE_KEYS.MEETUPS_COMPLETED,
      CACHE_KEYS.MEETUPS_CAMPAIGNS,
    ]);

    await recordAuditLog(admin, "CREATE_CITY_MEETUP", "city_meetup", docRef.id, "success", {
      cityName,
      meetupType,
      campaignId,
      status,
    }).catch(() => {});

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("POST city meetup error:", error);
    return NextResponse.json({ error: "Failed to save city meetup" }, { status: 500 });
  }
}

/* PUT -> Update Existing City Meetup (Never touches sibling cities or server counters) */
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

    const docRef = adminDb.collection("city_meetups").doc(id);
    const existingSnap = await docRef.get();
    if (!existingSnap.exists) {
      return NextResponse.json({ error: "City meetup not found." }, { status: 404 });
    }

    const updatePayload = {};

    if (body.cityName !== undefined || body.cityKey !== undefined) {
      const cleanCity =
        typeof body.cityName === "string"
          ? body.cityName.trim()
          : existingSnap.data()?.cityName || "";
      if (!cleanCity) {
        return NextResponse.json({ error: "cityName cannot be empty." }, { status: 400 });
      }
      const resolvedLoc = resolveCanonicalCityLocation({
        cityKey: typeof body.cityKey === "string" ? body.cityKey : null,
        cityName: cleanCity,
        mapX: typeof body.mapX === "number" ? body.mapX : null,
        mapY: typeof body.mapY === "number" ? body.mapY : null,
      });
      updatePayload.cityName = resolvedLoc.matched ? resolvedLoc.canonicalName : cleanCity;
      if (resolvedLoc.matched) {
        updatePayload.cityKey = resolvedLoc.key;
        updatePayload.mapX = resolvedLoc.x;
        updatePayload.mapY = resolvedLoc.y;
      }
    }

    if (body.meetupType !== undefined) {
      const nextType = String(body.meetupType).trim();
      if (!MEETUP_TYPES.includes(nextType)) {
        return NextResponse.json(
          { error: `Invalid meetupType. Expected one of: ${MEETUP_TYPES.join(", ")}.` },
          { status: 400 }
        );
      }
      updatePayload.meetupType = nextType;
      if (nextType === "standalone") {
        updatePayload.campaignId = null;
      }
    }

    const effectiveType =
      updatePayload.meetupType ?? existingSnap.data()?.meetupType ?? "standalone";

    if (body.campaignId !== undefined || effectiveType === "campaign_city") {
      if (effectiveType === "campaign_city") {
        const nextCampaignId =
          body.campaignId !== undefined
            ? typeof body.campaignId === "string"
              ? body.campaignId.trim()
              : ""
            : String(existingSnap.data()?.campaignId || "").trim();

        if (!nextCampaignId) {
          return NextResponse.json(
            { error: "campaignId is required when meetupType is 'campaign_city'." },
            { status: 400 }
          );
        }
        const parentSnap = await adminDb
          .collection("meetup_campaigns")
          .doc(nextCampaignId)
          .get();
        if (!parentSnap.exists) {
          return NextResponse.json(
            { error: "Parent flagship campaign not found." },
            { status: 404 }
          );
        }
        updatePayload.campaignId = nextCampaignId;
      } else if (body.campaignId === null || body.campaignId === "") {
        updatePayload.campaignId = null;
      }
    }

    if (body.status !== undefined) {
      const nextStatus = String(body.status).trim();
      if (!MEETUP_STATUSES.includes(nextStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Expected one of: ${MEETUP_STATUSES.join(", ")}.` },
          { status: 400 }
        );
      }
      updatePayload.status = nextStatus;
    }

    const urlFields = ["img", "link", "galleryLink", "whatsappGroupLink"];
    for (const field of urlFields) {
      if (body[field] !== undefined) {
        const check = sanitizeSafeUrl(body[field], field, false);
        if (!check.ok) {
          return NextResponse.json({ error: check.error }, { status: 400 });
        }
        updatePayload[field] = check.value;
      }
    }

    if (body.participants !== undefined) {
      const check = parseNonNegativeInt(body.participants, "participants", 0);
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      updatePayload.participants = check.value;
    }

    if (body.capacity !== undefined) {
      const check = parseNonNegativeInt(body.capacity, "capacity", 0);
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      updatePayload.capacity = check.value;
    }

    const stringFields = [
      "mainSection",
      "subSection",
      "title",
      "color",
      "caption",
      "venue",
      "summary",
      "instagramHandle",
      "eventDate",
      "startTime",
      "endTime",
      "registrationDeadline",
    ];
    for (const field of stringFields) {
      if (body[field] !== undefined) {
        updatePayload[field] =
          typeof body[field] === "string" ? body[field].trim() : "";
      }
    }

    if (body.registrationOpen !== undefined) {
      updatePayload.registrationOpen = Boolean(body.registrationOpen);
    }
    if (body.graphData !== undefined) {
      updatePayload.graphData = sanitizeGraphData(body.graphData);
    }
    if (body.photos !== undefined) {
      updatePayload.photos = sanitizeMediaUrls(body.photos);
    }
    if (body.videos !== undefined) {
      updatePayload.videos = sanitizeMediaUrls(body.videos);
    }

    updatePayload.updatedAt = FieldValue.serverTimestamp();

    await docRef.update(updatePayload);

    await invalidateCacheKeys([
      CACHE_KEYS.MEETUPS_COMPLETED,
      CACHE_KEYS.MEETUPS_CAMPAIGNS,
    ]);

    await recordAuditLog(admin, "UPDATE_CITY_MEETUP", "city_meetup", id, "success", {
      cityName: updatePayload.cityName || existingSnap.data()?.cityName || "",
      updatedFields: Object.keys(updatePayload).filter((k) => k !== "updatedAt"),
    }).catch(() => {});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("PUT city meetup error:", error);
    return NextResponse.json({ error: "Failed to update meetup" }, { status: 500 });
  }
}

/* DELETE -> Safely Remove City Meetup */
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

    const docRef = adminDb.collection("city_meetups").doc(id);
    const existingSnap = await docRef.get();
    if (!existingSnap.exists) {
      return NextResponse.json({ error: "City meetup not found." }, { status: 404 });
    }

    // Prevent deleting a meetup that has active student registrations
    const activeRegsSnap = await adminDb
      .collection("meetup_registrations")
      .where("meetupId", "==", id)
      .where("status", "==", "registered")
      .limit(1)
      .get();

    if (!activeRegsSnap.empty) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a city meetup with active student registrations. Cancel the meetup instead.",
        },
        { status: 409 }
      );
    }

    await docRef.delete();

    await invalidateCacheKeys([
      CACHE_KEYS.MEETUPS_COMPLETED,
      CACHE_KEYS.MEETUPS_CAMPAIGNS,
    ]);

    await recordAuditLog(admin, "DELETE_CITY_MEETUP", "city_meetup", id, "success", {
      cityName: existingSnap.data()?.cityName || "",
      campaignId: existingSnap.data()?.campaignId || null,
    }).catch(() => {});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE city meetup error:", error);
    return NextResponse.json({ error: "Failed to delete meetup" }, { status: 500 });
  }
}
