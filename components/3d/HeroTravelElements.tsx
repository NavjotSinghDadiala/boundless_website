'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Line, useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';

/**
 * Curated, independently animated 3D TRAVEL elements floating around the hero:
 * - Wireframe Explorer Globe with orbital meridian ring
 * - Vintage Expedition Airplane with curved golden flight trail
 * - Gimbaled Travel Compass (desktop/tablet)
 * - Classic Hot Air Balloon with wicker basket
 * - Vintage Travel Camera with multi-ring lens & viewfinder
 * - 3D Map Location Pin with glowing ground ring
 * - Vintage Leather Travel Suitcase / Trunk (desktop/tablet)
 * - Faceted Alpine Mountain Peaks with snow caps & golden ridge accents (desktop/tablet)
 * - Instanced glowing travel waypoint markers (single draw call)
 *
 * Uses R3F's single shared `state.pointer` for depth-weighted parallax with smooth
 * return-to-center when the cursor leaves the canvas. Respects `prefers-reduced-motion`.
 */
export const HeroTravelElements: React.FC = () => {
  const rootRef = useRef<THREE.Group>(null);
  const globeGroupRef = useRef<THREE.Group>(null);
  const globeMeshRef = useRef<THREE.Group>(null);
  const aircraftGroupRef = useRef<THREE.Group>(null);
  const compassGroupRef = useRef<THREE.Group>(null);
  const compassInnerRingRef = useRef<THREE.Mesh>(null);
  const compassNeedleRef = useRef<THREE.Group>(null);
  const balloonGroupRef = useRef<THREE.Group>(null);
  const cameraGroupRef = useRef<THREE.Group>(null);
  const pinGroupRef = useRef<THREE.Group>(null);
  const suitcaseGroupRef = useRef<THREE.Group>(null);
  const mountainGroupRef = useRef<THREE.Group>(null);
  const waypointsRef = useRef<THREE.InstancedMesh>(null);

  const pointerInsideRef = useRef(true);
  const smoothPointer = useRef({ x: 0, y: 0 });
  const reducedMotionRef = useRef(false);

  const { gl, size } = useThree();
  const data = useScroll();

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

  // Warm, readable travel palette with gentle emissive lift so silhouettes read cleanly against dark space
  const materials = useMemo(() => {
    const goldWire = new THREE.MeshBasicMaterial({
      color: '#E0BE78',
      wireframe: true,
      transparent: true,
      opacity: 0.62,
    });
    const goldSolid = new THREE.MeshStandardMaterial({
      color: '#E8CC8C',
      emissive: '#3D2A0B',
      emissiveIntensity: 0.42,
      metalness: 0.35,
      roughness: 0.36,
    });
    const champagneLight = new THREE.MeshStandardMaterial({
      color: '#F5E4BE',
      emissive: '#3A2E14',
      emissiveIntensity: 0.35,
      metalness: 0.28,
      roughness: 0.35,
    });
    const leatherWarm = new THREE.MeshStandardMaterial({
      color: '#8C4323',
      emissive: '#260E05',
      emissiveIntensity: 0.38,
      metalness: 0.15,
      roughness: 0.62,
    });
    const bronzeDark = new THREE.MeshStandardMaterial({
      color: '#5C301A',
      emissive: '#1F0E06',
      emissiveIntensity: 0.35,
      metalness: 0.32,
      roughness: 0.52,
    });
    const maroonExpedition = new THREE.MeshStandardMaterial({
      color: '#9B1D43',
      emissive: '#380717',
      emissiveIntensity: 0.45,
      metalness: 0.22,
      roughness: 0.44,
    });
    const slateMountain = new THREE.MeshStandardMaterial({
      color: '#3A2D4F',
      emissive: '#160F24',
      emissiveIntensity: 0.45,
      metalness: 0.15,
      roughness: 0.78,
      flatShading: true,
    });
    const snowCap = new THREE.MeshStandardMaterial({
      color: '#F6ECD9',
      emissive: '#3A3122',
      emissiveIntensity: 0.32,
      metalness: 0.08,
      roughness: 0.55,
      flatShading: true,
    });
    const lensGlass = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      emissive: '#38BDF8',
      emissiveIntensity: 0.22,
      metalness: 0.65,
      roughness: 0.18,
    });
    const cosmicCore = new THREE.MeshStandardMaterial({
      color: '#140b24',
      roughness: 0.85,
      metalness: 0.1,
    });
    const beaconMat = new THREE.MeshBasicMaterial({
      color: '#FDE68A',
      transparent: true,
      opacity: 0.72,
    });
    const haloRingMat = new THREE.MeshBasicMaterial({
      color: '#E8CC8C',
      transparent: true,
      opacity: 0.58,
    });

    return {
      goldWire,
      goldSolid,
      champagneLight,
      leatherWarm,
      bronzeDark,
      maroonExpedition,
      slateMountain,
      snowCap,
      lensGlass,
      cosmicCore,
      beaconMat,
      haloRingMat,
    };
  }, []);

  // Shared procedural travel geometries — disposed cleanly on unmount
  const geometries = useMemo(() => {
    return {
      // 1. Globe
      globeCore: new THREE.SphereGeometry(0.62, 16, 12),
      globeWire: new THREE.SphereGeometry(0.64, 14, 10),
      globeRing: new THREE.TorusGeometry(0.95, 0.014, 8, 48),

      // 2. Airplane
      fuselage: new THREE.CylinderGeometry(0.042, 0.072, 1.12, 10),
      noseCone: new THREE.ConeGeometry(0.042, 0.16, 10),
      wing: new THREE.BoxGeometry(1.36, 0.022, 0.24),
      tailWing: new THREE.BoxGeometry(0.48, 0.018, 0.13),
      tailFin: new THREE.BoxGeometry(0.022, 0.26, 0.18),

      // 3. Compass
      compassOuter: new THREE.TorusGeometry(0.62, 0.02, 10, 48),
      compassInner: new THREE.TorusGeometry(0.46, 0.013, 8, 36),
      needleCone: new THREE.ConeGeometry(0.06, 0.38, 4),
      compassTick: new THREE.BoxGeometry(0.025, 0.09, 0.025),

      // 4. Hot Air Balloon
      balloonBulb: new THREE.SphereGeometry(0.46, 14, 12),
      balloonBand: new THREE.TorusGeometry(0.455, 0.022, 8, 28),
      balloonNeck: new THREE.ConeGeometry(0.24, 0.34, 12),
      balloonBasket: new THREE.BoxGeometry(0.22, 0.18, 0.22),
      balloonStrut: new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6),

      // 5. Vintage Travel Camera
      camBody: new THREE.BoxGeometry(0.86, 0.52, 0.34),
      camTopPlate: new THREE.BoxGeometry(0.88, 0.1, 0.35),
      camPrism: new THREE.BoxGeometry(0.28, 0.14, 0.26),
      camLensOuter: new THREE.CylinderGeometry(0.2, 0.22, 0.22, 20),
      camLensRing: new THREE.TorusGeometry(0.2, 0.018, 8, 24),
      camLensGlass: new THREE.CylinderGeometry(0.145, 0.145, 0.04, 18),
      camShutter: new THREE.CylinderGeometry(0.045, 0.045, 0.06, 10),

      // 6. 3D Map Location Pin
      pinHead: new THREE.SphereGeometry(0.28, 16, 14),
      pinInnerHole: new THREE.SphereGeometry(0.11, 12, 10),
      pinTip: new THREE.ConeGeometry(0.22, 0.46, 16),
      pinHalo: new THREE.TorusGeometry(0.32, 0.014, 8, 32),

      // 7. Vintage Expedition Suitcase
      caseBody: new THREE.BoxGeometry(0.88, 0.58, 0.3),
      caseStrap: new THREE.BoxGeometry(0.08, 0.61, 0.33),
      caseHandle: new THREE.TorusGeometry(0.14, 0.022, 8, 18, Math.PI),
      caseCorner: new THREE.BoxGeometry(0.12, 0.12, 0.32),

      // 8. Faceted Alpine Mountain Peaks
      peakMain: new THREE.ConeGeometry(0.68, 1.05, 6),
      peakMainCap: new THREE.ConeGeometry(0.24, 0.37, 6),
      peakLeft: new THREE.ConeGeometry(0.46, 0.72, 6),
      peakLeftCap: new THREE.ConeGeometry(0.17, 0.26, 6),
      peakRight: new THREE.ConeGeometry(0.5, 0.78, 6),
      peakRightCap: new THREE.ConeGeometry(0.18, 0.28, 6),

      // 9. Waypoint Diamonds
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
      { pos: [-6.4, 3.6, -9.8], speed: 0.55, amp: 0.18, phase: 0.4, depth: 0.45 },
      { pos: [6.2, 3.8, -10.2], speed: 0.42, amp: 0.22, phase: 1.7, depth: 0.40 },
      { pos: [-5.6, -0.3, -7.6], speed: 0.68, amp: 0.16, phase: 2.5, depth: 0.70 },
      { pos: [5.8, -0.5, -8.0], speed: 0.51, amp: 0.20, phase: 3.4, depth: 0.65 },
      { pos: [-1.4, 4.2, -9.2], speed: 0.62, amp: 0.15, phase: 4.1, depth: 0.55 },
      { pos: [1.5, -3.5, -7.2], speed: 0.48, amp: 0.19, phase: 5.2, depth: 0.85 },
      { pos: [-4.4, -3.5, -7.6], speed: 0.59, amp: 0.17, phase: 0.9, depth: 0.80 },
      { pos: [8.4, 0.8, -10.6], speed: 0.37, amp: 0.24, phase: 2.2, depth: 0.35 },
    ];
    if (isNarrow) {
      return [
        { pos: [-1.9, 3.8, -8.8], speed: 0.52, amp: 0.14, phase: 0.5, depth: 0.4 },
        { pos: [1.95, 3.6, -9.2], speed: 0.44, amp: 0.16, phase: 1.9, depth: 0.4 },
        { pos: [-1.9, -2.9, -7.8], speed: 0.60, amp: 0.14, phase: 3.1, depth: 0.5 },
        { pos: [1.85, -3.0, -8.2], speed: 0.48, amp: 0.15, phase: 4.4, depth: 0.5 },
      ];
    }
    return all;
  }, [isNarrow]);

  const dummyObj = useMemo(() => new THREE.Object3D(), []);

  // Curved golden flight-route trail sweeping diagonally behind the expedition airplane
  const flightTrailPoints = useMemo<[number, number, number][]>(() => {
    if (isNarrow) {
      return [
        [-2.2, 4.9, -10.2],
        [-1.3, 4.4, -9.5],
        [-0.75, 4.1, -8.6],
        [-0.35, 3.85, -7.6],
      ];
    }
    return [
      [6.4, 6.2, -10.6],
      [7.8, 5.9, -9.8],
      [9.3, 5.2, -8.4],
      [10.5, 4.6, -7.0],
    ];
  }, [isNarrow]);

  // Organic scattered coordinates (non-linear, asymmetric heights & depths) well clear of the larger title,
  // while keeping all mobile elements safely inside the 390x844 / 360x800 viewport bounds
  const globeBase: [number, number, number] = isNarrow ? [-2.25, 5.25, -7.8] : [-11.2, 4.8, -7.8];
  const balloonBase: [number, number, number] = isNarrow ? [1.75, 5.95, -9.2] : [-4.7, 6.2, -9.4];
  const pinBase: [number, number, number] = isNarrow ? [-2.1, -3.45, -7.6] : [2.1, 5.3, -8.8];
  const aircraftBase: [number, number, number] = isNarrow ? [-0.25, 3.85, -7.4] : [10.6, 4.5, -6.8];
  const compassBase: [number, number, number] = [-10.0, -1.1, -5.8];
  const suitcaseBase: [number, number, number] = [-5.2, -5.1, -7.4];
  const mountainBase: [number, number, number] = [5.8, -4.5, -8.2];
  const cameraBase: [number, number, number] = isNarrow ? [1.95, -5.05, -7.2] : [10.2, -1.5, -6.2];

  useFrame((state, rawDelta) => {
    if (!rootRef.current) return;
    const delta = Math.min(rawDelta, 0.1);

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

    // 1. Explorer Wireframe Globe
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

    // 2. Expedition Airplane (gentle banked glide)
    if (aircraftGroupRef.current) {
      const glideX = Math.sin(t * 0.32 + 1.1) * (isNarrow ? 0.28 : 0.6);
      const glideY = Math.cos(t * 0.44 + 0.4) * 0.22;
      aircraftGroupRef.current.position.set(
        aircraftBase[0] + glideX + px * 0.62,
        aircraftBase[1] + glideY + py * 0.45,
        aircraftBase[2] + Math.sin(t * 0.25) * 0.22
      );
      aircraftGroupRef.current.rotation.set(
        0.24 - py * 0.14,
        -0.65 + Math.cos(t * 0.32 + 1.1) * 0.16 + px * 0.18,
        -0.22 + Math.sin(t * 0.44) * 0.08 - px * 0.12
      );
    }

    // 3. Gimbaled Travel Compass
    if (compassGroupRef.current) {
      compassGroupRef.current.position.set(
        compassBase[0] + px * 0.78 + Math.sin(t * 0.36 + 2.3) * 0.1,
        compassBase[1] + py * 0.56 + Math.cos(t * 0.52 + 1.4) * 0.14,
        compassBase[2]
      );
      compassGroupRef.current.rotation.set(
        0.22 - py * 0.2,
        0.35 + px * 0.24 + Math.sin(t * 0.22) * 0.12,
        Math.cos(t * 0.19) * 0.08
      );
    }
    if (compassInnerRingRef.current) {
      compassInnerRingRef.current.rotation.x = t * 0.24;
      compassInnerRingRef.current.rotation.y = t * 0.14;
    }
    if (compassNeedleRef.current) {
      compassNeedleRef.current.rotation.z = Math.sin(t * 0.55) * 0.38 - px * 0.25;
    }

    // 4. Classic Hot Air Balloon (buoyant gentle rise & sway)
    if (balloonGroupRef.current) {
      balloonGroupRef.current.position.set(
        balloonBase[0] + Math.sin(t * 0.24 + 0.8) * 0.18 + px * 0.28,
        balloonBase[1] + Math.sin(t * 0.48 + 1.2) * 0.24 + py * 0.22,
        balloonBase[2]
      );
      balloonGroupRef.current.rotation.set(
        0.06 - py * 0.06,
        t * 0.14,
        Math.sin(t * 0.34) * 0.07 + px * 0.06
      );
    }

    // 5. Vintage Travel Camera (gentle floating tilt)
    if (cameraGroupRef.current) {
      cameraGroupRef.current.position.set(
        cameraBase[0] + Math.cos(t * 0.3 + 2.0) * 0.14 + px * 0.64,
        cameraBase[1] + Math.sin(t * 0.45 + 0.7) * 0.16 + py * 0.46,
        cameraBase[2]
      );
      cameraGroupRef.current.rotation.set(
        0.16 - py * 0.16 + Math.sin(t * 0.35) * 0.06,
        -0.42 + px * 0.22 + Math.cos(t * 0.28) * 0.12,
        -0.08 + Math.sin(t * 0.22) * 0.05
      );
    }

    // 6. 3D Map Location Pin (gentle hover bounce + steady axial spin)
    if (pinGroupRef.current) {
      pinGroupRef.current.position.set(
        pinBase[0] + px * 0.36,
        pinBase[1] + Math.sin(t * 0.62 + 2.4) * 0.18 + py * 0.28,
        pinBase[2]
      );
      pinGroupRef.current.rotation.set(0.14 - py * 0.08, t * 0.38 + px * 0.18, 0.04);
    }

    // 7. Vintage Expedition Suitcase (warm bobbing)
    if (suitcaseGroupRef.current) {
      suitcaseGroupRef.current.position.set(
        suitcaseBase[0] + Math.sin(t * 0.26 + 3.1) * 0.12 + px * 0.48,
        suitcaseBase[1] + Math.cos(t * 0.4 + 1.9) * 0.14 + py * 0.36,
        suitcaseBase[2]
      );
      suitcaseGroupRef.current.rotation.set(
        0.14 - py * 0.12,
        0.38 + Math.sin(t * 0.24) * 0.14 + px * 0.18,
        -0.1 + Math.cos(t * 0.31) * 0.05
      );
    }

    // 8. Faceted Alpine Mountain Peaks (subtle serene float)
    if (mountainGroupRef.current) {
      mountainGroupRef.current.position.set(
        mountainBase[0] + px * 0.34,
        mountainBase[1] + Math.sin(t * 0.34 + 4.0) * 0.11 + py * 0.24,
        mountainBase[2]
      );
      mountainGroupRef.current.rotation.set(
        0.12 - py * 0.08,
        -0.28 + Math.sin(t * 0.18) * 0.1 + px * 0.14,
        0
      );
    }

    // 9. Instanced Waypoint Diamonds (single draw call)
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

  const globeScale = isNarrow ? 0.56 : 1.0;
  const aircraftScale = isNarrow ? 0.62 : 0.98;
  const balloonScale = isNarrow ? 0.58 : 0.95;
  const cameraScale = isNarrow ? 0.6 : 0.95;
  const pinScale = isNarrow ? 0.62 : 0.95;

  return (
    <group ref={rootRef} name="hero-travel-elements">
      {/* 1. Explorer Wireframe Globe */}
      <group ref={globeGroupRef} position={globeBase} scale={globeScale}>
        <group ref={globeMeshRef}>
          <mesh geometry={geometries.globeCore} material={materials.cosmicCore} />
          <mesh geometry={geometries.globeWire} material={materials.goldWire} />
        </group>
        <mesh geometry={geometries.globeRing} material={materials.goldSolid} rotation={[Math.PI / 2.6, 0.3, 0]} />
      </group>

      {/* 2. Vintage Expedition Airplane */}
      <group ref={aircraftGroupRef} position={aircraftBase} scale={aircraftScale}>
        <mesh geometry={geometries.fuselage} material={materials.champagneLight} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geometries.noseCone} material={materials.goldSolid} position={[0, 0, -0.64]} rotation={[-Math.PI / 2, 0, 0]} />
        <mesh geometry={geometries.wing} material={materials.goldSolid} position={[0, 0.01, -0.06]} />
        <mesh geometry={geometries.tailWing} material={materials.maroonExpedition} position={[0, 0.02, 0.45]} />
        <mesh geometry={geometries.tailFin} material={materials.maroonExpedition} position={[0, 0.14, 0.44]} />
      </group>

      {/* 3. Gimbaled Travel Compass (desktop & tablet) */}
      {!isNarrow && (
        <group ref={compassGroupRef} position={compassBase}>
          <mesh geometry={geometries.compassOuter} material={materials.goldSolid} />
          <mesh ref={compassInnerRingRef} geometry={geometries.compassInner} material={materials.champagneLight} />
          {/* Cardinal ticks */}
          <mesh geometry={geometries.compassTick} material={materials.goldSolid} position={[0, 0.54, 0]} />
          <mesh geometry={geometries.compassTick} material={materials.goldSolid} position={[0, -0.54, 0]} />
          <mesh geometry={geometries.compassTick} material={materials.goldSolid} position={[0.54, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
          <mesh geometry={geometries.compassTick} material={materials.goldSolid} position={[-0.54, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
          <group ref={compassNeedleRef}>
            <mesh geometry={geometries.needleCone} material={materials.maroonExpedition} position={[0, 0.19, 0]} />
            <mesh geometry={geometries.needleCone} material={materials.champagneLight} position={[0, -0.19, 0]} rotation={[Math.PI, 0, 0]} />
          </group>
        </group>
      )}

      {/* 4. Classic Hot Air Balloon */}
      <group ref={balloonGroupRef} position={balloonBase} scale={balloonScale}>
        <mesh geometry={geometries.balloonBulb} material={materials.maroonExpedition} position={[0, 0.25, 0]} />
        <mesh geometry={geometries.balloonBand} material={materials.goldSolid} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geometries.balloonBand} material={materials.goldSolid} position={[0, 0.25, 0]} rotation={[0, 0, 0]} />
        <mesh geometry={geometries.balloonBand} material={materials.goldSolid} position={[0, 0.25, 0]} rotation={[0, Math.PI / 2, 0]} />
        <mesh geometry={geometries.balloonNeck} material={materials.champagneLight} position={[0, -0.18, 0]} rotation={[Math.PI, 0, 0]} />
        <mesh geometry={geometries.balloonStrut} material={materials.goldSolid} position={[-0.08, -0.44, 0.08]} />
        <mesh geometry={geometries.balloonStrut} material={materials.goldSolid} position={[0.08, -0.44, 0.08]} />
        <mesh geometry={geometries.balloonStrut} material={materials.goldSolid} position={[-0.08, -0.44, -0.08]} />
        <mesh geometry={geometries.balloonStrut} material={materials.goldSolid} position={[0.08, -0.44, -0.08]} />
        <mesh geometry={geometries.balloonBasket} material={materials.leatherWarm} position={[0, -0.62, 0]} />
      </group>

      {/* 5. Vintage Travel Camera */}
      <group ref={cameraGroupRef} position={cameraBase} scale={cameraScale}>
        <mesh geometry={geometries.camBody} material={materials.leatherWarm} />
        <mesh geometry={geometries.camTopPlate} material={materials.champagneLight} position={[0, 0.26, 0]} />
        <mesh geometry={geometries.camPrism} material={materials.goldSolid} position={[0, 0.35, -0.02]} />
        <mesh geometry={geometries.camShutter} material={materials.maroonExpedition} position={[0.28, 0.34, 0.02]} />
        <mesh geometry={geometries.camLensOuter} material={materials.bronzeDark} position={[0, -0.02, 0.24]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geometries.camLensRing} material={materials.goldSolid} position={[0, -0.02, 0.34]} />
        <mesh geometry={geometries.camLensGlass} material={materials.lensGlass} position={[0, -0.02, 0.345]} rotation={[Math.PI / 2, 0, 0]} />
      </group>

      {/* 6. 3D Map Location Pin */}
      <group ref={pinGroupRef} position={pinBase} scale={pinScale}>
        <mesh geometry={geometries.pinHead} material={materials.maroonExpedition} position={[0, 0.24, 0]} />
        <mesh geometry={geometries.pinInnerHole} material={materials.champagneLight} position={[0, 0.24, 0.21]} />
        <mesh geometry={geometries.pinTip} material={materials.maroonExpedition} position={[0, -0.08, 0]} rotation={[Math.PI, 0, 0]} />
        <mesh geometry={geometries.pinHalo} material={materials.haloRingMat} position={[0, -0.34, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </group>

      {/* 7. Vintage Expedition Suitcase / Trunk (desktop & tablet) */}
      {!isNarrow && (
        <group ref={suitcaseGroupRef} position={suitcaseBase} scale={0.92}>
          <mesh geometry={geometries.caseBody} material={materials.leatherWarm} />
          <mesh geometry={geometries.caseStrap} material={materials.goldSolid} position={[-0.24, 0, 0]} />
          <mesh geometry={geometries.caseStrap} material={materials.goldSolid} position={[0.24, 0, 0]} />
          <mesh geometry={geometries.caseHandle} material={materials.champagneLight} position={[0, 0.29, 0]} />
          <mesh geometry={geometries.caseCorner} material={materials.goldSolid} position={[-0.41, 0.25, 0]} />
          <mesh geometry={geometries.caseCorner} material={materials.goldSolid} position={[0.41, 0.25, 0]} />
          <mesh geometry={geometries.caseCorner} material={materials.goldSolid} position={[-0.41, -0.25, 0]} />
          <mesh geometry={geometries.caseCorner} material={materials.goldSolid} position={[0.41, -0.25, 0]} />
        </group>
      )}

      {/* 8. Faceted Alpine Mountain Peaks (desktop & tablet) */}
      {!isNarrow && (
        <group ref={mountainGroupRef} position={mountainBase} scale={0.95}>
          {/* Central Peak */}
          <mesh geometry={geometries.peakMain} material={materials.slateMountain} position={[0, 0, 0]} />
          <mesh geometry={geometries.peakMainCap} material={materials.snowCap} position={[0, 0.35, 0]} />
          {/* Left Peak */}
          <mesh geometry={geometries.peakLeft} material={materials.slateMountain} position={[-0.56, -0.16, 0.14]} />
          <mesh geometry={geometries.peakLeftCap} material={materials.snowCap} position={[-0.56, 0.08, 0.14]} />
          {/* Right Peak */}
          <mesh geometry={geometries.peakRight} material={materials.slateMountain} position={[0.58, -0.13, -0.08]} />
          <mesh geometry={geometries.peakRightCap} material={materials.snowCap} position={[0.58, 0.13, -0.08]} />
        </group>
      )}

      {/* Subtle golden curved flight-route trail */}
      <Line points={flightTrailPoints} color="#E0BE78" lineWidth={1.0} transparent opacity={0.28} />

      {/* 9. Instanced Floating Geographic Waypoint Diamonds (single draw call) */}
      <instancedMesh
        ref={waypointsRef}
        args={[geometries.beaconGeo, materials.beaconMat, waypointSpecs.length]}
      />
    </group>
  );
};

export default HeroTravelElements;
