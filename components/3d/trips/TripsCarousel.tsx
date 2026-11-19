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

// Graceful visual fallbacks from existing Boundless Cloudinary archives when fewer than 3 live trip images exist
const FALLBACK_DESTINATION_PHOTOS = [
  'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1782302383/previous_trips/mhe7pozkwp2g3fj17epf.jpg',
  'https://res.cloudinary.com/duuyaejwy/image/upload/v1761071519/Tunganath_mqkast.png',
  'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1774820432/gallery/xd8oetlon48blstdsiw3.webp',
];

export interface UpcomingTripSummary {
  count: number;
  primaryName?: string;
  primaryDestination?: string;
  primaryDate?: string;
  primaryTripId?: string;
  imageUrls: string[];
}

interface PhotoLayerProps {
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

const StackedPhotoLayer: React.FC<PhotoLayerProps> = ({
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
    () => optimizeGatewayUrl(url, isCompact ? 440 : 640),
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
      {/* Subtle dark architectural backing border */}
      <mesh geometry={SHARED_GATEWAY_PLANE} scale={[size[0] + 0.045, size[1] + 0.045, 1]} position={[0, 0, -0.008]}>
        <meshBasicMaterial color="#1a0f24" />
      </mesh>
      {/* Full-bleed destination photograph */}
      <mesh geometry={SHARED_GATEWAY_PLANE} scale={[size[0], size[1], 1]} position={[0, 0, 0]}>
        <meshBasicMaterial
          ref={matRef}
          map={texture}
          color={texture ? tint : '#1d1229'}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

interface TripsCarouselProps {
  width: number;
  height: number;
  hovered: boolean;
  shouldLoad: boolean;
  isCompact: boolean;
  summary: UpcomingTripSummary;
}

/**
 * U1 — Live Stacked Destination Showcase
 * Renders overlapping layered 3D travel photographs sourced from `/api/trip`
 * with a larger primary destination image and supporting depth-offset layers.
 */
export const TripsCarousel: React.FC<TripsCarouselProps> = ({
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
    for (const fb of FALLBACK_DESTINATION_PHOTOS) {
      if (merged.length >= 3) break;
      if (!merged.includes(fb)) merged.push(fb);
    }
    return merged;
  }, [summary.imageUrls]);

  // Available upper showcase area above the bottom heading scrim
  const topOffset = isCompact ? 0.24 : 0.34;
  const usableW = width - 0.32;
  const usableH = height - (isCompact ? 0.85 : 1.15);

  // Primary foreground destination photo (noticeably larger) + 1–2 supporting layered photos
  const layers = useMemo(() => {
    const baseLayers = [
      // Supporting back-left layer
      {
        key: 'u1-back-left',
        url: urls[1] || urls[0],
        basePos: [-usableW * 0.22, topOffset + usableH * 0.06, 0.04] as [number, number, number],
        hoverOffset: [-0.14, 0.04, 0.02] as [number, number, number],
        size: [usableW * 0.50, usableH * 0.62] as [number, number],
        rotZDeg: 5.5,
        tint: '#b8aec7',
      },
      // Supporting back-right layer (desktop / tablet only for leaner mobile GPU load)
      ...(!isCompact
        ? [
            {
              key: 'u1-back-right',
              url: urls[2] || urls[0],
              basePos: [usableW * 0.24, topOffset - usableH * 0.05, 0.09] as [number, number, number],
              hoverOffset: [0.15, -0.03, 0.05] as [number, number, number],
              size: [usableW * 0.48, usableH * 0.58] as [number, number],
              rotZDeg: -6.0,
              tint: '#cdc4db',
            },
          ]
        : []),
      // Primary foreground destination showcase (noticeably larger & centered-forward)
      {
        key: 'u1-primary',
        url: urls[0],
        basePos: [isCompact ? usableW * 0.08 : -usableW * 0.02, topOffset, 0.16] as [number, number, number],
        hoverOffset: [0, 0.05, 0.12] as [number, number, number],
        size: [usableW * 0.68, usableH * 0.82] as [number, number],
        rotZDeg: -2.2,
        tint: '#ffffff',
      },
    ];
    return baseLayers;
  }, [urls, usableW, usableH, topOffset, isCompact]);

  return (
    <group name="u1-upcoming-destination-showcase">
      {layers.map((layer) => (
        <StackedPhotoLayer
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

export default TripsCarousel;
