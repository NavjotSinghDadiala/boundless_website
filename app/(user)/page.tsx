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

export default function BoundlessTravelSociety() {
  return (
    <>
      {/* 3D Immersive Spatial Continuum & Virtual Scroll Journey */}
      <BoundlessExperienceSection />

      {/* Semantic Content Sections (Managed seamlessly by Document Scroll & Lenis) */}
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 relative z-10 shadow-2xl">
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
        <div id="team">
          <AmazingTeam />
        </div>
      </div>
    </>
  );
}
