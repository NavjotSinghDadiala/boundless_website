'use client';

import React, { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { isMobile } from 'react-device-detect';
import AtmosphereSky from './AtmosphereSky';
import ExpeditionPortalGate from './ExpeditionPortalGate';
import TextExpeditionWindow from './TextExpeditionWindow';

export const Hero3D: React.FC = () => {
  const mainTitleRef = useRef<THREE.Mesh>(null);
  const subtitleRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    // Entrance animation on initial scene mount
    if (mainTitleRef.current && subtitleRef.current) {
      gsap.fromTo(
        mainTitleRef.current.position,
        { y: -6, z: -14 },
        { y: 2.2, z: -8, duration: 2.5, ease: 'power2.out' }
      );
      gsap.fromTo(
        subtitleRef.current.position,
        { y: -8, z: -14 },
        { y: 0.8, z: -8, duration: 2.8, delay: 0.2, ease: 'power2.out' }
      );
    }
  }, []);

  return (
    <>
      <AtmosphereSky />

      {/* 3D Main Title in Top Sky */}
      <Text
        ref={mainTitleRef}
        position={[0, 2.2, -8]}
        fontSize={isMobile ? 0.9 : 1.6}
        color="#3B001B"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.15}
      >
        BOUNDLESS
      </Text>

      {/* 3D Subtitle / Identity */}
      <Text
        ref={subtitleRef}
        position={[0, 0.8, -8]}
        fontSize={isMobile ? 0.28 : 0.42}
        color="#7C2D12"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.25}
      >
        IITM BS TRAVEL SOCIETY
      </Text>

      {/* Descent Threshold at Y = -25: The Expedition Portal Gate & Text Cube */}
      <group position={[0, -25, 5.69]}>
        <pointLight castShadow position={[1, 1.5, -2.5]} intensity={50} distance={12} color="#FFE878" />
        <ExpeditionPortalGate />
        <TextExpeditionWindow />
      </group>
    </>
  );
};

export default Hero3D;
