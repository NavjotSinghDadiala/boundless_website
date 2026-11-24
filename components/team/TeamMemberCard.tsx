"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import MemberAvatar from "@/components/MemberAvatar";
import { getMemberSlug, type DepartmentTeamMember } from "@/lib/teamProfiles";

export interface TeamMemberCardItem {
  id?: string;
  slug?: string;
  name: string;
  role: string;
  type?: string;
  image?: string;
  src?: string;
  departmentTeam?: DepartmentTeamMember[];
}

/**
 * Determines whether a team member is a Head of Department (HOD)
 * using existing `type` / `role` fields only (no hardcoded names or invented categories).
 */
export function isHodMember(member: { type?: string; role?: string }): boolean {
  if (member?.type === "dept_head") return true;
  const role = String(member?.role || "").toLowerCase();
  return (
    /\bhod\b/.test(role) ||
    role.includes("head of department") ||
    role.includes("department head") ||
    role.includes("dept head")
  );
}

/**
 * Both HODs (`dept_head`) and Council Members (`council`) have individual profile pages.
 * Regular team members do NOT have individual profile pages.
 */
export function hasIndividualProfile(member: { type?: string; role?: string }): boolean {
  if (isHodMember(member)) return true;
  return member?.type === "council";
}

interface TeamMemberCardProps {
  member: TeamMemberCardItem;
  cardRef?: (el: HTMLElement | null) => void;
}

/**
 * Preserves the exact ORIGINAL `/team-members` card design (`w-96 h-48`, `bg-black`,
 * `rounded-3xl`, `hover:scale-110`, original inner layout and `MemberAvatar`).
 *
 * Behaviour:
 * - HODs (`type === "dept_head"`): navigates to `/team-members/[slug]`. If the HOD has
 *   assigned `departmentTeam` members in Firestore, reveals a burgundy bottom slider
 *   on hover displaying ONLY those actual assigned member names (visual label only).
 * - HODs with no assigned team: slider is hidden cleanly (no placeholder text).
 * - Regular team members (non-HOD): plain visual card, no profile navigation, no slider.
 */
export default function TeamMemberCard({ member, cardRef }: TeamMemberCardProps) {
  const prefersReduced = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);

  const isHod = isHodMember(member);
  const canOpenProfile = hasIndividualProfile(member);
  const slug = getMemberSlug(member);

  // Only HODs have department teams; Council Members never show a department team slider
  const assignedNames =
    isHod && Array.isArray(member.departmentTeam)
      ? member.departmentTeam
          .map((m) => (typeof m?.name === "string" ? m.name.trim() : ""))
          .filter(Boolean)
      : [];

  const hasTeamToReveal = isHod && assignedNames.length > 0;
  const showSlider = hasTeamToReveal && isOpen;

  const sharedClassName =
    "relative bg-black text-white hover:scale-110 hover:z-20 focus:z-20 transition-transform cursor-pointer rounded-3xl w-96 h-48 flex items-center px-6 py-4 mb-2 shadow-2xl border border-purple-200";

  const cardInner = (
    <>
      <div className="flex-1 flex flex-col justify-center items-start h-full py-1">
        <h3 className="font-bold text-2xl mb-1">{member.name}</h3>
        <p className="text-lg text-gray-300 mb-2">{member.role}</p>
      </div>
      <MemberAvatar
        src={member.image || member.src || ""}
        alt={member.name}
        containerClassName="w-32 h-32 ml-4"
        className="rounded-2xl shadow"
      />

      {/* Visual-only horizontal bottom slider for HOD's assigned team members (zero layout shift) */}
      {hasTeamToReveal && (
        <m.div
          aria-hidden={!showSlider}
          initial={false}
          animate={
            showSlider
              ? { opacity: 1, y: 0, scaleY: 1 }
              : { opacity: 0, y: -10, scaleY: 0.85 }
          }
          transition={
            prefersReduced
              ? { duration: 0.01 }
              : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
          }
          style={{ transformOrigin: "top center" }}
          className="pointer-events-none absolute left-5 right-5 top-[calc(100%-4px)] z-10 rounded-b-2xl border border-t-0 border-[#E0B866]/45 bg-[#3B001B] text-[#FFF9ED] px-4 py-2 shadow-lg overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-[13px] font-semibold tracking-wide text-[#FFF9ED] leading-snug">
            {assignedNames.map((memberName, idx) => (
              <React.Fragment key={`${memberName}-${idx}`}>
                <span>{memberName}</span>
                {idx < assignedNames.length - 1 && (
                  <span aria-hidden="true" className="text-[#E0B866]/70">
                    |
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </m.div>
      )}
    </>
  );

  return (
    <LazyMotion features={domAnimation}>
      {canOpenProfile ? (
        <Link
          href={`/team-members/${slug}`}
          ref={(el) => cardRef?.(el)}
          aria-label={`View profile of ${member.name}`}
          onMouseEnter={() => {
            if (hasTeamToReveal) setIsOpen(true);
          }}
          onMouseLeave={() => {
            if (hasTeamToReveal) setIsOpen(false);
          }}
          onFocus={() => {
            if (hasTeamToReveal) setIsOpen(true);
          }}
          onBlur={() => {
            if (hasTeamToReveal) setIsOpen(false);
          }}
          className={sharedClassName}
        >
          {cardInner}
        </Link>
      ) : (
        <div
          ref={(el) => cardRef?.(el)}
          className={sharedClassName}
        >
          {cardInner}
        </div>
      )}
    </LazyMotion>
  );
}
