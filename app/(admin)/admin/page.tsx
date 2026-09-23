"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  CompassIcon,
  UsersIcon,
  ClockIcon,
  CheckCircle2Icon,
  Plane,
  ClipboardListIcon,
  CameraIcon,
  MapPinIcon,
  Vote,
  MessageSquare,
  Award,
  SettingsIcon,
  UserCheckIcon,
  ArrowRightIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminStatCard,
  AdminCard,
  AdminBadge,
  AdminEmptyState,
  AdminLoadingState,
  AdminTable,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
} from "@/components/admin";
import { formatTripDates } from "@/lib/tripDateUtils";

interface Trip {
  id: string;
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  registrationOpen?: boolean;
  isCompleted?: boolean;
  totalSeats?: number;
  totalJoined?: number;
  femaleReservedSeats?: number;
}

interface Registration {
  id: string;
  email: string;
  tripId: string;
  tripName?: string;
  status: string;
  submittedAt?: string;
  formData?: Record<string, string>;
}

const adminModules = [
  {
    title: "Upcoming Trips",
    description: "Manage upcoming flyers, dates, and registration status",
    url: "/admin/trip/upcoming",
    icon: CalendarIcon,
    tag: "Operations",
  },
  {
    title: "All Expeditions",
    description: "Deep itinerary builder, custom forms, and logistics",
    url: "/admin/trip",
    icon: CompassIcon,
    tag: "Core",
  },
  {
    title: "Registrations",
    description: "Verify applicant documents, manage approvals and queues",
    url: "/admin/registrations",
    icon: ClipboardListIcon,
    tag: "High Priority",
  },
  {
    title: "Previous Trips",
    description: "Curate completed trips, recaps, and stories",
    url: "/admin/previous-trips",
    icon: Plane,
    tag: "Content",
  },
  {
    title: "Photo Gallery",
    description: "Upload and organize society photo gallery",
    url: "/admin/gallery",
    icon: CameraIcon,
    tag: "Media",
  },
  {
    title: "City Meetups",
    description: "Manage city chapters and regional campaigns",
    url: "/admin/city-meetups",
    icon: MapPinIcon,
    tag: "Community",
  },
  {
    title: "HOD Election",
    description: "Oversee election phases, candidates, and real-time votes",
    url: "/admin/election",
    icon: Vote,
    tag: "Governance",
  },
  {
    title: "Team Members",
    description: "Manage founders, council members, and department heads",
    url: "/admin/team",
    icon: UsersIcon,
    tag: "People",
  },
  {
    title: "WhatsApp Groups",
    description: "Manage official community chat invites and channels",
    url: "/admin/whatsapp",
    icon: MessageSquare,
    tag: "Comms",
  },
  {
    title: "Proud Section",
    description: "Update society impact counters and alumni marquee",
    url: "/admin/proud",
    icon: Award,
    tag: "Social Proof",
  },
  {
    title: "Homepage Settings",
    description: "Configure global site notifications and YouTube media",
    url: "/admin/settings",
    icon: SettingsIcon,
    tag: "Settings",
  },
  {
    title: "Registered Users",
    description: "View authenticated society member roster",
    url: "/admin/users",
    icon: UserCheckIcon,
    tag: "Directory",
  },
];

export default function AdminDashboardPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pendingRegs, setPendingRegs] = useState<Registration[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // 1. Fetch all trips
        const tripRes = await fetch("/api/trip", {
          headers: { "x-admin-dev": "true" },
        });
        if (!tripRes.ok) return;
        const tripData = await tripRes.json();
        const tripList: Trip[] = tripData.trips || [];
        setTrips(tripList);

        // 2. Fetch registrations for active/upcoming trips to derive queue metrics
        const activeTrips = tripList.filter((t) => !t.isCompleted).slice(0, 5);
        let allPending: Registration[] = [];
        let totalApproved = 0;
        let totalPending = 0;

        await Promise.all(
          activeTrips.map(async (trip) => {
            try {
              const regRes = await fetch(`/api/admin/registrations?tripId=${trip.id}`);
              if (regRes.ok) {
                const regData = await regRes.json();
                const regs: Registration[] = regData.registrations || [];

                regs.forEach((r) => {
                  const s = (r.status || "").toLowerCase();
                  if (s === "registered" || s === "pending" || s === "action_required") {
                    totalPending += 1;
                    allPending.push({ ...r, tripName: trip.name });
                  } else if (
                    s === "approved" ||
                    s === "approved_to_pay" ||
                    s === "mail_sent" ||
                    s === "paid"
                  ) {
                    totalApproved += 1;
                  }
                });
              }
            } catch {
              // ignore individual trip registration errors
            }
          })
        );

        setPendingRegs(allPending.slice(0, 5));
        setPendingCount(totalPending);
        setApprovedCount(totalApproved);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const upcomingTrips = trips.filter((t) => !t.isCompleted);
  const openTrips = trips.filter((t) => t.registrationOpen && !t.isCompleted);

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="Operations Dashboard"
        description="Welcome to the Boundless Society administration console. Monitor live registration pipelines, active expedition logistics, and community resources."
        primaryAction={
          <Link
            href="/admin/trip/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
          >
            <span>+ Create Expedition</span>
          </Link>
        }
        secondaryActions={
          <Link
            href="/admin/registrations"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs sm:text-sm font-semibold hover:bg-stone-50 transition-colors"
          >
            <span>Review Registrations</span>
          </Link>
        }
      />

      {/* STAT ROW */}
      {loading ? (
        <AdminLoadingState type="cards" cards={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            title="Upcoming Trips"
            value={upcomingTrips.length}
            icon={CalendarIcon}
            subtitle={`${openTrips.length} currently open for registration`}
            variant="maroon"
            href="/admin/trip/upcoming"
          />
          <AdminStatCard
            title="Pending Registrations"
            value={pendingCount}
            icon={ClockIcon}
            subtitle="Students awaiting document verification"
            variant="amber"
            badge={pendingCount > 0 ? "Requires Action" : undefined}
            href="/admin/registrations"
          />
          <AdminStatCard
            title="Approved Students"
            value={approvedCount}
            icon={CheckCircle2Icon}
            subtitle="Verified attendees across active trips"
            variant="emerald"
            href="/admin/registrations"
          />
          <AdminStatCard
            title="Active Expeditions"
            value={openTrips.length}
            icon={CompassIcon}
            subtitle="Live public booking links"
            variant="stone"
            href="/admin/trip"
          />
        </div>
      )}

      {/* TWO COLUMN OPERATIONAL VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: RECENT / UPCOMING TRIPS */}
        <div className="lg:col-span-2 space-y-6">
          <AdminCard
            title="Upcoming & Active Expeditions"
            subtitle="Overview of scheduled trips and current seat capacities"
            icon={CompassIcon}
            headerActions={
              <Link
                href="/admin/trip"
                className="text-xs text-[#3B001B] hover:underline font-semibold flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRightIcon className="size-3" />
              </Link>
            }
            noPadding
          >
            {loading ? (
              <div className="p-6">
                <AdminLoadingState text="Loading expeditions..." />
              </div>
            ) : upcomingTrips.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="No Upcoming Expeditions"
                  description="There are currently no active or upcoming trips scheduled in the database."
                  action={
                    <Link
                      href="/admin/trip/add"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B001B] text-white text-xs font-semibold"
                    >
                      + Add New Trip
                    </Link>
                  }
                  compact
                />
              </div>
            ) : (
              <AdminTable>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>Expedition</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Dates</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Capacity</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <AdminTableBody>
                  {upcomingTrips.slice(0, 5).map((trip) => (
                    <AdminTableRow key={trip.id}>
                      <AdminTableCell>
                        <div className="font-semibold text-stone-900 line-clamp-1">
                          {trip.name}
                        </div>
                        {trip.destination && (
                          <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                            <MapPinIcon className="size-3 text-stone-400 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {trip.destination}
                            </span>
                          </div>
                        )}
                      </AdminTableCell>
                      <AdminTableCell className="text-stone-600 whitespace-nowrap">
                        {formatTripDates(trip.startDate, trip.endDate) || "Dates TBA"}
                      </AdminTableCell>
                      <AdminTableCell>
                        <AdminBadge
                          status={trip.registrationOpen ? "open" : "closed"}
                        />
                      </AdminTableCell>
                      <AdminTableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900">
                            {trip.totalJoined || 0}
                          </span>
                          <span className="text-xs text-stone-400">
                            / {trip.totalSeats || "∞"}
                          </span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/trip/view/${trip.id}`}
                            className="px-2.5 py-1 text-xs rounded-md border border-stone-200 hover:bg-stone-100 text-stone-700 font-medium transition-colors"
                          >
                            Overview
                          </Link>
                          <Link
                            href={`/admin/registrations?tripId=${trip.id}`}
                            className="px-2.5 py-1 text-xs rounded-md bg-[#3B001B]/10 hover:bg-[#3B001B]/20 text-[#3B001B] font-semibold transition-colors"
                          >
                            Queue
                          </Link>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            )}
          </AdminCard>
        </div>

        {/* RIGHT 1 COLUMN: PENDING REGISTRATIONS QUEUE */}
        <div className="space-y-6">
          <AdminCard
            title="Pending Verification"
            subtitle="Applicants requiring review"
            icon={ClockIcon}
            headerActions={
              <Link
                href="/admin/registrations"
                className="text-xs text-[#3B001B] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Full Queue</span>
                <ChevronRightIcon className="size-3" />
              </Link>
            }
            noPadding
          >
            {loading ? (
              <div className="p-6">
                <AdminLoadingState text="Loading queue..." />
              </div>
            ) : pendingRegs.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="Queue Clear"
                  description="All submitted registrations have been verified. No pending items require admin review."
                  icon={CheckCircle2Icon}
                  compact
                />
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {pendingRegs.map((reg) => {
                  const studentName =
                    reg.formData?.["Full Name"] ||
                    reg.formData?.["Name"] ||
                    reg.formData?.["name"] ||
                    reg.email ||
                    "Student";

                  return (
                    <div
                      key={reg.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-semibold text-xs sm:text-sm text-stone-900 truncate">
                          {studentName}
                        </div>
                        <div className="text-[11px] text-stone-500 truncate">
                          {reg.tripName || "Expedition"}
                        </div>
                        <div className="pt-0.5">
                          <AdminBadge
                            status={reg.status || "pending"}
                            size="sm"
                          />
                        </div>
                      </div>

                      <Link
                        href={`/admin/registrations?tripId=${reg.tripId}`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#3B001B] text-white text-xs font-semibold hover:bg-[#46001D] shrink-0 shadow-sm transition-all"
                      >
                        Review
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminCard>
        </div>
      </div>

      {/* QUICK MODULE SHORTCUTS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Administrative Modules & Systems
          </h2>
          <span className="text-xs text-stone-400">12 Connected Modules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {adminModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.url}
                href={module.url}
                className="group relative flex flex-col justify-between rounded-xl border border-stone-200/80 bg-white p-4 transition-all duration-200 hover:border-[#3B001B]/40 hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-xl bg-[#3B001B]/5 text-[#3B001B] flex items-center justify-center group-hover:bg-[#3B001B] group-hover:text-white transition-colors">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {module.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 group-hover:text-[#3B001B] transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400 group-hover:text-[#3B001B] font-medium transition-colors">
                  <span>Open console</span>
                  <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
