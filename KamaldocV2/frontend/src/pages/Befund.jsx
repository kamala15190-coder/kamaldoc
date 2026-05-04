import TopBar from '../components/TopBar';

export default function Befund() {
  return (
    <section className="screen tool-befund is-active" aria-label="Befund">
      <TopBar title="Befund" />

      <main className="tool-scroll">
        <div className="reveal" style={{ '--d': '0ms' }}>
          <p className="kicker rose">Tool · Befund-Erklärung</p>
          <h1 className="display sm">Medizinisch<br /><em>verständlich.</em></h1>
          <p className="lede">Fachsprache wird in einfache Worte übersetzt. Ohne Diagnose — nur Verständnis.</p>
        </div>

        <div className="befund-output reveal" style={{ '--d': '80ms' }}>
          <div className="bo-section">
            <p className="bo-label">Was untersucht wurde</p>
            <p className="bo-text">Eine MRT-Aufnahme deiner <strong>linken Schulter</strong>. Ziel: prüfen, woher die Schmerzen kommen.</p>
          </div>
          <div className="bo-section">
            <p className="bo-label">Was gefunden wurde</p>
            <p className="bo-text">Eine kleine Reizung der Sehne, die deinen Oberarm hebt (<strong>Supraspinatus</strong>). Kein Riss, keine ernsthafte Verletzung.</p>
          </div>
          <div className="bo-section">
            <p className="bo-label">Was das bedeutet</p>
            <p className="bo-text">Mit Schonung und Physio meist in 4–6 Wochen wieder gut. Dein Arzt entscheidet die nächsten Schritte.</p>
          </div>
        </div>

        <div className="reveal" style={{ '--d': '160ms' }}>
          <p className="section-title-inline">Erklärung in einer anderen Sprache?</p>
        </div>

        <div className="lang-grid compact reveal" style={{ '--d': '220ms' }}>
          <button className="lang-tile">English<span>EN</span></button>
          <button className="lang-tile">Türkçe<span>TR</span></button>
          <button className="lang-tile">العربية<span>AR</span></button>
          <button className="lang-tile">Français<span>FR</span></button>
          <button className="lang-tile more">+46</button>
        </div>

        <div className="bottom-pad" />
      </main>

      <div className="sticky-bar reveal" style={{ '--d': '300ms' }}>
        <button className="btn-ghost lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 15v6M15 15v6M9 3l3 3 3-3M12 6v12" /></svg>
          Als PDF speichern
        </button>
      </div>
    </section>
  );
}
