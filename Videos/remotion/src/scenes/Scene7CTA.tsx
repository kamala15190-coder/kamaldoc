import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, SAFE_REEL } from '../brand';
import { KDocLogo } from '../components/Logo';

/** Scene 7: CTA — Jetzt kostenlos testen */
export const Scene7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  const shine = (frame * 3) % 200;

  const logoProgress = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const logoScale = interpolate(logoProgress, [0, 1], [0.7, 1]);

  const headlineOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: 'clamp' });
  const headlineY = interpolate(frame, [15, 35], [40, 0], { extrapolateRight: 'clamp' });

  const btnProgress = spring({ frame: frame - 40, fps, config: { damping: 12, stiffness: 110 } });
  const btnScale = interpolate(btnProgress, [0, 1], [0.8, 1]);
  const btnOpacity = btnProgress;

  const btnPulse = (Math.sin(frame / 8) + 1) / 2;

  return (
    <AbsoluteFill style={{ background: BRAND.bgDeep }}>
      {/* Purple gradient background */}
      <AbsoluteFill style={{
        background: `
          radial-gradient(60% 60% at 50% 40%, ${BRAND.primary} 0%, transparent 70%),
          linear-gradient(180deg, ${BRAND.bgDeep} 0%, ${BRAND.primaryDeep}44 60%, ${BRAND.bgDeep} 100%)
        `,
      }} />

      {/* Shimmer sweep */}
      <AbsoluteFill style={{
        background: `linear-gradient(105deg, transparent ${shine}%, rgba(255,255,255,0.06) ${shine + 10}%, transparent ${shine + 20}%)`,
        mixBlendMode: 'screen',
      }} />

      {/* Logo */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 600 }}>
        <div style={{ transform: `scale(${logoScale})` }}>
          <KDocLogo size={220} tagline />
        </div>
      </AbsoluteFill>

      {/* Headline + CTA */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 400 }}>
        <div style={{ textAlign: 'center', opacity: headlineOpacity, transform: `translateY(${headlineY}px)` }}>
          <div style={{
            fontFamily: BRAND.fontStack, fontSize: 92, fontWeight: 900, color: '#fff',
            letterSpacing: -3, lineHeight: 1.05, padding: '0 40px',
          }}>
            Jetzt kostenlos<br />testen.
          </div>
          <div style={{
            marginTop: 26,
            fontFamily: BRAND.fontStack, fontSize: 40, fontWeight: 500,
            color: BRAND.textDim,
          }}>
            Deine Dokumente. Intelligent organisiert.
          </div>
        </div>

        {/* Button */}
        <div style={{
          marginTop: 80,
          opacity: btnOpacity,
          transform: `scale(${btnScale * (1 + btnPulse * 0.02)})`,
          padding: '32px 70px',
          borderRadius: 80,
          background: `linear-gradient(135deg, ${BRAND.primaryLight} 0%, ${BRAND.primary} 50%, ${BRAND.primaryDeep} 100%)`,
          boxShadow: `0 20px 60px ${BRAND.primary}77, inset 0 1px 0 rgba(255,255,255,0.3)`,
          border: '2px solid rgba(255,255,255,0.2)',
        }}>
          <div style={{ fontFamily: BRAND.fontStack, fontSize: 56, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
            kdoc.at
          </div>
        </div>

        <div style={{
          marginTop: 38, fontFamily: BRAND.fontStack, fontSize: 32, color: BRAND.textMuted, fontWeight: 500,
          opacity: btnOpacity,
        }}>
          iOS · Android · Web
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
