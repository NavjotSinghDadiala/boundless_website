'use client';

import { create } from 'zustand';

export type ExpeditionTheme = 'golden_hour' | 'day' | 'night';

export interface Boundless3DState {
  // Global virtual scroll progress [0, 1]
  scrollProgress: number;
  setScrollProgress: (progress: number) => void;

  // Active 3D sub-world portal ('trips' | 'journeys' | null)
  activePortalId: string | null;
  setActivePortal: (id: string | null) => void;

  // Visual expedition atmosphere
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

  theme: 'golden_hour',
  setTheme: (theme) => set({ theme }),

  isLoaded: false,
  setIsLoaded: (loaded) => set({ isLoaded: loaded }),
  loadProgress: 0,
  setLoadProgress: (loadProgress) => set({ loadProgress }),

  isWebGlSupported: true,
  setWebGlSupported: (supported) => set({ isWebGlSupported: supported }),
}));
