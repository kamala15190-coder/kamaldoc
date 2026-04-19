import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, SAFE_LANDSCAPE } from '../brand';
import { GradientBg, StarField } from '../components/Gradient';

/** Marketing Scene 5: Social proof */
export const MktSocial: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  // Stars appear one by one
  const starCount = 5;
  const starsActive = Math.min(starCount, Math.max(0, Math.floor((frame - 5) / 6)));

  const quoteOp = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: 'clamp' });
  const quoteY = interpolate(frame, [30, 60], [30, 0], { extrapolateRight: 'clamp' });

  const badgesOp = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <GradientBg progress={progress} />
      <StarField progress={progress} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        {/* Stars */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 50 }}>
          {Array.from({ length: starCount }).map((_, i) => {
            const appear = spring({ frame: frame - (5 + i * 6), fps, config: { damping: 12, stiffness: 110 } });
            const scale = interpolate(appear, [0, 1], [0, 1]);
            const op = appear;
            return (
              <svg key={i} width={100} height={100} viewBox="0 0 24 24" style={{ transform: `scale(${scale})`, opacity: op }}>
                <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.1L12 17.8 5.7 21.3l1.7-7.1L2 9.5l7.1-.6L12 2z" fill={BRAND.accent} stroke="#FDE68A" strokeWidth="0.6" strokeLinejoin="round" />
              </svg>
            );
          })}
        </div>

        {/* Quote */}
        <div style={{
          textAlign: 'center', maxWidth: 1200, padding: '0 40px',
          opacity: quoteOp, transform: `translateY(${quoteY}px)`,
        }}>
          <div style={{ fontFamily: BRAND.fontStack, fontSize: 64, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: -1.5 }}>
            „Endlich keine Zettelwirtschaft mehr –<br />kdoc erledigt alles."
          </div>
          <div style={{ marginTop: 24, fontFamily: BRAND.fontStack, fontSize: 32, color: BRAND.textDim, fontWeight: 500 }}>
            Dokumentenchaos war gestern.
          </div>
        </div>

        {/* Badges */}
        <div style={{
          marginTop: 70, display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center',
          opacity: badgesOp,
        }}>
          {[
            { label: 'DSGVO-konform', emoji: '🔒' },
            { label: 'Hosted in EU', emoji: '🇪🇺' },
            { label: '50+ Sprachen', emoji: '🌐' },
          ].map((b) => (
            <div key={b.label} style={{
              padding: '20px 32px',
              borderRadius: 999,
              background: `${BRAND.primary}22`,
              border: `1.5px solid ${BRAND.primary}88`,
              fontFamily: BRAND.fontStack, fontSize: 30, fontWeight: 600, color: '#fff',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 36 }}>{b.emoji}</span>
              {b.label}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
