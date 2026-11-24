"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ExternalLink, Film, FolderOpen, ImageIcon, X } from "lucide-react";
import {
  optimizeMemberImageUrl,
  type ProfileMediaItem,
} from "@/lib/teamProfiles";

export default function DepartmentMediaGallery({
  media,
  departmentLabel,
}: {
  media: ProfileMediaItem[];
  departmentLabel: string;
}) {
  const [lightboxImage, setLightboxImage] = useState<ProfileMediaItem | null>(null);

  if (!media || media.length === 0) return null;

  const directImages = media.filter((m) => m.kind === "image");
  const externalLinks = media.filter((m) => m.kind !== "image");

  return (
    <div className="pt-6 space-y-5">
      <div className="flex items-center justify-between border-b border-[#3B001B]/10 pb-2.5">
        <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[#6d1a2c]">
          Featured {departmentLabel} Work
        </h4>
        <span className="text-xs text-stone-500 font-medium">
          {media.length} {media.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Direct Cloudinary / Hosted Images (Future Admin Uploads) */}
      {directImages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {directImages.map((item, idx) => {
            const src = optimizeMemberImageUrl(item.url, 700);
            return (
              <button
                key={`${item.url}-${idx}`}
                type="button"
                onClick={() => setLightboxImage(item)}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#3B001B]/10 bg-stone-100 text-left focus:outline-none focus:ring-2 focus:ring-[#3B001B]"
              >
                <Image
                  src={src}
                  alt={item.title || `${departmentLabel} work ${idx + 1}`}
                  fill
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized={!src.includes("res.cloudinary.com")}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {item.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3">
                    <span className="text-xs font-semibold text-white line-clamp-1">
                      {item.title}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Safe External-Link Cards (e.g. Google Drive Form Uploads) */}
      {externalLinks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {externalLinks.map((item, idx) => {
            const isDrive = item.url.includes("drive.google.com");
            const isMediaDept = departmentLabel.toLowerCase().includes("media");
            return (
              <a
                key={`${item.url}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group min-h-[68px] p-4 rounded-2xl border border-[#3B001B]/15 bg-white/80 hover:bg-white hover:border-[#3B001B]/40 hover:shadow-md transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#3B001B]/8 text-[#3B001B] flex items-center justify-center shrink-0 group-hover:bg-[#3B001B] group-hover:text-[#FFF9ED] transition-colors">
                    {isMediaDept ? (
                      <Film className="w-5 h-5" />
                    ) : isDrive ? (
                      <FolderOpen className="w-5 h-5" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#1c1015] truncate">
                      {item.title || `${departmentLabel} Work Sample ${idx + 1}`}
                    </div>
                    <div className="text-xs text-stone-500 truncate mt-0.5">
                      {item.caption ||
                        (isDrive
                          ? "Open in Google Drive"
                          : "Open external showcase link")}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#6d1a2c] shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            );
          })}
        </div>
      )}

      {/* Simple Accessible Lightbox for Direct Images */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={optimizeMemberImageUrl(lightboxImage.url, 1400)}
              alt={lightboxImage.title || departmentLabel}
              className="max-h-[78vh] w-auto rounded-xl object-contain shadow-2xl"
            />
            {lightboxImage.title && (
              <p className="text-sm text-white/90 font-medium">{lightboxImage.title}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
