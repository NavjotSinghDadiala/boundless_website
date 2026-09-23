"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Trash2Icon,
  PlusIcon,
  PencilIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  ExternalLinkIcon,
  ImageIcon,
} from "lucide-react";

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

export default function ManageCityMeetupsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("meetups");
  const [meetups, setMeetups] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(null); // { type: 'meetup' | 'campaign', id: string, name: string }
  const [deleting, setDeleting] = useState(false);

  const fetchMeetups = async () => {
    try {
      const res = await fetch("/api/city-meetups");
      const data = await res.json();
      if (res.ok) {
        setMeetups(data.meetups || []);
      }
    } catch (error) {
      toast.error("Failed to load city meetups");
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/meetup-campaigns");
      const data = await res.json();
      if (res.ok) {
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      toast.error("Failed to load meetup campaigns");
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchMeetups(), fetchCampaigns()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      if (deleteDialog.type === "meetup") {
        const res = await fetch(`/api/city-meetups?id=${deleteDialog.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          toast.success("Meetup deleted successfully");
          setMeetups((prev) => prev.filter((m) => m.id !== deleteDialog.id));
        } else {
          throw new Error("Failed to delete");
        }
      } else {
        const res = await fetch(`/api/meetup-campaigns?id=${deleteDialog.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          toast.success("Campaign deleted successfully");
          setCampaigns((prev) => prev.filter((c) => c.id !== deleteDialog.id));
        } else {
          throw new Error("Failed to delete");
        }
      }
      setDeleteDialog(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="City Chapters & Meetups"
        description="Organize local alumni and student meetup chapters across cities, configure RSVP links, and run campaigns."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "City Meetups" },
        ]}
        primaryAction={
          activeTab === "meetups" ? (
            <button
              type="button"
              onClick={() => router.push("/admin/city-meetups/add")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
            >
              <PlusIcon className="size-4" />
              <span>Add City Meetup</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/admin/city-meetups/campaigns/add")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
            >
              <PlusIcon className="size-4" />
              <span>Add Campaign</span>
            </button>
          )
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("meetups")}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
            activeTab === "meetups"
              ? "bg-[#3B001B] text-white shadow-sm"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <MapPinIcon className="size-4" />
          <span>Regional Chapters ({meetups.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
            activeTab === "campaigns"
              ? "bg-[#3B001B] text-white shadow-sm"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <CalendarIcon className="size-4" />
          <span>Meetup Campaigns ({campaigns.length})</span>
        </button>
      </div>

      {loading ? (
        <AdminLoadingState type="table" rows={4} />
      ) : activeTab === "meetups" ? (
        meetups.length === 0 ? (
          <AdminEmptyState
            title="No City Meetups Configured"
            description="Start by adding your first regional city chapter meetup card."
            icon={MapPinIcon}
            action={
              <button
                type="button"
                onClick={() => router.push("/admin/city-meetups/add")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
              >
                <PlusIcon className="size-3.5" />
                Add First City Meetup
              </button>
            }
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Cover</AdminTableHeaderCell>
                <AdminTableHeaderCell>City</AdminTableHeaderCell>
                <AdminTableHeaderCell>Date & Timing</AdminTableHeaderCell>
                <AdminTableHeaderCell>Community Link</AdminTableHeaderCell>
                <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {meetups.map((item) => (
                <AdminTableRow key={item.id}>
                  <AdminTableCell className="w-16">
                    {item.img ? (
                      <div className="size-11 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                        <img
                          src={item.img}
                          alt={item.city || "Meetup"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="size-11 rounded-lg border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-300">
                        <ImageIcon className="size-4" />
                      </div>
                    )}
                  </AdminTableCell>
                  <AdminTableCell className="font-semibold text-stone-900">
                    {item.city}
                  </AdminTableCell>
                  <AdminTableCell className="text-stone-500 whitespace-nowrap">
                    {item.date || "Date TBA"}
                  </AdminTableCell>
                  <AdminTableCell>
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#3B001B] hover:underline font-mono inline-flex items-center gap-1"
                      >
                        <span className="truncate max-w-[200px]">{item.link}</span>
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/admin/city-meetups/edit/${item.id}`)
                        }
                        className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                        title="Edit meetup"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteDialog({
                            type: "meetup",
                            id: item.id,
                            name: item.city || "Meetup",
                          })
                        }
                        className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                        title="Delete meetup"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        )
      ) : campaigns.length === 0 ? (
        <AdminEmptyState
          title="No Meetup Campaigns"
          description="Create a community campaign to gather interest for upcoming cities."
          icon={CalendarIcon}
          action={
            <button
              type="button"
              onClick={() => router.push("/admin/city-meetups/campaigns/add")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
            >
              <PlusIcon className="size-3.5" />
              Add First Campaign
            </button>
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Campaign City</AdminTableHeaderCell>
              <AdminTableHeaderCell>Votes / Interest</AdminTableHeaderCell>
              <AdminTableHeaderCell>Target Date</AdminTableHeaderCell>
              <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {campaigns.map((camp) => (
              <AdminTableRow key={camp.id}>
                <AdminTableCell className="font-semibold text-stone-900">
                  {camp.city}
                </AdminTableCell>
                <AdminTableCell className="text-stone-600">
                  <span className="font-bold text-stone-900">
                    {camp.votes || camp.count || 0}
                  </span>{" "}
                  students interested
                </AdminTableCell>
                <AdminTableCell className="text-stone-500 whitespace-nowrap">
                  {camp.targetDate || "Open Campaign"}
                </AdminTableCell>
                <AdminTableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteDialog({
                          type: "campaign",
                          id: camp.id,
                          name: camp.city || "Campaign",
                        })
                      }
                      className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                      title="Delete campaign"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        open={Boolean(deleteDialog)}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        title={`Delete ${deleteDialog?.type === "meetup" ? "City Meetup" : "Campaign"}?`}
        description={`Are you sure you want to delete "${deleteDialog?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}