import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { adminDb } from "@/lib/firebase-admin";
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

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ─── Helper: upload a single base64 data URI to Cloudinary ─── */
async function uploadToCloudinary(base64DataUrl) {
  if (!base64DataUrl || typeof base64DataUrl !== "string") {
    throw new Error("Invalid image data");
  }
  if (!base64DataUrl.startsWith("data:")) {
    throw new Error('Image data must be a base64 data URI starting with "data:"');
  }

  const result = await cloudinary.uploader.upload(base64DataUrl, {
    folder: "gallery",
    resource_type: "image",
    timeout: 120000,
  });

  return result.secure_url;
}

/* ─── GET → List All ─── */
export async function GET() {
  try {
    const { data, cacheStatus } = await getOrSetCacheWithMeta(
      CACHE_KEYS.HOMEPAGE_GALLERY,
      CACHE_TTLS.HOMEPAGE,
      async () => {
        const snap = await adminDb
          .collection("gallery")
          .orderBy("createdAt", "desc")
          .get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    );

    return NextResponse.json(data, {
      status: 200,
      headers: { ...PUBLIC_CACHE_HEADERS, "X-Cache": cacheStatus },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─── POST → Upload image to Cloudinary then save to Firestore ─── */
export async function POST(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    const { name, imageData, link } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!imageData) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Upload to Cloudinary inside this route — no dependency on /api/upload
    const imgUrl = await uploadToCloudinary(imageData);

    const ref = await adminDb.collection("gallery").add({
      name,
      img: imgUrl,
      link: link || "#",
      createdAt: Date.now(),
    });

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_GALLERY);

    await recordAuditLog(admin, "CREATE_GALLERY_IMAGE", "gallery", ref.id, "success", {
      name,
    }).catch(() => {});

    return NextResponse.json({ success: true, id: ref.id, img: imgUrl });
  } catch (err) {
    console.error("[gallery POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─── PUT → Update (re-upload image only if new imageData provided) ─── */
export async function PUT(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    const { id, name, imageData, img, link } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // If a new file was picked, upload it; otherwise keep existing img URL
    const finalImg = imageData
      ? await uploadToCloudinary(imageData)
      : img;

    await adminDb.collection("gallery").doc(id).update({
      name,
      img: finalImg,
      link,
      updatedAt: Date.now(),
    });

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_GALLERY);

    await recordAuditLog(admin, "UPDATE_GALLERY_IMAGE", "gallery", id, "success", {
      name,
    }).catch(() => {});

    return NextResponse.json({ success: true, img: finalImg });
  } catch (err) {
    console.error("[gallery PUT]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─── DELETE → Remove ─── */
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

    await adminDb.collection("gallery").doc(id).delete();

    await invalidateCacheKeys(CACHE_KEYS.HOMEPAGE_GALLERY);

    await recordAuditLog(admin, "DELETE_GALLERY_IMAGE", "gallery", id, "success").catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
