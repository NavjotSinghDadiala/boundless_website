import React from "react";
import { Users, Ticket, IndianRupee, Compass, MapPin, Calendar, Sparkles } from "lucide-react";
import { Trip } from "./TripCard";
import { formatTripDates } from "@/lib/tripDateUtils";

interface TripQuickDetailsProps {
  trip: Trip;
}

export default function TripQuickDetails({ trip }: TripQuickDetailsProps) {
  const isCompleted = !!trip.isCompleted || !!trip.finalRosterSaved;
  const isRegistrationOpen = !!trip.registrationOpen && !isCompleted;
  const formattedDates = formatTripDates(trip.startDate, trip.endDate);

  const detailItems = [];

  // 1. Destination
  if (trip.destination && trip.destination.trim()) {
    detailItems.push({
      label: "Destination",
      value: trip.destination,
      subtext: "Featured Expedition Hub",
      icon: MapPin,
      glow: "from-cyan-500/20 to-blue-500/10",
      iconColor: "text-cyan-400",
      borderColor: "border-cyan-500/30",
    });
  }

  // 2. Dates
  if (formattedDates) {
    detailItems.push({
      label: "Expedition Window",
      value: formattedDates,
      subtext: "Departure through Return",
      icon: Calendar,
      glow: "from-amber-500/20 to-orange-500/10",
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/30",
    });
  }

  // 3. Capacity & Quota Allocation
  if (trip.totalSeats !== undefined && trip.totalSeats !== null) {
    let seatDesc = `${trip.totalSeats} Total Seats`;
    if (trip.femaleReservedSeats && trip.femaleReservedSeats > 0 && trip.maleReservedSeats && trip.maleReservedSeats > 0) {
      seatDesc = `${trip.maleReservedSeats} Male • ${trip.femaleReservedSeats} Female Quota`;
    } else if (trip.femaleReservedSeats && trip.femaleReservedSeats > 0) {
      seatDesc = `${trip.femaleReservedSeats} Female Reserved Seats`;
    } else if (trip.maleReservedSeats && trip.maleReservedSeats > 0) {
      seatDesc = `${trip.maleReservedSeats} Male Reserved Seats`;
    }
    detailItems.push({
      label: "Expedition Capacity",
      value: `${trip.totalSeats} Student Quota`,
      subtext: seatDesc,
      icon: Users,
      glow: "from-purple-500/20 to-pink-500/10",
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/30",
    });
  }

  // 4. Registration Status
  detailItems.push({
    label: "Registration Clearance",
    value: isCompleted ? "Concluded" : isRegistrationOpen ? "Open & Accepting" : "Closed",
    subtext: isCompleted
      ? "Expedition Completed"
      : isRegistrationOpen
        ? "Active Booking Portal"
        : "Registrations Finalized",
    icon: Ticket,
    glow: isRegistrationOpen ? "from-emerald-500/25 to-teal-500/10" : "from-slate-500/20 to-slate-700/10",
    iconColor: isRegistrationOpen ? "text-emerald-400" : "text-slate-400",
    borderColor: isRegistrationOpen ? "border-emerald-500/40" : "border-slate-500/30",
  });

  // 5. Fee
  if (trip.fee !== undefined && trip.fee !== null) {
    detailItems.push({
      label: "Expedition Contribution",
      value: trip.fee > 0 ? `₹${trip.fee.toLocaleString("en-IN")}` : "Free",
      subtext: trip.fee > 0 ? "Includes accommodation & transit" : "No entry fee required",
      icon: IndianRupee,
      glow: "from-amber-500/25 to-yellow-500/10",
      iconColor: "text-amber-300",
      borderColor: "border-amber-400/40",
    });
  }

  // 6. Leadership & Club
  detailItems.push({
    label: "Organized By",
    value: "Boundless Society",
    subtext: "Official IIT Madras Student Travel Club",
    icon: Compass,
    glow: "from-blue-500/20 to-indigo-500/10",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/30",
  });

  return (
    <section className="w-full py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <h2 className="text-xs uppercase tracking-widest font-mono text-white/60 font-semibold">
            Expedition Specifications & Telemetry
          </h2>
        </div>

        {/* Cyber-Glass Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {detailItems.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl p-6 backdrop-blur-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all duration-300 shadow-[0_15px_40px_rgba(0,0,0,0.5)] group overflow-hidden"
              >
                {/* Subtle top edge glow highlight */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                {/* Ambient glow backdrop */}
                <div
                  className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${item.glow} blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`}
                />

                <div className="relative z-10 flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-white/[0.05] border ${item.borderColor} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform`}
                  >
                    <IconComponent className={`w-6 h-6 ${item.iconColor}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-mono uppercase tracking-wider text-white/50 mb-1">
                      {item.label}
                    </span>
                    <span className="block font-oswald text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug truncate" title={item.value}>
                      {item.value}
                    </span>
                    <span className="block text-xs text-white/60 mt-1 leading-relaxed">
                      {item.subtext}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
