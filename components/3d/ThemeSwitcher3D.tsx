'use client';

import React from 'react';
import { useBoundless3DStore, ExpeditionTheme } from '@/context/boundless3dStore';
import { Sun, Sunset, Moon } from 'lucide-react';

export const ThemeSwitcher3D: React.FC = () => {
  const theme = useBoundless3DStore((state) => state.theme);
  const setTheme = useBoundless3DStore((state) => state.setTheme);
  const activePortalId = useBoundless3DStore((state) => state.activePortalId);

  if (activePortalId) return null;

  const cycleTheme = () => {
    const sequence: ExpeditionTheme[] = ['golden_hour', 'day', 'night'];
    const nextIdx = (sequence.indexOf(theme) + 1) % sequence.length;
    setTheme(sequence[nextIdx]);
  };

  const getLabel = () => {
    switch (theme) {
      case 'golden_hour':
        return 'Golden Hour';
      case 'night':
        return 'Night Expedition';
      case 'day':
      default:
        return 'Daylight';
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'golden_hour':
        return <Sunset className="w-4 h-4 text-[#F59E0B]" />;
      case 'night':
        return <Moon className="w-4 h-4 text-[#C4B5FD]" />;
      case 'day':
      default:
        return <Sun className="w-4 h-4 text-[#FBBF24]" />;
    }
  };

  return (
    <div className="fixed top-24 right-6 z-20">
      <button
        onClick={cycleTheme}
        aria-label={`Current atmosphere: ${getLabel()}. Click to switch.`}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#3B001B]/80 text-[#FFF9C7] hover:bg-[#3B001B] backdrop-blur-md border border-[#FFE878]/30 shadow-md transition-all hover:scale-105 active:scale-95 text-xs font-medium cursor-pointer"
      >
        {getIcon()}
        <span className="hidden sm:inline">{getLabel()}</span>
      </button>
    </div>
  );
};

export default ThemeSwitcher3D;
