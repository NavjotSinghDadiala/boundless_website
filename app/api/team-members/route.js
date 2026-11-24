import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin, recordAuditLog } from "@/lib/adminAuth";
import {
  sanitizeDepartmentTeam,
  normalizeTeamMemberProfile,
  slugifyMemberName,
} from "@/lib/teamProfiles";
import {
  CACHE_KEYS,
  CACHE_TTLS,
  getOrSetCacheWithMeta,
  invalidateCacheKeys,
} from "@/lib/cache/redisCache";

// Import local data for seeding
import { founderDetails } from "@/data/founders";
import { councilMembers, departmentHeads } from "@/data/newCouncil";
import { oldCouncilMembers, oldDepartmentHeads } from "@/data/oldCouncil";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

// Function to seed Firestore if the team_members collection is empty
async function seedIfEmpty() {
  try {
    const teamRef = adminDb.collection("team_members");
    const qSnapshot = await teamRef.limit(1).get();
    if (qSnapshot.empty) {
      console.log("Team members collection is empty. Seeding initial data...");
      const itemsToSeed = [];

      // 1. Founders
      founderDetails.forEach((f, idx) => {
        itemsToSeed.push({
          name: f.name,
          role: f.role,
          image: f.src || f.image || "",
          type: "founder",
          term: "",
          sortOrder: idx,
        });
      });

      // 2. Current Council (2025-2026)
      councilMembers.forEach((c, idx) => {
        itemsToSeed.push({
          name: c.name,
          role: c.role,
          image: c.image || "",
          type: "council",
          term: "2025-2026",
          sortOrder: idx,
        });
      });

      // 3. Current Dept Heads (2025-2026)
      departmentHeads.forEach((d, idx) => {
        itemsToSeed.push({
          name: d.name,
          role: d.role,
          image: d.image || "",
          type: "dept_head",
          term: "2025-2026",
          sortOrder: idx,
        });
      });

      // 4. Old Council (2024-2025)
      oldCouncilMembers.forEach((c, idx) => {
        itemsToSeed.push({
          name: c.name,
          role: c.role,
          image: c.image || "",
          type: "council",
          term: "2024-2025",
          sortOrder: idx,
        });
      });

      // 5. Old Dept Heads (2024-2025)
      oldDepartmentHeads.forEach((d, idx) => {
        itemsToSeed.push({
          name: d.name,
          role: d.role,
          image: d.image || "",
          type: "dept_head",
          term: "2024-2025",
          sortOrder: idx,
        });
      });

      // Firestore Batch write (limit is 500 documents per batch)
      const batch = adminDb.batch();
      itemsToSeed.forEach((item) => {
        const docRef = teamRef.doc();
        batch.set(docRef, {
          ...item,
          createdAt: new Date(),
        });
      });
      await batch.commit();
      console.log("Successfully seeded 26 team members.");
    }
  } catch (error) {
    console.error("Error seeding team members:", error);
  }
}

/* GET All Team Members OR Single Team Member (if ?id= is passed) */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Fetch single item for the Edit page
    if (id) {
      const docSnap = await adminDb.collection("team_members").doc(id).get();
      if (!docSnap.exists) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      return NextResponse.json(
        { id: docSnap.id, ...docSnap.data() },
        { status: 200, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { data: members, cacheStatus } = await getOrSetCacheWithMeta(
      CACHE_KEYS.TEAM_ALL,
      CACHE_TTLS.TEAM,
      async () => {
        // Auto-seed if empty
        await seedIfEmpty();

        // Fetch all items for the Manage List page
        const querySnapshot = await adminDb
          .collection("team_members")
          .orderBy("sortOrder", "asc")
          .get();

        const list = querySnapshot.docs.map((d) => {
          const raw = d.data() || {};
          return {
            id: d.id,
            ...raw,
            createdAt: raw.createdAt?.toDate ? raw.createdAt.toDate().toISOString() : (raw.createdAt ?? null),
            updatedAt: raw.updatedAt?.toDate ? raw.updatedAt.toDate().toISOString() : (raw.updatedAt ?? null),
          };
        });

        // Sort by createdAt desc in-memory if sortOrder is equal
        list.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        return list;
      }
    );

    return NextResponse.json(
      { members },
      { status: 200, headers: { ...PUBLIC_CACHE_HEADERS, "X-Cache": cacheStatus } }
    );
  } catch (error) {
    console.error("GET API Error:", error);
    return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 });
  }
}

/* POST: Save a new team member */
export async function POST(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();

    if (!body.name || !body.role || !body.type) {
      return NextResponse.json({ error: "Name, role and type are required" }, { status: 400 });
    }

    const normalizedProfile =
      (body.type === "council" || body.type === "dept_head") && body.profile
        ? normalizeTeamMemberProfile(body.profile)
        : null;

    const memberData = {
      name: body.name,
      slug: slugifyMemberName(body.slug || body.name),
      role: body.role,
      image: body.image || "",
      type: body.type, // 'founder', 'council', 'dept_head'
      term: body.type === "founder" ? "" : body.term || "", // e.g. '2025-2026'
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : parseInt(body.sortOrder) || 0,
      ...(normalizedProfile ? { profile: normalizedProfile } : {}),
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("team_members").add(memberData);

    await invalidateCacheKeys([
      CACHE_KEYS.TEAM_ALL,
      CACHE_KEYS.teamProfile(memberData.slug),
    ]);

    await recordAuditLog(admin, "CREATE_TEAM_MEMBER", "team_member", docRef.id, "success", {
      name: body.name,
      role: body.role,
      type: body.type,
    }).catch(() => {});

    return NextResponse.json({ message: "Member added", id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("POST API Error:", error);
    return NextResponse.json({ error: "Failed to save team member" }, { status: 500 });
  }
}

/* PUT: Update team member */
export async function PUT(req) {
  try {
    let admin = null;
    try {
      admin = await requireAdmin(req);
    } catch (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
    }

    const body = await req.json();
    const { id, name, role, image, type, term, sortOrder, profile, slug } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const updateData = {
      name,
      slug: slugifyMemberName(slug || name),
      role,
      image: image || "",
      type,
      term: type === "founder" ? "" : term || "",
      sortOrder: typeof sortOrder === "number" ? sortOrder : parseInt(sortOrder) || 0,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Preserve existing `departmentTeam` untouched (never overwritten by PUT).
    // Only update `profile` when explicitly supplied for Council Members or HODs.
    if (profile !== undefined && (type === "council" || type === "dept_head")) {
      updateData.profile = normalizeTeamMemberProfile(profile);
    }

    const existingSnap = await adminDb.collection("team_members").doc(id).get();
    const previousSlug = existingSnap.exists ? existingSnap.data()?.slug : null;

    await adminDb.collection("team_members").doc(id).update(updateData);

    const keysToInvalidate = [
      CACHE_KEYS.TEAM_ALL,
      CACHE_KEYS.teamProfile(updateData.slug),
    ];
    if (previousSlug && previousSlug !== updateData.slug) {
      keysToInvalidate.push(CACHE_KEYS.teamProfile(previousSlug));
    }
    await invalidateCacheKeys(keysToInvalidate);

    await recordAuditLog(admin, "UPDATE_TEAM_MEMBER", "team_member", id, "success", {
      name,
      role,
      type,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Member updated" }, { status: 200 });
  } catch (error) {
    console.error("PUT API Error:", error);
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 });
  }
}

/* PATCH: Transactionally update ONLY the `departmentTeam` field on an HOD (`type === "dept_head"`) document */
export async function PATCH(req) {
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

    const hodId = typeof body.hodId === "string" ? body.hodId.trim() : "";
    if (!hodId) {
      return NextResponse.json({ error: "hodId is required." }, { status: 400 });
    }

    const teamValidation = sanitizeDepartmentTeam(body.departmentTeam);
    if (!teamValidation.ok) {
      return NextResponse.json({ error: teamValidation.error }, { status: 400 });
    }

    const docRef = adminDb.collection("team_members").doc(hodId);

    const txResult = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) {
        return { error: "HOD member not found.", status: 404 };
      }

      const data = snap.data() || {};
      if (data.type !== "dept_head") {
        return {
          error: "Team assignments are only allowed for Department Head (HOD) members.",
          status: 400,
        };
      }

      // Update ONLY `departmentTeam` and `updatedAt` — never overwrite unrelated HOD fields
      tx.update(docRef, {
        departmentTeam: teamValidation.team,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        ok: true,
        hodName: data.name || "",
        hodRole: data.role || "",
        hodSlug: data.slug || slugifyMemberName(data.name || ""),
      };
    });

    if (txResult.error) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }

    await invalidateCacheKeys([
      CACHE_KEYS.TEAM_ALL,
      ...(txResult.hodSlug ? [CACHE_KEYS.teamProfile(txResult.hodSlug)] : []),
    ]);

    await recordAuditLog(
      admin,
      "UPDATE_HOD_DEPARTMENT_TEAM",
      "team_member",
      hodId,
      "success",
      {
        hodName: txResult.hodName,
        hodRole: txResult.hodRole,
        memberCount: teamValidation.team.length,
      }
    ).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        id: hodId,
        departmentTeam: teamValidation.team,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH departmentTeam API Error:", error);
    return NextResponse.json(
      { error: "Failed to update HOD department team." },
      { status: 500 }
    );
  }
}

/* DELETE: Remove team member */
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

    const existingSnap = await adminDb.collection("team_members").doc(id).get();
    const deletedSlug = existingSnap.exists
      ? existingSnap.data()?.slug || slugifyMemberName(existingSnap.data()?.name || "")
      : "";

    await adminDb.collection("team_members").doc(id).delete();

    await invalidateCacheKeys([
      CACHE_KEYS.TEAM_ALL,
      ...(deletedSlug ? [CACHE_KEYS.teamProfile(deletedSlug)] : []),
    ]);

    await recordAuditLog(admin, "DELETE_TEAM_MEMBER", "team_member", id, "success").catch(() => {});

    return NextResponse.json({ success: true, message: "Member deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE API Error:", error);
    return NextResponse.json({ error: "Failed to delete team member" }, { status: 500 });
  }
}
