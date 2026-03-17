import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function AGBPage() {
  const sectionStyle = { marginBottom: 24 };
  const h2Style = { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' };
  const h3Style = { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '12px 0 6px' };
  const pStyle = { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, margin: '0 0 6px' };
  const ulStyle = { paddingLeft: 20, margin: '6px 0 6px', display: 'flex', flexDirection: 'column', gap: 4 };
  const liStyle = { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 };
  const strongStyle = { color: 'var(--text-primary)', fontWeight: 600 };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent-solid)', fontWeight: 600, fontSize: 14, textDecoration: 'none', marginBottom: 20 }}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Zurück zum Login
        </Link>

        <div className="glass-card animate-fade-in-up" style={{ padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            ALLGEMEINE GESCHÄFTSBEDINGUNGEN (AGB) — KamalDoc
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 24px' }}>Stand: März 2026</p>

          <div>
            {/* §1 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 1 Geltungsbereich und Vertragsgegenstand</h2>
              <p style={pStyle}>
                (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB") gelten für sämtliche Leistungen, die über die Plattform KamalDoc (nachfolgend „KDoc", „die App", „die Plattform" oder „der Dienst") bereitgestellt werden. Betreiber ist Ahmed Kamal el din, Exlwöhr 57, 4871 Vöcklamarkt, Österreich (nachfolgend „Betreiber", „wir" oder „uns").
              </p>
              <p style={pStyle}>
                (2) KDoc ist eine KI-gestützte Plattform zur digitalen Dokumentenverwaltung, die es Nutzern ermöglicht, Dokumente hochzuladen, mittels künstlicher Intelligenz analysieren, kategorisieren, übersetzen und zusammenfassen zu lassen sowie Fristen zu verwalten und Ausgaben zu tracken.
              </p>
              <p style={pStyle}>
                (3) Mit der Registrierung bzw. Nutzung der App akzeptiert der Nutzer (nachfolgend „Nutzer" oder „Sie") diese AGB vollumfänglich. Die Nutzung ist nur zulässig, wenn der Nutzer diesen AGB ausdrücklich zugestimmt hat.
              </p>
              <p style={pStyle}>
                (4) Abweichende oder ergänzende Bedingungen des Nutzers werden nicht anerkannt, es sei denn, der Betreiber stimmt diesen ausdrücklich schriftlich zu.
              </p>
            </section>

            {/* §2 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 2 Besondere Hinweise zur Art der hochgeladenen Dokumente</h2>
              <p style={{...pStyle, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)'}}>
                <strong style={{color: '#fbbf24'}}>WICHTIGER HINWEIS:</strong> KDoc ist darauf ausgelegt, dass Nutzer potenziell <strong style={strongStyle}>höchst vertrauliche und sensible Dokumente</strong> hochladen, darunter insbesondere:
              </p>
              <ul style={ulStyle}>
                <li style={liStyle}><strong style={strongStyle}>Medizinische Befunde und Arztbriefe</strong> (z. B. Diagnosen, Laborergebnisse, ärztliche Gutachten, Entlassungsberichte)</li>
                <li style={liStyle}><strong style={strongStyle}>Behördliche und rechtliche Dokumente</strong> (z. B. Bescheide, Steuerbescheide, Gerichtsschreiben, Verträge, Mahnungen)</li>
                <li style={liStyle}><strong style={strongStyle}>Finanzielle Unterlagen</strong> (z. B. Rechnungen, Lohnzettel, Kontoauszüge, Steuererklärungen)</li>
                <li style={liStyle}><strong style={strongStyle}>Persönliche Korrespondenz</strong> (z. B. Briefe, Verträge, Versicherungsunterlagen)</li>
              </ul>
              <p style={pStyle}>
                (1) Dem Nutzer muss bewusst sein, dass er mit dem Hochladen solcher Dokumente <strong style={strongStyle}>höchst streng vertrauliche personenbezogene Daten</strong> – einschließlich besonderer Kategorien personenbezogener Daten im Sinne von Art. 9 DSGVO (Gesundheitsdaten) – in die Plattform eingibt.
              </p>
              <p style={pStyle}>
                (2) Der Nutzer erklärt mit der Nutzung der App, dass er sich der Sensibilität dieser Daten vollumfänglich bewusst ist und die Verantwortung für das Hochladen dieser Dokumente selbst trägt.
              </p>
              <p style={pStyle}>
                (3) Der Nutzer darf <strong style={strongStyle}>ausschließlich eigene Dokumente</strong> oder solche, für die er eine ausdrückliche Einwilligung des betroffenen Dritten hat, hochladen. Das Hochladen von Dokumenten Dritter ohne deren Einwilligung ist strengstens untersagt und kann zivil- und strafrechtliche Konsequenzen haben.
              </p>
            </section>

            {/* §3 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 3 Datenspeicherung und Infrastruktur</h2>
              <h3 style={h3Style}>3.1 Speicherort der Daten</h3>
              <p style={pStyle}>
                (1) Sämtliche vom Nutzer hochgeladene Dokumente, Bilder, extrahierte Texte, KI-generierte Analysen und Metadaten werden auf dedizierten Servern bei <strong style={strongStyle}>Hetzner Online GmbH</strong>, Industriestr. 25, 91710 Gunzenhausen, Deutschland, gespeichert.
              </p>
              <p style={pStyle}>
                (2) Hetzner betreibt ISO 27001-zertifizierte Rechenzentren ausschließlich in <strong style={strongStyle}>Deutschland und Finnland (EU)</strong>. Die Datenverarbeitung erfolgt damit vollständig innerhalb des Europäischen Wirtschaftsraums (EWR) und unterliegt der DSGVO.
              </p>
              <p style={pStyle}>
                (3) Die Verbindung zwischen der App und den Hetzner-Servern ist durchgängig mit <strong style={strongStyle}>TLS/HTTPS</strong> verschlüsselt. Der Zugriff auf die Server ist ausschließlich dem Betreiber vorbehalten und durch SSH-Schlüssel sowie Firewalls gesichert.
              </p>
              <p style={pStyle}>
                (4) Die Datenbank (Supabase) wird ebenfalls auf EU-Servern gehostet. Nutzerkonten, Metadaten und Verknüpfungen werden dort verwaltet.
              </p>

              <h3 style={h3Style}>3.2 Kurzzeitige Datenübermittlung an KI-Dienste (together.ai)</h3>
              <p style={{...pStyle, padding: '10px 14px', borderRadius: 10, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)'}}>
                <strong style={{color: 'var(--accent-solid)'}}>WICHTIG – Drittlandübermittlung:</strong> Für die KI-gestützte Analyse, Zusammenfassung, Vereinfachung und Übersetzung von Dokumenten werden die relevanten Textinhalte <strong style={strongStyle}>kurzzeitig</strong> an den KI-Dienst <strong style={strongStyle}>together.ai</strong> (Together AI, Inc., San Francisco, USA) übermittelt.
              </p>
              <p style={pStyle}>
                (1) <strong style={strongStyle}>Art der übermittelten Daten:</strong> Es werden ausschließlich die aus den Dokumenten extrahierten Textinhalte (OCR-Text) an together.ai gesendet — keine Originaldateien, keine Bilddaten, keine Kontodaten des Nutzers.
              </p>
              <p style={pStyle}>
                (2) <strong style={strongStyle}>Zweck der Übermittlung:</strong> Die Übermittlung dient ausschließlich der Verarbeitung durch ein KI-Sprachmodell (Large Language Model), um dem Nutzer folgende Funktionen bereitzustellen: Dokumentenanalyse und -kategorisierung, Textvereinfachung (z. B. medizinische Befunde), Übersetzung in andere Sprachen, Erkennung von Fristen und handlungsrelevanten Inhalten, Generierung von Antwortbriefen, behördliche Erklärungen und rechtliche Einschätzungen.
              </p>
              <p style={pStyle}>
                (3) <strong style={strongStyle}>Dauer der Verarbeitung:</strong> Die Daten werden von together.ai ausschließlich für die Dauer der jeweiligen API-Anfrage verarbeitet (typischerweise wenige Sekunden). Together.ai speichert laut deren Data Processing Agreement <strong style={strongStyle}>keine Nutzerdaten dauerhaft</strong> und verwendet diese nicht zum Training eigener Modelle.
              </p>
              <p style={pStyle}>
                (4) <strong style={strongStyle}>Rechtsgrundlage:</strong> Die Übermittlung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie der ausdrücklichen Einwilligung des Nutzers gemäß Art. 49 Abs. 1 lit. a DSGVO für die Drittlandübermittlung in die USA. Der Nutzer willigt mit Akzeptanz dieser AGB in diese Übermittlung ein.
              </p>
              <p style={pStyle}>
                (5) <strong style={strongStyle}>Sicherheitsmaßnahmen:</strong> Die Kommunikation mit together.ai erfolgt ausschließlich über verschlüsselte HTTPS/TLS-Verbindungen. API-Schlüssel werden serverseitig gespeichert und niemals an den Client übermittelt.
              </p>
              <p style={pStyle}>
                (6) Der Nutzer hat jederzeit die Möglichkeit, auf die KI-Funktionen zu verzichten, indem er die entsprechenden Funktionen nicht nutzt. In diesem Fall werden keine Daten an together.ai übermittelt.
              </p>
            </section>

            {/* §4 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 4 Registrierung und Nutzerkonto</h2>
              <p style={pStyle}>
                (1) Die Nutzung von KDoc erfordert die Erstellung eines Nutzerkontos. Die Registrierung erfolgt per E-Mail und Passwort oder über Google OAuth.
              </p>
              <p style={pStyle}>
                (2) Der Nutzer ist verpflichtet, bei der Registrierung wahrheitsgemäße Angaben zu machen und seine Zugangsdaten geheim zu halten. Der Nutzer haftet für sämtliche Aktivitäten, die unter seinem Konto stattfinden.
              </p>
              <p style={pStyle}>
                (3) Der Nutzer muss mindestens 16 Jahre alt sein, um KDoc nutzen zu dürfen.
              </p>
              <p style={pStyle}>
                (4) Der Betreiber behält sich das Recht vor, Nutzerkonten bei Verstößen gegen diese AGB ohne Vorankündigung zu sperren oder zu löschen.
              </p>
            </section>

            {/* §5 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 5 Leistungsumfang und Verfügbarkeit</h2>
              <p style={pStyle}>
                (1) KDoc stellt folgende Kernfunktionen bereit: Dokumenten-Upload (Foto, Kamera, PDF), KI-gestützte Textextraktion und Analyse, automatische Kategorisierung und Fristenerkennung, Befund-Assistent (Vereinfachung medizinischer Texte), Behörden-Assistent (Erklärung und Widerspruch bei behördlichen Dokumenten), Ausgaben-Tracking, Erinnerungsfunktionen, Archivierung.
              </p>
              <p style={pStyle}>
                (2) Der Betreiber bemüht sich um eine möglichst hohe Verfügbarkeit der Plattform, übernimmt jedoch <strong style={strongStyle}>keine Garantie für eine ununterbrochene Verfügbarkeit</strong>. Wartungsarbeiten, Updates und technische Störungen können zu vorübergehenden Einschränkungen führen.
              </p>
              <p style={pStyle}>
                (3) Der Betreiber behält sich vor, den Funktionsumfang jederzeit zu ändern, zu erweitern oder einzuschränken, sofern dies für den Nutzer zumutbar ist.
              </p>
            </section>

            {/* §6 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 6 Abonnements, Preise und Zahlung</h2>
              <p style={pStyle}>
                (1) KDoc bietet verschiedene Abonnement-Stufen an (Free, Basic, Pro), deren jeweiliger Funktionsumfang auf der Pricing-Seite der App einsehbar ist.
              </p>
              <p style={pStyle}>
                (2) Kostenpflichtige Abonnements werden über den Zahlungsdienstleister <strong style={strongStyle}>Stripe</strong> (Stripe, Inc.) abgewickelt. Stripe verarbeitet Zahlungsdaten gemäß PCI-DSS-Standards. KDoc speichert keine Kreditkarten- oder Bankdaten.
              </p>
              <p style={pStyle}>
                (3) Die angegebenen Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer, sofern anwendbar.
              </p>
              <p style={pStyle}>
                (4) Kostenpflichtige Abonnements verlängern sich automatisch um den jeweiligen Abrechnungszeitraum, sofern sie nicht vor Ablauf gekündigt werden.
              </p>
              <p style={pStyle}>
                (5) Eine Kündigung ist jederzeit zum Ende des aktuellen Abrechnungszeitraums möglich. Bereits gezahlte Beträge für den laufenden Zeitraum werden nicht erstattet.
              </p>
            </section>

            {/* §7 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 7 Haftungsausschluss und Haftungsbeschränkung</h2>
              <p style={{...pStyle, padding: '10px 14px', borderRadius: 10, background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.15)'}}>
                <strong style={{color: '#ef4444'}}>WICHTIGER HAFTUNGSHINWEIS:</strong> Die folgenden Ausschlüsse und Beschränkungen sind wesentlicher Bestandteil dieser AGB.
              </p>

              <h3 style={h3Style}>7.1 Keine Rechts-, Steuer- oder Medizinberatung</h3>
              <p style={pStyle}>
                (1) Die durch KDoc mittels künstlicher Intelligenz generierten Inhalte — einschließlich, aber nicht beschränkt auf Dokumentenanalysen, Zusammenfassungen, Vereinfachungen medizinischer Befunde, rechtliche Einschätzungen, behördliche Erklärungen, Widerspruchsentwürfe und Antwortbriefe — stellen <strong style={strongStyle}>ausdrücklich keine Rechtsberatung, Steuerberatung, medizinische Beratung oder sonstige professionelle Beratung</strong> dar.
              </p>
              <p style={pStyle}>
                (2) KI-generierte Inhalte dienen ausschließlich der <strong style={strongStyle}>Information und Orientierung</strong>. Sie können fehlerhaft, unvollständig oder veraltet sein. Der Nutzer ist verpflichtet, bei rechtlichen, steuerlichen oder medizinischen Angelegenheiten stets qualifizierte Fachpersonen (Rechtsanwalt, Steuerberater, Arzt) zu konsultieren.
              </p>
              <p style={pStyle}>
                (3) Der Betreiber übernimmt <strong style={strongStyle}>keinerlei Haftung</strong> für Schäden, die durch das Vertrauen auf oder die Verwendung von KI-generierten Inhalten entstehen, insbesondere nicht für: versäumte Fristen, fehlerhafte rechtliche Einschätzungen, falsche medizinische Interpretationen, fehlerhafte finanzielle Angaben oder Entscheidungen, die auf Basis der KI-Ausgaben getroffen werden.
              </p>

              <h3 style={h3Style}>7.2 Genauigkeit der KI-Analyse</h3>
              <p style={pStyle}>
                (1) Die KI-gestützte Texterkennung (OCR) und Analyse arbeiten mit hoher, aber nicht perfekter Genauigkeit. Insbesondere bei handschriftlichen Texten, beschädigten Dokumenten oder schlechter Bildqualität können Fehler auftreten.
              </p>
              <p style={pStyle}>
                (2) Der Nutzer ist verpflichtet, automatisch extrahierte Daten (z. B. Fristen, Beträge, Absender) eigenständig zu überprüfen. Der Betreiber haftet nicht für Schäden durch fehlerhafte automatische Extraktion.
              </p>

              <h3 style={h3Style}>7.3 Allgemeine Haftungsbeschränkung</h3>
              <p style={pStyle}>
                (1) Die Haftung des Betreibers ist — soweit gesetzlich zulässig — auf Fälle von Vorsatz und grober Fahrlässigkeit beschränkt.
              </p>
              <p style={pStyle}>
                (2) Für leichte Fahrlässigkeit haftet der Betreiber nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) und nur in Höhe des vorhersehbaren, vertragstypischen Schadens.
              </p>
              <p style={pStyle}>
                (3) Die Haftung für mittelbare Schäden, Folgeschäden, entgangenen Gewinn oder Datenverlust ist — soweit gesetzlich zulässig — ausgeschlossen.
              </p>
              <p style={pStyle}>
                (4) Diese Haftungsbeschränkungen gelten nicht für Schäden an Leben, Körper oder Gesundheit sowie für Ansprüche nach dem Produkthaftungsgesetz.
              </p>
            </section>

            {/* §8 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 8 Pflichten des Nutzers</h2>
              <ul style={ulStyle}>
                <li style={liStyle}>(1) Der Nutzer darf KDoc ausschließlich für <strong style={strongStyle}>eigene, persönliche Zwecke</strong> nutzen. Eine gewerbliche Nutzung bedarf der vorherigen schriftlichen Genehmigung des Betreibers.</li>
                <li style={liStyle}>(2) Der Nutzer darf nur <strong style={strongStyle}>eigene Dokumente</strong> oder solche, für die er die erforderliche Berechtigung oder Einwilligung besitzt, hochladen.</li>
                <li style={liStyle}>(3) Das Hochladen von illegalen, diskriminierenden, beleidigenden oder anderweitig rechtswidrigen Inhalten ist untersagt.</li>
                <li style={liStyle}>(4) Der Nutzer darf keine Schadsoftware, Viren oder andere schädliche Programme über die Plattform verbreiten.</li>
                <li style={liStyle}>(5) Der Nutzer darf die Plattform nicht missbrauchen, insbesondere keine automatisierten Massenanfragen stellen oder die Infrastruktur überlasten.</li>
                <li style={liStyle}>(6) Der Nutzer ist für die Sicherheit seiner Zugangsdaten verantwortlich und muss den Betreiber unverzüglich über unbefugten Zugriff informieren.</li>
                <li style={liStyle}>(7) Der Nutzer ist allein verantwortlich dafür, die Richtigkeit der KI-generierten Inhalte zu prüfen, bevor er auf deren Grundlage Handlungen vornimmt.</li>
              </ul>
            </section>

            {/* §9 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 9 Datenschutz und Vertraulichkeit</h2>
              <p style={pStyle}>
                (1) Der Schutz der personenbezogenen Daten unserer Nutzer hat höchste Priorität. Details zur Datenverarbeitung finden sich in unserer separaten <Link to="/datenschutz" style={{ color: 'var(--accent-solid)', fontWeight: 600, textDecoration: 'none' }}>Datenschutzerklärung</Link>.
              </p>
              <p style={pStyle}>
                (2) Der Betreiber implementiert branchenübliche technische und organisatorische Maßnahmen (TOMs) zum Schutz der Daten, darunter: TLS/HTTPS-Verschlüsselung aller Datenübertragungen, Nutzerisolation (kein Nutzer kann auf Daten anderer Nutzer zugreifen), sichere Passwort-Hashing-Verfahren, regelmäßige Sicherheitsupdates, Zugangsbeschränkungen auf Server-Ebene.
              </p>
              <p style={pStyle}>
                (3) Der Betreiber garantiert jedoch <strong style={strongStyle}>keine absolute Sicherheit</strong> gegen Cyberangriffe oder sonstige unvorhergesehene Sicherheitsvorfälle. Im Falle eines Datenlecks wird der Nutzer unverzüglich gemäß Art. 34 DSGVO informiert.
              </p>
              <p style={pStyle}>
                (4) Eine Übersicht aller Drittanbieter und Auftragsverarbeiter ist in der Datenschutzerklärung einsehbar.
              </p>
            </section>

            {/* §10 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 10 Geistiges Eigentum</h2>
              <p style={pStyle}>
                (1) Alle Rechte an der Plattform KDoc, einschließlich Software, Design, Logos und Inhalte, verbleiben beim Betreiber.
              </p>
              <p style={pStyle}>
                (2) Der Nutzer erhält ein persönliches, nicht übertragbares, nicht exklusives, widerrufliches Nutzungsrecht für die Dauer seines Abonnements.
              </p>
              <p style={pStyle}>
                (3) Die vom Nutzer hochgeladenen Dokumente verbleiben im Eigentum des Nutzers. Der Betreiber erwirbt keinerlei Rechte an den Inhalten der Dokumente.
              </p>
              <p style={pStyle}>
                (4) KI-generierte Inhalte (Analysen, Zusammenfassungen, Briefe etc.) stehen dem Nutzer zur freien Verwendung zur Verfügung, ohne dass der Betreiber hierfür Haftung übernimmt.
              </p>
            </section>

            {/* §11 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 11 Kündigung und Kontolöschung</h2>
              <p style={pStyle}>
                (1) Der Nutzer kann sein Konto jederzeit über die Profil-Einstellungen in der App löschen. Die Löschung ist <strong style={strongStyle}>unwiderruflich</strong>.
              </p>
              <p style={pStyle}>
                (2) Bei Kontolöschung werden sämtliche Daten des Nutzers — einschließlich hochgeladener Dokumente, Analysen, Notizen und Metadaten — vollständig und unwiderruflich von unseren Servern entfernt.
              </p>
              <p style={pStyle}>
                (3) Eine Wiederherstellung gelöschter Daten ist nach der Löschung technisch nicht möglich. Der Nutzer ist selbst dafür verantwortlich, vor der Kontolöschung wichtige Daten zu sichern.
              </p>
              <p style={pStyle}>
                (4) Kostenpflichtige Abonnements können jederzeit zum Ende des aktuellen Abrechnungszeitraums gekündigt werden. Nach Kündigung behält der Nutzer Zugang bis zum Ende des bezahlten Zeitraums.
              </p>
              <p style={pStyle}>
                (5) Der Betreiber behält sich das Recht vor, den Vertrag aus wichtigem Grund fristlos zu kündigen, insbesondere bei schwerwiegenden Verstößen gegen diese AGB.
              </p>
            </section>

            {/* §12 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 12 Datenverlust und Backup</h2>
              <p style={pStyle}>
                (1) Der Betreiber führt regelmäßige Backups durch, übernimmt jedoch <strong style={strongStyle}>keine Garantie für eine vollständige Datenwiederherstellung</strong> im Falle eines technischen Ausfalls.
              </p>
              <p style={pStyle}>
                (2) Dem Nutzer wird empfohlen, wichtige Originaldokumente stets in eigener Verwahrung zu behalten und KDoc nicht als alleinigen Speicherort für kritische Unterlagen zu verwenden.
              </p>
            </section>

            {/* §13 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 13 Änderungen der AGB</h2>
              <p style={pStyle}>
                (1) Der Betreiber behält sich vor, diese AGB jederzeit mit Wirkung für die Zukunft zu ändern. Über wesentliche Änderungen wird der Nutzer per E-Mail oder In-App-Benachrichtigung informiert.
              </p>
              <p style={pStyle}>
                (2) Widerspricht der Nutzer den geänderten AGB nicht innerhalb von 30 Tagen nach Zugang der Änderungsmitteilung, gelten die geänderten AGB als akzeptiert. Auf diese Rechtsfolge wird der Nutzer in der Änderungsmitteilung besonders hingewiesen.
              </p>
              <p style={pStyle}>
                (3) Bei Widerspruch gegen die geänderten AGB behält sich der Betreiber das Recht vor, das Vertragsverhältnis mit angemessener Frist zu kündigen.
              </p>
            </section>

            {/* §14 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 14 Freistellung</h2>
              <p style={pStyle}>
                Der Nutzer stellt den Betreiber von sämtlichen Ansprüchen Dritter frei, die durch die rechtswidrige Nutzung der Plattform durch den Nutzer entstehen, insbesondere durch das Hochladen von Dokumenten, an denen der Nutzer keine Rechte besitzt, oder durch die Verletzung von Persönlichkeitsrechten Dritter.
              </p>
            </section>

            {/* §15 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 15 Streitbeilegung</h2>
              <p style={pStyle}>
                (1) Die Europäische Kommission stellt unter <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-solid)' }}>ec.europa.eu/consumers/odr</a> eine Plattform zur Online-Streitbeilegung bereit.
              </p>
              <p style={pStyle}>
                (2) Der Betreiber ist weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>

            {/* §16 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 16 Anwendbares Recht und Gerichtsstand</h2>
              <p style={pStyle}>
                (1) Es gilt ausschließlich <strong style={strongStyle}>österreichisches Recht</strong> unter Ausschluss des UN-Kaufrechts und der Verweisungsnormen des internationalen Privatrechts.
              </p>
              <p style={pStyle}>
                (2) Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesen AGB ist — soweit gesetzlich zulässig — <strong style={strongStyle}>Vöcklabruck, Österreich</strong>.
              </p>
              <p style={pStyle}>
                (3) Für Verbraucher gelten die zwingenden verbraucherschutzrechtlichen Bestimmungen des Staates, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, sofern diese für den Verbraucher günstigere Regelungen vorsehen.
              </p>
            </section>

            {/* §17 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 17 Salvatorische Klausel</h2>
              <p style={pStyle}>
                Sollte eine Bestimmung dieser AGB unwirksam sein oder werden, so berührt dies nicht die Wirksamkeit der übrigen Bestimmungen. An die Stelle der unwirksamen Bestimmung tritt eine wirksame Regelung, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung möglichst nahe kommt.
              </p>
            </section>

            {/* §18 */}
            <section style={sectionStyle}>
              <h2 style={h2Style}>§ 18 Kontakt</h2>
              <p style={pStyle}>
                Ahmed Kamal el din<br />
                Exlwöhr 57<br />
                4871 Vöcklamarkt, Österreich<br />
                E-Mail: office@kdoc.at
              </p>
            </section>

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-glass)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                © {new Date().getFullYear()} KamalDoc — Alle Rechte vorbehalten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
