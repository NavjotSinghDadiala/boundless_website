'use client';

import React, { Suspense, useRef, useEffect, useInsertionEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Preload, ScrollControls } from '@react-three/drei';
import { isMobile } from 'react-device-detect';
import { useBoundless3DStore } from '@/context/boundless3dStore';

const useIsomorphicInsertionEffect = typeof window !== 'undefined' ? useInsertionEffect : useEffect;

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
  const glElementRef = useRef<HTMLCanvasElement | null>(null);
  const contextLostHandlerRef = useRef<((e: Event) => void) | null>(null);
  const contextRestoredHandlerRef = useRef<(() => void) | null>(null);
  const isUnmountingRef = useRef(false);

  const [webGlFailed, setWebGlFailed] = useState(false);

  const setWebGlSupported = useBoundless3DStore((s) => s.setWebGlSupported);
  const setActivePortal = useBoundless3DStore((s) => s.setActivePortal);

  // Insertion-phase cleanup runs BEFORE child <CanvasImpl>'s useInsertionEffect
  // calls root.current.unmount() -> gl.forceContextLoss().
  useIsomorphicInsertionEffect(() => {
    isUnmountingRef.current = false;
    return () => {
      isUnmountingRef.current = true;
      const dom = glElementRef.current;
      if (dom) {
        if (contextLostHandlerRef.current) {
          dom.removeEventListener('webglcontextlost', contextLostHandlerRef.current);
        }
        if (contextRestoredHandlerRef.current) {
          dom.removeEventListener('webglcontextrestored', contextRestoredHandlerRef.current);
        }
      }
      glElementRef.current = null;
      contextLostHandlerRef.current = null;
      contextRestoredHandlerRef.current = null;
    };
  }, []);

  useEffect(() => {
    setActivePortal(null);

    // Check WebGL API availability without allocating/losing a throwaway GPU context
    const hasWebGLApi =
      typeof window !== 'undefined' &&
      Boolean(window.WebGL2RenderingContext || window.WebGLRenderingContext);

    if (!hasWebGLApi) {
      setWebGlSupported(false);
      setWebGlFailed(true);
    } else {
      setWebGlSupported(true);
      setWebGlFailed(false);
    }
  }, [setWebGlSupported, setActivePortal]);

  // Graceful fallback only if WebGL actually failed during this active mount
  if (webGlFailed) {
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
        frameloop="always"
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
          const dom = gl.domElement;

          // Detach any prior listeners if onCreated runs more than once
          if (glElementRef.current) {
            if (contextLostHandlerRef.current) {
              glElementRef.current.removeEventListener('webglcontextlost', contextLostHandlerRef.current);
            }
            if (contextRestoredHandlerRef.current) {
              glElementRef.current.removeEventListener('webglcontextrestored', contextRestoredHandlerRef.current);
            }
          }

          glElementRef.current = dom;

          const handleContextLost = (e: Event) => {
            // Ignore intentional context loss during route unmount or on detached canvases
            if (isUnmountingRef.current || !dom.isConnected) return;
            e.preventDefault();
            console.warn('WebGL Context Lost. Switching to semantic fallback.');
            setWebGlFailed(true);
          };

          const handleContextRestored = () => {
            if (isUnmountingRef.current || !dom.isConnected) return;
            setWebGlFailed(false);
          };

          contextLostHandlerRef.current = handleContextLost;
          contextRestoredHandlerRef.current = handleContextRestored;
          dom.addEventListener('webglcontextlost', handleContextLost, false);
          dom.addEventListener('webglcontextrestored', handleContextRestored, false);
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
