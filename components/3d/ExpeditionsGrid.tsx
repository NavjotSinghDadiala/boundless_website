'use client';

import React, { useRef } from 'react';
import { Text, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';
import { useBoundless3DStore } from '@/context/boundless3dStore';
import PortalTile from './PortalTile';
import TripsCarousel from './trips/TripsCarousel';
import TouchPanControls from './trips/TouchPanControls';
import PastJourneysTimeline from './journeys/PastJourneysTimeline';

export const ExpeditionsGrid: React.FC = () => {
  const titleRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const data = useScroll();
  const isActive = useBoundless3DStore((state) => !!state.activePortalId);
  const activePortalId = useBoundless3DStore((state) => state.activePortalId);

  const fontProps = {
    fontSize: isMobile ? 0.28 : 0.45,
    color: '#3B001B',
  };

  useFrame((_, delta) => {
    if (!data) return;
    const d = data.range(0.8, 0.2);
    const e = data.range(0.7, 0.2);

    if (groupRef.current && !isActive) {
      groupRef.current.position.y = d > 0 ? -1 : -30;
      groupRef.current.visible = d > 0;
    }

    if (titleRef.current) {
      titleRef.current.children.forEach((text: any, i: number) => {
        const y = Math.max(Math.min((1 - d) * (10 - i), 10), 0.5);
        text.position.y = THREE.MathUtils.damp(text.position.y, y, 7, delta);
        text.fillOpacity = e;
      });
    }
  });

  const getTitle = () => {
    const title = 'EXPEDITIONS';
    return title.split('').map((char, i) => {
      const diff = isMobile ? 0.32 : 0.65;
      return (
        <Text key={i} {...fontProps} position={[i * diff, 2, 1]}>
          {char}
        </Text>
      );
    });
  };

  return (
    <group position={[0, -41.5, 12]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        {/* Cascading Title Letters: E X P E D I T I O N S */}
        <group ref={titleRef} position={[isMobile ? -1.6 : -3.6, 2, -2]}>
          {getTitle()}
        </group>

        {/* The Two Interactive 3D Portal Portals */}
        <group position={[0, -1, 0]} ref={groupRef}>
          {/* Portal 1: Upcoming Expeditions (Cylindrical Carousel) */}
          <PortalTile
            id="trips"
            title="UPCOMING EXPEDITIONS"
            color="#FFF4DC"
            position={new THREE.Vector3(isMobile ? -1 : -2.2, 0, isMobile ? 0.4 : 0)}
          >
            <ambientLight intensity={0.9} />
            <TripsCarousel />
            {isActive && activePortalId === 'trips' && isMobile && <TouchPanControls />}
          </PortalTile>

          {/* Portal 2: Past Expeditions (3D Trail Spline) */}
          <PortalTile
            id="journeys"
            title="PAST EXPEDITIONS"
            color="#FAE0BE"
            position={new THREE.Vector3(isMobile ? 1 : 2.2, 0, 0)}
          >
            <ambientLight intensity={0.9} />
            <PastJourneysTimeline />
          </PortalTile>
        </group>
      </group>
    </group>
  );
};

export default ExpeditionsGrid;
