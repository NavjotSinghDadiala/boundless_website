'use client';

import React from 'react';
import { Clouds, Cloud, Stars } from '@react-three/drei';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';

/**
 * Deep Outer-Space Cosmic Environment
 * - Near-black space backdrop with sparse, delicate distant stars.
 * - Extremely subtle distant nebula wisps in deep indigo, violet, and maroon.
 * - Adaptive star & cloud complexity for smooth mobile performance.
 */
export const AtmosphereSky: React.FC = () => {
  return (
    <group position={[0, -18, 5]}>
      {/* Sparse, delicate distant stars — refined and understated */}
      <Stars
        radius={95}
        depth={65}
        count={isMobile ? 420 : 900}
        factor={2.4}
        saturation={0.25}
        fade
        speed={0.22}
      />

      {/* Extremely subtle distant nebula wisps for cosmic depth cues */}
      <Clouds material={THREE.MeshBasicMaterial} position={[0, 0, -12]}>
        <Cloud
          seed={401}
          segments={1}
          bounds={[18, 12, 10]}
          growth={4}
          position={[-14, 10, -8]}
          color="#1e1b4b"
          opacity={0.09}
          speed={0.04}
        />
        <Cloud
          seed={402}
          segments={1}
          bounds={[20, 14, 10]}
          growth={4.5}
          position={[15, -6, -10]}
          color="#3b0764"
          opacity={0.08}
          speed={0.03}
        />
        {!isMobile && (
          <Cloud
            seed={403}
            segments={1}
            bounds={[22, 14, 12]}
            growth={5}
            position={[-10, -22, -6]}
            color="#4c0519"
            opacity={0.09}
            speed={0.035}
          />
        )}
      </Clouds>
    </group>
  );
};

export default AtmosphereSky;
