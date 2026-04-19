import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, SAFE_REEL } from '../brand';
import { GradientBg, StarField } from '../components/Gradient';

// Language codes (rendered as styled pills — avoids emoji-flag font fallback issues in headless Chromium)
const LANG_CODES = ['DE', 'AT', 'CH', 'EN', 'FR', 'ES', 'IT', 'TR', 'PL', 'PT', 'NL', 'UA', 'RO', 'HR', 'JP', 'KR', 'CN', 'AR', 'HI', 'BR'];

/** Scene 6: 50+ Sprachen — globe with orbiting flags */
export const Scene6Languages: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const progress = frame / durationInFrames;

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  const bigNumProgress = spring({ frame: frame - 30, fps, config: { damping: 12, stiffness: 90 } });
  const numScale = interpolate(bigNumProgress, [0, 1], [0.5, 1]);
  const numAlpha = bigNumProgress;

  return (
    <AbsoluteFill>
      <GradientBg progress={progress} />
      <StarField progress={progress} />

      <div style={{
        position: 'absolute', top: SAFE_REEL.top + 30,
        left: SAFE_REEL.side, right: SAFE_REEL.side, textAlign: 'center',
        opacity: titleOpacity,
      }}>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 36, fontWeight: 600, color: BRAND.primaryLight, letterSpacing: 2, textTransform: 'uppercase' }}>
          Schritt 5
        </div>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 80, fontWeight: 800, color: '#fff', marginTop: 12, letterSpacing: -2, lineHeight: 1.1 }}>
          50+ Sprachen<br />unterstützt
        </div>
      </div>

      {/* Globe */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 520, height: 520, marginTop: 130 }}>
          {/* Globe body */}
          <div style={{
            width: 520, height: 520, borderRadius: '50%',
            background: `conic-gradient(from ${frame * 1.5}deg at 50% 50%, ${BRAND.primaryDeep}, ${BRAND.primaryLight}, ${BRAND.primary}, ${BRAND.primaryDeep})`,
            boxShadow: `0 0 120px ${BRAND.primary}88, inset -40px -60px 120px rgba(0,0,0,0.5)`,
            position: 'relative', overflow: 'hidden',
          }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
              <ellipse cx="50" cy="50" rx="48" ry="12" stroke="#fff" strokeWidth="0.3" fill="none" />
              <ellipse cx="50" cy="50" rx="48" ry="25" stroke="#fff" strokeWidth="0.3" fill="none" />
              <ellipse cx="50" cy="50" rx="48" ry="38" stroke="#fff" strokeWidth="0.3" fill="none" />
              <ellipse cx="50" cy="50" rx="12" ry="48" stroke="#fff" strokeWidth="0.3" fill="none" />
              <ellipse cx="50" cy="50" rx="25" ry="48" stroke="#fff" strokeWidth="0.3" fill="none" />
              <ellipse cx="50" cy="50" rx="38" ry="48" stroke="#fff" strokeWidth="0.3" fill="none" />
            </svg>
          </div>

          {/* Big number overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
            transform: `scale(${numScale})`,
            opacity: numAlpha,
          }}>
            <div style={{ fontFamily: BRAND.fontStack, fontSize: 220, fontWeight: 900, color: '#fff', letterSpacing: -10, lineHeight: 0.9, textShadow: '0 6px 20px rgba(0,0,0,0.45)' }}>
              50+
            </div>
            <div style={{ fontFamily: BRAND.fontStack, fontSize: 44, fontWeight: 700, color: BRAND.primaryLight, letterSpacing: 3, marginTop: 6 }}>
              SPRACHEN
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Orbit language pills — stylised chips instead of emoji flags */}
      {LANG_CODES.map((code, i) => {
        const angle = (i / LANG_CODES.length) * Math.PI * 2 + frame / 60;
        const orbitRadiusX = 430;
        const orbitRadiusY = 170;
        const dx = Math.cos(angle) * orbitRadiusX;
        const dy = Math.sin(angle) * orbitRadiusY + 130;
        const z = Math.sin(angle);
        const scale = 0.75 + (z * 0.3 + 0.3);
        const op = 0.35 + (z * 0.35 + 0.35);
        return (
          <div key={code} style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale})`,
            opacity: op,
            zIndex: Math.round(z * 10) + 10,
            filter: z < 0 ? 'blur(0.5px) brightness(0.85)' : 'none',
          }}>
            <div style={{
              fontFamily: BRAND.fontStack,
              fontSize: 40,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: 1,
              padding: '12px 20px',
              borderRadius: 16,
              background: `linear-gradient(135deg, ${BRAND.primary}cc, ${BRAND.primaryDeep}cc)`,
              border: `2px solid rgba(255,255,255,0.3)`,
              boxShadow: `0 8px 20px rgba(0,0,0,0.35), 0 0 20px ${BRAND.primaryLight}55`,
              backdropFilter: 'blur(2px)',
            }}>
              {code}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
