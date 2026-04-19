import React from 'react';
import { Composition } from 'remotion';
import { UseCaseReel, REEL_DURATION, REEL_FPS } from './UseCaseReel';
import { MarketingVideo, MARKETING_DURATION, MARKETING_FPS } from './MarketingVideo';
import { ReelV2, REEL_V2_DURATION, REEL_V2_FPS } from './v2/ReelV2';
import {
  PlaystoreImage1, PlaystoreImage2, PlaystoreImage3, PlaystoreImage4,
  PlaystoreImage5, PlaystoreImage6, PlaystoreImage7, PlaystoreImage8,
} from './playstore/PlaystoreImages';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="UseCaseReel" component={UseCaseReel} durationInFrames={REEL_DURATION} fps={REEL_FPS} width={1080} height={1920} />
      <Composition id="MarketingVideo" component={MarketingVideo} durationInFrames={MARKETING_DURATION} fps={MARKETING_FPS} width={1920} height={1080} />
      <Composition id="ReelV2" component={ReelV2} durationInFrames={REEL_V2_DURATION} fps={REEL_V2_FPS} width={1080} height={1920} />
      <Composition id="PlaystoreImage1" component={PlaystoreImage1} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PlaystoreImage2" component={PlaystoreImage2} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PlaystoreImage3" component={PlaystoreImage3} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PlaystoreImage4" component={PlaystoreImage4} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PlaystoreImage5" component={PlaystoreImage5} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PlaystoreImage6" component={PlaystoreImage6} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PlaystoreImage7" component={PlaystoreImage7} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PlaystoreImage8" component={PlaystoreImage8} durationInFrames={1} fps={30} width={1080} height={1920} />
    </>
  );
};
