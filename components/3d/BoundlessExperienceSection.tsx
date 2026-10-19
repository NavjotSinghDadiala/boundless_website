'use client';

import React from 'react';
import BoundlessCanvasLoader from './BoundlessCanvasLoader';
import ScrollWrapper from './ScrollWrapper';
import Hero3D from './Hero3D';

export const BoundlessExperienceSection: React.FC = () => {
  return (
    <div id="boundless-3d-stage" className="relative w-full h-[100dvh]">
      <BoundlessCanvasLoader>
        <ScrollWrapper>
          <Hero3D />
        </ScrollWrapper>
      </BoundlessCanvasLoader>
    </div>
  );
};

export default BoundlessExperienceSection;
