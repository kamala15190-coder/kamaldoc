import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { MktProblem } from './scenes/MktProblem';
import { MktSolution } from './scenes/MktSolution';
import { MktFeatures } from './scenes/MktFeatures';
import { MktAudience } from './scenes/MktAudience';
import { MktSocial } from './scenes/MktSocial';
import { MktCTA } from './scenes/MktCTA';

// @30fps, 30s total = 900 frames
// Scene 1 Problem:  0-150   (5s)
// Scene 2 Solution: 150-270 (4s)
// Scene 3 Features: 270-450 (6s)
// Scene 4 Audience: 450-600 (5s)
// Scene 5 Social:   600-750 (5s)
// Scene 6 CTA:      750-900 (5s)

export const MARKETING_DURATION = 900;
export const MARKETING_FPS = 30;

export const MarketingVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#05070F' }}>
      <Sequence from={0} durationInFrames={150}>
        <MktProblem />
      </Sequence>
      <Sequence from={150} durationInFrames={120}>
        <MktSolution />
      </Sequence>
      <Sequence from={270} durationInFrames={180}>
        <MktFeatures />
      </Sequence>
      <Sequence from={450} durationInFrames={150}>
        <MktAudience />
      </Sequence>
      <Sequence from={600} durationInFrames={150}>
        <MktSocial />
      </Sequence>
      <Sequence from={750} durationInFrames={150}>
        <MktCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
