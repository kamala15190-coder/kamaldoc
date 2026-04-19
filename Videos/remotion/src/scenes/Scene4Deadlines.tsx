import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, SAFE_REEL } from '../brand';
import { GradientBg, StarField } from '../components/Gradient';
import { PhoneFrame } from '../components/PhoneFrame';

/** Scene 4: Fristen nie verpassen (calendar + countdown) */
export const Scene4Deadlines: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  const phoneProgress = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 80 } });
  const phoneY = interpolate(phoneProgress, [0, 1], [120, 0]);
  const phoneOpacity = interpolate(phoneProgress, [0, 1], [0, 1]);

  // Countdown ticks 14 → 3 → Erinnerung
  const countPhase = interpolate(frame, [30, 90, 130], [14, 3, 3], { extrapolateRight: 'clamp' });
  const countDisplay = Math.max(0, Math.round(countPhase));

  // Pulse on badge
  const pulse = (Math.sin(frame / 6) + 1) / 2;

  // Bell ring trigger
  const bellRot = Math.sin(Math.max(0, frame - 110) / 3) * 15;

  return (
    <AbsoluteFill>
      <GradientBg progress={frame / durationInFrames} />
      <StarField progress={frame / durationInFrames} />

      {/* Title */}
      <div style={{
        position: 'absolute',
        top: SAFE_REEL.top + 20,
        left: SAFE_REEL.side,
        right: SAFE_REEL.side,
        textAlign: 'center',
        opacity: titleOpacity,
      }}>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 36, fontWeight: 600, color: BRAND.primaryLight, letterSpacing: 2, textTransform: 'uppercase' }}>
          Schritt 3
        </div>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 86, fontWeight: 800, color: '#fff', marginTop: 12, letterSpacing: -2, lineHeight: 1.1 }}>
          Fristen<br />nie verpassen
        </div>
      </div>

      {/* Phone with deadline card */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 340, opacity: phoneOpacity }}>
        <div style={{ transform: `translateY(${phoneY}px)`, position: 'relative' }}>
          <PhoneFrame src="todos.jpg" width={540} tilt={2} />
        </div>
      </AbsoluteFill>

      {/* Floating deadline badge */}
      <div style={{
        position: 'absolute',
        right: SAFE_REEL.side - 10,
        top: 760,
        background: `linear-gradient(135deg, ${BRAND.accent}, #D97706)`,
        borderRadius: 24,
        padding: '24px 30px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        boxShadow: `0 20px 50px rgba(245,158,11,0.5)`,
        transform: `scale(${1 + pulse * 0.05}) rotate(${bellRot * 0.15}deg)`,
        border: '2px solid rgba(255,255,255,0.2)',
      }}>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: 1 }}>
          IN
        </div>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 90, fontWeight: 900, color: '#fff', lineHeight: 0.9, letterSpacing: -3 }}>
          {countDisplay}
        </div>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.95)', letterSpacing: 1 }}>
          TAGEN
        </div>
      </div>

      {/* Bell */}
      <div style={{
        position: 'absolute',
        left: SAFE_REEL.side - 10, top: 760,
        width: 140, height: 140, borderRadius: 70,
        background: `linear-gradient(135deg, ${BRAND.primaryLight}, ${BRAND.primary})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 20px 50px ${BRAND.primary}77`,
        transform: `rotate(${bellRot}deg)`,
      }}>
        <svg width={72} height={72} viewBox="0 0 24 24" fill="none">
          <path d="M6 8a6 6 0 0 1 12 0v5l1.5 2.5a1 1 0 0 1-.87 1.5H5.37a1 1 0 0 1-.87-1.5L6 13V8Z" fill="#fff" />
          <path d="M10 20a2 2 0 0 0 4 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Sub hint */}
      <div style={{
        position: 'absolute', bottom: SAFE_REEL.bottom + 30,
        left: SAFE_REEL.side, right: SAFE_REEL.side, textAlign: 'center',
        fontFamily: BRAND.fontStack, fontSize: 36, color: BRAND.textDim, fontWeight: 500,
        opacity: interpolate(frame, [80, 110], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        Push-Erinnerung 7 · 3 · 1 Tag vorher
      </div>
    </AbsoluteFill>
  );
};
