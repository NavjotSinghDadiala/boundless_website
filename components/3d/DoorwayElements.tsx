'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Line, useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';

/**
 * Curated, aesthetic travel portal accents surrounding the wooden entrance at [0, -10.5, 5.0]
 * without obstructing the doorway opening or camera passage:
 * - Ornate 4-point Golden Compass Rose Crest floating centered above the archway crown
 * - Twin Warm Glowing Brass Expedition Lanterns flanking the outer left & right timber posts
 * - Subtle golden navigation guide arcs sweeping toward the outer doorway flanks
 * - Instanced orbiting golden diamond markers outside the timber posts
 *
 * Cleanly fades out as the camera crosses Y = -10.5 so Memories in Motion beyond
 * the door remains 100% unobstructed.
 */
export const DoorwayElements: React.FC = () => {
  const rootRef = useRef<THREE.Group>(null);
  const crestOuterRef = useRef<THREE.Mesh>(null);
  const crestInnerRef = useRef<THREE.Group>(null);
  const leftLanternRef = useRef<THREE.Group>(null);
  const rightLanternRef = useRef<THREE.Group>(null);
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
    const outerRingGeo = new THREE.TorusGeometry(0.56, 0.017, 8, 48);
    const innerRingGeo = new THREE.TorusGeometry(0.36, 0.012, 8, 36);
    const compassSpikeGeo = new THREE.ConeGeometry(0.055, 0.34, 4);
    const coreDiamondGeo = new THREE.OctahedronGeometry(0.095, 0);
    const markerGeo = new THREE.OctahedronGeometry(0.065, 0);

    // Expedition Lantern geometries
    const lanternCapGeo = new THREE.ConeGeometry(0.18, 0.14, 6);
    const lanternGlassGeo = new THREE.CylinderGeometry(0.11, 0.095, 0.28, 6);
    const lanternBaseGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.07, 6);
    const lanternRingGeo = new THREE.TorusGeometry(0.055, 0.012, 6, 16);

    const goldMat = new THREE.MeshStandardMaterial({
      color: '#E8CC8C',
      emissive: '#3D2A0B',
      emissiveIntensity: 0.42,
      metalness: 0.45,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9,
    });
    const lanternGlassMat = new THREE.MeshBasicMaterial({
      color: '#FFE099',
      transparent: true,
      opacity: 0.86,
    });
    const markerMat = new THREE.MeshBasicMaterial({
      color: '#FDE68A',
      transparent: true,
      opacity: 0.78,
    });

    return {
      outerRingGeo,
      innerRingGeo,
      compassSpikeGeo,
      coreDiamondGeo,
      markerGeo,
      lanternCapGeo,
      lanternGlassGeo,
      lanternBaseGeo,
      lanternRingGeo,
      goldMat,
      lanternGlassMat,
      markerMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      assets.outerRingGeo.dispose();
      assets.innerRingGeo.dispose();
      assets.compassSpikeGeo.dispose();
      assets.coreDiamondGeo.dispose();
      assets.markerGeo.dispose();
      assets.lanternCapGeo.dispose();
      assets.lanternGlassGeo.dispose();
      assets.lanternBaseGeo.dispose();
      assets.lanternRingGeo.dispose();
      assets.goldMat.dispose();
      assets.lanternGlassMat.dispose();
      assets.markerMat.dispose();
    };
  }, [assets]);

  // Subtle golden navigation guide lines sweeping toward the outer doorway flanks (desktop/tablet)
  const leftGuidePoints = useMemo<[number, number, number][]>(
    () => [
      [-5.0, -5.2, 4.2],
      [-4.6, -7.8, 4.6],
      [-4.0, -10.3, 5.0],
    ],
    []
  );
  const rightGuidePoints = useMemo<[number, number, number][]>(
    () => [
      [5.0, -5.2, 4.2],
      [4.6, -7.8, 4.6],
      [4.0, -10.3, 5.0],
    ],
    []
  );

  // Orbiting perimeter waypoint markers strictly outside the timber frame
  const markerSpecs = useMemo(() => {
    if (isNarrow) {
      return [
        { x: -2.5, y: -10.3, z: 4.5, speed: 0.65, phase: 0.4, radius: 0.16 },
        { x: 2.5, y: -10.3, z: 5.5, speed: 0.52, phase: 2.3, radius: 0.16 },
      ];
    }
    return [
      { x: -4.25, y: -10.2, z: 3.6, speed: 0.62, phase: 0.3, radius: 0.22 },
      { x: 4.25, y: -10.2, z: 3.6, speed: 0.54, phase: 1.9, radius: 0.22 },
      { x: -4.45, y: -10.4, z: 6.4, speed: 0.48, phase: 3.1, radius: 0.20 },
      { x: 4.45, y: -10.4, z: 6.4, speed: 0.58, phase: 4.6, radius: 0.20 },
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

    assets.goldMat.opacity = alpha * 0.9;
    assets.lanternGlassMat.opacity = alpha * 0.86;
    assets.markerMat.opacity = alpha * 0.78;

    const t = reducedMotionRef.current ? 0 : state.clock.elapsedTime;

    if (crestOuterRef.current) {
      crestOuterRef.current.rotation.z = t * 0.18;
    }
    if (crestInnerRef.current) {
      crestInnerRef.current.rotation.z = -t * 0.24;
    }
    if (leftLanternRef.current) {
      leftLanternRef.current.rotation.z = Math.sin(t * 0.9 + 0.4) * 0.06;
    }
    if (rightLanternRef.current) {
      rightLanternRef.current.rotation.z = Math.sin(t * 0.9 + 2.1) * 0.06;
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

  // Positioned cleanly above the top header beam in camera-looking-down orientation (-Z is "up" on screen)
  const crestZ = isNarrow ? 1.65 : 0.85;
  const crestScale = isNarrow ? 0.72 : 1.04;
  const lanternX = isNarrow ? 2.68 : 3.45;
  const lanternZ = isNarrow ? 3.55 : 2.95;
  const lanternScale = isNarrow ? 0.72 : 1.05;

  const renderLantern = (ref: React.RefObject<THREE.Group | null>, x: number) => (
    <group
      ref={ref}
      position={[x, -10.22, lanternZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={lanternScale}
    >
      <mesh geometry={assets.lanternRingGeo} material={assets.goldMat} position={[0, 0.27, 0]} />
      <mesh geometry={assets.lanternCapGeo} material={assets.goldMat} position={[0, 0.19, 0]} />
      <mesh geometry={assets.lanternGlassGeo} material={assets.lanternGlassMat} position={[0, 0, 0]} />
      <mesh geometry={assets.lanternBaseGeo} material={assets.goldMat} position={[0, -0.17, 0]} />
    </group>
  );

  return (
    <group ref={rootRef} name="doorway-travel-accents" visible={false}>
      {/* Floating Golden 4-Point Compass Rose Crest Centered Above the Archway Header */}
      <group position={[0, -10.25, crestZ]} rotation={[-Math.PI / 2, 0, 0]} scale={crestScale}>
        <mesh ref={crestOuterRef} geometry={assets.outerRingGeo} material={assets.goldMat} />
        <group ref={crestInnerRef}>
          <mesh geometry={assets.innerRingGeo} material={assets.goldMat} />
          {/* Cardinal 4-point compass spikes */}
          <mesh geometry={assets.compassSpikeGeo} material={assets.goldMat} position={[0, 0.42, 0]} />
          <mesh geometry={assets.compassSpikeGeo} material={assets.goldMat} position={[0, -0.42, 0]} rotation={[0, 0, Math.PI]} />
          <mesh geometry={assets.compassSpikeGeo} material={assets.goldMat} position={[0.42, 0, 0]} rotation={[0, 0, -Math.PI / 2]} />
          <mesh geometry={assets.compassSpikeGeo} material={assets.goldMat} position={[-0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
        </group>
        <mesh geometry={assets.coreDiamondGeo} material={assets.markerMat} />
      </group>

      {/* Twin Warm Hanging Brass Expedition Lanterns Flanking the Outer Timber Posts */}
      {renderLantern(leftLanternRef, -lanternX)}
      {renderLantern(rightLanternRef, lanternX)}

      {/* Subtle Golden Navigation Guide Arcs Flanking the Entrance (Desktop/Tablet) */}
      {!isNarrow && (
        <>
          <Line points={leftGuidePoints} color="#D4AF6A" lineWidth={0.9} transparent opacity={0.22} />
          <Line points={rightGuidePoints} color="#D4AF6A" lineWidth={0.9} transparent opacity={0.22} />
        </>
      )}

      {/* Orbiting Perimeter Waypoint Diamonds Strictly Outside the Timber Frame */}
      <instancedMesh
        ref={markersRef}
        args={[assets.markerGeo, assets.markerMat, markerSpecs.length]}
      />
    </group>
  );
};

export default DoorwayElements;
