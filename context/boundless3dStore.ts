'use client';

import { create } from 'zustand';

export type ExpeditionTheme = 'night';

export interface Boundless3DState {
  // Global virtual scroll progress [0, 1]
  scrollProgress: number;
  setScrollProgress: (progress: number) => void;

  // Active 3D sub-world portal ('trips' | 'journeys' | null)
  activePortalId: string | null;
  setActivePortal: (id: string | null) => void;

  // Visual expedition atmosphere (permanently Night / Cosmic)
  theme: ExpeditionTheme;
  setTheme: (theme: ExpeditionTheme) => void;

  // Scene loading states
  isLoaded: boolean;
  setIsLoaded: (loaded: boolean) => void;
  loadProgress: number;
  setLoadProgress: (progress: number) => void;

  // Hardware capability flag
  isWebGlSupported: boolean;
  setWebGlSupported: (supported: boolean) => void;
}

export const useBoundless3DStore = create<Boundless3DState>((set) => ({
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),

  activePortalId: null,
  setActivePortal: (id) => set({ activePortalId: id }),

  theme: 'night',
  setTheme: () => set({ theme: 'night' }),

  isLoaded: false,
  setIsLoaded: (loaded) => set({ isLoaded: loaded }),
  loadProgress: 0,
  setLoadProgress: (loadProgress) => set({ loadProgress }),

  isWebGlSupported: true,
  setWebGlSupported: (supported) => set({ isWebGlSupported: supported }),
}));
