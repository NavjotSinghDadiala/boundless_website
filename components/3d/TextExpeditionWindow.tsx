'use client';

import React, { useRef } from 'react';
import { Text, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const TextExpeditionWindow: React.FC = () => {
  const data = useScroll();
  const windowRef = useRef<THREE.Group>(null);

  useFrame(() => {
    // Rotation progress through the scroll interval [0.65, 0.80]
    const c = data.range(0.65, 0.15);

    if (windowRef.current) {
      // Rotate 90 degrees around Y axis
      windowRef.current.setRotationFromAxisAngle(new THREE.Vector3(0, -1, 0), 0.5 * Math.PI * c);
      windowRef.current.position.x = -0.6 * c;
      windowRef.current.position.z = -0.6 * c;
    }
  });

  return (
    <group position={[0, -0.3, 0]} ref={windowRef}>
      {/* Front Face: Main Society Call */}
      <Text
        color="#3B001B"
        anchorX="left"
        anchorY="middle"
        fontSize={1.1}
        position={[0.12, 0, 0]}
        scale={[1, -1, 1]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        TREK. EXPLORE. CONNECT.
      </Text>

      {/* Back Face: Adventure Mantra */}
      <Text
        color="#3B001B"
        anchorX="right"
        anchorY="middle"
        scale={[-1, -1, 1]}
        fontSize={1.1}
        position={[0.12, 0, -1.4]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        ADVENTURE AWAITS
      </Text>

      {/* Left Face: Destination Highlights */}
      <group position={[-0.45, 0, -0.3]}>
        <Text
          color="#7C2D12"
          anchorX="left"
          anchorY="middle"
          scale={[1, -1, 1]}
          fontSize={0.7}
          rotation={[0, -Math.PI / 2, -Math.PI / 2]}
        >
          HIMALAYAS • WESTERN GHATS
        </Text>

        <Text
          color="#7C2D12"
          anchorX="left"
          anchorY="middle"
          scale={[1, -1, 1]}
          fontSize={0.7}
          position={[0, 0, -0.6]}
          rotation={[0, -Math.PI / 2, -Math.PI / 2]}
        >
          COASTAL TRAILS • SUMMITS
        </Text>
      </group>

      {/* Right Face: Community Culture */}
      <group position={[0.45, 0, -0.3]}>
        <Text
          color="#7C2D12"
          anchorX="right"
          anchorY="middle"
          scale={[-1, -1, 1]}
          fontSize={0.7}
          rotation={[0, -Math.PI / 2, -Math.PI / 2]}
        >
          CAMPFIRES • SUMMIT DAWN
        </Text>
        <Text
          color="#7C2D12"
          anchorX="right"
          anchorY="middle"
          scale={[-1, -1, 1]}
          fontSize={0.7}
          position={[0, 0, -0.6]}
          rotation={[0, -Math.PI / 2, -Math.PI / 2]}
        >
          BOUNDLESS BY NATURE
        </Text>
      </group>
    </group>
  );
};

export default TextExpeditionWindow;
