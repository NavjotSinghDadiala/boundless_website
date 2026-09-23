"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  UsersIcon,
  UserCheckIcon,
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

const TYPE_LABELS = {
  founder: "Founder",
  council: "Council Member",
  dept_head: "Department Head",
};

export default function ManageTeamPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // Fetch all team members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/team-members");
      const data = await res.json();
      if (res.ok) {
        const raw = data.members || [];
        const TYPE_ORDER = { founder: 0, council: 1, dept_head: 2 };
        raw.sort((a, b) => {
          const aTerm = a.term || "";
          const bTerm = b.term || "";
          if (!aTerm && bTerm) return -1;
          if (aTerm && !bTerm) return 1;
          if (aTerm !== bTerm) return aTerm.localeCompare(bTerm);
          const aTypeOrder = TYPE_ORDER[a.type] ?? 99;
          const bTypeOrder = TYPE_ORDER[b.type] ?? 99;
          if (aTypeOrder !== bTypeOrder) return aTypeOrder - bTypeOrder;
          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        });
        setMembers(raw);
      } else {
        throw new Error(data.error || "Failed to load team members");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/team-members?id=${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Team member deleted successfully");
        setMembers((prev) => prev.filter((m) => m.id !== deleteId));
        setDeleteId(null);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
    } catch (error) {
      toast.error(error.message || "Failed to delete team member");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="Team & Leadership Council"
        description="Manage founders, elected council representatives, and department heads displayed on the public About and Team pages."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Team Members" },
        ]}
        primaryAction={
          <button
            type="button"
            onClick={() => router.push("/admin/team/add")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
          >
            <PlusIcon className="size-4" />
            <span>Add Member</span>
          </button>
        }
      />

      {loading ? (
        <AdminLoadingState type="table" rows={5} />
      ) : members.length === 0 ? (
        <AdminEmptyState
          title="No Team Members Found"
          description="Add core founders and council leaders to represent Boundless leadership."
          icon={UsersIcon}
          action={
            <button
              type="button"
              onClick={() => router.push("/admin/team/add")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
            >
              <PlusIcon className="size-3.5" />
              Add First Member
            </button>
          }
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Member</AdminTableHeaderCell>
              <AdminTableHeaderCell>Designated Role</AdminTableHeaderCell>
              <AdminTableHeaderCell>Category</AdminTableHeaderCell>
              <AdminTableHeaderCell>Term</AdminTableHeaderCell>
              <AdminTableHeaderCell>Sort Order</AdminTableHeaderCell>
              <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {members.map((member) => (
              <AdminTableRow key={member.id}>
                <AdminTableCell>
                  <div className="flex items-center gap-3">
                    {member.image ? (
                      <div className="size-10 rounded-full overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                        <img
                          src={member.image}
                          alt={member.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="size-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-bold text-stone-500 shrink-0">
                        {member.name?.charAt(0) || "U"}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-stone-900">
                        {member.name}
                      </div>
                    </div>
                  </div>
                </AdminTableCell>

                <AdminTableCell className="text-stone-700 font-medium">
                  {member.role || "—"}
                </AdminTableCell>

                <AdminTableCell>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      member.type === "founder"
                        ? "bg-[#3B001B]/10 text-[#3B001B] border border-[#3B001B]/20"
                        : member.type === "council"
                        ? "bg-amber-100 text-amber-900 border border-amber-300/80"
                        : "bg-stone-100 text-stone-700 border border-stone-200"
                    }`}
                  >
                    {TYPE_LABELS[member.type] || member.type}
                  </span>
                </AdminTableCell>

                <AdminTableCell className="text-stone-500 font-mono text-xs whitespace-nowrap">
                  {member.term || "Permanent"}
                </AdminTableCell>

                <AdminTableCell className="text-stone-400 font-mono text-xs">
                  {member.sortOrder ?? 0}
                </AdminTableCell>

                <AdminTableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/team/edit/${member.id}`)}
                      className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                      title="Edit member"
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(member.id)}
                      className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                      title="Delete member"
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
        title="Delete Team Member?"
        description="Are you sure you want to remove this member from the Boundless council? This action cannot be undone."
        confirmText="Delete Member"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
