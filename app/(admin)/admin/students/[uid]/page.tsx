"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  GraduationCap,
  ArrowLeft,
  Calendar,
  Compass,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Home,
  User,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  FileText,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Users,
  Award,
  RefreshCw,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
  AdminStatCard,
  AdminBadge,
  AdminLoadingState,
  AdminEmptyState,
} from "@/components/admin";
import { StudentFullProfileWithHistory, StudentTripHistoryItem } from "@/lib/studentDirectory";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const uid = typeof params?.uid === "string" ? params.uid : Array.isArray(params?.uid) ? params.uid[0] : "";

  const [data, setData] = useState<StudentFullProfileWithHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingVerification, setUpdatingVerification] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "upcoming">("all");

  const fetchProfile = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/students/${uid}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Student profile not found.");
          router.push("/admin/students");
          return;
        }
        throw new Error("Failed to load student profile");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      toast.error(err.message || "Failed to load student details");
    } finally {
      setLoading(false);
    }
  }, [uid, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleToggleVerification = async () => {
    if (!data) return;
    const current = data.student.studentIdVerified;
    const nextState = !current;

    try {
      setUpdatingVerification(true);
      const res = await fetch(`/api/admin/students/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIdVerified: nextState }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Failed to update verification status");
      }

      toast.success(nextState ? "Student verified successfully!" : "Student marked as not verified.");
      // Optimistic update
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          student: {
            ...prev.student,
            studentIdVerified: nextState,
          },
        };
      });
    } catch (err: any) {
      toast.error(err.message || "Could not update verification status.");
    } finally {
      setUpdatingVerification(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/admin/students" className="hover:text-stone-900 inline-flex items-center gap-1">
            <ArrowLeft className="size-4" /> Back to Students
          </Link>
        </div>
        <AdminLoadingState type="cards" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <AdminEmptyState
          title="Student Not Found"
          description="The requested student profile does not exist in the canonical directory."
          action={
            <button
              type="button"
              onClick={() => router.push("/admin/students")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
            >
              Return to Directory
            </button>
          }
        />
      </div>
    );
  }

  const { student, trips, upcomingTrips, completedTrips, stats } = data;
  const initial = (student.name || "S").charAt(0).toUpperCase();

  const displayedTrips =
    activeTab === "completed"
      ? completedTrips
      : activeTab === "upcoming"
      ? upcomingTrips
      : trips;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Students Directory</span>
        </Link>

        <button
          onClick={fetchProfile}
          className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* Header Profile Hero Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar & Key Details */}
          <div className="flex items-start sm:items-center gap-5">
            <div className="size-16 sm:size-20 rounded-2xl bg-[#3B001B] text-amber-200 font-bold text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-sm border-2 border-amber-400/30">
              {initial}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  {student.name}
                </h1>
                {student.studentIdVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="size-3.5" />
                    VERIFIED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <ShieldAlert className="size-3.5" />
                    NOT VERIFIED
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-stone-600">
                <span className="font-mono font-medium text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                  {student.studentId || "No Roll Number"}
                </span>
                <span className="flex items-center gap-1 text-stone-500">
                  <Mail className="size-3.5 text-stone-400" />
                  {student.email}
                </span>
                <span className="font-mono text-[11px] text-stone-400">
                  UID: {student.uid}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {student.studentIdUrl && (
              <a
                href={student.studentIdUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 hover:bg-stone-50 text-xs sm:text-sm font-semibold transition-all shadow-sm"
              >
                <FileText className="size-4 text-[#3B001B]" />
                <span>View Student ID Card</span>
                <ExternalLink className="size-3.5 text-stone-400" />
              </a>
            )}

            <button
              onClick={handleToggleVerification}
              disabled={updatingVerification}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                student.studentIdVerified
                  ? "bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10"
              }`}
            >
              {updatingVerification ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : student.studentIdVerified ? (
                <XCircle className="size-4" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              <span>
                {student.studentIdVerified ? "Revoke Verification" : "Mark as Verified"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Total Expeditions"
          value={stats.totalTrips}
          icon={Compass}
          subtitle="All registered trips"
          variant="maroon"
        />
        <AdminStatCard
          title="Approved Trips"
          value={stats.approvedTrips}
          icon={CheckCircle2}
          subtitle="Confirmed participations"
          variant="emerald"
        />
        <AdminStatCard
          title="Completed Trips"
          value={stats.completedTrips}
          icon={Award}
          subtitle="Past journeys attended"
          variant="blue"
        />
        <AdminStatCard
          title="First Associated"
          value={
            stats.firstAssociatedDate
              ? new Date(stats.firstAssociatedDate).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                })
              : "—"
          }
          icon={Calendar}
          subtitle={`Last trip: ${
            stats.lastTripDate
              ? new Date(stats.lastTripDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "None yet"
          }`}
          variant="amber"
        />
      </div>

      {/* Main Grid: Profile Info & Trip History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Canonical Student Profile (1 Col) */}
        <div className="space-y-6">
          <AdminCard
            title="Student Profile"
            subtitle="Canonical identity from students/{uid}"
            icon={User}
          >
            <div className="divide-y divide-stone-100 text-xs sm:text-sm">
              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium">Full Name</span>
                <span className="text-stone-900 font-semibold text-right">{student.name}</span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium">Student / Roll ID</span>
                <span className="font-mono text-stone-900 font-medium text-right">
                  {student.studentId || "—"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium">IITM Email</span>
                <span className="text-stone-900 font-medium text-right break-all">
                  {student.email}
                </span>
              </div>

              <div className="py-3 flex justify-between items-center gap-3">
                <span className="text-stone-500 font-medium flex items-center gap-1.5">
                  <FileText className="size-3.5 text-stone-400" /> Student ID Card
                </span>
                {student.studentIdUrl ? (
                  <a
                    href={student.studentIdUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-xs text-[#3B001B] hover:underline bg-[#3B001B]/5 px-2.5 py-1 rounded-lg border border-[#3B001B]/20"
                  >
                    <span>View Submitted Card</span>
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span className="text-stone-400 italic text-xs">No copy uploaded</span>
                )}
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium">Gender</span>
                <span className="capitalize text-stone-900 font-medium text-right">
                  {student.gender}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium">Date of Birth</span>
                <span className="text-stone-900 font-medium text-right">
                  {student.dob || "—"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium flex items-center gap-1.5">
                  <Phone className="size-3.5 text-stone-400" /> Phone
                </span>
                <span className="text-stone-900 font-medium text-right">
                  {student.phone ? (
                    <a href={`tel:${student.phone}`} className="hover:underline text-[#3B001B]">
                      {student.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium flex items-center gap-1.5">
                  <MessageCircle className="size-3.5 text-emerald-500" /> WhatsApp
                </span>
                <span className="text-stone-900 font-medium text-right">
                  {student.whatsapp ? (
                    <a
                      href={`https://wa.me/${student.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-emerald-700 font-medium inline-flex items-center gap-1"
                    >
                      {student.whatsapp}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-stone-400" /> State
                </span>
                <span className="text-stone-900 font-medium text-right">
                  {student.state || "—"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-stone-400" /> City / District
                </span>
                <span className="text-stone-900 font-medium text-right">
                  {student.cityDistrict || "—"}
                </span>
              </div>

              {student.residence && (
                <div className="py-3 flex justify-between gap-3">
                  <span className="text-stone-500 font-medium flex items-center gap-1.5">
                    <Home className="size-3.5 text-stone-400" /> Residence
                  </span>
                  <span className="text-stone-900 font-medium text-right">
                    {student.residence}
                  </span>
                </div>
              )}

              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium">Joined Boundless</span>
                <span className="text-stone-900 font-medium text-right">
                  {student.createdAt
                    ? new Date(student.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>

              <div className="py-3 flex justify-between gap-3">
                <span className="text-stone-500 font-medium">Last Profile Update</span>
                <span className="text-stone-900 font-medium text-right">
                  {student.updatedAt
                    ? new Date(student.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Right Column: Permanent Trip History (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <AdminCard
            title="Permanent Boundless Trip History"
            subtitle="Complete record of registered, approved, and completed society adventures"
            icon={Compass}
            headerActions={
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === "all"
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  All ({trips.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("completed")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === "completed"
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Completed ({completedTrips.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("upcoming")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === "upcoming"
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Upcoming ({upcomingTrips.length})
                </button>
              </div>
            }
          >
            {displayedTrips.length === 0 ? (
              <AdminEmptyState
                title="No Trips Recorded"
                description={
                  activeTab === "completed"
                    ? "This student has not yet participated in any completed expeditions."
                    : activeTab === "upcoming"
                    ? "This student is not currently registered for any upcoming trips."
                    : "This student has not registered for any Boundless trips yet."
                }
              />
            ) : (
              <div className="space-y-4">
                {displayedTrips.map((item) => {
                  const targetTripUrl = item.isCompleted
                    ? `/admin/previous-trips/${item.tripId}`
                    : `/admin/trip/view/${item.tripId}`;

                  return (
                    <div
                      key={item.registrationId}
                      className="group bg-white rounded-xl border border-stone-200 p-5 hover:border-[#3B001B]/40 hover:shadow-sm transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        {/* Trip & Route Details */}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={targetTripUrl}
                              className="text-base font-bold text-stone-900 group-hover:text-[#3B001B] transition-colors inline-flex items-center gap-1.5"
                            >
                              <span>{item.tripName}</span>
                              <ExternalLink className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>

                            {/* Completed Status */}
                            {item.isCompleted ? (
                              <AdminBadge status="completed" size="sm">
                                Completed
                              </AdminBadge>
                            ) : (
                              <AdminBadge status="open" size="sm">
                                Upcoming
                              </AdminBadge>
                            )}

                            {/* Registration Approval Status */}
                            <AdminBadge status={item.registrationStatus} size="sm" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-stone-600">
                            {item.destination && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="size-3.5 text-stone-400 shrink-0" />
                                <span className="font-medium text-stone-800">
                                  {item.destination}
                                </span>
                              </div>
                            )}

                            {(item.startDate || item.endDate) && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="size-3.5 text-stone-400 shrink-0" />
                                <span>
                                  {item.startDate}
                                  {item.endDate && item.endDate !== item.startDate
                                    ? ` – ${item.endDate}`
                                    : ""}
                                </span>
                              </div>
                            )}

                            {item.registeredAt && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-stone-400 shrink-0" />
                                <span>
                                  Registered:{" "}
                                  <strong className="text-stone-700">
                                    {new Date(item.registeredAt).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </strong>
                                </span>
                              </div>
                            )}

                            {item.approvedAt && (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                <span>
                                  Approved:{" "}
                                  <strong className="text-stone-700">
                                    {new Date(item.approvedAt).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </strong>
                                </span>
                              </div>
                            )}

                            {item.coordinatorSummary && (
                              <div className="flex items-center gap-1.5 col-span-full">
                                <Users className="size-3.5 text-stone-400 shrink-0" />
                                <span>
                                  Coordinator:{" "}
                                  <strong className="text-stone-800">
                                    {item.coordinatorSummary}
                                  </strong>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* ID Document or Issue notice if present */}
                          {(item.studentIdUrl || item.issueText) && (
                            <div className="pt-2 flex flex-wrap items-center gap-3">
                              {item.studentIdUrl && (
                                <a
                                  href={item.studentIdUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3B001B] hover:underline bg-stone-50 px-2 py-1 rounded border border-stone-200"
                                >
                                  <FileText className="size-3" />
                                  View Submitted ID Card
                                  <ExternalLink className="size-2.5" />
                                </a>
                              )}
                              {item.issueText && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                  <AlertCircle className="size-3" />
                                  Note: {item.issueText}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: Quick Action Link */}
                        <div className="self-end sm:self-center shrink-0">
                          <Link
                            href={targetTripUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                          >
                            <span>View Trip</span>
                            <ChevronRight className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
