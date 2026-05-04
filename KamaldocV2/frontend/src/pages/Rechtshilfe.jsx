import { useState } from 'react';
import TopBar from '../components/TopBar';

export default function Rechtshilfe() {
  const [country, setCountry] = useState('AT');

  return (
    <section className="screen tool-rechtshilfe is-active" aria-label="Rechtshilfe">
      <TopBar title="Rechtshilfe" />

      <main className="tool-scroll">
        <div className="reveal" style={{ '--d': '0ms' }}>
          <p className="kicker amber">Tool · kdoc-Rechtshilfe</p>
          <h1 className="display sm">Welches<br /><em>Recht?</em></h1>
          <p className="lede">Das Dokument wird auf Konformität geprüft. Anfechtbare Stellen werden markiert.</p>
        </div>

        <div className="country-row reveal" style={{ '--d': '80ms' }}>
          {[
            { code: 'AT', flag: '🇦🇹', name: 'Österreich' },
            { code: 'DE', flag: '🇩🇪', name: 'Deutschland' },
            { code: 'CH', flag: '🇨🇭', name: 'Schweiz' },
          ].map((c) => (
            <button key={c.code} className={`country-tile ${country === c.code ? 'active' : ''}`} onClick={() => setCountry(c.code)}>
              <span className="ct-flag">{c.flag}</span>
              <span className="ct-name">{c.name}</span>
            </button>
          ))}
        </div>

        <div className="reveal" style={{ '--d': '160ms' }}>
          <p className="section-title-inline">Konformitäts-Score</p>
        </div>

        <div className="rh-score reveal" style={{ '--d': '220ms' }}>
          <div className="rh-score-bar">
            <div className="rh-score-fill" style={{ '--score': '78%' }} />
          </div>
          <div className="rh-score-meta">
            <span className="rh-score-label">Weitgehend konform</span>
            <span className="rh-score-value">78<small>/100</small></span>
          </div>
        </div>

        <div className="reveal" style={{ '--d': '280ms' }}>
          <p className="section-title-inline">Anfechtbare Elemente</p>
        </div>

        <ul className="rh-issues">
          <li className="rh-issue reveal" style={{ '--d': '340ms' }}>
            <span className="ri-mark warn">!</span>
            <div>
              <p className="ri-title">Rückzahlungsfrist</p>
              <p className="ri-text">14 Tage sind kürzer als § 1417 ABGB üblich (4 Wochen). Anfechtbar.</p>
            </div>
          </li>
          <li className="rh-issue reveal" style={{ '--d': '400ms' }}>
            <span className="ri-mark warn">!</span>
            <div>
              <p className="ri-title">Zinssatz</p>
              <p className="ri-text">9,2 % p. a. liegt über dem branchenüblichen Höchstsatz (8,58 %).</p>
            </div>
          </li>
          <li className="rh-issue reveal" style={{ '--d': '460ms' }}>
            <span className="ri-mark ok">✓</span>
            <div>
              <p className="ri-title">Widerrufsbelehrung</p>
              <p className="ri-text">Vorhanden und korrekt formuliert.</p>
            </div>
          </li>
        </ul>

        <div className="bottom-pad" />
      </main>

      <div className="sticky-bar reveal" style={{ '--d': '520ms' }}>
        <button className="btn-primary lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4z" /></svg>
          Anfechtungs-Schreiben generieren
        </button>
      </div>
    </section>
  );
}
