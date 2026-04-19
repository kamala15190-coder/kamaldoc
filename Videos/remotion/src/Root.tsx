import React from 'react';
import { Composition } from 'remotion';
import { UseCaseReel, REEL_DURATION, REEL_FPS } from './UseCaseReel';
import { MarketingVideo, MARKETING_DURATION, MARKETING_FPS } from './MarketingVideo';

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
    </>
  );
};
