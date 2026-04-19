import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { V2, SAFE } from '../brandV2';
import { SceneShell } from '../components/SceneShell';
import { KdocMark } from '../components/Icons';

/**
 * SCENE 1 — "Papierstapel war gestern"
 * Document stack collapses, then clears; kdoc logo fades in with soft radial glow.
 */
export const S1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Paper stack: build quickly, then collapse
  const buildProg = spring({ frame: frame - 0, fps, config: { damping: 18, stiffness: 120 } });

  // Collapse window: frame 50 → 80
  const collapseProg = interpolate(frame, [50, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Logo appears after collapse
  const logoProg = spring({ frame: frame - 70, fps, config: { damping: 16, stiffness: 110 } });
  const logoScale = interpolate(logoProg, [0, 1], [0.7, 1]);
  const logoOpacity = logoProg;

  // Headline
  const headProg = spring({ frame: frame - 82, fps, config: { damping: 18, stiffness: 130 } });

  const sheetsCount = 6;

  return (
    <SceneShell glowY={54}>
      {/* Paper stack — each sheet offset + collapses to a single point */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 420, height: 520, marginBottom: 0 }}>
          {Array.from({ length: sheetsCount }).map((_, i) => {
            const delay = i * 3;
            const p = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 130 } });
            const inY = interpolate(p, [0, 1], [-40, 0]);
            const inOpacity = p;
            const offsetX = (i - sheetsCount / 2) * 10;
            const offsetY = -i * 14;
            const rot = (i % 2 === 0 ? -1 : 1) * (1 + i * 0.4);

            // Collapse
            const collapseY = interpolate(collapseProg, [0, 1], [0, offsetY * -1 - 120]);
            const collapseOpacity = interpolate(collapseProg, [0, 0.8], [1, 0]);
            const collapseScale = interpolate(collapseProg, [0, 1], [1, 0.3]);

            return (
              <div key={i} style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                margin: 'auto',
                width: 340, height: 440,
                transform: `translate(${offsetX}px, ${offsetY + inY + collapseY}px) rotate(${rot}deg) scale(${collapseScale})`,
                opacity: inOpacity * collapseOpacity,
                background: V2.glassStrong,
                border: `1px solid ${V2.border}`,
                borderRadius: 12,
                backdropFilter: 'blur(4px)',
                padding: 28,
              }}>
                {/* paper lines */}
                {[0,1,2,3,4,5].map(row => (
                  <div key={row} style={{
                    height: 6, borderRadius: 3,
                    background: 'rgba(255,255,255,0.08)',
                    marginBottom: 16,
                    width: row === 0 ? '55%' : row === 5 ? '40%' : '100%',
                  }} />
                ))}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Logo centred */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${logoScale})`, opacity: logoOpacity, position: 'relative' }}>
          {/* purple radial glow behind logo */}
          <div style={{
            position: 'absolute', inset: -140, borderRadius: '50%',
            background: `radial-gradient(50% 50% at 50% 50%, rgba(99,89,255,0.35) 0%, transparent 70%)`,
            filter: 'blur(20px)', zIndex: -1,
          }} />
          <KdocMark size={200} />
        </div>
      </AbsoluteFill>

      {/* Headline */}
      <div style={{
        position: 'absolute', bottom: SAFE.bottom + 80, left: SAFE.side, right: SAFE.side,
        textAlign: 'center',
        opacity: headProg,
        transform: `translateY(${interpolate(headProg, [0, 1], [30, 0])}px)`,
      }}>
        <div style={{
          fontFamily: V2.font, fontSize: 76, fontWeight: 700,
          color: V2.text, letterSpacing: -2, lineHeight: 1.1,
        }}>
          Papierstapel<br />
          <span style={{ color: V2.primaryLight }}>war gestern.</span>
        </div>
      </div>
    </SceneShell>
  );
};
