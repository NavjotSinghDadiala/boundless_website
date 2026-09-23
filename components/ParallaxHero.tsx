"use client";

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLenis } from "lenis/react";
import {
  useMotionValue,
  useTransform,
  motion,
  MotionValue,
} from "framer-motion";

/**
 * Parallax Mountain Scene
 *
 * Strategy:
 *  - Outer div (700vh) lives in normal flow and provides scroll height.
 *  - The visual scene is portaled into document.body as position:fixed,
 *    guaranteeing 100vw × 100svh regardless of parent overflow/width constraints.
 *  - Scene is hidden (opacity 0, pointer-events none) when the 700vh container
 *    is not intersecting the viewport, so it doesn't cover later sections.
 *
 * Layer z-order (back → front):
 *   1 – mountain bg silhouette   (slowest)
 *   2 – cloud/sky atmosphere
 *   3 – rocky ridge diagonal
 *   5 – mid mountain peak
 *   4 – cloud mist band (x2)
 *   6 – green hillside
 *   7 – foreground ridge
 *   8 – green mound foreground   (fastest)
 */

type LayerDef = {
  src: string;
  alt: string;
  speed: number;
  top: string;
  z: number;
  /** CSS width of the image — defaults to "100%". Use e.g. "80%" to shrink or "130%" to enlarge. */
  width?: string;
  /** Horizontal offset — defaults to 0. Use e.g. "-15%" to shift left. */
  left?: string;
  priority?: boolean;
};

const CDN = "https://res.cloudinary.com/dia2m9kdb/image/upload/f_auto,q_auto,w_2560,c_limit,fl_preserve_transparency";

const LAYERS: LayerDef[] = [
  // ─── DESKTOP coords — do NOT edit (edit MOBILE_LAYERS below for mobile) ───
  { src: `${CDN}/v1788014684/1_foaz3g.png`, alt: "Mountain background", speed: -0.05, top: "-5%", width: "100%", z: 1, priority: true },
  { src: `${CDN}/v1788014693/2_kpdl3u.png`, alt: "Cloud atmosphere", speed: -0.05, top: "-60%", width: "100%", z: 2, priority: true },
  { src: `${CDN}/v1788014705/3_hvlzzy.png`, alt: "Rocky ridge", speed: -0.20, top: "-10%", width: "120%", left: "-10%", z: 3 },
  { src: `${CDN}/v1788014698/5_dqvzfv.png`, alt: "Mountain peak", speed: -0.30, top: "-40%", width: "150%", left: "-40%", z: 4 },
  { src: `${CDN}/v1788014690/4_vvsqvi.png`, alt: "Cloud mist", speed: -0.26, top: "100%", width: "100%", z: 5 },
  { src: `${CDN}/v1788014690/4_vvsqvi.png`, alt: "Cloud mist 2", speed: -0.26, top: "125%", width: "100%", z: 5 },
  { src: `${CDN}/v1788014682/6_zkq82o.png`, alt: "Green hillside", speed: -0.40, top: "-145%", width: "200%", left: "-40%", z: 6 },
  { src: `${CDN}/v1788014684/7_agkvrl.png`, alt: "Foreground ridge", speed: -0.55, top: "45%", width: "150%", left: "-40%", z: 7 },
  { src: "/8.png", alt: "Green mound", speed: -0.70, top: "220%", width: "120%", z: 8 },
];

/* Mobile-specific coordinates — portrait screen, narrower viewport */
const MOBILE_LAYERS: LayerDef[] = [
  { src: `${CDN}/v1788014684/1_foaz3g.png`, alt: "Mountain background", speed: -0.04, top: "-5%", width: "200%", left: "-15%", z: 1, priority: true },
  { src: `${CDN}/v1788014693/2_kpdl3u.png`, alt: "Cloud atmosphere", speed: -0.04, top: "-25%", width: "200%", left: "-15%", z: 2, priority: true },
  { src: `${CDN}/v1788014705/3_hvlzzy.png`, alt: "Rocky ridge", speed: -0.14, top: "-5%", width: "400%", left: "-150%", z: 3 },
  { src: `${CDN}/v1788014698/5_dqvzfv.png`, alt: "Mountain peak", speed: -0.20, top: "-65%", width: "500%", left: "-250%", z: 4 },
  { src: `${CDN}/v1788014690/4_vvsqvi.png`, alt: "Cloud mist", speed: -0.18, top: "80%", width: "150%", left: "-5%", z: 5 },
  { src: `${CDN}/v1788014690/4_vvsqvi.png`, alt: "Cloud mist 2", speed: -0.18, top: "100%", width: "150%", left: "-15%", z: 5 },
  { src: `${CDN}/v1788014690/4_vvsqvi.png`, alt: "Cloud mist 3", speed: -0.18, top: "100%", width: "150%", left: "-15%", z: 5 },
  { src: `${CDN}/v1788014690/4_vvsqvi.png`, alt: "Cloud mist 4", speed: -0.18, top: "100%", width: "150%", left: "-15%", z: 5 },
  { src: `${CDN}/v1788014690/4_vvsqvi.png`, alt: "Cloud mist 4", speed: -0.18, top: "90%", width: "150%", left: "-15%", z: 5 },
  { src: `${CDN}/v1788014690/4_vvsqvi.png`, alt: "Cloud mist 5", speed: -0.18, top: "110%", width: "150%", left: "-30%", z: 5 },
  { src: `${CDN}/v1788014690/4_vvsqvi.png`, alt: "Cloud mist 6", speed: -0.18, top: "120%", width: "150%", left: "-15%", z: 5 },

  { src: `${CDN}/v1788014682/6_zkq82o.png`, alt: "Green hillside", speed: -0.28, top: "-65%", width: "480%", left: "-180%", z: 6 },
  { src: `${CDN}/v1788014684/7_agkvrl.png`, alt: "Foreground ridge", speed: -0.38, top: "6%", width: "420%", left: "-190%", z: 7 },
  { src: "/8.png", alt: "Green mound", speed: -0.48, top: "39%", width: "450%", left: "-150%", z: 8 },
];

/* ── Detect mobile/tablet viewport ───────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    // Treat anything ≤ 1024px as mobile/tablet — skip parallax entirely
    const mq = window.matchMedia("(max-width: 1024px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/* ── Scroll tracking — synced directly to Lenis RAF loop (no redundant spring) ── */
function usePageScroll() {
  const scrollY = useMotionValue(0);

  // useLenis fires on EVERY Lenis animation frame — zero latency, perfectly smooth
  useLenis(({ scroll }: { scroll: number }) => {
    scrollY.set(scroll);
  });

  return scrollY;
}

/* ── Gate component — mobile returns null, desktop renders scene ──── */
export default function ParallaxHero() {
  const isMobile = useIsMobile();
  // Safe early return: no hooks are called after this in THIS component
  if (isMobile) return null;
  return <ParallaxHeroScene />;
}

/* ── Desktop-only scene — owns all heavy hooks ───────────────────── */
function ParallaxHeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollY = usePageScroll();
  const [mounted, setMounted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [testMode, setTestMode] = useState<string | null>(null);

  // Portal only works client-side; read testMode once on mount (no re-renders during scroll)
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      setTestMode(p.get("test") || p.get("mode") || null);
    }
  }, []);

  // Pre-decode layers ahead of time on desktop mount so decoding never hitches during active scroll
  useEffect(() => {
    if (testMode !== "baseline") {
      LAYERS.forEach((layer) => {
        const img = new Image();
        img.src = layer.src;
        img.decode().catch(() => { });
      });
    }
  }, [testMode]);

  // Hide the fixed scene when the 700vh scroll container leaves the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scene = (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw", height: "100svh",
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: heroVisible ? 1 : 0,
        transition: "opacity 0.4s ease",
        background: "linear-gradient(180deg, #bdd4e4 0%, #d6e8f2 35%, #eaf3f8 65%, #f4f9fb 100%)",
        willChange: heroVisible ? "opacity" : "auto",
      }}
    >
      {LAYERS.map((layer, i) => (
        <ParallaxLayer
          key={`${layer.src}-${i}`}
          layer={layer}
          scrollY={scrollY}
          heroVisible={heroVisible}
          testMode={testMode}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Scroll height provider — sits in normal flow, pushes content down */}
      <div
        ref={containerRef}
        style={{ height: "700vh", marginTop: "-80px" }}
      />
      {/* Scene portaled directly to body — bypasses all parent constraints */}
      {mounted && createPortal(scene, document.body)}
    </>
  );
}

/* ── Individual parallax layer ────────────────────────────────────── */
function ParallaxLayer({
  layer,
  scrollY,
  heroVisible,
  testMode,
}: {
  layer: LayerDef;
  scrollY: MotionValue<number>;
  heroVisible: boolean;
  testMode: string | null;
}) {
  const y = useTransform(scrollY, (s) => s * layer.speed);

  // Controlled test mode flags for systematic benchmarking
  const isBaseline = testMode === "baseline";
  const noWillChange = testMode === "no-will-change";
  const noBackface = testMode === "no-backface";

  // In baseline: keep static will-change.
  // In no-will-change: omit will-change entirely.
  // In optimized default: dynamically promote to compositor layer only while heroVisible is true,
  // releasing GPU compositor VRAM when scrolled past the 700vh hero section.
  const willChange = noWillChange
    ? undefined
    : isBaseline
      ? "transform"
      : heroVisible
        ? "transform"
        : "auto";

  const backfaceVisibility = noBackface ? undefined : "hidden";

  // In baseline, use unconstrained raw CDN URL; otherwise use 2.5K width-limited CDN URL
  const src = isBaseline ? layer.src.replace("w_2560,c_limit,", "") : layer.src;

  // In baseline, only priority layers are eager; in optimized/predecode, all layers are eager
  // with async decoding so they are ready in memory before scroll begins
  const isEager = testMode !== "baseline";

  return (
    <motion.div
      style={{
        position: "absolute",
        top: layer.top,
        left: layer.left ?? 0,
        width: layer.width ?? "100%",
        zIndex: layer.z,
        y,
        willChange,
        backfaceVisibility,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={layer.alt}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
        }}
        loading={isEager ? "eager" : layer.priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={layer.priority ? "high" : "auto"}
      />
    </motion.div>
  );
}
