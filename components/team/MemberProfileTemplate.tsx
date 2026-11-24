"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import type { TeamMemberRecord } from "@/lib/teamProfiles";
import {
  EditorialReveal,
  ProfileMotionRoot,
  ReadingProgressRail,
} from "./ProfileMotionPrimitives";
import ProfileHeroSection from "./ProfileHeroSection";
import ProfileJourneySection from "./ProfileJourneySection";
import DepartmentContributionsSection from "./DepartmentContributionsSection";
import ProfileExtracurricularSection from "./ProfileExtracurricularSection";

/**
 * ONE common reusable individual profile template for every Boundless team member.
 * Dynamically adapts to available fields, supports 1..7 departments, and renders a
 * graceful basic editorial dossier when extended profile fields are not yet populated.
 */
export default function MemberProfileTemplate({
  member,
}: {
  member: TeamMemberRecord;
}) {
  const profile = member.profile;
  const sections = profile?.departmentSections || [];
  const extracurricularActivities = profile?.extracurricularActivities || [];
  const hodTeam =
    member.type === "dept_head" && Array.isArray(member.departmentTeam)
      ? member.departmentTeam.filter((m) => m?.name?.trim())
      : [];
  const hasExtendedProfile = Boolean(
    hodTeam.length > 0 ||
      (profile &&
        (profile.firstRoleAndDept ||
          profile.personalGrowth ||
          sections.length > 0 ||
          extracurricularActivities.length > 0 ||
          profile.yearbookQuote))
  );

  return (
    <ProfileMotionRoot>
      <ReadingProgressRail />

      <article className="min-h-screen bg-[#FFF9ED] text-[#1c1015]">
        {/* 1. Split Editorial Hero */}
        <ProfileHeroSection member={member} />

        {/* 2. Extended Dossier Chapters OR Graceful Basic Profile */}
        {hasExtendedProfile ? (
          <>
            {profile && <ProfileJourneySection profile={profile} />}
            <DepartmentContributionsSection sections={sections} />

            {/* HOD Assigned Department Team (Exclusive to HODs — never rendered for Council Members) */}
            {hodTeam.length > 0 && (
              <section className="max-w-6xl mx-auto px-5 sm:px-8 py-12 border-t border-[#3B001B]/10">
                <EditorialReveal>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-4 space-y-1.5">
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d1a2c]">
                        Department Roster
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-[#1c1015]">
                        Department Team
                      </h2>
                    </div>
                    <div className="lg:col-span-8 flex flex-wrap gap-2.5">
                      {hodTeam.map((tm) => (
                        <span
                          key={tm.id}
                          className="px-4 py-2 rounded-full text-sm font-semibold bg-[#3B001B]/8 text-[#3B001B] border border-[#3B001B]/15"
                        >
                          {tm.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </EditorialReveal>
              </section>
            )}

            <ProfileExtracurricularSection activities={extracurricularActivities} />
            <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 pt-6 border-t border-[#3B001B]/10 flex justify-center sm:justify-start">
              <Link
                href="/team-members"
                className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full bg-[#3B001B] hover:bg-[#520026] text-[#FFF9ED] text-sm font-bold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Explore All Team Members</span>
              </Link>
            </div>
          </>
        ) : (
          <section className="max-w-4xl mx-auto px-5 sm:px-8 py-16 md:py-24 text-center space-y-6">
            <EditorialReveal>
              <div className="w-12 h-12 rounded-2xl bg-[#3B001B]/8 text-[#3B001B] flex items-center justify-center mx-auto mb-4">
                <Compass className="w-6 h-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1c1015]">
                {member.name} — {member.role}
              </h2>
              <p className="text-base text-stone-600 max-w-xl mx-auto leading-relaxed mt-3">
                {member.term
                  ? `Served as ${member.role} during the ${member.term} tenure of Boundless Travel Society, IIT Madras BS.`
                  : `Core member of Boundless Travel Society, IIT Madras BS.`}
              </p>
              <div className="pt-6">
                <Link
                  href="/team-members"
                  className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full bg-[#3B001B] hover:bg-[#520026] text-[#FFF9ED] text-sm font-bold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Explore All Team Members</span>
                </Link>
              </div>
            </EditorialReveal>
          </section>
        )}
      </article>
    </ProfileMotionRoot>
  );
}
