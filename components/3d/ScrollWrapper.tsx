'use client';

import React, { useEffect } from 'react';
import { useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';
import { useBoundless3DStore } from '@/context/boundless3dStore';

interface ScrollWrapperProps {
  children: React.ReactNode | React.ReactNode[];
}

export const ScrollWrapper: React.FC<ScrollWrapperProps> = ({ children }) => {
  const { camera } = useThree();
  const data = useScroll();
  const isActive = useBoundless3DStore((state) => !!state.activePortalId);
  const setScrollProgress = useBoundless3DStore((state) => state.setScrollProgress);

  // Align camera, Drei scroll offset, and store progress immediately on mount / route return
  useEffect(() => {
    const syncInitialScroll = () => {
      const section = typeof document !== 'undefined' ? document.getElementById('boundless-3d-experience') : null;
      let initialProgress = 0;
      if (section) {
        const rect = section.getBoundingClientRect();
        const maxScroll = section.offsetHeight - window.innerHeight;
        initialProgress = maxScroll > 0 ? Math.max(0, Math.min(1, -rect.top / maxScroll)) : 0;
      }

      if (data) {
        const scrollRef = (data as unknown as { scroll?: { current: number } }).scroll;
        if (scrollRef) {
          scrollRef.current = initialProgress;
        }
        data.offset = initialProgress;
        if (data.el) {
          const scrollThreshold = data.el.scrollHeight - data.el.clientHeight;
          if (scrollThreshold > 0) {
            data.el.scrollTop = initialProgress * scrollThreshold;
          }
        }
      }

      const a = THREE.MathUtils.clamp(initialProgress / 0.3, 0, 1);
      const b = THREE.MathUtils.clamp((initialProgress - 0.3) / 0.5, 0, 1);
      const d = THREE.MathUtils.clamp((initialProgress - 0.85) / 0.18, 0, 1);

      camera.rotation.x = -0.5 * Math.PI * a;
      camera.rotation.y = 0;
      camera.position.y = -37 * b;
      camera.position.z = 5 + 10 * d;
      camera.updateProjectionMatrix();
      setScrollProgress(initialProgress);
    };

    syncInitialScroll();
    // Re-sync once after ScrollControls attaches data.el and Next.js settles scroll restoration
    const rafId = window.requestAnimationFrame(syncInitialScroll);
    return () => window.cancelAnimationFrame(rafId);
  }, [camera, data, setScrollProgress]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    if (data) {
      // Synchronize Drei's virtual scroll target with the document's pinned scroll position
      const section = typeof document !== 'undefined' ? document.getElementById('boundless-3d-experience') : null;
      if (section) {
        const rect = section.getBoundingClientRect();
        const maxScroll = section.offsetHeight - window.innerHeight;
        const progress = maxScroll > 0 ? Math.max(0, Math.min(1, -rect.top / maxScroll)) : 0;

        const scrollRef = (data as unknown as { scroll?: { current: number } }).scroll;
        if (scrollRef) {
          scrollRef.current = progress;
        }
        if (data.el) {
          const scrollThreshold = data.el.scrollHeight - data.el.clientHeight;
          if (scrollThreshold > 0) {
            data.el.scrollTop = progress * scrollThreshold;
          }
        }
      }

      // Map scroll intervals using the proven exponential dampening equations
      const a = data.range(0, 0.3);       // Pitch downward: 0 to -90 deg
      const b = data.range(0.3, 0.5);     // Vertical descent: Y = 0 to -37
      const d = data.range(0.85, 0.18);   // Depth arrival: Z = 5 to 15

      if (!isActive) {
        // Continuous camera dampening rig (moderately snappier response while preserving smoothness)
        camera.rotation.x = THREE.MathUtils.damp(camera.rotation.x, -0.5 * Math.PI * a, 6.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, -37 * b, 8.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, 5 + 10 * d, 8.5, delta);

        // Sync global store for overlays, badges, and hints
        setScrollProgress(data.range(0, 1));
      }

      // Gentle mouse parallax yaw on desktop when not locked in a portal
      if (!isMobile && !isActive) {
        camera.rotation.y = THREE.MathUtils.lerp(
          camera.rotation.y,
          -(state.pointer.x * Math.PI) / 90,
          0.05
        );
      }
    }
  });

  const childArray = Array.isArray(children) ? children : [children];

  return (
    <>
      {childArray.map((child, index) => (
        <group key={index}>{child}</group>
      ))}
    </>
  );
};

export default ScrollWrapper;
