'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useScroll, Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';

export const ExpeditionPortalGate: React.FC = () => {
  const leftGateRef = useRef<THREE.Group>(null);
  const rightGateRef = useRef<THREE.Group>(null);
  const latchRef = useRef<THREE.Mesh>(null);
  const data = useScroll();

  useFrame(() => {
    // b in [0.30, 0.38]: brass latch unlocks and pivots during approach
    const b = data.range(0.30, 0.08);
    // c in [0.36, 0.44]: double timber wings swing inward away from camera before threshold crossing at Y = -10.5
    const c = data.range(0.36, 0.08);

    if (latchRef.current) {
      latchRef.current.rotation.z = -0.5 * Math.PI * b;
    }
    if (leftGateRef.current) {
      leftGateRef.current.rotation.y = 0.48 * Math.PI * c;
    }
    if (rightGateRef.current) {
      rightGateRef.current.rotation.y = -0.48 * Math.PI * c;
    }
  });

  // Rich handcrafted mahogany, walnut, and burnished brass materials (disposed on unmount)
  const mats = useMemo(() => {
    const frameTimber = new THREE.MeshStandardMaterial({
      color: '#3F190C',
      emissive: '#160703',
      emissiveIntensity: 0.35,
      roughness: 0.68,
      metalness: 0.08,
    });
    const frameAccent = new THREE.MeshStandardMaterial({
      color: '#522211',
      emissive: '#1A0904',
      emissiveIntensity: 0.3,
      roughness: 0.62,
      metalness: 0.1,
    });
    const doorWood = new THREE.MeshStandardMaterial({
      color: '#632915',
      emissive: '#1D0A04',
      emissiveIntensity: 0.32,
      roughness: 0.72,
      metalness: 0.08,
    });
    const cofferRecess = new THREE.MeshStandardMaterial({
      color: '#3A150A',
      emissive: '#120502',
      emissiveIntensity: 0.3,
      roughness: 0.78,
      metalness: 0.06,
    });
    const cofferCenter = new THREE.MeshStandardMaterial({
      color: '#562211',
      emissive: '#180803',
      emissiveIntensity: 0.28,
      roughness: 0.68,
      metalness: 0.08,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: '#E0B866',
      emissive: '#422D0A',
      emissiveIntensity: 0.42,
      metalness: 0.52,
      roughness: 0.3,
    });
    const brassDark = new THREE.MeshStandardMaterial({
      color: '#B68A3D',
      emissive: '#2E1E06',
      emissiveIntensity: 0.32,
      metalness: 0.55,
      roughness: 0.36,
    });
    const plaqueMaroon = new THREE.MeshStandardMaterial({
      color: '#3B001B',
      emissive: '#220010',
      emissiveIntensity: 0.45,
      roughness: 0.45,
      metalness: 0.18,
    });
    const seamGlow = new THREE.MeshBasicMaterial({
      color: '#FDE68A',
      transparent: true,
      opacity: 0.42,
    });

    return {
      frameTimber,
      frameAccent,
      doorWood,
      cofferRecess,
      cofferCenter,
      brass,
      brassDark,
      plaqueMaroon,
      seamGlow,
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(mats).forEach((m) => m.dispose());
    };
  }, [mats]);

  // Proportionally enlarged monumental entrance with comfortable clearance for camera crossing (UNCHANGED)
  const gateScale = isMobile ? 1.18 : 1.72;

  // Reusable architectural coffered detailing rendered on each 1.3 x 3.2 door leaf
  const renderDoorLeafDetails = (isLeft: boolean) => {
    const centerX = isLeft ? 0.65 : -0.65;
    const handleX = isLeft ? 1.14 : -1.14;
    const hingeX = isLeft ? 0.08 : -0.08;
    const seamX = isLeft ? 1.295 : -1.295;

    return (
      <>
        {/* Upper Coffered Panel: Dark Recessed Molding + Raised Center Tablet */}
        <mesh position={[centerX, 0.72, 0.044]} material={mats.cofferRecess}>
          <boxGeometry args={[0.88, 1.32, 0.018]} />
          <Edges color="#C8A252" lineWidth={1.1} />
        </mesh>
        <mesh position={[centerX, 0.72, 0.056]} material={mats.cofferCenter}>
          <boxGeometry args={[0.68, 1.1, 0.016]} />
          <Edges color="#8C6226" lineWidth={0.9} />
        </mesh>
        {/* Upper Panel Ornamental Brass Medallion */}
        <mesh position={[centerX, 0.72, 0.068]} material={mats.brass} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.16, 0.16, 0.014]} />
        </mesh>
        <mesh position={[centerX, 0.72, 0.074]} material={mats.plaqueMaroon}>
          <boxGeometry args={[0.09, 0.09, 0.012]} />
        </mesh>

        {/* Lower Coffered Panel: Dark Recessed Molding + Raised Center Tablet */}
        <mesh position={[centerX, -0.78, 0.044]} material={mats.cofferRecess}>
          <boxGeometry args={[0.88, 1.04, 0.018]} />
          <Edges color="#C8A252" lineWidth={1.1} />
        </mesh>
        <mesh position={[centerX, -0.78, 0.056]} material={mats.cofferCenter}>
          <boxGeometry args={[0.68, 0.82, 0.016]} />
          <Edges color="#8C6226" lineWidth={0.9} />
        </mesh>

        {/* Middle Horizontal Brass Rail Accent */}
        <mesh position={[centerX, -0.08, 0.048]} material={mats.brassDark}>
          <boxGeometry args={[1.04, 0.036, 0.016]} />
        </mesh>

        {/* Forged Brass Strap Hinges (Upper & Lower) */}
        <mesh position={[hingeX, 1.15, 0.05]} material={mats.brassDark}>
          <boxGeometry args={[0.24, 0.09, 0.02]} />
        </mesh>
        <mesh position={[hingeX, -1.15, 0.05]} material={mats.brassDark}>
          <boxGeometry args={[0.24, 0.09, 0.02]} />
        </mesh>

        {/* Ornate Brass Escutcheon Plate & Ring Knocker Handle */}
        <mesh position={[handleX, -0.04, 0.052]} material={mats.brassDark}>
          <boxGeometry args={[0.12, 0.34, 0.018]} />
        </mesh>
        <mesh position={[handleX, -0.04, 0.076]} material={mats.brass}>
          <torusGeometry args={[0.075, 0.018, 8, 22]} />
        </mesh>

        {/* Subtle Warm Golden Inner-Seam Highlight */}
        <mesh position={[seamX, 0, 0.042]} material={mats.seamGlow}>
          <boxGeometry args={[0.012, 3.16, 0.012]} />
        </mesh>
      </>
    );
  };

  return (
    <group dispose={null} rotation={[-Math.PI / 2, 0, 0]} scale={gateScale}>
      {/* Outer Sculpted Timber Archway Frame (Exact Original Dimensions Preserved) */}
      <group position={[0, 0, 0]}>
        {/* Left Timber Post + Stepped Capital & Base Plinth */}
        <mesh position={[-1.6, 0, 0]} castShadow receiveShadow material={mats.frameTimber}>
          <boxGeometry args={[0.25, 3.6, 0.25]} />
          <Edges color="#6B4423" lineWidth={1} />
        </mesh>
        <mesh position={[-1.6, 1.62, 0.02]} material={mats.frameAccent}>
          <boxGeometry args={[0.32, 0.16, 0.3]} />
          <Edges color="#C8A252" lineWidth={0.9} />
        </mesh>
        <mesh position={[-1.6, -1.72, 0.02]} material={mats.frameAccent}>
          <boxGeometry args={[0.33, 0.2, 0.31]} />
          <Edges color="#8C6226" lineWidth={0.9} />
        </mesh>

        {/* Right Timber Post + Stepped Capital & Base Plinth */}
        <mesh position={[1.6, 0, 0]} castShadow receiveShadow material={mats.frameTimber}>
          <boxGeometry args={[0.25, 3.6, 0.25]} />
          <Edges color="#6B4423" lineWidth={1} />
        </mesh>
        <mesh position={[1.6, 1.62, 0.02]} material={mats.frameAccent}>
          <boxGeometry args={[0.32, 0.16, 0.3]} />
          <Edges color="#C8A252" lineWidth={0.9} />
        </mesh>
        <mesh position={[1.6, -1.72, 0.02]} material={mats.frameAccent}>
          <boxGeometry args={[0.33, 0.2, 0.31]} />
          <Edges color="#8C6226" lineWidth={0.9} />
        </mesh>

        {/* Top Header Beam + Layered Architectural Crown Cornice */}
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow material={mats.frameTimber}>
          <boxGeometry args={[3.5, 0.25, 0.3]} />
          <Edges color="#6B4423" lineWidth={1} />
        </mesh>
        <mesh position={[0, 1.97, 0.03]} material={mats.frameAccent}>
          <boxGeometry args={[3.72, 0.1, 0.36]} />
          <Edges color="#D4AF6A" lineWidth={1.1} />
        </mesh>
        <mesh position={[0, 1.66, 0.14]} material={mats.brassDark}>
          <boxGeometry args={[3.16, 0.024, 0.04]} />
        </mesh>

        {/* Expedition Arch Inscription Plaque + Sculpted Golden Center Crest */}
        <mesh position={[0, 1.8, 0.175]} material={mats.plaqueMaroon}>
          <boxGeometry args={[2.24, 0.17, 0.05]} />
          <Edges color="#E8CC8C" lineWidth={1.4} />
        </mesh>
        <mesh position={[0, 1.8, 0.208]} material={mats.brass} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.11, 0.11, 0.016]} />
        </mesh>
        <mesh position={[-0.78, 1.8, 0.205]} material={mats.brass}>
          <boxGeometry args={[0.42, 0.016, 0.012]} />
        </mesh>
        <mesh position={[0.78, 1.8, 0.205]} material={mats.brass}>
          <boxGeometry args={[0.42, 0.016, 0.012]} />
        </mesh>
      </group>

      {/* Left Gate Wing (Hinged at x = -1.45 — UNCHANGED) */}
      <group position={[-1.45, 0, 0]} ref={leftGateRef}>
        <mesh position={[0.65, 0, 0]} castShadow receiveShadow material={mats.doorWood}>
          <boxGeometry args={[1.3, 3.2, 0.08]} />
          <Edges color="#E0BE78" lineWidth={1.2} />
        </mesh>
        {renderDoorLeafDetails(true)}
        {/* Animated Brass Latch Pin (Preserved) */}
        <mesh ref={latchRef} position={[1.25, 0, 0.085]} material={mats.brass}>
          <cylinderGeometry args={[0.04, 0.04, 0.42, 12]} />
        </mesh>
      </group>

      {/* Right Gate Wing (Hinged at x = +1.45 — UNCHANGED) */}
      <group position={[1.45, 0, 0]} ref={rightGateRef}>
        <mesh position={[-0.65, 0, 0]} castShadow receiveShadow material={mats.doorWood}>
          <boxGeometry args={[1.3, 3.2, 0.08]} />
          <Edges color="#E0BE78" lineWidth={1.2} />
        </mesh>
        {renderDoorLeafDetails(false)}
      </group>
    </group>
  );
};

export default ExpeditionPortalGate;
