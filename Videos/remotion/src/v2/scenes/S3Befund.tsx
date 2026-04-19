import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { V2, SAFE } from '../brandV2';
import { SceneShell, SceneTitle } from '../components/SceneShell';
import { IconOrb, StethoscopeIcon, CheckIcon } from '../components/Icons';

/** SCENE 3 — Befundassistent: medical morph \u2192 clean summary \u2192 bar chart detail (9.1s / 273 frames) */
export const S3Befund: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconProg = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 120 } });

  const morphProg = interpolate(frame, [60, 105], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const beforeOpacity = interpolate(morphProg, [0, 0.5, 1], [1, 0.5, 0]);
  // After-card fades out at 155\u2013178 to cross-fade into bar chart
  const afterFadeOut = interpolate(frame, [155, 178], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const afterOpacity = interpolate(morphProg, [0, 0.5, 1], [0, 0.2, 1]) * afterFadeOut;

  const beforeIn = spring({ frame: frame - 30, fps, config: { damping: 20, stiffness: 100 } });
  const beforeX = interpolate(beforeIn, [0, 1], [-300, 0]);

  const flagsProg = spring({ frame: frame - 125, fps, config: { damping: 18, stiffness: 120 } });

  const langs = ['DE', 'AT', 'CH', 'EN', 'TR', 'PL'];

  // Bar chart extension (frame 162+)
  const barChartFade = spring({ frame: frame - 162, fps, config: { damping: 18, stiffness: 120 } });

  const barRows = [
    { label: 'Blutzucker', pct: 0.78, status: 'Normal', startFrame: 180 },
    { label: 'Blutdruck', pct: 0.68, status: 'Normal', startFrame: 189 },
    { label: 'Cholesterin', pct: 0.95, status: 'Optimal', startFrame: 198 },
  ];

  const footerProg = spring({ frame: frame - 228, fps, config: { damping: 18, stiffness: 120 } });

  return (
    <SceneShell glowY={46}>
      {/* Icon orb */}
      <div style={{
        position: 'absolute', top: SAFE.top + 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: iconProg,
        transform: `translateY(${interpolate(iconProg, [0, 1], [20, 0])}px) scale(${interpolate(iconProg, [0, 1], [0.85, 1])})`,
      }}>
        <IconOrb size={130} tint={V2.primaryLight}><StethoscopeIcon size={66} /></IconOrb>
      </div>

      <SceneTitle
        label="Befundassistent"
        headline={<>Medizin, verst\u00e4ndlich.</>}
        sub={<>KI erkl\u00e4rt deine Befunde<br />in einfacher Sprache.</>}
        topOffset={SAFE.top + 170}
      />

      {/* Before / After card container */}
      <div style={{ position: 'absolute', left: '50%', top: 1090, transform: 'translateX(-50%)', width: 820, height: 500 }}>

        {/* BEFORE \u2014 blurred dense text */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 18, background: V2.glassStrong, border: `1px solid ${V2.border}`,
          padding: '28px 32px', opacity: beforeOpacity,
          transform: `translateX(${beforeX}px)`,
          filter: `blur(${interpolate(morphProg, [0, 1], [2, 6])}px)`,
          backdropFilter: 'blur(12px)',
          boxSizing: 'border-box',
        }}>
          <div style={{ fontFamily: V2.font, fontSize: 18, color: V2.textMuted, marginBottom: 10 }}>
            Laborbefund \u00b7 ID 2024-0812
          </div>
          <div style={{ fontFamily: V2.font, fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, fontStyle: 'italic' }}>
            H\u00e4moglobin 14,2 g/dL \u00b7 Erythrozyten 4,6 Mio/\u00b5L \u00b7 MCV 88 fL \u00b7 MCH 30 pg \u00b7 Leukozyten 6,4/nL \u00b7 Thrombozyten 248/nL \u00b7 CRP &lt;0.5 mg/dL \u00b7 Kreatinin 0,9 mg/dL \u00b7 GFR &gt;90 mL/min \u00b7 ALT 22 U/L \u00b7 AST 18 U/L \u00b7 GGT 20 U/L \u00b7 Bilirubin 0,8 mg/dL \u00b7 HDL 52 mg/dL \u00b7 LDL 118 mg/dL \u00b7 Triglyceride 92 mg/dL \u00b7 Glukose 88 mg/dL \u00b7 HbA1c 5,3 % \u2026
          </div>
        </div>

        {/* AFTER \u2014 clean glass summary */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 18, background: V2.glassStrong, border: `1px solid ${V2.border}`,
          padding: '34px 36px', opacity: afterOpacity,
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 22,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(16, 185, 129, 0.18)', border: `1px solid rgba(16,185,129,0.4)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckIcon size={32} />
            </div>
            <div>
              <div style={{ fontFamily: V2.font, fontSize: 26, color: V2.textMuted, marginBottom: 2 }}>Ihr Befund</div>
              <div style={{ fontFamily: V2.font, fontSize: 38, fontWeight: 700, color: V2.text, letterSpacing: -0.5 }}>
                Alles im gr\u00fcnen Bereich \u2713
              </div>
            </div>
          </div>
          {[
            { k: 'Blutwerte', v: 'normal' },
            { k: 'Entz\u00fcndung', v: 'unauff\u00e4llig' },
            { k: 'Leber & Niere', v: 'gesund' },
            { k: 'N\u00e4chster Termin', v: 'in 12 Monaten' },
          ].map((row, i) => (
            <div key={row.k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: i === 0 ? 8 : 14, paddingBottom: 14,
              borderTop: i === 0 ? `1px solid ${V2.border}` : 'none',
              borderBottom: `1px solid ${V2.border}`,
            }}>
              <span style={{ fontFamily: V2.font, fontSize: 28, color: V2.textMuted }}>{row.k}</span>
              <span style={{ fontFamily: V2.font, fontSize: 30, fontWeight: 600, color: V2.text }}>{row.v}</span>
            </div>
          ))}
        </div>

        {/* BAR CHART \u2014 cross-fades in as after-card fades out */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 18, background: V2.glassStrong, border: `1px solid ${V2.border}`,
          padding: '32px 36px',
          opacity: barChartFade,
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', gap: 28,
          justifyContent: 'center',
        }}>
          {barRows.map(({ label, pct, status, startFrame }) => {
            const barProg = spring({
              frame: frame - startFrame, fps,
              config: { damping: 24, stiffness: 100 },
            });
            const fillWidth = interpolate(barProg, [0, 1], [0, pct]);
            const rowFade = spring({ frame: frame - startFrame + 0, fps, config: { damping: 18, stiffness: 130 } });
            return (
              <div key={label} style={{ opacity: rowFade }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginBottom: 12,
                }}>
                  <span style={{ fontFamily: V2.font, fontSize: 28, color: V2.textMuted, fontWeight: 500 }}>
                    {label}
                  </span>
                  <span style={{ fontFamily: V2.font, fontSize: 28, fontWeight: 600, color: V2.text }}>
                    {status}
                  </span>
                </div>
                <div style={{
                  height: 16, borderRadius: 99,
                  background: 'rgba(99,89,255,0.15)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: `linear-gradient(90deg, ${V2.primary}, ${V2.primaryLight})`,
                    width: `${fillWidth * 100}%`,
                    boxShadow: '0 0 10px rgba(99,89,255,0.5)',
                  }} />
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div style={{
            opacity: footerProg,
            transform: `translateY(${interpolate(footerProg, [0, 1], [10, 0])}px)`,
            fontFamily: V2.font, fontSize: 26, color: V2.success,
            fontWeight: 600, letterSpacing: 0.3, textAlign: 'center',
            marginTop: 4,
          }}>
            Ihr Arzt wird informiert \u2713
          </div>
        </div>
      </div>

      {/* Language pills */}
      <div style={{
        position: 'absolute', bottom: SAFE.bottom + 20, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', padding: '0 60px',
        opacity: flagsProg,
        transform: `translateY(${interpolate(flagsProg, [0, 1], [12, 0])}px)`,
      }}>
        {langs.map((code) => (
          <div key={code} style={{
            padding: '10px 16px', borderRadius: 10,
            background: V2.glass, border: `1px solid ${V2.border}`,
            fontFamily: V2.font, fontSize: 26, fontWeight: 700, color: V2.text, letterSpacing: 1,
          }}>{code}</div>
        ))}
        <div style={{
          padding: '10px 18px', borderRadius: 10,
          background: 'rgba(99, 89, 255, 0.18)', border: `1px solid ${V2.primary}`,
          fontFamily: V2.font, fontSize: 26, fontWeight: 600, color: V2.primaryLight, letterSpacing: 0.3,
        }}>+ 50 Sprachen</div>
      </div>
    </SceneShell>
  );
};
