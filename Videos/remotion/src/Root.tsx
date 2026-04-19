import React from 'react';
import { Composition } from 'remotion';
import { UseCaseReel, REEL_DURATION, REEL_FPS } from './UseCaseReel';
import { MarketingVideo, MARKETING_DURATION, MARKETING_FPS } from './MarketingVideo';
import { ReelV2, REEL_V2_DURATION, REEL_V2_FPS } from './v2/ReelV2';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="UseCaseReel"
        component={UseCaseReel}
        durationInFrames={REEL_DURATION}
        fps={REEL_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="MarketingVideo"
        component={MarketingVideo}
        durationInFrames={MARKETING_DURATION}
        fps={MARKETING_FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ReelV2"
        component={ReelV2}
        durationInFrames={REEL_V2_DURATION}
        fps={REEL_V2_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
