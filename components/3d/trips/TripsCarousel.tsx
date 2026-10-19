'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { isMobile } from 'react-device-detect';
import { useBoundless3DStore } from '@/context/boundless3dStore';
import TripTile3D, { Trip3DData } from './TripTile3D';

// Fallback curated expeditions if API is offline
const FALLBACK_EXPEDITIONS: Trip3DData[] = [
  { id: 'solang-valley', title: 'Solang Valley Alpine Expedition', date: 'Dec 2026', destination: 'Manali, Himachal Pradesh', fee: '7,999', url: '/trips', featured: true },
  { id: 'gokarna-beach', title: 'Gokarna Coastal Trail & Trek', date: 'Jan 2027', destination: 'Gokarna, Karnataka', fee: '4,499', url: '/trips', featured: true },
  { id: 'kedarkantha-summit', title: 'Kedarkantha Winter Summit', date: 'Feb 2027', destination: 'Uttarakhand', fee: '9,499', url: '/trips', featured: true },
  { id: 'jog-falls', title: 'Jog Falls Monsoon Retreat', date: 'Aug 2026', destination: 'Shimoga, Karnataka', fee: '3,200', url: '/trips' },
  { id: 'mumbai-heritage', title: 'Mumbai Heritage City Walk', date: 'Nov 2026', destination: 'Mumbai, Maharashtra', fee: '499', url: '/city-meetups' },
  { id: 'shimoga-falls', title: 'Shimoga Hidden Waterfalls', date: 'Sep 2026', destination: 'Karnataka', fee: '3,500', url: '/trips' },
];

export const TripsCarousel: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [trips, setTrips] = useState<Trip3DData[]>(FALLBACK_EXPEDITIONS);
  const isActive = useBoundless3DStore((state) => state.activePortalId === 'trips');
  const activeId = isActive ? selectedId : null;

  useEffect(() => {
    async function loadTrips() {
      try {
        const res = await fetch('/api/trip');
        if (res.ok) {
          const data = await res.json();
          const apiTrips = data.trips || [];
          if (apiTrips.length > 0) {
            const formatted: Trip3DData[] = apiTrips.map((t: any) => ({
              id: t.id || t._id,
              title: t.title || t.name,
              date: t.startDate || 'Upcoming',
              destination: t.destination || 'India',
              fee: t.fee || t.price,
              url: `/trips/${t.id || t._id}`,
              featured: true,
            }));
            setTrips(formatted);
          }
        }
      } catch (e) {
        console.warn('TripsCarousel: Using curated expedition list', e);
      }
    }
    loadTrips();
  }, []);

  const onClick = (id: number) => {
    if (!isMobile) return;
    setSelectedId(id === selectedId ? null : id);
  };

  const tiles = useMemo(() => {
    const fov = Math.PI;
    const distance = 11;
    const columns = Math.ceil(trips.length / 2);

    return trips.map((trip, i) => {
      const row = i % 2;
      const column = Math.floor(i / 2);
      const angle = (fov / columns) * column;

      const z = -distance * Math.sin(angle);
      const x = -distance * Math.cos(angle);
      const rotY = Math.PI / 2 - angle;

      const y = row === 0 ? 3.25 : 1;
      const datePosition = row === 0 ? 'top' : 'bottom';

      return (
        <TripTile3D
          key={trip.id || i}
          datePosition={datePosition}
          trip={trip}
          index={i}
          position={[x, y, z]}
          rotation={[0, rotY, 0]}
          activeId={activeId}
          onClick={() => onClick(i)}
        />
      );
    });
  }, [trips, activeId, isActive]);

  return <group rotation={[0, -Math.PI / 12, 0]}>{tiles}</group>;
};

export default TripsCarousel;
