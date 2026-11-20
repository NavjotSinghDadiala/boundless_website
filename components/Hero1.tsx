"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import VideoContainer from "@/components/videoCont";
import AnimatedByChar from "./AnimatedByWord";

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Synchronize subtitle fade-out directly with the scroll transition into the cream section
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start end", "start start"],
  });

  // Smoothly fades out as the scroll transition reaches completion; restores automatically on reverse scroll
  const subtitleOpacity = useTransform(scrollYProgress, [0.68, 0.96], [1, 0]);
  const subtitleY = useTransform(
    scrollYProgress,
    [0.68, 0.96],
    prefersReducedMotion ? [0, 0] : [0, -8]
  );

  return (
    <section ref={heroRef} className="pt-4 sm:pt-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-[#3B001B] mb-4 md:mb-6 relative nosifer-regular">
          BOUNDLESS
        </h1>
        <div className="p-3 md:p-4 rounded-lg max-w-xs sm:max-w-md md:max-w-2xl mx-auto mb-6 md:mb-8">
          <motion.h2
            className="text-[#3B001B] mb-5 md:mb-7 oswald-subtitle will-change-[opacity,transform]"
            style={{
              fontSize: "42px",
              opacity: subtitleOpacity,
              y: subtitleY,
            }}
          >
            <AnimatedByChar text="IIT 'M BS TRAVEL SOCIETY" />
          </motion.h2>
          <div>
            <a
              href="https://forms.gle/3DKAWuaaeuLwyEhr6"
              className="inline-flex items-center justify-center bg-[#FFE878] hover:bg-[#FCE16D] hover:translate-y-1 active:translate-y-1.5 text-[#3B001B] transition-all px-10 sm:px-14 md:px-16 py-3.5 sm:py-4 md:py-5 min-w-[200px] sm:min-w-[240px] md:min-w-[280px] rounded-full font-bold tracking-wide text-lg sm:text-xl md:text-2xl cursor-pointer"
              style={{ boxShadow: "0px 7px 1px #9c1352" }}
            >
              Join Us
            </a>
          </div>
        </div>
      </div>
      {/* Decorative Circle with GPU Acceleration */}
      <div
        style={{
          maskImage: `linear-gradient(to top, black 50%, transparent 98%)`,
          WebkitMaskImage: `linear-gradient(to top, black 50%, transparent 98%)`,
          transform: "translateZ(0)", // <-- forces GPU rendering
          willChange: "transform", // <-- prevents paint flashing
        }}
        className="flex justify-center"
      >
        <VideoContainer />
      </div>
    </section>
  );
}
