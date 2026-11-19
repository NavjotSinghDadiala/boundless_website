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

  const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#040207',
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100dvh] overflow-hidden select-none bg-[#040207]"
    >
      <Canvas
        className="boundless-3d-canvas"
        ref={canvasRef}
        shadows={!isMobile}
        dpr={isMobile ? [1, 1.2] : [1, 1.75]}
        gl={{
          antialias: !isMobile,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        style={canvasStyle}
        onCreated={({ gl }) => {
          gl.setClearColor('#040207', 1);
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL Context Lost. Switching to semantic fallback.');
            setWebGlSupported(false);
            setWebGlFailed(true);
          });
        }}
      >
        <color attach="background" args={['#040207']} />
        <fog attach="fog" args={['#040207', 24, 68]} />
        <Suspense fallback={null}>
          {/* Subtle cosmic ambient + cool violet/indigo rim + warm maroon/gold fill */}
          <ambientLight intensity={0.48} color="#d8ccf0" />
          <directionalLight
            position={[6, 12, 8]}
            intensity={0.95}
            color="#e2d9ff"
            castShadow={!isMobile}
          />
          <directionalLight
            position={[-7, -4, -6]}
            intensity={0.45}
            color="#9d174d"
          />
          <ScrollControls
            pages={3.2}
            damping={0.11}
            maxSpeed={1.25}
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
