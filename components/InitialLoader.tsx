"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function InitialLoader() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Only run on the client side
    const hasSeenLoader = sessionStorage.getItem("hasSeenBoundlessLoader");
    if (!hasSeenLoader) {
      setShouldRender(true);
      // Disable scrolling during load
      document.body.style.overflow = "hidden";
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldRender) return;

    // Simulate progress increments for a smooth loading feel
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          // Allow exit animation to start
          setTimeout(() => {
            setIsLoading(false);
            // Restore body scrolling
            document.body.style.overflow = "";
            // Save to session storage so it doesn't show again in the same session
            sessionStorage.setItem("hasSeenBoundlessLoader", "true");
          }, 600);
          return 100;
        }
        // Random incremental steps
        const step = Math.floor(Math.random() * 15) + 5;
        return Math.min(prev + step, 100);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [shouldRender]);

  if (!shouldRender) return null;

  const letterVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
  };

  const letters = "BOUNDLESS".split("");

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            y: "-100%",
            transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] }
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-br from-[#1E000D] via-[#2F0015] to-[#0A0005]"
        >
          {/* Decorative ambient glow circles */}
          <div className="absolute w-[400px] h-[400px] rounded-full bg-[#3B001B]/20 blur-[120px] top-1/4 left-1/4 animate-pulse pointer-events-none" />
          <div className="absolute w-[300px] h-[300px] rounded-full bg-[#FFE878]/5 blur-[100px] bottom-1/4 right-1/4 pointer-events-none" />

          {/* Core Content Container */}
          <div className="flex flex-col items-center justify-center z-10 space-y-8">

            {/* Pulsing Outer Ring with Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative flex items-center justify-center"
            >
              {/* Outer Golden Spinning/Glowing Ring */}
              <div className="absolute h-32 w-32 rounded-full border border-dashed border-[#FFE878]/30 animate-spin-reverse" />

              {/* Inner Glowing Ring */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute h-28 w-28 rounded-full bg-gradient-to-r from-[#FFE878] to-[#FCE16D] opacity-20 blur-md"
              />

              {/* Centered Logo Frame */}
              <div className="relative w-24 h-24 bg-[#3B001B] border border-[#FFE878]/30 rounded-full flex items-center justify-center shadow-2xl overflow-hidden p-1">
                <Image
                  src="/Logo Bound.png"
                  alt="Boundless Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
            </motion.div>

            {/* Premium Animated Brand Name */}
            <div className="flex flex-col items-center space-y-2">
              <motion.div
                initial="initial"
                animate="animate"
                transition={{ staggerChildren: 0.08 }}
                className="flex gap-1.5 justify-center"
              >
                {letters.map((letter, idx) => (
                  <motion.span
                    key={idx}
                    variants={letterVariants}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFE878] to-[#FCE16D] font-oswald tracking-widest uppercase drop-shadow-[0_2px_8px_rgba(255,232,120,0.2)]"
                  >
                    {letter}
                  </motion.span>
                ))}
              </motion.div>

              {/* Sub-label */}
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] text-[#FFE878]/60 text-center font-oswald pl-[0.4em]"
              >
                Travel Society
              </motion.span>
            </div>

            {/* Premium Progress Section */}
            <div className="w-64 space-y-3 pt-6 flex flex-col items-center">
              {/* Progress Bar Track */}
              <div className="h-[2px] w-full bg-[#FFE878]/10 rounded-full overflow-hidden relative">
                {/* Glow Behind Fill */}
                <motion.div
                  className="absolute top-0 bottom-0 left-0 bg-[#FFE878] blur-[2px]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeInOut" }}
                />
                {/* Main Fill */}
                <motion.div
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#FFE878] to-[#FCE16D]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeInOut" }}
                />
              </div>

              {/* Progress Count */}
              <div className="flex justify-between items-center w-full px-1 text-[10px] md:text-xs font-bold tracking-widest font-mono text-[#FFE878]/55">
                <span>LOADING SOCIETY</span>
                <span className="text-[#FFE878] font-bold">{progress}%</span>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
