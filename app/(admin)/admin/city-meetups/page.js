"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Trash2Icon,
  PlusIcon,
  PencilIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  ExternalLinkIcon,
  ImageIcon,
  SparklesIcon,
  ArchiveIcon,
  FolderKanbanIcon,
  AlertCircleIcon,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminLoadingState,
  AdminEmptyState,
  AdminConfirmDialog,
  AdminTable,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
  AdminMobileCardList,
  AdminMobileCard,
  AdminBadge,
} from "@/components/admin";
import { sortMeetupsMostRecentFirst } from "@/lib/cityMeetups";

function formatStatusLabel(status) {
  switch (status) {
    case "published":
      return { label: "Published", variant: "success" };
    case "draft":
      return { label: "Draft", variant: "neutral" };
    case "registration_closed":
      return { label: "Reg Closed", variant: "warning" };
    case "completed":
      return { label: "Completed", variant: "info" };
    case "cancelled":
      return { label: "Cancelled", variant: "danger" };
    case "archived":
      return { label: "Archived", variant: "neutral" };
    default:
      return { label: status || "Published", variant: "neutral" };
  }
}

export default function ManageCityMeetupsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [meetups, setMeetups] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null); // { type: 'meetup' | 'campaign', id: string, name: string }
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [meetupsRes, campaignsRes] = await Promise.all([
        fetch("/api/city-meetups"),
        fetch("/api/meetup-campaigns"),
      ]);

      const [meetupsData, campaignsData] = await Promise.all([
        meetupsRes.json().catch(() => ({})),
        campaignsRes.json().catch(() => ({})),
      ]);

      if (!meetupsRes.ok || !campaignsRes.ok) {
        throw new Error(
          meetupsData.error || campaignsData.error || "Failed to load city meetups data"
        );
      }

      setMeetups(meetupsData.meetups || []);
      setCampaigns(campaignsData.campaigns || []);
    } catch (error) {
      setFetchError(error.message || "Failed to load city meetups data");
      toast.error(error.message || "Failed to load city meetups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const standaloneMeetups = useMemo(
    () =>
      sortMeetupsMostRecentFirst(
        meetups.filter(
          (m) => m.recordOrigin === "structured" && m.meetupType === "standalone"
        )
      ),
    [meetups]
  );

  const legacyArchiveMeetups = useMemo(
    () =>
      sortMeetupsMostRecentFirst(
        meetups.filter((m) => m.recordOrigin === "legacy_archive")
      ),
    [meetups]
  );

  // Aggregate child city metrics per campaign
  const campaignStatsMap = useMemo(() => {
    const map = new Map();
    for (const m of meetups) {
      if (m.meetupType === "campaign_city" && m.campaignId) {
        const cur = map.get(m.campaignId) || {
          cities: 0,
          published: 0,
          registered: 0,
          capacity: 0,
        };
        cur.cities += 1;
        if (m.status === "published") cur.published += 1;
        cur.registered += Number(m.registeredCount || 0);
        cur.capacity += Number(m.capacity || 0);
        map.set(m.campaignId, cur);
      }
    }
    return map;
  }, [meetups]);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      if (deleteDialog.type === "meetup") {
        const res = await fetch(
          `/api/city-meetups?id=${encodeURIComponent(deleteDialog.id)}`,
          { method: "DELETE" }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.success("City meetup deleted successfully");
          setMeetups((prev) => prev.filter((m) => m.id !== deleteDialog.id));
          setDeleteDialog(null);
        } else {
          throw new Error(data.error || "Failed to delete meetup");
        }
      } else {
        const res = await fetch(
          `/api/meetup-campaigns?id=${encodeURIComponent(deleteDialog.id)}`,
          { method: "DELETE" }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.success("Flagship campaign deleted successfully");
          setCampaigns((prev) => prev.filter((c) => c.id !== deleteDialog.id));
          setDeleteDialog(null);
        } else {
          throw new Error(data.error || "Failed to delete campaign");
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="City Chapters & Meetups"
        description="Manage Flagship Campaigns with multi-city events, Standalone City Meetups, and the Historical Archive."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "City Meetups" },
        ]}
        primaryAction={
          activeTab === "campaigns" ? (
            <button
              type="button"
              onClick={() => router.push("/admin/city-meetups/campaigns/add")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
            >
              <PlusIcon className="size-4" />
              <span>Create Flagship Campaign</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                router.push("/admin/city-meetups/add?type=standalone")
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
            >
              <PlusIcon className="size-4" />
              <span>Create Standalone Meetup</span>
            </button>
          )
        }
        secondaryActions={
          activeTab === "campaigns" ? (
            <button
              type="button"
              onClick={() =>
                router.push("/admin/city-meetups/add?type=standalone")
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
            >
              <PlusIcon className="size-4" />
              <span>Standalone Meetup</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/admin/city-meetups/campaigns/add")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
            >
              <SparklesIcon className="size-4" />
              <span>New Campaign</span>
            </button>
          )
        }
      />

      {/* Error State Banner */}
      {fetchError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircleIcon className="size-5 text-rose-600 shrink-0" />
            <span className="font-medium">{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-bold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Three Clear Section Tabs */}
      <div className="grid grid-cols-1 sm:flex items-center gap-2 border-b border-stone-200/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`min-h-[48px] sm:min-h-0 flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 sm:py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === "campaigns"
              ? "bg-[#3B001B] text-white shadow-sm"
              : "bg-white sm:bg-transparent border sm:border-0 border-stone-200 text-stone-700 sm:text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <SparklesIcon className="size-4 shrink-0" />
          <span>Flagship Campaigns ({campaigns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("standalone")}
          className={`min-h-[48px] sm:min-h-0 flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 sm:py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === "standalone"
              ? "bg-[#3B001B] text-white shadow-sm"
              : "bg-white sm:bg-transparent border sm:border-0 border-stone-200 text-stone-700 sm:text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <MapPinIcon className="size-4 shrink-0" />
          <span>Standalone Meetups ({standaloneMeetups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("archive")}
          className={`min-h-[48px] sm:min-h-0 flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 sm:py-2 text-sm font-semibold rounded-xl transition-all ${
            activeTab === "archive"
              ? "bg-[#3B001B] text-white shadow-sm"
              : "bg-white sm:bg-transparent border sm:border-0 border-stone-200 text-stone-700 sm:text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <ArchiveIcon className="size-4 shrink-0" />
          <span>Historical Archive ({legacyArchiveMeetups.length})</span>
        </button>
      </div>

      {loading ? (
        <AdminLoadingState type="table" rows={4} />
      ) : activeTab === "campaigns" ? (
        /* TAB 1: FLAGSHIP CAMPAIGNS */
        campaigns.length === 0 ? (
          <AdminEmptyState
            title="No Flagship Campaigns Yet"
            description="Create a flagship campaign (e.g. Navrang 4.0, Tricolor Trails) and add multiple independent city events under it."
            icon={SparklesIcon}
            action={
              <button
                type="button"
                onClick={() => router.push("/admin/city-meetups/campaigns/add")}
                className="inline-flex items-center gap-2 min-h-[48px] sm:min-h-0 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-sm font-semibold"
              >
                <PlusIcon className="size-4" />
                Create First Campaign
              </button>
            }
          />
        ) : (
          <AdminTable
            mobileContent={
              <AdminMobileCardList>
                {campaigns.map((camp) => {
                  const st = formatStatusLabel(camp.status);
                  const stats = campaignStatsMap.get(camp.id) || {
                    cities: camp.cityEventsCount || 0,
                    published: 0,
                    registered: 0,
                    capacity: 0,
                  };
                  return (
                    <AdminMobileCard
                      key={camp.id}
                      onClick={() =>
                        router.push(`/admin/city-meetups/campaigns/${camp.id}`)
                      }
                      leading={
                        camp.img ? (
                          <div className="size-12 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                            <img
                              src={camp.img}
                              alt={camp.title || camp.city}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="size-12 rounded-xl border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-400">
                            <ImageIcon className="size-5" />
                          </div>
                        )
                      }
                      title={camp.title || camp.city}
                      subtitle={camp.edition || camp.badge || "Flagship Campaign"}
                      badge={
                        <AdminBadge variant={st.variant} size="sm">
                          {st.label}
                        </AdminBadge>
                      }
                      fields={[
                        {
                          label: "City Events",
                          value: `${stats.cities} ${
                            stats.cities === 1 ? "city" : "cities"
                          }`,
                        },
                        {
                          label: "Aggregate Seats",
                          value:
                            stats.capacity > 0
                              ? `${stats.registered} / ${stats.capacity}`
                              : stats.registered > 0
                              ? `${stats.registered} registered`
                              : "No active cap",
                        },
                      ]}
                      actions={
                        <div className="w-full space-y-2">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/admin/city-meetups/campaigns/${camp.id}`
                              )
                            }
                            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-sm font-semibold flex items-center justify-center gap-2"
                          >
                            <FolderKanbanIcon className="size-4" />
                            <span>Manage Cities</span>
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/admin/city-meetups/campaigns/edit/${camp.id}`
                                )
                              }
                              className="min-h-[44px] px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-700 text-sm font-semibold flex items-center justify-center gap-1.5"
                            >
                              <PencilIcon className="size-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteDialog({
                                  type: "campaign",
                                  id: camp.id,
                                  name: camp.title || camp.city || "Campaign",
                                })
                              }
                              className="min-h-[44px] px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold flex items-center justify-center gap-1.5"
                            >
                              <Trash2Icon className="size-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      }
                    />
                  );
                })}
              </AdminMobileCardList>
            }
          >
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Banner</AdminTableHeaderCell>
                <AdminTableHeaderCell>Campaign & Edition</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>Linked Cities</AdminTableHeaderCell>
                <AdminTableHeaderCell>Aggregate Seats</AdminTableHeaderCell>
                <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {campaigns.map((camp) => {
                const st = formatStatusLabel(camp.status);
                const stats = campaignStatsMap.get(camp.id) || {
                  cities: camp.cityEventsCount || 0,
                  published: 0,
                  registered: 0,
                  capacity: 0,
                };
                return (
                  <AdminTableRow key={camp.id}>
                    <AdminTableCell className="w-20">
                      <div className="relative size-12 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                        {camp.img ? (
                          <img
                            src={camp.img}
                            alt={camp.title || camp.city}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-stone-300">
                            <ImageIcon className="size-4" />
                          </div>
                        )}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="font-semibold text-stone-900">
                        {camp.title || camp.city}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        {camp.edition && (
                          <span className="font-medium text-[#3B001B]">
                            {camp.edition}
                          </span>
                        )}
                        {camp.badge && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                            {camp.badge}
                          </span>
                        )}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant={st.variant} size="sm">
                        {st.label}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-semibold">
                        <MapPinIcon className="size-3.5 text-[#3B001B]" />
                        {stats.cities} {stats.cities === 1 ? "City" : "Cities"}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell className="text-stone-600 whitespace-nowrap">
                      {stats.capacity > 0 ? (
                        <span>
                          <strong className="text-stone-900">{stats.registered}</strong> /{" "}
                          {stats.capacity}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">
                          {stats.registered > 0 ? `${stats.registered} reg` : "—"}
                        </span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/admin/city-meetups/campaigns/${camp.id}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B001B] text-white text-xs font-semibold hover:bg-[#46001D] transition-colors"
                        >
                          <FolderKanbanIcon className="size-3.5" />
                          <span>Manage Cities</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/admin/city-meetups/campaigns/edit/${camp.id}`
                            )
                          }
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                          title="Edit campaign"
                        >
                          <PencilIcon className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteDialog({
                              type: "campaign",
                              id: camp.id,
                              name: camp.title || camp.city || "Campaign",
                            })
                          }
                          className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                          title="Delete campaign"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })}
            </AdminTableBody>
          </AdminTable>
        )
      ) : activeTab === "standalone" ? (
        /* TAB 2: STANDALONE MEETUPS */
        standaloneMeetups.length === 0 ? (
          <AdminEmptyState
            title="No Standalone City Meetups"
            description="Create an independent city meetup (e.g. Mumbai, Pune, Delhi) with its own date, venue, capacity, and registration settings."
            icon={MapPinIcon}
            action={
              <button
                type="button"
                onClick={() =>
                  router.push("/admin/city-meetups/add?type=standalone")
                }
                className="inline-flex items-center gap-2 min-h-[48px] sm:min-h-0 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-sm font-semibold"
              >
                <PlusIcon className="size-4" />
                Create Standalone Meetup
              </button>
            }
          />
        ) : (
          <AdminTable
            mobileContent={
              <AdminMobileCardList>
                {standaloneMeetups.map((item) => {
                  const st = formatStatusLabel(item.status);
                  return (
                    <AdminMobileCard
                      key={item.id}
                      title={item.cityName || "Untitled City"}
                      subtitle={item.title || item.venue || "Standalone City Meetup"}
                      badge={
                        <AdminBadge variant={st.variant} size="sm">
                          {st.label}
                        </AdminBadge>
                      }
                      fields={[
                        {
                          label: "Event Date",
                          value: item.eventDate || "Date TBA",
                        },
                        {
                          label: "Capacity",
                          value:
                            item.capacity > 0
                              ? `${item.registeredCount || 0} / ${item.capacity}`
                              : "Unlimited",
                        },
                        {
                          label: "Venue",
                          value: item.venue || "Venue TBA",
                        },
                        {
                          label: "Registration",
                          value: item.registrationOpen ? "Open" : "Closed",
                        },
                      ]}
                      actions={
                        <div className="grid grid-cols-2 gap-2.5 w-full">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/admin/city-meetups/edit/${item.id}`)
                            }
                            className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#3B001B] text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                          >
                            <PencilIcon className="size-4" />
                            <span>Edit / Manage</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteDialog({
                                type: "meetup",
                                id: item.id,
                                name: item.cityName || "Meetup",
                              })
                            }
                            className="min-h-[48px] px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold flex items-center justify-center gap-1.5"
                          >
                            <Trash2Icon className="size-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      }
                    />
                  );
                })}
              </AdminMobileCardList>
            }
          >
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>City & Title</AdminTableHeaderCell>
                <AdminTableHeaderCell>Event Date</AdminTableHeaderCell>
                <AdminTableHeaderCell>Venue</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>Capacity</AdminTableHeaderCell>
                <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {standaloneMeetups.map((item) => {
                const st = formatStatusLabel(item.status);
                return (
                  <AdminTableRow key={item.id}>
                    <AdminTableCell>
                      <div className="font-semibold text-stone-900">
                        {item.cityName}
                      </div>
                      {item.title && (
                        <div className="text-xs text-stone-500 mt-0.5">
                          {item.title}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-stone-600 whitespace-nowrap">
                      <div>{item.eventDate || "Date TBA"}</div>
                      {item.startTime && (
                        <div className="text-[11px] text-stone-400">
                          {item.startTime}
                          {item.endTime ? ` – ${item.endTime}` : ""}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-stone-600 max-w-[200px] truncate">
                      {item.venue || "—"}
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant={st.variant} size="sm">
                        {st.label}
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap">
                      {item.capacity > 0 ? (
                        <span>
                          <strong className="text-stone-900">
                            {item.registeredCount || 0}
                          </strong>{" "}
                          / {item.capacity}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-500">Unlimited</span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/admin/city-meetups/edit/${item.id}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors"
                        >
                          <PencilIcon className="size-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteDialog({
                              type: "meetup",
                              id: item.id,
                              name: item.cityName || "Meetup",
                            })
                          }
                          className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                          title="Delete meetup"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })}
            </AdminTableBody>
          </AdminTable>
        )
      ) : /* TAB 3: HISTORICAL ARCHIVE (Legacy records preserved read-only without automatic mutation) */
      legacyArchiveMeetups.length === 0 ? (
        <AdminEmptyState
          title="No Historical Archive Records"
          description="Legacy city meetup showcase records appear here automatically without modifying their original Firestore documents."
          icon={ArchiveIcon}
        />
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 px-4 py-3 text-xs sm:text-sm text-amber-900">
            Historical archive records are preserved untouched from earlier showcase entries. Editing a record lets you optionally classify it or update its archive details.
          </div>

          <AdminTable
            mobileContent={
              <AdminMobileCardList>
                {legacyArchiveMeetups.map((item) => (
                  <AdminMobileCard
                    key={item.id}
                    leading={
                      item.img ? (
                        <div className="size-11 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                          <img
                            src={item.img}
                            alt={item.cityName || "Meetup"}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : undefined
                    }
                    title={item.cityName || "Untitled City"}
                    subtitle={item.subSection || item.mainSection || "Archive Entry"}
                    badge={
                      <AdminBadge variant="neutral" size="sm">
                        Archive
                      </AdminBadge>
                    }
                    fields={[
                      {
                        label: "Venue",
                        value: item.venue || "—",
                      },
                      {
                        label: "Recorded Attendees",
                        value: item.participants || 0,
                      },
                    ]}
                    actions={
                      <div className="grid grid-cols-2 gap-2.5 w-full">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/admin/city-meetups/edit/${item.id}`)
                          }
                          className="min-h-[44px] px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm font-semibold flex items-center justify-center gap-1.5"
                        >
                          <PencilIcon className="size-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteDialog({
                              type: "meetup",
                              id: item.id,
                              name: item.cityName || "Meetup",
                            })
                          }
                          className="min-h-[44px] px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Trash2Icon className="size-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    }
                  />
                ))}
              </AdminMobileCardList>
            }
          >
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Cover</AdminTableHeaderCell>
                <AdminTableHeaderCell>City Name</AdminTableHeaderCell>
                <AdminTableHeaderCell>Edition / Section</AdminTableHeaderCell>
                <AdminTableHeaderCell>Attendees</AdminTableHeaderCell>
                <AdminTableHeaderCell>Link</AdminTableHeaderCell>
                <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {legacyArchiveMeetups.map((item) => (
                <AdminTableRow key={item.id}>
                  <AdminTableCell className="w-16">
                    {item.img ? (
                      <div className="size-11 rounded-lg overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                        <img
                          src={item.img}
                          alt={item.cityName || "Meetup"}
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
                    <div>{item.cityName || "—"}</div>
                    {item.locationMatched === false && (
                      <div className="mt-1">
                        <AdminBadge variant="warning" size="sm">
                          Unmatched Map Location
                        </AdminBadge>
                      </div>
                    )}
                  </AdminTableCell>
                  <AdminTableCell className="text-stone-600">
                    <div>{item.subSection || "—"}</div>
                    {item.mainSection && (
                      <div className="text-[11px] text-stone-400">
                        {item.mainSection}
                      </div>
                    )}
                  </AdminTableCell>
                  <AdminTableCell className="text-stone-600 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <UsersIcon className="size-3.5 text-stone-400" />
                      {item.participants || 0}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell>
                    {item.link || item.galleryLink ? (
                      <a
                        href={item.link || item.galleryLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#3B001B] hover:underline font-mono inline-flex items-center gap-1"
                      >
                        <span className="truncate max-w-[160px]">
                          {item.link || item.galleryLink}
                        </span>
                        <ExternalLinkIcon className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </AdminTableCell>
                  <AdminTableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/admin/city-meetups/edit/${item.id}`)
                        }
                        className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                        title="Edit archive record"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteDialog({
                            type: "meetup",
                            id: item.id,
                            name: item.cityName || "Meetup",
                          })
                        }
                        className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                        title="Delete archive record"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        open={Boolean(deleteDialog)}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        title={`Delete ${
          deleteDialog?.type === "meetup" ? "City Meetup" : "Flagship Campaign"
        }?`}
        description={
          deleteDialog?.type === "campaign"
            ? `Are you sure you want to delete "${deleteDialog?.name}"? Deletion is safely blocked if any city events are still linked to this campaign.`
            : `Are you sure you want to delete "${deleteDialog?.name}"? Deletion is blocked if active student registrations exist.`
        }
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
