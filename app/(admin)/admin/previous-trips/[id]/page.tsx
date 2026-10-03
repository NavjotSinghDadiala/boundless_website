"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Compass,
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Award,
  UserCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
  DollarSign,
  FileText,
  HelpCircle,
  ImageIcon,
  CheckCircle2,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
  AdminStatCard,
  AdminBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminTable,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
  AdminFilterBar,
} from "@/components/admin";
import { CompletedTripRecord, HistoricalTripParticipant } from "@/lib/tripHistory";

export default function CompletedTripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [trip, setTrip] = useState<CompletedTripRecord | null>(null);
  const [participants, setParticipants] = useState<HistoricalTripParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  // Participant search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");

  useEffect(() => {
    if (!id) return;
    async function fetchTripDetail() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/previous-trips/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Completed trip record not found.");
            router.push("/admin/previous-trips");
            return;
          }
          throw new Error("Failed to load historical trip details");
        }
        const data = await res.json();
        setTrip(data.trip);
        setParticipants(data.participants || []);
      } catch (err: any) {
        toast.error(err.message || "Failed to load trip record");
      } finally {
        setLoading(false);
      }
    }
    fetchTripDetail();
  }, [id, router]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      if (statusFilter !== "all" && p.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (genderFilter !== "all" && p.gender?.toLowerCase() !== genderFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchRoll = p.studentId?.toLowerCase().includes(q);
        const matchEmail = p.email?.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchEmail) return false;
      }
      return true;
    });
  }, [participants, searchQuery, statusFilter, genderFilter]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/admin/previous-trips" className="hover:text-stone-900 inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> Back to Previous Trips
          </Link>
        </div>
        <AdminLoadingState type="cards" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <AdminEmptyState
          title="Trip Record Not Found"
          description="The historical record for this completed expedition could not be located."
          action={
            <button
              type="button"
              onClick={() => router.push("/admin/previous-trips")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
            >
              Return to Previous Trips
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/previous-trips"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Previous Trips</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            {trip.coverImage ? (
              <div className="size-20 sm:size-24 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shrink-0 shadow-sm">
                <img
                  src={trip.coverImage}
                  alt={trip.tripName}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="size-20 sm:size-24 rounded-2xl bg-[#3B001B] text-amber-200 flex items-center justify-center shrink-0 shadow-sm">
                <Compass className="size-10" />
              </div>
            )}

            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  {trip.tripName}
                </h1>
                <AdminBadge status="completed">Completed Expedition</AdminBadge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-stone-600">
                {trip.destination && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-stone-400" />
                    <strong>{trip.destination}</strong>
                  </span>
                )}
                {(trip.startDate || trip.endDate) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5 text-stone-400" />
                    {trip.startDate}
                    {trip.endDate && trip.endDate !== trip.startDate ? ` – ${trip.endDate}` : ""}
                  </span>
                )}
                {trip.completedAt && (
                  <span className="flex items-center gap-1 text-stone-400">
                    <Clock className="size-3.5" />
                    Completed:{" "}
                    {new Date(trip.completedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
                <span className="font-mono text-[11px] text-stone-400">
                  ID: {trip.tripId}
                </span>
              </div>

              {trip.coordinatorSummary && (
                <div className="text-xs text-stone-600 flex items-center gap-1.5 pt-0.5">
                  <Users className="size-3.5 text-stone-400" />
                  <span>Coordinators: <strong>{trip.coordinatorSummary}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/admin/trip/view/${trip.tripId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-sm"
            >
              <span>View Original Trip</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Final Participants"
          value={trip.participantCount !== undefined ? trip.participantCount : (trip.approvedCount || 0)}
          icon={Award}
          subtitle="Approved attendees"
          variant="maroon"
        />
        <AdminStatCard
          title="Female Participants"
          value={trip.femaleCount}
          icon={Users}
          subtitle="Registered attendees"
          variant="emerald"
        />
        <AdminStatCard
          title="Male Participants"
          value={trip.maleCount}
          icon={Users}
          subtitle="Registered attendees"
          variant="blue"
        />
        <AdminStatCard
          title="Total Registrations"
          value={trip.totalRegistered || participants.length}
          icon={FileText}
          subtitle="Applications received"
          variant="amber"
        />
      </div>

      {/* Trip Description / Itinerary Highlights */}
      {trip.description && (
        <AdminCard title="Expedition Overview" icon={FileText}>
          <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">
            {trip.description}
          </p>
        </AdminCard>
      )}

      {/* Historical Participants Roster */}
      <AdminCard
        title="Trip Participants & Society Roster"
        subtitle="Canonical records of students who registered and attended this completed expedition"
        icon={Users}
      >
        {/* Search & Filter Bar */}
        <AdminFilterBar
          searchPlaceholder="Search participants by name, student ID, or email..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onReset={() => {
            setSearchQuery("");
            setStatusFilter("all");
            setGenderFilter("all");
          }}
        >
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs sm:text-sm rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
          >
            <option value="all">All Statuses</option>
            <option value="approved_to_pay">Approved to Pay</option>
            <option value="paid">Paid</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="registered">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="text-xs sm:text-sm rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
          >
            <option value="all">All Genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </AdminFilterBar>

        {/* Participants Table */}
        {filteredParticipants.length === 0 ? (
          <AdminEmptyState
            title="No Participants Found"
            description={
              searchQuery || statusFilter !== "all"
                ? "No registered students match your current search/filter."
                : "No student registrations associated with this completed trip record."
            }
          />
        ) : (
          <div className="overflow-x-auto mt-4">
            <AdminTable>
              <AdminTableHead>
                <AdminTableRow>
                  <AdminTableHeaderCell>Student</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Student ID / Roll</AdminTableHeaderCell>
                  <AdminTableHeaderCell>IITM Email</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Gender</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Registered Date</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">Profile</AdminTableHeaderCell>
                </AdminTableRow>
              </AdminTableHead>
              <AdminTableBody>
                {filteredParticipants.map((p) => {
                  const initial = (p.name || "S").charAt(0).toUpperCase();
                  const profileUrl = p.uid ? `/admin/students/${p.uid}` : null;

                  return (
                    <AdminTableRow
                      key={p.uid || p.email}
                      className={profileUrl ? "cursor-pointer hover:bg-amber-50/40 transition-colors group" : ""}
                      onClick={() => {
                        if (profileUrl) router.push(profileUrl);
                      }}
                    >
                      {/* Name & Avatar */}
                      <AdminTableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-[#3B001B]/10 text-[#3B001B] flex items-center justify-center font-bold text-xs shrink-0 border border-[#3B001B]/20">
                            {initial}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-stone-900 group-hover:text-[#3B001B] transition-colors truncate">
                              {p.name}
                            </span>
                            {p.uid && (
                              <span className="text-[10px] text-stone-400 font-mono">
                                UID: {p.uid.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </AdminTableCell>

                      {/* Student ID */}
                      <AdminTableCell>
                        <span className="font-mono text-xs font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          {p.studentId || "—"}
                        </span>
                      </AdminTableCell>

                      {/* Email */}
                      <AdminTableCell>
                        <span className="text-xs text-stone-600 font-medium">{p.email || "—"}</span>
                      </AdminTableCell>

                      {/* Gender */}
                      <AdminTableCell>
                        <span className="capitalize text-xs text-stone-700 font-medium">
                          {p.gender}
                        </span>
                      </AdminTableCell>

                      {/* Status */}
                      <AdminTableCell>
                        <AdminBadge status={p.status} size="sm" />
                      </AdminTableCell>

                      {/* Registered Date */}
                      <AdminTableCell>
                        <span className="text-xs text-stone-500">
                          {p.registeredAt
                            ? new Date(p.registeredAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                      </AdminTableCell>

                      {/* Actions */}
                      <AdminTableCell className="text-right">
                        {profileUrl ? (
                          <Link
                            href={profileUrl}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B001B] hover:underline"
                          >
                            <span>Profile</span>
                            <ChevronRight className="size-3.5" />
                          </Link>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </AdminTableBody>
            </AdminTable>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
