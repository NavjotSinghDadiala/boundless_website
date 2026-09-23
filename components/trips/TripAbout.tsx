import React from "react";
import { Compass, BookOpen } from "lucide-react";

interface TripAboutProps {
  description?: string;
}

export default function TripAbout({ description }: TripAboutProps) {
  if (!description || !description.trim()) {
    return null;
  }

  const paragraphs = description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="w-full py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-12 lg:p-14 backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Top highlight line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          
          {/* Subtle ambient light */}
          <div className="absolute -top-24 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-amber-300/80">
                Narrative & Journey Overview
              </p>
              <h2 className="font-oswald text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
                Expedition Briefing
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 space-y-5 text-white/80 text-base sm:text-lg leading-relaxed max-w-4xl">
            {paragraphs.map((para, idx) => (
              <p
                key={idx}
                className={
                  idx === 0
                    ? "text-lg sm:text-xl font-medium text-white/95 leading-relaxed border-l-2 border-amber-400/60 pl-4 py-0.5"
                    : "whitespace-pre-line text-white/75"
                }
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
