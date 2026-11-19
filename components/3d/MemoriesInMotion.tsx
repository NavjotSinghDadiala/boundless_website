'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';

/**
 * Injects Cloudinary dynamic edge transformations into existing Cloudinary URLs
 * without introducing any secondary storage or image proxy.
 */
export function optimizeCloudinaryUrl(rawUrl: string, width = 850): string {
  if (!rawUrl || !rawUrl.includes('res.cloudinary.com') || !rawUrl.includes('/image/upload/')) {
    return rawUrl;
  }
  const transform = `f_webp,q_auto:good,w_${width},c_limit`;
  if (rawUrl.includes(`/image/upload/${transform}/`)) {
    return rawUrl;
  }
  return rawUrl.replace('/image/upload/', `/image/upload/${transform}/`);
}

// 12 real Boundless Travel Society expedition photographs from existing Cloudinary accounts
const PHOTOS = {
  nepal: 'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1782302383/previous_trips/mhe7pozkwp2g3fj17epf.jpg',
  tungnath: 'https://res.cloudinary.com/duuyaejwy/image/upload/v1761071519/Tunganath_mqkast.png',
  darjeeling: 'https://res.cloudinary.com/duuyaejwy/image/upload/v1761071512/darjeeling_md0pij.jpg',
  kerala: 'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1782302342/previous_trips/akzpy8atpb0knhdyg3yc.jpg',
  himachal: 'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1774820432/gallery/xd8oetlon48blstdsiw3.webp',
  rajasthan: 'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1782301064/gallery/irs3820iabnip1dcizg2.jpg',
  pondicherry: 'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1782302556/previous_trips/jfyyabx2vefmcnddcyx4.jpg',
  shimoga: 'https://res.cloudinary.com/duuyaejwy/image/upload/v1761071486/Gal4_qqzav1.png',
  ooty: 'https://res.cloudinary.com/duuyaejwy/image/upload/v1761071518/Ooty_oka207.png',
  lonavala: 'https://res.cloudinary.com/duuyaejwy/image/upload/v1761071486/Gal5_mtp67i.png',
  rameshwaram: 'https://res.cloudinary.com/duuyaejwy/image/upload/v1761071530/Rameshwaram_yeroeh.png',
  postParadox: 'https://res.cloudinary.com/dxh7qhxlx/image/upload/v1782302615/previous_trips/zhgcn712gy4ymjlfyma4.jpg',
};

export interface CollageMemorySpec {
  id: string;
  url: string;
  position: [number, number, number];
  size: [number, number];
  rotationDeg: [number, number, number];
  parallaxFactor: number;
  revealStart: number;
  phase: number;
}

/**
 * DESKTOP V5 CURATED FLOATING MEMORY COLLAGE (16 Enlarged Layered Panels)
 * - Door sits at Y = -10.5; first photographs begin at Y = -19.5 (9.0-unit clear cosmic gap!).
 * - Photograph dimensions increased ~30% over V4 (up to 6.8 x 4.0) with widened lateral
 *   placement so enlarged panels maintain generous negative space and zero camera collision.
 */
const DESKTOP_COLLAGE_MEMORIES: CollageMemorySpec[] = [
  // --- STAGE D: First Enlarged Memories Emerging Beyond the Clear Cosmic Gap (Y: -19.5 to -22.8) ---
  {
    id: 'desk-01-nepal',
    url: PHOTOS.nepal,
    position: [-4.6, -19.5, 2.8],
    size: [5.5, 3.8],
    rotationDeg: [8, 19, -6],
    parallaxFactor: 1.14,
    revealStart: 0.48,
    phase: 0.4,
  },
  {
    id: 'desk-02-kerala',
    url: PHOTOS.kerala,
    position: [5.2, -20.8, 7.1],
    size: [6.0, 3.9],
    rotationDeg: [-9, -22, 5],
    parallaxFactor: 0.90,
    revealStart: 0.49,
    phase: 1.3,
  },
  {
    id: 'desk-03-darjeeling',
    url: PHOTOS.darjeeling,
    position: [3.8, -22.0, 1.9],
    size: [4.3, 5.6], // Tall portrait
    rotationDeg: [11, -16, -7],
    parallaxFactor: 1.24,
    revealStart: 0.50,
    phase: 2.1,
  },
  {
    id: 'desk-04-tungnath',
    url: PHOTOS.tungnath,
    position: [-6.6, -22.8, 6.8],
    size: [6.5, 4.0], // Wide cinematic
    rotationDeg: [-6, 25, 4],
    parallaxFactor: 0.74,
    revealStart: 0.51,
    phase: 2.9,
  },

  // --- STAGE E: Deep Cosmic Memory Journey (Y: -24.2 to -36.2) ---
  {
    id: 'desk-05-himachal',
    url: PHOTOS.himachal,
    position: [-3.5, -24.2, 8.2],
    size: [4.8, 3.4],
    rotationDeg: [-13, 14, -5],
    parallaxFactor: 1.30,
    revealStart: 0.52,
    phase: 3.5,
  },
  {
    id: 'desk-06-rajasthan',
    url: PHOTOS.rajasthan,
    position: [6.8, -25.4, 4.0],
    size: [6.2, 4.3],
    rotationDeg: [5, -27, 6],
    parallaxFactor: 0.78,
    revealStart: 0.53,
    phase: 4.2,
  },
  {
    id: 'desk-07-pondicherry',
    url: PHOTOS.pondicherry,
    position: [-5.1, -26.5, 1.8],
    size: [4.1, 5.5], // Tall portrait
    rotationDeg: [10, 20, 8],
    parallaxFactor: 1.06,
    revealStart: 0.55,
    phase: 4.9,
  },
  {
    id: 'desk-08-shimoga',
    url: PHOTOS.shimoga,
    position: [3.6, -27.7, 8.3],
    size: [5.1, 3.5],
    rotationDeg: [-12, -18, -6],
    parallaxFactor: 1.32,
    revealStart: 0.56,
    phase: 5.4,
  },
  {
    id: 'desk-09-ooty',
    url: PHOTOS.ooty,
    position: [-7.0, -28.9, 4.9],
    size: [6.7, 4.1], // Wide vista
    rotationDeg: [4, 24, -4],
    parallaxFactor: 0.70,
    revealStart: 0.58,
    phase: 0.9,
  },
  {
    id: 'desk-10-lonavala',
    url: PHOTOS.lonavala,
    position: [4.8, -30.0, 2.2],
    size: [5.6, 3.6],
    rotationDeg: [9, -20, 6],
    parallaxFactor: 1.18,
    revealStart: 0.59,
    phase: 1.7,
  },
  {
    id: 'desk-11-rameshwaram',
    url: PHOTOS.rameshwaram,
    position: [-3.7, -31.2, 7.5],
    size: [4.3, 5.4], // Portrait
    rotationDeg: [-11, 16, 7],
    parallaxFactor: 1.26,
    revealStart: 0.61,
    phase: 2.5,
  },
  {
    id: 'desk-12-post-paradox',
    url: PHOTOS.postParadox,
    position: [6.5, -32.2, 7.0],
    size: [6.3, 4.0],
    rotationDeg: [-7, -25, -5],
    parallaxFactor: 0.76,
    revealStart: 0.63,
    phase: 3.1,
  },
  {
    id: 'desk-13-nepal-deep',
    url: PHOTOS.nepal,
    position: [-5.6, -33.4, 2.7],
    size: [5.8, 3.9],
    rotationDeg: [10, 21, -7],
    parallaxFactor: 0.96,
    revealStart: 0.65,
    phase: 3.8,
  },
  {
    id: 'desk-14-darjeeling-late',
    url: PHOTOS.darjeeling,
    position: [3.9, -34.4, 2.8],
    size: [4.9, 3.4],
    rotationDeg: [12, -15, 5],
    parallaxFactor: 1.25,
    revealStart: 0.67,
    phase: 4.6,
  },
  {
    id: 'desk-15-kerala-late',
    url: PHOTOS.kerala,
    position: [-6.0, -35.4, 7.2],
    size: [6.8, 4.0],
    rotationDeg: [-8, 24, 4],
    parallaxFactor: 0.75,
    revealStart: 0.69,
    phase: 5.2,
  },
  {
    id: 'desk-16-rajasthan-exit',
    url: PHOTOS.rajasthan,
    position: [5.0, -36.2, 4.7],
    size: [5.9, 3.8],
    rotationDeg: [-5, -23, -4],
    parallaxFactor: 0.88,
    revealStart: 0.71,
    phase: 2.7,
  },
];

/**
 * MOBILE V5 DELIBERATELY COMPOSED FLOATING COLLAGE (10 Portrait-Optimized Panels for 390 x 844)
 * - Uses vertical Z-axis real estate (above & below center) with controlled X spread ([-1.65, +1.65])
 *   so photographs stay large, recognizable, layered in depth, and unclipped on narrow screens.
 * - Fewer simultaneously active textures for sustained mobile performance.
 */
const MOBILE_COLLAGE_MEMORIES: CollageMemorySpec[] = [
  {
    id: 'mob-01-nepal',
    url: PHOTOS.nepal,
    position: [-1.35, -19.6, 2.8], // Upper-left clear framing
    size: [2.75, 1.95],
    rotationDeg: [9, 14, -5],
    parallaxFactor: 1.12,
    revealStart: 0.48,
    phase: 0.5,
  },
  {
    id: 'mob-02-kerala',
    url: PHOTOS.kerala,
    position: [1.35, -21.2, 7.1], // Lower-right
    size: [2.9, 2.0],
    rotationDeg: [-9, -15, 5],
    parallaxFactor: 0.92,
    revealStart: 0.50,
    phase: 1.4,
  },
  {
    id: 'mob-03-darjeeling',
    url: PHOTOS.darjeeling,
    position: [1.25, -23.0, 2.4], // Upper-right portrait
    size: [2.25, 3.0],
    rotationDeg: [10, -13, -6],
    parallaxFactor: 1.20,
    revealStart: 0.52,
    phase: 2.2,
  },
  {
    id: 'mob-04-tungnath',
    url: PHOTOS.tungnath,
    position: [-1.45, -24.8, 7.3], // Lower-left wide
    size: [3.05, 2.05],
    rotationDeg: [-8, 16, 4],
    parallaxFactor: 0.82,
    revealStart: 0.54,
    phase: 3.0,
  },
  {
    id: 'mob-05-himachal',
    url: PHOTOS.himachal,
    position: [-1.30, -26.6, 2.9], // Upper-left mid
    size: [2.85, 2.0],
    rotationDeg: [11, 12, -4],
    parallaxFactor: 1.18,
    revealStart: 0.56,
    phase: 3.7,
  },
  {
    id: 'mob-06-rajasthan',
    url: PHOTOS.rajasthan,
    position: [1.40, -28.4, 6.9], // Lower-right
    size: [2.95, 2.1],
    rotationDeg: [-10, -14, 6],
    parallaxFactor: 0.88,
    revealStart: 0.58,
    phase: 4.3,
  },
  {
    id: 'mob-07-pondicherry',
    url: PHOTOS.pondicherry,
    position: [-1.25, -30.2, 2.5], // Upper-left portrait
    size: [2.2, 2.95],
    rotationDeg: [9, 15, 7],
    parallaxFactor: 1.08,
    revealStart: 0.61,
    phase: 5.0,
  },
  {
    id: 'mob-08-shimoga',
    url: PHOTOS.shimoga,
    position: [1.30, -32.0, 7.4], // Lower-right close
    size: [2.8, 1.95],
    rotationDeg: [-11, -13, -5],
    parallaxFactor: 1.22,
    revealStart: 0.64,
    phase: 5.5,
  },
  {
    id: 'mob-09-rameshwaram',
    url: PHOTOS.rameshwaram,
    position: [-1.35, -33.8, 6.8], // Lower-left portrait
    size: [2.3, 3.0],
    rotationDeg: [-9, 14, 5],
    parallaxFactor: 1.15,
    revealStart: 0.67,
    phase: 1.1,
  },
  {
    id: 'mob-10-ooty',
    url: PHOTOS.ooty,
    position: [1.35, -35.4, 3.0], // Final upper-right before Expeditions
    size: [2.9, 2.0],
    rotationDeg: [8, -15, -4],
    parallaxFactor: 0.90,
    revealStart: 0.70,
    phase: 2.6,
  },
];

// Shared unit geometries to minimize GPU memory allocations and draw overhead
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const UNIT_SLAB = new THREE.BoxGeometry(1, 1, 0.045);

// Door threshold Y coordinate: strictly NO photograph visible or loaded before camera crosses Y = -10.5
const DOOR_THRESHOLD_Y = -10.5;

/**
 * Ref-counted shared Cloudinary texture cache so all panels share
 * unique WebP GPU textures and dispose them cleanly when out of range.
 */
interface CachedTextureEntry {
  texture: THREE.Texture | null;
  refs: number;
  loading: boolean;
  callbacks: Array<(tex: THREE.Texture | null) => void>;
}

const sharedTextureCache = new Map<string, CachedTextureEntry>();
const sharedLoader = new THREE.TextureLoader();
sharedLoader.setCrossOrigin('anonymous');

function acquireTexture(url: string, onReady: (tex: THREE.Texture | null) => void): void {
  let entry = sharedTextureCache.get(url);
  if (!entry) {
    entry = { texture: null, refs: 0, loading: false, callbacks: [] };
    sharedTextureCache.set(url, entry);
  }
  entry.refs += 1;

  if (entry.texture) {
    onReady(entry.texture);
    return;
  }

  entry.callbacks.push(onReady);
  if (!entry.loading) {
    entry.loading = true;
    sharedLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;

        const current = sharedTextureCache.get(url);
        if (!current || current.refs <= 0) {
          tex.dispose();
          sharedTextureCache.delete(url);
          return;
        }
        current.texture = tex;
        current.loading = false;
        const cbs = current.callbacks.splice(0);
        cbs.forEach((cb) => cb(tex));
      },
      undefined,
      () => {
        const current = sharedTextureCache.get(url);
        if (current) {
          current.loading = false;
          const cbs = current.callbacks.splice(0);
          cbs.forEach((cb) => cb(null));
        }
      }
    );
  }
}

function releaseTexture(url: string): void {
  const entry = sharedTextureCache.get(url);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs === 0) {
    if (entry.texture) {
      entry.texture.dispose();
      entry.texture = null;
    }
    sharedTextureCache.delete(url);
  }
}

interface FloatingMemoryPanelProps {
  spec: CollageMemorySpec;
}

const FloatingMemoryPanel: React.FC<FloatingMemoryPanelProps> = ({ spec }) => {
  const groupRef = useRef<THREE.Group>(null);
  const photoMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const backingMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const { camera } = useThree();
  const data = useScroll();

  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const acquiredRef = useRef(false);

  const optimizedUrl = useMemo(
    () => optimizeCloudinaryUrl(spec.url, isMobile ? 480 : 880),
    [spec.url]
  );

  // Recompile material shader whenever texture transitions between null and loaded
  useEffect(() => {
    if (photoMatRef.current) {
      photoMatRef.current.map = texture;
      photoMatRef.current.needsUpdate = true;
    }
  }, [texture]);

  // Release texture reference on unmount
  useEffect(() => {
    return () => {
      if (acquiredRef.current) {
        releaseTexture(optimizedUrl);
        acquiredRef.current = false;
      }
    };
  }, [optimizedUrl]);

  const [xPos, baseY, zPos] = spec.position;
  const [panelW, panelH] = spec.size;
  // Subtle dark cosmic rim edge (+0.05) for physical depth against black outer space
  const slabW = panelW + 0.05;
  const slabH = panelH + 0.05;

  const rotX = THREE.MathUtils.degToRad(spec.rotationDeg[0]);
  const rotY = THREE.MathUtils.degToRad(spec.rotationDeg[1]);
  const rotZ = THREE.MathUtils.degToRad(spec.rotationDeg[2]);

  // Tighter proximity loading/disposal on mobile to cap simultaneous GPU textures
  const acquireDist = isMobile ? 11.5 : 15.5;
  const releaseDist = isMobile ? 16.5 : 22.0;

  useFrame((state) => {
    if (!groupRef.current) return;

    const scrollOffset = data ? data.offset : 0;
    const camY = camera.position.y;
    const distY = Math.abs(camY - baseY);

    // STRICT DOOR-FIRST SEQUENCE:
    // Zero panels visible or loaded before camera physically crosses the enlarged wooden door (Y = -10.5)
    const hasCrossedDoor = camY < DOOR_THRESHOLD_Y - 0.25 && scrollOffset > 0.445;

    // Progressive proximity texture loading & disposal
    const shouldAcquire = camY < DOOR_THRESHOLD_Y - 0.1 && scrollOffset > 0.44 && distY < acquireDist;
    const shouldRelease = camY > DOOR_THRESHOLD_Y + 3.0 || distY > releaseDist;

    if (shouldAcquire && !acquiredRef.current) {
      acquiredRef.current = true;
      acquireTexture(optimizedUrl, (tex) => {
        if (acquiredRef.current) {
          setTexture(tex);
        }
      });
    } else if (shouldRelease && acquiredRef.current) {
      acquiredRef.current = false;
      releaseTexture(optimizedUrl);
      setTexture(null);
    }

    if (!hasCrossedDoor) {
      groupRef.current.visible = false;
      return;
    }

    // Smooth emergence across the 9-unit cosmic gap after crossing the door
    const doorReveal = THREE.MathUtils.smoothstep(-camY, 10.8, 13.8);
    const stageReveal = THREE.MathUtils.smoothstep(scrollOffset, spec.revealStart - 0.03, spec.revealStart + 0.05);
    const exitFade = 1 - THREE.MathUtils.smoothstep(scrollOffset, 0.85, 0.94);
    const distFade = 1 - THREE.MathUtils.smoothstep(distY, isMobile ? 9.5 : 12.5, isMobile ? 14.5 : 19.0);
    const opacity = doorReveal * stageReveal * exitFade * distFade;

    groupRef.current.visible = opacity > 0.01;
    if (!groupRef.current.visible) return;

    // Multi-layer depth parallax + subtle zero-gravity cosmic float
    const t = state.clock.elapsedTime;
    const parallaxOffsetY = (camY - baseY) * (spec.parallaxFactor - 1) * 0.14;
    const microFloat = Math.sin(t * 0.4 + spec.phase) * 0.06;

    groupRef.current.position.set(xPos, baseY + parallaxOffsetY + microFloat, zPos);

    if (photoMatRef.current) photoMatRef.current.opacity = opacity;
    if (backingMatRef.current) backingMatRef.current.opacity = opacity;
  });

  return (
    <group ref={groupRef} position={[xPos, baseY, zPos]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <group rotation={[rotX, rotY, rotZ]}>
        {/* Sleek dark cosmic rim backing slab */}
        <mesh geometry={UNIT_SLAB} scale={[slabW, slabH, 1]} position={[0, 0, -0.025]}>
          <meshStandardMaterial
            ref={backingMatRef}
            color="#1c1226"
            roughness={0.6}
            metalness={0.25}
            transparent
            opacity={0}
          />
        </mesh>

        {/* Full-bleed photographic surface */}
        <mesh geometry={UNIT_PLANE} scale={[panelW, panelH, 1]} position={[0, 0, 0.002]}>
          <meshBasicMaterial
            ref={photoMatRef}
            map={texture}
            color={texture ? '#ffffff' : '#120a1c'}
            transparent
            opacity={0}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
};

export const MemoriesInMotion: React.FC = () => {
  const memories = isMobile ? MOBILE_COLLAGE_MEMORIES : DESKTOP_COLLAGE_MEMORIES;

  return (
    <group name="memories-in-motion-cosmic-collage">
      {memories.map((spec) => (
        <FloatingMemoryPanel key={spec.id} spec={spec} />
      ))}
    </group>
  );
};

export default MemoriesInMotion;
