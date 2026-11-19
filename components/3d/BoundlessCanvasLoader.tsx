'use client';

import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Preload, ScrollControls } from '@react-three/drei';
import { isMobile } from 'react-device-detect';
import { useBoundless3DStore } from '@/context/boundless3dStore';

interface BoundlessCanvasLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const BoundlessCanvasLoader: React.FC<BoundlessCanvasLoaderProps> = ({
  children,
  fallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const [webGlFailed, setWebGlFailed] = useState(false);

  const isWebGlSupported = useBoundless3DStore((s) => s.isWebGlSupported);
  const setWebGlSupported = useBoundless3DStore((s) => s.setWebGlSupported);
  const theme = useBoundless3DStore((s) => s.theme);

  useEffect(() => {
    setMounted(true);
    // Probe WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (!gl) {
        setWebGlSupported(false);
        setWebGlFailed(true);
      }
    } catch {
      setWebGlSupported(false);
      setWebGlFailed(true);
    }
  }, [setWebGlSupported]);

  // Graceful fallback if WebGL is unavailable
  if (webGlFailed || !isWebGlSupported) {
    return <>{fallback || null}</>;
  }

  // Atmospheric background tone based on theme
  const getBackgroundColor = () => {
    switch (theme) {
      case 'golden_hour':
        return '#fffbea'; // Warm Cream Boundless primary
      case 'night':
        return '#1b000c'; // Deep Maroon Night sky
      case 'day':
      default:
        return '#fdf8ec';
    }
  };

  const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    ...(mounted && !isMobile && {
      inset: '0.75rem',
      width: 'calc(100% - 1.5rem)',
      height: 'calc(100% - 1.5rem)',
      borderRadius: '1.25rem',
    }),
  };

  // Subtle ambient noise texture overlay matching the reference technique
  const noiseOverlayStyle: React.CSSProperties = {
    backgroundBlendMode: 'soft-light',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    backgroundSize: '120px',
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100dvh] overflow-hidden select-none transition-colors duration-1000"
      style={{ backgroundColor: getBackgroundColor() }}
    >
      <Canvas
        className="boundless-3d-canvas"
        ref={canvasRef}
        shadows={!isMobile}
        dpr={isMobile ? [1, 1.2] : [1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
        }}
        style={{
          ...canvasStyle,
          ...noiseOverlayStyle,
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL Context Lost. Switching to semantic fallback.');
            setWebGlSupported(false);
            setWebGlFailed(true);
          });
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={theme === 'night' ? 0.3 : 0.7} />
          <directionalLight
            position={[5, 10, 7]}
            intensity={theme === 'night' ? 0.4 : 1.2}
            color={theme === 'golden_hour' ? '#ffe0a3' : '#ffffff'}
            castShadow={!isMobile}
          />
          <ScrollControls
            pages={4}
            damping={0.15}
            maxSpeed={1}
            distance={1}
            style={{ zIndex: 1, overflow: 'hidden', pointerEvents: 'auto' }}
          >
            {children}
          </ScrollControls>
          <Preload all />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
};

export default BoundlessCanvasLoader;
