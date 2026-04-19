import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, SAFE_REEL } from '../brand';
import { GradientBg, StarField } from '../components/Gradient';
import { PhoneFrame } from '../components/PhoneFrame';

const CATEGORIES = [
  { label: 'Rechnung', color: '#10B981', icon: (
    <svg width={42} height={42} viewBox="0 0 24 24" fill="none"><path d="M12 2v20M16 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
  ) },
  { label: 'Vertrag', color: '#F59E0B', icon: (
    <svg width={42} height={42} viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="#fff" strokeWidth="1.8"/><path d="M14 2v6h6M9 14h6M9 18h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ) },
  { label: 'Behörde', color: '#6359FF', icon: (
    <svg width={42} height={42} viewBox="0 0 24 24" fill="none"><path d="M3 10h18M4 20h16M6 10v10M10 10v10M14 10v10M18 10v10M12 3 2 8h20l-10-5Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/></svg>
  ) },
  { label: 'Arzt', color: '#EF4444', icon: (
    <svg width={42} height={42} viewBox="0 0 24 24" fill="none"><path d="M10 3v6a5 5 0 0 0 10 0V3M6 3h4M16 3h4M15 14v4a3 3 0 1 1-6 0v-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ) },
  { label: 'Bank', color: '#3B82F6', icon: (
    <svg width={42} height={42} viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 10v8M10 10v8M14 10v8M19 10v8M3 10 12 4l9 6" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/></svg>
  ) },
];

/** Scene 3: KI erkennt & kategorisiert */
export const Scene3Categorize: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Brain pulse
  const pulse = (Math.sin(frame / 8) + 1) / 2;

  return (
    <AbsoluteFill>
      <GradientBg progress={frame / durationInFrames} />
      <StarField progress={frame / durationInFrames} />

      {/* Title */}
      <div style={{
        position: 'absolute',
        top: SAFE_REEL.top + 30,
        left: SAFE_REEL.side,
        right: SAFE_REEL.side,
        textAlign: 'center',
        opacity: titleOpacity,
      }}>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 36, fontWeight: 600, color: BRAND.primaryLight, letterSpacing: 2, textTransform: 'uppercase' }}>
          Schritt 2
        </div>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 80, fontWeight: 800, color: '#fff', marginTop: 12, letterSpacing: -2, lineHeight: 1.1 }}>
          KI erkennt &<br />kategorisiert
        </div>
      </div>

      {/* Central brain/KI */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'relative',
          width: 260, height: 260,
          marginTop: 100,
        }}>
          <div style={{
            position: 'absolute', inset: -30,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${BRAND.primary}${Math.floor(60 + pulse * 40).toString(16)} 0%, transparent 65%)`,
            filter: 'blur(10px)',
          }} />
          <div style={{
            width: 260, height: 260,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${BRAND.primaryLight}, ${BRAND.primaryDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 60px ${BRAND.primary}`,
            transform: `scale(${1 + pulse * 0.04})`,
          }}>
            <svg width={150} height={150} viewBox="0 0 24 24" fill="none">
              <path d="M12 3a5 5 0 0 0-5 5c0 .8.19 1.56.53 2.24A4 4 0 0 0 6 14c0 2.21 1.79 4 4 4 .68 0 1.32-.17 1.88-.47.56.3 1.2.47 1.88.47 2.21 0 4-1.79 4-4a4 4 0 0 0-1.53-3.76A5 5 0 0 0 17 8a5 5 0 0 0-5-5Z"
                stroke="#fff" strokeWidth="1.5" fill="rgba(255,255,255,0.15)" />
              <path d="M12 8v11M9 13h6M10 11h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </AbsoluteFill>

      {/* Category tags — placed at fixed pixel offsets so they never overlap */}
      {CATEGORIES.map((cat, i) => {
        const appearAt = 25 + i * 18;
        const prog = spring({ frame: frame - appearAt, fps, config: { damping: 10, stiffness: 100 } });
        const alpha = prog;
        const scale = interpolate(prog, [0, 1], [0.4, 1]);

        // 5 positions in safe zone (1080w / 1920h) avoiding the 260px brain at ~(540, 960+100)
        // Brain is centred vertically around y≈1060.
        const positions = [
          { x: 170,  y: 680  }, // top-left (Rechnung)
          { x: 780,  y: 680  }, // top-right (Vertrag)
          { x: 90,   y: 1020 }, // middle-left (Behörde)
          { x: 860,  y: 1020 }, // middle-right (Arzt)
          { x: 540,  y: 1460 }, // bottom-centre (Bank)
        ];
        const pos = positions[i];

        return (
          <div key={cat.label} style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity: alpha,
          }}>
            <div style={{
              background: `${cat.color}33`,
              border: `2.5px solid ${cat.color}`,
              padding: '14px 26px',
              borderRadius: 999,
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: `0 14px 34px ${cat.color}55`,
              backdropFilter: 'blur(4px)',
              whiteSpace: 'nowrap',
            }}>
              {cat.icon}
              <span style={{ fontFamily: BRAND.fontStack, fontSize: 42, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>
                {cat.label}
              </span>
            </div>
          </div>
        );
      })}

      {/* Bottom hint */}
      <div style={{
        position: 'absolute', bottom: SAFE_REEL.bottom + 40,
        left: SAFE_REEL.side, right: SAFE_REEL.side, textAlign: 'center',
        fontFamily: BRAND.fontStack, fontSize: 34, color: BRAND.textDim, fontWeight: 500,
        opacity: interpolate(frame, [100, 130], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        Volltext-OCR · Automatische Kategorien · Absender-Erkennung
      </div>
    </AbsoluteFill>
  );
};
