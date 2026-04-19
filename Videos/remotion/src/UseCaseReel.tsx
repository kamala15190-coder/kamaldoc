import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Scene1Hook } from './scenes/Scene1Hook';
import { Scene2Scan } from './scenes/Scene2Scan';
import { Scene3Categorize } from './scenes/Scene3Categorize';
import { Scene4Deadlines } from './scenes/Scene4Deadlines';
import { Scene5Reply } from './scenes/Scene5Reply';
import { Scene6Languages } from './scenes/Scene6Languages';
import { Scene7CTA } from './scenes/Scene7CTA';

// @30fps
// Scene 1: 0-180   (6s)
// Scene 2: 180-360 (6s)
// Scene 3: 360-570 (7s)
// Scene 4: 570-780 (7s)
// Scene 5: 780-990 (7s)
// Scene 6: 990-1170 (6s)
// Scene 7: 1170-1380 (7s)
// Total: 1380 frames = 46s

export const REEL_DURATION = 1380;
export const REEL_FPS = 30;

export const UseCaseReel: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#05070F' }}>
      <Sequence from={0} durationInFrames={180}>
        <Scene1Hook />
      </Sequence>
      <Sequence from={180} durationInFrames={180}>
        <Scene2Scan />
      </Sequence>
      <Sequence from={360} durationInFrames={210}>
        <Scene3Categorize />
      </Sequence>
      <Sequence from={570} durationInFrames={210}>
        <Scene4Deadlines />
      </Sequence>
      <Sequence from={780} durationInFrames={210}>
        <Scene5Reply />
      </Sequence>
      <Sequence from={990} durationInFrames={180}>
        <Scene6Languages />
      </Sequence>
      <Sequence from={1170} durationInFrames={210}>
        <Scene7CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
