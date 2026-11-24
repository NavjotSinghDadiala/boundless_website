/**
 * Boundless Team Member Profile Helpers & Normalizer
 * - Zero hashing / zero crypto.
 * - Preserves original member answers while filtering empty / Nil / Nope / N/A placeholders.
 * - Coalesces the 7 repeated Yearbook Final Statement columns into a single `yearbookQuote`.
 * - Supports all 7 departments and multi-department members cleanly.
 */

export type BoundlessDepartmentKey =
  | "trip_coordination"
  | "city_operations"
  | "graphics"
  | "media"
  | "research_outreach"
  | "technicals"
  | "females_corner";

export interface DepartmentMeta {
  key: BoundlessDepartmentKey;
  label: string;
  shortLabel: string;
  tagline: string;
}

export const BOUNDLESS_DEPARTMENTS: readonly DepartmentMeta[] = [
  {
    key: "trip_coordination",
    label: "Trip Coordination",
    shortLabel: "Trips",
    tagline: "Expedition planning, routes, vendors & on-ground leadership",
  },
  {
    key: "city_operations",
    label: "City Operations",
    shortLabel: "City Ops",
    tagline: "City meetups, flagship campaigns & local community experiences",
  },
  {
    key: "graphics",
    label: "Graphics",
    shortLabel: "Graphics",
    tagline: "Visual identity, campaign posters & creative design assets",
  },
  {
    key: "media",
    label: "Media",
    shortLabel: "Media",
    tagline: "Aftermovies, teasers, photography & visual storytelling",
  },
  {
    key: "research_outreach",
    label: "Research & Outreach",
    shortLabel: "Outreach",
    tagline: "Sponsorships, brand partnerships & strategic collaborations",
  },
  {
    key: "technicals",
    label: "Technicals",
    shortLabel: "Technicals",
    tagline: "Web engineering, platform architecture & digital systems",
  },
  {
    key: "females_corner",
    label: "Females Corner",
    shortLabel: "Females Corner",
    tagline: "Inclusive initiatives, community engagement & safe travel leadership",
  },
] as const;

const DEPT_BY_KEY = new Map<BoundlessDepartmentKey, DepartmentMeta>(
  BOUNDLESS_DEPARTMENTS.map((d) => [d.key, d])
);

export interface ProfileContributionItem {
  key: string;
  label: string;
  value: string;
  displayAs?: "stat" | "highlight" | "narrative" | "tags";
}

export interface ProfileMediaItem {
  url: string;
  kind: "image" | "video" | "external_link";
  title?: string;
  caption?: string;
}

export interface DepartmentContributionSection {
  departmentKey: BoundlessDepartmentKey;
  departmentLabel: string;
  items: ProfileContributionItem[];
  media?: ProfileMediaItem[];
}

export interface TeamMemberSocialLinks {
  linkedin?: string;
  instagram?: string;
  github?: string;
  twitter?: string;
  youtube?: string;
  portfolio?: string;
  other?: Array<{ label: string; url: string }>;
}

export interface ExtracurricularActivity {
  id?: string;
  title: string;
  description?: string;
  category?: string;
  year?: string;
  image?: string;
  link?: string;
}

export interface TeamMemberProfileData {
  joinedTerm?: string;
  currentPosition?: string;
  firstRoleAndDept?: string;
  personalGrowth?: string;
  departments?: BoundlessDepartmentKey[];
  yearbookQuote?: string;
  departmentSections?: DepartmentContributionSection[];
  socialLinks?: TeamMemberSocialLinks;
  extracurricularActivities?: ExtracurricularActivity[];
  profilePublished?: boolean;
}

export interface DepartmentTeamMember {
  id: string;
  name: string;
}

export interface TeamMemberRecord {
  id: string;
  slug: string;
  name: string;
  role: string;
  image: string;
  type: "founder" | "council" | "dept_head" | string;
  term: string;
  sortOrder: number;
  departmentTeam?: DepartmentTeamMember[];
  profile?: TeamMemberProfileData | null;
}

/**
 * Validates and normalizes an HOD's `departmentTeam` array.
 * - No hashing: generates plain sequential timestamp IDs when missing.
 * - Rejects non-arrays, empty names, or overly long names.
 */
export function sanitizeDepartmentTeam(
  input: unknown
): { ok: true; team: DepartmentTeamMember[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: "departmentTeam must be an array." };
  }
  if (input.length > 100) {
    return { ok: false, error: "A single HOD team cannot exceed 100 members." };
  }

  const seenIds = new Set<string>();
  const team: DepartmentTeamMember[] = [];
  const now = Date.now();

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (!item || typeof item !== "object") {
      return { ok: false, error: `Invalid team member entry at position ${i + 1}.` };
    }
    const rawName = typeof (item as any).name === "string" ? (item as any).name.trim() : "";
    if (!rawName) {
      return { ok: false, error: `Team member name at position ${i + 1} cannot be empty.` };
    }
    if (rawName.length > 80) {
      return {
        ok: false,
        error: `Team member name "${rawName.slice(0, 24)}..." exceeds 80 characters.`,
      };
    }

    let id =
      typeof (item as any).id === "string" && (item as any).id.trim()
        ? (item as any).id.trim()
        : `tm-${now}-${i + 1}`;
    if (seenIds.has(id)) {
      id = `tm-${now}-${i + 1}`;
    }
    seenIds.add(id);
    team.push({ id, name: rawName });
  }

  return { ok: true, team };
}

const EMPTY_PLACEHOLDERS = new Set([
  "",
  "nil",
  "n/a",
  "na",
  "none",
  "nope",
  "no",
  "nothing",
  "null",
  "undefined",
  "-",
  "--",
  "—",
  ".",
  "..",
  "...",
  "not applicable",
]);

/**
 * Returns true only for meaningful non-placeholder member answers.
 */
export function isMeaningfulAnswer(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !EMPTY_PLACEHOLDERS.has(trimmed.toLowerCase());
}

export function cleanAnswer(value: unknown): string | undefined {
  if (!isMeaningfulAnswer(value)) return undefined;
  return value.trim();
}

/**
 * Deterministic, human-readable slug without hashing.
 */
export function slugifyMemberName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getMemberSlug(member: { slug?: string; name?: string; id?: string }): string {
  if (typeof member?.slug === "string" && member.slug.trim()) {
    return slugifyMemberName(member.slug);
  }
  const fromName = slugifyMemberName(member?.name || "");
  return fromName || String(member?.id || "").trim();
}

/**
 * Protocol-safe URL sanitizer (allows https://, http://, and single-slash relative paths).
 */
export function sanitizeProfileUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? null : trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Shared Cloudinary dynamic edge transformation helper (mirrors homepage MemoriesInMotion).
 */
export function optimizeMemberImageUrl(rawUrl: string, width = 900): string {
  if (!rawUrl || !rawUrl.includes("res.cloudinary.com") || !rawUrl.includes("/image/upload/")) {
    return rawUrl;
  }
  const transform = `f_webp,q_auto:good,w_${width},c_limit`;
  if (rawUrl.includes(`/image/upload/${transform}/`)) {
    return rawUrl;
  }
  return rawUrl.replace("/image/upload/", `/image/upload/${transform}/`);
}

export function mapDepartmentNameToKey(raw: string): BoundlessDepartmentKey | null {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return null;
  if (s.includes("trip")) return "trip_coordination";
  if (s.includes("city")) return "city_operations";
  if (s.includes("graphic")) return "graphics";
  if (s.includes("media")) return "media";
  if (s.includes("research") || s.includes("outreach") || s.includes("sponsor")) {
    return "research_outreach";
  }
  if (s.includes("tech")) return "technicals";
  if (s.includes("female")) return "females_corner";
  return null;
}

export function getDepartmentMeta(key: BoundlessDepartmentKey): DepartmentMeta {
  return (
    DEPT_BY_KEY.get(key) || {
      key,
      label: key,
      shortLabel: key,
      tagline: "",
    }
  );
}

/**
 * Converts a semicolon- or newline-delimited list of URLs (e.g. Google Drive uploads)
 * into safe ProfileMediaItem entries. Google Drive links are always kept as safe
 * `external_link` cards (never broken <img> tags).
 */
export function parseProfileMediaList(
  rawValue: unknown,
  defaultTitlePrefix = "Work Sample"
): ProfileMediaItem[] {
  if (Array.isArray(rawValue)) {
    const items: ProfileMediaItem[] = [];
    for (let i = 0; i < rawValue.length; i++) {
      const entry = rawValue[i];
      if (!entry || typeof entry !== "object") continue;
      const safeUrl = sanitizeProfileUrl((entry as any).url);
      if (!safeUrl) continue;
      const isDrive = safeUrl.includes("drive.google.com");
      const kind = isDrive
        ? "external_link"
        : (entry as any).kind === "image" || (entry as any).kind === "video"
        ? (entry as any).kind
        : "external_link";
      items.push({
        url: safeUrl,
        kind,
        title: cleanAnswer((entry as any).title) || `${defaultTitlePrefix} ${i + 1}`,
        caption: cleanAnswer((entry as any).caption),
      });
    }
    return items;
  }

  if (typeof rawValue !== "string" || !isMeaningfulAnswer(rawValue)) return [];
  const parts = rawValue
    .split(/[;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const items: ProfileMediaItem[] = [];
  parts.forEach((part, idx) => {
    const safeUrl = sanitizeProfileUrl(part);
    if (!safeUrl) return;
    const isDrive = safeUrl.includes("drive.google.com");
    const isDirectImage =
      !isDrive && /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(safeUrl);
    items.push({
      url: safeUrl,
      kind: isDirectImage ? "image" : "external_link",
      title: `${defaultTitlePrefix} ${idx + 1}`,
      caption: isDrive ? "Hosted on Google Drive — opens in a new tab" : undefined,
    });
  });
  return items;
}

/**
 * Normalizes a TeamMemberProfileData object, stripping empty/Nil/Nope items
 * and omitting empty department sections cleanly.
 */
export function normalizeTeamMemberProfile(
  raw: Record<string, any> | null | undefined
): TeamMemberProfileData | null {
  if (!raw || typeof raw !== "object") return null;

  const sections: DepartmentContributionSection[] = [];
  const discoveredDepts = new Set<BoundlessDepartmentKey>();

  if (Array.isArray(raw.departments)) {
    for (const d of raw.departments) {
      const key =
        typeof d === "string" && DEPT_BY_KEY.has(d as BoundlessDepartmentKey)
          ? (d as BoundlessDepartmentKey)
          : mapDepartmentNameToKey(String(d || ""));
      if (key) discoveredDepts.add(key);
    }
  }

  if (Array.isArray(raw.departmentSections)) {
    for (const sec of raw.departmentSections) {
      if (!sec || typeof sec !== "object") continue;
      const key =
        typeof sec.departmentKey === "string" &&
        DEPT_BY_KEY.has(sec.departmentKey as BoundlessDepartmentKey)
          ? (sec.departmentKey as BoundlessDepartmentKey)
          : mapDepartmentNameToKey(String(sec.departmentLabel || ""));
      if (!key) continue;

      const cleanItems: ProfileContributionItem[] = [];
      if (Array.isArray(sec.items)) {
        for (const item of sec.items) {
          if (!item || typeof item !== "object") continue;
          const val = cleanAnswer(item.value);
          if (!val) continue;
          cleanItems.push({
            key: String(item.key || item.label || "item"),
            label: String(item.label || "Highlight").trim(),
            value: val,
            displayAs: item.displayAs || "narrative",
          });
        }
      }

      const cleanMedia = parseProfileMediaList(
        sec.media,
        `${getDepartmentMeta(key).shortLabel} Sample`
      );

      if (cleanItems.length > 0 || cleanMedia.length > 0) {
        discoveredDepts.add(key);
        sections.push({
          departmentKey: key,
          departmentLabel: getDepartmentMeta(key).label,
          items: cleanItems,
          media: cleanMedia.length > 0 ? cleanMedia : undefined,
        });
      }
    }
  }

  const socialLinks: TeamMemberSocialLinks = {};
  if (raw.socialLinks && typeof raw.socialLinks === "object") {
    for (const field of [
      "linkedin",
      "instagram",
      "github",
      "twitter",
      "youtube",
      "portfolio",
    ] as const) {
      const safe = sanitizeProfileUrl(raw.socialLinks[field]);
      if (safe) socialLinks[field] = safe;
    }
    if (Array.isArray(raw.socialLinks.other)) {
      const cleanOther = raw.socialLinks.other
        .filter((item: any) => item && typeof item === "object")
        .map((item: any) => {
          const url = sanitizeProfileUrl(item.url);
          const label = cleanAnswer(item.label);
          return url ? { label: label || "Website", url } : null;
        })
        .filter((item: any): item is { label: string; url: string } => Boolean(item));
      if (cleanOther.length > 0) {
        socialLinks.other = cleanOther;
      }
    }
  }

  const extracurricularActivities: ExtracurricularActivity[] = [];
  if (Array.isArray(raw.extracurricularActivities)) {
    for (let i = 0; i < raw.extracurricularActivities.length; i++) {
      const act = raw.extracurricularActivities[i];
      if (!act || typeof act !== "object") continue;
      const title = cleanAnswer(act.title);
      const description = cleanAnswer(act.description);
      if (!title && !description) continue;
      const safeImage = sanitizeProfileUrl(act.image) || undefined;
      const safeLink = sanitizeProfileUrl(act.link) || undefined;
      extracurricularActivities.push({
        id: cleanAnswer(act.id) || `activity-${i + 1}`,
        title: title || "Extracurricular Highlight",
        description,
        category: cleanAnswer(act.category),
        year: cleanAnswer(act.year),
        image: safeImage,
        link: safeLink,
      });
    }
  }

  const normalized: TeamMemberProfileData = {
    joinedTerm: cleanAnswer(raw.joinedTerm),
    currentPosition: cleanAnswer(raw.currentPosition),
    firstRoleAndDept: cleanAnswer(raw.firstRoleAndDept),
    personalGrowth: cleanAnswer(raw.personalGrowth),
    departments: discoveredDepts.size > 0 ? Array.from(discoveredDepts) : undefined,
    yearbookQuote: cleanAnswer(raw.yearbookQuote),
    departmentSections: sections.length > 0 ? sections : undefined,
    socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    extracurricularActivities:
      extracurricularActivities.length > 0 ? extracurricularActivities : undefined,
    profilePublished:
      typeof raw.profilePublished === "boolean" ? raw.profilePublished : true,
  };

  const hasAnyContent = Boolean(
    normalized.joinedTerm ||
      normalized.firstRoleAndDept ||
      normalized.personalGrowth ||
      normalized.yearbookQuote ||
      (normalized.departmentSections && normalized.departmentSections.length > 0) ||
      normalized.socialLinks ||
      (normalized.extracurricularActivities &&
        normalized.extracurricularActivities.length > 0)
  );

  return hasAnyContent ? normalized : null;
}

/**
 * Pure read-time normalizer for a `team_members` document.
 */
export function normalizeTeamMember(
  id: string,
  raw: Record<string, any> = {}
): TeamMemberRecord {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const slug = getMemberSlug({ slug: raw.slug, name, id });
  const rawImage = typeof raw.image === "string" ? raw.image : raw.src || "";

  const rawTeam = Array.isArray(raw.departmentTeam)
    ? raw.departmentTeam
        .filter((m: any) => m && typeof m === "object" && typeof m.name === "string" && m.name.trim())
        .map((m: any, idx: number) => ({
          id: typeof m.id === "string" && m.id.trim() ? m.id.trim() : `tm-${idx + 1}`,
          name: m.name.trim(),
        }))
    : undefined;

  return {
    id,
    slug,
    name: name || "Boundless Member",
    role: typeof raw.role === "string" ? raw.role.trim() : "Member",
    image: sanitizeProfileUrl(rawImage) || "",
    type: typeof raw.type === "string" ? raw.type : "council",
    term: typeof raw.term === "string" ? raw.term : "",
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : Number(raw.sortOrder) || 0,
    ...(raw.type === "dept_head" && rawTeam ? { departmentTeam: rawTeam } : {}),
    profile: normalizeTeamMemberProfile(raw.profile),
  };
}

/**
 * Pure CSV-to-Profile normalizer matching the 53-column Google Form export
 * (`CORE MEMBER - PROFILE FORM.csv`). Used for isolated verification and future admin import.
 * Never writes to Firestore.
 */
export function normalizeCsvRowToProfile(row: readonly string[]): {
  fullName: string;
  slug: string;
  profile: TeamMemberProfileData;
} {
  const cell = (idx: number) => (idx < row.length ? cleanAnswer(row[idx]) : undefined);

  const fullName = cell(2) || "Boundless Member";
  const joinedTerm = cell(3);
  const currentPosition = cell(4);
  const firstRoleAndDept = cell(5);
  const personalGrowth = cell(6);
  const rawDepts = cell(7) || "";

  const departments = rawDepts
    .split(/[,;/]+/)
    .map((d) => mapDepartmentNameToKey(d))
    .filter((k): k is BoundlessDepartmentKey => Boolean(k));

  // Coalesce the 7 repeated "Final Statement" columns (14, 20, 25, 32, 39, 45, 52)
  const quoteColumns = [14, 20, 25, 32, 39, 45, 52];
  let yearbookQuote: string | undefined;
  for (const colIdx of quoteColumns) {
    const q = cell(colIdx);
    if (q) {
      yearbookQuote = q;
      break;
    }
  }

  const departmentSections: DepartmentContributionSection[] = [];

  const pushSection = (
    departmentKey: BoundlessDepartmentKey,
    entries: Array<{ key: string; label: string; col: number; displayAs?: ProfileContributionItem["displayAs"] }>,
    mediaCol?: number
  ) => {
    const items: ProfileContributionItem[] = [];
    for (const e of entries) {
      const val = cell(e.col);
      if (val) {
        items.push({
          key: e.key,
          label: e.label,
          value: val,
          displayAs: e.displayAs || "narrative",
        });
      }
    }
    const media =
      mediaCol !== undefined
        ? parseProfileMediaList(
            row[mediaCol],
            `${getDepartmentMeta(departmentKey).shortLabel} Showcase`
          )
        : [];
    if (items.length > 0 || media.length > 0) {
      departmentSections.push({
        departmentKey,
        departmentLabel: getDepartmentMeta(departmentKey).label,
        items,
        media: media.length > 0 ? media : undefined,
      });
    }
  };

  // 1. Trip Coordination (Cols 08–13)
  pushSection("trip_coordination", [
    { key: "tripsContributed", label: "Trips Contributed Overall", col: 9, displayAs: "stat" },
    { key: "tripsLed", label: "Trips Planned / Led / Co-Led", col: 10, displayAs: "stat" },
    { key: "onGroundCount", label: "On-Ground Coordinator Appearances", col: 11, displayAs: "stat" },
    { key: "proudTrip", label: "Proudest Trip / Project", col: 12, displayAs: "highlight" },
    { key: "firstProject", label: "First Project in Trip Coordination", col: 8, displayAs: "narrative" },
    { key: "journeyNote", label: "Trip Coordination Journey", col: 13, displayAs: "narrative" },
  ]);

  // 2. City Operations (Cols 15–19)
  pushSection("city_operations", [
    { key: "eventsContributed", label: "City Events Contributed To", col: 15, displayAs: "stat" },
    { key: "eventsOrganised", label: "Events Organised / Co-Organised", col: 16, displayAs: "stat" },
    { key: "participantsHandled", label: "Participants & Cities Handled", col: 17, displayAs: "stat" },
    { key: "proudEvent", label: "Proudest City Operations Event", col: 18, displayAs: "highlight" },
    { key: "journeyNote", label: "City Operations Journey", col: 19, displayAs: "narrative" },
  ]);

  // 3. Graphics (Cols 21–24)
  pushSection(
    "graphics",
    [
      { key: "designsCount", label: "Designs & Creative Assets", col: 21, displayAs: "stat" },
      { key: "majorEvents", label: "Major Boundless Events Designed For", col: 22, displayAs: "highlight" },
      { key: "journeyNote", label: "Graphics Team Journey", col: 23, displayAs: "narrative" },
    ],
    24
  );

  // 4. Media (Cols 26–31)
  pushSection(
    "media",
    [
      { key: "projectsCovered", label: "Total Projects Covered", col: 26, displayAs: "stat" },
      { key: "favouriteContent", label: "Favourite Piece of Content", col: 28, displayAs: "highlight" },
      { key: "majorProjects", label: "Major Boundless Projects Covered", col: 27, displayAs: "narrative" },
      { key: "skillEvolution", label: "How Media Skills Evolved", col: 29, displayAs: "narrative" },
      { key: "journeyNote", label: "Media Team Journey", col: 30, displayAs: "narrative" },
    ],
    31
  );

  // 5. Research & Outreach (Cols 33–38)
  pushSection("research_outreach", [
    { key: "significantPartnership", label: "Most Significant Sponsorship / Partnership", col: 35, displayAs: "highlight" },
    { key: "milestone", label: "Defining Milestone or Collaboration", col: 37, displayAs: "highlight" },
    { key: "majorContributions", label: "Major Sponsorship & Partnership Contributions", col: 33, displayAs: "narrative" },
    { key: "initiatives", label: "Events & Initiatives Supported", col: 34, displayAs: "narrative" },
    { key: "impact", label: "Impact on Events, Costs & Member Value", col: 36, displayAs: "narrative" },
    { key: "journeyNote", label: "Research & Outreach Journey", col: 38, displayAs: "narrative" },
  ]);

  // 6. Technicals (Cols 40–44)
  pushSection("technicals", [
    { key: "systemAreas", label: "Areas Worked On", col: 41, displayAs: "tags" },
    { key: "buildType", label: "Contribution Type", col: 42, displayAs: "tags" },
    { key: "proudProject", label: "Project Most Proud Of", col: 43, displayAs: "highlight" },
    { key: "projects", label: "Technical Projects Contributed To", col: 40, displayAs: "narrative" },
    { key: "journeyNote", label: "Technicals Journey", col: 44, displayAs: "narrative" },
  ]);

  // 7. Females Corner (Cols 46–51)
  pushSection("females_corner", [
    { key: "areasContributed", label: "Areas Contributed To", col: 48, displayAs: "tags" },
    { key: "significantContribution", label: "Most Significant Contribution", col: 49, displayAs: "highlight" },
    { key: "responsibilities", label: "Responsibilities Handled", col: 46, displayAs: "narrative" },
    { key: "roleEvolution", label: "Role Evolution & On-Ground Coordination", col: 47, displayAs: "narrative" },
    { key: "initiatives", label: "Trips & Initiatives Supported", col: 50, displayAs: "narrative" },
    { key: "journeyNote", label: "Females Corner Journey", col: 51, displayAs: "narrative" },
  ]);

  const profile =
    normalizeTeamMemberProfile({
      joinedTerm,
      currentPosition,
      firstRoleAndDept,
      personalGrowth,
      departments,
      yearbookQuote,
      departmentSections,
      profilePublished: true,
    }) || {};

  return {
    fullName,
    slug: slugifyMemberName(fullName),
    profile,
  };
}
