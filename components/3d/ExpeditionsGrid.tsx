'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Text, useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import PortalTile from './PortalTile';
import TripsCarousel, { UpcomingTripSummary } from './trips/TripsCarousel';
import PastJourneysTimeline, { PastTripsSummary } from './journeys/PastJourneysTimeline';

function formatShortDate(raw?: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }).toUpperCase();
}

export const ExpeditionsGrid: React.FC = () => {
  const titleRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const data = useScroll();
  const { size } = useThree();

  const [shouldLoad, setShouldLoad] = useState(false);
  const loadTriggeredRef = useRef(false);

  const [upcomingSummary, setUpcomingSummary] = useState<UpcomingTripSummary>({
    count: 0,
    imageUrls: [],
  });
  const [pastSummary, setPastSummary] = useState<PastTripsSummary>({
    count: 0,
    imageUrls: [],
  });

  // Fetch live `/api/trip` and `/api/previous-trips` data only once the user nears the gateway deck
  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;

    async function loadGatewayData() {
      try {
        const [tripRes, prevRes] = await Promise.all([
          fetch('/api/trip').catch(() => null),
          fetch('/api/previous-trips').catch(() => null),
        ]);

        if (!cancelled && tripRes?.ok) {
          const tripJson = await tripRes.json();
          const allTrips = Array.isArray(tripJson?.trips) ? tripJson.trips : [];
          // Eligible upcoming trips per existing filtering logic
          const eligible = allTrips.filter((t: any) => !t?.isCompleted);
          const imageUrls: string[] = [];
          for (const t of eligible) {
            if (Array.isArray(t?.images)) {
              for (const img of t.images) {
                const u = typeof img === 'string' ? img : img?.url;
                if (u && typeof u === 'string') imageUrls.push(u);
              }
            }
          }
          const primary = eligible[0];
          setUpcomingSummary({
            count: eligible.length,
            primaryName: primary?.name || primary?.title || undefined,
            primaryDestination: primary?.destination || undefined,
            primaryDate: primary?.startDate || undefined,
            primaryTripId: primary?.id || primary?._id || undefined,
            imageUrls,
          });
        }

        if (!cancelled && prevRes?.ok) {
          const prevJson = await prevRes.json();
          const prevTrips = Array.isArray(prevJson?.trips) ? prevJson.trips : [];
          const imageUrls: string[] = [];
          for (const t of prevTrips) {
            if (t?.img && typeof t.img === 'string' && t.img.startsWith('http')) {
              imageUrls.push(t.img);
            }
          }
          setPastSummary({
            count: prevTrips.length,
            imageUrls,
          });
        }
      } catch {
        // Graceful fallback handled by U1/P1 components
      }
    }

    loadGatewayData();
    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  // Responsive layout derived from actual viewport aspect ratio (supports 1440x900, 768x1024, 390x844, 360x800)
  const aspect = size.width / Math.max(1, size.height);
  const isStacked = aspect < 1.15;
  // Visible width at camera distance d = 4.5 (fov 75 deg)
  const visibleW = 2 * 4.5 * Math.tan(THREE.MathUtils.degToRad(37.5)) * aspect;

  const cardW = isStacked ? Math.min(visibleW * 0.86, 4.1) : Math.min((visibleW - 1.4) * 0.44, 4.3);
  const cardH = isStacked ? 2.18 : 3.72;

  const upcomingPos: [number, number, number] = isStacked ? [0, -0.35, 0] : [-cardW / 2 - 0.3, -1.55, 0];
  const pastPos: [number, number, number] = isStacked ? [0, -2.85, 0] : [cardW / 2 + 0.3, -1.55, 0];

  const titleCharSpacing = isStacked ? Math.min(visibleW * 0.068, 0.34) : 0.62;
  const titleFontSize = isStacked ? Math.min(visibleW * 0.072, 0.32) : 0.44;
  const titleStartX = -((11 - 1) * titleCharSpacing) / 2;
  const titleY = isStacked ? 1.38 : 1.25;

  useFrame((_, delta) => {
    if (!data) return;
    if (!loadTriggeredRef.current && data.offset > 0.62) {
      loadTriggeredRef.current = true;
      setShouldLoad(true);
    }

    const d = data.range(0.8, 0.2);
    const e = data.range(0.72, 0.2);

    if (groupRef.current) {
      groupRef.current.visible = d > 0.01;
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, d > 0 ? 0 : -4, 7, delta);
    }

    if (titleRef.current) {
      titleRef.current.visible = e > 0.01;
      titleRef.current.children.forEach((text: any, i: number) => {
        const targetY = titleY + Math.max(Math.min((1 - d) * (6 - i * 0.45), 6), 0);
        text.position.y = THREE.MathUtils.damp(text.position.y, targetY, 7, delta);
        text.fillOpacity = e;
      });
    }
  });

  const navigateToSection = (sectionId: string, fallbackHref: string) => {
    const el = typeof document !== 'undefined' ? document.getElementById(sectionId) : null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (typeof window !== 'undefined') {
      window.location.href = fallbackHref;
    }
  };

  // Build authentic, non-fabricated metadata subtitles strictly from live API records
  const upcomingSubtitle = (() => {
    if (upcomingSummary.count === 0) return 'EXPLORE UPCOMING TRIPS  ↗';
    const parts: string[] = [];
    parts.push(`${upcomingSummary.count} UPCOMING ${upcomingSummary.count === 1 ? 'TRIP' : 'TRIPS'}`);
    const dateStr = formatShortDate(upcomingSummary.primaryDate);
    if (dateStr) parts.push(dateStr);
    else if (upcomingSummary.primaryDestination) parts.push(upcomingSummary.primaryDestination.toUpperCase());
    return parts.join('  •  ');
  })();

  const pastSubtitle =
    pastSummary.count > 0
      ? `${pastSummary.count} EXPEDITIONS ARCHIVED  ↗`
      : 'EXPLORE PAST EXPEDITIONS  ↗';

  const titleChars = 'EXPEDITIONS'.split('');

  return (
    <group position={[0, -41.5, 12]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Cascading Title Letters: E X P E D I T I O N S */}
      <group ref={titleRef} position={[0, 0, 0]} visible={false}>
        {titleChars.map((char, i) => (
          <Text
            key={i}
            fontSize={titleFontSize}
            color="#FFF8E7"
            anchorX="center"
            anchorY="middle"
            position={[titleStartX + i * titleCharSpacing, titleY, 0.05]}
            fillOpacity={0}
          >
            {char}
          </Text>
        ))}
      </group>

      {/* Static Clickable 3D Cosmic Gateways (U1 + P1 — Zero Nested Scrolling) */}
      <group ref={groupRef} position={[0, -4, 0]} visible={false}>
        {/* Gateway 1: Upcoming Expeditions — U1 Live Stacked Destination Showcase */}
        <PortalTile
          id="trips"
          title="UPCOMING EXPEDITIONS"
          subtitle={upcomingSubtitle}
          width={cardW}
          height={cardH}
          position={upcomingPos}
          accentColor="#7C3AED"
          surfaceColor="#0e0918"
          onNavigate={() => navigateToSection('upcoming-trips', '/trip-registration')}
        >
          {(hovered) => (
            <TripsCarousel
              width={cardW}
              height={cardH}
              hovered={hovered}
              shouldLoad={shouldLoad}
              isCompact={isStacked}
              summary={upcomingSummary}
            />
          )}
        </PortalTile>

        {/* Gateway 2: Past Expeditions — P1 Layered Cinematic Memory Collage Window */}
        <PortalTile
          id="journeys"
          title="PAST EXPEDITIONS"
          subtitle={pastSubtitle}
          width={cardW}
          height={cardH}
          position={pastPos}
          accentColor="#B45309"
          surfaceColor="#140a12"
          onNavigate={() => navigateToSection('previous-trips', '/previous-trips')}
        >
          {(hovered) => (
            <PastJourneysTimeline
              width={cardW}
              height={cardH}
              hovered={hovered}
              shouldLoad={shouldLoad}
              isCompact={isStacked}
              summary={pastSummary}
            />
          )}
        </PortalTile>
      </group>
    </group>
  );
};

export default ExpeditionsGrid;
