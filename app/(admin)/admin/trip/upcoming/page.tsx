"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarIcon,
  PlusIcon,
  Trash2Icon,
  ExternalLinkIcon,
  ImageIcon,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
  AdminEmptyState,
  AdminLoadingState,
  AdminConfirmDialog,
} from "@/components/admin";

interface UpcomingTripPost {
  id: string;
  title: string;
  registrationLink?: string;
  image?: string;
  details?: string;
  backgroundColor: string;
  textColor: string;
}

export default function UpcomingTripsAdminPage() {
  const [posts, setPosts] = useState<UpcomingTripPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "upcoming_trips"));
      const data: UpcomingTripPost[] = querySnapshot.docs.map((d) => ({
        id: d.id,
        title: d.data().title || "",
        image: d.data().imageUrl || "",
        details: d.data().details || "",
        registrationLink: d.data().registrationLink || "",
        backgroundColor: d.data().backgroundColor || "bg-white",
        textColor: d.data().textColor || "text-stone-900",
      }));

      setPosts(data);
    } catch (error) {
      console.error("Error fetching upcoming trips:", error);
      toast.error("Failed to load upcoming trip flyers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteDoc(doc(db, "upcoming_trips", deleteId));
      setPosts((prev) => prev.filter((trip) => trip.id !== deleteId));
      toast.success("Upcoming trip deleted successfully");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting trip:", error);
      toast.error("Failed to delete trip");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="Upcoming Trip Flyers"
        description="Manage the promotional flyers and quick registration cards displayed across the Boundless homepage."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Upcoming Flyers" },
        ]}
        primaryAction={
          <Link
            href="/admin/trip/upcoming/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
          >
            <PlusIcon className="size-4" />
            <span>+ Add Flyer Details</span>
          </Link>
        }
      />

      {/* Grid of Flyers */}
      {loading ? (
        <AdminLoadingState type="cards" cards={4} />
      ) : posts.length === 0 ? (
        <AdminEmptyState
          title="No Upcoming Trip Flyers"
          description="There are currently no upcoming trip showcase flyers published on the homepage."
          icon={CalendarIcon}
          action={
            <Link
              href="/admin/trip/upcoming/add"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
            >
              <PlusIcon className="size-3.5" />
              Upload First Flyer
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-[#3B001B]/40"
            >
              <div>
                {/* Image */}
                {trip.image ? (
                  <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100">
                    <img
                      src={trip.image}
                      alt={trip.title}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-stone-100">
                    <ImageIcon className="size-10 text-stone-300" />
                  </div>
                )}

                <div className="p-5 space-y-2">
                  <h3 className="text-lg font-bold text-stone-900 tracking-tight">
                    {trip.title}
                  </h3>
                  {trip.details && (
                    <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
                      {trip.details}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-5 pt-0 border-t border-stone-100 mt-3 flex items-center justify-between gap-2">
                {trip.registrationLink ? (
                  <a
                    href={trip.registrationLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#3B001B] hover:underline font-semibold"
                  >
                    <span>Registration Link</span>
                    <ExternalLinkIcon className="size-3" />
                  </a>
                ) : (
                  <span className="text-xs text-stone-400">No link set</span>
                )}

                <button
                  type="button"
                  onClick={() => setDeleteId(trip.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-xs font-medium transition-colors"
                >
                  <Trash2Icon className="size-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AdminConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Upcoming Trip Flyer?"
        description="This will permanently delete this upcoming trip flyer card from the homepage showcase. This action cannot be undone."
        confirmText="Delete Flyer"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
