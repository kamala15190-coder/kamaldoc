import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { V2, SAFE } from '../brandV2';
import { SceneShell, SceneTitle } from '../components/SceneShell';
import { IconOrb, PlugIcon, KdocMark, SearchIcon } from '../components/Icons';

const GmailMark = ({ size = 90 }: { size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.26,
    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.1)', position: 'relative', boxSizing: 'border-box',
  }}>
    <svg width={size * 0.58} height={size * 0.44} viewBox="0 0 36 26" fill="none">
      <path d="M2 2h32v22H2z" fill="#fff" />
      <path d="M2 2l16 13L34 2" stroke="#EA4335" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M2 2v22l10-8M34 2v22l-10-8" stroke="#34A853" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M12 16l6 5 6-5" stroke="#FBBC04" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </svg>
  </div>
);

const OutlookMark = ({ size = 90 }: { size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.26,
    background: '#0078D4', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" fill="#fff" />
      <ellipse cx="12" cy="12" rx="4.5" ry="5" stroke="#0078D4" strokeWidth="2" fill="none" />
      <text x="12" y="22" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="Arial">O</text>
    </svg>
  </div>
);

const ConnectLine: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  progress: number;
  dotPhase: number;
}> = ({ from, to, progress, dotPhase }) => {
  const cx = (from.x + to.x) / 2;
  const cy = Math.min(from.y, to.y) - 60;
  const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
  const pathLen = 800;
  const dashOffset = pathLen - pathLen * progress;
  const t = dotPhase % 1;
  const qx = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cx + t * t * to.x;
  const qy = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cy + t * t * to.y;

  return (
    <>
      <path d={d} stroke={V2.primaryLight} strokeWidth={3} fill="none"
        strokeLinecap="round" strokeDasharray={pathLen} strokeDashoffset={dashOffset} opacity={0.7} />
      {progress > 0.9 && (
        <>
          <circle cx={qx} cy={qy} r={10} fill={V2.primaryLight} opacity={0.35} />
          <circle cx={qx} cy={qy} r={5} fill="#fff" />
        </>
      )}
    </>
  );
};

/** SCENE 6 — MCP Konnektoren: tightened timings for 6s / 180 frames (was 10s/300) */
export const S6MCP: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconProg = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 120 } });

  const gmailPos   = { x: 200, y: 120 };
  const outlookPos = { x: 880, y: 120 };
  const kdocPos    = { x: 540, y: 360 };

  // Timing scaled from 300\u2192180 frames (\u00d70.6)
  const graphLineProg = interpolate(frame, [24, 54], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dotPhase = ((frame - 48) / 24) % 1;

  const searchProg = spring({ frame: frame - 72, fps, config: { damping: 18, stiffness: 120 } });
  const searchText = 'Rechnung Dezember 2024';
  const typedLen  = Math.max(0, Math.min(searchText.length, Math.floor((frame - 84) / 2)));
  const typedText = searchText.slice(0, typedLen);
  const cursorOn  = Math.floor(frame / 10) % 2 === 0;

  const resultsProg = spring({ frame: frame - 120, fps, config: { damping: 20, stiffness: 100 } });
  const captionProg = spring({ frame: frame - 141, fps, config: { damping: 18, stiffness: 120 } });

  const nodeIn = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 120 } });

  return (
    <SceneShell glowY={40}>
      <div style={{
        position: 'absolute', top: SAFE.top + 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: iconProg,
        transform: `translateY(${interpolate(iconProg, [0, 1], [20, 0])}px) scale(${interpolate(iconProg, [0, 1], [0.85, 1])})`,
      }}>
        <IconOrb size={130}><PlugIcon size={66} /></IconOrb>
      </div>

      <SceneTitle
        label="MCP Konnektoren"
        headline={<>Alles verbunden.</>}
        sub={<>Verbinde deine E-Mail-Konten<br />mit kdoc.</>}
        topOffset={SAFE.top + 170}
      />

      {/* Graph stage */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1000, height: 520 }}>
        <svg viewBox="0 0 1080 500" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, overflow: 'visible' }}>
          <ConnectLine from={gmailPos} to={kdocPos} progress={graphLineProg} dotPhase={dotPhase} />
          <ConnectLine from={outlookPos} to={kdocPos} progress={graphLineProg} dotPhase={(dotPhase + 0.5) % 1} />
        </svg>

        {/* Gmail */}
        <div style={{
          position: 'absolute', left: `${(gmailPos.x / 1080) * 100}%`, top: (gmailPos.y / 500) * 520,
          transform: `translate(-50%, -50%) scale(${interpolate(nodeIn(12), [0, 1], [0.6, 1])})`,
          opacity: nodeIn(12),
        }}>
          <GmailMark size={110} />
          <div style={{
            position: 'absolute', top: '105%', left: 0, right: 0, textAlign: 'center',
            fontFamily: V2.font, fontSize: 26, color: V2.textMuted, marginTop: 6, fontWeight: 500,
          }}>Gmail</div>
        </div>

        {/* Outlook */}
        <div style={{
          position: 'absolute', left: `${(outlookPos.x / 1080) * 100}%`, top: (outlookPos.y / 500) * 520,
          transform: `translate(-50%, -50%) scale(${interpolate(nodeIn(18), [0, 1], [0.6, 1])})`,
          opacity: nodeIn(18),
        }}>
          <OutlookMark size={110} />
          <div style={{
            position: 'absolute', top: '105%', left: 0, right: 0, textAlign: 'center',
            fontFamily: V2.font, fontSize: 26, color: V2.textMuted, marginTop: 6, fontWeight: 500,
          }}>Outlook</div>
        </div>

        {/* kdoc centre */}
        <div style={{
          position: 'absolute', left: `${(kdocPos.x / 1080) * 100}%`, top: (kdocPos.y / 500) * 520,
          transform: `translate(-50%, -50%) scale(${interpolate(nodeIn(0), [0, 1], [0.7, 1])})`,
          opacity: nodeIn(0),
        }}>
          <div style={{
            position: 'absolute', inset: -30, borderRadius: '50%',
            background: 'radial-gradient(50% 50% at 50% 50%, rgba(99,89,255,0.35) 0%, transparent 70%)',
            filter: 'blur(12px)', zIndex: -1,
          }} />
          <KdocMark size={140} />
          <div style={{
            position: 'absolute', top: '105%', left: 0, right: 0, textAlign: 'center',
            fontFamily: V2.font, fontSize: 30, color: V2.text, marginTop: 6, fontWeight: 600,
          }}>kdoc</div>
        </div>
      </div>

      {/* Search + results */}
      <div style={{
        position: 'absolute', left: SAFE.side, right: SAFE.side, top: 1560,
        opacity: searchProg,
        transform: `translateY(${interpolate(searchProg, [0, 1], [20, 0])}px)`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px',
          borderRadius: 14, background: V2.glassStrong, border: `1px solid ${V2.border}`,
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        }}>
          <SearchIcon size={28} />
          <div style={{ flex: 1, fontFamily: V2.font, fontSize: 32, color: V2.text, fontWeight: 500 }}>
            {typedText}{cursorOn && typedLen < searchText.length ? '\u258D' : ''}
          </div>
          <kbd style={{
            fontFamily: V2.font, fontSize: 20, color: V2.textMuted, padding: '6px 10px',
            borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: `1px solid ${V2.border}`,
          }}>\u2318K</kbd>
        </div>

        <div style={{
          marginTop: 18, display: 'flex', gap: 14,
          opacity: resultsProg,
          transform: `translateY(${interpolate(resultsProg, [0, 1], [16, 0])}px)`,
        }}>
          <div style={{
            flex: 1, background: V2.glass, border: `1px solid ${V2.border}`,
            borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{
              fontFamily: V2.font, fontSize: 22, fontWeight: 600, color: V2.primaryLight,
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
            }}>kdoc Dokumente</div>
            {['Strom \u00b7 A1 Energie \u00b7 02.12.24', 'Internet \u00b7 Drei \u00b7 09.12.24'].map(r => (
              <div key={r} style={{
                padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)',
                fontFamily: V2.font, fontSize: 22, color: V2.text, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: V2.primary }} />{r}
              </div>
            ))}
          </div>
          <div style={{
            flex: 1, background: V2.glass, border: `1px solid ${V2.border}`,
            borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{
              fontFamily: V2.font, fontSize: 22, fontWeight: 600, color: V2.primaryLight,
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
            }}>Postfach</div>
            {['Amazon \u00b7 Bestellung \u00b7 12.12.24', 'Miete \u00b7 WBV \u00b7 29.12.24'].map(r => (
              <div key={r} style={{
                padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)',
                fontFamily: V2.font, fontSize: 22, color: V2.text, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: V2.primaryLight }} />{r}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom caption */}
      <div style={{
        position: 'absolute', bottom: SAFE.bottom + 20, left: SAFE.side, right: SAFE.side,
        textAlign: 'center', fontFamily: V2.font, fontSize: 34, fontWeight: 600,
        color: V2.primaryLight, letterSpacing: -0.3,
        opacity: captionProg,
        transform: `translateY(${interpolate(captionProg, [0, 1], [14, 0])}px)`,
      }}>
        Eine Suche. Alle Quellen.
      </div>
    </SceneShell>
  );
};
