"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  UsersIcon,
  UserCheckIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
  AdminBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminConfirmDialog,
  AdminResponsiveModal,
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
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [selectedHodId, setSelectedHodId] = useState("");
  const [draftTeam, setDraftTeam] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);
  const router = useRouter();

  const hodMembers = useMemo(
    () => members.filter((m) => m.type === "dept_head"),
    [members]
  );

  const openTeamModal = (hodIdToSelect) => {
    const targetId = hodIdToSelect || hodMembers[0]?.id || "";
    const targetHod = hodMembers.find((h) => h.id === targetId);
    setSelectedHodId(targetId);
    setDraftTeam(
      Array.isArray(targetHod?.departmentTeam)
        ? targetHod.departmentTeam.map((item, idx) => ({
            id: item.id || `tm-${idx + 1}`,
            name: item.name || "",
          }))
        : []
    );
    setNewMemberName("");
    setTeamModalOpen(true);
  };

  const handleSelectHodInModal = (nextHodId) => {
    const targetHod = hodMembers.find((h) => h.id === nextHodId);
    setSelectedHodId(nextHodId);
    setDraftTeam(
      Array.isArray(targetHod?.departmentTeam)
        ? targetHod.departmentTeam.map((item, idx) => ({
            id: item.id || `tm-${idx + 1}`,
            name: item.name || "",
          }))
        : []
    );
    setNewMemberName("");
  };

  const handleAddDraftMember = () => {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    setDraftTeam((prev) => [
      ...prev,
      { id: `tm-${Date.now()}-${prev.length + 1}`, name: trimmed },
    ]);
    setNewMemberName("");
  };

  const handleEditDraftMemberName = (memberId, nextName) => {
    setDraftTeam((prev) =>
      prev.map((item) => (item.id === memberId ? { ...item, name: nextName } : item))
    );
  };

  const handleRemoveDraftMember = (memberId) => {
    setDraftTeam((prev) => prev.filter((item) => item.id !== memberId));
  };

  const handleSaveDepartmentTeam = async () => {
    if (!selectedHodId) {
      return toast.error("Please select an HOD first.");
    }
    const cleaned = draftTeam
      .map((m) => ({ id: m.id, name: String(m.name || "").trim() }))
      .filter((m) => m.name.length > 0);

    setSavingTeam(true);
    try {
      const res = await fetch("/api/team-members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hodId: selectedHodId,
          departmentTeam: cleaned,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save HOD team.");
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedHodId
            ? { ...m, departmentTeam: data.departmentTeam || cleaned }
            : m
        )
      );
      setDraftTeam(data.departmentTeam || cleaned);
      toast.success("HOD team saved successfully!");
      setTeamModalOpen(false);
    } catch (error) {
      toast.error(error.message || "Failed to save HOD team.");
    } finally {
      setSavingTeam(false);
    }
  };

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
        secondaryActions={
          hodMembers.length > 0 ? (
            <button
              type="button"
              onClick={() => openTeamModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs sm:text-sm font-semibold hover:bg-stone-50 shadow-sm transition-all"
            >
              <UsersIcon className="size-4 text-[#3B001B]" />
              <span>Manage Team</span>
            </button>
          ) : null
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
                  <div className="flex flex-wrap items-center gap-1.5">
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
                    {member.type === "dept_head" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3B001B]/8 text-[#3B001B] border border-[#3B001B]/15">
                        <UsersIcon className="size-2.5" />
                        {(member.departmentTeam?.length || 0)}{" "}
                        {(member.departmentTeam?.length || 0) === 1 ? "member" : "members"}
                      </span>
                    )}
                  </div>
                </AdminTableCell>

                <AdminTableCell className="text-stone-500 font-mono text-xs whitespace-nowrap">
                  {member.term || "Permanent"}
                </AdminTableCell>

                <AdminTableCell className="text-stone-400 font-mono text-xs">
                  {member.sortOrder ?? 0}
                </AdminTableCell>

                <AdminTableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {member.type === "dept_head" && (
                      <button
                        type="button"
                        onClick={() => openTeamModal(member.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#3B001B]/20 bg-[#3B001B]/5 text-[#3B001B] hover:bg-[#3B001B]/10 text-xs font-semibold transition-colors"
                        title="Manage HOD's department team"
                      >
                        <UsersIcon className="size-3.5" />
                        <span>Team</span>
                      </button>
                    )}
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

      {/* ONE Manage HOD Team Modal / Drawer */}
      <AdminResponsiveModal
        open={teamModalOpen}
        onOpenChange={(open) => {
          if (!savingTeam) setTeamModalOpen(open);
        }}
        title="Manage HOD Team"
        description="Assign, rename, or remove team members working under a Department Head. Names appear in the HOD card's bottom hover slider."
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              disabled={savingTeam}
              onClick={() => setTeamModalOpen(false)}
              className="min-h-[44px] px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-sm font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingTeam || !selectedHodId}
              onClick={handleSaveDepartmentTeam}
              className="min-h-[44px] px-5 rounded-xl bg-[#3B001B] hover:bg-[#520026] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            >
              <SaveIcon className="size-4" />
              <span>{savingTeam ? "Saving..." : "Save Team"}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* HOD Selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="hod-select"
              className="block text-sm font-semibold text-stone-800"
            >
              Select Department Head (HOD)
            </label>
            <select
              id="hod-select"
              value={selectedHodId}
              onChange={(e) => handleSelectHodInModal(e.target.value)}
              className="w-full min-h-[46px] px-3.5 rounded-xl border border-stone-300 bg-white text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
            >
              {hodMembers.map((hod) => (
                <option key={hod.id} value={hod.id}>
                  {hod.name} — {hod.role}
                  {hod.term ? ` (${hod.term})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Add New Team Member Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-team-member-name"
              className="block text-sm font-semibold text-stone-800"
            >
              Add Team Member
            </label>
            <div className="flex gap-2">
              <input
                id="new-team-member-name"
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDraftMember();
                  }
                }}
                placeholder="Enter member's name..."
                maxLength={80}
                className="flex-1 min-h-[46px] px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
              />
              <button
                type="button"
                onClick={handleAddDraftMember}
                disabled={!newMemberName.trim()}
                className="min-h-[46px] px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <PlusIcon className="size-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Assigned Members List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-500">
              <span>Assigned Team Members</span>
              <span>{draftTeam.length} total</span>
            </div>

            {draftTeam.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-6 text-center text-sm text-stone-500">
                No team members assigned to this HOD yet. Add names above and click Save Team.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {draftTeam.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/60 p-2"
                  >
                    <span className="w-6 text-center text-xs font-mono text-stone-400 shrink-0">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      aria-label={`Edit team member ${idx + 1}`}
                      value={entry.name}
                      maxLength={80}
                      onChange={(e) =>
                        handleEditDraftMemberName(entry.id, e.target.value)
                      }
                      className="flex-1 min-h-[40px] px-3 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDraftMember(entry.id)}
                      aria-label={`Remove ${entry.name || "member"}`}
                      className="min-h-[40px] min-w-[40px] rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 inline-flex items-center justify-center shrink-0"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AdminResponsiveModal>

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
