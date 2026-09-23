import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, Ticket, ArrowRight, IndianRupee, Compass, MapPin, Calendar } from "lucide-react";
import { formatTripDates } from "@/lib/tripDateUtils";

export interface TripCoordinator {
  name: string;
  email?: string;
  phone?: string;
  assignedOption?: string | null;
}

export interface TripImage {
  url: string;
  publicId?: string;
  sortOrder?: number;
}

export interface TripItineraryItem {
  day?: string;
  title: string;
  description: string;
}

export interface TripFAQItem {
  id: string;
  question: string;
  answer: string;
  sortOrder?: number;
}

export interface TripConsentStatement {
  id: string;
  text: string;
  required?: boolean;
  sortOrder?: number;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  itinerary?: TripItineraryItem[];
  itineraryLink?: string;
  faqs?: TripFAQItem[];
  consentStatements?: TripConsentStatement[];
  importantInformation?: string;
  thingsToCarry?: string[];
  coordinators?: (TripCoordinator | string)[];
  totalSeats?: number;
  femaleReservedSeats?: number;
  maleReservedSeats?: number;
  releasedSeats?: number;
  releasedSeatsType?: string;
  femaleJoined?: number;
  totalJoined?: number;
  fee?: number;
  registrationOpen?: boolean;
  isCompleted?: boolean;
  finalRosterSaved?: boolean;
  images?: TripImage[];
  createdAt?: string;
  updatedAt?: string;
}

interface TripCardProps {
  trip: Trip;
}

export default function TripCard({ trip }: TripCardProps) {
  const isCompleted = !!trip.isCompleted || !!trip.finalRosterSaved;
  const isRegistrationOpen = !!trip.registrationOpen && !isCompleted;
  const formattedDates = formatTripDates(trip.startDate, trip.endDate);
  
  const coverImage = trip.images && trip.images.length > 0 ? trip.images[0].url : null;
  const coordinatorNames = (trip.coordinators || []).map((c) =>
    typeof c === "object" && c !== null ? c.name : String(c)
  ).filter(Boolean);

  return (
    <div className="group relative bg-[#FFFBEA] border border-[#3B001B]/15 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:translate-y-[-2px]">
      {/* Top Media Container */}
      <div className="relative w-full h-56 sm:h-64 bg-gradient-to-br from-[#3B001B] to-[#46001D] overflow-hidden">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={trip.name || "Boundless Trip"}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-[#FFE878]">
            <Compass className="w-14 h-14 mb-2 opacity-80 animate-pulse" />
            <span className="font-oswald tracking-widest text-lg font-bold uppercase text-[#FFFBEA]">
              Boundless Expedition
            </span>
            <span className="text-xs text-[#FFE878]/80 mt-1">Adventure Awaits</span>
          </div>
        )}

        {/* Status Badge Overlay */}
        <div className="absolute top-4 left-4 z-10">
          {isCompleted ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-stone-900/80 text-stone-200 backdrop-blur-md border border-white/20">
              Trip Completed
            </span>
          ) : isRegistrationOpen ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/90 text-white backdrop-blur-md border border-emerald-400/30 shadow-sm">
              ● Registration Open
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-700/90 text-white backdrop-blur-md border border-amber-400/30 shadow-sm">
              Registration Closed
            </span>
          )}
        </div>

        {/* Fee Badge Overlay */}
        {trip.fee !== undefined && (
          <div className="absolute top-4 right-4 z-10">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEA]/95 text-[#3B001B] shadow-sm backdrop-blur-md">
              {trip.fee > 0 ? `₹${trip.fee.toLocaleString("en-IN")}` : "Free"}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-6 flex flex-col flex-grow justify-between">
        <div>
          {/* Trip Title */}
          <h3 className="font-oswald text-2xl md:text-3xl font-bold text-[#3B001B] leading-tight mb-2 line-clamp-2">
            {trip.name}
          </h3>

          {/* Destination & Dates */}
          {(trip.destination || formattedDates) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#3B001B]/80 mb-3">
              {trip.destination && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#3B001B] shrink-0" />
                  <span className="truncate max-w-[180px]">{trip.destination}</span>
                </span>
              )}
              {formattedDates && (
                <span className="inline-flex items-center gap-1 text-stone-600">
                  <Calendar className="w-3.5 h-3.5 text-[#3B001B] shrink-0" />
                  <span>{formattedDates}</span>
                </span>
              )}
            </div>
          )}

          {/* Short Description */}
          {trip.description ? (
            <p className="text-stone-700 text-sm leading-relaxed mb-4 line-clamp-3">
              {trip.description}
            </p>
          ) : (
            <p className="text-stone-500 italic text-sm mb-4">
              Explore all details and plan your journey with Boundless.
            </p>
          )}

          {/* Quick Metrics & Gender Slots */}
          <div className="space-y-2 mb-6 text-xs text-stone-700 font-medium">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 bg-white/70 rounded-xl p-2 border border-[#3B001B]/10">
                <Users className="w-4 h-4 text-[#3B001B] shrink-0" />
                <span className="truncate">{trip.totalSeats ? `${trip.totalSeats} Total Seats` : "Open Capacity"}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/70 rounded-xl p-2 border border-[#3B001B]/10">
                <Ticket className="w-4 h-4 text-[#3B001B] shrink-0" />
                <span>{isRegistrationOpen ? "Spots Available" : "Closed"}</span>
              </div>
            </div>

            {/* Male & Female Slots Quota */}
            {(Boolean(trip.maleReservedSeats && trip.maleReservedSeats > 0) || Boolean(trip.femaleReservedSeats && trip.femaleReservedSeats > 0)) && (
              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-sky-50/80 text-sky-800 border border-sky-200/60 shadow-2xs">
                  <span className="flex items-center gap-1">
                    <span>🚹</span> Male Slots
                  </span>
                  <span className="font-bold text-sky-900">{trip.maleReservedSeats || Math.max(0, (trip.totalSeats || 0) - (trip.femaleReservedSeats || 0))}</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-rose-50/80 text-rose-800 border border-rose-200/60 shadow-2xs">
                  <span className="flex items-center gap-1">
                    <span>🚺</span> Female Slots
                  </span>
                  <span className="font-bold text-rose-900">{trip.femaleReservedSeats || 0}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button Link */}
        <div className="pt-2 border-t border-[#3B001B]/10">
          <Link
            href={`/trips/${trip.id}`}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold text-sm bg-[#3B001B] text-[#FFE878] hover:bg-[#46001D] transition-colors shadow-sm group-hover:shadow-md"
          >
            <span>{isRegistrationOpen ? "VIEW TRIP / REGISTER" : "VIEW TRIP DETAILS"}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
