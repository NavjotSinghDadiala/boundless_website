"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  Compass,
  Plane,
  ImageIcon,
  Users,
  Calendar,
  MapPin,
  Award,
  ChevronRight,
  ExternalLink,
  BookOpen,
  History,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
  AdminStatCard,
  AdminBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminConfirmDialog,
  AdminTable,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
} from "@/components/admin";

export default function ManagePreviousTripsPage() {
  const router = useRouter();

  // Active view tab
  const [activeTab, setActiveTab] = useState("expeditions"); // 'expeditions' | 'recaps'

  // Historical completed expeditions state
  const [completedTrips, setCompletedTrips] = useState([]);
  const [loadingCompleted, setLoadingCompleted] = useState(true);

  // Marketing stories/recaps state
  const [recaps, setRecaps] = useState([]);
  const [loadingRecaps, setLoadingRecaps] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch completed expeditions from /api/admin/previous-trips
  const fetchCompletedTrips = useCallback(async () => {
    try {
      setLoadingCompleted(true);
      const res = await fetch("/api/admin/previous-trips");
      const data = await res.json();
      if (res.ok) {
        setCompletedTrips(data.trips || []);
      } else {
        throw new Error(data.error || "Failed to load completed expeditions");
      }
    } catch (err) {
      console.error("fetchCompletedTrips error:", err);
      toast.error(err.message || "Failed to load completed expeditions");
    } finally {
      setLoadingCompleted(false);
    }
  }, []);

  // Fetch marketing recaps from /api/previous-trips
  const fetchRecaps = useCallback(async () => {
    try {
      setLoadingRecaps(true);
      const res = await fetch("/api/previous-trips");
      const data = await res.json();
      if (res.ok) {
        setRecaps(data.trips || []);
      }
    } catch (error) {
      console.error("fetchRecaps error:", error);
      toast.error("Failed to load website story recaps");
    } finally {
      setLoadingRecaps(false);
    }
  }, []);

  useEffect(() => {
    fetchCompletedTrips();
    fetchRecaps();
  }, [fetchCompletedTrips, fetchRecaps]);

  // Handle Delete Recap
  const handleDeleteRecap = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/previous-trips?id=${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Recap deleted successfully");
        setRecaps((prev) => prev.filter((r) => r.id !== deleteId));
        setDeleteId(null);
      } else {
        throw new Error("Failed to delete recap");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete recap");
    } finally {
      setDeleting(false);
    }
  };

  // Metrics
  const totalCompletedExpeditions = completedTrips.length;
  const totalHistoricalParticipants = completedTrips.reduce(
    (acc, t) => acc + (Number(t.participantCount) || Number(t.approvedCount) || 0),
    0
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="Previous Trips & Historical Expeditions"
        description="Authoritative permanent history of completed Boundless society expeditions and public retrospective stories."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Previous Trips" },
        ]}
        primaryAction={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/trip"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-all shadow-sm"
            >
              <span>Manage Active Trips</span>
              <ExternalLink className="size-3.5 text-stone-400" />
            </Link>

            {activeTab === "recaps" && (
              <button
                type="button"
                onClick={() => router.push("/admin/previous-trips/add")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
              >
                <PlusIcon className="size-4" />
                <span>Add Story Recap</span>
              </button>
            )}
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Completed Expeditions"
          value={totalCompletedExpeditions}
          icon={Award}
          subtitle="Indexed in permanent history"
          variant="maroon"
        />
        <AdminStatCard
          title="Total Historical Attendees"
          value={totalHistoricalParticipants}
          icon={Users}
          subtitle="Recorded society participants"
          variant="emerald"
        />
        <AdminStatCard
          title="Public Story Recaps"
          value={recaps.length}
          icon={BookOpen}
          subtitle="Showcased on website"
          variant="blue"
        />
        <AdminStatCard
          title="Archive Status"
          value="Permanent"
          icon={History}
          subtitle="Non-destructive canonical records"
          variant="amber"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveTab("expeditions")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === "expeditions"
              ? "border-[#3B001B] text-[#3B001B]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Award className="size-4" />
          <span>Completed Expeditions & Rosters</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-stone-100 text-stone-700">
            {completedTrips.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("recaps")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === "recaps"
              ? "border-[#3B001B] text-[#3B001B]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <BookOpen className="size-4" />
          <span>Website Story Recaps</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-stone-100 text-stone-700">
            {recaps.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Completed Expeditions & Historical Rosters */}
      {activeTab === "expeditions" && (
        <AdminCard noPadding>
          {loadingCompleted ? (
            <AdminLoadingState type="table" rows={4} />
          ) : completedTrips.length === 0 ? (
            <AdminEmptyState
              title="No Completed Expeditions Indexed"
              description="When an expedition is completed, it will automatically appear here with its permanent participant roster."
              icon={Compass}
              actionLabel="View Active Trips"
              onAction={() => router.push("/admin/trip")}
            />
          ) : (
            <div className="overflow-x-auto">
              <AdminTable>
                <AdminTableHead>
                  <AdminTableRow>
                    <AdminTableHeaderCell>Cover</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Trip Name & ID</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Destination</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Trip Dates</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Attendees</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Coordinators</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHead>
                <AdminTableBody>
                  {completedTrips.map((trip) => {
                    const attendeesCount =
                      Number(trip.participantCount) || Number(trip.approvedCount) || 0;

                    return (
                      <AdminTableRow
                        key={trip.tripId}
                        className="cursor-pointer hover:bg-amber-50/40 transition-colors group"
                        onClick={() => router.push(`/admin/previous-trips/${trip.tripId}`)}
                      >
                        {/* Cover Image */}
                        <AdminTableCell className="w-16">
                          {trip.coverImage ? (
                            <div className="size-11 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                              <img
                                src={trip.coverImage}
                                alt={trip.tripName}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="size-11 rounded-lg bg-[#3B001B]/10 text-[#3B001B] flex items-center justify-center shrink-0">
                              <Compass className="size-5" />
                            </div>
                          )}
                        </AdminTableCell>

                        {/* Trip Name & ID */}
                        <AdminTableCell>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-stone-900 group-hover:text-[#3B001B] transition-colors">
                              {trip.tripName}
                            </span>
                            <span className="font-mono text-[10px] text-stone-400">
                              ID: {trip.tripId}
                            </span>
                          </div>
                        </AdminTableCell>

                        {/* Destination */}
                        <AdminTableCell>
                          <div className="flex items-center gap-1.5 text-xs text-stone-700 font-medium">
                            <MapPin className="size-3 text-stone-400 shrink-0" />
                            <span>{trip.destination || "—"}</span>
                          </div>
                        </AdminTableCell>

                        {/* Dates */}
                        <AdminTableCell>
                          <div className="flex items-center gap-1.5 text-xs text-stone-600">
                            <Calendar className="size-3 text-stone-400 shrink-0" />
                            <span>
                              {trip.startDate || trip.endDate
                                ? `${trip.startDate || ""} – ${trip.endDate || ""}`
                                : "—"}
                            </span>
                          </div>
                        </AdminTableCell>

                        {/* Attendees / Breakdown */}
                        <AdminTableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-stone-900 text-xs">
                              {attendeesCount} participants
                            </span>
                            {(trip.femaleCount > 0 || trip.maleCount > 0) && (
                              <span className="text-[10px] text-stone-500">
                                {trip.femaleCount}F / {trip.maleCount}M
                              </span>
                            )}
                          </div>
                        </AdminTableCell>

                        {/* Coordinators */}
                        <AdminTableCell>
                          <span className="text-xs text-stone-600">
                            {trip.coordinatorSummary || "Staff"}
                          </span>
                        </AdminTableCell>

                        {/* Status */}
                        <AdminTableCell>
                          <AdminBadge status="completed" size="sm">
                            Completed
                          </AdminBadge>
                        </AdminTableCell>

                        {/* Action Link */}
                        <AdminTableCell className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B001B] group-hover:underline">
                            <span>Roster & History</span>
                            <ChevronRight className="size-3.5" />
                          </span>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </AdminTableBody>
              </AdminTable>
            </div>
          )}
        </AdminCard>
      )}

      {/* TAB 2: Marketing Recaps & Public Stories */}
      {activeTab === "recaps" && (
        <AdminCard noPadding>
          {loadingRecaps ? (
            <AdminLoadingState type="table" rows={4} />
          ) : recaps.length === 0 ? (
            <AdminEmptyState
              title="No Story Recaps Added"
              description="Highlight past society journeys to showcase Boundless history to new students."
              icon={Plane}
              actionLabel="Add First Recap"
              onAction={() => router.push("/admin/previous-trips/add")}
            />
          ) : (
            <div className="overflow-x-auto">
              <AdminTable>
                <AdminTableHead>
                  <AdminTableRow>
                    <AdminTableHeaderCell>Cover</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Trip Title</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Sub-heading / Location</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHead>
                <AdminTableBody>
                  {recaps.map((trip) => (
                    <AdminTableRow key={trip.id}>
                      <AdminTableCell className="w-20">
                        {trip.img ? (
                          <div className="size-12 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                            <img
                              src={trip.img}
                              alt={trip.heading || "Trip"}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="size-12 rounded-lg border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-300">
                            <ImageIcon className="size-5" />
                          </div>
                        )}
                      </AdminTableCell>
                      <AdminTableCell className="font-semibold text-stone-900">
                        {trip.heading}
                      </AdminTableCell>
                      <AdminTableCell className="text-stone-500">
                        {trip.subHeading || "—"}
                      </AdminTableCell>
                      <AdminTableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/admin/previous-trips/edit/${trip.id}`)
                            }
                            className="p-2 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                            title="Edit recap"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(trip.id)}
                            className="p-2 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                            title="Delete recap"
                          >
                            <Trash2Icon className="size-4" />
                          </button>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </div>
          )}
        </AdminCard>
      )}

      {/* Delete Confirmation Modal for Recaps */}
      <AdminConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Previous Trip Recap?"
        description="Are you sure you want to delete this trip recap? This action cannot be undone."
        confirmText="Delete Recap"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteRecap}
      />
    </div>
  );
}