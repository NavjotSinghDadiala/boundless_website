"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PencilIcon,
  UsersIcon,
  CalendarIcon,
  MapPinIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
  ImageIcon,
  MessageSquare,
  QrCodeIcon,
  PhoneIcon,
  MailIcon,
  ClockIcon,
  CompassIcon,
  InfoIcon,
  BackpackIcon,
  EyeIcon,
  IndianRupeeIcon,
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
} from "@/components/admin";
import { formatTripDates, formatRegistrationDeadline } from "@/lib/tripDateUtils";

const getDocumentUrl = (url) => {
  if (!url) return "#";
  if (url.includes("res.cloudinary.com")) {
    return `/api/downloadProxy/custom_file?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export default function TripViewPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params?.id;

  const [trip, setTrip] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTripAndRegistrations() {
      if (!tripId) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch trip details
        const tripRes = await fetch("/api/trip", {
          headers: { "x-admin-dev": "true" },
        });
        const tripData = await tripRes.json();
        if (!tripRes.ok) throw new Error(tripData.error || "Failed to load trip");

        const foundTrip = (tripData.trips || []).find((t) => t.id === tripId);
        if (!foundTrip) {
          throw new Error("Trip not found");
        }
        setTrip(foundTrip);

        // 2. Fetch registrations for this trip
        try {
          const regRes = await fetch(`/api/admin/registrations?tripId=${tripId}`);
          if (regRes.ok) {
            const regData = await regRes.json();
            setRegistrations(regData.registrations || []);
          }
        } catch (regErr) {
          console.warn("Could not load registrations for trip:", regErr);
        }
      } catch (err) {
        setError(err.message || "Failed to load trip details");
      } finally {
        setLoading(false);
      }
    }

    fetchTripAndRegistrations();
  }, [tripId]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <AdminLoadingState text="Loading trip details and rosters..." />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <AdminEmptyState
          title="Trip Not Found"
          description={error || "The requested expedition could not be found."}
          action={
            <Link
              href="/admin/trip"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B001B] text-white text-xs font-semibold"
            >
              <ArrowLeftIcon className="size-3.5" /> Back to Trips
            </Link>
          }
        />
      </div>
    );
  }

  const formattedDates = formatTripDates(trip.startDate, trip.endDate);
  const formattedDeadline = formatRegistrationDeadline(trip.registrationDeadline);

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title={trip.name}
        description={trip.description || "Detailed operational overview of this Boundless expedition."}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Expeditions", href: "/admin/trip" },
          { label: trip.name },
        ]}
        badge={
          <AdminBadge
            status={
              trip.isCompleted
                ? "completed"
                : trip.registrationOpen !== false
                ? "open"
                : "closed"
            }
          />
        }
        primaryAction={
          <Link
            href={`/admin/trip/edit/${trip.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] shadow-sm transition-all"
          >
            <PencilIcon className="size-4" />
            <span>Edit Trip</span>
          </Link>
        }
        secondaryActions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/trips/${trip.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
            >
              <EyeIcon className="size-3.5" />
              <span>Public Page</span>
              <ExternalLinkIcon className="size-3" />
            </Link>
            <Link
              href={`/admin/registrations?tripId=${trip.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300/80 text-xs font-semibold hover:bg-amber-200 transition-colors"
            >
              <UsersIcon className="size-3.5" />
              <span>Registration Queue</span>
            </Link>
          </div>
        }
      />

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AdminStatCard
          title="Total Joined"
          value={trip.totalJoined || 0}
          subtitle={`Capacity: ${trip.totalSeats || "Unlimited"} seats`}
          icon={UsersIcon}
          variant="maroon"
        />
        <AdminStatCard
          title="Gender Quotas"
          value={`${trip.maleReservedSeats !== undefined ? trip.maleReservedSeats : Math.max(0, (trip.totalSeats || 0) - (trip.femaleReservedSeats || 0))}M / ${trip.femaleReservedSeats || 0}F`}
          subtitle={`${trip.femaleJoined || 0} female participants joined`}
          icon={UsersIcon}
          variant="amber"
        />
        <AdminStatCard
          title="Trip Fee"
          value={trip.fee ? `₹${trip.fee.toLocaleString()}` : "Free"}
          subtitle="Per participant registration"
          icon={IndianRupeeIcon}
          variant="emerald"
        />
        <AdminStatCard
          title="Registration Closes"
          value={formattedDeadline || "TBA"}
          subtitle={trip.registrationOpen !== false ? "Currently accepting applications" : "Registration closed"}
          icon={ClockIcon}
          variant="stone"
        />
      </div>

      {/* TWO COLUMN DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: ITINERARY, CHECKLISTS, COORDINATORS */}
        <div className="lg:col-span-2 space-y-6">
          {/* ITINERARY */}
          <AdminCard
            title="Expedition Itinerary"
            subtitle="Scheduled activities and timeline for students"
            icon={CompassIcon}
          >
            {trip.itinerary && trip.itinerary.length > 0 ? (
              <div className="space-y-4">
                {trip.itinerary.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <span className="size-7 rounded-full bg-[#3B001B] text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {item.day || index + 1}
                      </span>
                      {index < trip.itinerary.length - 1 && (
                        <div className="w-0.5 flex-1 bg-stone-200 mt-2" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-sm text-stone-900">
                          {item.title || `Day ${item.day || index + 1}`}
                        </h4>
                        {item.time && (
                          <span className="text-xs text-stone-400 font-medium">
                            {item.time}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">
                No itinerary details configured yet.
              </p>
            )}
          </AdminCard>

          {/* IMPORTANT INFORMATION & THINGS TO CARRY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AdminCard
              title="Important Information"
              subtitle="Safety guidelines & rules"
              icon={InfoIcon}
            >
              {trip.importantInformation ? (
                <div className="text-xs text-stone-600 leading-relaxed whitespace-pre-line bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/60">
                  {trip.importantInformation}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No notes added.</p>
              )}
            </AdminCard>

            <AdminCard
              title="Things to Carry"
              subtitle="Mandatory gear checklist"
              icon={BackpackIcon}
            >
              {trip.thingsToCarry && trip.thingsToCarry.length > 0 ? (
                <ul className="space-y-2 text-xs text-stone-700">
                  {trip.thingsToCarry.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-stone-400 italic">No items listed.</p>
              )}
            </AdminCard>
          </div>

          {/* COORDINATORS */}
          <AdminCard
            title="Trip Coordinators"
            subtitle="Staff & student coordinators managing this trip"
            icon={UsersIcon}
          >
            {trip.coordinators && trip.coordinators.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {trip.coordinators.map((coord, idx) => (
                  <div
                    key={coord.id || idx}
                    className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-stone-900">
                        {coord.name}
                      </span>
                      {coord.assignedOption && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                          {coord.assignedOption}
                        </span>
                      )}
                    </div>
                    {coord.email && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <MailIcon className="size-3 text-stone-400" />
                        <span className="truncate">{coord.email}</span>
                      </div>
                    )}
                    {coord.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <PhoneIcon className="size-3 text-stone-400" />
                        <span>{coord.phone}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">No coordinators assigned.</p>
            )}
          </AdminCard>
        </div>

        {/* RIGHT 1 COLUMN: MEDIA GALLERY & LOGISTICS */}
        <div className="space-y-6">
          {/* MEDIA GALLERY */}
          <AdminCard
            title="Media & Photos"
            subtitle={`${trip.images?.length || 0} attached images`}
            icon={ImageIcon}
          >
            {trip.images && trip.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {trip.images.map((img, i) => (
                  <a
                    key={img.publicId || i}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-100 hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={img.url}
                      alt={`Trip photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">No images uploaded.</p>
            )}
          </AdminCard>

          {/* LOGISTICS & LINKS */}
          <AdminCard
            title="Private Logistics"
            subtitle="Admin-only communication endpoints"
            icon={MessageSquare}
          >
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-stone-700 block mb-1">
                  Community WhatsApp Link:
                </span>
                {trip.whatsappLink ? (
                  <a
                    href={trip.whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3B001B] hover:underline font-mono break-all inline-flex items-center gap-1"
                  >
                    <span>{trip.whatsappLink}</span>
                    <ExternalLinkIcon className="size-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-stone-400 italic">Not configured</span>
                )}
              </div>

              {trip.qrCodeUrl && (
                <div>
                  <span className="font-semibold text-stone-700 block mb-1">
                    WhatsApp QR Code:
                  </span>
                  <div className="size-28 rounded-xl border border-stone-200 overflow-hidden bg-stone-50 p-1">
                    <img
                      src={trip.qrCodeUrl}
                      alt="WhatsApp QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </AdminCard>
        </div>
      </div>

      {/* REGISTERED ATTENDEES TABLE */}
      <AdminCard
        title="Registered Attendees"
        subtitle={`Live student registrations for this expedition (${registrations.length} total)`}
        icon={UsersIcon}
        headerActions={
          <Link
            href={`/admin/registrations?tripId=${trip.id}`}
            className="text-xs text-[#3B001B] hover:underline font-semibold flex items-center gap-1"
          >
            <span>Open Registration Review Console</span>
            <ExternalLinkIcon className="size-3" />
          </Link>
        }
        noPadding
      >
        {registrations.length === 0 ? (
          <div className="p-8">
            <AdminEmptyState
              title="No Registrations Yet"
              description="No students have registered for this expedition so far."
              compact
            />
          </div>
        ) : (
          <AdminTable>
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Attendee</AdminTableHeaderCell>
                <AdminTableHeaderCell>Email</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>Gender</AdminTableHeaderCell>
                <AdminTableHeaderCell>Student ID</AdminTableHeaderCell>
                <AdminTableHeaderCell>Consent</AdminTableHeaderCell>
                <AdminTableHeaderCell className="text-right">Registered</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {registrations.map((reg) => {
                const nameKey = Object.keys(reg.formData || {}).find(
                  (k) =>
                    k.toLowerCase().includes("name") ||
                    k.toLowerCase().includes("fullname")
                );
                const studentName = nameKey ? reg.formData[nameKey] : "Student";

                return (
                  <AdminTableRow key={reg.id}>
                    <AdminTableCell className="font-semibold text-stone-900">
                      {studentName}
                    </AdminTableCell>
                    <AdminTableCell className="text-stone-500 font-mono text-xs">
                      {reg.email}
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge status={reg.status || "registered"} size="sm" />
                    </AdminTableCell>
                    <AdminTableCell className="capitalize text-stone-600">
                      {reg.gender || "—"}
                    </AdminTableCell>
                    <AdminTableCell>
                      {reg.studentIdVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2Icon className="size-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400">Pending</span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      {reg.consentFormVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2Icon className="size-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400">Pending</span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-right text-xs text-stone-400 whitespace-nowrap">
                      {reg.submittedAt
                        ? new Date(reg.submittedAt).toLocaleDateString()
                        : "—"}
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}
