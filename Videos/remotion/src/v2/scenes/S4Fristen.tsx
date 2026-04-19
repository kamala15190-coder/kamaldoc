// File encoding: UTF-8
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { V2, SAFE } from '../brandV2';
import { SceneShell, SceneTitle } from '../components/SceneShell';
import { IconOrb, CalendarPulseIcon } from '../components/Icons';

const DEADLINES = [
  { title: 'Steuerbescheid Widerspruch', sub: 'Finanzamt Wien', days: 3, urgent: true },
  { title: 'Miete Nebenkosten Einspruch', sub: 'Hausverwaltung', days: 12, urgent: false },
  { title: 'Arztbefund Kontrolltermin', sub: 'Dr. Steiner', days: 28, urgent: false },
];

const BellSVG = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
      fill={V2.primaryLight} />
  </svg>
);

/** SCENE 4 — Fristen: deadline cards + push notification slide-in (7.7s / 231 frames) */
export const S4Fristen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconProg = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 120 } });
  const pulse = (Math.sin(frame / 8) + 1) / 2;

  // Extension: notification slides in from above (frame 100+)
  const notifProg = spring({ frame: frame - 100, fps, config: { damping: 22, stiffness: 130, mass: 0.9 } });
  const notifFadeOut = interpolate(frame, [172, 192], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const notifOpacity = notifProg * notifFadeOut;
  const notifY = interpolate(notifProg, [0, 1], [-440, 0]);

  // Footer text after notification fades
  const footerProg = spring({ frame: frame - 176, fps, config: { damping: 18, stiffness: 120 } });

  return (
    <SceneShell glowY={46}>
      <div style={{
        position: 'absolute', top: SAFE.top + 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: iconProg,
        transform: `translateY(${interpolate(iconProg, [0, 1], [20, 0])}px) scale(${interpolate(iconProg, [0, 1], [0.85, 1])})`,
      }}>
        <IconOrb size={130}><CalendarPulseIcon size={66} /></IconOrb>
      </div>

      <SceneTitle
        label="Fristen"
        headline={<>Nie wieder verpassen.</>}
        sub={<>Automatische Erinnerungen für<br />Behörden, Verträge & mehr.</>}
        topOffset={SAFE.top + 170}
      />

      {/* Push notification — slides down from above into the title/cards gap */}
      <div style={{
        position: 'absolute', left: SAFE.side, right: SAFE.side, top: 630,
        opacity: notifOpacity,
        transform: `translateY(${notifY}px) translateZ(0)`,
        willChange: 'transform',
      }}>
        <div style={{
          borderRadius: 18,
          background: 'rgba(15,15,25,0.95)',
          border: `1px solid ${V2.border}`,
          borderLeft: `3px solid ${V2.primary}`,
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          padding: '24px 28px',
          display: 'flex', alignItems: 'flex-start', gap: 18,
          WebkitFontSmoothing: 'antialiased',
        }}>
          {/* Bell icon — SVG */}
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'rgba(99,89,255,0.2)', border: `1px solid ${V2.primary}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BellSVG />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: V2.font, fontSize: 28, fontWeight: 700, color: V2.text,
              marginBottom: 8, letterSpacing: -0.3,
            }}>
              Erinnerung gesendet
            </div>
            <div style={{
              fontFamily: V2.font, fontSize: 26, color: V2.textMuted, lineHeight: 1.4,
            }}>
              Finanzamt Österreich — Frist in 3 Tagen
            </div>
            <div style={{
              fontFamily: V2.font, fontSize: 22, color: 'rgba(148,163,184,0.6)',
              marginTop: 8,
            }}>
              Heute, 09:41
            </div>
          </div>
        </div>
      </div>

      {/* Footer tagline */}
      <div style={{
        position: 'absolute', left: SAFE.side, right: SAFE.side, top: 880,
        opacity: footerProg,
        transform: `translateY(${interpolate(footerProg, [0, 1], [12, 0])}px)`,
        textAlign: 'center',
        fontFamily: V2.font, fontSize: 34, fontWeight: 600,
        color: V2.primaryLight, letterSpacing: -0.3,
      }}>
        Automatisch. Immer pünktlich.
      </div>

      {/* Deadline cards */}
      <div style={{
        position: 'absolute', left: SAFE.side, right: SAFE.side, top: 1100,
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {DEADLINES.map((d, i) => {
          const prog = spring({ frame: frame - (36 + i * 14), fps, config: { damping: 20, stiffness: 110 } });
          const x = interpolate(prog, [0, 1], [340, 0]);
          const badgeBg = d.urgent ? 'rgba(239, 68, 68, 0.18)' : 'rgba(99, 89, 255, 0.18)';
          const badgeBorder = d.urgent ? 'rgba(239, 68, 68, 0.6)' : 'rgba(99, 89, 255, 0.6)';
          const badgeText = d.urgent ? '#FCA5A5' : V2.primaryLight;
          const pulseScale = d.urgent ? 1 + pulse * 0.04 : 1;

          return (
            <div key={d.title} style={{
              transform: `translateX(${x}px)`, opacity: prog,
              padding: '22px 26px', borderRadius: 18,
              background: V2.glassStrong, border: `1px solid ${V2.border}`,
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
                <div style={{ fontFamily: V2.font, fontSize: 26, color: V2.textMuted, marginTop: 4 }}>
                  {d.sub}
                </div>
              </div>
              <div style={{
                padding: '12px 18px', borderRadius: 14,
                background: badgeBg, border: `1px solid ${badgeBorder}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 110,
                transform: d.urgent ? `scale(${pulseScale})` : undefined,
              }}>
                <div style={{ fontFamily: V2.font, fontSize: 46, fontWeight: 700, color: badgeText, lineHeight: 0.95 }}>
                  {d.days}
                </div>
                <div style={{
                  fontFamily: V2.font, fontSize: 20, fontWeight: 600, color: badgeText,
                  letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2,
                }}>
                  Tage
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};
