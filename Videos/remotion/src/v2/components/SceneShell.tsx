import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { V2 } from '../brandV2';
import { AmbientBg } from './Ambient';

/**
 * SceneShell wraps every v2 scene with:
 *  - ambient background (unless disabled)
 *  - a 9-frame translateY+fade intro (the "300ms slide, ease-out" spec)
 *  - a 6-frame fade-out tail for smooth scene hand-off
 *
 * Individual scene content should be placed as children.
 */
export const SceneShell: React.FC<{
  children: React.ReactNode;
  ambient?: boolean;
  glowY?: number;
}>= ({ children, ambient = true, glowY = 42 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Intro: slide up 60px + fade in, ~300ms (9 frames @30fps). Spring easing.
  const intro = spring({ frame, fps, durationInFrames: 10, config: { damping: 18, stiffness: 140, mass: 0.8 } });
  const tOpacity = interpolate(intro, [0, 1], [0, 1]);
  const tY = interpolate(intro, [0, 1], [50, 0]);

  // Tail: fade out in the last 6 frames
  const tail = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: tOpacity * tail, transform: `translateY(${tY}px)` }}>
      {ambient && <AmbientBg glowY={glowY} />}
      {children}
    </AbsoluteFill>
  );
};

/** Reusable scene title block: small uppercase label + big white headline + optional sub */
export const SceneTitle: React.FC<{
  label?: string;
  headline: React.ReactNode;
  sub?: React.ReactNode;
  topOffset?: number;
}>= ({ label, headline, sub, topOffset = 180 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelProg = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 140 } });
  const headProg = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 140 } });
  const subProg = spring({ frame: frame - 18, fps, config: { damping: 18, stiffness: 140 } });

  return (
    <div style={{
      position: 'absolute', top: topOffset, left: 60, right: 60, textAlign: 'center',
    }}>
      {label && (
        <div style={{
          opacity: labelProg,
          transform: `translateY(${interpolate(labelProg, [0, 1], [14, 0])}px)`,
          fontFamily: V2.font, fontSize: 30, fontWeight: 600,
          color: V2.primaryLight, letterSpacing: 4,
          textTransform: 'uppercase', marginBottom: 20,
        }}>
          {label}
        </div>
      )}
      <div style={{
        opacity: headProg,
        transform: `translateY(${interpolate(headProg, [0, 1], [20, 0])}px)`,
        fontFamily: V2.font, fontSize: 88, fontWeight: 700,
        color: V2.text, letterSpacing: -2, lineHeight: 1.05,
      }}>
        {headline}
      </div>
      {sub && (
        <div style={{
          opacity: subProg,
          transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          marginTop: 22,
          fontFamily: V2.font, fontSize: 38, fontWeight: 400,
          color: V2.textMuted, lineHeight: 1.35, letterSpacing: -0.2,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
};
