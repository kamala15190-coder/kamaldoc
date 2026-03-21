import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function DatenschutzPage() {
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
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>DATENSCHUTZERKLÄRUNG — KamalDoc</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 24px' }}>Stand: März 2026</p>

          <div>
            <section style={sectionStyle}><h2 style={h2Style}>1. Verantwortlicher</h2><p style={pStyle}>Ahmed Kamal el din, Exlwöhr 57, 4871 Vöcklamarkt, Österreich<br />E-Mail: office@kdoc.at</p></section>
            <section style={sectionStyle}><h2 style={h2Style}>2. Welche Daten wir erheben</h2><ul style={ulStyle}><li style={liStyle}><strong>Kontodaten:</strong> E-Mail-Adresse, Name und Profilbild (bei Google-Login)</li><li style={liStyle}><strong>Hochgeladene Dokumente:</strong> Bilder und PDFs, extrahierter Text, KI-Analysen</li><li style={liStyle}><strong>Technische Daten:</strong> IP-Adresse, Geräteinformationen, Push-Notification Token</li></ul></section>
            <section style={sectionStyle}><h2 style={h2Style}>3. Zweck der Datenverarbeitung</h2><ul style={ulStyle}><li style={liStyle}>Bereitstellung der App-Funktionen</li><li style={liStyle}>Authentifizierung und Kontosicherheit</li><li style={liStyle}>Push-Benachrichtigungen bei Deadlines</li><li style={liStyle}>Technischer Betrieb und Sicherheit</li></ul></section>
            <section style={sectionStyle}><h2 style={h2Style}>4. Rechtsgrundlage (DSGVO)</h2><p style={pStyle}>Art. 6 Abs. 1 lit. b, a, f DSGVO</p></section>
            <section style={sectionStyle}><h2 style={h2Style}>5. Drittanbieter</h2><ul style={ulStyle}><li style={liStyle}><strong>Supabase</strong> (Datenbank/Auth, USA, DSGVO-konform)</li><li style={liStyle}><strong>Google OAuth</strong> (Login, USA, DSGVO-konform)</li><li style={liStyle}><strong>Mistral AI</strong> (KI-Analyse, Frankreich/EU, DSGVO-konform)</li><li style={liStyle}><strong>Hetzner Online</strong> (Server, Deutschland, DSGVO-konform)</li><li style={liStyle}><strong>Vercel</strong> (Web-Hosting, USA, DSGVO-konform)</li></ul></section>
            <section style={sectionStyle}><h2 style={h2Style}>6. Speicherdauer</h2><p style={pStyle}>Kontodaten bis Accountlöschung, Dokumente bis manuelle Löschung, Logs 30 Tage</p></section>
            <section style={sectionStyle}><h2 style={h2Style}>7. Ihre Rechte (DSGVO)</h2><p style={pStyle}>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch</p><p style={pStyle}>Beschwerde: <a href="https://dsb.gv.at" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-solid)' }}>dsb.gv.at</a> — Kontakt: office@kdoc.at</p></section>
            <section style={sectionStyle}><h2 style={h2Style}>8. Datensicherheit</h2><p style={pStyle}>HTTPS/TLS, keine Klartext-Passwörter, User-Isolation, Hetzner Deutschland, regelmäßige Updates</p></section>
            <section style={sectionStyle}><h2 style={h2Style}>9. Kinder</h2><p style={pStyle}>Nicht für unter 16-Jährige</p></section>
            <section style={sectionStyle}><h2 style={h2Style}>10. Kontakt</h2><p style={pStyle}>Ahmed Kamal el din, office@kdoc.at, Exlwöhr 57, 4871 Vöcklamarkt</p></section>
          </div>
        </div>
      </div>
    </div>
  )
}
