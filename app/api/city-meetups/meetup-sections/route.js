import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";

export async function GET() {
  try {
    const sectionsRef = collection(db, "meetup_sections");
    const q = query(sectionsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const sections = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // In-memory sort by createdAt desc
    sections.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ sections }, { status: 200 });
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const sectionData = {
      name: body.name,
      createdAt: serverTimestamp(),
    };
    if (body.priority !== undefined) {
      sectionData.priority = Number(body.priority) || 0;
    }

    const docRef = await addDoc(collection(db, "meetup_sections"), sectionData);
    return NextResponse.json({ message: "Section added", id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("Error adding section:", error);
    return NextResponse.json({ error: "Failed to save section" }, { status: 500 });
  }
}
