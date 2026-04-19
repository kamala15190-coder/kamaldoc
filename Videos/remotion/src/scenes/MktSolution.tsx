import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, SAFE_LANDSCAPE } from '../brand';
import { GradientBg, StarField } from '../components/Gradient';
import { KDocLogo } from '../components/Logo';

/** Marketing Scene 2: Logo reveal with purple glow */
export const MktSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const progress = frame / durationInFrames;

  const logoProgress = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  const logoScale = interpolate(logoProgress, [0, 1], [0.5, 1]);
  const logoOpacity = logoProgress;

  const glowPulse = (Math.sin(frame / 12) + 1) / 2;

  const tagOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: 'clamp' });
  const tagY = interpolate(frame, [30, 55], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <GradientBg progress={progress} />
      <StarField progress={progress} />

      {/* Radial glow */}
      <AbsoluteFill style={{
        background: `radial-gradient(40% 50% at 50% 45%, ${BRAND.primary}${Math.floor(120 + glowPulse * 50).toString(16).slice(0, 2)} 0%, transparent 70%)`,
      }} />

      {/* Logo centred */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${logoScale})`, opacity: logoOpacity }}>
          <KDocLogo size={220} />
        </div>
        <div style={{
          marginTop: 50,
          fontFamily: BRAND.fontStack, fontSize: 42, fontWeight: 500,
          color: BRAND.primaryLight, letterSpacing: 2,
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
        }}>
          Deine Dokumente. Intelligent organisiert.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
