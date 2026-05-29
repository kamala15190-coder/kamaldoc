import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function ImpressumPage() {
  const sectionStyle = { marginBottom: 20 };
  const h2Style = { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' };
  const pStyle = { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 4px' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent-solid)', fontWeight: 600, fontSize: 14, textDecoration: 'none', marginBottom: 20 }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Zurück zum Login
        </Link>

        <div className="glass-card animate-fade-in-up" style={{ padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>IMPRESSUM</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 24px' }}>Stand: März 2026</p>

          <div>
            {/* §1 Medieninhaber und Herausgeber */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>Medieninhaber und Herausgeber</h2>
              <p style={pStyle}>
                <strong>Schulbox E.U.</strong><br />
                Inhaber: Ahmed Kamal El Din<br />
                Exlwöhr 57<br />
                4871 Vöcklamarkt<br />
                Österreich
              </p>
              <p style={pStyle}>
                Tel.: +43 660 618 96 36<br />
                E-Mail: <a href="mailto:office@kdoc.at" style={{ color: 'var(--accent-solid)' }}>office@kdoc.at</a>
              </p>
              <p style={pStyle}>
                UID-Nummer: ATU82131159<br />
                GISA-Zahl: 38254253
              </p>
            </section>

            {/* §2 Unternehmensgegenstand */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>Unternehmensgegenstand</h2>
              <p style={pStyle}>
                KDoc ist ein digitales Produkt von Schulbox E.U. Die Plattform bietet KI-gestützte Dokumentenverwaltung, Analyse, Übersetzung und Fristenverwaltung für Privatpersonen.
              </p>
              <p style={pStyle}>
                Gewerbewortlaut: Handelsgewerbe mit Ausnahme der reglementierten Handelsgewerbe
              </p>
            </section>

            {/* §3 Kammerzugehörigkeit */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>Kammerzugehörigkeit</h2>
              <p style={pStyle}>
                Wirtschaftskammer Oberösterreich<br />
                Sparte Information und Consulting
              </p>
            </section>

            {/* §4 Aufsichtsbehörde */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>Gewerbebehörde</h2>
              <p style={pStyle}>
                Bezirkshauptmannschaft Vöcklabruck<br />
                Hatschekstraße 8, 4840 Vöcklabruck, Österreich
              </p>
            </section>

            {/* §5 Anwendbare Rechtsvorschriften */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>Anwendbare Rechtsvorschriften</h2>
              <p style={pStyle}>
                Gewerbeordnung 1994 (GewO 1994) — abrufbar unter{' '}
                <a href="https://www.ris.bka.gv.at" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-solid)' }}>ris.bka.gv.at</a>
              </p>
            </section>

            {/* §6 Online-Streitbeilegung */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>Online-Streitbeilegung (OS)</h2>
              <p style={pStyle}>
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-solid)' }}>ec.europa.eu/consumers/odr</a>
              </p>
              <p style={pStyle}>
                Schulbox E.U. ist weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>

            {/* §7 Urheberrecht */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>Urheberrecht</h2>
              <p style={pStyle}>
                Alle Inhalte dieser Plattform (Texte, Grafiken, Logos, Software) sind urheberrechtlich geschützt und Eigentum von Schulbox E.U., soweit nicht ausdrücklich anders angegeben. Die Vervielfältigung, Verbreitung oder sonstige Nutzung ohne ausdrückliche schriftliche Genehmigung ist untersagt.
              </p>
            </section>

            {/* §8 Haftungsausschluss für externe Links */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>Haftung für Links</h2>
              <p style={pStyle}>
                Diese Website enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar.
              </p>
            </section>

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-glass)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                © {new Date().getFullYear()} KDoc — Schulbox E.U. — Alle Rechte vorbehalten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
