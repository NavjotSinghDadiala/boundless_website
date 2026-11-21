"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  DownloadIcon,
  CheckCircle2Icon,
  RotateCcwIcon,
  UsersIcon,
  UserCheckIcon,
  UserXIcon,
  CalendarIcon,
  MapPinIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatGrid,
  AdminFilterBar,
  AdminBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminTable,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
  AdminMobileCardList,
  AdminMobileCard,
} from "@/components/admin";

interface Participant {
  id: string;
  meetupId: string;
  campaignId: string | null;
  uid: string;
  studentName: string;
  studentEmail: string;
  studentId: string;
  phone: string;
  status: "registered" | "cancelled";
  attended: boolean;
  checkedInAt: string | null;
  checkedInBy: string | null;
  registeredAt: string | null;
  cancelledAt: string | null;
}

interface MeetupInfo {
  id: string;
  cityName: string;
  title?: string;
  meetupType: "standalone" | "campaign_city";
  campaignId: string | null;
  status: string;
  eventDate?: string;
  startTime?: string;
  venue?: string;
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
}

interface CampaignInfo {
  id: string;
  title: string;
  edition?: string;
}

function escapeCsvCell(val: unknown): string {
  const str = val === null || val === undefined ? "" : String(val);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function CityMeetupParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const meetupId = typeof params?.id === "string" ? params.id : "";

  const [meetup, setMeetup] = useState<MeetupInfo | null>(null);
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "registered" | "checked_in" | "not_checked_in" | "cancelled"
  >("all");
  const [mutatingUid, setMutatingUid] = useState<string | null>(null);

  const loadParticipants = useCallback(async () => {
    if (!meetupId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/city-meetups/${encodeURIComponent(meetupId)}/participants`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to load participants.");
      }
      setMeetup(data.meetup || null);
      setCampaign(data.campaign || null);
      setParticipants(Array.isArray(data.participants) ? data.participants : []);
    } catch (err: any) {
      setError(err.message || "Failed to load participants.");
      toast.error(err.message || "Failed to load participants.");
    } finally {
      setLoading(false);
    }
  }, [meetupId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const counts = useMemo(() => {
    const registered = participants.filter((p) => p.status === "registered").length;
    const cancelled = participants.filter((p) => p.status === "cancelled").length;
    const checkedIn = participants.filter(
      (p) => p.status === "registered" && p.attended
    ).length;
    return {
      registered,
      cancelled,
      checkedIn,
      capacity: meetup?.capacity || 0,
    };
  }, [participants, meetup]);

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return participants.filter((p) => {
      if (filterStatus === "registered" && p.status !== "registered") return false;
      if (filterStatus === "cancelled" && p.status !== "cancelled") return false;
      if (filterStatus === "checked_in" && !(p.status === "registered" && p.attended))
        return false;
      if (
        filterStatus === "not_checked_in" &&
        !(p.status === "registered" && !p.attended)
      )
        return false;

      if (!q) return true;
      return (
        p.studentName.toLowerCase().includes(q) ||
        p.studentEmail.toLowerCase().includes(q) ||
        p.studentId.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q)
      );
    });
  }, [participants, search, filterStatus]);

  const handleToggleAttendance = async (participant: Participant, nextAttended: boolean) => {
    if (participant.status !== "registered") {
      toast.error("Cannot update attendance for a cancelled registration.");
      return;
    }
    setMutatingUid(participant.uid);
    try {
      const res = await fetch(
        `/api/admin/city-meetups/${encodeURIComponent(meetupId)}/participants`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: participant.uid, attended: nextAttended }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update attendance.");
      }

      setParticipants((prev) =>
        prev.map((item) =>
          item.uid === participant.uid
            ? {
                ...item,
                attended: data.registration?.attended ?? nextAttended,
                checkedInAt: data.registration?.checkedInAt ?? null,
                checkedInBy: data.registration?.checkedInBy ?? null,
              }
            : item
        )
      );

      if (meetup && typeof data.checkedInCount === "number") {
        setMeetup({ ...meetup, checkedInCount: data.checkedInCount });
      }

      toast.success(
        nextAttended
          ? `${participant.studentName || participant.studentEmail} marked present.`
          : `Check-in reversed for ${participant.studentName || participant.studentEmail}.`
      );
    } catch (err: any) {
      toast.error(err.message || "Could not update attendance.");
    } finally {
      setMutatingUid(null);
    }
  };

  const handleExportCsv = () => {
    if (filteredParticipants.length === 0) {
      toast.error("No participants to export.");
      return;
    }
    const headers = [
      "Student Name",
      "Email",
      "Student ID",
      "Phone",
      "Registration Status",
      "Attended",
      "Checked In At",
      "Checked In By",
      "Registered At",
    ];
    const rows = filteredParticipants.map((p) => [
      p.studentName,
      p.studentEmail,
      p.studentId,
      p.phone,
      p.status,
      p.attended ? "Present" : "Not Checked In",
      p.checkedInAt || "",
      p.checkedInBy || "",
      p.registeredAt || "",
    ]);

    const csv = [
      headers.map(escapeCsvCell).join(","),
      ...rows.map((row) => row.map(escapeCsvCell).join(",")),
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeCity = (meetup?.cityName || meetupId).replace(/[^a-zA-Z0-9_-]/g, "_");
    a.href = url;
    a.download = `meetup-participants-${safeCity}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredParticipants.length} participant(s) to CSV.`);
  };

  const backHref =
    meetup?.campaignId
      ? `/admin/city-meetups/campaigns/${meetup.campaignId}`
      : "/admin/city-meetups";

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <AdminLoadingState text="Loading participant roster..." />
      </div>
    );
  }

  if (error || !meetup) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Link
          href="/admin/city-meetups"
          className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to City Meetups
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-rose-900">
                Could not load participants
              </h2>
              <p className="text-sm text-rose-700 mt-1">
                {error || "City meetup not found."}
              </p>
            </div>
          </div>
          <button
            onClick={loadParticipants}
            className="min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(backHref)}
          className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 min-h-[40px]"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {campaign ? `Back to ${campaign.title}` : "Back to City Meetups"}
        </button>
      </div>

      <AdminPageHeader
        title={`${meetup.cityName} — Participants`}
        description={
          campaign
            ? `Part of ${campaign.title}${campaign.edition ? ` (${campaign.edition})` : ""}`
            : meetup.title || "Standalone City Meetup Roster & Attendance"
        }
        primaryAction={
          <button
            onClick={handleExportCsv}
            className="min-h-[44px] px-4 rounded-xl bg-[#3B001B] hover:bg-[#520026] text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </button>
        }
        secondaryActions={
          <button
            onClick={loadParticipants}
            className="min-h-[44px] px-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium inline-flex items-center gap-2"
          >
            <RefreshCwIcon className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      {/* Event Context Strip */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 flex flex-wrap items-center gap-4 text-sm text-stone-700 shadow-sm">
        {meetup.eventDate && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-[#3B001B]" />
            {meetup.eventDate}
            {meetup.startTime ? ` • ${meetup.startTime}` : ""}
          </span>
        )}
        {meetup.venue && (
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="w-4 h-4 text-[#3B001B]" />
            {meetup.venue}
          </span>
        )}
        <AdminBadge
          variant={
            meetup.status === "published"
              ? "success"
              : meetup.status === "cancelled"
              ? "danger"
              : meetup.status === "completed"
              ? "info"
              : "neutral"
          }
        >
          {meetup.status}
        </AdminBadge>
      </div>

      {/* KPI Cards */}
      <AdminStatGrid>
        <AdminStatCard
          title="Active Registered"
          value={
            counts.capacity > 0
              ? `${counts.registered} / ${counts.capacity}`
              : String(counts.registered)
          }
          icon={UsersIcon}
          variant="amber"
        />
        <AdminStatCard
          title="Checked In"
          value={String(counts.checkedIn)}
          subtitle={
            counts.registered > 0
              ? `${Math.round((counts.checkedIn / counts.registered) * 100)}% attendance`
              : "0% attendance"
          }
          icon={UserCheckIcon}
          variant="emerald"
        />
        <AdminStatCard
          title="Not Checked In"
          value={String(Math.max(0, counts.registered - counts.checkedIn))}
          icon={UsersIcon}
          variant="blue"
        />
        <AdminStatCard
          title="Cancelled"
          value={String(counts.cancelled)}
          icon={UserXIcon}
          variant="maroon"
        />
      </AdminStatGrid>

      {/* Search & Filter */}
      <AdminFilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, IITM email, student ID, or phone..."
        totalCount={filteredParticipants.length}
        totalLabel="participants"
        activeFilterCount={filterStatus !== "all" ? 1 : 0}
        onReset={() => {
          setSearch("");
          setFilterStatus("all");
        }}
      >
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-800"
        >
          <option value="all">All Participants ({participants.length})</option>
          <option value="registered">Registered ({counts.registered})</option>
          <option value="checked_in">Checked In ({counts.checkedIn})</option>
          <option value="not_checked_in">
            Not Checked In ({Math.max(0, counts.registered - counts.checkedIn)})
          </option>
          <option value="cancelled">Cancelled ({counts.cancelled})</option>
        </select>
      </AdminFilterBar>

      {/* Empty State */}
      {filteredParticipants.length === 0 ? (
        <AdminEmptyState
          title="No participants match"
          description={
            participants.length === 0
              ? "No students have registered for this city meetup yet."
              : "Try adjusting your search or filter criteria."
          }
        />
      ) : (
        <>
          {/* Mobile Card List */}
          <div className="md:hidden">
            <AdminMobileCardList>
              {filteredParticipants.map((p) => (
                <AdminMobileCard
                  key={p.id}
                  title={p.studentName || "Unnamed Student"}
                  subtitle={p.studentEmail}
                  badge={
                    p.status === "cancelled" ? (
                      <AdminBadge variant="danger">Cancelled</AdminBadge>
                    ) : p.attended ? (
                      <AdminBadge variant="success">Present</AdminBadge>
                    ) : (
                      <AdminBadge variant="info">Registered</AdminBadge>
                    )
                  }
                  fields={[
                    { label: "Student ID", value: p.studentId || "—" },
                    { label: "Phone", value: p.phone || "—" },
                    { label: "Registered", value: formatDateTime(p.registeredAt) },
                    ...(p.attended
                      ? [
                          {
                            label: "Checked In",
                            value: `${formatDateTime(p.checkedInAt)}${
                              p.checkedInBy ? ` by ${p.checkedInBy}` : ""
                            }`,
                          },
                        ]
                      : []),
                  ]}
                      actions={
                        p.status === "registered" ? (
                          p.attended ? (
                            <button
                              disabled={mutatingUid === p.uid}
                              onClick={() => handleToggleAttendance(p, false)}
                              className="w-full min-h-[48px] rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <RotateCcwIcon className="w-4 h-4" />
                              {mutatingUid === p.uid ? "Updating..." : "Reverse Check-In"}
                            </button>
                          ) : (
                            <button
                              disabled={mutatingUid === p.uid}
                              onClick={() => handleToggleAttendance(p, true)}
                              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <CheckCircle2Icon className="w-4 h-4" />
                              {mutatingUid === p.uid ? "Updating..." : "Mark Present"}
                            </button>
                          )
                        ) : null
                      }
                />
              ))}
            </AdminMobileCardList>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <AdminTable>
              <AdminTableHead>
                <AdminTableRow>
                  <AdminTableHeaderCell>Student</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Student ID / Phone</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Registration</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Attendance</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">Action</AdminTableHeaderCell>
                </AdminTableRow>
              </AdminTableHead>
              <AdminTableBody>
                {filteredParticipants.map((p) => (
                  <AdminTableRow key={p.id}>
                    <AdminTableCell>
                      <div className="font-semibold text-stone-900">
                        {p.studentName || "Unnamed Student"}
                      </div>
                      <div className="text-xs text-stone-500">{p.studentEmail}</div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="text-sm text-stone-800">{p.studentId || "—"}</div>
                      <div className="text-xs text-stone-500">{p.phone || "—"}</div>
                    </AdminTableCell>
                    <AdminTableCell>
                      {p.status === "registered" ? (
                        <AdminBadge variant="info">Registered</AdminBadge>
                      ) : (
                        <AdminBadge variant="danger">Cancelled</AdminBadge>
                      )}
                      <div className="text-xs text-stone-500 mt-1">
                        {formatDateTime(p.registeredAt)}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      {p.status === "cancelled" ? (
                        <span className="text-xs text-stone-400">—</span>
                      ) : p.attended ? (
                        <div>
                          <AdminBadge variant="success">Present</AdminBadge>
                          <div className="text-xs text-stone-500 mt-1">
                            {formatDateTime(p.checkedInAt)}
                            {p.checkedInBy ? ` • ${p.checkedInBy}` : ""}
                          </div>
                        </div>
                      ) : (
                        <AdminBadge variant="neutral">Not Checked In</AdminBadge>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      {p.status === "registered" ? (
                        p.attended ? (
                          <button
                            disabled={mutatingUid === p.uid}
                            onClick={() => handleToggleAttendance(p, false)}
                            className="min-h-[38px] px-3 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <RotateCcwIcon className="w-3.5 h-3.5" />
                            {mutatingUid === p.uid ? "Saving..." : "Reverse"}
                          </button>
                        ) : (
                          <button
                            disabled={mutatingUid === p.uid}
                            onClick={() => handleToggleAttendance(p, true)}
                            className="min-h-[38px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2Icon className="w-3.5 h-3.5" />
                            {mutatingUid === p.uid ? "Saving..." : "Mark Present"}
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-stone-400">Inactive</span>
                      )}
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </div>
        </>
      )}
    </div>
  );
}
