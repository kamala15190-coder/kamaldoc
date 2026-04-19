import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { S1Hook } from './scenes/S1Hook';
import { S2Scan } from './scenes/S2Scan';
import { S3Befund } from './scenes/S3Befund';
import { S4Fristen } from './scenes/S4Fristen';
import { S5KIBrief } from './scenes/S5KIBrief';
import { S6MCP } from './scenes/S6MCP';
import { S7CTA } from './scenes/S7CTA';

// @30fps — 1320 frames = 44s
// S1 Hook:     0–105   (3.5s)
// S2 Scan:     105–315  (7.0s)
// S3 Befund:   315–588  (9.1s)
// S4 Fristen:  588–819  (7.7s)
// S5 KI-Brief: 819–990  (5.7s)
// S6 MCP:      990–1170 (6.0s)
// S7 CTA:      1170–1320 (5.0s)

export const REEL_V2_DURATION = 1320;
export const REEL_V2_FPS = 30;

export const ReelV2: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#0A0A0F' }}>
      <Sequence from={0} durationInFrames={105}>
        <S1Hook />
      </Sequence>
      <Sequence from={105} durationInFrames={210}>
        <S2Scan />
      </Sequence>
      <Sequence from={315} durationInFrames={273}>
        <S3Befund />
      </Sequence>
      <Sequence from={588} durationInFrames={231}>
        <S4Fristen />
      </Sequence>
      <Sequence from={819} durationInFrames={171}>
        <S5KIBrief />
      </Sequence>
      <Sequence from={990} durationInFrames={180}>
        <S6MCP />
      </Sequence>
      <Sequence from={1170} durationInFrames={150}>
        <S7CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
