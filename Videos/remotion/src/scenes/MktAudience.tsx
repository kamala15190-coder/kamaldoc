import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND, SAFE_LANDSCAPE } from '../brand';
import { GradientBg, StarField } from '../components/Gradient';

/** Marketing scene 4: For everyone (Privat + Unternehmen) */
export const MktAudience: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  const headlineOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const leftIn = interpolate(frame, [15, 45], [-200, 0], { extrapolateRight: 'clamp' });
  const rightIn = interpolate(frame, [15, 45], [200, 0], { extrapolateRight: 'clamp' });
  const cardOpacity = interpolate(frame, [15, 45], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <GradientBg progress={progress} />
      <StarField progress={progress} />

      <div style={{
        position: 'absolute', top: SAFE_LANDSCAPE.top + 20, left: 0, right: 0,
        textAlign: 'center', opacity: headlineOp,
      }}>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 28, fontWeight: 600, color: BRAND.primaryLight, letterSpacing: 3, textTransform: 'uppercase' }}>
          Für alle
        </div>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 80, fontWeight: 800, color: '#fff', marginTop: 10, letterSpacing: -2 }}>
          Privat & Unternehmen.
        </div>
      </div>

      {/* Two big cards */}
      <div style={{
        position: 'absolute', top: 280, bottom: SAFE_LANDSCAPE.bottom + 60,
        left: SAFE_LANDSCAPE.side, right: SAFE_LANDSCAPE.side,
        display: 'flex', gap: 60, justifyContent: 'center', alignItems: 'center',
      }}>
        {/* Privat card */}
        <div style={{
          flex: 1, maxWidth: 560, aspectRatio: '1 / 1',
          background: `linear-gradient(140deg, ${BRAND.primaryLight}, ${BRAND.primary} 60%, ${BRAND.primaryDeep})`,
          borderRadius: 36,
          padding: 56,
          boxShadow: `0 40px 80px ${BRAND.primary}44`,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          transform: `translateX(${leftIn}px)`, opacity: cardOpacity,
          position: 'relative', overflow: 'hidden',
        }}>
          <svg style={{ position: 'absolute', right: -30, top: -30, width: 280, height: 280, opacity: 0.35 }} viewBox="0 0 24 24" fill="#fff">
            <path d="M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 12c4.42 0 8 2.24 8 5v3H4v-3c0-2.76 3.58-5 8-5Z" />
          </svg>
          <div style={{ fontFamily: BRAND.fontStack, fontSize: 30, fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: 2, textTransform: 'uppercase' }}>
            Privatpersonen
          </div>
          <div style={{ fontFamily: BRAND.fontStack, fontSize: 68, fontWeight: 800, color: '#fff', letterSpacing: -2, marginTop: 10, lineHeight: 1 }}>
            Alle Briefe,<br />ein Ort.
          </div>
          <div style={{ fontFamily: BRAND.fontStack, fontSize: 26, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: 20 }}>
            Scannen · Erinnern · Antworten
          </div>
        </div>

        {/* Unternehmen card */}
        <div style={{
          flex: 1, maxWidth: 560, aspectRatio: '1 / 1',
          background: `linear-gradient(140deg, ${BRAND.surfaceHi} 0%, ${BRAND.surface} 80%)`,
          border: `2px solid ${BRAND.primary}66`,
          borderRadius: 36,
          padding: 56,
          boxShadow: `0 40px 80px rgba(0,0,0,0.4), 0 0 60px ${BRAND.primary}22`,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          transform: `translateX(${rightIn}px)`, opacity: cardOpacity,
          position: 'relative', overflow: 'hidden',
        }}>
          <svg style={{ position: 'absolute', right: -30, top: -30, width: 280, height: 280, opacity: 0.25 }} viewBox="0 0 24 24" fill={BRAND.primaryLight}>
            <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v5h5a1 1 0 0 1 1 1v10H4Zm3-3h3v-2H7v2Zm0-4h3v-2H7v2Zm0-4h3V8H7v2Zm5 8h3v-2h-3v2Zm0-4h3v-2h-3v2Zm4 4h2v-2h-2v2Z" />
          </svg>
          <div style={{ fontFamily: BRAND.fontStack, fontSize: 30, fontWeight: 600, color: BRAND.primaryLight, letterSpacing: 2, textTransform: 'uppercase' }}>
            Unternehmen
          </div>
          <div style={{ fontFamily: BRAND.fontStack, fontSize: 68, fontWeight: 800, color: '#fff', letterSpacing: -2, marginTop: 10, lineHeight: 1 }}>
            Rechnungen,<br />Verträge, Fristen.
          </div>
          <div style={{ fontFamily: BRAND.fontStack, fontSize: 26, fontWeight: 500, color: BRAND.textDim, marginTop: 20 }}>
            Multi-User · Admin · Export
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
