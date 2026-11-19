'use client';

import React, { useRef, useEffect } from 'react';
import { Edges, MeshPortalMaterial, Text, TextProps, useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { isMobile } from 'react-device-detect';
import * as THREE from 'three';
import gsap from 'gsap';
import { useBoundless3DStore } from '@/context/boundless3dStore';
import { TriangleGeometry } from './Triangle';

interface PortalTileProps {
  id: string;
  title: string;
  textAlign?: TextProps['textAlign'];
  children?: React.ReactNode;
  color: string;
  position: THREE.Vector3;
}

export const PortalTile: React.FC<PortalTileProps> = ({
  id,
  title,
  textAlign = 'center',
  children,
  color,
  position,
}) => {
  const titleRef = useRef<THREE.Group>(null);
  const gridRef = useRef<THREE.Mesh>(null);
  const hoverBoxRef = useRef<THREE.Mesh>(null);
  const portalRef = useRef<any>(null);
  const { camera } = useThree();

  const setActivePortal = useBoundless3DStore((state) => state.setActivePortal);
  const activePortalId = useBoundless3DStore((state) => state.activePortalId);
  const isActive = activePortalId === id;
  const data = useScroll();

  useEffect(() => {
    if (isMobile && titleRef.current) {
      const isTrips = id === 'trips';
      gsap.to(titleRef.current.position, {
        x: isTrips ? 1 : -1,
        y: isTrips ? -1.7 : 1.5,
        duration: 0.5,
      });
    }
    return () => {
      document.body.style.overflow = '';
      document.querySelectorAll('.boundless-close-btn').forEach((el) => el.remove());
    };
  }, [id]);

  useFrame(() => {
    if (data && isMobile && titleRef.current) {
      const d = data.range(0.95, 0.05);
      (titleRef.current as any).fillOpacity = d;
    }
  });

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      exitPortal(true);
    }
  };

  const portalInto = (e: any) => {
    if (isActive || activePortalId) return;
    e.stopPropagation();
    setActivePortal(id);
    document.body.style.cursor = 'auto';
    document.body.style.overflow = 'hidden';

    // Mount floating .close button HUD
    const existingClose = document.querySelector('.boundless-close-btn');
    if (!existingClose) {
      const div = document.createElement('div');
      div.className = 'fixed top-8 left-8 z-50 boundless-close-btn cursor-pointer';
      div.innerHTML = `
        <button aria-label="Close portal" class="flex items-center gap-2 px-4 py-2 rounded-full bg-[#3B001B] text-[#FFF9C7] border border-[#FFE878]/40 shadow-xl hover:scale-105 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider">
          <span>✕ Close</span>
        </button>
      `;
      div.onclick = () => exitPortal(true);
      document.body.appendChild(div);

      gsap.fromTo(
        div,
        { scale: 0, rotate: '-90deg', opacity: 0 },
        { scale: 1, rotate: '0deg', opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
      );
    }

    document.body.addEventListener('keydown', handleEscape);
    if (portalRef.current) {
      gsap.to(portalRef.current, {
        blend: 1,
        duration: 0.6,
        ease: 'power2.out',
      });
    }
  };

  const exitPortal = (force = false) => {
    if (!force && !activePortalId) return;
    setActivePortal(null);
    document.body.style.overflow = '';

    // Smoothly restore camera position and rotation
    gsap.to(camera.position, {
      x: 0,
      duration: 1,
      ease: 'power2.inOut',
    });

    gsap.to(camera.rotation, {
      x: -Math.PI / 2,
      y: 0,
      duration: 1,
      ease: 'power2.inOut',
    });

    if (portalRef.current) {
      gsap.to(portalRef.current, {
        blend: 0,
        duration: 0.8,
        ease: 'power2.inOut',
      });
    }

    // Clean up close button
    const closeBtn = document.querySelector('.boundless-close-btn');
    if (closeBtn) {
      gsap.to(closeBtn, {
        scale: 0,
        opacity: 0,
        duration: 0.4,
        onComplete: () => {
          document.querySelectorAll('.boundless-close-btn').forEach((el) => el.remove());
        },
      });
    }

    document.body.removeEventListener('keydown', handleEscape);
  };

  const fontProps: Partial<TextProps> = {
    maxWidth: 2.5,
    anchorX: 'center',
    anchorY: 'bottom',
    fontSize: isMobile ? 0.35 : 0.55,
    color: '#3B001B',
    textAlign: textAlign,
    fillOpacity: 0.85,
  };

  const onPointerOver = () => {
    if (isActive || isMobile) return;
    document.body.style.cursor = 'pointer';
    if (titleRef.current) {
      gsap.to(titleRef.current, { fillOpacity: 1, duration: 0.3 });
    }
    if (gridRef.current && hoverBoxRef.current) {
      gsap.to(gridRef.current.position, { z: 0.4, duration: 0.3 });
      gsap.to(hoverBoxRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
    }
  };

  const onPointerOut = () => {
    if (isMobile) return;
    document.body.style.cursor = 'auto';
    if (titleRef.current) {
      gsap.to(titleRef.current, { fillOpacity: 0.85, duration: 0.3 });
    }
    if (gridRef.current && hoverBoxRef.current) {
      gsap.to(gridRef.current.position, { z: 0, duration: 0.3 });
      gsap.to(hoverBoxRef.current.scale, { x: 0, y: 0, z: 0, duration: 0.3 });
    }
  };

  const getGeometry = () => {
    if (!isMobile) {
      return <planeGeometry args={[4, 4, 1]} />;
    }
    const isTrips = id === 'trips';
    const points = isTrips
      ? [[-1, 2, 0], [-1, -2, 0], [3, -2, 0]]
      : [[-3, 2, 0], [1, -2, 0], [1, 2, 0]];
    return <primitive object={TriangleGeometry({ points })} attach="geometry" />;
  };

  return (
    <mesh
      ref={gridRef}
      position={position}
      onClick={portalInto}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {getGeometry()}
      <group>
        <mesh position={[0, 0, -0.01]} ref={hoverBoxRef} scale={[0, 0, 0]}>
          <boxGeometry args={[4, 4, 0.4]} />
          <meshPhysicalMaterial color="#FFE878" transparent opacity={0.25} />
          <Edges color="#3B001B" lineWidth={2} />
        </mesh>
        <Text position={[0, -1.8, 0.4]} {...fontProps} ref={titleRef}>
          {title}
        </Text>
      </group>

      <MeshPortalMaterial ref={portalRef} blend={0} resolution={0} blur={0}>
        <color attach="background" args={[color]} />
        {children}
      </MeshPortalMaterial>
    </mesh>
  );
};

export default PortalTile;
