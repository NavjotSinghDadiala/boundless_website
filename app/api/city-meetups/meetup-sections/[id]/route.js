import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // FIX: Await the params promise
    const resolvedParams = await params;
    const { id } = resolvedParams;

    await deleteDoc(doc(db, "meetup_sections", id));
    
    return NextResponse.json({ message: "Section deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Section name is required" }, { status: 400 });
    }

    await updateDoc(doc(db, "meetup_sections", id), {
      name: body.name.trim(),
    });

    return NextResponse.json({ message: "Section updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}
