import type { Metadata } from "next";
import { adminDb } from "@/lib/firebase-admin";
import TripDetailHero from "@/components/trips/TripDetailHero";
import TripQuickDetails from "@/components/trips/TripQuickDetails";
import TripAbout from "@/components/trips/TripAbout";
import TripItinerary from "@/components/trips/TripItinerary";
import TripImportantInfo from "@/components/trips/TripImportantInfo";
import TripThingsToCarry from "@/components/trips/TripThingsToCarry";
import TripFAQs from "@/components/trips/TripFAQs";
import TripCoordinators from "@/components/trips/TripCoordinators";
import TripGallery from "@/components/trips/TripGallery";
import TripBottomCTA from "@/components/trips/TripBottomCTA";
import TripNotFound from "@/components/trips/TripNotFound";
import Footer from "@/components/Footer";
import { Trip } from "@/components/trips/TripCard";

interface PageProps {
  params: Promise<{ tripId: string }>;
}

async function getTrip(tripId: string): Promise<Trip | null> {
  try {
    const doc = await adminDb.collection("trips").doc(tripId).get();
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) return null;

    // Public view: Strictly names only (NEVER private email/phone/whatsapp)
    const coordinators = (data.coordinators || [])
      .map((c: any) => {
        if (typeof c === "object" && c !== null) {
          return { name: c.name ? String(c.name).trim() : "" };
        }
        return { name: String(c).trim() };
      })
      .filter((c: any) => Boolean(c.name));

    return {
      id: doc.id,
      name: data.name || "Untitled Trip",
      description: data.description || "",
      destination: data.destination || "",
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      registrationDeadline: data.registrationDeadline || "",
      itinerary: data.itinerary || [],
      itineraryLink: data.itineraryLink || "",
      faqs: data.faqs || [],
      consentStatements: data.consentStatements || [],
      importantInformation: data.importantInformation || "",
      thingsToCarry: data.thingsToCarry || [],
      coordinators,
      totalSeats: data.totalSeats,
      femaleReservedSeats: data.femaleReservedSeats,
      maleReservedSeats: data.maleReservedSeats !== undefined ? Number(data.maleReservedSeats) : Math.max(0, (data.totalSeats || 0) - (data.femaleReservedSeats || 0)),
      releasedSeats: data.releasedSeats,
      releasedSeatsType: data.releasedSeatsType,
      femaleJoined: data.femaleJoined || 0,
      totalJoined: data.totalJoined || 0,
      registrationOpen: data.registrationOpen !== false,
      isCompleted: data.isCompleted || false,
      finalRosterSaved: data.finalRosterSaved || false,
      fee: data.fee !== undefined ? Number(data.fee) : 500,
      images: data.images || [],
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    };
  } catch (err) {
    console.error("Error fetching trip for page:", err);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await getTrip(tripId);

  if (!trip) {
    return {
      title: "Trip Not Found | Boundless Travel Society",
      description: "This trip may have been removed or is no longer available.",
    };
  }

  const title = `${trip.name} | Boundless Travel Society`;
  const description = trip.description
    ? trip.description.slice(0, 160)
    : "Explore details and register for this expedition with Boundless Travel Society.";
  const ogImages = trip.images && trip.images.length > 0 ? [trip.images[0].url] : ["/Logo Bound.png"];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImages,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages,
    },
  };
}

export default async function TripDetailPage({ params }: PageProps) {
  const { tripId } = await params;
  const trip = await getTrip(tripId);

  if (!trip) {
    return (
      <main className="min-h-screen bg-[#06080F] text-slate-100 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <TripNotFound />
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#06080F] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-amber-400 selection:text-slate-950">
      {/* ── Ambient Aurora Background Lights ── */}
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-gradient-to-bl from-amber-500/10 via-purple-600/5 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/10 via-blue-600/5 to-transparent rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-emerald-500/8 via-teal-600/5 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex-1 pb-16">
        {/* Section A: Visual Hero with Destination, Dates, Status & Register CTA */}
        <TripDetailHero trip={trip} />

        {/* Section B: Verified Quick Details Grid */}
        <TripQuickDetails trip={trip} />

        {/* Section C: Editorial About Description */}
        <TripAbout description={trip.description} />

        {/* Section D: Expedition Itinerary (if configured) */}
        <TripItinerary itinerary={trip.itinerary} itineraryLink={trip.itineraryLink} />

        {/* Section E: Important Information & Travel Guidelines (if configured) */}
        <TripImportantInfo importantInformation={trip.importantInformation} />

        {/* Section F: Frequently Asked Questions (if configured) */}
        <TripFAQs faqs={trip.faqs} />

        {/* Section G: Things to Carry Packing Checklist (if historical data exists) */}
        <TripThingsToCarry thingsToCarry={trip.thingsToCarry} />

        {/* Section H: Photo Highlights Gallery (if >3 images) */}
        <TripGallery images={trip.images} tripName={trip.name} />

        {/* Section I: Public Coordinators (Names only) */}
        <TripCoordinators coordinators={trip.coordinators} />

        {/* Section J: Final Register CTA */}
        <TripBottomCTA trip={trip} />
      </div>

      {/* Global Boundless Footer */}
      <Footer />
    </main>
  );
}
