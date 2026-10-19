'use client';

import React from 'react';
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

  useFrame((state, delta) => {
    if (data) {
      // Map scroll intervals using the proven exponential dampening equations
      const a = data.range(0, 0.3);       // Pitch downward: 0 to -90 deg
      const b = data.range(0.3, 0.5);     // Vertical descent: Y = 0 to -37
      const d = data.range(0.85, 0.18);   // Depth arrival: Z = 5 to 15

      if (!isActive) {
        // Continuous camera dampening rig
        camera.rotation.x = THREE.MathUtils.damp(camera.rotation.x, -0.5 * Math.PI * a, 5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, -37 * b, 7, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, 5 + 10 * d, 7, delta);

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
