import React from "react";
import { Backpack, CheckSquare, Sparkles } from "lucide-react";

interface TripThingsToCarryProps {
  thingsToCarry?: string[];
}

export default function TripThingsToCarry({ thingsToCarry }: TripThingsToCarryProps) {
  if (!thingsToCarry || thingsToCarry.length === 0) {
    return null;
  }

  const validItems = thingsToCarry.map((item) => String(item).trim()).filter(Boolean);

  if (validItems.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-12 lg:p-14 backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Top highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          <div className="absolute -top-24 left-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-3 mb-8 pb-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-lg">
              <Backpack className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-emerald-300/80">
                Expedition Readiness Checklist
              </p>
              <h2 className="font-oswald text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
                Things To Carry
              </h2>
            </div>
          </div>

          {/* Glowing Checklist Pills */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {validItems.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl p-4 sm:p-5 backdrop-blur-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-emerald-400/30 transition-all duration-200 flex items-center gap-3.5 shadow-sm group"
              >
                <div className="text-emerald-400 p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0 group-hover:scale-110 transition-transform">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span className="text-white/80 text-sm sm:text-base font-medium leading-snug">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
