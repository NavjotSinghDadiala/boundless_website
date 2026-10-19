'use client';

import React from 'react';
import { Clouds, Cloud, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useBoundless3DStore } from '@/context/boundless3dStore';

export const AtmosphereSky: React.FC = () => {
  const theme = useBoundless3DStore((state) => state.theme);
  const isNight = theme === 'night';
  const cloudColor = theme === 'golden_hour' ? '#fae3c3' : '#ffffff';

  return (
    <group position={[0, 0, 0]}>
      {/* Volumetric Clouds using the reference Drei Clouds architecture */}
      <Clouds material={THREE.MeshBasicMaterial} position={[0, -4, -2]}>
        <Cloud
          seed={101}
          segments={1}
          bounds={[12, 6, 8]}
          growth={3}
          position={[-2, 0, 0]}
          color={cloudColor}
          opacity={0.65}
          speed={0.15}
        />
        <Cloud
          seed={202}
          segments={1}
          bounds={[14, 8, 10]}
          growth={2.5}
          position={[3, -1, 1]}
          color={cloudColor}
          opacity={0.55}
          speed={0.1}
        />
        <Cloud
          seed={303}
          segments={1}
          bounds={[16, 10, 12]}
          growth={4}
          position={[-6, -8, 3]}
          color={cloudColor}
          opacity={0.5}
          speed={0.12}
        />
      </Clouds>

      {/* Atmospheric Starfield (enabled during night expeditions) */}
      {isNight && (
        <Stars radius={150} depth={80} count={3500} factor={8} saturation={5} fade speed={0.8} />
      )}
    </group>
  );
};

export default AtmosphereSky;
