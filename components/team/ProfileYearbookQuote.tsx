"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { EditorialReveal } from "./ProfileMotionPrimitives";

export default function ProfileYearbookQuote({
  quote,
  memberName,
  role,
}: {
  quote?: string;
  memberName: string;
  role: string;
}) {
  if (!quote) return null;

  return (
    <section className="relative bg-[#3B001B] text-[#FFF9ED] py-16 md:py-24 px-5 sm:px-8 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, #E0B866 0%, transparent 55%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-7">
        <EditorialReveal>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#E0B866]">
            <Compass className="w-3.5 h-3.5" />
            <span>Boundless Yearbook Statement</span>
          </div>
        </EditorialReveal>

        <EditorialReveal delay={0.08}>
          <blockquote className="relative">
            <span
              aria-hidden="true"
              className="block font-serif text-6xl sm:text-7xl leading-none text-[#E0B866]/50 select-none mb-2"
            >
              &ldquo;
            </span>
            <p className="font-serif italic text-2xl sm:text-3xl md:text-4xl leading-snug text-[#FFF9ED] tracking-tight">
              {quote}
            </p>
          </blockquote>
        </EditorialReveal>

        <EditorialReveal delay={0.16}>
          <div className="pt-2 space-y-1">
            <div className="text-base font-bold text-[#E0B866]">{memberName}</div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#FFF9ED]/65">
              {role} • Boundless Travel Society
            </div>
          </div>
        </EditorialReveal>

        <EditorialReveal delay={0.22}>
          <div className="pt-6">
            <Link
              href="/team-members"
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full border border-[#E0B866]/40 bg-[#FFF9ED]/10 hover:bg-[#E0B866] hover:text-[#3B001B] text-[#FFF9ED] text-sm font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Explore All Team Members</span>
            </Link>
          </div>
        </EditorialReveal>
      </div>
    </section>
  );
}
