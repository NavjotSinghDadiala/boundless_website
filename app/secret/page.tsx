"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Lock,
  Key,
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
  History,
  Activity,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  Check,
  Sparkles,
} from "lucide-react";

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

interface AuditLog {
  id: string;
  actorStudentId: string;
  actorEmail: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  result: "success" | "denied" | "failed";
  timestamp: string | null;
  metadata?: Record<string, any>;
}

interface OverviewStats {
  totalAdmins: number;
  activeFullAdmins: number;
  activeStandardAdmins: number;
  revokedAdmins: number;
  totalCoordinators: number;
  activeCoordinators: number;
  deniedAttemptsCount: number;
  totalAuditEventsSample: number;
}

export default function SecretAdministrationPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "admins" | "audit" | "credentials">("overview");

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Overview state
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Admins CRUD state
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminFilterLevel, setAdminFilterLevel] = useState<"all" | "full" | "standard">("all");
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [addAdminForm, setAddAdminForm] = useState({
    studentId: "",
    name: "",
    email: "",
    permissionLevel: "standard" as "standard" | "full",
    active: true,
  });
  const [savingNewAdmin, setSavingNewAdmin] = useState(false);

  // Edit Admin state
  const [isEditAdminOpen, setIsEditAdminOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editAdminForm, setEditAdminForm] = useState({
    studentId: "",
    name: "",
    email: "",
    permissionLevel: "standard" as "standard" | "full",
    active: true,
  });
  const [savingEditAdmin, setSavingEditAdmin] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditFilterAction, setAuditFilterAction] = useState("");
  const [auditFilterResult, setAuditFilterResult] = useState<"all" | "success" | "denied" | "failed">("all");
  const [auditFilterActor, setAuditFilterActor] = useState("");
  const [selectedLogMetadata, setSelectedLogMetadata] = useState<AuditLog | null>(null);

  // Credentials change state
  const [credForm, setCredForm] = useState({
    newUsername: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [updatingCreds, setUpdatingCreds] = useState(false);

  // Check existing session
  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/secret/auth");
      const data = await res.json();
      setIsAuthenticated(Boolean(data.authenticated));
      if (data.authenticated) {
        fetchOverviewData();
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Fetch overview data
  const fetchOverviewData = async () => {
    try {
      setLoadingOverview(true);
      const res = await fetch("/api/secret/overview");
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      setStats(data.stats);
      setRecentActivity(data.recentActivity || []);
    } catch {
      toast.error("Failed to load security overview");
    } finally {
      setLoadingOverview(false);
    }
  };

  // Fetch Admins
  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const res = await fetch("/api/secret/admins");
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch {
      toast.error("Failed to fetch admin users");
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (auditFilterAction) params.set("action", auditFilterAction);
      if (auditFilterResult !== "all") params.set("result", auditFilterResult);
      if (auditFilterActor) params.set("actor", auditFilterActor);

      const res = await fetch(`/api/secret/audit?${params.toString()}`);
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch {
      toast.error("Failed to fetch audit logs");
    } finally {
      setLoadingAudit(false);
    }
  };

  // Switch tabs
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === "overview") fetchOverviewData();
    if (activeTab === "admins") fetchAdmins();
    if (activeTab === "audit") fetchAuditLogs();
  }, [activeTab, isAuthenticated]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      toast.error("Both username and password are required");
      return;
    }

    try {
      setIsLoggingIn(true);
      const res = await fetch("/api/secret/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      toast.success("Master authentication successful!");
      setIsAuthenticated(true);
      setLoginPassword("");
      fetchOverviewData();
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/secret/auth", { method: "DELETE" });
      setIsAuthenticated(false);
      toast.success("Logged out from master console");
    } catch {
      setIsAuthenticated(false);
    }
  };

  // Handle Create Admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAdminForm.studentId.trim()) {
      toast.error("Student ID is required");
      return;
    }

    try {
      setSavingNewAdmin(true);
      const res = await fetch("/api/secret/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addAdminForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create administrator");

      toast.success(data.message || `Admin ${addAdminForm.studentId} created`);
      setIsAddAdminOpen(false);
      setAddAdminForm({
        studentId: "",
        name: "",
        email: "",
        permissionLevel: "standard",
        active: true,
      });
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingNewAdmin(false);
    }
  };

  // Handle Edit Admin
  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    try {
      setSavingEditAdmin(true);
      const res = await fetch("/api/secret/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editAdminForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update administrator");

      toast.success(data.message || "Administrator updated");
      setIsEditAdminOpen(false);
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingEditAdmin(false);
    }
  };

  // Handle Delete Admin
  const handleDeleteAdmin = async (studentId: string) => {
    if (!confirm(`Are you sure you want to permanently remove admin ${studentId}?`)) return;

    try {
      const res = await fetch(`/api/secret/admins?studentId=${encodeURIComponent(studentId)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete admin");

      toast.success(data.message || `Admin ${studentId} removed`);
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Handle Change Master Credentials
  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credForm.newPassword !== credForm.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    try {
      setUpdatingCreds(true);
      const res = await fetch("/api/secret/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_credentials",
          newUsername: credForm.newUsername,
          newPassword: credForm.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update master credentials");

      toast.success("Master credentials updated successfully!");
      setCredForm({ newUsername: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingCreds(false);
    }
  };

  // Filtered admins in directory
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      if (adminSearch.trim()) {
        const q = adminSearch.toLowerCase().trim();
        const matches =
          a.studentId.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (adminFilterLevel !== "all" && a.permissionLevel !== adminFilterLevel) return false;
      return true;
    });
  }, [admins, adminSearch, adminFilterLevel]);

  // Loading initial auth check
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0E0C13] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#FFE878]" />
          <p className="text-xs uppercase tracking-widest text-stone-400 font-mono">
            Verifying Security Context...
          </p>
        </div>
      </div>
    );
  }

  // ── UNAUTHENTICATED: LOGIN SCREEN ──────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A090D] flex items-center justify-center p-4 selection:bg-[#FFE878] selection:text-[#0A090D]">
        <div className="w-full max-w-md bg-[#13111A] border border-stone-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 size-48 bg-[#3B001B]/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 size-48 bg-[#FFE878]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-[#3B001B] to-[#590029] border border-stone-700/60 flex items-center justify-center text-[#FFE878] shadow-inner">
              <Shield className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-wider uppercase font-mono">
                  Boundless Security
                </h1>
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-stone-400">Master Administration Plane</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-300 font-mono mb-1.5">
                Master Security Identifier
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Master username"
                  className="w-full px-4 py-3 bg-[#1A1724] border border-stone-700/80 rounded-xl text-sm text-white placeholder-stone-600 focus:outline-none focus:border-[#FFE878] focus:ring-1 focus:ring-[#FFE878]/30 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-300 font-mono mb-1.5">
                Master Key Authorization
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 bg-[#1A1724] border border-stone-700/80 rounded-xl text-sm text-white placeholder-stone-600 focus:outline-none focus:border-[#FFE878] focus:ring-1 focus:ring-[#FFE878]/30 transition-all font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#3B001B] via-[#4d0023] to-[#3B001B] hover:opacity-95 text-[#FFE878] font-mono text-xs font-bold uppercase tracking-widest rounded-xl border border-[#FFE878]/30 shadow-lg shadow-[#3B001B]/50 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-4 animate-spin text-[#FFE878]" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Key className="size-4" />
                  <span>Enter Security Console</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-800/80 text-center">
            <p className="text-[11px] text-stone-500 font-mono">
              Server-authenticated via Firestore systemConfig • Zero-Trust
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── AUTHENTICATED: MASTER CONSOLE ──────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A090D] text-stone-100 flex flex-col font-sans selection:bg-[#FFE878] selection:text-[#0A090D]">
      {/* Top Bar */}
      <header className="border-b border-stone-800/80 bg-[#121018]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-br from-[#3B001B] to-[#590029] border border-[#FFE878]/40 flex items-center justify-center text-[#FFE878] shadow-md">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-white tracking-widest uppercase">
                Boundless Security Console
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Server
              </span>
            </div>
            <div className="text-[11px] text-stone-400 font-mono">
              Master Admin Access & Audit Center
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-700/80 bg-stone-900/60 hover:bg-rose-950/30 hover:border-rose-700/60 text-stone-300 hover:text-rose-400 text-xs font-mono transition-all"
          >
            <LogOut className="size-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-800/80 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              activeTab === "overview"
                ? "bg-[#3B001B] text-[#FFE878] border border-[#FFE878]/30 shadow-md"
                : "text-stone-400 hover:text-white hover:bg-stone-900/50"
            }`}
          >
            <Activity className="size-4" />
            <span>Security Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("admins")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              activeTab === "admins"
                ? "bg-[#3B001B] text-[#FFE878] border border-[#FFE878]/30 shadow-md"
                : "text-stone-400 hover:text-white hover:bg-stone-900/50"
            }`}
          >
            <Users className="size-4" />
            <span>Admin Directory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              activeTab === "audit"
                ? "bg-[#3B001B] text-[#FFE878] border border-[#FFE878]/30 shadow-md"
                : "text-stone-400 hover:text-white hover:bg-stone-900/50"
            }`}
          >
            <History className="size-4" />
            <span>Audit History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("credentials")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              activeTab === "credentials"
                ? "bg-[#3B001B] text-[#FFE878] border border-[#FFE878]/30 shadow-md"
                : "text-stone-400 hover:text-white hover:bg-stone-900/50"
            }`}
          >
            <Key className="size-4" />
            <span>Master Credentials</span>
          </button>
        </div>

        {/* ── TAB 1: SECURITY OVERVIEW ────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#14121B] border border-stone-800/80 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-mono uppercase font-bold">Total Admins</span>
                  <Users className="size-4 text-stone-500" />
                </div>
                <div className="text-3xl font-mono font-bold text-white">
                  {stats?.totalAdmins ?? "—"}
                </div>
                <div className="text-[11px] text-stone-400">Authorized student ID profiles</div>
              </div>

              <div className="bg-[#14121B] border border-stone-800/80 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-mono uppercase font-bold">Full Admins (L2)</span>
                  <ShieldCheck className="size-4 text-amber-400" />
                </div>
                <div className="text-3xl font-mono font-bold text-[#FFE878]">
                  {stats?.activeFullAdmins ?? "—"}
                </div>
                <div className="text-[11px] text-stone-400">Trips, Coordinators, Users</div>
              </div>

              <div className="bg-[#14121B] border border-stone-800/80 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-sky-400">
                  <span className="text-xs font-mono uppercase font-bold">Standard Admins (L1)</span>
                  <UserCheck className="size-4 text-sky-400" />
                </div>
                <div className="text-3xl font-mono font-bold text-sky-200">
                  {stats?.activeStandardAdmins ?? "—"}
                </div>
                <div className="text-[11px] text-stone-400">Content, gallery, stats</div>
              </div>

              <div className="bg-[#14121B] border border-stone-800/80 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-rose-400">
                  <span className="text-xs font-mono uppercase font-bold">Denied Attempts</span>
                  <ShieldAlert className="size-4 text-rose-400" />
                </div>
                <div className="text-3xl font-mono font-bold text-rose-300">
                  {stats?.deniedAttemptsCount ?? "—"}
                </div>
                <div className="text-[11px] text-stone-400">Blocked unauthorized mutations</div>
              </div>
            </div>

            {/* Recent Audit Activity */}
            <div className="bg-[#14121B] border border-stone-800/80 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-[#FFE878]" />
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                    Live Security Stream
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={fetchOverviewData}
                  className="text-xs font-mono text-stone-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="size-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingOverview ? (
                <div className="p-8 text-center text-stone-400 font-mono text-xs">
                  Loading telemetry...
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="p-8 text-center text-stone-500 font-mono text-xs">
                  No security audit events recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-stone-800/60">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                              log.result === "success"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : log.result === "denied"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {log.action}
                          </span>
                          <span className="text-xs font-mono text-stone-300">
                            {log.actorStudentId}
                          </span>
                          <span className="text-[11px] text-stone-500">({log.actorName})</span>
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono">
                          Target: {log.resourceType} / {log.resourceId}
                        </div>
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono text-right shrink-0">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: ADMIN DIRECTORY ────────────────────────── */}
        {activeTab === "admins" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-500" />
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Search by Student ID, name, email..."
                    className="w-full pl-9 pr-4 py-2 bg-[#14121B] border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-[#FFE878]"
                  />
                </div>

                <select
                  value={adminFilterLevel}
                  onChange={(e) => setAdminFilterLevel(e.target.value as any)}
                  className="px-3 py-2 bg-[#14121B] border border-stone-800 rounded-xl text-xs font-mono text-stone-300 focus:outline-none"
                >
                  <option value="all">All Levels</option>
                  <option value="full">Full Admin (L2)</option>
                  <option value="standard">Standard (L1)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAddAdminForm({
                    studentId: "",
                    name: "",
                    email: "",
                    permissionLevel: "standard",
                    active: true,
                  });
                  setIsAddAdminOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] hover:bg-[#520026] text-[#FFE878] border border-[#FFE878]/30 font-mono text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Plus className="size-4" />
                <span>Add Administrator</span>
              </button>
            </div>

            {/* Admins Table */}
            <div className="bg-[#14121B] border border-stone-800/80 rounded-2xl overflow-hidden">
              {loadingAdmins ? (
                <div className="p-8 text-center text-stone-400 font-mono text-xs">
                  Loading administrator directory...
                </div>
              ) : filteredAdmins.length === 0 ? (
                <div className="p-8 text-center text-stone-500 font-mono text-xs">
                  No administrators matched the query.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-stone-800 bg-[#191624] text-stone-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-5 py-3">Student ID</th>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Email Address</th>
                        <th className="px-5 py-3">Permission Level</th>
                        <th className="px-5 py-3">Access Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60">
                      {filteredAdmins.map((admin) => (
                        <tr key={admin.studentId} className="hover:bg-white/[0.02]">
                          <td className="px-5 py-3.5 font-bold text-white">
                            {admin.studentId}
                          </td>
                          <td className="px-5 py-3.5 text-stone-300 font-sans">
                            {admin.name}
                          </td>
                          <td className="px-5 py-3.5 text-stone-400">
                            {admin.email || "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            {admin.permissionLevel === "full" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#3B001B] text-[#FFE878] border border-[#FFE878]/30">
                                <Sparkles className="size-3 text-[#FFE878]" />
                                Full Admin (L2)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-800 text-stone-300 border border-stone-700">
                                Standard (L1)
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                admin.active
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  admin.active ? "bg-emerald-400" : "bg-rose-400"
                                }`}
                              />
                              {admin.active ? "Active" : "Revoked"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAdmin(admin);
                                  setEditAdminForm({
                                    studentId: admin.studentId,
                                    name: admin.name,
                                    email: admin.email,
                                    permissionLevel: admin.permissionLevel,
                                    active: admin.active,
                                  });
                                  setIsEditAdminOpen(true);
                                }}
                                className="p-1 rounded text-stone-400 hover:text-[#FFE878] hover:bg-stone-800"
                                title="Edit Admin"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAdmin(admin.studentId)}
                                className="p-1 rounded text-stone-400 hover:text-rose-400 hover:bg-rose-950/30"
                                title="Delete Admin"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: AUDIT HISTORY ────────────────────────── */}
        {activeTab === "audit" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Filter controls */}
            <div className="bg-[#14121B] border border-stone-800/80 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <input
                  type="text"
                  value={auditFilterAction}
                  onChange={(e) => setAuditFilterAction(e.target.value)}
                  placeholder="Filter by action (e.g. UPDATE_TRIP)..."
                  className="px-3 py-2 bg-[#1A1724] border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none font-mono"
                />

                <input
                  type="text"
                  value={auditFilterActor}
                  onChange={(e) => setAuditFilterActor(e.target.value)}
                  placeholder="Filter by actor (student ID or email)..."
                  className="px-3 py-2 bg-[#1A1724] border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none font-mono"
                />

                <select
                  value={auditFilterResult}
                  onChange={(e) => setAuditFilterResult(e.target.value as any)}
                  className="px-3 py-2 bg-[#1A1724] border border-stone-800 rounded-xl text-xs font-mono text-stone-300 focus:outline-none"
                >
                  <option value="all">All Results</option>
                  <option value="success">Success</option>
                  <option value="denied">Denied</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <button
                type="button"
                onClick={fetchAuditLogs}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 border border-stone-700/80 rounded-xl text-xs font-mono text-stone-300 hover:text-white"
              >
                <RefreshCw className="size-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-[#14121B] border border-stone-800/80 rounded-2xl overflow-hidden">
              {loadingAudit ? (
                <div className="p-8 text-center text-stone-400 font-mono text-xs">
                  Loading audit stream...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-stone-500 font-mono text-xs">
                  No audit logs matched the specified filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-stone-800 bg-[#191624] text-stone-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-5 py-3">Timestamp</th>
                        <th className="px-5 py-3">Action</th>
                        <th className="px-5 py-3">Actor Identity</th>
                        <th className="px-5 py-3">Resource Target</th>
                        <th className="px-5 py-3">Result</th>
                        <th className="px-5 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="px-5 py-3.5 text-stone-400 whitespace-nowrap">
                            {log.timestamp
                              ? new Date(log.timestamp).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-white">
                            {log.action}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="text-stone-300 font-bold">{log.actorStudentId}</div>
                            <div className="text-[10px] text-stone-500">{log.actorEmail}</div>
                          </td>
                          <td className="px-5 py-3.5 text-stone-400">
                            <span>{log.resourceType}</span>
                            {log.resourceId && (
                              <span className="text-stone-600 block text-[10px] truncate max-w-[120px]">
                                {log.resourceId}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                log.result === "success"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : log.result === "denied"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {log.result}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedLogMetadata(log)}
                              className="text-[11px] text-[#FFE878] hover:underline"
                            >
                              View Meta
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: MASTER CREDENTIALS ────────────────────── */}
        {activeTab === "credentials" && (
          <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#14121B] border border-stone-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-stone-800/80 pb-4">
                <div className="size-10 rounded-xl bg-[#3B001B] border border-[#FFE878]/30 flex items-center justify-center text-[#FFE878]">
                  <Key className="size-5" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                    Master Admin Access Credentials
                  </h3>
                  <p className="text-xs text-stone-400">
                    Controls credentials stored in systemConfig/adminAccess
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangeCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase font-bold text-stone-300 mb-1">
                    New Master Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={credForm.newUsername}
                    onChange={(e) =>
                      setCredForm((prev) => ({ ...prev, newUsername: e.target.value }))
                    }
                    placeholder="e.g. master_admin_2026"
                    className="w-full px-4 py-2.5 bg-[#1A1724] border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-[#FFE878] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase font-bold text-stone-300 mb-1">
                    New Master Key Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={credForm.newPassword}
                    onChange={(e) =>
                      setCredForm((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 bg-[#1A1724] border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-[#FFE878] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase font-bold text-stone-300 mb-1">
                    Confirm Master Key Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={credForm.confirmPassword}
                    onChange={(e) =>
                      setCredForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 bg-[#1A1724] border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-[#FFE878] font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingCreds}
                    className="w-full py-3 bg-[#3B001B] hover:bg-[#520026] text-[#FFE878] border border-[#FFE878]/30 font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updatingCreds && <Loader2 className="size-4 animate-spin" />}
                    <span>{updatingCreds ? "Updating..." : "Update Master Credentials"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD ADMIN MODAL ────────────────────────────────────── */}
      {isAddAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-[#14121B] border border-stone-700 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1C1828] px-6 py-4 border-b border-stone-700 flex items-center justify-between">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                Add Administrator
              </h3>
              <button
                type="button"
                onClick={() => setIsAddAdminOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4 font-mono text-xs">
              <div>
                <label className="block uppercase font-bold text-stone-300 mb-1">
                  Student ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addAdminForm.studentId}
                  onChange={(e) =>
                    setAddAdminForm((prev) => ({
                      ...prev,
                      studentId: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="23F2000835"
                  className="w-full px-3 py-2 bg-[#1A1724] border border-stone-700 rounded-xl text-white uppercase focus:outline-none focus:border-[#FFE878]"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-stone-300 mb-1">Name</label>
                <input
                  type="text"
                  value={addAdminForm.name}
                  onChange={(e) => setAddAdminForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Student name"
                  className="w-full px-3 py-2 bg-[#1A1724] border border-stone-700 rounded-xl text-white focus:outline-none focus:border-[#FFE878]"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-stone-300 mb-1">Email</label>
                <input
                  type="email"
                  value={addAdminForm.email}
                  onChange={(e) => setAddAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="student@study.iitm.ac.in"
                  className="w-full px-3 py-2 bg-[#1A1724] border border-stone-700 rounded-xl text-white focus:outline-none focus:border-[#FFE878]"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-stone-300 mb-1">
                  Permission Level
                </label>
                <select
                  value={addAdminForm.permissionLevel}
                  onChange={(e) =>
                    setAddAdminForm((prev) => ({
                      ...prev,
                      permissionLevel: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 bg-[#1A1724] border border-stone-700 rounded-xl text-white focus:outline-none focus:border-[#FFE878]"
                >
                  <option value="standard">Standard Admin (Level 1)</option>
                  <option value="full">Full Administrator (Level 2)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-900/60 rounded-xl border border-stone-800">
                <span className="text-stone-300 font-bold uppercase">Active Status</span>
                <input
                  type="checkbox"
                  checked={addAdminForm.active}
                  onChange={(e) =>
                    setAddAdminForm((prev) => ({ ...prev, active: e.target.checked }))
                  }
                  className="size-4 text-[#3B001B] rounded focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="px-3 py-2 text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewAdmin}
                  className="px-4 py-2 bg-[#3B001B] hover:bg-[#520026] text-[#FFE878] font-bold uppercase rounded-xl border border-[#FFE878]/30 transition-all disabled:opacity-50"
                >
                  {savingNewAdmin ? "Creating..." : "Save Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT ADMIN MODAL ────────────────────────────────────── */}
      {isEditAdminOpen && editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-[#14121B] border border-stone-700 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1C1828] px-6 py-4 border-b border-stone-700 flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  Edit Administrator
                </h3>
                <p className="text-[11px] font-mono text-stone-400">{editAdminForm.studentId}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditAdminOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleEditAdmin} className="p-6 space-y-4 font-mono text-xs">
              <div>
                <label className="block uppercase font-bold text-stone-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editAdminForm.name}
                  onChange={(e) =>
                    setEditAdminForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-[#1A1724] border border-stone-700 rounded-xl text-white focus:outline-none focus:border-[#FFE878]"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-stone-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editAdminForm.email}
                  onChange={(e) =>
                    setEditAdminForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-[#1A1724] border border-stone-700 rounded-xl text-white focus:outline-none focus:border-[#FFE878]"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-stone-300 mb-1">
                  Permission Level
                </label>
                <select
                  value={editAdminForm.permissionLevel}
                  onChange={(e) =>
                    setEditAdminForm((prev) => ({
                      ...prev,
                      permissionLevel: e.target.value as any,
                    }))
                  }
                  className="w-full px-3 py-2 bg-[#1A1724] border border-stone-700 rounded-xl text-white focus:outline-none focus:border-[#FFE878]"
                >
                  <option value="standard">Standard Admin (Level 1)</option>
                  <option value="full">Full Administrator (Level 2)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-900/60 rounded-xl border border-stone-800">
                <span className="text-stone-300 font-bold uppercase">Active Access</span>
                <input
                  type="checkbox"
                  checked={editAdminForm.active}
                  onChange={(e) =>
                    setEditAdminForm((prev) => ({ ...prev, active: e.target.checked }))
                  }
                  className="size-4 text-[#3B001B] rounded focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsEditAdminOpen(false)}
                  className="px-3 py-2 text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditAdmin}
                  className="px-4 py-2 bg-[#3B001B] hover:bg-[#520026] text-[#FFE878] font-bold uppercase rounded-xl border border-[#FFE878]/30 transition-all disabled:opacity-50"
                >
                  {savingEditAdmin ? "Saving..." : "Update Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── METADATA INSPECT MODAL ──────────────────────────────── */}
      {selectedLogMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-[#14121B] border border-stone-700 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1C1828] px-6 py-4 border-b border-stone-700 flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  Audit Record Metadata
                </h3>
                <p className="text-[11px] font-mono text-stone-400">
                  {selectedLogMetadata.action} • {selectedLogMetadata.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogMetadata(null)}
                className="text-stone-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 font-mono text-xs max-h-[60vh] overflow-y-auto">
              <div className="bg-[#1A1724] p-4 rounded-xl border border-stone-800 overflow-x-auto">
                <pre className="text-stone-300 text-[11px] leading-relaxed">
                  {JSON.stringify(selectedLogMetadata.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-stone-900/60 border-t border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogMetadata(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
