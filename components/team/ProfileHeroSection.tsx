"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  Compass,
  Github,
  Globe,
  Instagram,
  Link2,
  Linkedin,
  User,
  Youtube,
} from "lucide-react";
import {
  getDepartmentMeta,
  optimizeMemberImageUrl,
  type TeamMemberRecord,
} from "@/lib/teamProfiles";
import {
  EditorialReveal,
  MaskedDisplayTitle,
  ScrollParallaxPortrait,
} from "./ProfileMotionPrimitives";

function formatTypeBadge(type: string): string {
  switch (type) {
    case "founder":
      return "Founding Member";
    case "council":
      return "Boundless Council";
    case "dept_head":
      return "Department Head";
    default:
      return "Core Team";
  }
}

export default function ProfileHeroSection({
  member,
}: {
  member: TeamMemberRecord;
}) {
  const profile = member.profile;
  const displayRole = profile?.currentPosition || member.role;
  const departments = profile?.departments || [];
  const socials = profile?.socialLinks;
  const yearbookQuote = profile?.yearbookQuote?.trim() || "";
  const optimizedPortrait = member.image
    ? optimizeMemberImageUrl(member.image, 900)
    : "";

  return (
    <header className="relative bg-[#3B001B] text-[#FFF9ED] overflow-hidden border-b border-[#E0B866]/25">
      {/* Subtle archival editorial grid & warm glow (distinct from homepage 3D scene) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #E0B866 1px, transparent 1px), linear-gradient(to bottom, #E0B866 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-[460px] h-[460px] rounded-full bg-[#E0B866]/10 blur-3xl"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-8 pb-14 md:pt-12 md:pb-20">
        {/* Top Back Navigation */}
        <div className="mb-8 md:mb-12 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/team-members"
            className="inline-flex items-center gap-2 min-h-[44px] px-3.5 -ml-3.5 rounded-full text-sm font-medium text-[#FFF9ED]/80 hover:text-[#E0B866] hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Team Members</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#E0B866]/30 bg-[#E0B866]/10 text-[#E0B866] text-xs font-semibold uppercase tracking-[0.16em]">
            <Compass className="w-3.5 h-3.5" />
            <span>{formatTypeBadge(member.type)}</span>
            {member.term && (
              <>
                <span className="opacity-40">•</span>
                <span>{member.term}</span>
              </>
            )}
          </div>
        </div>

        {/* Asymmetric Split-Screen Editorial Composition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left: Typography, Role, Departments, Socials */}
          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
            <div className="space-y-3">
              <p className="text-sm sm:text-base font-semibold uppercase tracking-[0.2em] text-[#E0B866]">
                {displayRole}
              </p>

              <MaskedDisplayTitle
                text={member.name}
                className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-[#FFF9ED]"
              />
            </div>

            {/* Joining Term & Metadata Ledger */}
            <EditorialReveal delay={0.18}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 pt-2 text-sm text-[#FFF9ED]/80 border-t border-[#E0B866]/20">
                {profile?.joinedTerm && (
                  <span className="inline-flex items-center gap-2 pt-3">
                    <Calendar className="w-4 h-4 text-[#E0B866]" />
                    <span>
                      Joined <strong className="text-[#FFF9ED]">{profile.joinedTerm}</strong>
                    </span>
                  </span>
                )}
                {member.term && (
                  <span className="inline-flex items-center gap-2 pt-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E0B866]" />
                    <span>
                      Tenure <strong className="text-[#FFF9ED]">{member.term}</strong>
                    </span>
                  </span>
                )}
              </div>
            </EditorialReveal>

            {/* Department Pills */}
            {departments.length > 0 && (
              <EditorialReveal delay={0.22}>
                <div className="flex flex-wrap gap-2 pt-1">
                  {departments.map((deptKey) => {
                    const meta = getDepartmentMeta(deptKey);
                    return (
                      <span
                        key={deptKey}
                        className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-[#FFF9ED]/10 text-[#FFF9ED] border border-[#FFF9ED]/20"
                      >
                        {meta.label}
                      </span>
                    );
                  })}
                </div>
              </EditorialReveal>
            )}

            {/* Subtle Icon-Only Social Links (immediately visible below name/role/departments; only renders platforms that exist) */}
            {socials &&
              (socials.instagram ||
                socials.linkedin ||
                socials.github ||
                socials.twitter ||
                socials.youtube ||
                socials.portfolio ||
                (socials.other && socials.other.length > 0)) && (
                <EditorialReveal delay={0.26}>
                  <div
                    className="flex flex-wrap items-center gap-2.5 pt-1"
                    aria-label={`${member.name}'s social profiles`}
                  >
                    {socials.instagram && (
                      <a
                        href={socials.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on Instagram`}
                        title="Instagram"
                        className="w-11 h-11 rounded-full border border-[#E0B866]/35 bg-[#FFF9ED]/[0.08] text-[#FFF9ED] hover:bg-[#E0B866] hover:text-[#3B001B] hover:border-[#E0B866] hover:-translate-y-0.5 inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E0B866]"
                      >
                        <Instagram className="w-[18px] h-[18px]" />
                      </a>
                    )}
                    {socials.linkedin && (
                      <a
                        href={socials.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on LinkedIn`}
                        title="LinkedIn"
                        className="w-11 h-11 rounded-full border border-[#E0B866]/35 bg-[#FFF9ED]/[0.08] text-[#FFF9ED] hover:bg-[#E0B866] hover:text-[#3B001B] hover:border-[#E0B866] hover:-translate-y-0.5 inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E0B866]"
                      >
                        <Linkedin className="w-[18px] h-[18px]" />
                      </a>
                    )}
                    {socials.github && (
                      <a
                        href={socials.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on GitHub`}
                        title="GitHub"
                        className="w-11 h-11 rounded-full border border-[#E0B866]/35 bg-[#FFF9ED]/[0.08] text-[#FFF9ED] hover:bg-[#E0B866] hover:text-[#3B001B] hover:border-[#E0B866] hover:-translate-y-0.5 inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E0B866]"
                      >
                        <Github className="w-[18px] h-[18px]" />
                      </a>
                    )}
                    {socials.twitter && (
                      <a
                        href={socials.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on X (Twitter)`}
                        title="X (Twitter)"
                        className="w-11 h-11 rounded-full border border-[#E0B866]/35 bg-[#FFF9ED]/[0.08] text-[#FFF9ED] hover:bg-[#E0B866] hover:text-[#3B001B] hover:border-[#E0B866] hover:-translate-y-0.5 inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E0B866]"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="w-4 h-4 fill-current"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </a>
                    )}
                    {socials.youtube && (
                      <a
                        href={socials.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on YouTube`}
                        title="YouTube"
                        className="w-11 h-11 rounded-full border border-[#E0B866]/35 bg-[#FFF9ED]/[0.08] text-[#FFF9ED] hover:bg-[#E0B866] hover:text-[#3B001B] hover:border-[#E0B866] hover:-translate-y-0.5 inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E0B866]"
                      >
                        <Youtube className="w-[18px] h-[18px]" />
                      </a>
                    )}
                    {socials.portfolio && (
                      <a
                        href={socials.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name}'s personal website`}
                        title="Website / Portfolio"
                        className="w-11 h-11 rounded-full border border-[#E0B866]/35 bg-[#FFF9ED]/[0.08] text-[#FFF9ED] hover:bg-[#E0B866] hover:text-[#3B001B] hover:border-[#E0B866] hover:-translate-y-0.5 inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E0B866]"
                      >
                        <Globe className="w-[18px] h-[18px]" />
                      </a>
                    )}
                    {socials.other?.map((item, idx) => (
                      <a
                        key={`${item.url}-${idx}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} — ${item.label}`}
                        title={item.label}
                        className="w-11 h-11 rounded-full border border-[#E0B866]/35 bg-[#FFF9ED]/[0.08] text-[#FFF9ED] hover:bg-[#E0B866] hover:text-[#3B001B] hover:border-[#E0B866] hover:-translate-y-0.5 inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E0B866]"
                      >
                        <Link2 className="w-[18px] h-[18px]" />
                      </a>
                    ))}
                  </div>
                </EditorialReveal>
              )}

            {/* Boundless Yearbook Editorial Quote (beside portrait on desktop, stacked on mobile) */}
            {yearbookQuote && (
              <EditorialReveal delay={0.3}>
                <blockquote className="relative mt-2 rounded-2xl border border-[#E0B866]/25 bg-[#FFF9ED]/[0.05] px-5 py-5 sm:px-6 sm:py-6 backdrop-blur-[2px]">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#E0B866] mb-3">
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span>Boundless Yearbook</span>
                  </div>
                  <div className="relative pl-4 sm:pl-5 border-l-2 border-[#E0B866]/65">
                    <span
                      aria-hidden="true"
                      className="block font-serif text-4xl sm:text-5xl leading-none text-[#E0B866]/55 select-none -mb-2"
                    >
                      &ldquo;
                    </span>
                    <p className="font-serif italic text-xl sm:text-2xl leading-relaxed text-[#FFF9ED] tracking-tight">
                      {yearbookQuote}
                    </p>
                  </div>
                </blockquote>
              </EditorialReveal>
            )}
          </div>

          {/* Right: Editorial Framed Portrait */}
          <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center lg:justify-end">
            <ScrollParallaxPortrait className="w-full max-w-[340px] sm:max-w-[380px]">
              <div className="relative p-2.5 rounded-[2rem] border border-[#E0B866]/35 bg-gradient-to-b from-[#FFF9ED]/10 to-black/25 shadow-2xl">
                <div className="relative aspect-[4/5] w-full rounded-[1.5rem] overflow-hidden bg-[#240011] flex items-center justify-center">
                  {optimizedPortrait ? (
                    <Image
                      src={optimizedPortrait}
                      alt={member.name}
                      fill
                      priority
                      sizes="(max-width: 768px) 340px, 380px"
                      unoptimized={!optimizedPortrait.includes("res.cloudinary.com")}
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#E0B866]/50 gap-3 p-6 text-center">
                      <div className="w-24 h-24 rounded-full border border-[#E0B866]/30 bg-[#E0B866]/10 flex items-center justify-center">
                        <User className="w-11 h-11 text-[#E0B866]/70" />
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-[#FFF9ED]/50 font-semibold">
                        Boundless Member
                      </span>
                    </div>
                  )}
                </div>

                {/* Archival Corner Tag */}
                <div className="absolute -bottom-3 -left-3 sm:-left-5 px-4 py-2 rounded-xl bg-[#FFF9ED] text-[#3B001B] shadow-lg border border-[#3B001B]/10">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6d1a2c]/70">
                    Boundless Dossier
                  </div>
                  <div className="text-xs font-extrabold">
                    {member.term || "Founding Era"}
                  </div>
                </div>
              </div>
            </ScrollParallaxPortrait>
          </div>
        </div>
      </div>
    </header>
  );
}
