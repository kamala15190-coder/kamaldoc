import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { V2, SAFE } from '../brandV2';
import { SceneShell, SceneTitle } from '../components/SceneShell';
import { IconOrb, CameraIcon, SparkleIcon } from '../components/Icons';

/** SCENE 2 — Scan & AI: document flies in + tags, then KI analysis results (7s / 210 frames) */
export const S2Scan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconProg = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 120 } });

  const docProg = spring({ frame: frame - 36, fps, config: { damping: 20, stiffness: 90 } });
  const docY = interpolate(docProg, [0, 1], [280, 0]);

  const sparkleProg = spring({ frame: frame - 64, fps, config: { damping: 14, stiffness: 130 } });

  // Fade out original card + tags as extension takes over
  const docFadeOut = interpolate(frame, [108, 132], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagFadeOut = interpolate(frame, [112, 136], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const tags = ['Rechnung', 'Vertrag', 'Arztbrief'];

  // Extension: KI analysis phase (frame 112+)
  const extFade = spring({ frame: frame - 112, fps, config: { damping: 18, stiffness: 120 } });
  const barFill = interpolate(frame, [120, 154], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const checkItems = [
    { text: 'Erkannt: Einkommensteuerbescheid', startFrame: 156 },
    { text: 'Kategorie: Beh\u00f6rde', startFrame: 162 },
    { text: 'Archiviert', startFrame: 168 },
  ];

  return (
    <SceneShell glowY={46}>
      {/* Icon orb */}
      <div style={{
        position: 'absolute',
        top: SAFE.top + 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: iconProg,
        transform: `translateY(${interpolate(iconProg, [0, 1], [20, 0])}px) scale(${interpolate(iconProg, [0, 1], [0.85, 1])})`,
      }}>
        <IconOrb size={130}><CameraIcon size={66} /></IconOrb>
      </div>

      <SceneTitle
        label="Schritt 1"
        headline={<>Dokument scannen</>}
        sub={<>KI erkennt, kategorisiert &<br />archiviert automatisch</>}
        topOffset={SAFE.top + 170}
      />

      {/* Document card */}
      <div style={{
        position: 'absolute',
        left: '50%', top: 1120,
        transform: `translate(-50%, ${docY}px)`,
        opacity: docProg * docFadeOut,
        width: 360, height: 460,
        borderRadius: 16,
        background: V2.glassStrong,
        border: `1px solid ${V2.border}`,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        padding: 28, boxSizing: 'border-box',
      }}>
        <div style={{ fontFamily: V2.font, fontSize: 20, color: V2.textMuted, marginBottom: 10 }}>Finanzamt Wien</div>
        <div style={{ fontFamily: V2.font, fontSize: 26, fontWeight: 600, color: V2.text, marginBottom: 18 }}>
          Einkommensteuer\u00adbescheid 2024
        </div>
        {[0, 1, 2, 3, 4].map(row => (
          <div key={row} style={{
            height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)',
            marginBottom: 14, width: row === 4 ? '60%' : '100%',
          }} />
        ))}
        <div style={{
          position: 'absolute', right: -14, top: -14,
          opacity: sparkleProg,
          transform: `scale(${interpolate(sparkleProg, [0, 1], [0.4, 1])}) rotate(${interpolate(sparkleProg, [0, 1], [-30, 0])}deg)`,
        }}>
          <SparkleIcon size={46} />
        </div>
      </div>

      {/* Tags */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: SAFE.bottom + 40,
        display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', padding: '0 40px',
      }}>
        {tags.map((tag, i) => {
          const prog = spring({ frame: frame - (80 + i * 10), fps, config: { damping: 16, stiffness: 130 } });
          return (
            <div key={tag} style={{
              opacity: prog * tagFadeOut,
              transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
              padding: '14px 26px', borderRadius: 999,
              background: 'rgba(99, 89, 255, 0.15)', border: `1px solid ${V2.primary}`,
              color: V2.primaryLight, fontFamily: V2.font, fontSize: 32, fontWeight: 600, letterSpacing: -0.2,
            }}>
              {tag}
            </div>
          );
        })}
      </div>

      {/* Extension: KI analysis results */}
      <div style={{
        position: 'absolute', left: SAFE.side, right: SAFE.side, top: 660,
        opacity: extFade,
        transform: `translateY(${interpolate(extFade, [0, 1], [24, 0])}px)`,
      }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 44 }}>
          <div style={{
            fontFamily: V2.font, fontSize: 30, fontWeight: 600,
            color: V2.textMuted, marginBottom: 20, letterSpacing: 0.5,
          }}>
            KI analysiert\u2026
          </div>
          <div style={{
            height: 10, borderRadius: 99,
            background: 'rgba(99,89,255,0.15)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: `linear-gradient(90deg, ${V2.primary}, ${V2.primaryLight})`,
              width: `${barFill * 100}%`,
              boxShadow: '0 0 14px rgba(99,89,255,0.7)',
            }} />
          </div>
        </div>

        {/* Checkmarks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {checkItems.map(({ text, startFrame }) => {
            const prog = spring({ frame: frame - startFrame, fps, config: { damping: 22, stiffness: 160 } });
            return (
              <div key={text} style={{
                opacity: prog,
                transform: `translateX(${interpolate(prog, [0, 1], [-28, 0])}px)`,
                display: 'flex', alignItems: 'center', gap: 20,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(99,89,255,0.2)', border: `1px solid ${V2.primary}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width={22} height={16} viewBox="0 0 22 16" fill="none">
                    <path d="M2 8l6 6L20 2" stroke={V2.primaryLight} strokeWidth={2.6}
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{
                  fontFamily: V2.font, fontSize: 34, color: V2.text, fontWeight: 500, letterSpacing: -0.3,
                }}>
                  {text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
};
