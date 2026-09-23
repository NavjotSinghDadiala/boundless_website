"use client";

import React from "react";
import Link from "next/link";
import { PlusIcon, CompassIcon } from "lucide-react";
import { TripCardAdmin } from "@/components/TripsCardAdmin";
import {
  AdminPageHeader,
  AdminLoadingState,
  AdminEmptyState,
  AdminFilterBar,
} from "@/components/admin";

export default function TripsPage() {
  const [trips, setTrips] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    async function fetchTrips() {
      try {
        const response = await fetch("/api/trip", {
          headers: { "x-admin-dev": "true" },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch trips");
        }

        setTrips(data.trips || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrips();
  }, []);

  const filteredTrips = trips.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.name?.toLowerCase().includes(query) ||
      t.destination?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="Expeditions & Trips"
        description="Comprehensive directory of all Boundless trips. Configure itineraries, coordinators, capacity, pricing, and dynamic registration forms."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "All Expeditions" },
        ]}
        primaryAction={
          <Link
            href="/admin/trip/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
          >
            <PlusIcon className="size-4" />
            <span>Create Trip</span>
          </Link>
        }
      />

      {/* Filter Bar */}
      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search trips by name or destination..."
        totalCount={filteredTrips.length}
        totalLabel="trips found"
        onReset={() => setSearchQuery("")}
      />

      {/* Content Grid */}
      {isLoading ? (
        <AdminLoadingState type="cards" cards={6} />
      ) : error ? (
        <div className="p-8 rounded-xl border border-rose-200 bg-rose-50 text-center">
          <p className="text-sm font-semibold text-rose-800">Error loading trips</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <AdminEmptyState
          title={searchQuery ? "No matching trips found" : "No Trips Created Yet"}
          description={
            searchQuery
              ? `No trips matched "${searchQuery}". Try a different search term or clear the filter.`
              : "Start by creating your first Boundless expedition to open student registrations."
          }
          icon={CompassIcon}
          action={
            !searchQuery ? (
              <Link
                href="/admin/trip/add"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
              >
                <PlusIcon className="size-3.5" />
                Create New Trip
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => (
            <TripCardAdmin key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
