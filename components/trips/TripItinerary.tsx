import React from "react";
import { CalendarDays, ExternalLink, Milestone, Sparkles } from "lucide-react";
import { TripItineraryItem } from "./TripCard";

interface TripItineraryProps {
  itinerary?: TripItineraryItem[];
  itineraryLink?: string;
}

export default function TripItinerary({ itinerary, itineraryLink }: TripItineraryProps) {
  const validItems = (itinerary || []).filter(
    (item) => (item.title && item.title.trim()) || (item.description && item.description.trim())
  );

  const hasLink = Boolean(itineraryLink && itineraryLink.trim());

  if (validItems.length === 0 && !hasLink) {
    return null;
  }

  return (
    <section className="w-full py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-12 lg:p-14 backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Top highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          <div className="absolute -top-24 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-lg">
                <Milestone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-300/80">
                  Chronological Blueprint
                </p>
                <h2 className="font-oswald text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
                  Expedition Itinerary
                </h2>
              </div>
            </div>

            {hasLink && (
              <a
                href={itineraryLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 hover:text-white font-oswald text-xs uppercase tracking-wider font-bold shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 transition-all self-start sm:self-auto group"
              >
                <span>View Full Master Itinerary</span>
                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            )}
          </div>

          {/* Glowing Transit Track */}
          <div className="relative border-l-2 border-cyan-500/25 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-8 sm:space-y-10">
            {validItems.map((item, idx) => (
              <div key={idx} className="relative group">
                {/* Glowing Node Marker */}
                <div className="absolute -left-[33px] sm:-left-[49px] top-2 w-6 h-6 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.8)] group-hover:scale-125 transition-transform">
                  <div className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
                </div>

                <div className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-7 backdrop-blur-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-cyan-400/30 transition-all duration-300 shadow-lg">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                      {item.day || `Day 0${idx + 1}`}
                    </span>
                    <h3 className="font-oswald text-xl sm:text-2xl font-bold text-white tracking-wide">
                      {item.title}
                    </h3>
                  </div>

                  {item.description && (
                    <p className="text-white/70 text-sm sm:text-base leading-relaxed whitespace-pre-line mt-3">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
