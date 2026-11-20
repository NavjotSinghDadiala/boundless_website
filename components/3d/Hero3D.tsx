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

const DISPLAY_FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/nosifer@latest/latin-400-normal.woff';
const SUBTITLE_FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-500-normal.woff';

export const Hero3D: React.FC = () => {
  const mainTitleRef = useRef<THREE.Mesh>(null);
  const dividerRef = useRef<THREE.Mesh>(null);
  const subtitleRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const aspect = size.width / Math.max(1, size.height);
  const isNarrow = isMobile || aspect < 0.85;

  // Bold responsive typography tuned for Nosifer display width across 1440x900, 768x1024, 390x844, and 360x800
  const titleFontSize = isNarrow ? Math.min(0.84, Math.max(0.64, aspect * 1.65)) : 1.78;
  const subtitleFontSize = isNarrow ? Math.min(0.28, Math.max(0.22, aspect * 0.56)) : 0.46;
  const dividerWidth = isNarrow ? 2.1 : 4.4;
  const titleTargetY = isNarrow ? 1.55 : 1.95;
  const dividerY = isNarrow ? 0.55 : 0.42;
  const subtitleTargetY = isNarrow ? -0.05 : -0.25;

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return;

    // Smooth cinematic entrance animation on initial mount, cleaned up on unmount
    const ctx = gsap.context(() => {
      if (mainTitleRef.current && subtitleRef.current) {
        gsap.fromTo(
          mainTitleRef.current.position,
          { y: -4.2, z: -13 },
          { y: titleTargetY, z: -8, duration: 2.0, ease: 'power2.out' }
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
          { y: subtitleTargetY, z: -8, duration: 2.2, delay: 0.15, ease: 'power2.out' }
        );
      }
    });

    return () => ctx.revert();
  }, [titleTargetY, subtitleTargetY]);

  return (
    <>
      <AtmosphereSky />

      {/* Independently Animated Cosmic Travel Instruments + Depth-Weighted Cursor Parallax */}
      <HeroTravelElements />

      {/* 3D Main Title — Signature Boundless Nosifer Display Font */}
      <Text
        ref={mainTitleRef}
        font={DISPLAY_FONT_URL}
        position={[0, titleTargetY, -8]}
        fontSize={titleFontSize}
        color="#FFF9EC"
        outlineWidth={0.012}
        outlineColor="#C8A252"
        outlineOpacity={0.34}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.07}
      >
        BOUNDLESS
      </Text>

      {/* Subtle Hairline Golden Editorial Rule */}
      <mesh ref={dividerRef} position={[0, dividerY, -8]}>
        <planeGeometry args={[dividerWidth, 0.016]} />
        <meshBasicMaterial color="#D4AF6A" transparent opacity={0.58} />
      </mesh>

      {/* 3D Subtitle — Refined Geometric Sans (Montserrat 500) */}
      <Text
        ref={subtitleRef}
        font={SUBTITLE_FONT_URL}
        position={[0, subtitleTargetY, -8]}
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
