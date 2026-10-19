'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Edges, Line, Text, TextProps } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';
import { useBoundless3DStore } from '@/context/boundless3dStore';

export interface Trip3DData {
  id: string;
  title: string;
  date: string;
  destination: string;
  fee?: string;
  seatsLeft?: number;
  url: string;
  featured?: boolean;
}

interface TripTile3DProps {
  trip: Trip3DData;
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
  activeId: number | null;
  onClick: () => void;
  datePosition: 'top' | 'bottom';
}

export const TripTile3D: React.FC<TripTile3DProps> = ({
  trip,
  index,
  position,
  rotation,
  activeId,
  onClick,
  datePosition,
}) => {
  const tripRef = useRef<THREE.Group>(null);
  const hoverAnimRef = useRef<gsap.core.Timeline | null>(null);
  const [desktopHovered, setDesktopHovered] = useState(false);
  const isTripsActive = useBoundless3DStore((state) => state.activePortalId === 'trips');
  const hovered = isMobile ? activeId === index : desktopHovered;
  const isTop = datePosition === 'top';

  const titleProps: Partial<TextProps> = useMemo(
    () => ({
      color: '#3B001B',
      anchorX: 'left',
      anchorY: 'bottom',
    }),
    []
  );

  const subtitleProps: Partial<TextProps> = useMemo(
    () => ({
      color: '#7C2D12',
      anchorX: 'left',
      anchorY: 'top',
    }),
    []
  );

  useEffect(() => {
    if (!tripRef.current) return;
    hoverAnimRef.current?.kill();

    const [mesh, titleMesh, dateGroup, textBox, actionBtn] = tripRef.current.children;

    hoverAnimRef.current = gsap.timeline();
    hoverAnimRef.current
      .to(tripRef.current.position, { z: hovered ? 1 : 0, duration: 0.25 }, 0)
      .to(tripRef.current.position, { y: hovered ? (isTop ? -1.8 : 0) : 0 }, 0)
      .to(tripRef.current.scale, { x: hovered ? 1.25 : 1, y: hovered ? 1.25 : 1, z: hovered ? 1.25 : 1 }, 0)
      .to(titleMesh.position, { y: hovered ? 0.7 : -0.8 }, 0)
      .to(textBox.position, { y: hovered ? 0.7 : 0 }, 0)
      .to(textBox, { fillOpacity: hovered ? 1 : 0, duration: 0.3 }, 0)
      .to(dateGroup.position, { y: hovered ? 2.4 : isTop ? 1.4 : -1.4 }, 0)
      .to(mesh.scale, { y: hovered ? 1.8 : 1 }, 0)
      .to((mesh as THREE.Mesh).material, { opacity: hovered ? 0.95 : 0.4 }, 0);

    if (actionBtn) {
      hoverAnimRef.current
        .to(actionBtn.scale, { x: hovered ? 1 : 0, y: hovered ? 1 : 0 }, 0)
        .to(actionBtn.position, { z: hovered ? 0.3 : -1 }, 0);
    }
  }, [hovered, isTop]);

  useEffect(() => {
    if (tripRef.current) {
      gsap.to(tripRef.current.position, {
        y: isTripsActive ? 0 : -11,
        duration: 0.9,
        delay: isTripsActive ? index * 0.08 : 0,
      });
    }
  }, [isTripsActive, index]);

  const handleActionClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!trip.url) return;
    const btn = e.eventObject;
    gsap.to(btn.position, { z: 0, duration: 0.1 }).then(() => {
      gsap.to(btn.position, { z: 0.3, duration: 0.2 });
    });
    setTimeout(() => {
      window.location.href = trip.url;
    }, 60);
  };

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!isMobile && isTripsActive) setDesktopHovered(true);
      }}
      onPointerOut={() => {
        if (!isMobile && isTripsActive) setDesktopHovered(false);
      }}
    >
      <group ref={tripRef}>
        {/* Card Background Plane */}
        <mesh>
          <planeGeometry args={[4.2, 2, 1]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} />
          {trip.featured ? (
            <Edges color="#3B001B" lineWidth={2.5} />
          ) : (
            <Line
              points={[
                [-2.1, -1, 0.11],
                [2.1, -1, 0.11],
                [2.1, 1, 0.11],
                [-2.1, 1, 0.11],
                [-2.1, -1, 0.11],
              ]}
              color="#D97706"
              lineWidth={1.5}
              dashed
              dashSize={0.12}
              gapSize={0.08}
            />
          )}
        </mesh>

        {/* Expedition Title */}
        <Text
          {...titleProps}
          position={[-1.9, -0.8, 0.101]}
          maxWidth={3.8}
          fontSize={0.65}
        >
          {trip.title}
        </Text>

        {/* Date & Destination Tag */}
        <group position={[-1.25, 1.4, 0.01]}>
          <mesh>
            <planeGeometry args={[1.7, 0.4, 1]} />
            <meshBasicMaterial color="#3B001B" opacity={0} wireframe />
            <Edges color="#3B001B" lineWidth={1} />
          </mesh>
          <Text {...subtitleProps} position={[-0.7, 0.2, 0]} fontSize={0.25}>
            {trip.date.toUpperCase()}
          </Text>
        </group>

        {/* Description / Highlights */}
        <Text
          {...subtitleProps}
          maxWidth={3.8}
          position={[-1.9, 2.2, 0.1]}
          fontSize={0.2}
          fillOpacity={0}
        >
          {trip.destination} • {trip.fee ? `₹${trip.fee}` : 'Registration Open'}
        </Text>

        {/* View Details Action Button */}
        <group
          position={[1.3, -0.6, -1]}
          scale={[0, 0, 1]}
          onClick={handleActionClick}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <mesh>
            <boxGeometry args={[1.3, 0.4, 0.2]} />
            <meshBasicMaterial color="#3B001B" />
            <Edges color="#FFE878" lineWidth={1.5} />
          </mesh>
          <Text {...subtitleProps} color="#FFF9C7" position={[-0.5, 0.15, 0.2]} fontSize={0.22}>
            EXPEDITION ↗
          </Text>
        </group>
      </group>
    </group>
  );
};

export default TripTile3D;
