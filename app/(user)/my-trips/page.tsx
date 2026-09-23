"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import CoordinatorRoleModal from "@/components/CoordinatorRoleModal";
import LocationProfileModal from "@/components/LocationProfileModal";

/* ─── Types ──────────────────────────────────────────────────── */
interface Coordinator {
  name: string;
  email?: string;
  phone?: string;
}

interface TripMeta {
  id: string;
  name: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  coverImage?: string | null;
  images?: any[];
  fee: number | null;
  coordinators: Coordinator[];
  whatsappLink: string | null;
}

interface TripEntry {
  tripId: string;
  registrationId?: string;
  humanStatus: string;
  rawStatus: string;
  submittedAt: string | null;
  issueText?: string | null;
  actionRequiredFields?: string[];
  rejectionReason?: string | null;
  source?: string;
  registrationLocation?: string | null;
  trip: TripMeta;
}

interface StudentProfile {
  uid: string;
  email: string;
  name: string;
  studentId: string;
  gender: string;
  studentIdVerified: boolean;
  state?: string;
  cityDistrict?: string;
}

interface DashboardData {
  student: StudentProfile;
  upcomingTrips: TripEntry[];
  pastTrips: TripEntry[];
  stats: { totalTrips: number; upcomingCount: number; pastCount: number };
}

/* ─── Helpers ────────────────────────────────────────────────── */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getStatusConfig(status: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  glow: string;
  pulse?: boolean;
} {
  switch (status) {
    case "Pending Approval":
      return {
        bg: "bg-amber-500/15",
        text: "text-amber-300",
        border: "border-amber-400/40",
        dot: "bg-amber-400",
        glow: "shadow-[0_0_15px_rgba(251,191,36,0.3)]",
        pulse: true,
      };
    case "Action Required":
      return {
        bg: "bg-purple-500/20",
        text: "text-purple-300",
        border: "border-purple-400/40",
        dot: "bg-purple-400",
        glow: "shadow-[0_0_18px_rgba(192,132,252,0.4)]",
        pulse: true,
      };
    case "Approved":
      return {
        bg: "bg-emerald-500/20",
        text: "text-emerald-300",
        border: "border-emerald-400/40",
        dot: "bg-emerald-400",
        glow: "shadow-[0_0_18px_rgba(52,211,153,0.4)]",
        pulse: true,
      };
    case "Rejected":
      return {
        bg: "bg-rose-500/20",
        text: "text-rose-300",
        border: "border-rose-400/40",
        dot: "bg-rose-400",
        glow: "shadow-[0_0_15px_rgba(251,113,133,0.3)]",
      };
    case "Completed":
      return {
        bg: "bg-slate-500/20",
        text: "text-slate-300",
        border: "border-slate-400/30",
        dot: "bg-slate-400",
        glow: "shadow-none",
      };
    default:
      return {
        bg: "bg-white/10",
        text: "text-slate-300",
        border: "border-white/20",
        dot: "bg-slate-400",
        glow: "shadow-none",
      };
  }
}

/* ─── Holographic Laser Status Seal ──────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase backdrop-blur-xl border ${config.bg} ${config.text} ${config.border} ${config.glow}`}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      {status}
    </span>
  );
}

/* ─── Placeholder Cover ──────────────────────────────────────── */
function TripImagePlaceholder({ destination }: { destination: string }) {
  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      <Image
        src="/trip1.png"
        alt={destination || "Trip cover"}
        fill
        className="object-cover opacity-80"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
    </div>
  );
}

/* ─── Coordinator Contact Card ───────────────────────────────── */
function CoordinatorContact({ c }: { c: Coordinator }) {
  const initials = c.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/25 transition-all">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-md border border-white/20">
        {initials}
      </div>
      <div className="flex flex-col gap-0.5 text-xs min-w-0">
        <span className="font-bold text-white truncate">{c.name}</span>
        {c.email && (
          <a
            href={`mailto:${c.email}`}
            className="text-white/60 hover:text-white truncate transition-colors flex items-center gap-1.5 font-mono text-[11px]"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{c.email}</span>
          </a>
        )}
        {c.phone && (
          <a
            href={`tel:${c.phone}`}
            className="text-emerald-400 font-mono font-semibold hover:underline flex items-center gap-1.5 mt-0.5"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{c.phone}</span>
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Cyber-Glass Boarding Pass (Upcoming Trip Card) ──────────── */
function UpcomingTripCard({
  entry,
  student,
}: {
  entry: TripEntry;
  student?: StudentProfile | null;
}) {
  const { humanStatus, trip, issueText, rejectionReason, tripId } = entry;
  const [imgError, setImgError] = useState(false);
  const [showCoords, setShowCoords] = useState(false);

  // Derive cover image from trip (imageUrl, coverImage, or images array)
  const coverImage =
    (!imgError && (
      trip.imageUrl ||
      trip.coverImage ||
      (Array.isArray(trip.images) && trip.images.length > 0
        ? typeof trip.images[0] === "string"
          ? trip.images[0]
          : trip.images[0]?.url
        : null)
    )) || null;

  // Origin location: student's saved residential location, fallback to registration location or IITM Campus
  const originLocation =
    entry.registrationLocation ||
    student?.cityDistrict ||
    student?.state ||
    "IITM Campus";

  const originTooltip =
    student?.cityDistrict && student?.state
      ? `${student.cityDistrict}, ${student.state}`
      : originLocation;

  return (
    <article
      id={`trip-card-${tripId}`}
      className="group relative rounded-3xl sm:rounded-[2.5rem] backdrop-blur-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/25 shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all duration-500 flex flex-col overflow-hidden"
    >
      {/* Top Specular Edge Highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Cover Image */}
      <div className="relative w-full h-52 overflow-hidden bg-slate-950">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={trip.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={() => setImgError(true)}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <TripImagePlaceholder destination={trip.destination} />
        )}

        {/* Ambient Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

        {/* Destination Chip */}
        {trip.destination && (
          <div className="absolute bottom-3 left-4 bg-slate-950/80 backdrop-blur-xl text-white text-[11px] font-mono font-semibold px-3.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-lg">
            <svg
              className="w-3.5 h-3.5 text-amber-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="uppercase tracking-widest">{trip.destination}</span>
          </div>
        )}

        {/* Laser Status Seal */}
        <div className="absolute top-3 right-4">
          <StatusBadge status={humanStatus} />
        </div>
      </div>

      {/* Flight / Transit Route Line Visual: Student's saved location to trip location */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between border-b border-white/10 text-[11px] font-mono text-white/50">
        <span
          className="flex items-center gap-1 text-amber-300 font-bold uppercase truncate max-w-[42%]"
          title={originTooltip}
        >
          <span className="truncate">{originLocation}</span>
        </span>
        <div className="flex items-center gap-1 flex-1 mx-3 text-white/30 shrink-0">
          <div className="h-px bg-white/20 flex-1 border-t border-dashed border-white/30" />
          <span>✈</span>
          <div className="h-px bg-white/20 flex-1 border-t border-dashed border-white/30" />
        </div>
        <span
          className="text-white/80 font-bold uppercase truncate max-w-[42%] text-right"
          title={trip.destination || "Destination"}
        >
          {trip.destination || "Destination"}
        </span>
      </div>

      {/* Card Body */}
      <div className="flex flex-col gap-4 p-6 sm:p-7 flex-1">
        <div>
          <Link
            href={`/trips/${tripId}`}
            className="block font-oswald text-2xl sm:text-3xl font-bold text-white group-hover:text-amber-300 transition-colors leading-tight"
          >
            {trip.name}
          </Link>

          {/* Dates & Fee Metadata */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3 text-xs text-white/60 font-medium">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
              </span>
            </div>

            {trip.fee && (
              <div className="flex items-center gap-1.5 text-amber-300 font-mono font-bold">
                <span>₹{trip.fee.toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Required Banner */}
        {humanStatus === "Action Required" && (
          <div className="bg-purple-950/30 border border-purple-400/40 rounded-2xl p-4 flex flex-col gap-2.5 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
            <div className="flex items-center gap-2 text-purple-300 font-mono font-bold text-xs uppercase tracking-wider">
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Action Required</span>
            </div>
            {issueText && (
              <p className="text-purple-200 text-xs leading-relaxed">{issueText}</p>
            )}
            <Link
              href={`/trip-registration?tripId=${tripId}`}
              className="mt-1 inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-oswald uppercase tracking-wider font-bold px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all self-start"
            >
              <span>Resolve & Re-Upload</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        )}

        {/* Rejection Notice */}
        {humanStatus === "Rejected" && (
          <div className="bg-rose-950/30 border border-rose-400/40 rounded-2xl p-4 flex flex-col gap-1.5 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
            <div className="flex items-center gap-2 text-rose-300 font-mono font-bold text-xs uppercase tracking-wider">
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Application Declined</span>
            </div>
            {rejectionReason && (
              <p className="text-rose-200 text-xs leading-relaxed mt-0.5">{rejectionReason}</p>
            )}
            <p className="text-rose-300/70 text-[11px] mt-1">
              You are invited to apply for any other upcoming open expedition below.
            </p>
          </div>
        )}

        {/* Approved Actions: WhatsApp Group & Coordinator Terminal */}
        {humanStatus === "Approved" && (
          <div className="flex flex-col gap-3 mt-1">
            {/* WhatsApp Group Portal */}
            {trip.whatsappLink && (
              <a
                href={trip.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                id={`whatsapp-btn-${tripId}`}
                className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-oswald text-xs uppercase tracking-wider font-bold px-5 py-3 rounded-full transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] border border-emerald-400/30"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.112.546 4.095 1.502 5.827L.057 23.882l6.204-1.623A11.936 11.936 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.027-1.383l-.36-.214-3.681.963.981-3.596-.235-.369A9.818 9.818 0 0112 2.182c5.427 0 9.818 4.391 9.818 9.818 0 5.426-4.391 9.818-9.818 9.818z" />
                </svg>
                <span>Join Official WhatsApp Group</span>
              </a>
            )}

            {/* Coordinator Contacts Toggle */}
            {trip.coordinators && trip.coordinators.length > 0 && (
              <div className="border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setShowCoords(!showCoords)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.07] text-white/80 font-mono text-xs transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Coordinator Contacts ({trip.coordinators.length})</span>
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${
                      showCoords ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCoords && (
                  <div className="p-3 flex flex-col gap-2.5 border-t border-white/10 bg-slate-950/40">
                    {trip.coordinators.map((c, i) => (
                      <CoordinatorContact key={i} c={c} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Card Footer */}
        <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <Link
            href={`/trips/${tripId}`}
            className="text-white/60 hover:text-white font-mono inline-flex items-center gap-1.5 transition-colors group/link"
          >
            <span>Expedition Briefing</span>
            <span className="group-hover/link:translate-x-1 transition-transform">→</span>
          </Link>
          {entry.submittedAt && (
            <span className="text-[11px] font-mono text-white/40">
              Pass Issued {formatDate(entry.submittedAt)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── Past Trip Archival Pass ────────────────────────────────── */
function PastTripCard({
  entry,
  student,
}: {
  entry: TripEntry;
  student?: StudentProfile | null;
}) {
  const { trip, tripId } = entry;
  const [imgError, setImgError] = useState(false);

  // Derive cover image from trip (imageUrl, coverImage, or images array)
  const coverImage =
    (!imgError && (
      trip.imageUrl ||
      trip.coverImage ||
      (Array.isArray(trip.images) && trip.images.length > 0
        ? typeof trip.images[0] === "string"
          ? trip.images[0]
          : trip.images[0]?.url
        : null)
    )) || null;

  return (
    <article
      id={`past-trip-card-${tripId}`}
      className="group relative rounded-3xl sm:rounded-[2.5rem] backdrop-blur-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-white/20 shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden"
    >
      <div className="relative w-full h-44 overflow-hidden bg-slate-950">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={trip.name}
            fill
            className="object-cover opacity-75 grayscale-[30%] group-hover:scale-105 group-hover:grayscale-0 transition-all duration-700"
            onError={() => setImgError(true)}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="relative w-full h-full">
            <Image
              src="/trip1.png"
              alt={trip.destination || "Trip cover"}
              fill
              className="object-cover opacity-60 grayscale-[50%] group-hover:scale-105 group-hover:grayscale-0 transition-all duration-700"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-slate-950/40" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

        {trip.destination && (
          <div className="absolute bottom-3 left-4 bg-slate-950/70 backdrop-blur-md text-white/90 text-[11px] font-mono px-3 py-0.5 rounded-full border border-white/10">
            📍 {trip.destination}
          </div>
        )}

        <div className="absolute top-3 right-4">
          <StatusBadge status="Completed" />
        </div>
      </div>

      <div className="p-6 flex flex-col gap-2.5 flex-1">
        <Link
          href={`/trips/${tripId}`}
          className="font-oswald text-xl sm:text-2xl font-bold text-white/90 group-hover:text-white transition-colors leading-snug"
        >
          {trip.name}
        </Link>

        <div className="text-xs text-white/50 flex items-center gap-1.5 font-mono">
          <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
          </span>
        </div>

        <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Expedition Concluded</span>
          </span>
          <Link
            href={`/trips/${tripId}`}
            className="text-white/50 hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            <span>Archive →</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ─── Shimmer Skeleton ───────────────────────────────────────── */
function ShimmerSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="backdrop-blur-2xl bg-white/[0.03] rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[400px]"
        >
          <div className="w-full h-52 bg-white/[0.05]" />
          <div className="p-6 flex flex-col gap-4 flex-1">
            <div className="h-6 bg-white/[0.08] rounded-md w-3/4" />
            <div className="h-4 bg-white/[0.05] rounded-md w-1/2" />
            <div className="mt-auto h-10 bg-white/[0.05] rounded-full w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────── */
function EmptyState({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/15 backdrop-blur-2xl flex items-center justify-center mb-6 text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
        <svg
          className="w-10 h-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h3 className="font-oswald text-3xl font-black text-white tracking-tight uppercase">
        {tab === "past" ? "No Past Expeditions Yet" : "Your Next Journey Is Waiting"}
      </h3>

      <p className="text-white/60 text-sm leading-relaxed mt-2.5">
        {tab === "past"
          ? "Concluded expeditions and digital travel passes will be archived here once your first journey ends."
          : "You haven't reserved any upcoming journeys yet. Explore scenic trails, coastal getaways, and student expeditions."}
      </p>

      {tab !== "past" && (
        <Link
          href="/#upcoming-trips"
          className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-oswald text-xs uppercase tracking-widest font-black px-8 py-3.5 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.4)] active:scale-95 transition-all"
        >
          <span>Explore Upcoming Expeditions</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      )}
    </div>
  );
}

/* ─── Cosmic Sign-In Portal ──────────────────────────────────── */
function SignInPrompt({
  onSignIn,
  loading,
  error,
}: {
  onSignIn: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#06080F] relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-amber-500/15 via-purple-600/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-3xl bg-white/[0.04] rounded-3xl sm:rounded-[2.5rem] p-8 sm:p-11 shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/15 flex flex-col gap-6 relative overflow-hidden">
          {/* Top highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

          {/* Header Icon & Brand */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/30 text-amber-300 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.25)]">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-amber-300/80 text-[11px] font-mono font-bold uppercase tracking-widest">
                IIT Madras • Boundless Society
              </p>
              <h1 className="font-oswald text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mt-1">
                Personal Travel Hub
              </h1>
            </div>
            <p className="text-white/60 text-xs leading-relaxed max-w-xs">
              Access your registered expedition passes, approvals, official WhatsApp groups, and coordinator contacts.
            </p>
          </div>

          {error && (
            <div className="bg-rose-950/40 border border-rose-400/40 rounded-2xl px-4 py-3 text-rose-300 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-in CTA */}
          <button
            id="sign-in-google-btn"
            onClick={onSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-950 font-oswald text-xs uppercase tracking-wider font-bold rounded-2xl px-6 py-4 shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>{loading ? "Authenticating…" : "Continue with IITM Account"}</span>
          </button>

          {/* Security note */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] font-mono text-white/50">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Exclusive to @study.iitm.ac.in & @iitm.ac.in</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Metric Cylinder Capsule ────────────────────────────────── */
function MetricCapsule({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-[100px] backdrop-blur-2xl bg-white/[0.03] hover:bg-white/[0.06] rounded-3xl p-5 flex flex-col justify-between border border-white/10 hover:border-white/20 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <span className="text-white/60">{icon}</span>
        <span className="font-oswald text-3xl sm:text-4xl font-black text-white tracking-tight">
          {value}
        </span>
      </div>
      <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 mt-3">
        {label}
      </span>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function MyTripsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [showCoordinatorModal, setShowCoordinatorModal] = useState(false);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // ── Firebase auth listener (with mock hook for visual verification) ──
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__MOCK_USER__) {
      setUser((window as any).__MOCK_USER__);
      if ((window as any).__MOCK_COORDINATOR__ !== undefined) {
        setIsCoordinator(Boolean((window as any).__MOCK_COORDINATOR__));
      }
      setAuthLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Check coordinator status whenever user changes ──
  useEffect(() => {
    if (!user) {
      setIsCoordinator(false);
      return;
    }
    if (typeof window !== "undefined" && (window as any).__MOCK_COORDINATOR__ !== undefined) {
      setIsCoordinator(Boolean((window as any).__MOCK_COORDINATOR__));
      return;
    }
    let isMounted = true;
    user.getIdToken().then(async (token) => {
      try {
        const res = await fetch("/api/auth/coordinator-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          const d = await res.json();
          if (d.isCoordinator) {
            setIsCoordinator(true);
            setCoordinatorName(d.name || user.displayName || "Coordinator");
          }
        }
      } catch {
        // ignore
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user]);

  // ── Fetch dashboard data once authenticated ──────────────────
  const fetchDashboard = useCallback(async (u: User) => {
    setDataLoading(true);
    setDataError(null);
    try {
      if (typeof window !== "undefined" && (window as any).__MOCK_DATA__) {
        const mockData = (window as any).__MOCK_DATA__;
        setData(mockData);
        if (mockData?.student && (!mockData.student.state || !mockData.student.cityDistrict)) {
          setShowLocationModal(true);
        }
        setDataLoading(false);
        return;
      }
      const token = await u.getIdToken();
      const res = await fetch("/api/student/my-trips", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      const json = await res.json();
      setData(json);
      if (json?.student && (!json.student.state || !json.student.cityDistrict)) {
        setShowLocationModal(true);
      }
    } catch (e: any) {
      setDataError(e.message || "Failed to load expeditions");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchDashboard(user);
  }, [user, fetchDashboard]);

  // ── Sign in ──────────────────────────────────────────────────
  const handleSignIn = async () => {
    setSignInLoading(true);
    setSignInError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: "iitm.ac.in" });
      const res = await signInWithPopup(auth, provider);
      const signedInUser = res?.user;
      if (
        signedInUser &&
        signedInUser.email &&
        signedInUser.email.toLowerCase().endsWith("iitm.ac.in")
      ) {
        try {
          const token = await signedInUser.getIdToken();
          const checkRes = await fetch("/api/auth/coordinator-status", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (checkRes.ok) {
            const data = await checkRes.json();
            if (data.isCoordinator) {
              setCoordinatorName(data.name || signedInUser.displayName || "Coordinator");
              setShowCoordinatorModal(true);
            }
          }
        } catch (coordErr) {
          console.error("Coordinator check error:", coordErr);
        }
      }
    } catch (e: any) {
      if (e.code !== "auth/popup-closed-by-user") {
        setSignInError(e.message || "Sign-in failed. Please try again.");
      }
    } finally {
      setSignInLoading(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06080F]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin shadow-[0_0_20px_rgba(251,191,36,0.3)]" />
          <p className="text-white/60 font-mono text-xs uppercase tracking-widest">
            Connecting…
          </p>
        </div>
      </div>
    );
  }

  // ── Unauthenticated ──────────────────────────────────────────
  if (!user) {
    return (
      <>
        <SignInPrompt
          onSignIn={handleSignIn}
          loading={signInLoading}
          error={signInError}
        />
        <CoordinatorRoleModal
          isOpen={showCoordinatorModal}
          coordinatorName={coordinatorName}
          onSelectTraveller={() => setShowCoordinatorModal(false)}
          onSelectCoordinator={() => {
            setShowCoordinatorModal(false);
            router.push("/coordinator");
          }}
        />
      </>
    );
  }

  // ── Non-IITM domain guard ────────────────────────────────────
  const email = user.email || "";
  if (!email.toLowerCase().endsWith("iitm.ac.in")) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#06080F]">
        <div className="backdrop-blur-3xl bg-white/[0.04] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-white/15">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="font-oswald text-2xl font-bold text-white mb-2 uppercase tracking-tight">
            Access Restricted
          </h2>
          <p className="text-white/60 text-xs leading-relaxed">
            Only IITM student accounts (<strong>@study.iitm.ac.in</strong> or{" "}
            <strong>@iitm.ac.in</strong>) may access this dashboard.
          </p>
          <div className="mt-4 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/50 font-mono text-[11px] truncate">
            {email}
          </div>
          <button
            onClick={() => auth.signOut()}
            className="mt-5 w-full bg-white hover:bg-slate-100 text-slate-950 font-oswald text-xs uppercase tracking-widest py-3 rounded-xl transition-all font-bold"
          >
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  // ── Derive display trips based on active tab ─────────────────
  const upcoming = data?.upcomingTrips || [];
  const past = data?.pastTrips || [];
  const all = [...upcoming, ...past];
  const displayTrips =
    activeTab === "upcoming" ? upcoming : activeTab === "past" ? past : all;

  const stats = data?.stats || { totalTrips: 0, upcomingCount: 0, pastCount: 0 };
  const student = data?.student;

  return (
    <>
      <title>My Expeditions — Boundless Society</title>
      <meta
        name="description"
        content="Personal dashboard for upcoming and completed Boundless Society student expeditions."
      />

      <main className="min-h-screen bg-[#06080F] text-slate-100 antialiased selection:bg-amber-400 selection:text-slate-950 relative overflow-hidden">
        {/* Ambient Aurora Glow Fields */}
        <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-gradient-to-bl from-amber-500/10 via-purple-600/5 to-transparent rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/10 via-blue-600/5 to-transparent rounded-full blur-[130px] pointer-events-none" />

        {/* ── Student Astro-Deck HUD ───────────────────────────── */}
        <section className="relative pt-24 pb-12 sm:pb-16 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Identity Banner */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                  <p className="text-amber-300/80 text-xs font-mono font-bold uppercase tracking-widest">
                    Student Expeditions Hub
                  </p>
                </div>
                <h1 className="font-oswald text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight uppercase">
                  Welcome back
                  {student?.name ? `, ${student.name.split(" ")[0]}` : ""}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs font-mono text-white/50 tracking-wider">
                  {student?.studentId && (
                    <span>Roll ID: {student.studentId}</span>
                  )}
                  {student?.state && student?.cityDistrict ? (
                    <span className="flex items-center gap-1.5 text-cyan-300/90 font-medium">
                      <span>📍 {student.cityDistrict}, {student.state}</span>
                      <button
                        type="button"
                        onClick={() => setShowLocationModal(true)}
                        className="text-[10px] uppercase font-bold text-amber-300 hover:text-amber-200 underline ml-0.5 cursor-pointer"
                      >
                        (Edit)
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLocationModal(true)}
                      className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 underline font-semibold text-[11px] animate-pulse cursor-pointer"
                    >
                      <span>📍 Complete Location Profile *</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Verified Status Pill & Coordinator Switcher */}
              <div className="flex flex-wrap items-center gap-3">
                {isCoordinator && (
                  <Link
                    href="/coordinator"
                    id="my-trips-switch-coordinator-btn"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FFE878] text-[#3B001B] border border-[#FFE878]/50 text-xs font-oswald font-bold uppercase tracking-wider hover:bg-[#FCE16D] hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,232,120,0.3)] cursor-pointer"
                  >
                    <span>🛡️</span>
                    <span>Coordinator Dashboard →</span>
                  </Link>
                )}
                {student?.studentIdVerified ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold tracking-wider backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>ID Verified</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold tracking-wider backdrop-blur-xl shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>ID Under Verification</span>
                  </div>
                )}
              </div>
            </div>

            {/* Travel Metrics Cylinders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <MetricCapsule
                label="Total Expeditions"
                value={stats.totalTrips}
                icon={
                  <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <MetricCapsule
                label="Upcoming Voyages"
                value={stats.upcomingCount}
                icon={
                  <svg className="w-6 h-6 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                }
              />
              <MetricCapsule
                label="Past Journeys"
                value={stats.pastCount}
                icon={
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          </div>
        </section>

        {/* ── Segmented Control Bar (Glass Island) ─────────────── */}
        <div className="sticky top-0 z-30 backdrop-blur-2xl bg-slate-950/70 border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar">
              {(
                [
                  { key: "upcoming", label: `Upcoming (${stats.upcomingCount})` },
                  { key: "past", label: `Past (${stats.pastCount})` },
                  { key: "all", label: `All (${stats.totalTrips})` },
                ] as const
              ).map(({ key, label }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    id={`tab-${key}`}
                    onClick={() => setActiveTab(key)}
                    className={`relative px-5 sm:px-6 py-2 rounded-full text-xs font-oswald uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "bg-amber-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                        : "text-white/60 hover:text-white hover:bg-white/[0.05] font-medium"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Cards Grid Section ───────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 z-10 relative">
          {dataLoading ? (
            <ShimmerSkeleton />
          ) : dataError ? (
            <div className="backdrop-blur-2xl bg-rose-950/20 border border-rose-500/30 rounded-3xl p-8 sm:p-12 text-center max-w-md mx-auto shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-500/30">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-rose-200 font-bold text-sm">{dataError}</p>
              <button
                onClick={() => user && fetchDashboard(user)}
                className="mt-4 inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-950 font-oswald text-xs uppercase tracking-widest px-6 py-2.5 rounded-full transition-all font-bold"
              >
                Reload Dashboard
              </button>
            </div>
          ) : displayTrips.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {displayTrips.map((entry) =>
                entry.humanStatus === "Completed" ? (
                  <PastTripCard
                    key={`${entry.tripId}-${entry.source || ""}`}
                    entry={entry}
                    student={student}
                  />
                ) : (
                  <UpcomingTripCard
                    key={`${entry.tripId}`}
                    entry={entry}
                    student={student}
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* ── Exploration Footer Nudge ─────────────────────────── */}
        {!dataLoading && !dataError && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 text-center relative z-10">
            <Link
              href="/#upcoming-trips"
              className="inline-flex items-center gap-2 text-white/50 hover:text-amber-300 font-mono text-xs transition-colors group"
            >
              <span>Explore more upcoming expeditions</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        )}
      </main>

      <CoordinatorRoleModal
        isOpen={showCoordinatorModal}
        coordinatorName={coordinatorName}
        onSelectTraveller={() => setShowCoordinatorModal(false)}
        onSelectCoordinator={() => {
          setShowCoordinatorModal(false);
          router.push("/coordinator");
        }}
      />

      <LocationProfileModal
        isOpen={showLocationModal}
        user={user}
        initialProfile={data?.student}
        canDismiss={Boolean(data?.student?.state && data?.student?.cityDistrict)}
        onClose={() => setShowLocationModal(false)}
        onSuccess={(updatedStudent) => {
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              student: {
                ...prev.student,
                state: updatedStudent.state,
                cityDistrict: updatedStudent.cityDistrict,
              },
            };
          });
          setShowLocationModal(false);
        }}
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
