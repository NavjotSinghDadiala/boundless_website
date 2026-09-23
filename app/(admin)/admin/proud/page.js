"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  Award,
  SparklesIcon,
  TrendingUpIcon,
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

export default function ManageProudPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("stats");
  const [stats, setStats] = useState([]);
  const [marquee, setMarquee] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(null); // { type: 'stat' | 'marquee', id: string, name: string }
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch("/api/proud-stats");
      const statsData = await statsRes.json();

      const marqueeRes = await fetch("/api/proud-marquee");
      const marqueeData = await marqueeRes.json();

      if (statsRes.ok && marqueeRes.ok) {
        setStats(statsData.stats || []);
        setMarquee(marqueeData.marquee || []);
      } else {
        throw new Error("Failed to load section data");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load proud section data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      if (deleteDialog.type === "stat") {
        const res = await fetch(`/api/proud-stats?id=${deleteDialog.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          toast.success("Statistic deleted successfully");
          setStats((prev) => prev.filter((s) => s.id !== deleteDialog.id));
        } else {
          throw new Error("Delete failed");
        }
      } else {
        const res = await fetch(`/api/proud-marquee?id=${deleteDialog.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          toast.success("Marquee item deleted successfully");
          setMarquee((prev) => prev.filter((m) => m.id !== deleteDialog.id));
        } else {
          throw new Error("Delete failed");
        }
      }
      setDeleteDialog(null);
    } catch (error) {
      toast.error(error.message || "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title='&quot;We Proud to Have&quot; Section'
        description="Configure the key milestone numbers, participant impact counters, and animated community marquee on the homepage."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Proud Section" },
        ]}
        primaryAction={
          activeTab === "stats" ? (
            <button
              type="button"
              onClick={() => router.push("/admin/proud/stats/add")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
            >
              <PlusIcon className="size-4" />
              <span>Add Metric Stat</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/admin/proud/marquee/add")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
            >
              <PlusIcon className="size-4" />
              <span>Add Marquee Text</span>
            </button>
          )
        }
      />

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
            activeTab === "stats"
              ? "bg-[#3B001B] text-white shadow-sm"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <TrendingUpIcon className="size-4" />
          <span>Milestone Stats ({stats.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("marquee")}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
            activeTab === "marquee"
              ? "bg-[#3B001B] text-white shadow-sm"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <SparklesIcon className="size-4" />
          <span>Curved Marquee ({marquee.length})</span>
        </button>
      </div>

      {loading ? (
        <AdminLoadingState type="table" rows={4} />
      ) : activeTab === "stats" ? (
        stats.length === 0 ? (
          <AdminEmptyState
            title="No Statistics Configured"
            description="Add milestone metrics such as 'Trips Completed' or 'Active Explorers' to highlight community scale."
            icon={Award}
            action={
              <button
                type="button"
                onClick={() => router.push("/admin/proud/stats/add")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
              >
                <PlusIcon className="size-3.5" />
                Add First Statistic
              </button>
            }
          />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Metric Label</AdminTableHeaderCell>
                <AdminTableHeaderCell>Display Value</AdminTableHeaderCell>
                <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {stats.map((stat) => (
                <AdminTableRow key={stat.id}>
                  <AdminTableCell className="font-semibold text-stone-900">
                    {stat.label}
                  </AdminTableCell>
                  <AdminTableCell className="font-bold text-[#3B001B] font-mono text-base">
                    {stat.number}+
                  </AdminTableCell>
                  <AdminTableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/admin/proud/stats/edit/${stat.id}`)
                        }
                        className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                        title="Edit stat"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteDialog({
                            type: "stat",
                            id: stat.id,
                            name: stat.label || "Statistic",
                          })
                        }
                        className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                        title="Delete stat"
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
      ) : marquee.length === 0 ? (
        <AdminEmptyState
          title="No Marquee Items"
          description="Add inspiring phrases and community slogans for the curved marquee ticker."
          icon={SparklesIcon}
          action={
            <button
              type="button"
              onClick={() => router.push("/admin/proud/marquee/add")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
            >
              <PlusIcon className="size-3.5" />
              Add Marquee Text
            </button>
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Marquee Slogan / Text</AdminTableHeaderCell>
              <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {marquee.map((item) => (
              <AdminTableRow key={item.id}>
                <AdminTableCell className="font-semibold text-stone-900">
                  {item.text}
                </AdminTableCell>
                <AdminTableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/proud/marquee/edit/${item.id}`)
                      }
                      className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                      title="Edit marquee item"
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteDialog({
                          type: "marquee",
                          id: item.id,
                          name: item.text || "Marquee",
                        })
                      }
                      className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                      title="Delete marquee item"
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

      {/* Delete Confirmation Modal */}
      <AdminConfirmDialog
        open={Boolean(deleteDialog)}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        title={`Delete ${deleteDialog?.type === "stat" ? "Milestone Stat" : "Marquee Item"}?`}
        description={`Are you sure you want to remove "${deleteDialog?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
