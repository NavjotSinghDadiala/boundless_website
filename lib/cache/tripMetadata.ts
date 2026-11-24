/**
 * Strict separation between static public Trip editorial metadata (safe to cache in Redis)
 * and live transactional/capacity fields (MUST ALWAYS be read fresh from Firestore).
 */

export const LIVE_TRIP_CAPACITY_FIELDS = [
  "totalSeats",
  "femaleReservedSeats",
  "maleReservedSeats",
  "releasedSeats",
  "releasedSeatsType",
  "femaleJoined",
  "totalJoined",
  "registrationOpen",
  "isCompleted",
  "finalRosterSaved",
] as const;

export type LiveTripCapacityField = (typeof LIVE_TRIP_CAPACITY_FIELDS)[number];

export interface PublicTripStaticMetadata {
  id: string;
  name: string;
  description: string;
  destination: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  itinerary: unknown[];
  itineraryLink: string;
  faqs: unknown[];
  consentStatements: unknown[];
  importantInformation: string;
  thingsToCarry: string[];
  coordinators: unknown[];
  form: unknown;
  consentFormTemplateUrl: string;
  consentTemplates: unknown[];
  images: unknown[];
  fee: number;
  whatsappLink: "";
  qrCodeUrl: "";
  emailsDisabled: false;
  cityWhatsappSettings: Record<string, never>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LiveTripCapacitySnapshot {
  totalSeats: number | undefined;
  femaleReservedSeats: number | undefined;
  maleReservedSeats: number;
  releasedSeats: number | undefined;
  releasedSeatsType: unknown;
  femaleJoined: number;
  totalJoined: number;
  registrationOpen: boolean;
  isCompleted: boolean;
  finalRosterSaved: boolean;
}

/**
 * Extracts ONLY static public editorial metadata from a formatted public trip object.
 * Guarantees no live capacity, seat count, waitlist, or booking decision fields are stored in Redis.
 */
export function extractStaticTripMetadata(
  formattedPublicTrip: Record<string, unknown>
): PublicTripStaticMetadata {
  const staticCopy: Record<string, unknown> = { ...formattedPublicTrip };

  for (const liveField of LIVE_TRIP_CAPACITY_FIELDS) {
    delete staticCopy[liveField];
  }

  delete staticCopy._isUserAssigned;

  return {
    id: String(staticCopy.id || ""),
    name: String(staticCopy.name || ""),
    description: String(staticCopy.description || ""),
    destination: String(staticCopy.destination || ""),
    startDate: String(staticCopy.startDate || ""),
    endDate: String(staticCopy.endDate || ""),
    registrationDeadline: String(staticCopy.registrationDeadline || ""),
    itinerary: Array.isArray(staticCopy.itinerary) ? staticCopy.itinerary : [],
    itineraryLink: String(staticCopy.itineraryLink || ""),
    faqs: Array.isArray(staticCopy.faqs) ? staticCopy.faqs : [],
    consentStatements: Array.isArray(staticCopy.consentStatements)
      ? staticCopy.consentStatements
      : [],
    importantInformation: String(staticCopy.importantInformation || ""),
    thingsToCarry: Array.isArray(staticCopy.thingsToCarry)
      ? (staticCopy.thingsToCarry as string[])
      : [],
    coordinators: Array.isArray(staticCopy.coordinators) ? staticCopy.coordinators : [],
    form: staticCopy.form,
    consentFormTemplateUrl: String(staticCopy.consentFormTemplateUrl || ""),
    consentTemplates: Array.isArray(staticCopy.consentTemplates)
      ? staticCopy.consentTemplates
      : [],
    images: Array.isArray(staticCopy.images) ? staticCopy.images : [],
    fee: staticCopy.fee !== undefined ? Number(staticCopy.fee) : 500,
    whatsappLink: "",
    qrCodeUrl: "",
    emailsDisabled: false,
    cityWhatsappSettings: {},
    createdAt: (staticCopy.createdAt as string | null) ?? null,
    updatedAt: (staticCopy.updatedAt as string | null) ?? null,
  };
}

/**
 * Extracts live capacity and booking-status fields directly from a live Firestore trip document.
 */
export function extractLiveTripCapacity(
  liveDocData: Record<string, unknown>
): LiveTripCapacitySnapshot {
  const totalSeats =
    liveDocData.totalSeats !== undefined ? Number(liveDocData.totalSeats) : undefined;
  const femaleReservedSeats =
    liveDocData.femaleReservedSeats !== undefined
      ? Number(liveDocData.femaleReservedSeats)
      : undefined;
  const maleReservedSeats =
    liveDocData.maleReservedSeats !== undefined
      ? Number(liveDocData.maleReservedSeats)
      : Math.max(0, (totalSeats || 0) - (femaleReservedSeats || 0));

  return {
    totalSeats,
    femaleReservedSeats,
    maleReservedSeats,
    releasedSeats:
      liveDocData.releasedSeats !== undefined ? Number(liveDocData.releasedSeats) : undefined,
    releasedSeatsType: liveDocData.releasedSeatsType,
    femaleJoined: Number(liveDocData.femaleJoined || 0),
    totalJoined: Number(liveDocData.totalJoined || 0),
    registrationOpen: liveDocData.registrationOpen !== false,
    isCompleted: Boolean(liveDocData.isCompleted),
    finalRosterSaved: Boolean(liveDocData.finalRosterSaved),
  };
}

/**
 * Combines cached static public trip metadata with authoritative live Firestore capacity fields
 * so the existing `/api/trip` response contract is preserved 100% with zero stale seat counts.
 */
export function mergeStaticAndLiveTrip(
  staticMeta: PublicTripStaticMetadata,
  liveDocData: Record<string, unknown>
) {
  return {
    ...staticMeta,
    ...extractLiveTripCapacity(liveDocData),
  };
}
