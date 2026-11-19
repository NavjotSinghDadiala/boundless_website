'use client';

import React, { useRef, useState } from 'react';
import { Text, useCursor, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';
import gsap from 'gsap';

interface FooterAnchor {
  name: string;
  url: string;
}

const BOUNDLESS_LINKS: FooterAnchor[] = [
  { name: 'LINKEDIN', url: 'https://www.linkedin.com/company/boundless-iitm-bs-travel-club/' },
  { name: 'YOUTUBE', url: 'https://youtube.com/@boundlesstravelclub?si=CpWZufQvCLX-UKKI' },
  { name: 'INSTAGRAM', url: 'https://www.instagram.com/boundless_iitmbs' },
  { name: 'EMAIL', url: 'mailto:boundless.club@study.iitm.ac.in' },
  { name: 'JOIN US', url: 'https://forms.gle/3DKAWuaaeuLwyEhr6' },
];

export const Footer3D: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const data = useScroll();

  useFrame(() => {
    if (!data || !groupRef.current) return;
    const d = data.range(0.85, 0.15);
    groupRef.current.visible = d > 0;
  });

  return (
    <group position={[0, -41.5, 16.4]} rotation={[-Math.PI / 2, 0, 0]} ref={groupRef}>
      <group position={[isMobile ? -1.8 : -4.4, 0, 0]}>
        {BOUNDLESS_LINKS.map((link, i) => (
          <group key={i} position={[i * (isMobile ? 0.9 : 2.2), 0, 0]}>
            <Text
              fontSize={isMobile ? 0.16 : 0.24}
              color="#FDE68A"
              letterSpacing={0.14}
              anchorX="center"
              anchorY="middle"
              onClick={() => window.open(link.url, '_blank')}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
              }}
            >
              {link.name}
            </Text>
          </group>
        ))}
      </group>
    </group>
  );
};

export default Footer3D;
