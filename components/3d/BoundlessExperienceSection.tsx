'use client';

import React from 'react';
import BoundlessCanvasLoader from './BoundlessCanvasLoader';
import ScrollWrapper from './ScrollWrapper';
import Hero3D from './Hero3D';
import ScrollHint from './ScrollHint';
import ThemeSwitcher3D from './ThemeSwitcher3D';

export const BoundlessExperienceSection: React.FC = () => {
  return (
    <div id="boundless-3d-experience" className="relative w-full h-[400vh] bg-transparent">
      {/* Sticky full-screen viewport pinning the 3D scene */}
      <div className="sticky top-0 w-full h-[100dvh] overflow-hidden">
        <BoundlessCanvasLoader>
          <ScrollWrapper>
            <Hero3D />
          </ScrollWrapper>
        </BoundlessCanvasLoader>

        {/* HUD Overlays (HTML Layer) */}
        <ScrollHint />
        <ThemeSwitcher3D />
      </div>
    </div>
  );
};

export default BoundlessExperienceSection;
