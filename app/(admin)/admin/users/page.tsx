"use client";

import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  Mail,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
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

interface AdminUser {
  id: string;
  studentId: string;
  name: string;
  email: string;
  uid?: string;
  permissionLevel: "standard" | "full";
  active: boolean;
  createdBy?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface StudentCandidate {
  uid: string;
  studentId: string;
  name: string;
  email: string;
}

export default function AdminUsersManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "full" | "standard">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    studentId: "",
    name: "",
    email: "",
    permissionLevel: "standard" as "standard" | "full",
    active: true,
  });
  const [candidateSuggestions, setCandidateSuggestions] = useState<StudentCandidate[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    studentId: "",
    name: "",
    email: "",
    permissionLevel: "standard" as "standard" | "full",
    active: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  // Fetch admin users
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load administrator accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Compute statistics
  const stats = useMemo(() => {
    const total = admins.length;
    const full = admins.filter((a) => a.active && a.permissionLevel === "full").length;
    const standard = admins.filter((a) => a.active && a.permissionLevel === "standard").length;
    const inactive = admins.filter((a) => !a.active).length;
    return { total, full, standard, inactive };
  }, [admins]);

  // Filtered admins
  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          admin.studentId.toLowerCase().includes(q) ||
          admin.name.toLowerCase().includes(q) ||
          admin.email.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Level
      if (levelFilter !== "all" && admin.permissionLevel !== levelFilter) {
        return false;
      }
      // Status
      if (statusFilter === "active" && !admin.active) return false;
      if (statusFilter === "inactive" && admin.active) return false;

      return true;
    });
  }, [admins, searchQuery, levelFilter, statusFilter]);

  // Student search for Add form
  const handleStudentSearch = async (term: string) => {
    const normalized = term.trim().toUpperCase();
    setAddForm((prev) => ({ ...prev, studentId: normalized }));
    if (normalized.length < 3) {
      setCandidateSuggestions([]);
      return;
    }

    try {
      setSearchingStudents(true);
      const res = await fetch(`/api/admin/users?searchStudent=${encodeURIComponent(normalized)}`);
      if (res.ok) {
        const data = await res.json();
        setCandidateSuggestions(data.students || []);
      }
    } catch {
      // Ignore lookup network hiccups
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleSelectCandidate = (candidate: StudentCandidate) => {
    setAddForm((prev) => ({
      ...prev,
      studentId: candidate.studentId,
      name: candidate.name,
      email: candidate.email,
    }));
    setCandidateSuggestions([]);
  };

  // Add Admin Handler
  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.studentId.trim()) {
      toast.error("Student ID is required");
      return;
    }

    try {
      setAddingAdmin(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add administrator");
      }

      toast.success(data.message || `Administrator ${addForm.studentId} created`);
      setIsAddOpen(false);
      setAddForm({
        studentId: "",
        name: "",
        email: "",
        permissionLevel: "standard",
        active: true,
      });
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to add administrator");
    } finally {
      setAddingAdmin(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditForm({
      studentId: admin.studentId,
      name: admin.name,
      email: admin.email,
      permissionLevel: admin.permissionLevel,
      active: admin.active,
    });
    setIsEditOpen(true);
  };

  // Submit Edit
  const handleEditAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      setSavingEdit(true);
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update administrator");
      }

      toast.success(data.message || "Administrator updated successfully");
      setIsEditOpen(false);
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to update administrator");
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick toggle active
  const handleQuickToggleActive = async (admin: AdminUser) => {
    const nextActive = !admin.active;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: admin.studentId,
          active: nextActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to toggle status");
      }

      toast.success(
        nextActive
          ? `Activated access for ${admin.studentId}`
          : `Revoked access for ${admin.studentId}`
      );
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to change access status");
    }
  };

  // Delete Admin Handler
  const handleDeleteConfirm = async () => {
    if (!adminToDelete) return;

    try {
      setDeletingAdmin(true);
      const res = await fetch(`/api/admin/users?studentId=${encodeURIComponent(adminToDelete.studentId)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove administrator");
      }

      toast.success(data.message || `Administrator ${adminToDelete.studentId} removed`);
      setIsDeleteDialogOpen(false);
      setAdminToDelete(null);
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove administrator");
    } finally {
      setDeletingAdmin(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title="Admin Access Management"
        description="Configure authoritative administrator permissions, assign Level 1 (Standard) vs Level 2 (Full Admin) roles, and manage real-time access."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Admin Users" },
        ]}
        primaryAction={
          <button
            type="button"
            onClick={() => {
              setAddForm({
                studentId: "",
                name: "",
                email: "",
                permissionLevel: "standard",
                active: true,
              });
              setCandidateSuggestions([]);
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] hover:bg-[#4a0022] text-white text-sm font-semibold tracking-wide shadow-md transition-all active:scale-95"
          >
            <Plus className="size-4" />
            <span>Add Administrator</span>
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Total Admins"
          value={stats.total}
          icon={Users}
          subtitle="Registered admin accounts"
        />
        <AdminStatCard
          title="Full Admins (L2)"
          value={stats.full}
          icon={ShieldCheck}
          subtitle="Trips, Coordinators, Registrations & Users"
        />
        <AdminStatCard
          title="Standard Admins (L1)"
          value={stats.standard}
          icon={UserCheck}
          subtitle="Dashboard & content management"
        />
        <AdminStatCard
          title="Revoked / Inactive"
          value={stats.inactive}
          icon={UserX}
          subtitle="Access blocked at gateway"
        />
      </div>

      {/* Filter and Search Bar */}
      <AdminCard className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search administrators by Student ID, name, or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#3B001B] focus:ring-2 focus:ring-[#3B001B]/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
            {/* Level Filter */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#3B001B]"
            >
              <option value="all">All Permission Levels</option>
              <option value="full">Level 2: Full Admin</option>
              <option value="standard">Level 1: Standard Admin</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#3B001B]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Revoked Only</option>
            </select>

            {(searchQuery || levelFilter !== "all" || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setLevelFilter("all");
                  setStatusFilter("all");
                }}
                className="text-xs text-[#3B001B] font-semibold hover:underline whitespace-nowrap px-2"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </AdminCard>

      {/* Main Table */}
      <AdminCard className="overflow-hidden">
        {loading ? (
          <AdminLoadingState type="table" rows={6} />
        ) : filteredAdmins.length === 0 ? (
          <AdminEmptyState
            title={searchQuery ? "No matching administrators" : "No Administrators Found"}
            description={
              searchQuery
                ? `No admin records match "${searchQuery}". Try adjusting your search term or filter.`
                : "No administrator records have been registered in the database yet."
            }
            icon={ShieldAlert}
          />
        ) : (
          <div className="overflow-x-auto">
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>Admin Profile</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Contact & Account</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Permission Level</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Access Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Created / Updated</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <AdminTableBody>
                {filteredAdmins.map((admin) => (
                  <AdminTableRow key={admin.id || admin.studentId}>
                    {/* Admin Profile */}
                    <AdminTableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
                            admin.permissionLevel === "full"
                              ? "bg-[#3B001B] text-[#FFE878] border-[#3B001B]"
                              : "bg-stone-100 text-stone-700 border-stone-200"
                          }`}
                        >
                          {admin.name?.charAt(0)?.toUpperCase() || "A"}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                            <span>{admin.name || "Administrator"}</span>
                            {admin.permissionLevel === "full" && (
                              <Sparkles className="size-3.5 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <div className="font-mono text-xs font-bold text-[#3B001B]">
                            {admin.studentId}
                          </div>
                        </div>
                      </div>
                    </AdminTableCell>

                    {/* Email / UID */}
                    <AdminTableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-stone-700">
                          <Mail className="size-3.5 text-stone-400 shrink-0" />
                          <span className="font-mono">{admin.email || "No email bound"}</span>
                        </div>
                        {admin.uid && (
                          <div className="text-[10px] font-mono text-stone-400 truncate max-w-[180px]">
                            UID: {admin.uid}
                          </div>
                        )}
                      </div>
                    </AdminTableCell>

                    {/* Permission Level */}
                    <AdminTableCell>
                      {admin.permissionLevel === "full" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#3B001B]/10 text-[#3B001B] border border-[#3B001B]/25">
                          <ShieldCheck className="size-3.5 text-[#3B001B]" />
                          Level 2: Full Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
                          <UserCheck className="size-3.5 text-stone-500" />
                          Level 1: Standard Admin
                        </span>
                      )}
                    </AdminTableCell>

                    {/* Access Status */}
                    <AdminTableCell>
                      <button
                        type="button"
                        onClick={() => handleQuickToggleActive(admin)}
                        title={admin.active ? "Click to revoke access" : "Click to activate access"}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                          admin.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            admin.active ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {admin.active ? "Active" : "Revoked"}
                      </button>
                    </AdminTableCell>

                    {/* Created info */}
                    <AdminTableCell className="text-xs text-stone-500">
                      <div>
                        {admin.createdAt
                          ? new Date(admin.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Legacy / System"}
                      </div>
                      {admin.createdBy && (
                        <div className="text-[10px] text-stone-400">
                          by {typeof admin.createdBy === "object"
                            ? (admin.createdBy as any).studentId || (admin.createdBy as any).name || (admin.createdBy as any).email || "system"
                            : String(admin.createdBy)}
                        </div>
                      )}
                    </AdminTableCell>

                    {/* Actions */}
                    <AdminTableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(admin)}
                          title="Edit administrator"
                          className="p-1.5 rounded-lg text-stone-500 hover:text-[#3B001B] hover:bg-stone-100 transition-colors"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminToDelete(admin);
                            setIsDeleteDialogOpen(true);
                          }}
                          title="Delete administrator"
                          className="p-1.5 rounded-lg text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="size-4" />
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

      {/* ── ADD ADMINISTRATOR MODAL ────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#3B001B] px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-[#FFE878] text-[#3B001B] flex items-center justify-center font-bold">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-wide">Add Administrator</h3>
                  <p className="text-xs text-stone-300">Grant authorized admin panel access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddAdminSubmit} className="p-6 space-y-4">
              {/* Student ID with Auto-Suggest */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Student ID / Roll Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={addForm.studentId}
                    onChange={(e) => handleStudentSearch(e.target.value)}
                    placeholder="e.g. 23F2000835, AE22B042"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono uppercase font-bold focus:outline-none focus:border-[#3B001B] focus:ring-2 focus:ring-[#3B001B]/20 transition-all"
                  />
                  {searchingStudents && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="size-4 animate-spin text-stone-400" />
                    </div>
                  )}
                </div>

                {/* Candidate Suggestions */}
                {candidateSuggestions.length > 0 && (
                  <div className="mt-2 bg-stone-50 border border-stone-200 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider px-2 py-0.5">
                      Matched Students (Click to auto-fill)
                    </p>
                    {candidateSuggestions.map((cand) => (
                      <button
                        key={cand.studentId}
                        type="button"
                        onClick={() => handleSelectCandidate(cand)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#3B001B]/10 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-semibold text-stone-800">{cand.name}</span>
                        <span className="font-mono text-stone-500 font-bold">{cand.studentId}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Administrator full name"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#3B001B] focus:ring-2 focus:ring-[#3B001B]/20 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="admin.student@study.iitm.ac.in"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#3B001B] focus:ring-2 focus:ring-[#3B001B]/20 transition-all"
                />
              </div>

              {/* Permission Level Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Permission Level <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      addForm.permissionLevel === "standard"
                        ? "border-[#3B001B] bg-[#3B001B]/5 ring-1 ring-[#3B001B]"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="permissionLevel"
                      value="standard"
                      checked={addForm.permissionLevel === "standard"}
                      onChange={() =>
                        setAddForm((prev) => ({ ...prev, permissionLevel: "standard" }))
                      }
                      className="mt-0.5 text-[#3B001B] focus:ring-[#3B001B]"
                    />
                    <div>
                      <div className="text-xs font-bold text-stone-900">Standard Admin (L1)</div>
                      <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                        Dashboard, gallery, FAQs, and general content.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      addForm.permissionLevel === "full"
                        ? "border-[#3B001B] bg-[#3B001B]/5 ring-1 ring-[#3B001B]"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="permissionLevel"
                      value="full"
                      checked={addForm.permissionLevel === "full"}
                      onChange={() =>
                        setAddForm((prev) => ({ ...prev, permissionLevel: "full" }))
                      }
                      className="mt-0.5 text-[#3B001B] focus:ring-[#3B001B]"
                    />
                    <div>
                      <div className="text-xs font-bold text-stone-900 flex items-center gap-1">
                        <span>Full Admin (L2)</span>
                        <Sparkles className="size-3 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                        Trips, Coordinators, Registrations, and Admin Users.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <div className="text-xs font-bold text-stone-800">Initial Account Status</div>
                  <div className="text-[11px] text-stone-500">Allow this admin to log in immediately</div>
                </div>
                <input
                  type="checkbox"
                  checked={addForm.active}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, active: e.target.checked }))}
                  className="size-4 text-[#3B001B] rounded focus:ring-[#3B001B]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingAdmin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B001B] hover:bg-[#4a0022] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
                >
                  {addingAdmin && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{addingAdmin ? "Creating..." : "Authorize Admin"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT ADMINISTRATOR MODAL ────────────────────────────── */}
      {isEditOpen && editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#3B001B] px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base tracking-wide">Edit Administrator</h3>
                <p className="text-xs text-stone-300 font-mono">{editForm.studentId}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditAdminSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#3B001B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#3B001B]"
                />
              </div>

              {/* Permission Level Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Permission Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      editForm.permissionLevel === "standard"
                        ? "border-[#3B001B] bg-[#3B001B]/5 ring-1 ring-[#3B001B]"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editPermissionLevel"
                      value="standard"
                      checked={editForm.permissionLevel === "standard"}
                      onChange={() =>
                        setEditForm((prev) => ({ ...prev, permissionLevel: "standard" }))
                      }
                      className="mt-0.5 text-[#3B001B] focus:ring-[#3B001B]"
                    />
                    <div>
                      <div className="text-xs font-bold text-stone-900">Standard Admin (L1)</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Dashboard & general content
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      editForm.permissionLevel === "full"
                        ? "border-[#3B001B] bg-[#3B001B]/5 ring-1 ring-[#3B001B]"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editPermissionLevel"
                      value="full"
                      checked={editForm.permissionLevel === "full"}
                      onChange={() =>
                        setEditForm((prev) => ({ ...prev, permissionLevel: "full" }))
                      }
                      className="mt-0.5 text-[#3B001B] focus:ring-[#3B001B]"
                    />
                    <div>
                      <div className="text-xs font-bold text-stone-900 flex items-center gap-1">
                        <span>Full Admin (L2)</span>
                        <Sparkles className="size-3 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Trips, Coordinators, Users
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <div className="text-xs font-bold text-stone-800">Account Access Active</div>
                  <div className="text-[11px] text-stone-500">
                    {editForm.active ? "Administrator can log in" : "Access immediately revoked"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editForm.active}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, active: e.target.checked }))}
                  className="size-4 text-[#3B001B] rounded focus:ring-[#3B001B]"
                />
              </div>

              {/* Safety warning if editing last full admin */}
              {editingAdmin.permissionLevel === "full" && stats.full <= 1 && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">System Guard Active:</span> This is currently the
                    only active Full Administrator. Demoting or deactivating this account is
                    prevented to avoid accidental lockout.
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B001B] hover:bg-[#4a0022] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
                >
                  {savingEdit && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{savingEdit ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM DIALOG ────────────────────────────── */}
      <AdminConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Remove Administrator"
        description={`Are you sure you want to completely remove administrator privileges for ${
          adminToDelete?.name || adminToDelete?.studentId
        } (${adminToDelete?.studentId})? They will no longer be able to pass verification.`}
        confirmText="Remove Administrator"
        cancelText="Cancel"
        variant="danger"
        loading={deletingAdmin}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
