import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { V2, SAFE } from '../brandV2';
import { SceneShell, SceneTitle } from '../components/SceneShell';
import { IconOrb, PenLetterIcon, SparkleIcon } from '../components/Icons';

/** SCENE 5 — KI Antwortbriefe: incoming → sparkle → outgoing letter morph */
export const S5KIBrief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconProg = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 120 } });

  // Incoming letter slides in from left, stays briefly, fades as AI sparkles
  const inProg = spring({ frame: frame - 40, fps, config: { damping: 20, stiffness: 100 } });
  const outProg = spring({ frame: frame - 110, fps, config: { damping: 20, stiffness: 100 } });

  const inboundOpacity = interpolate(frame, [40, 70, 100, 130], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sparkleAlpha = interpolate(frame, [85, 110, 135], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const outboundOpacity = interpolate(frame, [115, 145], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const inX = interpolate(inProg, [0, 1], [-250, 0]);
  const outX = interpolate(outProg, [0, 1], [250, 0]);

  return (
    <SceneShell glowY={50}>
      <div style={{
        position: 'absolute', top: SAFE.top + 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: iconProg,
        transform: `translateY(${interpolate(iconProg, [0, 1], [20, 0])}px) scale(${interpolate(iconProg, [0, 1], [0.85, 1])})`,
      }}>
        <IconOrb size={130}>
          <PenLetterIcon size={66} />
        </IconOrb>
      </div>

      <SceneTitle
        label="KI Antwortbriefe"
        headline={<>Sie schreibt für dich.</>}
        sub={<>Automatische Antworten auf<br />eingehende Post — in Sekunden.</>}
        topOffset={SAFE.top + 170}
      />

      {/* Stage */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1080, height: 520 }}>
        {/* Incoming envelope card */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: `translate(calc(-50% + ${inX}px), -50%)`,
          opacity: inboundOpacity,
          width: 540, height: 340,
        }}>
          <div style={{
            width: '100%', height: '100%',
            background: V2.glassStrong,
            border: `1px solid ${V2.border}`,
            borderRadius: 18,
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            padding: 28,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{
              fontFamily: V2.font, fontSize: 22, color: V2.textMuted, letterSpacing: 2, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width={18} height={14} viewBox="0 0 24 18" fill="none">
                <rect x="1" y="1" width="22" height="16" rx="2" stroke={V2.textMuted} strokeWidth="1.6" />
                <path d="M2 3l10 8 10-8" stroke={V2.textMuted} strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              Eingehender Brief
            </div>
            <div style={{ fontFamily: V2.font, fontSize: 30, fontWeight: 600, color: V2.text, lineHeight: 1.25 }}>
              Magistrat der Stadt Wien
            </div>
            <div style={{ fontFamily: V2.font, fontSize: 24, color: V2.textMuted, lineHeight: 1.4 }}>
              Strafverfügung wegen<br />geringfügiger Überschreitung…
            </div>
            <div style={{ marginTop: 'auto', fontFamily: V2.font, fontSize: 20, color: V2.textMuted }}>
              Frist: 14 Tage
            </div>
          </div>
        </div>

        {/* Sparkle burst between the two cards */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: sparkleAlpha,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 180, height: 180,
        }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(50% 50% at 50% 50%, rgba(167,139,250,0.45) 0%, transparent 70%)`,
            filter: 'blur(12px)',
          }} />
          <SparkleIcon size={96} />
          <div style={{
            position: 'absolute',
            fontFamily: V2.font, fontSize: 26, fontWeight: 700,
            color: V2.primaryLight, top: -32, letterSpacing: 2,
          }}>
            ✦ KI
          </div>
        </div>

        {/* Outgoing envelope card */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: `translate(calc(-50% + ${outX}px), -50%)`,
          opacity: outboundOpacity,
          width: 540, height: 340,
        }}>
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(180deg, rgba(99,89,255,0.15) 0%, rgba(99,89,255,0.04) 100%)`,
            border: `1px solid ${V2.primary}`,
            borderRadius: 18,
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            padding: 28,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{
              fontFamily: V2.font, fontSize: 22, color: V2.primaryLight, letterSpacing: 2, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width={18} height={14} viewBox="0 0 24 18" fill="none">
                <path d="M1 1h22v16H1z" stroke={V2.primaryLight} strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M1 1l11 9 11-9" stroke={V2.primaryLight} strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M16 4l4-3 0 4" stroke={V2.primaryLight} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Antwort · versandbereit
            </div>
            <div style={{ fontFamily: V2.font, fontSize: 30, fontWeight: 600, color: V2.text, lineHeight: 1.25 }}>
              Sehr geehrte Damen und Herren,
            </div>
            <div style={{ fontFamily: V2.font, fontSize: 24, color: V2.text, lineHeight: 1.4 }}>
              hiermit lege ich fristgerecht<br />Einspruch gegen Ihre Verfügung ein…
            </div>
            <div style={{ marginTop: 'auto', fontFamily: V2.font, fontSize: 20, color: V2.primaryLight, fontWeight: 600 }}>
              ✓ Juristisch geprüft · PDF-Export
            </div>
          </div>
        </div>
      </div>
    </SceneShell>
  );
};
