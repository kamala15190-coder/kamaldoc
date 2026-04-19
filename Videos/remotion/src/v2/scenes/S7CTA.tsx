import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { V2, SAFE } from '../brandV2';
import { SceneShell } from '../components/SceneShell';
import { ParticleField } from '../components/Ambient';
import { KdocMark } from '../components/Icons';

/** Google Play Store badge — drawn cleanly as SVG */
const PlayStoreBadge: React.FC<{ scale?: number }>= ({ scale = 1 }) => {
  const w = 420 * scale;
  const h = 124 * scale;
  return (
    <div style={{
      width: w, height: h, borderRadius: 18 * scale,
      background: '#000',
      border: `1px solid rgba(255,255,255,0.18)`,
      display: 'flex', alignItems: 'center', gap: 18 * scale,
      padding: `${18 * scale}px ${26 * scale}px`,
      boxSizing: 'border-box',
    }}>
      {/* Play icon triangle with rainbow — simplified */}
      <svg width={52 * scale} height={56 * scale} viewBox="0 0 48 52" fill="none">
        <path d="M4 4v44l38-22L4 4Z" fill="url(#gp-g)" />
        <defs>
          <linearGradient id="gp-g" x1="0" y1="0" x2="48" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34D399" />
            <stop offset="0.35" stopColor="#60A5FA" />
            <stop offset="0.7" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#EF4444" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: V2.font, fontSize: 22 * scale, color: '#fff', opacity: 0.8, fontWeight: 500, letterSpacing: 0.2 }}>
          JETZT HERUNTERLADEN BEI
        </div>
        <div style={{ fontFamily: V2.font, fontSize: 40 * scale, color: '#fff', fontWeight: 600, letterSpacing: -0.5, marginTop: 2 }}>
          Google Play
        </div>
      </div>
    </div>
  );
};

/** SCENE 7 — Download CTA: centered logo, headline, Play Store badge, particles */
export const S7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProg = spring({ frame, fps, config: { damping: 16, stiffness: 100 } });
  const logoScale = interpolate(logoProg, [0, 1], [0.7, 1]);
  const logoOpacity = logoProg;

  const headProg = spring({ frame: frame - 16, fps, config: { damping: 18, stiffness: 130 } });
  const subProg = spring({ frame: frame - 28, fps, config: { damping: 18, stiffness: 130 } });
  const badgeProg = spring({ frame: frame - 44, fps, config: { damping: 16, stiffness: 120 } });
  const badgePulse = (Math.sin(frame / 9) + 1) / 2;

  return (
    <SceneShell glowY={46}>
      <ParticleField frame={frame} count={60} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 38 }}>
        {/* Logo with extra radial glow */}
        <div style={{
          position: 'relative',
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}>
          <div style={{
            position: 'absolute', inset: -180, borderRadius: '50%',
            background: `radial-gradient(50% 50% at 50% 50%, rgba(99,89,255,0.40) 0%, transparent 70%)`,
            filter: 'blur(30px)', zIndex: -1,
          }} />
          <KdocMark size={220} />
        </div>

        {/* Wordmark text */}
        <div style={{
          opacity: logoOpacity,
          fontFamily: V2.font, fontSize: 110, fontWeight: 700,
          color: V2.text, letterSpacing: -4, marginTop: -6,
        }}>
          kdoc
        </div>

        {/* Headline */}
        <div style={{
          opacity: headProg,
          transform: `translateY(${interpolate(headProg, [0, 1], [20, 0])}px)`,
          fontFamily: V2.font, fontSize: 74, fontWeight: 700,
          color: V2.text, letterSpacing: -2, textAlign: 'center',
          padding: '0 60px',
        }}>
          Jetzt kostenlos testen.
        </div>
        <div style={{
          opacity: subProg,
          transform: `translateY(${interpolate(subProg, [0, 1], [14, 0])}px)`,
          fontFamily: V2.font, fontSize: 36, fontWeight: 400,
          color: V2.textMuted, textAlign: 'center', marginTop: -22,
          padding: '0 60px',
        }}>
          Deine Dokumente. Intelligent organisiert.
        </div>

        {/* Play Store badge */}
        <div style={{
          marginTop: 20,
          opacity: badgeProg,
          transform: `scale(${interpolate(badgeProg, [0, 1], [0.85, 1]) * (1 + badgePulse * 0.015)}) translateY(${interpolate(badgeProg, [0, 1], [14, 0])}px)`,
        }}>
          <PlayStoreBadge scale={1} />
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};
