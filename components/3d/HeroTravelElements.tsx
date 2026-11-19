'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Line, useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';

function usePrefersReducedMotion(): boolean {
  const ref = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    ref.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      ref.current = e.matches;
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return ref.current;
}

/**
 * Curated, independently animated 3D travel instruments floating in the cosmic hero space:
 * - Miniature wireframe globe with tilted orbital ring
 * - Vintage expedition aircraft silhouette gliding along a subtle curved path
 * - Gimbaled celestial navigation compass (desktop/tablet)
 * - Distant orbital probe + delicate golden constellation arc
 * - Instanced glowing geographic waypoint beacons (single draw call)
 *
 * Uses R3F's single shared `state.pointer` for depth-weighted parallax with smooth
 * return-to-center when the cursor leaves the canvas. Respects `prefers-reduced-motion`.
 */
export const HeroTravelElements: React.FC = () => {
  const rootRef = useRef<THREE.Group>(null);
  const globeGroupRef = useRef<THREE.Group>(null);
  const globeMeshRef = useRef<THREE.Mesh>(null);
  const aircraftGroupRef = useRef<THREE.Group>(null);
  const compassGroupRef = useRef<THREE.Group>(null);
  const compassInnerRingRef = useRef<THREE.Mesh>(null);
  const compassNeedleRef = useRef<THREE.Group>(null);
  const satelliteGroupRef = useRef<THREE.Group>(null);
  const waypointsRef = useRef<THREE.InstancedMesh>(null);

  const pointerInsideRef = useRef(true);
  const smoothPointer = useRef({ x: 0, y: 0 });
  const reducedMotionRef = useRef(false);

  const { gl, size } = useThree();
  const data = useScroll();
  usePrefersReducedMotion();

  const aspect = size.width / Math.max(1, size.height);
  const isNarrow = isMobile || aspect < 0.85;

  // Track reduced motion live in ref for zero-re-render checks inside useFrame
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Return parallax naturally to center when pointer leaves the canvas
  useEffect(() => {
    const dom = gl.domElement;
    const onEnter = () => {
      pointerInsideRef.current = true;
    };
    const onLeave = () => {
      pointerInsideRef.current = false;
    };
    dom.addEventListener('pointerenter', onEnter);
    dom.addEventListener('pointerleave', onLeave);
    return () => {
      dom.removeEventListener('pointerenter', onEnter);
      dom.removeEventListener('pointerleave', onLeave);
    };
  }, [gl]);

  // Shared materials reused across procedural travel instruments & disposed on unmount
  const materials = useMemo(() => {
    const goldWire = new THREE.MeshBasicMaterial({ color: '#D4AF6A', wireframe: true, transparent: true, opacity: 0.55 });
    const goldSolid = new THREE.MeshStandardMaterial({ color: '#E8D29D', metalness: 0.72, roughness: 0.28 });
    const bronzeDark = new THREE.MeshStandardMaterial({ color: '#5A2D16', metalness: 0.45, roughness: 0.55 });
    const cosmicCore = new THREE.MeshStandardMaterial({ color: '#140b24', roughness: 0.85, metalness: 0.1 });
    const crimsonTip = new THREE.MeshStandardMaterial({ color: '#9F1239', metalness: 0.5, roughness: 0.35 });
    const beaconMat = new THREE.MeshBasicMaterial({ color: '#FDE68A', transparent: true, opacity: 0.72 });
    return { goldWire, goldSolid, bronzeDark, cosmicCore, crimsonTip, beaconMat };
  }, []);

  // Shared geometries disposed cleanly on unmount
  const geometries = useMemo(() => {
    return {
      globeCore: new THREE.SphereGeometry(0.62, 16, 12),
      globeWire: new THREE.SphereGeometry(0.64, 14, 10),
      globeRing: new THREE.TorusGeometry(0.95, 0.012, 8, 48),
      compassOuter: new THREE.TorusGeometry(0.62, 0.018, 10, 48),
      compassInner: new THREE.TorusGeometry(0.46, 0.012, 8, 36),
      needleCone: new THREE.ConeGeometry(0.055, 0.36, 4),
      fuselage: new THREE.CylinderGeometry(0.032, 0.06, 0.95, 8),
      wing: new THREE.BoxGeometry(1.15, 0.018, 0.22),
      tailWing: new THREE.BoxGeometry(0.42, 0.016, 0.12),
      tailFin: new THREE.BoxGeometry(0.018, 0.22, 0.16),
      satCore: new THREE.OctahedronGeometry(0.11, 0),
      satPanel: new THREE.BoxGeometry(0.42, 0.012, 0.14),
      beaconGeo: new THREE.OctahedronGeometry(0.055, 0),
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(materials).forEach((m) => m.dispose());
      Object.values(geometries).forEach((g) => g.dispose());
    };
  }, [materials, geometries]);

  // Deterministic floating geographic waypoint beacons (8 desktop, 4 mobile)
  const waypointSpecs = useMemo(() => {
    const all = [
      { pos: [-6.4, 3.3, -9.5], speed: 0.55, amp: 0.18, phase: 0.4, depth: 0.45 },
      { pos: [6.2, 3.6, -10.2], speed: 0.42, amp: 0.22, phase: 1.7, depth: 0.40 },
      { pos: [-5.8, -0.4, -7.2], speed: 0.68, amp: 0.16, phase: 2.5, depth: 0.70 },
      { pos: [5.9, -0.8, -7.8], speed: 0.51, amp: 0.20, phase: 3.4, depth: 0.65 },
      { pos: [-3.2, 4.0, -8.8], speed: 0.62, amp: 0.15, phase: 4.1, depth: 0.55 },
      { pos: [3.4, -3.1, -6.4], speed: 0.48, amp: 0.19, phase: 5.2, depth: 0.85 },
      { pos: [-2.8, -3.3, -7.0], speed: 0.59, amp: 0.17, phase: 0.9, depth: 0.80 },
      { pos: [7.1, 1.4, -11.0], speed: 0.37, amp: 0.24, phase: 2.2, depth: 0.35 },
    ];
    if (isNarrow) {
      return [
        { pos: [-1.8, 3.5, -8.5], speed: 0.52, amp: 0.14, phase: 0.5, depth: 0.4 },
        { pos: [1.9, 3.2, -9.2], speed: 0.44, amp: 0.16, phase: 1.9, depth: 0.4 },
        { pos: [-1.9, -2.5, -7.5], speed: 0.60, amp: 0.14, phase: 3.1, depth: 0.5 },
        { pos: [1.8, -2.8, -8.0], speed: 0.48, amp: 0.15, phase: 4.4, depth: 0.5 },
      ];
    }
    return all;
  }, [isNarrow]);

  const dummyObj = useMemo(() => new THREE.Object3D(), []);

  // Subtle constellation navigation arc in upper-right cosmic distance
  const constellationPoints = useMemo<[number, number, number][]>(() => {
    if (isNarrow) {
      return [
        [-1.9, 3.6, -10.5],
        [-0.6, 4.1, -11.0],
        [1.1, 3.7, -10.8],
        [2.1, 3.1, -10.2],
      ];
    }
    return [
      [2.8, 3.8, -11.5],
      [4.5, 4.2, -12.0],
      [6.4, 3.1, -11.2],
      [7.4, 1.5, -11.5],
    ];
  }, [isNarrow]);

  // Base anchor coordinates tailored separately for desktop vs narrow mobile viewports
  // Desktop coordinates give wide clearance around the Cinzel BOUNDLESS title
  const globeBase = isNarrow ? [-1.55, 2.95, -7.4] : [-8.2, 3.2, -7.2];
  const aircraftBase = isNarrow ? [1.35, -2.4, -6.8] : [7.6, 3.3, -6.2];
  const compassBase = [-6.8, -2.6, -5.2];
  const satBase = isNarrow ? [1.55, 3.05, -9.2] : [7.4, -2.2, -8.2];

  useFrame((state, delta) => {
    if (!rootRef.current) return;

    // Fade hero travel elements smoothly away once camera pitches down toward the wooden door
    const scrollOffset = data ? data.offset : 0;
    const heroFade = 1 - THREE.MathUtils.smoothstep(scrollOffset, 0.14, 0.30);
    rootRef.current.visible = heroFade > 0.01;
    if (!rootRef.current.visible) return;

    const motionScale = reducedMotionRef.current ? 0 : 1;
    const t = state.clock.elapsedTime * motionScale;

    // Single shared damped pointer parallax (desktop only; returns naturally to 0 on pointerleave)
    const targetPx = !isMobile && pointerInsideRef.current && !reducedMotionRef.current ? state.pointer.x : 0;
    const targetPy = !isMobile && pointerInsideRef.current && !reducedMotionRef.current ? state.pointer.y : 0;
    smoothPointer.current.x = THREE.MathUtils.damp(smoothPointer.current.x, targetPx, 4.5, delta);
    smoothPointer.current.y = THREE.MathUtils.damp(smoothPointer.current.y, targetPy, 4.5, delta);
    const px = smoothPointer.current.x;
    const py = smoothPointer.current.y;

    // 1. Miniature Wireframe Globe (slow axial spin + medium depth parallax)
    if (globeGroupRef.current) {
      globeGroupRef.current.position.set(
        globeBase[0] + px * 0.42 + Math.cos(t * 0.28) * 0.12,
        globeBase[1] + py * 0.32 + Math.sin(t * 0.42 + 0.6) * 0.16,
        globeBase[2]
      );
      globeGroupRef.current.rotation.z = 0.28 + px * 0.08;
      globeGroupRef.current.rotation.x = 0.18 - py * 0.08;
    }
    if (globeMeshRef.current) {
      globeMeshRef.current.rotation.y = t * 0.18;
    }

    // 2. Vintage Expedition Aircraft (gentle curved gliding arc + responsive bank)
    if (aircraftGroupRef.current) {
      const glideX = Math.sin(t * 0.32 + 1.1) * (isNarrow ? 0.32 : 0.65);
      const glideY = Math.cos(t * 0.44 + 0.4) * 0.22;
      aircraftGroupRef.current.position.set(
        aircraftBase[0] + glideX + px * 0.62,
        aircraftBase[1] + glideY + py * 0.45,
        aircraftBase[2] + Math.sin(t * 0.25) * 0.25
      );
      aircraftGroupRef.current.rotation.set(
        0.18 - py * 0.14,
        -0.55 + Math.cos(t * 0.32 + 1.1) * 0.18 + px * 0.18,
        -0.16 + Math.sin(t * 0.44) * 0.08 - px * 0.12
      );
    }

    // 3. Celestial Navigation Compass (close depth — stronger parallax + dual-axis gimbal)
    if (compassGroupRef.current) {
      compassGroupRef.current.position.set(
        compassBase[0] + px * 0.78 + Math.sin(t * 0.36 + 2.3) * 0.10,
        compassBase[1] + py * 0.56 + Math.cos(t * 0.52 + 1.4) * 0.14,
        compassBase[2]
      );
      compassGroupRef.current.rotation.set(
        0.22 - py * 0.20,
        0.35 + px * 0.24 + Math.sin(t * 0.22) * 0.12,
        Math.cos(t * 0.19) * 0.08
      );
    }
    if (compassInnerRingRef.current) {
      compassInnerRingRef.current.rotation.x = t * 0.26;
      compassInnerRingRef.current.rotation.y = t * 0.14;
    }
    if (compassNeedleRef.current) {
      compassNeedleRef.current.rotation.z = Math.sin(t * 0.55) * 0.38 - px * 0.25;
    }

    // 4. Distant Orbital Probe (far depth — subtle parallax + wide gentle orbit)
    if (satelliteGroupRef.current) {
      satelliteGroupRef.current.position.set(
        satBase[0] + Math.cos(t * 0.22 + 3.0) * 0.35 + px * 0.22,
        satBase[1] + Math.sin(t * 0.28 + 1.8) * 0.24 + py * 0.18,
        satBase[2]
      );
      satelliteGroupRef.current.rotation.set(0.35 + t * 0.12, t * 0.21, -0.25);
    }

    // 5. Instanced Waypoint Beacons (independent phases & depth-weighted parallax, 1 draw call)
    if (waypointsRef.current) {
      for (let i = 0; i < waypointSpecs.length; i++) {
        const w = waypointSpecs[i];
        dummyObj.position.set(
          w.pos[0] + px * 0.55 * w.depth,
          w.pos[1] + py * 0.42 * w.depth + Math.sin(t * w.speed + w.phase) * w.amp,
          w.pos[2]
        );
        dummyObj.rotation.set(t * 0.3 + w.phase, t * 0.45 + w.phase, 0);
        const pulse = 0.85 + Math.sin(t * 1.1 + w.phase) * 0.15;
        dummyObj.scale.setScalar(pulse * heroFade);
        dummyObj.updateMatrix();
        waypointsRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      waypointsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const globeScale = isNarrow ? 0.62 : 1.0;
  const aircraftScale = isNarrow ? 0.65 : 0.95;
  const satScale = isNarrow ? 0.68 : 1.0;

  return (
    <group ref={rootRef} name="hero-travel-elements">
      {/* 1. Miniature Wireframe Globe */}
      <group ref={globeGroupRef} position={globeBase as [number, number, number]} scale={globeScale}>
        <group ref={globeMeshRef as any}>
          <mesh geometry={geometries.globeCore} material={materials.cosmicCore} />
          <mesh geometry={geometries.globeWire} material={materials.goldWire} />
        </group>
        <mesh geometry={geometries.globeRing} material={materials.goldSolid} rotation={[Math.PI / 2.6, 0.3, 0]} />
      </group>

      {/* 2. Vintage Expedition Aircraft Silhouette */}
      <group ref={aircraftGroupRef} position={aircraftBase as [number, number, number]} scale={aircraftScale}>
        <mesh geometry={geometries.fuselage} material={materials.goldSolid} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geometries.wing} material={materials.goldSolid} position={[0, 0.01, -0.05]} />
        <mesh geometry={geometries.tailWing} material={materials.bronzeDark} position={[0, 0.02, 0.38]} />
        <mesh geometry={geometries.tailFin} material={materials.bronzeDark} position={[0, 0.12, 0.38]} />
      </group>

      {/* 3. Gimbaled Celestial Navigation Compass (desktop & tablet only to keep mobile spacious) */}
      {!isNarrow && (
        <group ref={compassGroupRef} position={compassBase as [number, number, number]}>
          <mesh geometry={geometries.compassOuter} material={materials.goldSolid} />
          <mesh ref={compassInnerRingRef} geometry={geometries.compassInner} material={materials.goldSolid} />
          <group ref={compassNeedleRef}>
            <mesh geometry={geometries.needleCone} material={materials.crimsonTip} position={[0, 0.18, 0]} />
            <mesh
              geometry={geometries.needleCone}
              material={materials.goldSolid}
              position={[0, -0.18, 0]}
              rotation={[Math.PI, 0, 0]}
            />
          </group>
        </group>
      )}

      {/* 4. Distant Orbital Probe */}
      <group ref={satelliteGroupRef} position={satBase as [number, number, number]} scale={satScale}>
        <mesh geometry={geometries.satCore} material={materials.goldSolid} />
        <mesh geometry={geometries.satPanel} material={materials.bronzeDark} position={[-0.32, 0, 0]} />
        <mesh geometry={geometries.satPanel} material={materials.bronzeDark} position={[0.32, 0, 0]} />
      </group>

      {/* Subtle distant golden constellation navigation arc */}
      <Line points={constellationPoints} color="#D4AF6A" lineWidth={0.9} transparent opacity={0.22} />

      {/* 5. Instanced Floating Geographic Waypoint Beacons (single draw call) */}
      <instancedMesh
        ref={waypointsRef}
        args={[geometries.beaconGeo, materials.beaconMat, waypointSpecs.length]}
      />
    </group>
  );
};

export default HeroTravelElements;
