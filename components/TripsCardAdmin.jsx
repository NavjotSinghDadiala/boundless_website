"use client";

import React from "react";
import Link from "next/link";
import { UsersIcon, ImageIcon, MapPinIcon, CalendarIcon, ChevronRightIcon } from "lucide-react";
import { AdminBadge } from "@/components/admin";
import { formatTripDates } from "@/lib/tripDateUtils";

export function TripCardAdmin({ trip }) {
  const coverImage = trip.images?.[0]?.url;
  const formattedDates = formatTripDates(trip.startDate, trip.endDate);
  const totalJoined = trip.totalJoined || 0;
  const totalSeats = trip.totalSeats;
  const femaleReservedSeats = trip.femaleReservedSeats || 0;
  const maleReservedSeats = trip.maleReservedSeats !== undefined ? trip.maleReservedSeats : (totalSeats ? Math.max(0, totalSeats - femaleReservedSeats) : 0);
  const percentage = totalSeats ? Math.min(100, Math.round((totalJoined / totalSeats) * 100)) : 0;

  return (
    <Link href={`/admin/trip/view/${trip.id}`} className="block h-full group">
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden flex flex-col justify-between h-full transition-all duration-200 hover:shadow-md hover:border-[#3B001B]/40">
        <div>
          {/* Cover Image */}
          {coverImage ? (
            <div className="aspect-[16/9] w-full overflow-hidden bg-stone-100 relative">
              <img
                src={coverImage}
                alt={trip.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute top-2.5 right-2.5">
                <AdminBadge
                  status={trip.isCompleted ? "completed" : trip.registrationOpen ? "open" : "closed"}
                  size="sm"
                />
              </div>
            </div>
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center bg-stone-100 relative">
              <ImageIcon className="size-10 text-stone-300" />
              <div className="absolute top-2.5 right-2.5">
                <AdminBadge
                  status={trip.isCompleted ? "completed" : trip.registrationOpen ? "open" : "closed"}
                  size="sm"
                />
              </div>
            </div>
          )}

          {/* Details */}
          <div className="p-4 sm:p-5 space-y-3">
            <h3 className="font-bold text-base text-stone-900 line-clamp-1 group-hover:text-[#3B001B] transition-colors">
              {trip.name}
            </h3>

            <div className="space-y-1.5 text-xs text-stone-500">
              {trip.destination && (
                <div className="flex items-center gap-1.5 font-medium text-stone-700">
                  <MapPinIcon className="size-3.5 text-[#3B001B] shrink-0" />
                  <span className="truncate">{trip.destination}</span>
                </div>
              )}
              {formattedDates && (
                <div className="flex items-center gap-1.5 font-medium text-stone-600">
                  <CalendarIcon className="size-3.5 text-stone-400 shrink-0" />
                  <span>{formattedDates}</span>
                </div>
              )}
            </div>

            {trip.description && (
              <p className="line-clamp-2 text-xs text-stone-500 leading-relaxed pt-1">
                {trip.description}
              </p>
            )}
          </div>
        </div>

        {/* Footer with Seats */}
        <div className="p-4 sm:p-5 pt-0 border-t border-stone-100 mt-2">
          <div className="flex items-center justify-between text-xs pt-3">
            <div className="flex items-center gap-1.5 text-stone-600">
              <UsersIcon className="size-3.5 text-stone-400" />
              <span className="font-semibold text-stone-900">{totalJoined}</span>
              <span className="text-stone-400">/ {totalSeats || "∞"} joined</span>
            </div>

            {totalSeats && (
              <span className="text-[11px] font-semibold text-stone-500">
                {percentage}%
              </span>
            )}
          </div>

          {totalSeats ? (
            <div className="w-full h-1.5 bg-stone-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[#3B001B] rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          ) : null}

          {/* Gender Quota Breakdown on Card */}
          {(femaleReservedSeats > 0 || maleReservedSeats > 0) && (
            <div className="flex items-center justify-between text-[11px] font-medium pt-2 mt-2 border-t border-dashed border-stone-100">
              <span className="text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60 font-semibold flex items-center gap-1">
                <span>🚹</span> Male: {maleReservedSeats} slots
              </span>
              <span className="text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60 font-semibold flex items-center gap-1">
                <span>🚺</span> Female: {femaleReservedSeats} slots
              </span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-stone-400 group-hover:text-[#3B001B] font-medium transition-colors">
            <span>Manage expedition</span>
            <ChevronRightIcon className="size-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}
