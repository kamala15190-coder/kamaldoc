import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NutzungsbedingungenPage() {
  const sectionStyle = { marginBottom: 20 };
  const h2Style = { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' };
  const pStyle = { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 4px' };
  const ulStyle = { paddingLeft: 20, margin: '4px 0 0', display: 'flex', flexDirection: 'column', gap: 3 };
  const liStyle = { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent-solid)', fontWeight: 600, fontSize: 14, textDecoration: 'none', marginBottom: 20 }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Zurück zum Login
        </Link>

        <div className="glass-card animate-fade-in-up" style={{ padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>NUTZUNGSBEDINGUNGEN — KDoc</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 24px' }}>Stand: März 2026</p>

          <div>
            <section style={sectionStyle}>
              <h2 style={h2Style}>1. Geltungsbereich</h2>
              <p style={pStyle}>KDoc ist ein digitales Produkt von <strong>Schulbox E.U.</strong> Diese Nutzungsbedingungen regeln die Nutzung der Plattform KDoc.</p>
              <p style={pStyle}>
                Schulbox E.U.<br />
                Inhaber: Ahmed Kamal El Din<br />
                Exlwöhr 57, 4871 Vöcklamarkt, Österreich<br />
                Tel.: +43 660 618 96 36<br />
                E-Mail: office@kdoc.at<br />
                UID: ATU82131159<br />
                GISA-Zahl: 38254253
              </p>
            </section>
            <section style={sectionStyle}><h2 style={h2Style}>2. Leistungsbeschreibung</h2><p style={pStyle}>Dokumentenverwaltung, KI-Analyse, Deadline-Wächter, Ausgaben-Tracking, Behörden-Assistent, Befund-Assistent</p></section>
            <section style={sectionStyle}><h2 style={h2Style}>3. Nutzungspflichten</h2><ul style={ulStyle}><li style={liStyle}>Nur eigene Dokumente hochladen</li><li style={liStyle}>Keine illegale Nutzung</li><li style={liStyle}>Keine Schadsoftware</li><li style={liStyle}>Zugangsdaten nicht weitergeben</li></ul></section>
            <section style={sectionStyle}><h2 style={h2Style}>4. Haftungsausschluss</h2><p style={pStyle}>KI-Inhalte unverbindlich, kein Ersatz für Rechts-/Steuer-/Medizinberatung. Keine Garantie für vollständige Datenwiederherstellung.</p></section>
            <section style={sectionStyle}><h2 style={h2Style}>5. Geistiges Eigentum</h2><p style={pStyle}>KDoc ist ein Produkt von Schulbox E.U. Alle Rechte an der Plattform, Software und dem zugehörigen Design verbleiben bei Schulbox E.U. Der Nutzer erhält eine persönliche, nicht übertragbare Lizenz zur Nutzung der App.</p></section>
            <section style={sectionStyle}><h2 style={h2Style}>6. Kündigung</h2><p style={pStyle}>Jederzeit möglich. Alle Daten werden unwiderruflich gelöscht.</p></section>
            <section style={sectionStyle}><h2 style={h2Style}>7. Anwendbares Recht</h2><p style={pStyle}>Österreichisches Recht. Gerichtsstand: Vöcklabruck.</p></section>
            <section style={sectionStyle}>
              <h2 style={h2Style}>8. Kontakt</h2>
              <p style={pStyle}>
                Schulbox E.U. — Inhaber: Ahmed Kamal El Din<br />
                Exlwöhr 57, 4871 Vöcklamarkt, Österreich<br />
                Tel.: +43 660 618 96 36<br />
                E-Mail: office@kdoc.at
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
