import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { S1Hook } from './scenes/S1Hook';
import { S2Scan } from './scenes/S2Scan';
import { S3Befund } from './scenes/S3Befund';
import { S4Fristen } from './scenes/S4Fristen';
import { S5KIBrief } from './scenes/S5KIBrief';
import { S6MCP } from './scenes/S6MCP';
import { S7CTA } from './scenes/S7CTA';

// @30fps — 1500 frames = 50s
// S1 Hook:    0-120  (4s)
// S2 Scan:    120-270 (5s)
// S3 Befund:  270-450 (6s)
// S4 Fristen: 450-600 (5s)
// S5 KI-Brief:600-780 (6s)
// S6 MCP:     780-1080 (10s)
// S7 CTA:     1080-1500 (14s)

export const REEL_V2_DURATION = 1500;
export const REEL_V2_FPS = 30;

export const ReelV2: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#0A0A0F' }}>
      <Sequence from={0} durationInFrames={120}>
        <S1Hook />
      </Sequence>
      <Sequence from={120} durationInFrames={150}>
        <S2Scan />
      </Sequence>
      <Sequence from={270} durationInFrames={180}>
        <S3Befund />
      </Sequence>
      <Sequence from={450} durationInFrames={150}>
        <S4Fristen />
      </Sequence>
      <Sequence from={600} durationInFrames={180}>
        <S5KIBrief />
      </Sequence>
      <Sequence from={780} durationInFrames={300}>
        <S6MCP />
      </Sequence>
      <Sequence from={1080} durationInFrames={420}>
        <S7CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
