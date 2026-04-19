import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, SAFE_LANDSCAPE } from '../brand';
import { KDocLogo } from '../components/Logo';

/** Marketing Scene 6: CTA — kdoc.at */
export const MktCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  const shine = (frame * 2.5) % 250;

  const logoProgress = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const logoScale = interpolate(logoProgress, [0, 1], [0.7, 1]);

  const headlineOp = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: 'clamp' });
  const headlineY = interpolate(frame, [15, 35], [30, 0], { extrapolateRight: 'clamp' });

  const btnProgress = spring({ frame: frame - 35, fps, config: { damping: 12, stiffness: 120 } });
  const btnScale = interpolate(btnProgress, [0, 1], [0.8, 1]);
  const btnOpacity = btnProgress;
  const btnPulse = (Math.sin(frame / 8) + 1) / 2;

  return (
    <AbsoluteFill style={{ background: BRAND.bgDeep }}>
      <AbsoluteFill style={{
        background: `
          radial-gradient(55% 60% at 50% 45%, ${BRAND.primary} 0%, transparent 70%),
          linear-gradient(180deg, ${BRAND.bgDeep} 0%, ${BRAND.primaryDeep}44 60%, ${BRAND.bgDeep} 100%)
        `,
      }} />
      <AbsoluteFill style={{
        background: `linear-gradient(115deg, transparent ${shine}%, rgba(255,255,255,0.05) ${shine + 8}%, transparent ${shine + 16}%)`,
        mixBlendMode: 'screen',
      }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${logoScale})`, marginBottom: 30 }}>
          <KDocLogo size={160} tagline />
        </div>

        <div style={{ opacity: headlineOp, transform: `translateY(${headlineY}px)`, textAlign: 'center', maxWidth: 1400 }}>
          <div style={{ fontFamily: BRAND.fontStack, fontSize: 96, fontWeight: 900, color: '#fff', letterSpacing: -3, lineHeight: 1.0 }}>
            Kostenlos starten.
          </div>
          <div style={{ marginTop: 20, fontFamily: BRAND.fontStack, fontSize: 38, fontWeight: 500, color: BRAND.textDim }}>
            iOS · Android · Web · DSGVO-konform
          </div>
        </div>

        <div style={{
          marginTop: 60,
          opacity: btnOpacity,
          transform: `scale(${btnScale * (1 + btnPulse * 0.02)})`,
          padding: '36px 84px',
          borderRadius: 80,
          background: `linear-gradient(135deg, ${BRAND.primaryLight} 0%, ${BRAND.primary} 50%, ${BRAND.primaryDeep} 100%)`,
          boxShadow: `0 30px 80px ${BRAND.primary}77, inset 0 1px 0 rgba(255,255,255,0.3)`,
          border: '2px solid rgba(255,255,255,0.2)',
        }}>
          <div style={{ fontFamily: BRAND.fontStack, fontSize: 70, fontWeight: 800, color: '#fff', letterSpacing: -1.5 }}>
            kdoc.at
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
