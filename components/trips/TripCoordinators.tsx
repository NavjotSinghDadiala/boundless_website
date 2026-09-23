import React from "react";
import { ShieldCheck, Compass, Sparkles } from "lucide-react";
import { TripCoordinator } from "./TripCard";

interface TripCoordinatorsProps {
  coordinators?: (TripCoordinator | string)[];
}

export default function TripCoordinators({ coordinators }: TripCoordinatorsProps) {
  if (!coordinators || coordinators.length === 0) {
    return null;
  }

  // Extract clean names only — STRICTLY PRIVACY COMPLIANT (NO EMAILS OR PHONE NUMBERS EXPOSED PUBLICLY)
  const names = coordinators
    .map((c) => {
      if (typeof c === "object" && c !== null) {
        return c.name ? String(c.name).trim() : "";
      }
      return String(c).trim();
    })
    .filter(Boolean);

  if (names.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-12 lg:p-14 backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Top highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          <div className="absolute -top-20 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 mb-8 sm:mb-10 pb-6 border-b border-white/10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-mono uppercase tracking-widest mb-3">
              <Compass className="w-3.5 h-3.5" />
              <span>Student Leadership & Safety</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-oswald font-black uppercase text-white tracking-tight">
              Expedition Command & Coordinators
            </h2>
            <p className="text-white/60 text-xs sm:text-sm mt-1 max-w-xl">
              Official IIT Madras student leaders guiding this journey. Direct communication frequencies are unlocked on your confirmed travel pass.
            </p>
          </div>

          {/* Holographic Cards Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {names.map((name, idx) => {
              const initials = name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={idx}
                  className="group relative p-5 rounded-3xl backdrop-blur-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-blue-400/40 shadow-lg hover:shadow-[0_10px_30px_rgba(59,130,246,0.2)] transition-all duration-300 flex items-center gap-4 overflow-hidden"
                >
                  {/* Subtle hover sweep */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                  {/* Gradient Avatar Icon */}
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-oswald font-bold text-base shadow-[0_0_20px_rgba(59,130,246,0.3)] shrink-0 group-hover:scale-105 transition-transform border border-white/20">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-300/80">
                        Lead Coordinator
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                    <span className="block font-oswald text-base sm:text-lg font-bold text-white truncate" title={name}>
                      {name}
                    </span>
                    <span className="block text-[11px] font-mono text-white/40">
                      Boundless Society
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
