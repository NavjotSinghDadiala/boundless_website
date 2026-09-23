import React from "react";
import Image from "next/image";
import { Camera, Sparkles } from "lucide-react";
import { TripImage } from "./TripCard";

interface TripGalleryProps {
  images?: TripImage[];
  tripName: string;
}

export default function TripGallery({ images, tripName }: TripGalleryProps) {
  if (!images || images.length <= 3) {
    return null;
  }

  return (
    <section className="w-full py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-12 lg:p-14 backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Top highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          <div className="absolute -top-20 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-3 mb-8 pb-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-300/80">
                Visual Documentation
              </p>
              <h2 className="font-oswald text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
                Expedition Highlights & Gallery
              </h2>
            </div>
          </div>

          {/* Asymmetric Gallery Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {images.slice(3).map((img, idx) => (
              <div
                key={idx}
                className="relative h-64 sm:h-72 rounded-3xl overflow-hidden border border-white/15 group shadow-lg"
              >
                <Image
                  src={img.url}
                  alt={`${tripName} highlight ${idx + 4}`}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
