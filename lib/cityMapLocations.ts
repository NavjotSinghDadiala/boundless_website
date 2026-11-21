/**
 * Canonical India Map City Locations — Single Source of Truth.
 * Derived directly from the existing IndiaMap SVG coordinates (viewBox="0 0 612 696").
 * Used by:
 * - Admin Add/Edit City Meetup searchable dropdown
 * - Public City Meetups India map marker rendering
 * - Read-time normalization of legacy city names (without inventing fake coordinates)
 *
 * Gaya and Patna coordinates include a small, geographically natural separation
 * and opposite label vertical offsets so both markers are independently clickable.
 */

export interface CanonicalCityLocation {
  key: string;
  canonicalName: string;
  aliases: string[];
  x: number;
  y: number;
  labelDy?: number;
}

export const CANONICAL_CITY_LOCATIONS: readonly CanonicalCityLocation[] = [
  { key: "ahmedabad", canonicalName: "Ahmedabad", aliases: [], x: 110, y: 335 },
  { key: "amritsar", canonicalName: "Amritsar", aliases: [], x: 180, y: 155 },
  { key: "aurangabad", canonicalName: "Aurangabad", aliases: ["chhatrapati sambhajinagar"], x: 170, y: 420 },
  { key: "bangalore", canonicalName: "Bangalore", aliases: ["bengaluru"], x: 205, y: 555 },
  { key: "bhopal", canonicalName: "Bhopal", aliases: [], x: 225, y: 340 },
  { key: "bhubaneswar", canonicalName: "Bhubaneswar", aliases: [], x: 390, y: 410 },
  { key: "chandigarh", canonicalName: "Chandigarh", aliases: [], x: 205, y: 170 },
  { key: "chennai", canonicalName: "Chennai", aliases: ["madras"], x: 245, y: 580 },
  { key: "coimbatore", canonicalName: "Coimbatore", aliases: [], x: 195, y: 615 },
  { key: "dehradun", canonicalName: "Dehradun", aliases: [], x: 230, y: 170 },
  { key: "delhi", canonicalName: "Delhi", aliases: ["new delhi", "ncr", "delhi ncr"], x: 210, y: 205 },
  { key: "dhanbad", canonicalName: "Dhanbad", aliases: [], x: 390, y: 300 },
  { key: "gandhinagar", canonicalName: "Gandhinagar", aliases: [], x: 110, y: 325 },
  // Gaya & Patna: small geographically faithful offset + opposite label offsets to prevent overlap
  { key: "gaya", canonicalName: "Gaya", aliases: [], x: 370, y: 278, labelDy: 14 },
  { key: "goa", canonicalName: "Goa", aliases: ["panaji"], x: 125, y: 515 },
  { key: "gorakhpur", canonicalName: "Gorakhpur", aliases: [], x: 335, y: 240 },
  { key: "guwahati", canonicalName: "Guwahati", aliases: [], x: 500, y: 240 },
  { key: "gwalior", canonicalName: "Gwalior", aliases: [], x: 215, y: 275 },
  { key: "hyderabad", canonicalName: "Hyderabad", aliases: [], x: 235, y: 480 },
  { key: "indore", canonicalName: "Indore", aliases: [], x: 200, y: 345 },
  { key: "jabalpur", canonicalName: "Jabalpur", aliases: [], x: 265, y: 340 },
  { key: "jaipur", canonicalName: "Jaipur", aliases: [], x: 175, y: 250 },
  { key: "jammu", canonicalName: "Jammu", aliases: [], x: 170, y: 110 },
  { key: "jamshedpur", canonicalName: "Jamshedpur", aliases: [], x: 395, y: 325 },
  { key: "jodhpur", canonicalName: "Jodhpur", aliases: [], x: 120, y: 250 },
  { key: "kanpur", canonicalName: "Kanpur", aliases: [], x: 280, y: 260 },
  { key: "kochi", canonicalName: "Kochi", aliases: ["cochin"], x: 185, y: 640 },
  { key: "kolkata", canonicalName: "Kolkata", aliases: ["calcutta"], x: 420, y: 340 },
  { key: "lucknow", canonicalName: "Lucknow", aliases: [], x: 280, y: 240 },
  { key: "madurai", canonicalName: "Madurai", aliases: [], x: 215, y: 635 },
  { key: "mumbai", canonicalName: "Mumbai", aliases: ["bombay"], x: 120, y: 435 },
  { key: "nagpur", canonicalName: "Nagpur", aliases: [], x: 260, y: 375 },
  { key: "nashik", canonicalName: "Nashik", aliases: ["nasik"], x: 135, y: 415 },
  { key: "patna", canonicalName: "Patna", aliases: [], x: 382, y: 254, labelDy: -10 },
  { key: "prayagraj", canonicalName: "Prayagraj", aliases: ["allahabad"], x: 310, y: 275 },
  { key: "pune", canonicalName: "Pune", aliases: [], x: 130, y: 455 },
  { key: "raipur", canonicalName: "Raipur", aliases: [], x: 310, y: 385 },
  { key: "rajkot", canonicalName: "Rajkot", aliases: [], x: 75, y: 350 },
  { key: "ranchi", canonicalName: "Ranchi", aliases: [], x: 375, y: 320 },
  { key: "salem", canonicalName: "Salem", aliases: [], x: 220, y: 600 },
  { key: "shimla", canonicalName: "Shimla", aliases: [], x: 215, y: 150 },
  { key: "srinagar", canonicalName: "Srinagar", aliases: [], x: 170, y: 90 },
  { key: "surat", canonicalName: "Surat", aliases: [], x: 105, y: 390 },
  { key: "tezpur", canonicalName: "Tezpur", aliases: [], x: 525, y: 230 },
  { key: "thiruvananthapuram", canonicalName: "Thiruvananthapuram", aliases: ["trivandrum"], x: 190, y: 670 },
  { key: "udaipur", canonicalName: "Udaipur", aliases: [], x: 130, y: 290 },
  { key: "vadodara", canonicalName: "Vadodara", aliases: ["baroda"], x: 115, y: 365 },
  { key: "varanasi", canonicalName: "Varanasi", aliases: ["banaras", "benares"], x: 330, y: 270 },
  { key: "vijayawada", canonicalName: "Vijayawada", aliases: [], x: 265, y: 500 },
  { key: "visakhapatnam", canonicalName: "Visakhapatnam", aliases: ["vizag"], x: 305, y: 470 },
] as const;

const LOOKUP_BY_TERM = new Map<string, CanonicalCityLocation>();
for (const loc of CANONICAL_CITY_LOCATIONS) {
  LOOKUP_BY_TERM.set(loc.key.toLowerCase(), loc);
  LOOKUP_BY_TERM.set(loc.canonicalName.toLowerCase(), loc);
  for (const alias of loc.aliases) {
    LOOKUP_BY_TERM.set(alias.toLowerCase(), loc);
  }
}

export interface ResolvedCityLocation {
  matched: boolean;
  key: string | null;
  canonicalName: string;
  x: number | null;
  y: number | null;
  labelDy: number;
}

/**
 * Resolves a city string or stored cityKey/coordinates to a canonical India map location.
 * Never invents fake coordinates for unmatched legacy names.
 */
export function resolveCanonicalCityLocation(input: {
  cityKey?: string | null;
  cityName?: string | null;
  mapX?: number | null;
  mapY?: number | null;
}): ResolvedCityLocation {
  const rawKey = typeof input.cityKey === "string" ? input.cityKey.trim().toLowerCase() : "";
  const rawName = typeof input.cityName === "string" ? input.cityName.trim() : "";
  const cleanName = rawName.toLowerCase();

  // 1. Exact lookup by cityKey
  if (rawKey && LOOKUP_BY_TERM.has(rawKey)) {
    const loc = LOOKUP_BY_TERM.get(rawKey)!;
    return {
      matched: true,
      key: loc.key,
      canonicalName: loc.canonicalName,
      x: loc.x,
      y: loc.y,
      labelDy: loc.labelDy ?? -10,
    };
  }

  // 2. Exact lookup by cityName or alias
  if (cleanName && LOOKUP_BY_TERM.has(cleanName)) {
    const loc = LOOKUP_BY_TERM.get(cleanName)!;
    return {
      matched: true,
      key: loc.key,
      canonicalName: loc.canonicalName,
      x: loc.x,
      y: loc.y,
      labelDy: loc.labelDy ?? -10,
    };
  }

  // 3. Safe word-boundary token match for legacy names like "Mumbai Meetup" or "Dhanbad Trials"
  if (cleanName) {
    const tokens = cleanName.split(/[^a-z]+/).filter(Boolean);
    const matchedLocations = new Map<string, CanonicalCityLocation>();
    for (const token of tokens) {
      const hit = LOOKUP_BY_TERM.get(token);
      if (hit) matchedLocations.set(hit.key, hit);
    }
    if (matchedLocations.size === 1) {
      const loc = Array.from(matchedLocations.values())[0];
      return {
        matched: true,
        key: loc.key,
        canonicalName: loc.canonicalName,
        x: loc.x,
        y: loc.y,
        labelDy: loc.labelDy ?? -10,
      };
    }
  }

  // 4. Stored explicit numeric coordinates fallback (only if explicitly persisted)
  if (
    typeof input.mapX === "number" &&
    Number.isFinite(input.mapX) &&
    typeof input.mapY === "number" &&
    Number.isFinite(input.mapY)
  ) {
    return {
      matched: true,
      key: rawKey || null,
      canonicalName: rawName || "Unknown City",
      x: input.mapX,
      y: input.mapY,
      labelDy: -10,
    };
  }

  // 5. Unmatched legacy location — do NOT invent coordinates
  return {
    matched: false,
    key: null,
    canonicalName: rawName || "Unknown City",
    x: null,
    y: null,
    labelDy: -10,
  };
}
