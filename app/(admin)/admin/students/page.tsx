"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  UserX,
  Compass,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  FileText,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
  AdminStatCard,
  AdminBadge,
  AdminEmptyState,
  AdminLoadingState,
  AdminTable,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
  AdminFilterBar,
  AdminMobileCardList,
  AdminMobileCard,
} from "@/components/admin";
import { StudentDirectoryItem } from "@/lib/studentDirectory";

export default function StudentsDirectoryPage() {
  const router = useRouter();

  // Data states
  const [students, setStudents] = useState<StudentDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination & Stats
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [stats, setStats] = useState({
    totalStudents: 0,
    verifiedStudents: 0,
    unverifiedStudents: 0,
    studentsWithTrips: 0,
    studentsWithCompletedTrips: 0,
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "not_verified">("all");
  const [tripFilter, setTripFilter] = useState<"all" | "yes" | "no">("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "female" | "male" | "other">("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "studentId" | "tripCount" | "lastTripDate">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch student directory data
  const fetchStudents = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const queryParams = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sortBy,
        sortOrder,
      });

      if (debouncedSearch) queryParams.set("search", debouncedSearch);
      if (verificationFilter !== "all") queryParams.set("verification", verificationFilter);
      if (tripFilter !== "all") queryParams.set("hasCompletedTrips", tripFilter);
      if (genderFilter !== "all") queryParams.set("gender", genderFilter);

      const res = await fetch(`/api/admin/students?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch student directory");
      }

      const data = await res.json();
      setStudents(data.students || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load students");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, verificationFilter, tripFilter, genderFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setVerificationFilter("all");
    setTripFilter("all");
    setGenderFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const activeFilterCount =
    (verificationFilter !== "all" ? 1 : 0) +
    (tripFilter !== "all" ? 1 : 0) +
    (genderFilter !== "all" ? 1 : 0) +
    (sortBy !== "createdAt" || sortOrder !== "desc" ? 1 : 0);

  return (
    <div className="space-y-5 md:space-y-6 p-4 sm:p-6 lg:p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="Student Directory & Trip History"
        description="The canonical registry of verified IIT Madras students associated with Boundless, tracking lifetime participation and expedition milestones."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Students" },
        ]}
        primaryAction={
          <button
            type="button"
            onClick={() => fetchStudents(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs sm:text-sm font-semibold hover:bg-stone-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-[#3B001B]" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh Directory"}</span>
          </button>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <AdminStatCard
          title="Total Associated"
          value={stats.totalStudents}
          icon={Users}
          variant="maroon"
        />
        <AdminStatCard
          title="Verified Students"
          value={stats.verifiedStudents}
          icon={UserCheck}
          variant="emerald"
        />
        <AdminStatCard
          title="Unverified"
          value={stats.unverifiedStudents}
          icon={UserX}
          variant="amber"
        />
        <AdminStatCard
          title="Students With Trips"
          value={stats.studentsWithTrips}
          icon={Compass}
          variant="blue"
        />
        <AdminStatCard
          title="Completed Expeditions"
          value={stats.studentsWithCompletedTrips}
          icon={CheckCircle2}
          variant="maroon"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by student name, roll number, or @iitm.ac.in email..."
        totalCount={pagination.total}
        totalLabel="students matched"
        activeFilterCount={activeFilterCount}
        onReset={handleResetFilters}
      >
        {/* Verification Filter */}
        <select
          value={verificationFilter}
          onChange={(e) => {
            setVerificationFilter(e.target.value as any);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="text-xs sm:text-sm rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
        >
          <option value="all">All Verifications</option>
          <option value="verified">Verified Only ✅</option>
          <option value="not_verified">Unverified ⏳</option>
        </select>

        {/* Trips Status Filter */}
        <select
          value={tripFilter}
          onChange={(e) => {
            setTripFilter(e.target.value as any);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="text-xs sm:text-sm rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
        >
          <option value="all">All Participation</option>
          <option value="yes">Completed Trips</option>
          <option value="no">No Completed Trips</option>
        </select>

        {/* Gender Filter */}
        <select
          value={genderFilter}
          onChange={(e) => {
            setGenderFilter(e.target.value as any);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="text-xs sm:text-sm rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
        >
          <option value="all">All Genders</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>

        {/* Sort Dropdown */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split("-") as [any, any];
            setSortBy(field);
            setSortOrder(order);
          }}
          className="text-xs sm:text-sm rounded-lg border border-stone-200 bg-stone-50/50 py-2 px-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
        >
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="studentId-asc">Roll No (Asc)</option>
          <option value="tripCount-desc">Most Trips</option>
          <option value="lastTripDate-desc">Recent Trip</option>
        </select>
      </AdminFilterBar>

      {/* Main Students Table */}
      <AdminCard noPadding>
        {loading ? (
          <AdminLoadingState type="table" rows={6} />
        ) : students.length === 0 ? (
          <AdminEmptyState
            title="No Students Found"
            description={
              searchQuery || verificationFilter !== "all"
                ? "No student profiles match your current search and filter criteria."
                : "No students registered in the canonical directory yet."
            }
            action={
              searchQuery || verificationFilter !== "all" ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Clear Filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <AdminTable
            mobileContent={
              <div className="p-3.5">
                <AdminMobileCardList>
                  {students.map((student) => {
                    const initial = (student.name || "S").charAt(0).toUpperCase();
                    const location = [student.cityDistrict, student.state]
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <AdminMobileCard
                        key={student.uid}
                        onClick={() => router.push(`/admin/students/${student.uid}`)}
                        leading={
                          <div className="size-10 rounded-full bg-[#3B001B]/10 text-[#3B001B] flex items-center justify-center font-bold text-base border border-[#3B001B]/20">
                            {initial}
                          </div>
                        }
                        title={student.name}
                        subtitle={
                          <span className="text-sm text-stone-600 break-all">
                            {student.email}
                          </span>
                        }
                        badge={
                          student.studentIdVerified ? (
                            <AdminBadge variant="success" size="sm">
                              <CheckCircle2 className="size-3 mr-1" />
                              VERIFIED
                            </AdminBadge>
                          ) : (
                            <AdminBadge variant="warning" size="sm">
                              <Clock className="size-3 mr-1" />
                              PENDING
                            </AdminBadge>
                          )
                        }
                        fields={[
                          {
                            label: "Roll No",
                            value: (
                              <span className="font-mono font-semibold">
                                {student.studentId || "—"}
                              </span>
                            ),
                          },
                          {
                            label: "Trips",
                            value: `${student.tripCount} ${
                              student.tripCount === 1 ? "Trip" : "Trips"
                            }`,
                          },
                          {
                            label: "Gender",
                            value: student.gender
                              ? student.gender.charAt(0).toUpperCase() +
                                student.gender.slice(1)
                              : "—",
                          },
                          {
                            label: "Location",
                            value: location || "—",
                          },
                        ]}
                        detailsLabel="More details"
                        details={
                          <div className="space-y-1.5 text-sm text-stone-700">
                            <p>
                              <strong className="text-stone-900">Last Expedition:</strong>{" "}
                              {student.lastTrip ? student.lastTrip.tripName : "None yet"}
                            </p>
                            <p>
                              <strong className="text-stone-900">Joined:</strong>{" "}
                              {formatDate(student.createdAt)}
                            </p>
                            <p className="font-mono text-xs text-stone-500 break-all">
                              UID: {student.uid}
                            </p>
                          </div>
                        }
                        actions={
                          <div className="grid grid-cols-2 gap-2.5 w-full">
                            {student.studentIdUrl ? (
                              <a
                                href={student.studentIdUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[48px] px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm font-semibold flex items-center justify-center gap-1.5"
                              >
                                <FileText className="size-4 text-[#3B001B]" />
                                <span>View ID</span>
                              </a>
                            ) : (
                              <span className="min-h-[48px] px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100 text-stone-400 text-sm font-medium flex items-center justify-center gap-1.5">
                                <FileText className="size-4" />
                                <span>No ID</span>
                              </span>
                            )}
                            <Link
                              href={`/admin/students/${student.uid}`}
                              className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#3B001B] text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <span>Profile</span>
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </div>
                        }
                      />
                    );
                  })}
                </AdminMobileCardList>
              </div>
            }
          >
            <AdminTableHead>
                <AdminTableRow>
                  <AdminTableHeaderCell>Student</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Student ID / Roll</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Email</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Gender</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Location</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Verification</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Trips</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Last Expedition</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Joined</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
                </AdminTableRow>
              </AdminTableHead>
              <AdminTableBody>
                {students.map((student) => {
                  const initial = (student.name || "S").charAt(0).toUpperCase();

                  return (
                    <AdminTableRow
                      key={student.uid}
                      className="cursor-pointer hover:bg-amber-50/40 transition-colors group"
                      onClick={() => router.push(`/admin/students/${student.uid}`)}
                    >
                      {/* Name & Avatar */}
                      <AdminTableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-[#3B001B]/10 text-[#3B001B] flex items-center justify-center font-bold text-sm shrink-0 border border-[#3B001B]/20">
                            {initial}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-stone-900 group-hover:text-[#3B001B] transition-colors truncate">
                              {student.name}
                            </span>
                            <span className="text-[11px] text-stone-400 font-mono">
                              UID: {student.uid.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </AdminTableCell>

                      {/* Student ID */}
                      <AdminTableCell>
                        <span className="font-mono text-xs font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200/80">
                          {student.studentId || "—"}
                        </span>
                      </AdminTableCell>

                      {/* Email */}
                      <AdminTableCell>
                        <span className="text-xs text-stone-600 truncate max-w-[180px] block" title={student.email}>
                          {student.email}
                        </span>
                      </AdminTableCell>

                      {/* Gender */}
                      <AdminTableCell>
                        <AdminBadge variant="neutral" size="sm">
                          {student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : "—"}
                        </AdminBadge>
                      </AdminTableCell>

                      {/* Location */}
                      <AdminTableCell>
                        <div className="flex items-center gap-1.5 text-xs text-stone-600">
                          {student.cityDistrict || student.state ? (
                            <>
                              <MapPin className="size-3 text-stone-400 shrink-0" />
                              <span className="truncate max-w-[120px]">
                                {[student.cityDistrict, student.state].filter(Boolean).join(", ")}
                              </span>
                            </>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </div>
                      </AdminTableCell>

                      {/* Verification Status */}
                      <AdminTableCell>
                        {student.studentIdVerified ? (
                          <AdminBadge variant="success" size="sm">
                            <CheckCircle2 className="size-3 mr-1" />
                            VERIFIED
                          </AdminBadge>
                        ) : (
                          <AdminBadge variant="warning" size="sm">
                            <Clock className="size-3 mr-1" />
                            NOT VERIFIED
                          </AdminBadge>
                        )}
                      </AdminTableCell>

                      {/* Trips Count */}
                      <AdminTableCell>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-semibold">
                          <Compass className="size-3.5 text-[#3B001B]" />
                          <span>{student.tripCount} {student.tripCount === 1 ? "Trip" : "Trips"}</span>
                        </div>
                      </AdminTableCell>

                      {/* Last Trip */}
                      <AdminTableCell>
                        {student.lastTrip ? (
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium text-stone-800 truncate max-w-[140px]" title={student.lastTrip.tripName}>
                              {student.lastTrip.tripName}
                            </span>
                            <span className="text-[11px] text-stone-400">
                              {student.lastTrip.date || "Past"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400">None yet</span>
                        )}
                      </AdminTableCell>

                      {/* Joined Date */}
                      <AdminTableCell>
                        <span className="text-xs text-stone-500 whitespace-nowrap">
                          {formatDate(student.createdAt)}
                        </span>
                      </AdminTableCell>

                      {/* Action */}
                      <AdminTableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {student.studentIdUrl ? (
                            <a
                              href={student.studentIdUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 transition-all shadow-sm hover:border-stone-300"
                              title="View submitted Student ID Card"
                            >
                              <FileText className="size-3.5 text-[#3B001B]" />
                              <span>View ID</span>
                              <ExternalLink className="size-2.5 text-stone-400" />
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-300 bg-stone-50 border border-stone-100 cursor-not-allowed"
                              title="No Student ID uploaded"
                            >
                              <FileText className="size-3 text-stone-300" />
                              <span>No ID</span>
                            </span>
                          )}

                          <Link
                            href={`/admin/students/${student.uid}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#3B001B] bg-[#3B001B]/5 hover:bg-[#3B001B]/15 border border-[#3B001B]/20 transition-all shadow-sm"
                          >
                            <span>Profile</span>
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </AdminTableBody>
            </AdminTable>
        )}

        {/* Pagination Footer */}
        {!loading && students.length > 0 && (
          <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm md:text-xs text-stone-600">
            <div>
              Showing <span className="font-semibold text-stone-900">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
              <span className="font-semibold text-stone-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of <span className="font-semibold text-stone-900">{pagination.total}</span> students
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                type="button"
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1}
                className="min-h-[44px] md:min-h-0 inline-flex items-center gap-1 px-4 md:px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none transition-colors font-semibold md:font-normal"
              >
                <ChevronLeft className="size-4 md:size-3.5" />
                <span>Previous</span>
              </button>

              <span className="px-2 font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
                className="min-h-[44px] md:min-h-0 inline-flex items-center gap-1 px-4 md:px-3 py-2 md:py-1.5 rounded-xl md:rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none transition-colors font-semibold md:font-normal"
              >
                <span>Next</span>
                <ChevronRight className="size-4 md:size-3.5" />
              </button>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
