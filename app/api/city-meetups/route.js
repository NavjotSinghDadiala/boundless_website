import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";
import { sanitizeMediaUrls } from "@/lib/previous-trip-media";

/* GET → List All or Single (if ?id= is passed) */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Fetch single item (used for edit pages)
    if (id) {
      const docRef = doc(db, "city_meetups", id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ meetup: { id: docSnap.id, ...docSnap.data() } }, { status: 200 });
    }

    // Fetch all items (used for list view)
    const meetupsRef = collection(db, "city_meetups");
    const q = query(meetupsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const meetups = querySnapshot.docs.map((doc) => ({
      id: doc.id, ...doc.data(),
    }));

    return NextResponse.json({ meetups }, { status: 200 });
  } catch (error) {
    console.error("GET city meetups error:", error);
    return NextResponse.json({ error: "Failed to fetch city meetups" }, { status: 500 });
  }
}

/* POST → Create */
export async function POST(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    const meetupData = {
      mainSection: body.mainSection,
      subSection: body.subSection,
      cityName: body.cityName, 
      color: body.color || "#FEFAE7",
      img: body.img, 
      caption: body.caption || "",
      galleryLink: body.galleryLink || "",
      venue: body.venue || "",
      participants: body.participants !== undefined && body.participants !== "" ? Number(body.participants) : 0,
      summary: body.summary || "",
      instagramHandle: body.instagramHandle || "",
      link: body.link || "",
      graphData: Array.isArray(body.graphData) ? body.graphData.map(item => ({
        x: item.x !== undefined ? String(item.x) : "",
        y: item.y !== undefined ? String(item.y) : ""
      })) : [],
      photos: sanitizeMediaUrls(body.photos),
      videos: sanitizeMediaUrls(body.videos),
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "city_meetups"), meetupData);

    await recordAuditLog(admin, "CREATE_CITY_MEETUP", "city_meetup", docRef.id, "success", {
      cityName: body.cityName,
    }).catch(() => {});

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save city meetup" }, { status: 500 });
  }
}

/* PUT → Update */
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
      mainSection,
      subSection,
      cityName,
      color,
      img,
      caption,
      galleryLink,
      venue,
      participants,
      summary,
      instagramHandle,
      link,
      graphData,
      photos,
      videos,
    } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const updatePayload = {
      mainSection,
      subSection,
      cityName,
      color: color || "#FEFAE7",
      img,
      caption: caption || "",
      galleryLink: galleryLink || "",
      venue: venue || "",
      participants: participants !== undefined && participants !== "" ? Number(participants) : 0,
      summary: summary || "",
      instagramHandle: instagramHandle || "",
      link: link || "",
      graphData: Array.isArray(graphData) ? graphData.map(item => ({
        x: item.x !== undefined ? String(item.x) : "",
        y: item.y !== undefined ? String(item.y) : ""
      })) : [],
      photos: sanitizeMediaUrls(photos),
      videos: sanitizeMediaUrls(videos),
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, "city_meetups", id), updatePayload);

    await recordAuditLog(admin, "UPDATE_CITY_MEETUP", "city_meetup", id, "success", {
      cityName,
    }).catch(() => {});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update meetup" }, { status: 500 });
  }
}

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

    await deleteDoc(doc(db, "city_meetups", id));

    await recordAuditLog(admin, "DELETE_CITY_MEETUP", "city_meetup", id, "success").catch(() => {});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete meetup" }, { status: 500 });
  }
}