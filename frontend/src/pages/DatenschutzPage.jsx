import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-6 no-underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Login
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
            DATENSCHUTZERKLÄRUNG — KamalDoc
          </h1>
          <p className="text-sm text-slate-500 mb-8">Stand: März 2026</p>

          <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. Verantwortlicher</h2>
              <p>Ahmed Kamal el din, Exlwöhr 57, 4871 Vöcklamarkt, Österreich<br />E-Mail: a.kamal.vb@gmail.com</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">2. Welche Daten wir erheben</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Kontodaten:</strong> E-Mail-Adresse, Name und Profilbild (bei Google-Login)</li>
                <li><strong>Hochgeladene Dokumente:</strong> Bilder und PDFs, extrahierter Text, KI-Analysen</li>
                <li><strong>Technische Daten:</strong> IP-Adresse, Geräteinformationen, Push-Notification Token</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. Zweck der Datenverarbeitung</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Bereitstellung der App-Funktionen</li>
                <li>Authentifizierung und Kontosicherheit</li>
                <li>Push-Benachrichtigungen bei Deadlines</li>
                <li>Technischer Betrieb und Sicherheit</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">4. Rechtsgrundlage (DSGVO)</h2>
              <p>Art. 6 Abs. 1 lit. b, a, f DSGVO</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">5. Drittanbieter</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase</strong> (Datenbank/Auth, USA, DSGVO-konform)</li>
                <li><strong>Google OAuth</strong> (Login, USA, DSGVO-konform)</li>
                <li><strong>Together.ai</strong> (KI-Analyse, USA, Verarbeitungsvertrag)</li>
                <li><strong>Hetzner Online</strong> (Server, Deutschland, DSGVO-konform)</li>
                <li><strong>Vercel</strong> (Web-Hosting, USA, DSGVO-konform)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">6. Speicherdauer</h2>
              <p>Kontodaten bis Accountlöschung, Dokumente bis manuelle Löschung, Logs 30 Tage</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">7. Ihre Rechte (DSGVO)</h2>
              <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch</p>
              <p>Beschwerde: <a href="https://dsb.gv.at" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">dsb.gv.at</a> — Kontakt: a.kamal.vb@gmail.com</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">8. Datensicherheit</h2>
              <p>HTTPS/TLS, keine Klartext-Passwörter, User-Isolation, Hetzner Deutschland, regelmäßige Updates</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">9. Kinder</h2>
              <p>Nicht für unter 16-Jährige</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">10. Kontakt</h2>
              <p>Ahmed Kamal el din, a.kamal.vb@gmail.com, Exlwöhr 57, 4871 Vöcklamarkt</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
