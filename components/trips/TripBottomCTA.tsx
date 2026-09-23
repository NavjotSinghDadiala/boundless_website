"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles, MapPin, ShieldCheck } from "lucide-react";
import { Trip } from "./TripCard";

interface TripBottomCTAProps {
  trip: Trip;
}

export default function TripBottomCTA({ trip }: TripBottomCTAProps) {
  const isCompleted = !!trip.isCompleted || !!trip.finalRosterSaved;
  const isRegistrationOpen = !!trip.registrationOpen && !isCompleted;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* ── Closing Cosmic Banner ── */}
      <section className="w-full py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl sm:rounded-[3rem] p-8 sm:p-16 lg:p-20 text-center backdrop-blur-3xl bg-gradient-to-b from-white/[0.04] via-slate-900/60 to-slate-950/80 border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.8)]">
            {/* Ambient Aurora Orbs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-amber-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-6 text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.25)]">
                <Compass className="w-8 h-8" />
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-amber-300/80 mb-2">
                IIT Madras Boundless Society
              </span>

              <h2 className="font-oswald text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-4 leading-tight">
                Ready For The Journey?
              </h2>

              <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-8 max-w-lg">
                {isRegistrationOpen
                  ? "Secure your official expedition pass and travel with fellow IIT Madras students. All logistics coordinated end-to-end."
                  : "Registrations for this expedition are finalized. Explore our upcoming journeys to join the next adventure."}
              </p>

              {isCompleted ? (
                <button
                  disabled
                  className="cursor-not-allowed px-10 py-4 rounded-full font-oswald text-sm uppercase tracking-wider bg-white/10 text-white/40 border border-white/10"
                >
                  Expedition Concluded
                </button>
              ) : isRegistrationOpen ? (
                <Link
                  href={`/trip-registration?tripId=${trip.id}`}
                  className="inline-flex items-center gap-3 px-10 sm:px-12 py-4 rounded-full font-oswald text-base sm:text-lg uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black shadow-[0_0_40px_rgba(251,191,36,0.5)] active:scale-95 transition-all group"
                >
                  <span>Reserve Expedition Pass</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed px-10 py-4 rounded-full font-oswald text-sm uppercase tracking-wider bg-white/10 text-white/40 border border-white/10"
                >
                  Registration Closed
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Floating Sticky Glass Action Dock (Appears when scrolling) ── */}
      {isRegistrationOpen && (
        <div
          className={`fixed bottom-5 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 transition-all duration-500 ${
            scrolled ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
          }`}
        >
          <div className="backdrop-blur-2xl bg-slate-950/85 border border-white/20 rounded-full px-5 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center justify-between sm:gap-6 max-w-xl mx-auto ring-1 ring-white/10">
            {/* Trip Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-oswald text-sm font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {trip.name}
                </span>
                {trip.fee !== undefined && (
                  <span className="block text-[11px] font-mono text-amber-300">
                    {trip.fee > 0 ? `₹${trip.fee.toLocaleString("en-IN")}` : "Free Pass"}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Register CTA */}
            <Link
              href={`/trip-registration?tripId=${trip.id}`}
              id="mobile-sticky-register-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-oswald text-xs uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-bold shadow-[0_0_20px_rgba(251,191,36,0.4)] active:scale-95 transition-all shrink-0"
            >
              <span>Reserve Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
