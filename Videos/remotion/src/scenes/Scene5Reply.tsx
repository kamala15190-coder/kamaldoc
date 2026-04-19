import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { BRAND, SAFE_REEL } from '../brand';
import { GradientBg, StarField } from '../components/Gradient';
import { PhoneFrame } from '../components/PhoneFrame';

/** Scene 5: Antwortbrief per KI generieren */
export const Scene5Reply: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  const phoneProgress = spring({ frame: frame - 5, fps, config: { damping: 14, stiffness: 80 } });
  const phoneScale = interpolate(phoneProgress, [0, 1], [0.8, 1]);
  const phoneOpacity = interpolate(phoneProgress, [0, 1], [0, 1]);

  // Typing effect — fake typing text
  const typed = 'Sehr geehrte Damen und Herren, hiermit möchte ich auf Ihr Schreiben vom 14.11.2025 antworten …';
  const typeProgress = interpolate(frame, [40, 130], [0, typed.length], { extrapolateRight: 'clamp' });
  const shownText = typed.slice(0, Math.round(typeProgress));

  // Cursor blink
  const cursorOn = Math.floor(frame / 12) % 2 === 0;

  return (
    <AbsoluteFill>
      <GradientBg progress={frame / durationInFrames} />
      <StarField progress={frame / durationInFrames} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: SAFE_REEL.top + 20,
        left: SAFE_REEL.side, right: SAFE_REEL.side, textAlign: 'center',
        opacity: titleOpacity,
      }}>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 36, fontWeight: 600, color: BRAND.primaryLight, letterSpacing: 2, textTransform: 'uppercase' }}>
          Schritt 4
        </div>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 78, fontWeight: 800, color: '#fff', marginTop: 12, letterSpacing: -2, lineHeight: 1.1 }}>
          Antwortbrief<br />per KI generieren
        </div>
      </div>

      {/* Split phone + letter card */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 320, opacity: phoneOpacity }}>
        <div style={{ display: 'flex', gap: 30, alignItems: 'center', transform: `scale(${phoneScale})` }}>
          {/* Phone */}
          <PhoneFrame src="reply1.jpg" width={400} tilt={-4} />

          {/* Magic arrow */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <svg width={80} height={60} viewBox="0 0 60 40" fill="none">
              <path d="M5 20 L50 20" stroke={BRAND.primaryLight} strokeWidth="5" strokeLinecap="round" />
              <path d="M40 8 L52 20 L40 32" stroke={BRAND.primaryLight} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{
              fontFamily: BRAND.fontStack, fontSize: 30, fontWeight: 700,
              color: BRAND.primaryLight,
              background: `${BRAND.primary}22`,
              padding: '6px 16px', borderRadius: 12,
              border: `1.5px solid ${BRAND.primary}66`,
            }}>
              ✨ KI
            </div>
          </div>

          {/* Letter card */}
          <div style={{
            width: 380, height: 560,
            background: '#fff',
            borderRadius: 16,
            padding: '28px 26px',
            boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${BRAND.primary}33`,
            transform: 'rotate(3deg)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontFamily: BRAND.fontStack, fontSize: 14, color: '#555', marginBottom: 6 }}>Wien, 14. November 2025</div>
            <div style={{ fontFamily: BRAND.fontStack, fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 16 }}>Österreichische Gesundheitskasse</div>
            <div style={{ fontFamily: BRAND.fontStack, fontSize: 14, color: '#222', lineHeight: 1.5, flex: 1, whiteSpace: 'pre-wrap' }}>
              {shownText}{cursorOn ? '▍' : ' '}
            </div>
            <div style={{ fontFamily: BRAND.fontStack, fontSize: 13, color: '#777', marginTop: 12, textAlign: 'right' }}>Mit freundlichen Grüßen</div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Sub caption */}
      <div style={{
        position: 'absolute', bottom: SAFE_REEL.bottom + 30,
        left: SAFE_REEL.side, right: SAFE_REEL.side, textAlign: 'center',
        fontFamily: BRAND.fontStack, fontSize: 34, color: BRAND.textDim, fontWeight: 500,
        opacity: interpolate(frame, [100, 130], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        Kündigung · Reklamation · Behörden-Antwort
      </div>
    </AbsoluteFill>
  );
};
