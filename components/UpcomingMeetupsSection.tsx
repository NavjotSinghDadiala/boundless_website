"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Compass, ArrowRight, Wrench } from "lucide-react";

/**
 * Public City Meetups Registration Notice.
 * Active city meetup registration is being unified into Boundless' main
 * trip-management system. Existing registration APIs and records remain intact
 * on the backend; this component intentionally renders no Register/Cancel
 * controls or seat counts.
 */
export default function UpcomingMeetupsSection() {
  return (
    <section
      id="city-meetup-registration-status"
      className="relative z-10 max-w-7xl mx-auto mb-10"
    >
      <div className="rounded-3xl border border-amber-900/15 bg-gradient-to-br from-[#3B001B] via-[#4b0f1e] to-[#2b0913] p-6 sm:p-8 shadow-xl text-amber-50 overflow-hidden relative">
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(circle at 85% 20%, #fbbf24 0%, transparent 45%)",
          }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-semibold uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5" />
              Platform Integration In Progress
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-50">
              City Meetup Registrations — Currently Under Development
            </h2>
            <p className="text-sm sm:text-base text-amber-100/80 leading-relaxed">
              We&apos;re integrating upcoming City Meetup registrations directly into
              Boundless&apos; main trip-management system so you can discover, register,
              and track every Boundless experience in one place. Meanwhile, explore our
              completed city meetups and flagship memories across India below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/trip-registration"
              className="min-h-[46px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-sm font-bold inline-flex items-center gap-2 transition-colors shadow-md"
            >
              <Compass className="w-4 h-4" />
              Explore Active Trips
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/my-trips"
              className="min-h-[46px] px-5 rounded-xl border border-amber-300/35 bg-white/10 hover:bg-white/15 text-amber-50 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              My Trips
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
