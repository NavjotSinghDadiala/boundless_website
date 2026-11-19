'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  SHARED_GATEWAY_PLANE,
  acquireGatewayTexture,
  optimizeGatewayUrl,
  releaseGatewayTexture,
} from '../PortalTile';

// Real historical Boundless Cloudinary archive fallbacks if `/api/previous-trips` returns fewer than 4 images
const FALLBACK_ARCHIVE_PHOTOS = [
  'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1782302342/previous_trips/akzpy8atpb0knhdyg3yc.jpg', // Kerala 2.0
  'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1782302556/previous_trips/jfyyabx2vefmcnddcyx4.jpg', // Pondicherry
  'https://res.cloudinary.com/duuyaejwy/image/upload/v1761071512/darjeeling_md0pij.jpg',                   // Darjeeling
  'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1782301064/gallery/irs3820iabnip1dcizg2.jpg',        // Rajasthan
];

export interface PastTripsSummary {
  count: number;
  imageUrls: string[];
}

interface MemoryWallLayerProps {
  url: string;
  shouldLoad: boolean;
  isCompact: boolean;
  basePos: [number, number, number];
  hoverOffset: [number, number, number];
  size: [number, number];
  rotZDeg: number;
  tint: string;
  hovered: boolean;
}

const MemoryWallLayer: React.FC<MemoryWallLayerProps> = ({
  url,
  shouldLoad,
  isCompact,
  basePos,
  hoverOffset,
  size,
  rotZDeg,
  tint,
  hovered,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const acquiredUrlRef = useRef<string | null>(null);

  const optimizedUrl = useMemo(
    () => optimizeGatewayUrl(url, isCompact ? 400 : 560),
    [url, isCompact]
  );

  useEffect(() => {
    if (!shouldLoad || !optimizedUrl) return;
    if (acquiredUrlRef.current === optimizedUrl) return;

    if (acquiredUrlRef.current) {
      releaseGatewayTexture(acquiredUrlRef.current);
      acquiredUrlRef.current = null;
    }

    acquiredUrlRef.current = optimizedUrl;
    let active = true;
    acquireGatewayTexture(optimizedUrl, (tex) => {
      if (active) setTexture(tex);
    });

    return () => {
      active = false;
      if (acquiredUrlRef.current) {
        releaseGatewayTexture(acquiredUrlRef.current);
        acquiredUrlRef.current = null;
      }
    };
  }, [shouldLoad, optimizedUrl]);

  useEffect(() => {
    if (matRef.current) {
      matRef.current.map = texture;
      matRef.current.needsUpdate = true;
    }
  }, [texture]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const tx = basePos[0] + (hovered ? hoverOffset[0] : 0);
    const ty = basePos[1] + (hovered ? hoverOffset[1] : 0);
    const tz = basePos[2] + (hovered ? hoverOffset[2] : 0);
    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, tx, 7, delta);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, ty, 7, delta);
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, tz, 7, delta);
  });

  const rotZ = THREE.MathUtils.degToRad(rotZDeg);

  return (
    <group ref={groupRef} position={basePos} rotation={[0, 0, rotZ]}>
      {/* Minimal dark rim for crisp depth separation between overlapping memories */}
      <mesh geometry={SHARED_GATEWAY_PLANE} scale={[size[0] + 0.04, size[1] + 0.04, 1]} position={[0, 0, -0.008]}>
        <meshBasicMaterial color="#1a0d16" />
      </mesh>
      <mesh geometry={SHARED_GATEWAY_PLANE} scale={[size[0], size[1], 1]} position={[0, 0, 0]}>
        <meshBasicMaterial
          ref={matRef}
          map={texture}
          color={texture ? tint : '#1f101a'}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

interface PastJourneysTimelineProps {
  width: number;
  height: number;
  hovered: boolean;
  shouldLoad: boolean;
  isCompact: boolean;
  summary: PastTripsSummary;
}

/**
 * P1 — Layered Cinematic Memory Collage Window
 * Replaces the broken 3D spline with an asymmetric, overlapping floating-memory-wall
 * built from real Boundless `/api/previous-trips` Cloudinary photographs.
 */
export const PastJourneysTimeline: React.FC<PastJourneysTimelineProps> = ({
  width,
  height,
  hovered,
  shouldLoad,
  isCompact,
  summary,
}) => {
  const urls = useMemo(() => {
    const merged: string[] = [];
    for (const u of summary.imageUrls) {
      if (u && !merged.includes(u)) merged.push(u);
    }
    for (const fb of FALLBACK_ARCHIVE_PHOTOS) {
      if (merged.length >= 4) break;
      if (!merged.includes(fb)) merged.push(fb);
    }
    return merged;
  }, [summary.imageUrls]);

  const topOffset = isCompact ? 0.24 : 0.34;
  const usableW = width - 0.30;
  const usableH = height - (isCompact ? 0.85 : 1.15);

  // Asymmetric, overlapping floating-memory-wall layers (4 on desktop, 3 on compact/mobile)
  const layers = useMemo(() => {
    if (isCompact) {
      return [
        {
          key: 'p1-mob-back-left',
          url: urls[2] || urls[0],
          basePos: [-usableW * 0.26, topOffset + usableH * 0.08, 0.03] as [number, number, number],
          hoverOffset: [-0.10, 0.04, 0.02] as [number, number, number],
          size: [usableW * 0.44, usableH * 0.62] as [number, number],
          rotZDeg: 6.5,
          tint: '#b8acc4',
        },
        {
          key: 'p1-mob-mid-right',
          url: urls[1] || urls[0],
          basePos: [usableW * 0.24, topOffset - usableH * 0.05, 0.09] as [number, number, number],
          hoverOffset: [0.10, -0.03, 0.05] as [number, number, number],
          size: [usableW * 0.46, usableH * 0.66] as [number, number],
          rotZDeg: -5.5,
          tint: '#dbd2e6',
        },
        {
          key: 'p1-mob-front-center',
          url: urls[0],
          basePos: [-usableW * 0.02, topOffset - usableH * 0.02, 0.16] as [number, number, number],
          hoverOffset: [0, 0.04, 0.10] as [number, number, number],
          size: [usableW * 0.50, usableH * 0.76] as [number, number],
          rotZDeg: 2.0,
          tint: '#ffffff',
        },
      ];
    }

    return [
      // Deep background upper-left memory
      {
        key: 'p1-bg-upper-left',
        url: urls[3] || urls[0],
        basePos: [-usableW * 0.24, topOffset + usableH * 0.18, 0.02] as [number, number, number],
        hoverOffset: [-0.14, 0.07, 0.02] as [number, number, number],
        size: [usableW * 0.44, usableH * 0.50] as [number, number],
        rotZDeg: 6.5,
        tint: '#a99db8',
      },
      // Mid-background upper-right memory
      {
        key: 'p1-mid-upper-right',
        url: urls[2] || urls[0],
        basePos: [usableW * 0.23, topOffset + usableH * 0.12, 0.07] as [number, number, number],
        hoverOffset: [0.14, 0.05, 0.04] as [number, number, number],
        size: [usableW * 0.46, usableH * 0.54] as [number, number],
        rotZDeg: -5.2,
        tint: '#c7bdd4',
      },
      // Mid-foreground lower-left memory
      {
        key: 'p1-mid-lower-left',
        url: urls[1] || urls[0],
        basePos: [-usableW * 0.16, topOffset - usableH * 0.14, 0.12] as [number, number, number],
        hoverOffset: [-0.10, -0.05, 0.07] as [number, number, number],
        size: [usableW * 0.48, usableH * 0.56] as [number, number],
        rotZDeg: -3.8,
        tint: '#e3dce9',
      },
      // Hero foreground overlapping memory (right-center)
      {
        key: 'p1-hero-front',
        url: urls[0],
        basePos: [usableW * 0.12, topOffset - usableH * 0.06, 0.18] as [number, number, number],
        hoverOffset: [0.06, 0.03, 0.12] as [number, number, number],
        size: [usableW * 0.52, usableH * 0.64] as [number, number],
        rotZDeg: 3.2,
        tint: '#ffffff',
      },
    ];
  }, [urls, usableW, usableH, topOffset, isCompact]);

  return (
    <group name="p1-past-memories-collage">
      {layers.map((layer) => (
        <MemoryWallLayer
          key={layer.key}
          url={layer.url}
          shouldLoad={shouldLoad}
          isCompact={isCompact}
          basePos={layer.basePos}
          hoverOffset={layer.hoverOffset}
          size={layer.size}
          rotZDeg={layer.rotZDeg}
          tint={layer.tint}
          hovered={hovered}
        />
      ))}
    </group>
  );
};

export default PastJourneysTimeline;
