import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, SAFE_LANDSCAPE } from '../brand';
import { GradientBg, StarField } from '../components/Gradient';

const FEATURES = [
  {
    title: 'OCR-Scan',
    sub: 'Foto → durchsuchbarer Text',
    screenshot: 'scan.jpg',
    icon: (
      <svg width={64} height={64} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="3" stroke="#fff" strokeWidth="1.8" />
        <path d="M4 9h16M4 15h16" stroke="#fff" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: 'KI-Kategorisierung',
    sub: 'Brief · Rechnung · Behörde',
    screenshot: 'todos.jpg',
    icon: (
      <svg width={64} height={64} viewBox="0 0 24 24" fill="none">
        <path d="M12 3a5 5 0 0 0-5 5c0 .8.19 1.56.53 2.24A4 4 0 0 0 6 14c0 2.21 1.79 4 4 4 .68 0 1.32-.17 1.88-.47.56.3 1.2.47 1.88.47 2.21 0 4-1.79 4-4a4 4 0 0 0-1.53-3.76A5 5 0 0 0 17 8a5 5 0 0 0-5-5Z" stroke="#fff" strokeWidth="1.6" fill="rgba(255,255,255,0.1)" />
      </svg>
    ),
  },
  {
    title: 'Fristenverwaltung',
    sub: 'Push 7 · 3 · 1 Tag vorher',
    screenshot: 'reply1.jpg',
    icon: (
      <svg width={64} height={64} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="13" r="8" stroke="#fff" strokeWidth="1.8" />
        <path d="M12 9v4l3 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 3l2-2 4 0 2 2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export const MktFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <GradientBg progress={progress} />
      <StarField progress={progress} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: SAFE_LANDSCAPE.top + 20,
        left: 0, right: 0, textAlign: 'center', opacity: titleOpacity,
      }}>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 28, fontWeight: 600, color: BRAND.primaryLight, letterSpacing: 3, textTransform: 'uppercase' }}>
          Was kdoc kann
        </div>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 72, fontWeight: 800, color: '#fff', marginTop: 8, letterSpacing: -2 }}>
          Drei Funktionen, ein Fluss.
        </div>
      </div>

      {/* 3 column cards */}
      <div style={{
        position: 'absolute', top: 300, left: SAFE_LANDSCAPE.side, right: SAFE_LANDSCAPE.side, bottom: SAFE_LANDSCAPE.bottom + 80,
        display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'center',
      }}>
        {FEATURES.map((f, i) => {
          const appearAt = 20 + i * 12;
          const prog = spring({ frame: frame - appearAt, fps, config: { damping: 14, stiffness: 100 } });
          const scale = interpolate(prog, [0, 1], [0.7, 1]);
          const alpha = prog;
          return (
            <div key={f.title} style={{
              flex: 1, maxWidth: 440,
              background: `linear-gradient(180deg, ${BRAND.surfaceHi}CC 0%, ${BRAND.surface}CC 100%)`,
              borderRadius: 28,
              padding: 32,
              border: `1.5px solid ${BRAND.primary}44`,
              boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${BRAND.primary}22`,
              opacity: alpha, transform: `scale(${scale})`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
              backdropFilter: 'blur(10px)',
            }}>
              {/* Icon badge */}
              <div style={{
                width: 100, height: 100, borderRadius: 22,
                background: `linear-gradient(135deg, ${BRAND.primaryLight}, ${BRAND.primary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 15px 30px ${BRAND.primary}66`,
              }}>
                {f.icon}
              </div>

              {/* Screenshot */}
              <div style={{
                width: 180, height: 320, borderRadius: 14, overflow: 'hidden',
                border: `2px solid ${BRAND.primary}66`,
                boxShadow: `0 15px 30px rgba(0,0,0,0.4)`,
              }}>
                <Img src={staticFile(f.screenshot)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>

              {/* Text */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: BRAND.fontStack, fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
                  {f.title}
                </div>
                <div style={{ fontFamily: BRAND.fontStack, fontSize: 24, fontWeight: 500, color: BRAND.textDim, marginTop: 8 }}>
                  {f.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
