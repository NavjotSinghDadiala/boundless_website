'use client';

import React, { useState, useEffect } from "react";
import Section from "@/components/Section";
import TripCard, { Trip } from "@/components/trips/TripCard";
import { Compass, Sparkles } from "lucide-react";

const TripsPlanned = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUpcomingTrips() {
      try {
        setLoading(true);
        const res = await fetch("/api/trip");
        if (res.ok) {
          const data = await res.json();
          const allTrips: Trip[] = data.trips || [];
          // Use the existing canonical active trip definition
          const active = allTrips.filter((t) => !t.isCompleted && !t.finalRosterSaved);
          setTrips(active);
        } else {
          console.error("Failed to load trips from API");
        }
      } catch (err) {
        console.error("Error fetching trips:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUpcomingTrips();
  }, []);

  return (
    <Section
      headingStyle="text-[#3B001B]"
      svgFill="#fffbea"
      sectionHeading="UPCOMING TRIPS"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          /* Clean Loading Skeleton */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto py-8">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white/60 border border-[#3B001B]/10 rounded-3xl h-96 animate-pulse p-6 flex flex-col justify-between"
              >
                <div className="w-full h-48 bg-stone-200/70 rounded-2xl mb-4" />
                <div className="h-6 bg-stone-200/70 rounded-full w-3/4 mb-2" />
                <div className="h-4 bg-stone-200/50 rounded-full w-full mb-2" />
                <div className="h-10 bg-stone-200/70 rounded-full w-full mt-4" />
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          /* Polished Empty State */
          <div className="max-w-md mx-auto my-12 bg-white/80 backdrop-blur-md border border-[#3B001B]/15 rounded-3xl p-8 sm:p-12 text-center shadow-lg">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#3B001B]/5 border border-[#3B001B]/10 flex items-center justify-center text-[#3B001B] mb-4">
              <Compass className="w-8 h-8 opacity-70 animate-pulse" />
            </div>
            <h3 className="font-oswald text-2xl font-bold text-[#3B001B] uppercase tracking-wide mb-2">
              No Upcoming Trips
            </h3>
            <p className="text-stone-600 text-sm leading-relaxed mb-6">
              There are no upcoming Boundless trips scheduled right now. We are currently scouting incredible new destinations—stay tuned!
            </p>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#FFE878]/50 text-[#3B001B] border border-[#FFE878]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>New expeditions announced every semester</span>
            </div>
          </div>
        ) : (
          /* Responsive Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-4">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>
    </Section>
  );
};

export default TripsPlanned;
