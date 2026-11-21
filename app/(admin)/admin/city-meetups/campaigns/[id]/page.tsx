"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ImageIcon,
  SparklesIcon,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminStatCard,
  AdminStatGrid,
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
  AdminMobileCardList,
  AdminMobileCard,
} from "@/components/admin";
import { MEETUP_STATUSES, type MeetupStatus } from "@/lib/cityMeetups";

interface Campaign {
  id: string;
  city: string;
  title: string;
  edition?: string;
  description: string;
  img: string;
  logo?: string;
  badge?: string;
  status: string;
  cityEventsCount?: number;
}

interface CityEvent {
  id: string;
  cityName: string;
  title?: string;
  status: MeetupStatus;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
  registrationOpen: boolean;
}

function getStatusBadgeMeta(status: string): {
  label: string;
  variant: "success" | "neutral" | "warning" | "info" | "danger";
} {
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

export default function CampaignManagementHubPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [cities, setCities] = useState<CityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingCityId, setUpdatingCityId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CityEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCampaignHub = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/meetup-campaigns?id=${encodeURIComponent(id)}&includeCities=true`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to load flagship campaign.");
      }
      setCampaign(data.campaign || null);
      setCities(data.cities || []);
    } catch (err: any) {
      setError(err.message || "Failed to load flagship campaign.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCampaignHub();
  }, [loadCampaignHub]);

  const handleCityStatusChange = async (city: CityEvent, nextStatus: MeetupStatus) => {
    setUpdatingCityId(city.id);
    try {
      const res = await fetch("/api/city-meetups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: city.id,
          status: nextStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update city status.");
      }
      setCities((prev) =>
        prev.map((c) => (c.id === city.id ? { ...c, status: nextStatus } : c))
      );
      toast.success(`${city.cityName} status updated to ${getStatusBadgeMeta(nextStatus).label}`);
    } catch (err: any) {
      toast.error(err.message || "Could not update city status");
    } finally {
      setUpdatingCityId(null);
    }
  };

  const handleDeleteCity = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/city-meetups?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove city event.");
      }
      setCities((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success(`${deleteTarget.cityName} removed from campaign.`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Could not remove city event");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <AdminLoadingState text="Loading flagship campaign hub..." />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
        <Link
          href="/admin/city-meetups"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          <ArrowLeftIcon className="size-4" />
          Back to City Meetups
        </Link>
        <AdminEmptyState
          title="Campaign Not Found"
          description={error || "The requested flagship campaign could not be loaded."}
          icon={AlertCircleIcon}
          action={
            <button
              type="button"
              onClick={loadCampaignHub}
              className="px-4 py-2 rounded-xl bg-[#3B001B] text-white text-sm font-semibold"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const campaignStatus = getStatusBadgeMeta(campaign.status);
  const publishedCitiesCount = cities.filter((c) => c.status === "published").length;
  const totalCapacity = cities.reduce((sum, c) => sum + (c.capacity || 0), 0);
  const totalRegistered = cities.reduce((sum, c) => sum + (c.registeredCount || 0), 0);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] max-w-7xl mx-auto">
      <AdminPageHeader
        title={campaign.title || campaign.city}
        description={
          campaign.edition
            ? `Flagship Campaign · ${campaign.edition}`
            : "Flagship Campaign Management Hub"
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "City Meetups", href: "/admin/city-meetups" },
          { label: campaign.title || campaign.city },
        ]}
        badge={
          <AdminBadge variant={campaignStatus.variant} size="sm">
            {campaignStatus.label}
          </AdminBadge>
        }
        primaryAction={
          <Link
            href={`/admin/city-meetups/add?type=campaign_city&campaignId=${encodeURIComponent(
              campaign.id
            )}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
          >
            <PlusIcon className="size-4" />
            <span>Add City Event</span>
          </Link>
        }
        secondaryActions={
          <Link
            href={`/admin/city-meetups/campaigns/edit/${campaign.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
          >
            <PencilIcon className="size-4" />
            <span>Edit Campaign Details</span>
          </Link>
        }
      />

      {/* Campaign-Level Information Card (Strictly separated from City-Level Events) */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="relative min-h-[180px] bg-stone-100">
            {campaign.img ? (
              <img
                src={campaign.img}
                alt={campaign.title || campaign.city}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">
                <ImageIcon className="size-8" />
              </div>
            )}
            {campaign.logo && (
              <div className="absolute top-3 left-3 size-11 rounded-xl bg-white/95 p-1.5 shadow border border-stone-200">
                <img
                  src={campaign.logo}
                  alt="Campaign Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          <div className="md:col-span-2 p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[#3B001B] inline-flex items-center gap-1">
                  <SparklesIcon className="size-3.5" />
                  Campaign-Level Branding
                </span>
                {campaign.badge && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {campaign.badge}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
                {campaign.description}
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
              <span>Homepage Slider Label: <strong className="text-stone-800">{campaign.city}</strong></span>
              <span>Updating campaign branding never alters individual city schedules or venues.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Aggregate Stats */}
      <AdminStatGrid>
        <AdminStatCard
          title="Linked Cities"
          value={cities.length}
          icon={MapPinIcon}
          subtitle="Independent city events"
          variant="maroon"
        />
        <AdminStatCard
          title="Published Cities"
          value={publishedCitiesCount}
          icon={CheckCircle2Icon}
          subtitle="Live for students"
          variant="emerald"
        />
        <AdminStatCard
          title="Total Capacity"
          value={totalCapacity > 0 ? totalCapacity : "Flexible"}
          icon={CalendarIcon}
          subtitle="Across all cities"
          variant="blue"
        />
        <AdminStatCard
          title="Total Registered"
          value={totalRegistered}
          icon={UsersIcon}
          subtitle="Combined RSVP count"
          variant="amber"
        />
      </AdminStatGrid>

      {/* City-Level Events Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              City Events ({cities.length})
            </h2>
            <p className="text-sm text-stone-600">
              Each city operates independently with its own date, venue, capacity, and status.
            </p>
          </div>
        </div>

        {cities.length === 0 ? (
          <AdminEmptyState
            title="No Cities Added to This Campaign Yet"
            description="Add your first city event (e.g. Mumbai, Pune, Delhi) under this flagship campaign."
            icon={MapPinIcon}
            action={
              <Link
                href={`/admin/city-meetups/add?type=campaign_city&campaignId=${encodeURIComponent(
                  campaign.id
                )}`}
                className="inline-flex items-center gap-2 min-h-[48px] sm:min-h-0 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-sm font-semibold"
              >
                <PlusIcon className="size-4" />
                Add First City Event
              </Link>
            }
          />
        ) : (
          <AdminTable
            mobileContent={
              <AdminMobileCardList>
                {cities.map((city) => {
                  const st = getStatusBadgeMeta(city.status);
                  return (
                    <AdminMobileCard
                      key={city.id}
                      title={city.cityName}
                      subtitle={city.venue || "Venue TBA"}
                      badge={
                        <AdminBadge variant={st.variant} size="sm">
                          {st.label}
                        </AdminBadge>
                      }
                      fields={[
                        { label: "Event Date", value: city.eventDate || "Date TBA" },
                        {
                          label: "Capacity",
                          value:
                            city.capacity > 0
                              ? `${city.registeredCount} / ${city.capacity}`
                              : "Unlimited",
                        },
                        {
                          label: "Registration",
                          value: city.registrationOpen ? "Open" : "Closed",
                        },
                        {
                          label: "Time",
                          value: city.startTime || "TBA",
                        },
                      ]}
                      actions={
                        <div className="w-full space-y-2.5">
                          <select
                            aria-label={`Change status for ${city.cityName}`}
                            value={city.status}
                            disabled={updatingCityId === city.id}
                            onChange={(e) =>
                              handleCityStatusChange(
                                city,
                                e.target.value as MeetupStatus
                              )
                            }
                            className="w-full min-h-[48px] px-3.5 rounded-xl border border-stone-200 bg-stone-50 text-base font-medium text-stone-800"
                          >
                            {MEETUP_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                Status: {getStatusBadgeMeta(s).label}
                              </option>
                            ))}
                          </select>
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/admin/city-meetups/edit/${city.id}`)
                              }
                              className="min-h-[48px] px-3 py-2 rounded-xl bg-[#3B001B] text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                            >
                              <PencilIcon className="size-4" />
                              <span>Edit City</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(city)}
                              className="min-h-[48px] px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold flex items-center justify-center gap-1.5"
                            >
                              <Trash2Icon className="size-4" />
                              <span>Remove</span>
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
                <AdminTableHeaderCell>City</AdminTableHeaderCell>
                <AdminTableHeaderCell>Date & Time</AdminTableHeaderCell>
                <AdminTableHeaderCell>Venue</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>Seats</AdminTableHeaderCell>
                <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {cities.map((city) => {
                const st = getStatusBadgeMeta(city.status);
                return (
                  <AdminTableRow key={city.id}>
                    <AdminTableCell>
                      <div className="font-semibold text-stone-900">
                        {city.cityName}
                      </div>
                      {city.title && (
                        <div className="text-xs text-stone-500 mt-0.5">
                          {city.title}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-stone-600 whitespace-nowrap">
                      <div>{city.eventDate || "Date TBA"}</div>
                      {city.startTime && (
                        <div className="text-[11px] text-stone-400">
                          {city.startTime}
                          {city.endTime ? ` – ${city.endTime}` : ""}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-stone-600 max-w-[220px] truncate">
                      {city.venue || "—"}
                    </AdminTableCell>
                    <AdminTableCell>
                      <select
                        aria-label={`Status for ${city.cityName}`}
                        value={city.status}
                        disabled={updatingCityId === city.id}
                        onChange={(e) =>
                          handleCityStatusChange(
                            city,
                            e.target.value as MeetupStatus
                          )
                        }
                        className="text-xs font-semibold rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
                      >
                        {MEETUP_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {getStatusBadgeMeta(s).label}
                          </option>
                        ))}
                      </select>
                    </AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap">
                      {city.capacity > 0 ? (
                        <span>
                          <strong className="text-stone-900">
                            {city.registeredCount}
                          </strong>{" "}
                          / {city.capacity}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-500">
                          {city.registeredCount > 0
                            ? `${city.registeredCount} reg`
                            : "Unlimited"}
                        </span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/admin/city-meetups/edit/${city.id}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors"
                        >
                          <PencilIcon className="size-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(city)}
                          className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                          title={`Remove ${city.cityName}`}
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
        )}
      </div>

      {/* Safe Remove City Confirmation Dialog */}
      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Remove ${deleteTarget?.cityName || "City"} from Campaign?`}
        description="This removes only this city event. Sibling cities and the parent campaign remain unaffected. Deletion is automatically blocked if active student registrations exist."
        confirmText="Remove City"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteCity}
      />
    </div>
  );
}
