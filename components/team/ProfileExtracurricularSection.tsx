"use client";

import React from "react";
import Image from "next/image";
import { ExternalLink, Sparkles } from "lucide-react";
import {
  optimizeMemberImageUrl,
  type ExtracurricularActivity,
} from "@/lib/teamProfiles";
import { EditorialReveal } from "./ProfileMotionPrimitives";

/**
 * Separate editorial section showcasing activities and interests outside IITM BS.
 * Automatically hidden when a member has no extracurricular activities populated.
 */
export default function ProfileExtracurricularSection({
  activities,
}: {
  activities?: ExtracurricularActivity[];
}) {
  if (!activities || activities.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 py-14 md:py-20 border-t border-[#3B001B]/10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Editorial Section Header */}
        <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-3">
          <EditorialReveal>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#6d1a2c] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Outside the Society</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1c1015] leading-tight">
              Beyond IITM BS
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed pt-1">
              Clubs, sports, leadership, volunteering, and personal pursuits beyond
              academics.
            </p>
          </EditorialReveal>
        </div>

        {/* Right Editorial Activity Entries */}
        <div className="lg:col-span-8 divide-y divide-[#3B001B]/12">
          {activities.map((activity, idx) => {
            const imgSrc = activity.image
              ? optimizeMemberImageUrl(activity.image, 700)
              : "";

            return (
              <EditorialReveal
                key={activity.id || `${activity.title}-${idx}`}
                delay={idx * 0.06}
                className="py-7 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="flex-1 space-y-2.5 min-w-0">
                    {(activity.category || activity.year) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">
                        {activity.category && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#3B001B]/8 text-[#6d1a2c] border border-[#3B001B]/15">
                            {activity.category}
                          </span>
                        )}
                        {activity.year && (
                          <span className="text-stone-500">{activity.year}</span>
                        )}
                      </div>
                    )}

                    <h3 className="text-xl sm:text-2xl font-bold text-[#1c1015] leading-snug">
                      {activity.title}
                    </h3>

                    {activity.description && (
                      <p className="text-base leading-[1.7] text-[#2a1a20] whitespace-pre-line">
                        {activity.description}
                      </p>
                    )}

                    {activity.link && (
                      <div className="pt-1">
                        <a
                          href={activity.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6d1a2c] hover:text-[#3B001B] underline underline-offset-4 transition-colors"
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {imgSrc && (
                    <div className="relative w-full sm:w-44 aspect-[4/3] rounded-2xl overflow-hidden border border-[#3B001B]/12 bg-stone-100 shrink-0">
                      <Image
                        src={imgSrc}
                        alt={activity.title}
                        fill
                        loading="lazy"
                        sizes="(max-width: 640px) 100vw, 176px"
                        unoptimized={!imgSrc.includes("res.cloudinary.com")}
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </EditorialReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
