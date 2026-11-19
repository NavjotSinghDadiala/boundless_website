'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Line, useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';

/**
 * Curated, lightweight travel accents surrounding and floating above the wooden entrance
 * at [0, -10.5, 5.0] without modifying ExpeditionPortalGate.tsx or obstructing the doorway:
 * - Floating golden navigation astrolabe/compass crest centered above the archway header
 * - Subtle golden constellation guide arcs leading the eye toward the entrance flanks
 * - Instanced orbiting golden diamond markers outside the timber posts
 *
 * Strictly fades out cleanly as the camera crosses Y = -10.5 so Memories in Motion beyond
 * the door remains 100% unobstructed.
 */
export const DoorwayElements: React.FC = () => {
  const rootRef = useRef<THREE.Group>(null);
  const crestOuterRef = useRef<THREE.Mesh>(null);
  const crestInnerRef = useRef<THREE.Mesh>(null);
  const markersRef = useRef<THREE.InstancedMesh>(null);
  const reducedMotionRef = useRef(false);

  const { camera, size } = useThree();
  const data = useScroll();

  const aspect = size.width / Math.max(1, size.height);
  const isNarrow = isMobile || aspect < 0.85;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const assets = useMemo(() => {
    const outerRingGeo = new THREE.TorusGeometry(0.52, 0.015, 8, 42);
    const innerRingGeo = new THREE.TorusGeometry(0.34, 0.011, 8, 32);
    const coreDiamondGeo = new THREE.OctahedronGeometry(0.09, 0);
    const markerGeo = new THREE.OctahedronGeometry(0.065, 0);

    const goldMat = new THREE.MeshStandardMaterial({
      color: '#E8D29D',
      metalness: 0.72,
      roughness: 0.28,
      transparent: true,
      opacity: 0.85,
    });
    const markerMat = new THREE.MeshBasicMaterial({
      color: '#FDE68A',
      transparent: true,
      opacity: 0.78,
    });

    return { outerRingGeo, innerRingGeo, coreDiamondGeo, markerGeo, goldMat, markerMat };
  }, []);

  useEffect(() => {
    return () => {
      assets.outerRingGeo.dispose();
      assets.innerRingGeo.dispose();
      assets.coreDiamondGeo.dispose();
      assets.markerGeo.dispose();
      assets.goldMat.dispose();
      assets.markerMat.dispose();
    };
  }, [assets]);

  // Subtle golden navigation guide lines sweeping toward the outer doorway flanks (desktop/tablet)
  const leftGuidePoints = useMemo<[number, number, number][]>(
    () => [
      [-4.9, -5.2, 4.2],
      [-4.5, -7.8, 4.6],
      [-3.9, -10.3, 5.0],
    ],
    []
  );
  const rightGuidePoints = useMemo<[number, number, number][]>(
    () => [
      [4.9, -5.2, 4.2],
      [4.5, -7.8, 4.6],
      [3.9, -10.3, 5.0],
    ],
    []
  );

  // Orbiting perimeter waypoint markers strictly outside the timber frame
  const markerSpecs = useMemo(() => {
    if (isNarrow) {
      return [
        { x: -2.45, y: -10.3, z: 4.5, speed: 0.65, phase: 0.4, radius: 0.16 },
        { x: 2.45, y: -10.3, z: 5.5, speed: 0.52, phase: 2.3, radius: 0.16 },
      ];
    }
    return [
      { x: -4.15, y: -10.2, z: 3.6, speed: 0.62, phase: 0.3, radius: 0.22 },
      { x: 4.15, y: -10.2, z: 3.6, speed: 0.54, phase: 1.9, radius: 0.22 },
      { x: -4.35, y: -10.4, z: 6.4, speed: 0.48, phase: 3.1, radius: 0.20 },
      { x: 4.35, y: -10.4, z: 6.4, speed: 0.58, phase: 4.6, radius: 0.20 },
    ];
  }, [isNarrow]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!rootRef.current) return;

    const scrollOffset = data ? data.offset : 0;
    const camY = camera.position.y;

    // Visible during approach & door opening; cleanly fades away as camera crosses Y = -10.5
    const fadeIn = THREE.MathUtils.smoothstep(scrollOffset, 0.18, 0.29);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(-camY, 9.2, 10.6);
    const alpha = fadeIn * fadeOut;

    rootRef.current.visible = alpha > 0.01;
    if (!rootRef.current.visible) return;

    assets.goldMat.opacity = alpha * 0.85;
    assets.markerMat.opacity = alpha * 0.78;

    const t = reducedMotionRef.current ? 0 : state.clock.elapsedTime;

    if (crestOuterRef.current) {
      crestOuterRef.current.rotation.z = t * 0.22;
    }
    if (crestInnerRef.current) {
      crestInnerRef.current.rotation.z = -t * 0.35;
      crestInnerRef.current.rotation.x = Math.sin(t * 0.4) * 0.28;
    }

    if (markersRef.current) {
      for (let i = 0; i < markerSpecs.length; i++) {
        const m = markerSpecs[i];
        dummy.position.set(
          m.x + Math.cos(t * m.speed + m.phase) * m.radius,
          m.y + Math.sin(t * m.speed * 0.8 + m.phase) * 0.15,
          m.z + Math.sin(t * m.speed + m.phase) * m.radius
        );
        dummy.rotation.set(t * 0.4 + m.phase, t * 0.6 + m.phase, 0);
        dummy.scale.setScalar(alpha);
        dummy.updateMatrix();
        markersRef.current.setMatrixAt(i, dummy.matrix);
      }
      markersRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  // Positioned cleanly above the upright wooden header beam (door header is at Z ~ 1.90 desktop / 2.88 mobile)
  const crestPos: [number, number, number] = isNarrow ? [0, -10.35, 1.95] : [0, -10.35, 1.0];
  const crestScale = isNarrow ? 0.68 : 1.0;

  return (
    <group ref={rootRef} name="doorway-travel-elements" visible={false}>
      {/* Floating Golden Navigation Astrolabe Crest above the wooden entrance */}
      <group position={crestPos} rotation={[-Math.PI / 2, 0, 0]} scale={crestScale}>
        <mesh ref={crestOuterRef} geometry={assets.outerRingGeo} material={assets.goldMat} />
        <mesh ref={crestInnerRef} geometry={assets.innerRingGeo} material={assets.goldMat} />
        <mesh geometry={assets.coreDiamondGeo} material={assets.markerMat} />
      </group>

      {/* Subtle golden constellation guide lines leading to the outer doorway flanks */}
      {!isNarrow && (
        <>
          <Line points={leftGuidePoints} color="#D4AF6A" lineWidth={1} transparent opacity={0.22} />
          <Line points={rightGuidePoints} color="#D4AF6A" lineWidth={1} transparent opacity={0.22} />
        </>
      )}

      {/* Instanced orbiting golden diamond markers around the outer doorway perimeter */}
      <instancedMesh
        ref={markersRef}
        args={[assets.markerGeo, assets.markerMat, markerSpecs.length]}
      />
    </group>
  );
};

export default DoorwayElements;
