'use client';

import React, { useRef } from 'react';
import { useScroll, Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ExpeditionPortalGate: React.FC = () => {
  const leftGateRef = useRef<THREE.Group>(null);
  const rightGateRef = useRef<THREE.Group>(null);
  const latchRef = useRef<THREE.Mesh>(null);
  const data = useScroll();

  useFrame(() => {
    // b in [0.4, 0.5]: latch unlocks and pivots
    const b = data.range(0.4, 0.1);
    // c in [0.5, 0.6]: double gate wings swing outward
    const c = data.range(0.5, 0.1);

    if (latchRef.current) {
      latchRef.current.rotation.z = -0.5 * Math.PI * b;
    }
    if (leftGateRef.current) {
      leftGateRef.current.rotation.y = -0.45 * Math.PI * c;
    }
    if (rightGateRef.current) {
      rightGateRef.current.rotation.y = 0.45 * Math.PI * c;
    }
  });

  return (
    <group dispose={null}>
      {/* Outer Timber Archway Frame */}
      <group position={[0, 0, 0]}>
        {/* Left Timber Post */}
        <mesh position={[-1.6, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 3.6, 0.25]} />
          <meshStandardMaterial color="#4A1E0E" roughness={0.7} />
          <Edges color="#240D05" lineWidth={1} />
        </mesh>

        {/* Right Timber Post */}
        <mesh position={[1.6, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25, 3.6, 0.25]} />
          <meshStandardMaterial color="#4A1E0E" roughness={0.7} />
          <Edges color="#240D05" lineWidth={1} />
        </mesh>

        {/* Top Header Beam */}
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.5, 0.25, 0.3]} />
          <meshStandardMaterial color="#4A1E0E" roughness={0.7} />
          <Edges color="#240D05" lineWidth={1} />
        </mesh>

        {/* Expedition Arch Inscription Plaque */}
        <mesh position={[0, 1.8, 0.18]}>
          <boxGeometry args={[2.2, 0.16, 0.05]} />
          <meshStandardMaterial color="#3B001B" />
          <Edges color="#FFE878" lineWidth={1.5} />
        </mesh>
      </group>

      {/* Left Gate Wing (Hinged at x = -1.45) */}
      <group position={[-1.45, 0, 0]} ref={leftGateRef}>
        <mesh position={[0.65, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 3.2, 0.08]} />
          <meshStandardMaterial color="#6B2E18" roughness={0.8} />
          <Edges color="#FFE878" lineWidth={1.2} />
        </mesh>
        {/* Latch Pin */}
        <mesh ref={latchRef} position={[1.25, 0, 0.08]}>
          <cylinderGeometry args={[0.04, 0.04, 0.4]} />
          <meshStandardMaterial color="#D97706" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Right Gate Wing (Hinged at x = +1.45) */}
      <group position={[1.45, 0, 0]} ref={rightGateRef}>
        <mesh position={[-0.65, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 3.2, 0.08]} />
          <meshStandardMaterial color="#6B2E18" roughness={0.8} />
          <Edges color="#FFE878" lineWidth={1.2} />
        </mesh>
      </group>
    </group>
  );
};

export default ExpeditionPortalGate;
