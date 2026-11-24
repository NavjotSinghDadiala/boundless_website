"use client";

import React from "react";
import { Flag, Sparkles } from "lucide-react";
import type { TeamMemberProfileData } from "@/lib/teamProfiles";
import { EditorialReveal } from "./ProfileMotionPrimitives";

export default function ProfileJourneySection({
  profile,
}: {
  profile: TeamMemberProfileData;
}) {
  const hasOrigin = Boolean(profile.firstRoleAndDept);
  const hasGrowth = Boolean(profile.personalGrowth);

  if (!hasOrigin && !hasGrowth) return null;

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 py-14 md:py-20 border-b border-[#3B001B]/10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Sticky Origin Column */}
        <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
          <EditorialReveal>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d1a2c] mb-2">
              Chapter 01
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1c1015] leading-tight">
              The Boundless Journey
            </h2>
          </EditorialReveal>

          {hasOrigin && (
            <EditorialReveal delay={0.1}>
              <div className="pt-5 border-t border-[#3B001B]/15 space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#6d1a2c]/80">
                  <Flag className="w-3.5 h-3.5 text-amber-700" />
                  <span>Where It Started</span>
                </div>
                <p className="text-base font-semibold text-[#1c1015] leading-relaxed">
                  {profile.firstRoleAndDept}
                </p>
              </div>
            </EditorialReveal>
          )}
        </div>

        {/* Right Editorial Narrative Spread */}
        <div className="lg:col-span-8">
          {hasGrowth ? (
            <EditorialReveal delay={0.14}>
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Personal Growth & Reflection</span>
                </div>
                <p className="text-lg sm:text-xl md:text-[1.35rem] leading-[1.75] text-[#2a1a20] font-normal whitespace-pre-line">
                  {profile.personalGrowth}
                </p>
              </div>
            </EditorialReveal>
          ) : (
            <EditorialReveal delay={0.14}>
              <p className="text-base text-stone-600 leading-relaxed">
                Began their journey with Boundless as {profile.firstRoleAndDept}.
              </p>
            </EditorialReveal>
          )}
        </div>
      </div>
    </section>
  );
}
