import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";
import {
  CACHE_KEYS,
  CACHE_TTLS,
  getOrSetCacheWithMeta,
  invalidateCacheKeys,
} from "@/lib/cache/redisCache";

const DEFAULT_VIDEO_ID = "6tDnTV1wHKI";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

export async function GET() {
  try {
    const { data, cacheStatus } = await getOrSetCacheWithMeta(
      CACHE_KEYS.HOMEPAGE_SETTINGS,
      CACHE_TTLS.HOMEPAGE,
      async () => {
        const docSnap = await adminDb.collection("settings").doc("homepage").get();
        if (docSnap.exists) {
          const raw = docSnap.data() || {};
          return { youtubeVideoId: raw.youtubeVideoId || DEFAULT_VIDEO_ID };
        }
        return { youtubeVideoId: DEFAULT_VIDEO_ID };
      }
    );

    return NextResponse.json(data, {
      status: 200,
      headers: { ...PUBLIC_CACHE_HEADERS, "X-Cache": cacheStatus },
    });
  } catch (error) {
    console.error("GET settings error:", error);
    return NextResponse.json({ error: "Failed to fetch homepage video setting" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(request);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await request.json();
    const { youtubeVideoId } = body;

    if (!youtubeVideoId || typeof youtubeVideoId !== "string") {
      return NextResponse.json({ error: "youtubeVideoId is required and must be a string" }, { status: 400 });
    }

    // Helper to extract video ID from various YouTube URL formats
    let cleanVideoId = youtubeVideoId.trim();
    
    // Check if it's a URL
    if (cleanVideoId.includes("youtube.com") || cleanVideoId.includes("youtu.be")) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = cleanVideoId.match(regExp);
      if (match && match[2].length === 11) {
        cleanVideoId = match[2];
      }
    }

    await adminDb.collection("settings").doc("homepage").set({
      youtubeVideoId: cleanVideoId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_SETTINGS);

    await recordAuditLog(admin, "UPDATE_SETTINGS", "settings", "homepage", "success", {
      youtubeVideoId: cleanVideoId,
    }).catch(() => {});

    return NextResponse.json({ success: true, youtubeVideoId: cleanVideoId }, { status: 200 });
  } catch (error) {
    console.error("POST settings error:", error);
    return NextResponse.json({ error: "Failed to update homepage video setting" }, { status: 500 });
  }
}
