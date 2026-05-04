import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';

const ACTIONS = [
  { id: 'tasks-extract', name: 'Aufgaben übernehmen', sub: '3 erkannt', icon: 'check' },
  { id: 'translate', name: 'Übersetzen', sub: '50 Sprachen', icon: 'lang' },
  { id: 'reply', name: 'Antwort schreiben', sub: '5 Themen erkannt', icon: 'pen' },
  { id: 'befund', name: 'Befund erklären', sub: 'Einfache Sprache', icon: 'health' },
  { id: 'rechtshilfe', name: 'Rechtshilfe', sub: 'AT · CH · DE', icon: 'legal' },
  { id: 'phishing', name: 'Phishing prüfen', sub: 'Sicherheits-Check', icon: 'shield' },
];

export default function Detail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const goAction = (actionId) => {
    if (actionId === 'phishing') return navigate('/phishing');
    navigate(`/${actionId}/${id || 'mock'}`);
  };

  return (
    <section className="screen detail is-active" aria-label="Dokument">
      <TopBar title="Rechnung" transparent />

      <main className="detail-scroll">
        <div className="doc-hero reveal" style={{ '--d': '0ms' }}>
          <div className="paper">
            <div className="paper-line w70" /><div className="paper-line w90" />
            <div className="paper-line w50" /><div className="paper-block" />
            <div className="paper-line w80" /><div className="paper-line w65" />
            <div className="paper-stamp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
          </div>
          <div className="doc-glow" />
        </div>

        <div className="doc-meta reveal" style={{ '--d': '80ms' }}>
          <p className="kicker amber">Rechnung · Stadtwerke Wien</p>
          <h1 className="display sm">€ 184<em>,20</em></h1>
          <p className="lede">
            Stromabrechnung Q1 — fällig <strong>15. Mai</strong>.
            Lastschrift erteilt, Betrag wird automatisch eingezogen.
          </p>
        </div>

        <dl className="facts reveal" style={{ '--d': '160ms' }}>
          <div className="fact"><dt>Absender</dt><dd>Wien Energie Vertrieb GmbH</dd></div>
          <div className="fact"><dt>Rechnungs-Nr.</dt><dd>2026-04-A-39812</dd></div>
          <div className="fact"><dt>Zeitraum</dt><dd>01.01.2026 – 31.03.2026</dd></div>
          <div className="fact"><dt>IBAN</dt><dd className="mono">AT12 3200 0009 ••• 3041</dd></div>
        </dl>

        <div className="ai-card reveal" style={{ '--d': '240ms' }}>
          <div className="ai-head">
            <span className="ai-spark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>
            </span>
            <span>kdoc · Zusammenfassung</span>
          </div>
          <p>
            Diese Rechnung ist <strong>höher als üblich</strong> (+18 % zum Vorjahr).
            Vermutlich wegen Wintermonate. Keine Aktion nötig — Lastschrift greift am Stichtag.
          </p>
        </div>

        <div className="reveal" style={{ '--d': '300ms' }}>
          <h3 className="section-title-inline">Was möchtest du tun?</h3>
        </div>

        <div className="actions-grid reveal" style={{ '--d': '360ms' }}>
          {ACTIONS.map((a) => (
            <button key={a.id} className="action-card" onClick={() => goAction(a.id)}>
              <span className="ac-glyph"><ActionIcon name={a.icon} /></span>
              <span className="ac-name">{a.name}</span>
              <span className="ac-sub">{a.sub}</span>
            </button>
          ))}
        </div>

        <div className="bottom-pad" />
      </main>
    </section>
  );
}

function ActionIcon({ name }) {
  const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'check') return <svg viewBox="0 0 24 24" {...c}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
  if (name === 'lang') return <svg viewBox="0 0 24 24" {...c}><path d="M5 8h14M9 4h10M5 16h10M9 20h10M3 12h18" /></svg>;
  if (name === 'pen') return <svg viewBox="0 0 24 24" {...c}><path d="M3 21v-7a8 8 0 0 1 16 0v7" /><path d="M3 14h4v7H3zM15 14h4v7h-4z" /></svg>;
  if (name === 'health') return <svg viewBox="0 0 24 24" {...c}><path d="M19 14c1.5-2 3-3.5 3-6a4 4 0 1 0-8 0c0 2.5 1.5 4 3 6 .5.7.7 1.5.7 2.5 0 1.5-1.2 2.5-2.7 2.5" /><circle cx="9" cy="14" r="3" /></svg>;
  if (name === 'legal') return <svg viewBox="0 0 24 24" {...c}><path d="M12 3v18M5 8h14M5 16h14" /><path d="M3 21h18" /></svg>;
  if (name === 'shield') return <svg viewBox="0 0 24 24" {...c}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
  return null;
}
