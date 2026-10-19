'use client';

import React from 'react';
import Link from 'next/link';

export const AccessibleShadowTree: React.FC = () => {
  return (
    <div className="sr-only" aria-label="Accessible 3D Scene Companion">
      <nav aria-label="Quick Expedition Navigation">
        <ul>
          <li><a href="#upcoming-trips">Skip to Upcoming Trips</a></li>
          <li><a href="#gallery">Skip to Photo Gallery</a></li>
          <li><a href="#previous-trips">Skip to Past Expeditions</a></li>
          <li><a href="#city-meetups">Skip to City Meetups</a></li>
          <li><a href="#team">Skip to Team & Founders</a></li>
        </ul>
      </nav>

      <header>
        <h1>Boundless Travel Society — IITM BS Student Travel Club</h1>
        <p>
          An adventure travel community organizing safe, student-led expeditions across India.
          From Himalayan winter summits to Western Ghats monsoon retreats and coastal trails.
        </p>
      </header>

      <section aria-labelledby="sr-portals-heading">
        <h2 id="sr-portals-heading">Expedition Portals</h2>
        <div>
          <h3>Upcoming Expeditions</h3>
          <p>Explore active student treks and journeys. Reserve your spot before capacity fills.</p>
          <a href="#upcoming-trips">View all upcoming planned trips</a>
        </div>

        <div>
          <h3>Past Expeditions Archive</h3>
          <p>
            Historical trail milestones from Kedarkantha summit (12,500ft) and Gokarna coastal cliff treks
            to Shimoga waterfall expeditions.
          </p>
          <a href="#previous-trips">Explore the historical journey log</a>
        </div>
      </section>

      <footer aria-label="Society Links">
        <h2>Connect With Boundless</h2>
        <ul>
          <li><a href="https://www.linkedin.com/company/boundless-iitm-bs-travel-club/" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
          <li><a href="https://youtube.com/@boundlesstravelclub?si=CpWZufQvCLX-UKKI" target="_blank" rel="noopener noreferrer">YouTube</a></li>
          <li><a href="https://www.instagram.com/boundless_iitmbs" target="_blank" rel="noopener noreferrer">Instagram</a></li>
          <li><a href="mailto:boundless.club@study.iitm.ac.in">Email the Society</a></li>
          <li><a href="https://forms.gle/3DKAWuaaeuLwyEhr6" target="_blank" rel="noopener noreferrer">Join Us Registration Form</a></li>
        </ul>
      </footer>
    </div>
  );
};

export default AccessibleShadowTree;
