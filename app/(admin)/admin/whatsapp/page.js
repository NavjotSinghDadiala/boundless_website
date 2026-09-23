"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  MessageSquare,
  ExternalLinkIcon,
  ImageIcon,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
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

const CATEGORY_LABELS = {
  official: "Official Boundless Space",
  girls: "Girls Community",
  regional: "Regional Space",
};

export default function ManageWhatsappPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // Fetch all groups
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/whatsapp-groups");
      const data = await res.json();
      if (res.ok) {
        setGroups(data.groups || []);
      } else {
        throw new Error(data.error || "Failed to load groups");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/whatsapp-groups?id=${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Community group deleted successfully");
        setGroups((prev) => prev.filter((g) => g.id !== deleteId));
        setDeleteId(null);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete group");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="WhatsApp & Community Groups"
        description="Configure official community chat groups, regional chapters, and interest channels shown on the Connect page."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "WhatsApp Groups" },
        ]}
        primaryAction={
          <button
            type="button"
            onClick={() => router.push("/admin/whatsapp/add")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
          >
            <PlusIcon className="size-4" />
            <span>Add Group</span>
          </button>
        }
      />

      {loading ? (
        <AdminLoadingState type="table" rows={4} />
      ) : groups.length === 0 ? (
        <AdminEmptyState
          title="No WhatsApp Groups Configured"
          description="Create official chat rooms or regional community channels for students to join."
          icon={MessageSquare}
          action={
            <button
              type="button"
              onClick={() => router.push("/admin/whatsapp/add")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
            >
              <PlusIcon className="size-3.5" />
              Add First Group
            </button>
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Cover</AdminTableHeaderCell>
              <AdminTableHeaderCell>Group / City</AdminTableHeaderCell>
              <AdminTableHeaderCell>Category</AdminTableHeaderCell>
              <AdminTableHeaderCell>Platform</AdminTableHeaderCell>
              <AdminTableHeaderCell>Accent Color</AdminTableHeaderCell>
              <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {groups.map((group) => (
              <AdminTableRow key={group.id}>
                <AdminTableCell className="w-16">
                  {group.img ? (
                    <div className="size-11 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                      <img
                        src={group.img}
                        alt={group.city || "Group"}
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
                  {group.city}
                </AdminTableCell>

                <AdminTableCell>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      group.category === "official"
                        ? "bg-[#3B001B]/10 text-[#3B001B] border border-[#3B001B]/20"
                        : group.category === "girls"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {CATEGORY_LABELS[group.category] || group.category}
                  </span>
                </AdminTableCell>

                <AdminTableCell className="text-stone-600 text-xs font-medium">
                  {group.linkType === "gspace" ? "Google Space" : "WhatsApp"}
                </AdminTableCell>

                <AdminTableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-4 rounded-full border border-stone-200 shrink-0 shadow-xs"
                      style={{ backgroundColor: group.color || "#3b001b" }}
                    />
                    <span className="text-xs font-mono text-stone-500">
                      {group.color || "#3b001b"}
                    </span>
                  </div>
                </AdminTableCell>

                <AdminTableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/whatsapp/edit/${group.id}`)
                      }
                      className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                      title="Edit group"
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(group.id)}
                      className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                      title="Delete group"
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
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Community Group?"
        description="Are you sure you want to remove this community chat channel? This action cannot be undone."
        confirmText="Delete Group"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
