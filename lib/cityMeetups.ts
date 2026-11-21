import { resolveCanonicalCityLocation } from "./cityMapLocations";

export const MEETUP_TYPES = ["standalone", "campaign_city"] as const;
export type MeetupType = (typeof MEETUP_TYPES)[number];

export const MEETUP_STATUSES = [
  "draft",
  "published",
  "registration_closed",
  "completed",
  "cancelled",
] as const;
export type MeetupStatus = (typeof MEETUP_STATUSES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "published",
  "completed",
  "archived",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const MEETUP_REGISTRATION_STATUSES = ["registered", "cancelled"] as const;
export type MeetupRegistrationStatus = (typeof MEETUP_REGISTRATION_STATUSES)[number];

export type RecordOrigin = "structured" | "legacy_archive";

/**
 * Deterministic registration document ID without hashing.
 */
export function buildMeetupRegistrationId(meetupId: string, uid: string): string {
  return `${String(meetupId).trim()}_${String(uid).trim()}`;
}

export function isRegistrationDeadlinePassed(
  deadline?: string | null,
  now: Date = new Date()
): boolean {
  if (!deadline || typeof deadline !== "string" || !deadline.trim()) return false;
  const parsed = new Date(deadline);
  if (isNaN(parsed.getTime())) return false;
  // If date-only YYYY-MM-DD, treat deadline as end of that day UTC/local safely
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
    const endOfDay = new Date(`${deadline.trim()}T23:59:59.999Z`);
    return now.getTime() > endOfDay.getTime();
  }
  return now.getTime() > parsed.getTime();
}

export function evaluateRegistrationEligibility(
  meetup: {
    recordOrigin?: RecordOrigin;
    status?: string;
    registrationOpen?: boolean;
    registrationDeadline?: string;
    capacity?: number;
    registeredCount?: number;
  },
  now: Date = new Date()
): { eligible: boolean; reason?: string; code?: string } {
  if (meetup.recordOrigin === "legacy_archive") {
    return {
      eligible: false,
      code: "LEGACY_ARCHIVE",
      reason: "Historical archive meetups are not open for registration.",
    };
  }
  if (meetup.status === "cancelled") {
    return {
      eligible: false,
      code: "CANCELLED",
      reason: "This city meetup has been cancelled.",
    };
  }
  if (meetup.status === "completed") {
    return {
      eligible: false,
      code: "COMPLETED",
      reason: "This city meetup has already been completed.",
    };
  }
  if (meetup.status === "draft") {
    return {
      eligible: false,
      code: "DRAFT",
      reason: "This city meetup is not published yet.",
    };
  }
  if (meetup.status === "registration_closed" || !meetup.registrationOpen) {
    return {
      eligible: false,
      code: "CLOSED",
      reason: "Registration is currently closed for this city meetup.",
    };
  }
  if (isRegistrationDeadlinePassed(meetup.registrationDeadline, now)) {
    return {
      eligible: false,
      code: "DEADLINE_PASSED",
      reason: "The registration deadline for this city meetup has passed.",
    };
  }
  const capacity = typeof meetup.capacity === "number" ? meetup.capacity : 0;
  const registeredCount = typeof meetup.registeredCount === "number" ? meetup.registeredCount : 0;
  if (capacity > 0 && registeredCount >= capacity) {
    return {
      eligible: false,
      code: "FULL",
      reason: "This city meetup has reached full capacity.",
    };
  }
  return { eligible: true };
}

export function normalizeMeetupRegistrationDoc(
  id: string,
  raw: Record<string, any> = {}
) {
  const validStatus: MeetupRegistrationStatus =
    raw.status === "cancelled" ? "cancelled" : "registered";

  return {
    id,
    meetupId: typeof raw.meetupId === "string" ? raw.meetupId : "",
    campaignId: typeof raw.campaignId === "string" && raw.campaignId.trim() ? raw.campaignId.trim() : null,
    uid: typeof raw.uid === "string" ? raw.uid : "",
    studentName: typeof raw.studentName === "string" ? raw.studentName : "",
    studentEmail: typeof raw.studentEmail === "string" ? raw.studentEmail : "",
    studentId: typeof raw.studentId === "string" ? raw.studentId : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
    cityName: typeof raw.cityName === "string" ? raw.cityName : "",
    status: validStatus,
    attended: Boolean(raw.attended),
    checkedInAt: serializeTimestamp(raw.checkedInAt),
    checkedInBy: typeof raw.checkedInBy === "string" ? raw.checkedInBy : null,
    registeredAt: serializeTimestamp(raw.registeredAt),
    reRegisteredAt: serializeTimestamp(raw.reRegisteredAt),
    cancelledAt: serializeTimestamp(raw.cancelledAt),
    updatedAt: serializeTimestamp(raw.updatedAt),
  };
}

/**
 * Validates that a URL is safe for storage and rendering in href/src attributes.
 * Allows empty string (when optional), relative paths starting with "/", and http(s) URLs.
 * Rejects javascript:, data:, vbscript:, and malformed protocols.
 */
export function isSafeMediaOrWebUrl(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//");
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function sanitizeSafeUrl(
  value: unknown,
  fieldName: string,
  required = false
): { ok: true; value: string } | { ok: false; error: string } {
  if (value === undefined || value === null || String(value).trim() === "") {
    if (required) {
      return { ok: false, error: `${fieldName} is required.` };
    }
    return { ok: true, value: "" };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${fieldName} must be a valid URL string.` };
  }
  const trimmed = value.trim();
  if (!isSafeMediaOrWebUrl(trimmed)) {
    return {
      ok: false,
      error: `${fieldName} must be a valid http://, https://, or relative "/" URL.`,
    };
  }
  return { ok: true, value: trimmed };
}

export function parseNonNegativeInt(
  value: unknown,
  fieldName: string,
  defaultValue = 0
): { ok: true; value: number } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: defaultValue };
  }
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) {
    return {
      ok: false,
      error: `${fieldName} must be a non-negative whole number.`,
    };
  }
  return { ok: true, value: num };
}

export function serializeTimestamp(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val?.toDate === "function") {
    try {
      return val.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (typeof val?._seconds === "number") {
    return new Date(val._seconds * 1000).toISOString();
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString();
  }
  return null;
}

/**
 * Pure read-time normalizer for `city_meetups` documents.
 * Never mutates Firestore. Preserves all historical fields verbatim while
 * classifying legacy archive records cleanly without guessing parent campaigns.
 */
export function normalizeCityMeetupDoc(id: string, raw: Record<string, any> = {}) {
  const hasExplicitType =
    raw.meetupType === "standalone" || raw.meetupType === "campaign_city";
  const hasCampaignId =
    typeof raw.campaignId === "string" && raw.campaignId.trim().length > 0;

  const isLegacyArchive = !hasExplicitType && !hasCampaignId;
  const recordOrigin: RecordOrigin = isLegacyArchive ? "legacy_archive" : "structured";

  const meetupType: MeetupType = hasExplicitType
    ? raw.meetupType
    : hasCampaignId
    ? "campaign_city"
    : "standalone";

  const campaignId: string | null =
    meetupType === "campaign_city" && hasCampaignId ? raw.campaignId.trim() : null;

  const validStatus: MeetupStatus =
    typeof raw.status === "string" &&
    (MEETUP_STATUSES as readonly string[]).includes(raw.status)
      ? (raw.status as MeetupStatus)
      : isLegacyArchive
      ? "completed"
      : "draft";

  const rawCityName = typeof raw.cityName === "string" ? raw.cityName : raw.city || "";
  const resolvedLocation = resolveCanonicalCityLocation({
    cityKey: typeof raw.cityKey === "string" ? raw.cityKey : null,
    cityName: rawCityName,
    mapX: typeof raw.mapX === "number" ? raw.mapX : null,
    mapY: typeof raw.mapY === "number" ? raw.mapY : null,
  });

  return {
    ...raw,
    id,
    recordOrigin,
    meetupType,
    campaignId,
    cityName: rawCityName,
    cityKey: resolvedLocation.key,
    canonicalCityName: resolvedLocation.canonicalName,
    mapX: resolvedLocation.x,
    mapY: resolvedLocation.y,
    mapLabelDy: resolvedLocation.labelDy,
    locationMatched: resolvedLocation.matched,
    title: typeof raw.title === "string" ? raw.title : "",
    venue: typeof raw.venue === "string" ? raw.venue : "",
    img: typeof raw.img === "string" ? raw.img : "",
    status: validStatus,
    eventDate: typeof raw.eventDate === "string" ? raw.eventDate : "",
    startTime: typeof raw.startTime === "string" ? raw.startTime : "",
    endTime: typeof raw.endTime === "string" ? raw.endTime : "",
    registrationDeadline:
      typeof raw.registrationDeadline === "string" ? raw.registrationDeadline : "",
    registrationOpen:
      typeof raw.registrationOpen === "boolean"
        ? raw.registrationOpen
        : false,
    capacity:
      typeof raw.capacity === "number" && Number.isFinite(raw.capacity) && raw.capacity >= 0
        ? raw.capacity
        : 0,
    registeredCount:
      typeof raw.registeredCount === "number" && Number.isFinite(raw.registeredCount) && raw.registeredCount >= 0
        ? raw.registeredCount
        : 0,
    checkedInCount:
      typeof raw.checkedInCount === "number" && Number.isFinite(raw.checkedInCount) && raw.checkedInCount >= 0
        ? raw.checkedInCount
        : 0,
    whatsappGroupLink:
      typeof raw.whatsappGroupLink === "string" ? raw.whatsappGroupLink : "",
    createdAt: serializeTimestamp(raw.createdAt) ?? raw.createdAt ?? null,
    updatedAt: serializeTimestamp(raw.updatedAt) ?? raw.updatedAt ?? null,
  };
}

/**
 * Pure read-time normalizer for `meetup_campaigns` documents.
 * Preserves `city`, `title`, `description`, `img`, `badge`, `logo`, `sortOrder`
 * for full compatibility with `components/cityMeetup.tsx`.
 */
export function normalizeCampaignDoc(
  id: string,
  raw: Record<string, any> = {},
  cityEventsCount = 0
) {
  const validStatus: CampaignStatus =
    typeof raw.status === "string" &&
    (CAMPAIGN_STATUSES as readonly string[]).includes(raw.status)
      ? (raw.status as CampaignStatus)
      : "published";

  return {
    ...raw,
    id,
    city: typeof raw.city === "string" ? raw.city : raw.title || "",
    title: typeof raw.title === "string" ? raw.title : raw.city || "",
    edition: typeof raw.edition === "string" ? raw.edition : "",
    description: typeof raw.description === "string" ? raw.description : "",
    img: typeof raw.img === "string" ? raw.img : "",
    badge: typeof raw.badge === "string" ? raw.badge : "",
    logo: typeof raw.logo === "string" ? raw.logo : "",
    status: validStatus,
    sortOrder:
      typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? raw.sortOrder
        : 0,
    cityEventsCount,
    createdAt: serializeTimestamp(raw.createdAt) ?? raw.createdAt ?? null,
    updatedAt: serializeTimestamp(raw.updatedAt) ?? raw.updatedAt ?? null,
  };
}

export function sanitizeGraphData(graphData: unknown): Array<{ x: string; y: string }> {
  if (!Array.isArray(graphData)) return [];
  return graphData
    .filter((item) => item && typeof item === "object")
    .map((item: any) => ({
      x: item.x !== undefined && item.x !== null ? String(item.x).trim() : "",
      y: item.y !== undefined && item.y !== null ? String(item.y).trim() : "",
    }));
}

/**
 * Single source of truth for whether a city_meetups record belongs in the
 * public completed-meetup showcase (City Meetups page, India map, Homepage).
 *
 * Rules:
 * - Legacy archive records (recordOrigin === "legacy_archive") are historical completed events -> included.
 * - Structured records (both standalone and flagship child-city events) are included ONLY when status === "completed".
 * - Upcoming/active (published, draft, registration_closed) and cancelled events are excluded.
 * - Never infers child completion from parent campaign status.
 */
export function isCompletedPublicMeetup(meetup: {
  recordOrigin?: RecordOrigin | string;
  status?: string;
}): boolean {
  if (!meetup) return false;
  if (meetup.recordOrigin === "legacy_archive") {
    return meetup.status !== "cancelled" && meetup.status !== "draft";
  }
  return meetup.status === "completed";
}

function parseDateToMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (val instanceof Date && !isNaN(val.getTime())) return val.getTime();
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) ? ms : 0;
  }
  const serialized = serializeTimestamp(val);
  if (serialized) {
    const ms = Date.parse(serialized);
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

/**
 * Primary sort key: actual eventDate (newest first).
 * Fallback for legacy records without eventDate: createdAt -> updatedAt -> 0.
 * Never uses alphabetical order, array insertion order, or parent campaign creation date.
 */
export function getMeetupSortTimestamp(meetup: {
  eventDate?: string | null;
  createdAt?: any;
  updatedAt?: any;
}): number {
  const eventMs = parseDateToMs(meetup?.eventDate);
  if (eventMs > 0) return eventMs;
  const createdMs = parseDateToMs(meetup?.createdAt);
  if (createdMs > 0) return createdMs;
  const updatedMs = parseDateToMs(meetup?.updatedAt);
  if (updatedMs > 0) return updatedMs;
  return 0;
}

export function sortMeetupsMostRecentFirst<T extends { eventDate?: string | null; createdAt?: any; updatedAt?: any }>(
  meetups: readonly T[]
): T[] {
  return [...meetups].sort(
    (a, b) => getMeetupSortTimestamp(b) - getMeetupSortTimestamp(a)
  );
}

export interface HomepageMeetupSlide {
  id: string;
  city: string;
  title: string;
  description: string;
  img: string;
  logo: string;
  badge?: string;
  eventDate?: string;
  sortTimestamp: number;
  slideType: "campaign" | "standalone" | "legacy_campaign";
  completedCitiesCount?: number;
}

/**
 * Shared homepage synchronization builder.
 * Ensures the homepage City Meetups slider follows the exact same completed-event
 * and newest-first rules as the public City Meetups page, while preserving the
 * existing slider contract (`city`, `title`, `description`, `img`, `logo`).
 */
export function buildPublicHomepageMeetupSlides(
  meetups: readonly any[],
  campaigns: readonly any[]
): HomepageMeetupSlide[] {
  const completedMeetups = sortMeetupsMostRecentFirst(
    (meetups || []).filter((m) => isCompletedPublicMeetup(m))
  );

  // Group structured completed child events by campaignId
  const completedChildrenByCampaign = new Map<string, any[]>();
  const allChildrenCountByCampaign = new Map<string, number>();

  for (const m of meetups || []) {
    if (m?.meetupType === "campaign_city" && m?.campaignId) {
      allChildrenCountByCampaign.set(
        m.campaignId,
        (allChildrenCountByCampaign.get(m.campaignId) || 0) + 1
      );
    }
  }

  for (const m of completedMeetups) {
    if (m?.meetupType === "campaign_city" && m?.campaignId) {
      const list = completedChildrenByCampaign.get(m.campaignId) || [];
      list.push(m);
      completedChildrenByCampaign.set(m.campaignId, list);
    }
  }

  const slides: HomepageMeetupSlide[] = [];

  // 1. Flagship campaigns that have completed child events (sorted by their newest completed child's eventDate)
  //    AND legacy campaigns (no structured child events yet) that are published/completed
  for (const camp of campaigns || []) {
    if (!camp || camp.status === "draft") continue;
    const completedChildren = completedChildrenByCampaign.get(camp.id) || [];
    const totalLinkedChildren = allChildrenCountByCampaign.get(camp.id) || 0;

    if (completedChildren.length > 0) {
      const newestChild = completedChildren[0]; // already sorted newest-first
      slides.push({
        id: camp.id,
        city: camp.city || camp.title || newestChild.canonicalCityName || newestChild.cityName,
        title: camp.title || camp.city || "Flagship Meetup",
        description: camp.description || "",
        img: camp.img || newestChild.img || "/city-meet/Navrang2.jpg",
        logo: camp.logo || "",
        badge: camp.badge || "",
        eventDate: newestChild.eventDate || "",
        sortTimestamp: getMeetupSortTimestamp(newestChild),
        slideType: "campaign",
        completedCitiesCount: completedChildren.length,
      });
    } else if (totalLinkedChildren === 0 && (camp.status === "published" || camp.status === "completed")) {
      // Legacy campaign slide (historical showcase without structured child docs)
      slides.push({
        id: camp.id,
        city: camp.city || camp.title || "",
        title: camp.title || camp.city || "",
        description: camp.description || "",
        img: camp.img || "/city-meet/Navrang2.jpg",
        logo: camp.logo || "",
        badge: camp.badge || "",
        eventDate: "",
        sortTimestamp: parseDateToMs(camp.createdAt) || parseDateToMs(camp.updatedAt) || 0,
        slideType: "legacy_campaign",
      });
    }
  }

  // 2. Completed structured standalone meetups with an image
  for (const m of completedMeetups) {
    if (m.recordOrigin === "structured" && m.meetupType === "standalone") {
      const displayCity = m.canonicalCityName || m.cityName || "City";
      slides.push({
        id: m.id,
        city: displayCity,
        title: m.title || `${displayCity} Meetup`,
        description:
          m.summary ||
          m.caption ||
          (m.venue ? `Hosted at ${m.venue}` : `Completed Boundless meetup in ${displayCity}.`),
        img: m.img || "/city-meet/Navrang2.jpg",
        logo: "",
        eventDate: m.eventDate || "",
        sortTimestamp: getMeetupSortTimestamp(m),
        slideType: "standalone",
      });
    }
  }

  return slides.sort((a, b) => b.sortTimestamp - a.sortTimestamp);
}
