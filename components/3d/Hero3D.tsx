'use client';

import React, { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { isMobile } from 'react-device-detect';
import AtmosphereSky from './AtmosphereSky';
import ExpeditionPortalGate from './ExpeditionPortalGate';
import MemoriesInMotion from './MemoriesInMotion';
import HeroTravelElements from './HeroTravelElements';
import DoorwayElements from './DoorwayElements';

const DISPLAY_FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/cinzel@latest/latin-600-normal.woff';
const SUBTITLE_FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-500-normal.woff';

export const Hero3D: React.FC = () => {
  const mainTitleRef = useRef<THREE.Mesh>(null);
  const dividerRef = useRef<THREE.Mesh>(null);
  const subtitleRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const aspect = size.width / Math.max(1, size.height);
  const isNarrow = isMobile || aspect < 0.85;

  // Responsive typography tuned cleanly for 1440x900, 768x1024, 390x844, and 360x800
  const titleFontSize = isNarrow ? Math.min(0.76, Math.max(0.56, aspect * 1.45)) : 1.72;
  const subtitleFontSize = isNarrow ? Math.min(0.19, Math.max(0.145, aspect * 0.36)) : 0.31;
  const dividerWidth = isNarrow ? 1.5 : 3.2;

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return;

    // Smooth cinematic entrance animation on initial mount
    if (mainTitleRef.current && subtitleRef.current) {
      gsap.fromTo(
        mainTitleRef.current.position,
        { y: -4.2, z: -13 },
        { y: 2.05, z: -8, duration: 2.0, ease: 'power2.out' }
      );
      if (dividerRef.current) {
        gsap.fromTo(
          dividerRef.current.scale,
          { x: 0 },
          { x: 1, duration: 1.6, delay: 0.35, ease: 'power2.out' }
        );
      }
      gsap.fromTo(
        subtitleRef.current.position,
        { y: -5.8, z: -13 },
        { y: 0.72, z: -8, duration: 2.2, delay: 0.15, ease: 'power2.out' }
      );
    }
  }, []);

  return (
    <>
      <AtmosphereSky />

      {/* Independently Animated Cosmic Travel Instruments + Depth-Weighted Cursor Parallax */}
      <HeroTravelElements />

      {/* 3D Main Title — Refined Cinematic Editorial Serif (Cinzel 600) */}
      <Text
        ref={mainTitleRef}
        font={DISPLAY_FONT_URL}
        position={[0, 2.05, -8]}
        fontSize={titleFontSize}
        color="#FFF9EC"
        outlineWidth={0.008}
        outlineColor="#C8A252"
        outlineOpacity={0.32}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.14}
      >
        BOUNDLESS
      </Text>

      {/* Subtle Hairline Golden Editorial Rule */}
      <mesh ref={dividerRef} position={[0, 1.24, -8]}>
        <planeGeometry args={[dividerWidth, 0.014]} />
        <meshBasicMaterial color="#D4AF6A" transparent opacity={0.55} />
      </mesh>

      {/* 3D Subtitle — Refined Geometric Sans (Montserrat 500) */}
      <Text
        ref={subtitleRef}
        font={SUBTITLE_FONT_URL}
        position={[0, 0.72, -8]}
        fontSize={subtitleFontSize}
        color="#DFBE7A"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.21}
      >
        IITM BS TRAVEL SOCIETY
      </Text>

      {/* Subtle Travel Accents Around & Above the Wooden Entrance (Zero Door Obstruction) */}
      <DoorwayElements />

      {/* Monumental Upright Wooden Expedition Entrance at Y = -10.5 (Centered on camera path X=0, Z=5.0) */}
      <group position={[0, -10.5, 5.0]}>
        <pointLight castShadow position={[0, 4.2, -1.2]} intensity={65} distance={18} color="#FFD88A" />
        <pointLight position={[0, -2.5, 1.5]} intensity={25} distance={16} color="#6D28D9" />
        <ExpeditionPortalGate />
      </group>

      {/* Immersive Cosmic Floating Memory Collage — Strictly Beyond the Door with a 9-Unit Clear Gap (Y <= -19.5) */}
      <MemoriesInMotion />
    </>
  );
};

export default Hero3D;
