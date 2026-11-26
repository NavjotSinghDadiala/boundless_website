"use client";

import React from "react";
import BoundlessExperienceSection from "@/components/3d/BoundlessExperienceSection";
import Hero from "@/components/Hero1";
import TripsPlanned from "@/components/tripsPlanned";
import Gallery from "@/components/Gallery";
import Prev from "@/components/Prev";
import Section from "@/components/Section";
import CityMeetup from "@/components/cityMeetup";
import Proud from "@/components/Proud";
import About from "@/components/About";
import AmazingTeam from "@/components/AmazingTeam";
import { Mountain } from "lucide-react";
import MountainFooterTransition from "@/components/MountainFooterTransition";

export default function BoundlessTravelSociety() {
  return (
    <>
      {/* 3D Immersive Spatial Continuum & Virtual Scroll Journey */}
      <BoundlessExperienceSection />

      {/* Semantic Content Sections (Managed seamlessly by Document Scroll & Lenis) */}
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 relative z-10 shadow-2xl">
        {/* Organic flowing scalloped/arched boundary emerging smoothly from the dark cosmic section */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute left-0 right-0 bottom-full -mb-[2px] w-full overflow-hidden leading-none"
        >
          <svg
            viewBox="0 0 1440 110"
            preserveAspectRatio="none"
            className="block w-full h-[46px] sm:h-[62px] md:h-[78px] lg:h-[92px]"
            style={{ filter: "drop-shadow(0 -8px 20px rgba(4, 2, 7, 0.45))" }}
          >
            <path
              d="M0,78 C60,78 72,22 144,22 C216,22 228,78 288,78 C348,78 360,22 432,22 C504,22 516,78 576,78 C636,78 648,22 720,22 C792,22 804,78 864,78 C924,78 936,22 1008,22 C1080,22 1092,78 1152,78 C1212,78 1224,22 1296,22 C1368,22 1380,78 1440,78 L1440,112 L0,112 Z"
              fill="#fffbeb"
            />
          </svg>
        </div>

        <Hero />

        <div id="upcoming-trips">
          <TripsPlanned />
        </div>
        <div id="gallery">
          <Gallery />
        </div>
        <div id="previous-trips">
          <Prev />
        </div>
        <div id="city-meetups">
          <Section
            svgFill="#FAE0BE"
            sectionHeading="City Meetups"
            headingStyle="text-brown"
          >
            <CityMeetup />
          </Section>
        </div>
        <div id="stats">
          <Proud />
        </div>
        <div id="about">
          <About />
        </div>
        {/* <div id="team">
          <AmazingTeam />
        </div> */}
        <div>
          <MountainFooterTransition />
        </div>
      </div>
    </>
  );
}
