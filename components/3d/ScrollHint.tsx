'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useBoundless3DStore } from '@/context/boundless3dStore';
import { ChevronDown, ChevronsUpDown, MoveHorizontal } from 'lucide-react';

export const ScrollHint: React.FC = () => {
  const hintRef = useRef<HTMLDivElement>(null);
  const portal = useBoundless3DStore((state) => state.activePortalId);
  const scrollProgress = useBoundless3DStore((state) => state.scrollProgress);

  // Show hint when at the beginning of 3D journey or pan mode in portal
  let hintText = 'SCROLL TO EXPLORE';
  let showHint = false;

  if (!portal) {
    hintText = 'SCROLL TO EXPLORE';
    showHint = scrollProgress <= 0.05;
  } else if (portal === 'journeys') {
    hintText = 'SCROLL TRAIL';
    showHint = scrollProgress <= 0.05;
  } else {
    hintText = 'PAN HORIZON';
    showHint = true;
  }

  useEffect(() => {
    if (!hintRef.current) return;
    if (showHint) {
      gsap.to(hintRef.current, {
        opacity: 0.9,
        y: 0,
        duration: 1.2,
        delay: 1,
        ease: 'power2.out',
      });
    } else {
      gsap.killTweensOf(hintRef.current);
      gsap.to(hintRef.current, {
        opacity: 0,
        y: 12,
        duration: 0.4,
        ease: 'power2.in',
      });
    }
  }, [showHint]);

  return (
    <div
      ref={hintRef}
      className="fixed bottom-6 inset-x-0 mx-auto w-fit z-20 pointer-events-none transition-transform opacity-0 translate-y-3"
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#3B001B]/80 text-[#FFF9C7] backdrop-blur-md border border-[#FFE878]/30 shadow-lg text-xs font-semibold tracking-widest uppercase">
        {hintText === 'PAN HORIZON' ? (
          <MoveHorizontal className="w-4 h-4 animate-pulse text-[#FFE878]" />
        ) : (
          <ChevronDown className="w-4 h-4 animate-bounce text-[#FFE878]" />
        )}
        <span>{hintText}</span>
      </div>
    </div>
  );
};

export default ScrollHint;
