'use client';

import React from 'react';
import BoundlessCanvasLoader from './BoundlessCanvasLoader';
import ScrollWrapper from './ScrollWrapper';
import Hero3D from './Hero3D';
import ExpeditionsGrid from './ExpeditionsGrid';
import Footer3D from './Footer3D';
import ScrollHint from './ScrollHint';
import ThemeSwitcher3D from './ThemeSwitcher3D';
import AccessibleShadowTree from './AccessibleShadowTree';

export const BoundlessExperienceSection: React.FC = () => {
  return (
    <div id="boundless-3d-experience" className="relative w-full h-[400vh] bg-[#fffbea]">
      {/* Synchronized Accessible Semantic Shadow Tree for Crawlers & Screen Readers */}
      <AccessibleShadowTree />

      {/* Sticky full-screen viewport pinning the 3D spatial continuum */}
      <div className="sticky top-0 w-full h-[100dvh] overflow-hidden">
        <BoundlessCanvasLoader>
          <ScrollWrapper>
            <Hero3D />
            <ExpeditionsGrid />
            <Footer3D />
          </ScrollWrapper>
        </BoundlessCanvasLoader>

        {/* Floating Screen-Space HUD Controls */}
        <ScrollHint />
        <ThemeSwitcher3D />
      </div>
    </div>
  );
};

export default BoundlessExperienceSection;
