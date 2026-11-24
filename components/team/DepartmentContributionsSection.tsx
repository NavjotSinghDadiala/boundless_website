"use client";

import React, { useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Award, Layers } from "lucide-react";
import {
  getDepartmentMeta,
  type DepartmentContributionSection,
  type ProfileContributionItem,
} from "@/lib/teamProfiles";
import { EditorialReveal } from "./ProfileMotionPrimitives";
import DepartmentMediaGallery from "./DepartmentMediaGallery";

function splitTags(value: string): string[] {
  return value
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extracts a concise leading metric (e.g. "14 trips", "55+ participants", "25+ designs")
 * if present, while preserving the full original answer underneath without ever inventing stats.
 */
function splitLeadingStat(value: string): { headline: string; detail: string | null } {
  const trimmed = value.trim();
  if (trimmed.length <= 28) {
    return { headline: trimmed, detail: null };
  }
  const match = trimmed.match(/^([~≈]?\d+\+?\s*(?:trips?|events?|times?|designs?|projects?|participants?|cities)?)/i);
  if (match && match[1].trim().length >= 2) {
    return { headline: match[1].trim(), detail: trimmed };
  }
  return { headline: trimmed.slice(0, 28).trim() + "…", detail: trimmed };
}

function DepartmentChapterBody({
  section,
  chapterNumber,
}: {
  section: DepartmentContributionSection;
  chapterNumber: number;
}) {
  const meta = getDepartmentMeta(section.departmentKey);
  const statItems = section.items.filter((i) => i.displayAs === "stat");
  const tagItems = section.items.filter((i) => i.displayAs === "tags");
  const highlightItems = section.items.filter((i) => i.displayAs === "highlight");
  const narrativeItems = section.items.filter(
    (i) => !i.displayAs || i.displayAs === "narrative"
  );

  return (
    <div className="space-y-10">
      {/* Chapter Heading Strip */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-2 border-[#3B001B]/15 pb-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d1a2c] mb-1">
            Department {String(chapterNumber).padStart(2, "0")}
          </div>
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-[#1c1015]">
            {section.departmentLabel}
          </h3>
        </div>
        {meta.tagline && (
          <p className="text-sm text-stone-600 max-w-md sm:text-right">
            {meta.tagline}
          </p>
        )}
      </div>

      {/* 1. Editorial Ledger Strip (Stats — hairline separated, NOT repetitive cards) */}
      {statItems.length > 0 && (
        <div
          className={`grid grid-cols-1 ${
            statItems.length === 2
              ? "sm:grid-cols-2"
              : statItems.length >= 3
              ? "sm:grid-cols-3"
              : ""
          } divide-y sm:divide-y-0 sm:divide-x divide-[#3B001B]/15 border-y border-[#3B001B]/15 bg-[#FBF2DF]/70 rounded-2xl overflow-hidden`}
        >
          {statItems.map((item) => {
            const { headline, detail } = splitLeadingStat(item.value);
            return (
              <div key={item.key} className="p-5 sm:p-6 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6d1a2c]/80">
                  {item.label}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#3B001B] tracking-tight leading-snug">
                  {headline}
                </div>
                {detail && (
                  <p className="text-sm text-stone-700 leading-relaxed pt-1">
                    {detail}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Archival Spec Pills (Tags — e.g. Technicals Areas / Females Corner Areas) */}
      {tagItems.length > 0 && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-6 py-2">
          {tagItems.map((item) => (
            <div key={item.key} className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d1a2c]/80">
                {item.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {splitTags(item.value).map((tag, idx) => (
                  <span
                    key={`${tag}-${idx}`}
                    className="px-3.5 py-1.5 rounded-full text-sm font-semibold bg-[#3B001B] text-[#FFF9ED]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Featured Editorial Callout (Highlights — Proudest Project / Sponsorship / Event) */}
      {highlightItems.length > 0 && (
        <div className="space-y-4">
          {highlightItems.map((item: ProfileContributionItem) => (
            <div
              key={item.key}
              className="relative pl-6 sm:pl-8 py-4 pr-5 rounded-r-2xl border-l-4 border-[#3B001B] bg-gradient-to-r from-[#3B001B]/[0.06] to-transparent"
            >
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6d1a2c] mb-2">
                <Award className="w-4 h-4 text-amber-700" />
                <span>{item.label}</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-[#1c1015] leading-relaxed whitespace-pre-line">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 4. Magazine Q&A Blocks (Narratives — generous spacing, asymmetric 2-col layout) */}
      {narrativeItems.length > 0 && (
        <div className="divide-y divide-[#3B001B]/10">
          {narrativeItems.map((item) => (
            <div
              key={item.key}
              className="py-6 first:pt-2 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 items-start"
            >
              <div className="md:col-span-4">
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#6d1a2c]">
                  {item.label}
                </h4>
              </div>
              <div className="md:col-span-8">
                <p className="text-base sm:text-[1.0625rem] leading-[1.75] text-[#2a1a20] whitespace-pre-line">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Department Media / Work Showcase */}
      {section.media && section.media.length > 0 && (
        <DepartmentMediaGallery
          media={section.media}
          departmentLabel={section.departmentLabel}
        />
      )}
    </div>
  );
}

export default function DepartmentContributionsSection({
  sections,
}: {
  sections: DepartmentContributionSection[];
}) {
  const prefersReduced = useReducedMotion();
  const [selectedDept, setSelectedDept] = useState<string>("all");

  if (!sections || sections.length === 0) return null;

  const isMultiDepartment = sections.length > 1;
  const visibleSections =
    selectedDept === "all"
      ? sections
      : sections.filter((s) => s.departmentKey === selectedDept);

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 py-14 md:py-20">
      {/* Multi-department switcher bar (only shown when member worked across 2+ departments) */}
      {isMultiDepartment && (
        <EditorialReveal className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#3B001B]/10">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#6d1a2c]">
              <Layers className="w-4 h-4 text-amber-700" />
              <span>Multi-Department Contributions ({sections.length})</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedDept("all")}
                className={`min-h-[42px] px-4 rounded-full text-sm font-semibold transition-colors ${
                  selectedDept === "all"
                    ? "bg-[#3B001B] text-[#FFF9ED]"
                    : "bg-[#3B001B]/8 text-[#3B001B] hover:bg-[#3B001B]/15"
                }`}
              >
                All Chapters
              </button>
              {sections.map((sec) => (
                <button
                  key={sec.departmentKey}
                  type="button"
                  onClick={() => setSelectedDept(sec.departmentKey)}
                  className={`min-h-[42px] px-4 rounded-full text-sm font-semibold transition-colors ${
                    selectedDept === sec.departmentKey
                      ? "bg-[#3B001B] text-[#FFF9ED]"
                      : "bg-[#3B001B]/8 text-[#3B001B] hover:bg-[#3B001B]/15"
                  }`}
                >
                  {sec.departmentLabel}
                </button>
              ))}
            </div>
          </div>
        </EditorialReveal>
      )}

      {/* Animated Department Chapters */}
      <AnimatePresence mode="wait">
        <m.div
          key={selectedDept}
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-16"
        >
          {visibleSections.map((sec, idx) => (
            <EditorialReveal key={sec.departmentKey} delay={idx * 0.06}>
              <DepartmentChapterBody
                section={sec}
                chapterNumber={
                  sections.findIndex((s) => s.departmentKey === sec.departmentKey) + 1
                }
              />
            </EditorialReveal>
          ))}
        </m.div>
      </AnimatePresence>
    </section>
  );
}
