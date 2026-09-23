"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Sparkles,
  Users,
  ChevronRight,
} from "lucide-react";
import { Trip } from "./TripCard";
import { formatTripDates, formatRegistrationDeadline } from "@/lib/tripDateUtils";

interface TripDetailHeroProps {
  trip: Trip;
}

export default function TripDetailHero({ trip }: TripDetailHeroProps) {
  const isCompleted = !!trip.isCompleted || !!trip.finalRosterSaved;
  const isRegistrationOpen = !!trip.registrationOpen && !isCompleted;
  const images = trip.images || [];
  const formattedDates = formatTripDates(trip.startDate, trip.endDate);
  const formattedDeadline = formatRegistrationDeadline(trip.registrationDeadline);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const mainImage = images[activeImgIndex]?.url || images[0]?.url;

  return (
    <section className="relative w-full pt-4 pb-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Cinematic Panoramic Glass Viewport ── */}
        <div className="relative w-full h-[420px] sm:h-[540px] lg:h-[620px] rounded-3xl sm:rounded-[2.5rem] overflow-hidden border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.8)] bg-slate-950 group">
          {/* Main Visual Image */}
          {mainImage ? (
            <Image
              src={mainImage}
              alt={trip.name}
              fill
              priority
              unoptimized
              className="object-cover scale-100 group-hover:scale-105 transition-transform duration-1000 ease-out"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
              <div className="w-24 h-24 rounded-3xl bg-white/[0.05] border border-white/20 backdrop-blur-2xl flex items-center justify-center mb-4 shadow-2xl">
                <Compass className="w-12 h-12 text-amber-300 animate-spin-slow" />
              </div>
              <p className="text-xs uppercase tracking-widest font-mono text-amber-300/80 mb-2">
                IIT Madras • Boundless Expedition Pass
              </p>
              <h2 className="font-oswald text-4xl sm:text-6xl font-black uppercase text-white tracking-tight">
                {trip.name}
              </h2>
            </div>
          )}

          {/* Deep Vignette & Liquid Gradient Masks */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/30 pointer-events-none" />

          {/* Top Glass Telemetry Bar */}
          <div className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 flex flex-wrap items-center justify-between gap-3 z-20">
            {/* Status Pill */}
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-xl bg-slate-900/80 text-slate-300 border border-white/10 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Expedition Concluded
                </span>
              ) : isRegistrationOpen ? (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-xl bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  Registration Open
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-xl bg-amber-950/70 text-amber-300 border border-amber-500/40 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Registration Closed
                </span>
              )}

              {/* Destination Beacon */}
              {trip.destination && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide backdrop-blur-xl bg-white/[0.08] text-white border border-white/20 shadow-lg">
                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                  <span className="uppercase tracking-wider">{trip.destination}</span>
                </span>
              )}
            </div>

            {/* Fee Glass Badge */}
            {trip.fee !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full backdrop-blur-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.2)]">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-200/70">Expedition Fee:</span>
                <span className="font-oswald text-base sm:text-lg font-bold">
                  {trip.fee > 0 ? `₹${trip.fee.toLocaleString("en-IN")}` : "Complimentary"}
                </span>
              </div>
            )}
          </div>

          {/* Multi-Image Thumbnails Lens (if multiple images) */}
          {images.length > 1 && (
            <div className="absolute top-20 right-4 sm:right-6 hidden md:flex flex-col gap-2 z-20">
              {images.slice(0, 4).map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImgIndex(i)}
                  className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all relative shadow-lg ${
                    activeImgIndex === i
                      ? "border-amber-400 scale-105 ring-2 ring-amber-400/50"
                      : "border-white/30 opacity-70 hover:opacity-100 hover:scale-100"
                  }`}
                >
                  <Image src={img.url} alt={`Preview ${i}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Bottom Cockpit HUD Overlay */}
          <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 lg:p-12 z-20 flex flex-col justify-end">
            <div className="max-w-3xl">
              {/* Route & Dates Pill */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium text-white/80 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15">
                  <Calendar className="w-3.5 h-3.5 text-amber-300" />
                  <span>{formattedDates}</span>
                </span>
                {formattedDeadline && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15 text-white/90">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Closes {formattedDeadline}</span>
                  </span>
                )}
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>IITM Verified Expedition</span>
                </span>
              </div>

              {/* Expedition Master Title */}
              <h1 className="font-oswald text-4xl sm:text-6xl lg:text-7xl font-black uppercase text-white tracking-tight leading-[1.05] drop-shadow-2xl mb-4 sm:mb-6">
                {trip.name}
              </h1>

              {/* Primary Floating Action Console */}
              <div className="flex flex-wrap items-center gap-4">
                {isCompleted ? (
                  <button
                    disabled
                    className="cursor-not-allowed px-8 py-4 rounded-full font-oswald text-sm sm:text-base uppercase tracking-wider bg-white/10 text-white/50 border border-white/15 backdrop-blur-xl"
                  >
                    Expedition Concluded
                  </button>
                ) : isRegistrationOpen ? (
                  <Link
                    href={`/trip-registration?tripId=${trip.id}`}
                    id="hero-register-btn"
                    className="inline-flex items-center gap-3 px-8 sm:px-10 py-4 rounded-full font-oswald text-base sm:text-lg uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-bold shadow-[0_0_35px_rgba(251,191,36,0.4)] active:scale-95 transition-all group"
                  >
                    <span>Reserve Expedition Pass</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="cursor-not-allowed px-8 py-4 rounded-full font-oswald text-sm sm:text-base uppercase tracking-wider bg-white/10 text-white/50 border border-white/15 backdrop-blur-xl"
                  >
                    Registration Closed
                  </button>
                )}

                {/* Capacity Counter */}
                {trip.totalSeats && (
                  <div className="hidden sm:flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-950/60 backdrop-blur-xl border border-white/15 text-xs text-white/90">
                    <Users className="w-4 h-4 text-amber-300" />
                    <span>
                      <strong>{Math.max(0, (trip.totalSeats || 0) - (trip.totalJoined || 0))}</strong> spots remaining of {trip.totalSeats}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
