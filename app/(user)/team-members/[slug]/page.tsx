import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import {
  getMemberSlug,
  normalizeTeamMember,
  slugifyMemberName,
  type TeamMemberRecord,
} from "@/lib/teamProfiles";
import {
  findPreviewProfileForSlug,
  PREVIEW_FALLBACK_MEMBERS,
} from "@/data/memberProfilePreviews";
import MemberProfileTemplate from "@/components/team/MemberProfileTemplate";

export const dynamic = "force-dynamic";

/**
 * Strictly read-only member lookup by slug.
 * 1. Checks `team_members` by explicit `slug` field, then safe read-time normalized `name`.
 * 2. If found in Firestore without an extended `profile` yet, attaches a local Phase 2
 *    preview profile when available (zero Firestore writes) or renders a graceful basic profile.
 * 3. If not in Firestore yet during Phase 2 local preview, falls back to PREVIEW_FALLBACK_MEMBERS.
 * 4. Returns null for unknown slugs -> triggers Next.js notFound().
 */
async function resolveMemberBySlug(rawSlug: string): Promise<TeamMemberRecord | null> {
  const slug = slugifyMemberName(decodeURIComponent(rawSlug || ""));
  if (!slug) return null;

  try {
    // 1. Direct query by explicit `slug` field
    const bySlugSnap = await adminDb
      .collection("team_members")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (!bySlugSnap.empty) {
      const doc = bySlugSnap.docs[0];
      const member = normalizeTeamMember(doc.id, doc.data() || {});
      if (!member.profile) {
        const preview = findPreviewProfileForSlug(member.slug);
        if (preview) member.profile = preview;
      }
      return member;
    }

    // 2. Safe read-time fallback: match normalized name for existing records without `slug` field
    const allSnap = await adminDb.collection("team_members").get();
    for (const doc of allSnap.docs) {
      const data = doc.data() || {};
      const candidateSlug = getMemberSlug({
        slug: data.slug,
        name: data.name,
        id: doc.id,
      });
      if (candidateSlug === slug || doc.id === rawSlug) {
        const member = normalizeTeamMember(doc.id, data);
        if (!member.profile) {
          const preview = findPreviewProfileForSlug(member.slug);
          if (preview) member.profile = preview;
        }
        return member;
      }
    }
  } catch (error) {
    console.error("Error resolving team member by slug:", error);
  }

  // 3. Phase 2 local preview fallback (zero Firestore writes)
  if (PREVIEW_FALLBACK_MEMBERS[slug]) {
    return PREVIEW_FALLBACK_MEMBERS[slug];
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const member = await resolveMemberBySlug(slug);

  if (!member) {
    return {
      title: "Member Not Found | Boundless Travel Society",
      description: "Explore the core team behind Boundless Travel Society, IIT Madras BS.",
    };
  }

  const displayRole = member.profile?.currentPosition || member.role;
  const description =
    member.profile?.yearbookQuote ||
    `${member.name} — ${displayRole} at Boundless Travel Society, IIT Madras BS.`;

  return {
    title: `${member.name} — ${displayRole} | Boundless Travel Society`,
    description,
    openGraph: {
      title: `${member.name} | Boundless Travel Society`,
      description,
      url: `https://boundless.iitmbs.org/team-members/${member.slug}`,
      type: "profile",
      images: member.image ? [{ url: member.image }] : ["/Logo Bound.png"],
    },
  };
}

export default async function TeamMemberProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await resolveMemberBySlug(slug);

  if (!member) {
    notFound();
  }

  return <MemberProfileTemplate member={member} />;
}
