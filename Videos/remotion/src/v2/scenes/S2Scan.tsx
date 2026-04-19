import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { V2, SAFE } from '../brandV2';
import { SceneShell, SceneTitle } from '../components/SceneShell';
import { IconOrb, CameraIcon, SparkleIcon } from '../components/Icons';

/** SCENE 2 — Scan & AI: document flies in, tags appear. */
export const S2Scan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconProg = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 120 } });

  // Document flies in from bottom, lands in centre
  const docProg = spring({ frame: frame - 36, fps, config: { damping: 20, stiffness: 90 } });
  const docY = interpolate(docProg, [0, 1], [280, 0]);
  const docOpacity = docProg;

  // AI sparkle flash
  const sparkleProg = spring({ frame: frame - 64, fps, config: { damping: 14, stiffness: 130 } });

  const tags = ['Rechnung', 'Vertrag', 'Arztbrief'];

  return (
    <SceneShell glowY={46}>
      {/* Icon orb at top */}
      <div style={{
        position: 'absolute',
        top: SAFE.top + 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: iconProg,
        transform: `translateY(${interpolate(iconProg, [0, 1], [20, 0])}px) scale(${interpolate(iconProg, [0, 1], [0.85, 1])})`,
      }}>
        <IconOrb size={130}>
          <CameraIcon size={66} />
        </IconOrb>
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
        opacity: docOpacity,
        width: 360, height: 460,
        borderRadius: 16,
        background: V2.glassStrong,
        border: `1px solid ${V2.border}`,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        padding: 28,
        boxSizing: 'border-box',
      }}>
        <div style={{ fontFamily: V2.font, fontSize: 20, color: V2.textMuted, marginBottom: 10 }}>Finanzamt Wien</div>
        <div style={{ fontFamily: V2.font, fontSize: 26, fontWeight: 600, color: V2.text, marginBottom: 18 }}>Einkommensteuer­bescheid 2024</div>
        {[0,1,2,3,4].map(row => (
          <div key={row} style={{
            height: 8, borderRadius: 4,
            background: 'rgba(255,255,255,0.07)',
            marginBottom: 14,
            width: row === 4 ? '60%' : '100%',
          }} />
        ))}
        {/* sparkle */}
        <div style={{
          position: 'absolute', right: -14, top: -14,
          opacity: sparkleProg,
          transform: `scale(${interpolate(sparkleProg, [0, 1], [0.4, 1])}) rotate(${interpolate(sparkleProg, [0, 1], [-30, 0])}deg)`,
        }}>
          <SparkleIcon size={46} />
        </div>
      </div>

      {/* Tags — appear with stagger, float next to the doc */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: SAFE.bottom + 40,
        display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', padding: '0 40px',
      }}>
        {tags.map((tag, i) => {
          const prog = spring({ frame: frame - (80 + i * 10), fps, config: { damping: 16, stiffness: 130 } });
          const alpha = prog;
          const y = interpolate(prog, [0, 1], [20, 0]);
          return (
            <div key={tag} style={{
              opacity: alpha,
              transform: `translateY(${y}px)`,
              padding: '14px 26px',
              borderRadius: 999,
              background: 'rgba(99, 89, 255, 0.15)',
              border: `1px solid ${V2.primary}`,
              color: V2.primaryLight,
              fontFamily: V2.font, fontSize: 32, fontWeight: 600, letterSpacing: -0.2,
            }}>
              {tag}
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};
