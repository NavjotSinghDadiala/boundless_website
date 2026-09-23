import React from "react";
import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function TripNotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center backdrop-blur-3xl bg-white/[0.03] border border-white/15 rounded-3xl sm:rounded-[2.5rem] p-8 sm:p-12 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 mb-6 shadow-xl">
          <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: "14s" }} />
        </div>

        <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300/80 block mb-2">
          Expedition Offline
        </span>

        <h1 className="font-oswald text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mb-3">
          Trip Not Found
        </h1>

        <p className="text-white/70 text-sm leading-relaxed mb-8">
          This expedition route may have concluded or is no longer listed. Discover open journeys across India with fellow students.
        </p>

        <Link
          href="/#upcoming-trips"
          className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-oswald text-xs uppercase tracking-wider font-bold bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-[0_0_25px_rgba(251,191,36,0.3)] hover:scale-105 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore Open Expeditions</span>
        </Link>
      </div>
    </div>
  );
}
