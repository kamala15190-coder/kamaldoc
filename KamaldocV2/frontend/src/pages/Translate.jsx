import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useToast } from '../components/Toast';

const LANGS = [
  { name: 'English', code: 'EN' },
  { name: 'Türkçe', code: 'TR' },
  { name: 'العربية', code: 'AR' },
  { name: 'Français', code: 'FR' },
  { name: 'Italiano', code: 'IT' },
  { name: 'Hrvatski', code: 'HR' },
  { name: 'Español', code: 'ES' },
  { name: 'Polski', code: 'PL' },
];

export default function Translate() {
  const navigate = useNavigate();
  const toast = useToast();
  const [active, setActive] = useState('EN');

  return (
    <section className="screen tool-translate is-active" aria-label="Übersetzen">
      <TopBar title="Übersetzen" />

      <main className="tool-scroll">
        <div className="reveal" style={{ '--d': '0ms' }}>
          <p className="kicker amber">Tool · Übersetzung</p>
          <h1 className="display sm">In welche<br /><em>Sprache?</em></h1>
          <p className="lede">Das gesamte Dokument wird wortgetreu übertragen — inklusive Beträge, Datumsangaben und Behördenformulierungen.</p>
        </div>

        <div className="lang-from reveal" style={{ '--d': '80ms' }}>
          <span className="lf-label">Original</span>
          <span className="lf-value">Deutsch · automatisch erkannt</span>
        </div>

        <div className="lang-arrow reveal" style={{ '--d': '140ms' }}>↓</div>

        <div className="reveal" style={{ '--d': '200ms' }}>
          <p className="section-title-inline">Zielsprache</p>
        </div>

        <div className="lang-grid reveal" style={{ '--d': '260ms' }}>
          {LANGS.map((l) => (
            <button
              key={l.code}
              className={`lang-tile ${active === l.code ? 'active' : ''}`}
              onClick={() => setActive(l.code)}
            >
              {l.name}<span>{l.code}</span>
            </button>
          ))}
        </div>

        <button className="link-btn lg-link reveal" style={{ '--d': '320ms' }}>+ 42 weitere Sprachen anzeigen</button>

        <div className="bottom-pad" />
      </main>

      <div className="sticky-bar reveal" style={{ '--d': '380ms' }}>
        <button className="btn-primary lg" onClick={() => { toast.show('Übersetzung wird erstellt …'); setTimeout(() => navigate(-1), 800); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
          Auf {LANGS.find((l) => l.code === active)?.name} übersetzen
        </button>
      </div>
    </section>
  );
}
