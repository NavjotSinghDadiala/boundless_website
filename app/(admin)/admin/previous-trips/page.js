"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon, Plane, ImageIcon } from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
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

export default function ManageTripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // Fetch all trips
  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/previous-trips");
      const data = await res.json();
      if (res.ok) {
        setTrips(data.trips || []);
      }
    } catch (error) {
      toast.error("Failed to load previous trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/previous-trips?id=${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Trip deleted successfully");
        setTrips((prev) => prev.filter((trip) => trip.id !== deleteId));
        setDeleteId(null);
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete trip");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="Previous Trips & Recaps"
        description="Curate completed society adventures, retrospective stories, and highlight photos displayed on the public website."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Previous Trips" },
        ]}
        primaryAction={
          <button
            type="button"
            onClick={() => router.push("/admin/previous-trips/add")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
          >
            <PlusIcon className="size-4" />
            <span>Add Previous Trip</span>
          </button>
        }
      />

      {loading ? (
        <AdminLoadingState type="table" rows={4} />
      ) : trips.length === 0 ? (
        <AdminEmptyState
          title="No Previous Trips Added"
          description="Highlight past society journeys to showcase Boundless history to new students."
          icon={Plane}
          action={
            <button
              type="button"
              onClick={() => router.push("/admin/previous-trips/add")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
            >
              <PlusIcon className="size-3.5" />
              Add First Recap
            </button>
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Cover</AdminTableHeaderCell>
              <AdminTableHeaderCell>Trip Title</AdminTableHeaderCell>
              <AdminTableHeaderCell>Sub-heading / Location</AdminTableHeaderCell>
              <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {trips.map((trip) => (
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
      )}

      {/* Delete Confirmation Modal */}
      <AdminConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Previous Trip Recap?"
        description="Are you sure you want to delete this trip recap? This action cannot be undone."
        confirmText="Delete Recap"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}