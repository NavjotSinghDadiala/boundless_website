import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";

// Import local data for seeding
import { officialGroups, girlsGroups, regionalGroups } from "@/data/whatsapp";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

// Function to seed Firestore if the whatsapp_groups collection is empty
async function seedIfEmpty() {
  try {
    const groupsRef = adminDb.collection("whatsapp_groups");
    const qSnapshot = await groupsRef.limit(1).get();
    if (qSnapshot.empty) {
      console.log("WhatsApp groups collection is empty. Seeding initial data...");
      const itemsToSeed = [];

      // 1. Official Groups
      officialGroups.forEach((g, idx) => {
        itemsToSeed.push({
          city: g.city,
          img: g.img || "",
          link: g.link || "",
          color: g.color || "#ffffff",
          category: "official",
          linkType: g.linkType || "",
          sortOrder: idx,
        });
      });

      // 2. Girls Groups
      girlsGroups.forEach((g, idx) => {
        itemsToSeed.push({
          city: g.city,
          img: g.img || "",
          link: g.link || "",
          color: g.color || "#ffffff",
          category: "girls",
          linkType: "",
          sortOrder: idx,
        });
      });

      // 3. Regional Groups
      regionalGroups.forEach((g, idx) => {
        itemsToSeed.push({
          city: g.city,
          img: g.img || "",
          link: g.link || "",
          color: g.color || "#ffffff",
          category: "regional",
          linkType: "",
          sortOrder: idx,
        });
      });

      // Batch write to Firestore (limit is 500 documents per batch; we have around 40, so 1 batch is fine)
      const batch = adminDb.batch();
      itemsToSeed.forEach((item) => {
        const docRef = groupsRef.doc();
        batch.set(docRef, {
          ...item,
          createdAt: new Date(),
        });
      });
      await batch.commit();
      console.log("Successfully seeded WhatsApp groups.");
    }
  } catch (error) {
    console.error("Error seeding WhatsApp groups:", error);
  }
}

/* GET All Groups OR Single Group (if ?id= is passed) */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Fetch single item for the Edit page
    if (id) {
      const docSnap = await adminDb.collection("whatsapp_groups").doc(id).get();
      if (!docSnap.exists) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
      return NextResponse.json(
        { id: docSnap.id, ...docSnap.data() },
        { status: 200, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // Auto-seed if empty
    await seedIfEmpty();

    // Fetch all items for the Manage List page
    const querySnapshot = await adminDb
      .collection("whatsapp_groups")
      .orderBy("createdAt", "desc")
      .get();

    const groups = querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // Sort by createdAt desc in-memory
    groups.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ groups }, { status: 200, headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    console.error("GET API Error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

/* POST: Save a new group */
export async function POST(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();

    if (!body.city || !body.link || !body.category) {
      return NextResponse.json({ error: "Name/City, invite link, and category are required" }, { status: 400 });
    }

    const groupData = {
      city: body.city,
      img: body.img || "",
      link: body.link,
      color: body.color || "#ffffff",
      category: body.category, // 'official', 'girls', 'regional'
      linkType: body.linkType || "", // 'gspace' or empty
      createdAt: FieldValue.serverTimestamp(),
    };
    if (body.sortOrder !== undefined) {
      groupData.sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : parseInt(body.sortOrder) || 0;
    }

    const docRef = await adminDb.collection("whatsapp_groups").add(groupData);

    await recordAuditLog(admin, "CREATE_WHATSAPP_GROUP", "whatsapp_group", docRef.id, "success", {
      city: body.city,
      category: body.category,
    }).catch(() => {});

    return NextResponse.json({ message: "Group added", id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("POST API Error:", error);
    return NextResponse.json({ error: "Failed to save group" }, { status: 500 });
  }
}

/* PUT: Update group */
export async function PUT(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    const { id, city, img, link, color, category, linkType, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const updateData = {
      city,
      img: img || "",
      link,
      color: color || "#ffffff",
      category,
      linkType: linkType || "",
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (sortOrder !== undefined) {
      updateData.sortOrder = typeof sortOrder === "number" ? sortOrder : parseInt(sortOrder) || 0;
    }

    await adminDb.collection("whatsapp_groups").doc(id).update(updateData);

    await recordAuditLog(admin, "UPDATE_WHATSAPP_GROUP", "whatsapp_group", id, "success", {
      city,
      category,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Group updated" }, { status: 200 });
  } catch (error) {
    console.error("PUT API Error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

/* DELETE: Remove group */
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

    await adminDb.collection("whatsapp_groups").doc(id).delete();

    await recordAuditLog(admin, "DELETE_WHATSAPP_GROUP", "whatsapp_group", id, "success").catch(() => {});

    return NextResponse.json({ success: true, message: "Group deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE API Error:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
