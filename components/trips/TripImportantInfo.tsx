import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface TripImportantInfoProps {
  importantInformation?: string;
}

export default function TripImportantInfo({ importantInformation }: TripImportantInfoProps) {
  if (!importantInformation || !importantInformation.trim()) {
    return null;
  }

  const paragraphs = importantInformation
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="w-full py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-12 lg:p-14 backdrop-blur-2xl bg-amber-950/20 border border-amber-500/30 shadow-[0_25px_60px_rgba(251,191,36,0.1)] overflow-hidden">
          {/* Top highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          <div className="absolute -top-20 left-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-3 mb-8 pb-6 border-b border-amber-500/20">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-lg">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-amber-300/80">
                Safety & Compliance Guidelines
              </p>
              <h2 className="font-oswald text-2xl sm:text-4xl font-black uppercase text-amber-200 tracking-tight">
                Important Travel Advisory
              </h2>
            </div>
          </div>

          <div className="relative z-10 space-y-4 text-white/80 text-base sm:text-lg leading-relaxed max-w-4xl">
            {paragraphs.map((para, idx) => (
              <p key={idx} className="whitespace-pre-line leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
