import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, SAFE_REEL } from '../brand';
import { GradientBg, StarField } from '../components/Gradient';
import { PhoneFrame } from '../components/PhoneFrame';

/** Scene 2: Dokument fotografieren */
export const Scene2Scan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const phoneProgress = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const phoneScale = interpolate(phoneProgress, [0, 1], [0.85, 1]);
  const phoneY = interpolate(phoneProgress, [0, 1], [80, 0]);

  const titleOpacity = interpolate(frame, [10, 28], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [10, 28], [30, 0], { extrapolateRight: 'clamp' });

  // Scan line sweep over phone
  const scanLineProgress = interpolate(frame, [50, 140], [0, 1], { extrapolateRight: 'clamp' });

  // Success flash — ensure strictly increasing domain even if scene is short.
  const flashPeak = Math.min(160, durationInFrames - 40);
  const successAlpha = interpolate(
    frame,
    [Math.max(0, flashPeak - 15), flashPeak, durationInFrames - 10, durationInFrames],
    [0, 0.7, 0.7, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const phoneWidth = 580;

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
        transform: `translateY(${titleY}px)`,
      }}>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 36, fontWeight: 600, color: BRAND.primaryLight, letterSpacing: 2, textTransform: 'uppercase' }}>
          Schritt 1
        </div>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 88, fontWeight: 800, color: '#fff', marginTop: 12, letterSpacing: -2, lineHeight: 1.1 }}>
          Dokument<br />fotografieren
        </div>
      </div>

      {/* Phone with scan */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 380, paddingBottom: SAFE_REEL.bottom + 80 }}>
        <div style={{ transform: `translateY(${phoneY}px) scale(${phoneScale})`, position: 'relative' }}>
          <PhoneFrame src="scan.jpg" width={phoneWidth} tilt={-3} />
          {/* Scan line */}
          <div style={{
            position: 'absolute',
            top: `${scanLineProgress * 100}%`,
            left: 14, right: 14, height: 6,
            background: `linear-gradient(90deg, transparent 0%, ${BRAND.primaryLight} 50%, transparent 100%)`,
            boxShadow: `0 0 24px ${BRAND.primaryLight}, 0 0 60px ${BRAND.primary}`,
            transform: 'translateY(-50%)',
            borderRadius: 3,
            opacity: scanLineProgress > 0 && scanLineProgress < 1 ? 1 : 0,
          }} />
          {/* Scanned overlay */}
          <div style={{
            position: 'absolute', top: 14, left: 14, right: 14,
            height: `${scanLineProgress * 100}%`,
            background: `linear-gradient(180deg, ${BRAND.primary}18, transparent)`,
            borderRadius: 50,
          }} />
        </div>
      </AbsoluteFill>

      {/* Success flash overlay */}
      <AbsoluteFill style={{
        pointerEvents: 'none',
        background: `radial-gradient(40% 30% at 50% 55%, ${BRAND.success}, transparent 70%)`,
        opacity: successAlpha,
      }} />
    </AbsoluteFill>
  );
};
