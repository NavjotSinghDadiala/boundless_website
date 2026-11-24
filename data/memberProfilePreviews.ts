import {
  normalizeTeamMemberProfile,
  type TeamMemberProfileData,
  type TeamMemberRecord,
} from "@/lib/teamProfiles";

/**
 * Phase 2 Preview / Mock Profile Dataset (Local Read-Only Preview — Zero Firestore Writes).
 * Allows immediate visual & functional verification of the reusable profile template
 * across single-department, multi-department, creative-media, and basic-profile members
 * before any production CSV import is authorized.
 */

export const MEMBER_PROFILE_PREVIEWS: Record<string, TeamMemberProfileData> = {
  "shubham-kalosiya": normalizeTeamMemberProfile({
    joinedTerm: "May Term 2023",
    currentPosition: "HOD — City Operations",
    firstRoleAndDept: "City Coordinator of Jaipur in City Operations",
    personalGrowth:
      "Since joining Boundless, I have grown tremendously both personally and professionally—learning how to lead city teams, manage logistics under pressure, and turn strangers across campuses into a tight-knit travel community.",
    departments: ["city_operations"],
    yearbookQuote:
      "Some people collect stamps, some collect memories. I collected cities, events, endless WhatsApp threads, and friendships that feel like home.",
    departmentSections: [
      {
        departmentKey: "city_operations",
        departmentLabel: "City Operations",
        items: [
          {
            key: "eventsContributed",
            label: "City Events Contributed To",
            value: "11+ events, meet-ups, and one-day trips across India",
            displayAs: "stat",
          },
          {
            key: "eventsOrganised",
            label: "Events Personally Organised",
            value: "10+ events organised & co-organised (including Jaipur Escape & Pandal Hopping)",
            displayAs: "stat",
          },
          {
            key: "participantsHandled",
            label: "Participants Handled",
            value: "55+ participants in a single flagship city meetup",
            displayAs: "stat",
          },
          {
            key: "proudEvent",
            label: "Proudest City Operations Event",
            value:
              "Tricolour 2.0 and Navrang 3.0 — bringing students together across multiple cities with synchronized energy and unforgettable cultural evenings.",
            displayAs: "highlight",
          },
          {
            key: "journeyNote",
            label: "City Operations Journey",
            value:
              "Starting as a City Coordinator for Jaipur and growing into HOD of City Operations taught me that great events are built on reliability, clear communication, and genuine warmth.",
            displayAs: "narrative",
          },
        ],
      },
    ],
  })!,

  "navjot-singh-dadiala": normalizeTeamMemberProfile({
    joinedTerm: "Sept 2025",
    currentPosition: "HOD — Technicals",
    firstRoleAndDept: "Core Member in Technicals",
    personalGrowth:
      "Building real production systems for thousands of IITM BS students sharpened my full-stack engineering, performance optimization, and collaborative leadership skills.",
    departments: ["technicals"],
    yearbookQuote: "Keep Going!",
    departmentSections: [
      {
        departmentKey: "technicals",
        departmentLabel: "Technicals",
        items: [
          {
            key: "systemAreas",
            label: "Areas Worked On",
            value: "Frontend, Backend",
            displayAs: "tags",
          },
          {
            key: "buildType",
            label: "Contribution Type",
            value: "Built systems from scratch",
            displayAs: "tags",
          },
          {
            key: "proudProject",
            label: "Project Most Proud Of",
            value: "Boundless SEO & Platform Architecture",
            displayAs: "highlight",
          },
          {
            key: "projects",
            label: "Technical Projects Contributed To",
            value: "Boundless Website, Boundless 2025–26 Trips Platform",
            displayAs: "narrative",
          },
        ],
      },
    ],
  })!,

  "kanchi-sivaram-varaputhra": normalizeTeamMemberProfile({
    joinedTerm: "Sep 2025",
    currentPosition: "HOD — Research & Outreach",
    firstRoleAndDept: "Member in Research & Outreach",
    personalGrowth:
      "Boundless gave me the confidence to pitch national brands, structure outreach pipelines, and translate ideas into tangible value for student travelers.",
    departments: ["research_outreach"],
    yearbookQuote:
      "From planning memorable trips to building meaningful sponsorships, I've enjoyed being part of every milestone.",
    departmentSections: [
      {
        departmentKey: "research_outreach",
        departmentLabel: "Research & Outreach",
        items: [
          {
            key: "significantPartnership",
            label: "Most Significant Partnership",
            value:
              "Secured Decathlon as a sponsor for Tricolour — coordinating brand outreach, deliverables, and on-ground activation.",
            displayAs: "highlight",
          },
          {
            key: "majorContributions",
            label: "Major Sponsorship & Outreach Contributions",
            value:
              "Built a structured sponsorship process for Boundless and led outreach for Tricolour and Navrang 3.0.",
            displayAs: "narrative",
          },
          {
            key: "impact",
            label: "Impact on Events & Member Value",
            value:
              "Research and outreach efforts opened new sponsorship channels that elevated event quality and created additional perks for student participants.",
            displayAs: "narrative",
          },
        ],
      },
    ],
  })!,

  "priyanka-bhandari": normalizeTeamMemberProfile({
    joinedTerm: "Sept 2025",
    currentPosition: "Deputy Secretary",
    firstRoleAndDept: "Trip Coordinator in Trip Coordination",
    personalGrowth:
      "Leading multi-day expeditions across India taught me calm decision-making, empathy for every traveler, and how to balance structure with spontaneity.",
    departments: ["trip_coordination", "females_corner"],
    yearbookQuote:
      "Came for the trips, stayed for the people, accidentally took responsibility for everything.",
    departmentSections: [
      {
        departmentKey: "trip_coordination",
        departmentLabel: "Trip Coordination",
        items: [
          {
            key: "tripsContributed",
            label: "Trips Contributed Overall",
            value: "14 trips across tenures as Trip Coordinator, HOD, and Deputy Secretary",
            displayAs: "stat",
          },
          {
            key: "tripsLed",
            label: "Trips Planned / Led / Co-Led",
            value: "12 trips (Meghalaya, Himachal, Kerala, Lonavala, Herscape, Sikkim & more)",
            displayAs: "stat",
          },
          {
            key: "onGroundCount",
            label: "On-Ground Coordinator",
            value: "2 times on-ground (Himachal & Pondicherry)",
            displayAs: "stat",
          },
          {
            key: "proudTrip",
            label: "Proudest Trip / Project",
            value:
              "Pondicherry & Rameshwaram Trips — seamlessly executed itineraries with unforgettable group bonding.",
            displayAs: "highlight",
          },
          {
            key: "firstProject",
            label: "First Project",
            value: "Meghalaya Trip (September Term) — vendor research and itinerary coordination.",
            displayAs: "narrative",
          },
        ],
      },
      {
        departmentKey: "females_corner",
        departmentLabel: "Females Corner",
        items: [
          {
            key: "areasContributed",
            label: "Areas Contributed To",
            value: "Online events, Community engagement, Safe travel planning",
            displayAs: "tags",
          },
          {
            key: "significantContribution",
            label: "Community Impact",
            value:
              "Helped shape inclusive, welcoming travel spaces and initiatives like Herscape so every female student feels confident exploring with Boundless.",
            displayAs: "highlight",
          },
        ],
      },
    ],
  })!,

  "anshika-anand": normalizeTeamMemberProfile({
    joinedTerm: "Feb 2026",
    currentPosition: "HOD — Graphics",
    firstRoleAndDept: "Designer in Graphics Team",
    personalGrowth:
      "Boundless pushed my visual storytelling from single posters to cohesive event identities across nationwide campaigns.",
    departments: ["graphics"],
    yearbookQuote:
      "Started with a willingness to contribute, took up every opportunity that came my way, and found my creative voice.",
    departmentSections: [
      {
        departmentKey: "graphics",
        departmentLabel: "Graphics",
        items: [
          {
            key: "designsCount",
            label: "Designs & Creative Assets",
            value: "25+ designs and creative assets for Boundless",
            displayAs: "stat",
          },
          {
            key: "majorEvents",
            label: "Major Events Designed For",
            value: "Navrang 3.0, Tricolour, and flagship trip announcements",
            displayAs: "highlight",
          },
          {
            key: "journeyNote",
            label: "Graphics Team Journey",
            value:
              "Every campaign brought a fresh aesthetic challenge—balancing Boundless' warm cultural heritage with crisp modern layouts.",
            displayAs: "narrative",
          },
        ],
        media: [
          {
            url: "https://drive.google.com/u/0/open?usp=forms_web&id=15aSyyyh4yXMCv6dsPP9QpiQTScwNLzlF",
            kind: "external_link",
            title: "Boundless Campaign Design Sample 1",
            caption: "Hosted on Google Drive — opens in a new tab",
          },
        ],
      },
    ],
  })!,

  "rishi-ranjan-borah": normalizeTeamMemberProfile({
    joinedTerm: "Jan 2026",
    currentPosition: "HOD — Media",
    firstRoleAndDept: "Video Editor in Media Team",
    personalGrowth:
      "Became dramatically faster and sharper at crafting cinematic edits that capture the real heartbeat of Boundless trips.",
    departments: ["media"],
    yearbookQuote:
      "An introvert guy in a world of strangers, who slowly found his people, made memories, and captured them frame by frame.",
    departmentSections: [
      {
        departmentKey: "media",
        departmentLabel: "Media",
        items: [
          {
            key: "projectsCovered",
            label: "Total Projects Covered",
            value: "15+ aftermovies, teasers & reels",
            displayAs: "stat",
          },
          {
            key: "favouriteContent",
            label: "Favourite Piece of Content",
            value: "Navrang 3.0 Teaser & Meghalaya 2.0 Aftermovie",
            displayAs: "highlight",
          },
          {
            key: "majorProjects",
            label: "Major Projects Covered",
            value: "Aftermovies for Meghalaya, Himachal, Post Paradox, and teasers for Navrang 3.0 & Amritsar.",
            displayAs: "narrative",
          },
        ],
        media: [
          {
            url: "https://drive.google.com/u/0/open?usp=forms_web&id=1GrJ3mEb1IhEF_QZuKS0VVBDI713yTuyN",
            kind: "external_link",
            title: "Favourite Boundless Media Reel",
            caption: "Hosted on Google Drive — opens in a new tab",
          },
        ],
      },
    ],
  })!,

  /**
   * Dedicated local-only visual preview profile for verifying all 6 social media icons
   * and the "Beyond IITM BS" extracurricular section. Uses clearly labelled example URLs
   * and is NEVER written to Firestore or production data.
   */
  "demo-profile-preview": normalizeTeamMemberProfile({
    joinedTerm: "Sept 2025",
    currentPosition: "Preview Profile — Socials & Beyond IITM BS Demo",
    firstRoleAndDept: "Core Member in Technicals (Local Preview)",
    personalGrowth:
      "This dedicated local preview profile demonstrates how all supported social icons and Beyond IITM BS extracurricular entries appear alongside the existing editorial layout.",
    departments: ["technicals", "city_operations"],
    yearbookQuote:
      "Explore boldly, build thoughtfully, and leave every trail better than you found it.",
    socialLinks: {
      instagram: "https://instagram.com/example-boundless-preview",
      linkedin: "https://linkedin.com/in/example-boundless-preview",
      github: "https://github.com/example-boundless-preview",
      twitter: "https://x.com/example-boundless-preview",
      youtube: "https://youtube.com/@example-boundless-preview",
      portfolio: "https://example.com/boundless-preview",
    },
    departmentSections: [
      {
        departmentKey: "technicals",
        departmentLabel: "Technicals",
        items: [
          {
            key: "systemAreas",
            label: "Areas Worked On",
            value: "Frontend, Backend",
            displayAs: "tags",
          },
          {
            key: "proudProject",
            label: "Project Most Proud Of",
            value: "Sample Editorial Profile System (Local Preview)",
            displayAs: "highlight",
          },
        ],
      },
    ],
    extracurricularActivities: [
      {
        id: "preview-act-1",
        title: "Inter-College Hackathon Finalist (Sample Entry)",
        description:
          "Example extracurricular entry demonstrating how non-IITM BS competitions, clubs, or personal projects render in the Beyond IITM BS section.",
        category: "Competition",
        year: "2025",
        link: "https://example.com/boundless-preview-activity",
      },
      {
        id: "preview-act-2",
        title: "Community Trekking & Trail Volunteering (Sample Entry)",
        description:
          "Example volunteering entry showing how multiple activities stack cleanly with category pills and year markers.",
        category: "Volunteering",
        year: "2024–2025",
      },
    ],
  })!,
};

/**
 * Standalone preview-only fallback records so `/team-members/[slug]` can be
 * previewed even if a member's full name differs slightly from Firestore during Phase 2.
 */
export const PREVIEW_FALLBACK_MEMBERS: Record<string, TeamMemberRecord> = {
  "shubham-kalosiya": {
    id: "preview-shubham-kalosiya",
    slug: "shubham-kalosiya",
    name: "Shubham Kalosiya",
    role: "HOD — City Operations",
    image: "",
    type: "dept_head",
    term: "2025-2026",
    sortOrder: 1,
    profile: MEMBER_PROFILE_PREVIEWS["shubham-kalosiya"],
  },
  "navjot-singh-dadiala": {
    id: "preview-navjot-singh-dadiala",
    slug: "navjot-singh-dadiala",
    name: "Navjot Singh Dadiala",
    role: "HOD — Technicals",
    image: "",
    type: "dept_head",
    term: "2025-2026",
    sortOrder: 2,
    profile: MEMBER_PROFILE_PREVIEWS["navjot-singh-dadiala"],
  },
  "kanchi-sivaram-varaputhra": {
    id: "preview-kanchi-sivaram-varaputhra",
    slug: "kanchi-sivaram-varaputhra",
    name: "Kanchi Sivaram Varaputhra",
    role: "HOD — Research & Outreach",
    image: "",
    type: "dept_head",
    term: "2025-2026",
    sortOrder: 3,
    profile: MEMBER_PROFILE_PREVIEWS["kanchi-sivaram-varaputhra"],
  },
  "priyanka-bhandari": {
    id: "preview-priyanka-bhandari",
    slug: "priyanka-bhandari",
    name: "Priyanka Bhandari",
    role: "Deputy Secretary",
    image: "",
    type: "council",
    term: "2025-2026",
    sortOrder: 4,
    profile: MEMBER_PROFILE_PREVIEWS["priyanka-bhandari"],
  },
  "anshika-anand": {
    id: "preview-anshika-anand",
    slug: "anshika-anand",
    name: "Anshika Anand",
    role: "HOD — Graphics",
    image: "",
    type: "dept_head",
    term: "2025-2026",
    sortOrder: 5,
    profile: MEMBER_PROFILE_PREVIEWS["anshika-anand"],
  },
  "rishi-ranjan-borah": {
    id: "preview-rishi-ranjan-borah",
    slug: "rishi-ranjan-borah",
    name: "Rishi Ranjan Borah",
    role: "HOD — Media",
    image: "",
    type: "dept_head",
    term: "2025-2026",
    sortOrder: 6,
    profile: MEMBER_PROFILE_PREVIEWS["rishi-ranjan-borah"],
  },
  "demo-profile-preview": {
    id: "preview-demo-profile",
    slug: "demo-profile-preview",
    name: "Demo Member Preview",
    role: "Local Preview Profile",
    image: "",
    type: "dept_head",
    term: "2025-2026",
    sortOrder: 99,
    profile: MEMBER_PROFILE_PREVIEWS["demo-profile-preview"],
  },
};

/**
 * Matches a Firestore member slug/name to a Phase 2 preview profile if the Firestore
 * doc doesn't have its own `profile` yet. Supports exact slug or first+last prefix match
 * (e.g. "navjot-singh" -> "navjot-singh-dadiala").
 */
export function findPreviewProfileForSlug(slug: string): TeamMemberProfileData | null {
  const clean = String(slug || "").trim().toLowerCase();
  if (!clean) return null;
  if (MEMBER_PROFILE_PREVIEWS[clean]) return MEMBER_PROFILE_PREVIEWS[clean];
  for (const [key, profile] of Object.entries(MEMBER_PROFILE_PREVIEWS)) {
    if (key.startsWith(`${clean}-`) || clean.startsWith(`${key}-`)) {
      return profile;
    }
  }
  return null;
}
