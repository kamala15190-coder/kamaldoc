import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';
import { BRAND, SAFE_REEL } from '../brand';
import { KDocLogo } from '../components/Logo';

/** Scene 1: HOOK — cinematic desk clip, tagline "Papierstapel war gestern", kdoc logo fades in */
export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Desk video fades slightly at the end
  const deskOpacity = interpolate(frame, [0, 15, durationInFrames - 20, durationInFrames], [0, 1, 1, 0.55], { extrapolateRight: 'clamp' });

  // Strike-through "Papierstapel" word
  const headlineOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateRight: 'clamp' });
  const strikeWidth = interpolate(frame, [55, 85], [0, 1], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.ease) });

  // "war gestern" fades in
  const subOpacity = interpolate(frame, [75, 100], [0, 1], { extrapolateRight: 'clamp' });

  // Logo reveal
  const logoProgress = spring({ frame: frame - 110, fps, config: { damping: 14, stiffness: 90 } });
  const logoScale = interpolate(logoProgress, [0, 1], [0.6, 1]);
  const logoOpacity = interpolate(logoProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ background: BRAND.bgDeep }}>
      {/* Desk clip with gradient overlay */}
      <AbsoluteFill style={{ opacity: deskOpacity }}>
        <OffthreadVideo src={staticFile('desk.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{
        background: `linear-gradient(180deg, rgba(5,7,15,0.35) 0%, rgba(5,7,15,0.55) 45%, rgba(99,89,255,0.35) 100%)`,
      }} />

      {/* Hook text */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: SAFE_REEL.top + 160 }}>
        <div style={{
          fontFamily: BRAND.fontStack,
          color: '#fff',
          fontSize: 96, fontWeight: 800,
          textAlign: 'center',
          lineHeight: 1.05,
          letterSpacing: -2,
          textShadow: '0 8px 40px rgba(0,0,0,0.6)',
          opacity: headlineOpacity,
          position: 'relative',
          display: 'inline-block',
          padding: '0 20px',
        }}>
          Papierstapel
          <span style={{
            position: 'absolute',
            left: 20, right: 20, top: '52%',
            height: 8, borderRadius: 4,
            background: BRAND.primaryLight,
            width: `calc((100% - 40px) * ${strikeWidth})`,
            boxShadow: `0 0 20px ${BRAND.primary}`,
          }} />
        </div>
        <div style={{
          marginTop: 26,
          fontFamily: BRAND.fontStack,
          color: BRAND.primaryLight,
          fontSize: 72, fontWeight: 700,
          textAlign: 'center',
          letterSpacing: -1,
          opacity: subOpacity,
          textShadow: '0 6px 30px rgba(0,0,0,0.5)',
        }}>
          war gestern.
        </div>
      </AbsoluteFill>

      {/* Logo reveal */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: SAFE_REEL.bottom + 120, opacity: logoOpacity }}>
        <div style={{ transform: `scale(${logoScale})` }}>
          <KDocLogo size={150} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
