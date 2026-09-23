"use client";

import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  SearchIcon,
  MailIcon,
  PhoneIcon,
  CheckCircle2,
  XCircle,
  Users,
  Compass,
  Copy,
  Check,
  Loader2,
  X,
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
  AdminStatCard,
} from "@/components/admin";

interface Coordinator {
  id: string;
  studentId: string;
  name: string;
  email: string;
  phone?: string;
  active: boolean;
  notes?: string;
  assignedTripsCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function AdminCoordinatorsPage() {
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCoordinator, setEditingCoordinator] = useState<Coordinator | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    studentId: "",
    name: "",
    email: "",
    phone: "",
    active: true,
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<{ studentId?: string; name?: string }>({});

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copy email feedback
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Fetch coordinators from API
  const fetchCoordinators = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/coordinators");
      const data = await res.json();
      if (res.ok) {
        setCoordinators(data.coordinators || []);
      } else {
        throw new Error(data.error || "Failed to load coordinators");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not retrieve coordinator records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoordinators();
  }, []);

  // Filtered coordinators list
  const filteredCoordinators = useMemo(() => {
    return coordinators.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.studentId.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.active) ||
        (statusFilter === "inactive" && !c.active);

      return matchesSearch && matchesStatus;
    });
  }, [coordinators, searchQuery, statusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = coordinators.length;
    const active = coordinators.filter((c) => c.active).length;
    const inactive = total - active;
    const totalAssignments = coordinators.reduce(
      (sum, c) => sum + (c.assignedTripsCount || 0),
      0
    );
    return { total, active, inactive, totalAssignments };
  }, [coordinators]);

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      studentId: "",
      name: "",
      email: "",
      phone: "",
      active: true,
      notes: "",
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (coordinator: Coordinator) => {
    setEditingCoordinator(coordinator);
    setFormData({
      studentId: coordinator.studentId || "",
      name: coordinator.name || "",
      email: coordinator.email || "",
      phone: coordinator.phone || "",
      active: coordinator.active !== false,
      notes: coordinator.notes || "",
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Copy Email to clipboard
  const handleCopyEmail = (email: string) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Handle Create Coordinator
  const handleCreateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { studentId?: string; name?: string } = {};

    if (!formData.studentId.trim()) {
      errors.studentId = "Student ID is required (e.g. AE22B042, 23f2000835).";
    }
    if (!formData.name.trim()) {
      errors.name = "Coordinator full name is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/coordinators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Coordinator '${data.coordinator.name}' added successfully!`);
        setIsAddModalOpen(false);
        fetchCoordinators();
      } else {
        throw new Error(data.error || "Failed to create coordinator");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add coordinator");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Update Coordinator
  const handleUpdateCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoordinator) return;

    const errors: { studentId?: string; name?: string } = {};
    if (!formData.studentId.trim()) {
      errors.studentId = "Student ID is required.";
    }
    if (!formData.name.trim()) {
      errors.name = "Name is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/coordinators", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCoordinator.id,
          ...formData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Coordinator details updated successfully");
        setIsEditModalOpen(false);
        setEditingCoordinator(null);
        fetchCoordinators();
      } else {
        throw new Error(data.error || "Failed to update coordinator");
      }
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (coordinator: Coordinator) => {
    try {
      const nextActive = !coordinator.active;
      const res = await fetch("/api/admin/coordinators", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: coordinator.id,
          active: nextActive,
        }),
      });

      if (res.ok) {
        setCoordinators((prev) =>
          prev.map((c) => (c.id === coordinator.id ? { ...c, active: nextActive } : c))
        );
        toast.success(
          `${coordinator.name} is now ${nextActive ? "Active" : "Inactive"}`
        );
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to toggle status");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not change status");
    }
  };

  // Handle Delete Coordinator
  const handleDeleteCoordinator = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/coordinators?id=${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Coordinator removed successfully");
        setCoordinators((prev) => prev.filter((c) => c.id !== deleteId));
        setDeleteId(null);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not delete coordinator");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title="Trip Coordinators"
        description="Manage student coordinator credentials, Student ID authorization, and on-ground access."
        primaryAction={
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#3B001B] hover:bg-[#4a0022] text-[#FFE878] rounded-xl text-xs font-bold uppercase tracking-wider font-oswald shadow-md transition-all active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Coordinator</span>
          </button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Total Coordinators"
          value={stats.total}
          icon={Users}
          subtitle="Enrolled in system"
          variant="maroon"
        />
        <AdminStatCard
          title="Active Coordinators"
          value={stats.active}
          icon={CheckCircle2}
          subtitle="Authorized to coordinate"
          variant="emerald"
        />
        <AdminStatCard
          title="Inactive"
          value={stats.inactive}
          icon={XCircle}
          subtitle="Access paused"
          variant="stone"
        />
        <AdminStatCard
          title="Trip Assignments"
          value={stats.totalAssignments}
          icon={Compass}
          subtitle="Active expedition scopes"
          variant="amber"
        />
      </div>

      {/* Filter & Search Bar */}
      <AdminCard className="p-4 bg-white shadow-sm border border-stone-200/80 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Student ID, name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all placeholder:text-stone-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === "all"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === "active"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === "inactive"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Inactive ({stats.inactive})
            </button>
          </div>
        </div>
      </AdminCard>

      {/* Coordinators Table */}
      <AdminCard className="bg-white shadow-sm border border-stone-200/80 rounded-2xl overflow-hidden">
        {loading ? (
          <AdminLoadingState text="Loading coordinator profiles..." type="table" />
        ) : filteredCoordinators.length === 0 ? (
          <AdminEmptyState
            title="No Coordinators Found"
            description={
              searchQuery || statusFilter !== "all"
                ? "No coordinators match your current search filters. Try adjusting your query."
                : "No trip coordinators have been registered yet. Add student IDs of authorized coordinators to grant them dashboard access."
            }
            action={
              searchQuery || statusFilter !== "all" ? undefined : (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#3B001B] hover:bg-[#4a0022] text-[#FFE878] rounded-xl text-xs font-bold uppercase tracking-wider font-oswald shadow-md transition-all active:scale-95"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add First Coordinator</span>
                </button>
              )
            }
            icon={ShieldCheck}
          />
        ) : (
          <div className="overflow-x-auto">
            <AdminTable>
              <AdminTableHead>
                <AdminTableRow>
                  <AdminTableHeaderCell>Coordinator</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Student ID</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Contact Details</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Assignments</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
                </AdminTableRow>
              </AdminTableHead>
              <AdminTableBody>
                {filteredCoordinators.map((coordinator) => (
                  <AdminTableRow key={coordinator.id} className="hover:bg-stone-50/80 transition-colors">
                    {/* Coordinator Name & Avatar */}
                    <AdminTableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#3B001B]/10 text-[#3B001B] font-oswald font-bold flex items-center justify-center text-sm shrink-0 border border-[#3B001B]/15">
                          {coordinator.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 text-sm truncate">
                            {coordinator.name}
                          </p>
                          {coordinator.notes && (
                            <p className="text-xs text-stone-500 truncate max-w-xs mt-0.5">
                              {coordinator.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </AdminTableCell>

                    {/* Student ID Badge */}
                    <AdminTableCell>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-mono text-xs font-bold tracking-wider">
                        <span>{coordinator.studentId}</span>
                      </div>
                    </AdminTableCell>

                    {/* Contact Details */}
                    <AdminTableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        {coordinator.email ? (
                          <div className="flex items-center gap-1.5 text-stone-700">
                            <MailIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <a
                              href={`mailto:${coordinator.email}`}
                              className="hover:underline hover:text-[#3B001B] truncate max-w-[200px]"
                            >
                              {coordinator.email}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(coordinator.email)}
                              className="text-stone-400 hover:text-stone-600 p-0.5 transition-colors"
                              title="Copy email"
                            >
                              {copiedEmail === coordinator.email ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">No email linked</span>
                        )}

                        {coordinator.phone && (
                          <div className="flex items-center gap-1.5 text-stone-600">
                            <PhoneIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <a
                              href={`tel:${coordinator.phone}`}
                              className="hover:underline hover:text-stone-900 font-mono"
                            >
                              {coordinator.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </AdminTableCell>

                    {/* Status Toggle Badge */}
                    <AdminTableCell>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(coordinator)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                          coordinator.active
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200"
                        }`}
                        title="Click to toggle status"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            coordinator.active ? "bg-green-500 animate-pulse" : "bg-stone-400"
                          }`}
                        />
                        <span>{coordinator.active ? "Active" : "Inactive"}</span>
                      </button>
                    </AdminTableCell>

                    {/* Assigned Trips Count */}
                    <AdminTableCell>
                      {coordinator.assignedTripsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                          <Compass className="w-3 h-3 text-amber-600" />
                          <span>
                            {coordinator.assignedTripsCount} Trip
                            {coordinator.assignedTripsCount > 1 ? "s" : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400 font-medium">Unassigned</span>
                      )}
                    </AdminTableCell>

                    {/* Actions */}
                    <AdminTableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(coordinator)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                          title="Edit Coordinator"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(coordinator.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Coordinator"
                        >
                          <Trash2Icon className="w-4 h-4" />
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

      {/* ── ADD COORDINATOR MODAL ────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ribbon Header */}
            <div className="bg-[#3B001B] px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFE878] text-[#3B001B] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wider">
                    Add Trip Coordinator
                  </h3>
                  <p className="text-xs text-stone-300">
                    Authorize student ID to access the coordinator console
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateCoordinator} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-oswald mb-1">
                  Student ID / Roll No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentId}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, studentId: e.target.value.toUpperCase() }));
                    setFormErrors((prev) => ({ ...prev, studentId: undefined }));
                  }}
                  placeholder="e.g. AE22B042, 23f2000835"
                  className={`w-full px-4 py-2.5 bg-stone-50 border rounded-xl text-sm font-mono uppercase font-bold focus:outline-none focus:ring-2 transition-all ${
                    formErrors.studentId
                      ? "border-red-400 focus:ring-red-200"
                      : "border-stone-200 focus:border-[#3B001B] focus:ring-[#3B001B]/20"
                  }`}
                />
                {formErrors.studentId && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">{formErrors.studentId}</p>
                )}
                <p className="text-[11px] text-stone-500 mt-1 leading-normal">
                  When the student logs in with their IITM email, this Student ID will automatically unlock Coordinator access.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-oswald mb-1">
                  Coordinator Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. Rohan Verma"
                  className={`w-full px-4 py-2.5 bg-stone-50 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                    formErrors.name
                      ? "border-red-400 focus:ring-red-200"
                      : "border-stone-200 focus:border-[#3B001B] focus:ring-[#3B001B]/20"
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-oswald mb-1">
                    IITM Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value.toLowerCase() }))
                    }
                    placeholder="student@study.iitm.ac.in"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-oswald mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-oswald mb-1">
                  Notes / Role Details
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Lead Coordinator, Safety Officer, Trek Specialist"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <span className="text-xs font-bold text-stone-900 block font-oswald uppercase">
                    Active Status
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Coordinator will immediately have dashboard access when active
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                  className="w-5 h-5 accent-[#3B001B] rounded cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors font-oswald"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#3B001B] hover:bg-[#4a0022] text-[#FFE878] rounded-xl text-xs font-bold uppercase tracking-wider font-oswald transition-all shadow-md active:scale-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Add Coordinator</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT COORDINATOR MODAL ───────────────────────────── */}
      {isEditModalOpen && editingCoordinator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#3B001B] px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFE878] text-[#3B001B] flex items-center justify-center font-bold">
                  <PencilIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wider">
                    Edit Coordinator
                  </h3>
                  <p className="text-xs text-stone-300">
                    Update profile, student ID or status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-stone-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateCoordinator} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-oswald mb-1">
                  Student ID / Roll No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentId}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, studentId: e.target.value.toUpperCase() }));
                    setFormErrors((prev) => ({ ...prev, studentId: undefined }));
                  }}
                  className={`w-full px-4 py-2.5 bg-stone-50 border rounded-xl text-sm font-mono uppercase font-bold focus:outline-none focus:ring-2 transition-all ${
                    formErrors.studentId
                      ? "border-red-400 focus:ring-red-200"
                      : "border-stone-200 focus:border-[#3B001B] focus:ring-[#3B001B]/20"
                  }`}
                />
                {formErrors.studentId && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">{formErrors.studentId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-oswald mb-1">
                  Coordinator Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={`w-full px-4 py-2.5 bg-stone-50 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                    formErrors.name
                      ? "border-red-400 focus:ring-red-200"
                      : "border-stone-200 focus:border-[#3B001B] focus:ring-[#3B001B]/20"
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-oswald mb-1">
                    IITM Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value.toLowerCase() }))
                    }
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-oswald mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-oswald mb-1">
                  Notes / Role
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <span className="text-xs font-bold text-stone-900 block font-oswald uppercase">
                    Active Status
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Coordinator will immediately have dashboard access when active
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                  className="w-5 h-5 accent-[#3B001B] rounded cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors font-oswald"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#3B001B] hover:bg-[#4a0022] text-[#FFE878] rounded-xl text-xs font-bold uppercase tracking-wider font-oswald transition-all shadow-md active:scale-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Remove Coordinator"
        description="Are you sure you want to remove this coordinator? This will revoke their access to the coordinator dashboard."
        confirmText="Remove Coordinator"
        cancelText="Keep Coordinator"
        loading={deleting}
        onConfirm={handleDeleteCoordinator}
        variant="danger"
      />
    </div>
  );
}
