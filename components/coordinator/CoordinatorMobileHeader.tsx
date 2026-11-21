"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDownIcon,
  CheckIcon,
  CompassIcon,
  LogOutIcon,
  MapPinIcon,
  SearchIcon,
  ShieldCheckIcon,
  UsersIcon,
  XIcon,
  CalendarIcon,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { TripSummary } from "./types";

interface CoordinatorMobileHeaderProps {
  userEmail: string;
  assignedTrips: TripSummary[];
  selectedTripId: string;
  onSelectTrip: (tripId: string) => void;
  onLogout: () => void;
}

export function CoordinatorMobileHeader({
  userEmail,
  assignedTrips,
  selectedTripId,
  onSelectTrip,
  onLogout,
}: CoordinatorMobileHeaderProps) {
  const [tripSheetOpen, setTripSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [tripSearch, setTripSearch] = useState("");

  const activeTrip = useMemo(
    () => assignedTrips.find((t) => t.id === selectedTripId) || assignedTrips[0] || null,
    [assignedTrips, selectedTripId]
  );

  const filteredTrips = useMemo(() => {
    const q = tripSearch.trim().toLowerCase();
    if (!q) return assignedTrips;
    return assignedTrips.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.destination || "").toLowerCase().includes(q)
    );
  }, [assignedTrips, tripSearch]);

  const userInitial = (userEmail || "C").charAt(0).toUpperCase();

  return (
    <>
      {/* Compact Sticky Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2D9CE] shadow-2xs">
        <div className="px-3.5 h-16 flex items-center justify-between gap-2.5">
          {/* Brand + Active Trip Switcher Trigger */}
          <button
            type="button"
            onClick={() => {
              if (assignedTrips.length > 0) {
                setTripSearch("");
                setTripSheetOpen(true);
              }
            }}
            disabled={assignedTrips.length === 0}
            aria-label="Switch assigned trip"
            className="flex items-center gap-2.5 min-w-0 flex-1 min-h-[44px] py-1.5 pr-2 rounded-xl text-left active:bg-[#FAF7F2] transition-colors disabled:opacity-90"
          >
            <div className="w-10 h-10 rounded-xl bg-[#5B1313] text-[#FAF7F2] flex items-center justify-center font-serif font-bold text-lg shrink-0 shadow-xs">
              B
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="font-serif font-bold text-base text-[#5B1313] truncate leading-tight">
                  {activeTrip ? activeTrip.name : "Coordinator Portal"}
                </span>
                {assignedTrips.length > 0 && (
                  <ChevronDownIcon className="w-4 h-4 text-[#5B1313]/70 shrink-0" />
                )}
              </div>
              <p className="text-sm text-stone-500 truncate leading-tight mt-0.5">
                {activeTrip
                  ? activeTrip.destination || "Assigned Trip"
                  : `${assignedTrips.length} trips assigned`}
              </p>
            </div>
          </button>

          {/* Account / Mode Trigger */}
          <button
            type="button"
            onClick={() => setAccountSheetOpen(true)}
            aria-label="Open coordinator account menu"
            className="w-11 h-11 rounded-full bg-[#FAF7F2] border border-[#C5A059]/50 text-[#5B1313] font-bold text-base flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-2xs"
          >
            {userInitial}
          </button>
        </div>
      </header>

      {/* Searchable Trip Switcher Bottom Sheet */}
      <Drawer open={tripSheetOpen} onOpenChange={setTripSheetOpen}>
        <DrawerContent className="max-h-[85dvh] rounded-t-3xl bg-[#FFFDF9] border-[#E2D9CE] pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="text-left pb-3 border-b border-[#E2D9CE]/80">
            <div className="flex items-center justify-between gap-2">
              <div>
                <DrawerTitle className="font-serif text-xl font-bold text-[#5B1313]">
                  My Assigned Trips
                </DrawerTitle>
                <DrawerDescription className="text-sm text-stone-600 mt-0.5">
                  {assignedTrips.length}{" "}
                  {assignedTrips.length === 1 ? "trip" : "trips"} assigned to your account
                </DrawerDescription>
              </div>
              <button
                type="button"
                onClick={() => setTripSheetOpen(false)}
                aria-label="Close trip switcher"
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 active:bg-stone-100"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Search input (16px font to prevent iOS zoom) */}
            {assignedTrips.length > 0 && (
              <div className="relative mt-3">
                <SearchIcon className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={tripSearch}
                  onChange={(e) => setTripSearch(e.target.value)}
                  placeholder="Search trips or destination..."
                  className="w-full min-h-[48px] pl-11 pr-11 py-2.5 rounded-xl border border-[#E2D9CE] bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#5B1313]/25 focus:border-[#5B1313]"
                />
                {tripSearch && (
                  <button
                    type="button"
                    onClick={() => setTripSearch("")}
                    aria-label="Clear trip search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-stone-400 active:text-stone-700"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </DrawerHeader>

          <div className="overflow-y-auto px-4 py-3 space-y-2.5">
            {filteredTrips.length === 0 ? (
              <div className="py-10 text-center text-stone-500">
                <CompassIcon className="w-8 h-8 text-[#C5A059] mx-auto mb-2" />
                <p className="text-base font-medium text-stone-700">No matching trips</p>
                <p className="text-sm text-stone-500 mt-1">Try a different search keyword.</p>
              </div>
            ) : (
              filteredTrips.map((trip) => {
                const isSelected = trip.id === selectedTripId;
                return (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => {
                      onSelectTrip(trip.id);
                      setTripSheetOpen(false);
                    }}
                    className={`w-full min-h-[64px] p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-[#5B1313] text-white border-[#5B1313] shadow-sm"
                        : "bg-white text-stone-800 border-[#E2D9CE] active:bg-[#FAF7F2]"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`font-serif font-bold text-base leading-snug ${
                            isSelected ? "text-white" : "text-[#5B1313]"
                          }`}
                        >
                          {trip.name}
                        </p>
                        {trip.isCompleted && (
                          <span
                            className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            Completed
                          </span>
                        )}
                      </div>

                      <div
                        className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${
                          isSelected ? "text-[#FAF7F2]/85" : "text-stone-600"
                        }`}
                      >
                        {trip.destination && (
                          <span className="inline-flex items-center gap-1">
                            <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{trip.destination}</span>
                          </span>
                        )}
                        {trip.startDate && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{trip.startDate}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <UsersIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {trip.totalJoined}/{trip.totalSeats || 0} seats
                          </span>
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-7 h-7 rounded-full bg-[#FFE878] text-[#3B001B] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckIcon className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Account & Traveller Mode Bottom Sheet */}
      <Drawer open={accountSheetOpen} onOpenChange={setAccountSheetOpen}>
        <DrawerContent className="rounded-t-3xl bg-[#FFFDF9] border-[#E2D9CE] pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="text-left pb-4 border-b border-[#E2D9CE]/80">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#5B1313] text-[#FFE878] font-bold text-lg flex items-center justify-center shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <DrawerTitle className="text-base font-bold text-stone-900 truncate">
                  {userEmail || "Coordinator"}
                </DrawerTitle>
                <DrawerDescription className="text-sm text-emerald-700 font-medium flex items-center gap-1.5 mt-0.5">
                  <ShieldCheckIcon className="w-4 h-4 shrink-0" />
                  <span>Authorized Coordinator</span>
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="p-4 space-y-3">
            <Link
              href="/my-trips"
              onClick={() => setAccountSheetOpen(false)}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#FFE878] active:bg-[#FCE16D] text-[#3B001B] border border-[#3B001B]/20 font-oswald font-bold text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs"
            >
              <span>✈</span>
              <span>Switch to Traveller Mode</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setAccountSheetOpen(false);
                onLogout();
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white active:bg-red-50 text-red-700 border border-red-200 font-semibold text-base flex items-center justify-center gap-2"
            >
              <LogOutIcon className="w-5 h-5" />
              <span>Sign Out</span>
            </button>

            <button
              type="button"
              onClick={() => setAccountSheetOpen(false)}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl text-stone-600 font-medium text-base active:bg-stone-100"
            >
              Close
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
