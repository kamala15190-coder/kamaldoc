import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { V2, SAFE } from '../brandV2';
import { SceneShell, SceneTitle } from '../components/SceneShell';
import { IconOrb, CalendarPulseIcon } from '../components/Icons';

const DEADLINES = [
  { title: 'Steuerbescheid Widerspruch', sub: 'Finanzamt Wien', days: 3, urgent: true },
  { title: 'Miete Nebenkosten Einspruch', sub: 'Hausverwaltung', days: 12, urgent: false },
  { title: 'Arztbefund Kontrolltermin', sub: 'Dr. Steiner', days: 28, urgent: false },
];

/** SCENE 4 — Fristen cards slide in from right */
export const S4Fristen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconProg = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 120 } });

  // Pulse on urgent badge
  const pulse = (Math.sin(frame / 8) + 1) / 2;

  return (
    <SceneShell glowY={46}>
      <div style={{
        position: 'absolute', top: SAFE.top + 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: iconProg,
        transform: `translateY(${interpolate(iconProg, [0, 1], [20, 0])}px) scale(${interpolate(iconProg, [0, 1], [0.85, 1])})`,
      }}>
        <IconOrb size={130}>
          <CalendarPulseIcon size={66} />
        </IconOrb>
      </div>

      <SceneTitle
        label="Fristen"
        headline={<>Nie wieder verpassen.</>}
        sub={<>Automatische Erinnerungen für<br />Behörden, Verträge & mehr.</>}
        topOffset={SAFE.top + 170}
      />

      {/* Cards slide in from right */}
      <div style={{
        position: 'absolute', left: SAFE.side, right: SAFE.side,
        top: 1100, display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {DEADLINES.map((d, i) => {
          const prog = spring({ frame: frame - (36 + i * 14), fps, config: { damping: 20, stiffness: 110 } });
          const x = interpolate(prog, [0, 1], [340, 0]);
          const alpha = prog;
          const badgeBg = d.urgent ? 'rgba(239, 68, 68, 0.18)' : 'rgba(99, 89, 255, 0.18)';
          const badgeBorder = d.urgent ? 'rgba(239, 68, 68, 0.6)' : 'rgba(99, 89, 255, 0.6)';
          const badgeText = d.urgent ? '#FCA5A5' : V2.primaryLight;
          const pulseScale = d.urgent ? 1 + pulse * 0.04 : 1;

          return (
            <div key={d.title} style={{
              transform: `translateX(${x}px)`, opacity: alpha,
              padding: '22px 26px',
              borderRadius: 18,
              background: V2.glassStrong,
              border: `1px solid ${V2.border}`,
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              display: 'flex', alignItems: 'center', gap: 18,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: V2.font, fontSize: 34, fontWeight: 600, color: V2.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {d.title}
                </div>
                <div style={{
                  fontFamily: V2.font, fontSize: 26, color: V2.textMuted, marginTop: 4,
                }}>
                  {d.sub}
                </div>
              </div>
              {/* Countdown badge */}
              <div style={{
                padding: '12px 18px', borderRadius: 14,
                background: badgeBg,
                border: `1px solid ${badgeBorder}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 110,
                transform: d.urgent ? `scale(${pulseScale})` : undefined,
              }}>
                <div style={{
                  fontFamily: V2.font, fontSize: 46, fontWeight: 700, color: badgeText, lineHeight: 0.95,
                }}>{d.days}</div>
                <div style={{
                  fontFamily: V2.font, fontSize: 20, fontWeight: 600, color: badgeText, letterSpacing: 1.5,
                  textTransform: 'uppercase', marginTop: 2,
                }}>Tage</div>
              </div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};
