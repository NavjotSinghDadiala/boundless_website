'use client';

import React from 'react';
import BoundlessCanvasLoader from './BoundlessCanvasLoader';
import ScrollWrapper from './ScrollWrapper';
import Hero3D from './Hero3D';
import ExpeditionsGrid from './ExpeditionsGrid';
import ScrollHint from './ScrollHint';
import AccessibleShadowTree from './AccessibleShadowTree';

export const BoundlessExperienceSection: React.FC = () => {
  return (
    <div id="boundless-3d-experience" className="relative w-full h-[320vh] bg-[#040207] -mt-20">
      {/* Synchronized Accessible Semantic Shadow Tree for Crawlers & Screen Readers */}
      <AccessibleShadowTree />

      {/* Sticky full-screen viewport pinning the 3D spatial continuum */}
      <div className="sticky top-0 w-full h-[100dvh] overflow-hidden bg-[#040207]">
        <BoundlessCanvasLoader>
          <ScrollWrapper>
            <Hero3D />
            <ExpeditionsGrid />
          </ScrollWrapper>
        </BoundlessCanvasLoader>

        {/* Floating Screen-Space HUD Controls */}
        <ScrollHint />
      </div>
    </div>
  );
};

export default BoundlessExperienceSection;
