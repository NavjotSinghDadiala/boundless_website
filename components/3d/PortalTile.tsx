'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Edges, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Optimizes existing Boundless Cloudinary URLs to lightweight WebP textures
 * without introducing any new image storage or proxy.
 */
export function optimizeGatewayUrl(rawUrl: string, width = 640): string {
  if (!rawUrl || !rawUrl.includes('res.cloudinary.com') || !rawUrl.includes('/image/upload/')) {
    return rawUrl;
  }
  const transform = `f_webp,q_auto:good,w_${width},c_limit`;
  if (rawUrl.includes(`/image/upload/${transform}/`)) {
    return rawUrl;
  }
  return rawUrl.replace('/image/upload/', `/image/upload/${transform}/`);
}

interface CachedGatewayTexture {
  texture: THREE.Texture | null;
  refs: number;
  loading: boolean;
  callbacks: Array<(tex: THREE.Texture | null) => void>;
}

const gatewayTextureCache = new Map<string, CachedGatewayTexture>();
const gatewayLoader = new THREE.TextureLoader();
gatewayLoader.setCrossOrigin('anonymous');

export function acquireGatewayTexture(url: string, onReady: (tex: THREE.Texture | null) => void): void {
  if (!url) {
    onReady(null);
    return;
  }
  let entry = gatewayTextureCache.get(url);
  if (!entry) {
    entry = { texture: null, refs: 0, loading: false, callbacks: [] };
    gatewayTextureCache.set(url, entry);
  }
  entry.refs += 1;

  if (entry.texture) {
    onReady(entry.texture);
    return;
  }

  entry.callbacks.push(onReady);
  if (!entry.loading) {
    entry.loading = true;
    gatewayLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;

        const current = gatewayTextureCache.get(url);
        if (!current || current.refs <= 0) {
          tex.dispose();
          gatewayTextureCache.delete(url);
          return;
        }
        current.texture = tex;
        current.loading = false;
        const cbs = current.callbacks.splice(0);
        cbs.forEach((cb) => cb(tex));
      },
      undefined,
      () => {
        const current = gatewayTextureCache.get(url);
        if (current) {
          current.loading = false;
          const cbs = current.callbacks.splice(0);
          cbs.forEach((cb) => cb(null));
        }
      }
    );
  }
}

export function releaseGatewayTexture(url: string): void {
  if (!url) return;
  const entry = gatewayTextureCache.get(url);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs === 0) {
    if (entry.texture) {
      entry.texture.dispose();
      entry.texture = null;
    }
    gatewayTextureCache.delete(url);
  }
}

// Shared unit plane geometry reused across gateway frames & photo layers
export const SHARED_GATEWAY_PLANE = new THREE.PlaneGeometry(1, 1);

export interface PortalTileProps {
  id: string;
  title: string;
  subtitle?: string;
  width: number;
  height: number;
  position: [number, number, number];
  accentColor: string;
  surfaceColor: string;
  onNavigate: () => void;
  children: (hovered: boolean) => React.ReactNode;
}

export const PortalTile: React.FC<PortalTileProps> = ({
  title,
  subtitle,
  width,
  height,
  position,
  accentColor,
  surfaceColor,
  onNavigate,
  children,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Clean up pointer cursor if unmounted while hovered
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  // Memoize frame box geometry per responsive dimension & dispose on resize/unmount
  const frameGeo = useMemo(() => new THREE.BoxGeometry(width, height, 0.08), [width, height]);
  useEffect(() => {
    return () => {
      frameGeo.dispose();
    };
  }, [frameGeo]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetZ = hovered ? 0.24 : 0;
    const targetScale = hovered ? 1.028 : 1.0;
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 7, delta);
    groupRef.current.scale.x = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 7, delta);
    groupRef.current.scale.y = THREE.MathUtils.damp(groupRef.current.scale.y, targetScale, 7, delta);
  });

  const isCompact = height < 2.8;
  const titleFontSize = isCompact ? Math.min(0.165, width * 0.054) : 0.27;
  const subFontSize = isCompact ? Math.min(0.10, width * 0.035) : 0.13;
  const scrimHeight = isCompact ? 0.70 : 1.02;

  return (
    <group position={position}>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          onNavigate();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {/* Cosmic obsidian gateway backing */}
        <mesh geometry={frameGeo} position={[0, 0, -0.04]}>
          <meshStandardMaterial color={surfaceColor} roughness={0.85} metalness={0.15} />
          <Edges color={hovered ? '#FFE878' : accentColor} lineWidth={hovered ? 1.8 : 1.1} />
        </mesh>

        {/* Layered 3D photographic composition (U1 or P1) */}
        {children(hovered)}

        {/* Bottom dark editorial scrim ensuring crisp heading contrast over photographs */}
        <mesh
          geometry={SHARED_GATEWAY_PLANE}
          scale={[width - 0.04, scrimHeight, 1]}
          position={[0, -height / 2 + scrimHeight / 2 + 0.02, 0.28]}
        >
          <meshBasicMaterial color="#06030a" transparent opacity={0.82} depthWrite={false} />
        </mesh>

        {/* Gateway Heading */}
        <Text
          position={[0, -height / 2 + (isCompact ? 0.44 : 0.62), 0.30]}
          fontSize={titleFontSize}
          color="#FFF8E7"
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          letterSpacing={0.09}
          maxWidth={width - 0.18}
        >
          {title}
        </Text>

        {/* Subtle Live Metadata Subtitle */}
        {subtitle && (
          <Text
            position={[0, -height / 2 + (isCompact ? 0.18 : 0.26), 0.30]}
            fontSize={subFontSize}
            color="#FDE68A"
            anchorX="center"
            anchorY="middle"
            textAlign="center"
            letterSpacing={0.08}
            maxWidth={width - 0.18}
          >
            {subtitle}
          </Text>
        )}
      </group>
    </group>
  );
};

export default PortalTile;
