'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Box, Edges, Line, Text, TextProps, useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';
import gsap from 'gsap';
import { useBoundless3DStore } from '@/context/boundless3dStore';

interface TrailMilestone {
  point: THREE.Vector3;
  year: string;
  title: string;
  subtitle: string;
  position: 'left' | 'right';
}

const BOUNDLESS_TRAIL: TrailMilestone[] = [
  { point: new THREE.Vector3(0, 0, 0), year: '2023', title: 'Boundless Founded', subtitle: 'IITM BS Travel Society Born', position: 'right' },
  { point: new THREE.Vector3(-4, -3, -3), year: '2024', title: 'Kedarkantha Summit', subtitle: 'Winter Alpine Trek 12,500ft', position: 'left' },
  { point: new THREE.Vector3(-3, -1, -6), year: '2024', title: 'Gokarna Coastal Trail', subtitle: '5-Beach Cliff Trek', position: 'left' },
  { point: new THREE.Vector3(0, -1, -10), year: '2025', title: 'Jog Falls & Western Ghats', subtitle: 'Monsoon Wilderness', position: 'left' },
  { point: new THREE.Vector3(1, 1, -12), year: '2026', title: 'Next Frontier', subtitle: 'The Journey Continues...', position: 'right' },
];

export const PastJourneysTimeline: React.FC = () => {
  const { camera } = useThree();
  const data = useScroll();
  const isActive = useBoundless3DStore((state) => state.activePortalId === 'journeys');

  const curve = useMemo(() => new THREE.CatmullRomCurve3(BOUNDLESS_TRAIL.map((p) => p.point), false), []);
  const curvePoints = useMemo(() => curve.getPoints(300), [curve]);

  const [progress, setProgress] = useState(0);

  useFrame((_, delta) => {
    if (isActive && data) {
      const p = data.range(0.85, 0.15);
      setProgress(p);

      const pos = curve.getPoint(p);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, (isMobile ? -1 : -2) + pos.x, 4, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, -39 + pos.z, 4, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 13 - pos.y, 4, delta);
    }
  });

  const visibleCurvePoints = useMemo(
    () => curvePoints.slice(0, Math.max(1, Math.ceil(progress * curvePoints.length))),
    [curvePoints, progress]
  );

  return (
    <group position={[0, -0.1, -0.1]}>
      {/* 3D Trail Path */}
      <Line points={visibleCurvePoints} color="#FFE878" lineWidth={3.5} />

      {/* Trail Milestones */}
      {BOUNDLESS_TRAIL.map((m, i) => {
        const isRight = m.position === 'right';
        return (
          <group key={i} position={m.point} scale={isMobile ? 0.45 : 0.65}>
            <Box args={[0.25, 0.25, 0.25]}>
              <meshBasicMaterial color="#3B001B" />
              <Edges color="#FFE878" lineWidth={2} />
            </Box>
            <group position={[isRight ? 0.4 : -0.4, 0, 0]}>
              <Text
                fontSize={0.28}
                color="#3B001B"
                anchorX={isRight ? 'left' : 'right'}
                position={[0, 0.3, 0]}
              >
                {m.year}
              </Text>
              <Text
                fontSize={0.42}
                color="#7C2D12"
                anchorX={isRight ? 'left' : 'right'}
                position={[0, 0, 0]}
                maxWidth={3}
              >
                {m.title}
              </Text>
              <Text
                fontSize={0.22}
                color="#3B001B"
                anchorX={isRight ? 'left' : 'right'}
                position={[0, -0.3, 0]}
              >
                {m.subtitle}
              </Text>
            </group>
          </group>
        );
      })}
    </group>
  );
};

export default PastJourneysTimeline;
