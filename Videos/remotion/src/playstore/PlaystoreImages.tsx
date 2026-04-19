// File encoding: UTF-8
import React from 'react';
import { AbsoluteFill } from 'remotion';

// ─── Design tokens ────────────────────────────────────────────────────────────
const APP = {
  bg: '#0b1220',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text: '#f1f5f9',
  muted: '#8595ae',
  muted2: '#b8c4d6',
  accent: '#6366f1',
  accentLight: '#818cf8',
  accentSoft: 'rgba(99,102,241,0.15)',
  success: '#10b981',
  successSoft: 'rgba(16,185,129,0.12)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245,158,11,0.12)',
  font: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
};

const K = {
  bg: '#0A0A0F',
  primary: '#6359FF',
  primaryLight: '#A78BFA',
  text: '#FFFFFF',
  muted: '#94A3B8',
  font: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
};

// ─── Particles ────────────────────────────────────────────────────────────────
const Particles: React.FC<{ count?: number }> = ({ count = 12 }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} style={{
        position: 'absolute',
        left: `${(i * 137.5) % 100}%`,
        top: `${(i * 97.3 + 30) % 100}%`,
        width: 1.5 + (i % 3) * 0.8,
        height: 1.5 + (i % 3) * 0.8,
        borderRadius: '50%',
        background: K.primary,
        opacity: 0.2 + (i % 4) * 0.1,
      }} />
    ))}
  </div>
);

// ─── Phone frame ─────────────────────────────────────────────────────────────
const PhoneFrame: React.FC<{ children: React.ReactNode; width?: number; height?: number; tiltY?: number }> = ({
  children, width = 420, height = 900, tiltY = 0,
}) => {
  const bw = 10;
  return (
    <div style={{ width, height, position: 'relative', transform: tiltY ? `perspective(1200px) rotateY(${tiltY}deg)` : undefined }}>
      <div style={{
        position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
        width: 300, height: 40,
        background: 'rgba(99,89,255,0.28)', filter: 'blur(30px)', borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 52, overflow: 'hidden',
        background: 'rgba(255,255,255,0.055)',
        border: '1.5px solid rgba(255,255,255,0.13)',
        boxShadow: '0 40px 80px rgba(99,89,255,0.22), 0 8px 24px rgba(0,0,0,0.55)',
      }}>
        {/* screen area */}
        <div style={{
          position: 'absolute', top: 14, left: bw, right: bw, bottom: 12,
          borderRadius: 44, background: APP.bg, overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%)' }} />
          <div style={{ width: width - bw * 2, height: height - 26, overflow: 'hidden', position: 'relative' }}>
            {children}
          </div>
        </div>
        {/* Dynamic island */}
        <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: 110, height: 30, background: '#000', borderRadius: 20, zIndex: 20 }} />
      </div>
    </div>
  );
};

// ─── Status bar & tab bar ─────────────────────────────────────────────────────
const StatusBar: React.FC = () => (
  <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'relative', zIndex: 30 }}>
    <span style={{ fontFamily: APP.font, fontSize: 14, fontWeight: 600, color: APP.text }}>9:41</span>
    <div style={{ width: 18, height: 12, border: `1.5px solid ${APP.muted}`, borderRadius: 3, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 1, top: 1, bottom: 1, width: '70%', background: APP.text, borderRadius: 1 }} />
    </div>
  </div>
);

const TabBar: React.FC = () => (
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 72,
    background: 'rgba(11,18,32,0.96)', borderTop: `1px solid ${APP.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px',
  }}>
    {(['Start', '', 'Befund', '', 'Behörde', '', 'Profil'] as const).map((label, i) => {
      if (i % 2 === 1) return null;
      const idx = i / 2;
      if (idx === 1) return (
        <div key="plus" style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(99,102,241,0.5)' }}>
          <span style={{ color: '#fff', fontSize: 28, lineHeight: 1 }}>+</span>
        </div>
      );
      return (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.4, flex: 1 }}>
          <div style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ fontFamily: APP.font, fontSize: 11, color: APP.text }}>{label}</span>
        </div>
      );
    })}
  </div>
);

// ─── Screen 1: Dashboard ──────────────────────────────────────────────────────
const ScreenDashboard: React.FC = () => (
  <div style={{ width: '100%', height: '100%', background: APP.bg, fontFamily: APP.font, overflow: 'hidden', position: 'relative' }}>
    <StatusBar />
    <div style={{ padding: '0 18px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 11, color: APP.muted, letterSpacing: 0.5 }}>MONTAG, 6. JANUAR</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: APP.text, marginTop: 2 }}>Guten Morgen 👋</div>
      </div>
    </div>
    <div style={{ padding: '0 18px 14px', display: 'flex', gap: 10 }}>
      {[{ n: '47', l: 'Dokumente', c: APP.accent, bg: APP.accentSoft }, { n: '3', l: 'Aufgaben', c: APP.warning, bg: APP.warningSoft }, { n: '234€', l: 'Ausgaben', c: APP.success, bg: APP.successSoft }].map((s) => (
        <div key={s.l} style={{ flex: 1, borderRadius: 12, background: s.bg, border: `1px solid ${s.c}40`, padding: '12px 10px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.n}</div>
          <div style={{ fontSize: 11, color: APP.muted, marginTop: 2 }}>{s.l}</div>
        </div>
      ))}
    </div>
    <div style={{ padding: '0 18px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: APP.text }}>Zuletzt hinzugefügt</span>
      <span style={{ fontSize: 12, color: APP.accent }}>Alle →</span>
    </div>
    <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { name: 'Einkommensteuerbescheid 2024', kat: 'Behörde', date: '03.01.25', c: APP.accent },
        { name: 'Stromrechnung A1 Energie', kat: 'Rechnung', date: '28.12.24', c: APP.warning },
        { name: 'Mietvertrag HV Muster', kat: 'Vertrag', date: '15.12.24', c: '#f87171' },
        { name: 'Arztbrief Dr. Steiner', kat: 'Brief', date: '09.12.24', c: '#60a5fa' },
      ].map((d) => (
        <div key={d.name} style={{ borderRadius: 12, background: APP.card, border: `1px solid ${APP.border}`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${d.c}20`, border: `1px solid ${d.c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 14, height: 18, background: d.c, borderRadius: 2, opacity: 0.8 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: APP.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: 11, color: d.c, background: `${d.c}18`, padding: '2px 7px', borderRadius: 6, fontWeight: 500 }}>{d.kat}</span>
              <span style={{ fontSize: 11, color: APP.muted }}>{d.date}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
    <TabBar />
  </div>
);

// ─── Screen 2: Upload/Scan ────────────────────────────────────────────────────
const ScreenScan: React.FC = () => (
  <div style={{ width: '100%', height: '100%', background: APP.bg, fontFamily: APP.font, overflow: 'hidden', position: 'relative' }}>
    <StatusBar />
    <div style={{ padding: '4px 18px 16px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: APP.text }}>Dokument scannen</div>
      <div style={{ fontSize: 12, color: APP.muted, marginTop: 2 }}>Foto, PDF oder Bild hochladen</div>
    </div>
    <div style={{ margin: '0 18px 14px', borderRadius: 18, border: `2px dashed ${APP.accent}60`, background: `${APP.accent}08`, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 70, height: 70, borderRadius: 20, background: APP.accentSoft, border: `1px solid ${APP.accent}60`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="4" stroke={APP.accentLight} strokeWidth="1.5" fill="none" />
          <circle cx="12" cy="12" r="4" stroke={APP.accentLight} strokeWidth="1.5" fill="none" />
          <path d="M12 7V3M17 12h4M12 17v4M3 12H7" stroke={APP.accentLight} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: APP.text }}>Foto aufnehmen oder Datei wählen</div>
        <div style={{ fontSize: 12, color: APP.muted, marginTop: 4 }}>PDF · JPG · PNG · HEIC (max. 50 MB)</div>
      </div>
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <div style={{ flex: 1, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', padding: '13px', textAlign: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>📷 Kamera</span>
        </div>
        <div style={{ flex: 1, borderRadius: 12, background: APP.card, border: `1px solid ${APP.border}`, padding: '13px', textAlign: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: APP.text }}>📁 Datei</span>
        </div>
      </div>
    </div>
    <div style={{ padding: '0 18px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: APP.text, marginBottom: 10 }}>Zuletzt hochgeladen</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { name: 'Mahnung_Energie.pdf', status: 'Analysiert ✓', sc: APP.success, bg: APP.successSoft },
          { name: 'Vertrag_Neu_2025.pdf', status: 'Wird analysiert…', sc: APP.warning, bg: APP.warningSoft },
        ].map(r => (
          <div key={r.name} style={{ borderRadius: 10, background: APP.card, border: `1px solid ${APP.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: APP.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 12, height: 16, background: APP.accentLight, borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: APP.text }}>{r.name}</div>
              <span style={{ fontSize: 11, color: r.sc, background: r.bg, padding: '2px 8px', borderRadius: 6, marginTop: 3, display: 'inline-block' }}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
    <TabBar />
  </div>
);

// ─── Screen 3: Befund ─────────────────────────────────────────────────────────
const ScreenBefund: React.FC = () => (
  <div style={{ width: '100%', height: '100%', background: APP.bg, fontFamily: APP.font, overflow: 'hidden', position: 'relative' }}>
    <StatusBar />
    <div style={{ padding: '4px 18px 14px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: APP.text }}>🩺 Befundassistent</div>
      <div style={{ fontSize: 12, color: APP.muted, marginTop: 2 }}>Befunde einfach verstehen</div>
    </div>
    <div style={{ margin: '0 18px 14px', borderRadius: 16, background: APP.successSoft, border: `1px solid ${APP.success}40`, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: APP.successSoft, border: `1px solid ${APP.success}60`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18 }}>✅</span>
        </div>
        <div>
          <div style={{ fontSize: 11, color: APP.muted }}>Dr. Steiner · 09.12.2024</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: APP.success }}>Alles im grünen Bereich</div>
        </div>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 12px' }} />
      {[{ k: 'Blutwerte', v: 'normal' }, { k: 'Entzündungsmarker', v: 'unauffällig' }, { k: 'Nächste Kontrolle', v: 'in 12 Monaten' }].map((r) => (
        <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: APP.muted }}>{r.k}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: APP.text }}>{r.v}</span>
        </div>
      ))}
    </div>
    <div style={{ margin: '0 18px 14px', borderRadius: 14, background: APP.card, border: `1px solid ${APP.border}`, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: APP.muted, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>KI-Erklärung</div>
      <div style={{ fontSize: 13, color: APP.muted2, lineHeight: 1.6 }}>Alle Blutwerte liegen im Normbereich. Cholesterin leicht erhöht — kein Handlungsbedarf bis zur nächsten Kontrolle.</div>
    </div>
    <div style={{ padding: '0 18px' }}>
      <div style={{ fontSize: 12, color: APP.muted, marginBottom: 8 }}>Übersetzung — 50+ Sprachen</div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' as const }}>
        {['DE', 'AT', 'CH', 'EN', 'TR', 'PL', 'HR', '+44'].map(c => (
          <div key={c} style={{ padding: '6px 12px', borderRadius: 8, background: c === 'DE' ? APP.accentSoft : APP.card, border: `1px solid ${c === 'DE' ? APP.accent : APP.border}`, fontSize: 12, fontWeight: 700, color: c === 'DE' ? APP.accentLight : APP.text }}>{c}</div>
        ))}
      </div>
    </div>
    <TabBar />
  </div>
);

// ─── Screen 4: Behörde ────────────────────────────────────────────────────────
const ScreenBehoerde: React.FC = () => (
  <div style={{ width: '100%', height: '100%', background: APP.bg, fontFamily: APP.font, overflow: 'hidden', position: 'relative' }}>
    <StatusBar />
    <div style={{ padding: '4px 18px 14px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: APP.text }}>⚖️ Behörden Assistent</div>
      <div style={{ fontSize: 12, color: APP.muted, marginTop: 2 }}>KI prüft auf anfechtbare Elemente</div>
    </div>
    <div style={{ margin: '0 18px 12px', borderRadius: 14, background: APP.card, border: `1px solid ${APP.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${APP.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 14, height: 18, background: APP.accentLight, borderRadius: 2 }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: APP.text }}>Einkommensteuerbescheid 2024</div>
        <div style={{ fontSize: 11, color: APP.muted, marginTop: 2 }}>Finanzamt Wien · 03.01.2025</div>
      </div>
    </div>
    <div style={{ margin: '0 18px 12px', borderRadius: 12, background: APP.warningSoft, border: `1px solid ${APP.warning}50`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 20 }}>⚠️</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: APP.warning }}>Einspruch möglich</div>
        <div style={{ fontSize: 12, color: APP.muted, marginTop: 2 }}>KI hat 2 anfechtbare Elemente erkannt</div>
      </div>
    </div>
    <div style={{ margin: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[{ t: 'Werbungskosten', d: 'Homeoffice-Pauschale nicht berücksichtigt', c: APP.warning }, { t: 'Sonderausgaben', d: 'Kirchenbeitrag fehlt im Bescheid', c: '#f87171' }].map(p => (
        <div key={p.t} style={{ borderRadius: 12, background: APP.card, border: `1px solid ${APP.border}`, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.c, marginTop: 5, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: APP.text }}>{p.t}</div>
            <div style={{ fontSize: 11, color: APP.muted, marginTop: 2 }}>{p.d}</div>
          </div>
        </div>
      ))}
    </div>
    <div style={{ padding: '0 18px' }}>
      <div style={{ borderRadius: 14, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', padding: '15px', textAlign: 'center' as const, boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>✍️ Widerspruch erstellen</span>
      </div>
    </div>
    <TabBar />
  </div>
);

// ─── Screen 5: Sprachen ───────────────────────────────────────────────────────
const ScreenSprachen: React.FC = () => (
  <div style={{ width: '100%', height: '100%', background: APP.bg, fontFamily: APP.font, overflow: 'hidden', position: 'relative' }}>
    <StatusBar />
    <div style={{ padding: '4px 18px 14px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: APP.text }}>🌍 Übersetzung</div>
      <div style={{ fontSize: 12, color: APP.muted, marginTop: 2 }}>Dein Dokument in 50+ Sprachen</div>
    </div>
    <div style={{ margin: '0 18px 14px', borderRadius: 14, background: APP.card, border: `1px solid ${APP.border}`, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: APP.muted, marginBottom: 4 }}>Arztbrief Dr. Steiner — übersetzt</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: APP.text, marginBottom: 8 }}>English translation</div>
      <div style={{ height: 1, background: APP.border, marginBottom: 8 }} />
      <div style={{ fontSize: 12, color: APP.muted2, lineHeight: 1.6 }}>Your blood values are all within the normal range. No immediate action required…</div>
    </div>
    <div style={{ padding: '0 18px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: APP.text, marginBottom: 12 }}>Sprache wählen</div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
        {[
          { flag: '🇩🇪', name: 'Deutsch' }, { flag: '🇦🇹', name: 'Österreich' },
          { flag: '🇬🇧', name: 'English' }, { flag: '🇹🇷', name: 'Türkçe' },
          { flag: '🇵🇱', name: 'Polski' }, { flag: '🇷🇺', name: 'Русский' },
          { flag: '🇭🇷', name: 'Hrvatski' }, { flag: '🇫🇷', name: 'Français' },
          { flag: '🇪🇸', name: 'Español' }, { flag: '🇮🇹', name: 'Italiano' },
          { flag: '🇸🇦', name: 'العربية' }, { flag: '🇨🇳', name: '中文' },
        ].map((l, i) => (
          <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 5, borderRadius: 10, padding: '7px 10px', background: i === 2 ? APP.accentSoft : APP.card, border: `1px solid ${i === 2 ? APP.accent : APP.border}` }}>
            <span style={{ fontSize: 14 }}>{l.flag}</span>
            <span style={{ fontSize: 11, color: i === 2 ? APP.accentLight : APP.text, fontWeight: i === 2 ? 700 : 400 }}>{l.name}</span>
          </div>
        ))}
        <div style={{ borderRadius: 10, padding: '7px 12px', background: APP.card, border: `1px solid ${APP.border}` }}>
          <span style={{ fontSize: 11, color: APP.muted }}>+ 38 weitere</span>
        </div>
      </div>
    </div>
    <TabBar />
  </div>
);

// ─── Screen 6: MCP ────────────────────────────────────────────────────────────
const ScreenMCP: React.FC = () => (
  <div style={{ width: '100%', height: '100%', background: APP.bg, fontFamily: APP.font, overflow: 'hidden', position: 'relative' }}>
    <StatusBar />
    <div style={{ padding: '4px 18px 14px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: APP.text }}>🔗 E-Mail Konnektoren</div>
      <div style={{ fontSize: 12, color: APP.muted, marginTop: 2 }}>Postfächer mit kdoc verbinden</div>
    </div>
    <div style={{ padding: '0 18px 12px' }}>
      <div style={{ fontSize: 11, color: APP.success, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 8 }}>Verbunden</div>
      {[{ name: 'Gmail', sub: 'kamal@gmail.com', c: '#EA4335', bg: 'rgba(234,67,53,0.12)' }, { name: 'Outlook', sub: 'kamal@outlook.com', c: '#0078D4', bg: 'rgba(0,120,212,0.12)' }].map(p => (
        <div key={p.name} style={{ borderRadius: 12, background: APP.successSoft, border: `1px solid ${APP.success}30`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: p.c }}>{p.name[0]}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: APP.text }}>{p.name}</div>
            <div style={{ fontSize: 11, color: APP.muted, marginTop: 1 }}>{p.sub}</div>
          </div>
          <span style={{ fontSize: 11, color: APP.success }}>✓ Aktiv</span>
        </div>
      ))}
    </div>
    <div style={{ padding: '0 18px' }}>
      <div style={{ fontSize: 11, color: APP.muted, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 8 }}>Verfügbar</div>
      {[{ name: 'GMX', c: '#1D4AFF', bg: 'rgba(29,74,255,0.12)' }, { name: 'iCloud Mail', c: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }, { name: 'Yahoo Mail', c: '#720E9E', bg: 'rgba(114,14,158,0.12)' }].map(p => (
        <div key={p.name} style={{ borderRadius: 12, background: APP.card, border: `1px solid ${APP.border}`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: p.c }}>{p.name[0]}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: APP.text }}>{p.name}</div>
          </div>
          <div style={{ padding: '6px 14px', borderRadius: 8, background: APP.accentSoft, border: `1px solid ${APP.accent}50` }}>
            <span style={{ fontSize: 11, color: APP.accentLight, fontWeight: 600 }}>Verbinden</span>
          </div>
        </div>
      ))}
    </div>
    <TabBar />
  </div>
);

// ─── Screen 7: Suche ──────────────────────────────────────────────────────────
const ScreenSuche: React.FC = () => (
  <div style={{ width: '100%', height: '100%', background: APP.bg, fontFamily: APP.font, overflow: 'hidden', position: 'relative' }}>
    <StatusBar />
    <div style={{ padding: '4px 18px 12px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: APP.text }}>🔍 Universalsuche</div>
    </div>
    <div style={{ margin: '0 18px 14px', borderRadius: 14, background: APP.card, border: `1px solid ${APP.accent}60`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>
      <span style={{ fontSize: 14, color: APP.text, flex: 1 }}>Rechnung Dezember▍</span>
      <span style={{ fontSize: 11, color: APP.muted, background: APP.card, border: `1px solid ${APP.border}`, padding: '3px 8px', borderRadius: 6 }}>⌘K</span>
    </div>
    <div style={{ margin: '0 18px 12px' }}>
      <div style={{ fontSize: 11, color: APP.accent, textTransform: 'uppercase' as const, letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>kdoc Dokumente · 3 Treffer</div>
      {[{ n: 'Stromrechnung A1 Energie', d: '02.12.24' }, { n: 'Internet Drei GmbH', d: '09.12.24' }, { n: 'Miete Dezember 2024', d: '29.12.24' }].map(r => (
        <div key={r.n} style={{ borderRadius: 10, background: APP.card, border: `1px solid ${APP.border}`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: APP.accent, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: APP.text }}>{r.n}</div>
          </div>
          <span style={{ fontSize: 11, color: APP.muted }}>{r.d}</span>
        </div>
      ))}
    </div>
    <div style={{ margin: '0 18px' }}>
      <div style={{ fontSize: 11, color: '#60a5fa', textTransform: 'uppercase' as const, letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>Postfach · 7 Treffer</div>
      {[{ n: 'RE: Rechnung Nr. 20241201', from: 'noreply@a1.net', d: '03.12.24' }, { n: 'Ihre Dezember-Rechnung', from: 'billing@drei.at', d: '09.12.24' }, { n: 'Amazon · Bestellung #112', from: 'order@amazon.de', d: '12.12.24' }].map(r => (
        <div key={r.n} style={{ borderRadius: 10, background: APP.card, border: `1px solid ${APP.border}`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: '#60a5fa', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: APP.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{r.n}</div>
            <div style={{ fontSize: 11, color: APP.muted }}>{r.from}</div>
          </div>
          <span style={{ fontSize: 11, color: APP.muted, flexShrink: 0 }}>{r.d}</span>
        </div>
      ))}
    </div>
    <TabBar />
  </div>
);

// ─── Shared outer frame pieces ────────────────────────────────────────────────
const KdocLogo: React.FC<{ size?: number }> = ({ size = 42 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ width: size * 1.1, height: size * 1.1, borderRadius: size * 0.28, background: 'linear-gradient(135deg, #4F46E5, #6359FF, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(99,89,255,0.5)' }}>
      <span style={{ fontFamily: K.font, fontSize: size * 0.55, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>k</span>
    </div>
    <span style={{ fontFamily: K.font, fontSize: size, fontWeight: 800, color: '#fff', letterSpacing: -1.5 }}>kdoc</span>
  </div>
);

const KostelosBadge: React.FC = () => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,89,255,0.2)', border: '1px solid #6359FF', borderRadius: 999, padding: '8px 20px' }}>
    <span style={{ fontFamily: K.font, fontSize: 26, fontWeight: 600, color: K.primaryLight }}>✓ Kostenlos</span>
  </div>
);

const FeatureBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${color}20`, border: `1px solid ${color}`, borderRadius: 999, padding: '8px 20px' }}>
    <span style={{ fontFamily: K.font, fontSize: 26, fontWeight: 600, color }}>{label}</span>
  </div>
);

// ─── Standard layout ──────────────────────────────────────────────────────────
interface LayoutProps {
  headline: string;
  sub: string;
  badge: string;
  badgeColor: string;
  screen: React.ReactNode;
  phoneW?: number;
  phoneH?: number;
  tiltY?: number;
  extraBottom?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ headline, sub, badge, badgeColor, screen, phoneW = 420, phoneH = 900, tiltY = 0, extraBottom }) => (
  <AbsoluteFill style={{ background: K.bg, fontFamily: K.font, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(99,89,255,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
    <Particles count={12} />

    {/* Top logo */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <KdocLogo size={42} />
    </div>

    {/* Phone */}
    <div style={{ position: 'absolute', top: 180, left: 0, right: 0, height: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', width: 300, height: 40, background: 'rgba(99,89,255,0.25)', filter: 'blur(40px)', borderRadius: '50%' }} />
      <PhoneFrame width={phoneW} height={phoneH} tiltY={tiltY}>{screen}</PhoneFrame>
    </div>

    {/* Bottom text */}
    <div style={{ position: 'absolute', top: 1380, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 30 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        {headline.split('\n').map((l, i) => (
          <div key={i} style={{ fontSize: 68, fontWeight: 800, color: K.text, letterSpacing: -2.5, lineHeight: 1.1 }}>{l}</div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        {sub.split('\n').map((l, i) => (
          <div key={i} style={{ fontSize: 34, color: K.muted, lineHeight: 1.4 }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, justifyContent: 'center', marginBottom: 20 }}>
        <FeatureBadge label={badge} color={badgeColor} />
        <KostelosBadge />
      </div>
      {extraBottom}
    </div>
  </AbsoluteFill>
);

// ─── Image 8: Hero ────────────────────────────────────────────────────────────
const HeroImage: React.FC = () => (
  <AbsoluteFill style={{ background: K.bg, fontFamily: K.font, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 900, background: 'radial-gradient(circle, rgba(99,89,255,0.22) 0%, transparent 65%)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
    <Particles count={18} />

    {/* TOP */}
    <div style={{ position: 'absolute', top: 80, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <KdocLogo size={54} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 54, fontWeight: 700, color: K.text, letterSpacing: -2 }}>Deine Dokumente.</div>
        <div style={{ fontSize: 54, fontWeight: 700, color: K.primaryLight, letterSpacing: -2 }}>Intelligent.</div>
      </div>
      <div style={{ padding: '14px 40px', borderRadius: 999, background: 'linear-gradient(135deg, #4F46E5, #6359FF)', boxShadow: '0 4px 24px rgba(99,89,255,0.5)' }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>Kostenlos starten →</span>
      </div>
    </div>

    {/* Phone */}
    <div style={{ position: 'absolute', top: 430, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', width: 500, height: 60, background: 'rgba(99,89,255,0.3)', filter: 'blur(50px)', borderRadius: '50%' }} />
      <PhoneFrame width={520} height={920} tiltY={-6}><ScreenDashboard /></PhoneFrame>
    </div>

    {/* Floating doc cards */}
    {[
      { top: 530, left: 30, rot: -5, title: 'Steuerbescheid', sub: '📄 KI erkannt', c: K.primary },
      { top: 670, left: 630, rot: 4, title: 'Arztbrief', sub: '✓ Vereinfacht', c: '#10B981' },
      { top: 880, left: 30, rot: -3, title: 'Rechnung A1', sub: '⚠️ Frist: 5 Tage', c: APP.warning },
    ].map((fc, i) => (
      <div key={i} style={{ position: 'absolute', top: fc.top, left: fc.left, transform: `rotate(${fc.rot}deg)`, width: 200, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${fc.c}50`, backdropFilter: 'blur(20px)', padding: '12px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: K.text, marginBottom: 4 }}>{fc.title}</div>
        <div style={{ fontSize: 11, color: fc.c }}>{fc.sub}</div>
      </div>
    ))}

    {/* Bottom 2×2 feature pills */}
    <div style={{ position: 'absolute', bottom: 80, left: 60, right: 60, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {[{ i: '🤖', l: 'KI-Analyse' }, { i: '🩺', l: 'Befundassistent' }, { i: '⚖️', l: 'Widerspruch' }, { i: '🌍', l: '50 Sprachen' }].map(p => (
        <div key={p.l} style={{ borderRadius: 999, padding: '14px 20px', background: 'rgba(99,89,255,0.15)', border: `1px solid ${K.primary}`, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <span style={{ fontSize: 26 }}>{p.i}</span>
          <span style={{ fontSize: 26, fontWeight: 600, color: K.text }}>{p.l}</span>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

// ─── Exported compositions ────────────────────────────────────────────────────
export const PlaystoreImage1: React.FC = () => (
  <Layout headline={'Alle Dokumente.\nEin Ort.'} sub={'Behalte den Überblick über\nRechnungen, Verträge & mehr.'} badge={'📄 Dokumentenverwaltung'} badgeColor={'#6359FF'} screen={<ScreenDashboard />} />
);
export const PlaystoreImage2: React.FC = () => (
  <Layout headline={'Scannen.\nFertig.'} sub={'KI erkennt, kategorisiert und\narchiviert vollautomatisch.'} badge={'🤖 KI-Powered'} badgeColor={'#8B5CF6'} screen={<ScreenScan />} />
);
export const PlaystoreImage3: React.FC = () => (
  <Layout headline={'Medizin,\nverständlich.'} sub={'Befunde einfach erklärt —\nin über 50 Sprachen.'} badge={'🩺 Befundassistent'} badgeColor={'#10B981'} screen={<ScreenBefund />} />
);
export const PlaystoreImage4: React.FC = () => (
  <Layout headline={'Widerspruch?\nAutomatisch.'} sub={'KI erkennt anfechtbare Elemente\nund schreibt deinen Widerspruch.'} badge={'⚖️ Behörden Assistent'} badgeColor={'#F59E0B'} screen={<ScreenBehoerde />} />
);
export const PlaystoreImage5: React.FC = () => (
  <Layout
    headline={'Dein Dokument.\n50 Sprachen.'}
    sub={'Jedes Dokument sofort übersetzt —\nweltweit verständlich.'}
    badge={'🌍 50+ Sprachen'} badgeColor={'#3B82F6'}
    screen={<ScreenSprachen />}
    extraBottom={
      <div style={{ display: 'flex', gap: 10, marginTop: -10 }}>
        {['🇩🇪', '🇦🇹', '🇬🇧', '🇹🇷', '🇵🇱', '🇷🇺'].map(f => (
          <span key={f} style={{ fontSize: 38 }}>{f}</span>
        ))}
      </div>
    }
  />
);
export const PlaystoreImage6: React.FC = () => (
  <Layout headline={'Alle Postfächer.\nEine App.'} sub={'Gmail, Outlook, GMX, iCloud\nund Yahoo — alles verbunden.'} badge={'🔗 MCP Konnektoren'} badgeColor={'#6359FF'} screen={<ScreenMCP />} />
);
export const PlaystoreImage7: React.FC = () => (
  <Layout headline={'Eine Suche.\nAlle Quellen.'} sub={'Durchsuche Dokumente UND\nalle E-Mail-Postfächer gleichzeitig.'} badge={'🔍 Universalsuche'} badgeColor={'#EC4899'} screen={<ScreenSuche />} />
);
export const PlaystoreImage8: React.FC = () => <HeroImage />;
