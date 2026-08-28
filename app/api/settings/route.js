import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DEFAULT_VIDEO_ID = "6tDnTV1wHKI";

export async function GET() {
  try {
    const docRef = doc(db, "settings", "homepage");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return NextResponse.json({
        youtubeVideoId: data.youtubeVideoId || DEFAULT_VIDEO_ID,
      }, { status: 200 });
    }

    return NextResponse.json({ youtubeVideoId: DEFAULT_VIDEO_ID }, { status: 200 });
  } catch (error) {
    console.error("GET settings error:", error);
    return NextResponse.json({ error: "Failed to fetch homepage video setting" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const docRef = doc(db, "settings", "homepage");
    await setDoc(docRef, {
      youtubeVideoId: cleanVideoId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ success: true, youtubeVideoId: cleanVideoId }, { status: 200 });
  } catch (error) {
    console.error("POST settings error:", error);
    return NextResponse.json({ error: "Failed to update homepage video setting" }, { status: 500 });
  }
}
