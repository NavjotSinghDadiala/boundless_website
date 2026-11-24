"use client";

import React, { useRef } from "react";
import {
  LazyMotion,
  domAnimation,
  m,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

const EDITORIAL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function ProfileMotionRoot({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}

/**
 * Thin warm-gold reading progress rail synced smoothly with document scroll.
 */
export function ReadingProgressRail() {
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    restDelta: 0.001,
  });

  if (prefersReduced) return null;

  return (
    <m.div
      aria-hidden="true"
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="fixed top-0 left-0 right-0 h-[3px] z-50 bg-gradient-to-r from-[#E0B866] via-[#f59e0b] to-[#6d1a2c] pointer-events-none"
    />
  );
}

/**
 * Subtle GPU-only editorial reveal (opacity + translateY), respecting reduced motion.
 */
export function EditorialReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </m.div>
  );
}

/**
 * Word-by-word masked display reveal for the member's name (editorial calm spring,
 * distinct from the homepage door/3D text).
 */
export function MaskedDisplayTitle({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const words = text.trim().split(/\s+/);

  if (prefersReduced) {
    return <h1 className={className}>{text}</h1>;
  }

  return (
    <h1 className={className} aria-label={text}>
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          className="inline-block overflow-hidden align-bottom mr-[0.26em] pb-1"
        >
          <m.span
            className="inline-block"
            initial={{ y: "105%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{
              duration: 0.72,
              delay: 0.08 + idx * 0.07,
              ease: EDITORIAL_EASE,
            }}
          >
            {word}
          </m.span>
        </span>
      ))}
    </h1>
  );
}

/**
 * Framed portrait wrapper with subtle scroll-linked vertical parallax.
 * Uses only GPU-composited `transform` and automatically disables under reduced motion.
 */
export function ScrollParallaxPortrait({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 24,
    mass: 0.5,
  });
  const y = useTransform(smoothProgress, [0, 1], [-14, 18]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {prefersReduced ? (
        <div>{children}</div>
      ) : (
        <m.div style={{ y }}>{children}</m.div>
      )}
    </div>
  );
}
