import { useEffect, useRef, useState } from 'react';
import TopBar from '../components/TopBar';

const TARGET_SCORE = 18;
const TARGET_NEEDLE = '18%';

export default function Phishing() {
  const [score, setScore] = useState(0);
  const needleRef = useRef(null);

  useEffect(() => {
    if (needleRef.current) needleRef.current.style.setProperty('--needle-pos', TARGET_NEEDLE);
    const start = performance.now();
    const dur = 1600;
    let raf;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setScore(Math.round(TARGET_SCORE * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="screen phishing is-active" aria-label="Phishing-Prüfung">
      <TopBar title="Phishing-Prüfung" transparent />

      <main className="phishing-scroll">
        <div className="reveal" style={{ '--d': '0ms' }}>
          <p className="kicker rose">Tool · Sicherheits-Check</p>
          <h1 className="display sm">Risiko-<br /><em>Einschätzung.</em></h1>
        </div>

        <div className="meter reveal" style={{ '--d': '120ms' }}>
          <div className="meter-labels">
            <span className="meter-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              Phishing
            </span>
            <span className="meter-right">
              Sicher
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            </span>
          </div>

          <div className="meter-track">
            <div className="meter-gradient" />
            <div className="meter-needle" ref={needleRef}>
              <span className="needle-line" />
              <span className="needle-bubble">
                <span className="nb-label">Wahrscheinlich Phishing</span>
                <span className="nb-value">{score}%</span>
              </span>
            </div>
          </div>

          <div className="meter-scale">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
        </div>

        <div className="phishing-alert reveal" style={{ '--d': '1300ms' }}>
          <span className="pa-icon">!</span>
          <div>
            <p className="pa-title">Achtung — Hinweise auf Phishing</p>
            <p className="pa-sub">3 Indikatoren erkannt. Klick keine Links und antworte nicht auf den Absender.</p>
          </div>
        </div>

        <div className="reveal" style={{ '--d': '1450ms' }}>
          <p className="section-title-inline">So kam diese Einschätzung zustande</p>
        </div>

        <ul className="phishing-flags">
          <li className="flag red reveal" style={{ '--d': '1520ms' }}>
            <span className="fl-mark">⚠</span>
            <div>
              <p className="fl-title">Absender-Domain weicht ab</p>
              <p className="fl-text"><span className="mono">post@bankkund3n-service.com</span> · echte Domain wäre <span className="mono">@meinebank.at</span></p>
            </div>
          </li>
          <li className="flag red reveal" style={{ '--d': '1600ms' }}>
            <span className="fl-mark">⚠</span>
            <div>
              <p className="fl-title">Druckaufbau durch Frist</p>
              <p className="fl-text">Formulierung „Konto wird in 24 h gesperrt" ist klassisches Social-Engineering-Muster.</p>
            </div>
          </li>
          <li className="flag red reveal" style={{ '--d': '1680ms' }}>
            <span className="fl-mark">⚠</span>
            <div>
              <p className="fl-title">Verdächtiger Link</p>
              <p className="fl-text">Verlinkt auf <span className="mono">tinyurl.com/meinebank-login</span> statt auf die offizielle Domain.</p>
            </div>
          </li>
          <li className="flag green reveal" style={{ '--d': '1760ms' }}>
            <span className="fl-mark">✓</span>
            <div>
              <p className="fl-title">Anrede ist persönlich</p>
              <p className="fl-text">Dein voller Name ist enthalten — das spricht eher gegen Massen-Phishing.</p>
            </div>
          </li>
        </ul>

        <div className="bottom-pad" />
      </main>

      <div className="sticky-bar reveal" style={{ '--d': '1840ms' }}>
        <button className="btn-primary lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
          Als Phishing melden
        </button>
      </div>
    </section>
  );
}
