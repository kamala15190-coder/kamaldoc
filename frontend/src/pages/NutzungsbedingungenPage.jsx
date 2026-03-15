import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NutzungsbedingungenPage() {
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
            NUTZUNGSBEDINGUNGEN — KamalDoc
          </h1>
          <p className="text-sm text-slate-500 mb-8">Stand: März 2026</p>

          <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. Geltungsbereich</h2>
              <p>Ahmed Kamal el din, Exlwöhr 57, 4871 Vöcklamarkt, Österreich</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">2. Leistungsbeschreibung</h2>
              <p>Dokumentenverwaltung, KI-Analyse, Deadline-Wächter, Ausgaben-Tracking, Behörden-Assistent, Befund-Assistent</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. Nutzungspflichten</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nur eigene Dokumente hochladen</li>
                <li>Keine illegale Nutzung</li>
                <li>Keine Schadsoftware</li>
                <li>Zugangsdaten nicht weitergeben</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">4. Haftungsausschluss</h2>
              <p>KI-Inhalte unverbindlich, kein Ersatz für Rechts-/Steuer-/Medizinberatung. Keine Garantie für vollständige Datenwiederherstellung.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">5. Geistiges Eigentum</h2>
              <p>KamalDoc ist Eigentum von Ahmed Kamal el din. Persönliche, nicht übertragbare Lizenz.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">6. Kündigung</h2>
              <p>Jederzeit möglich. Alle Daten werden unwiderruflich gelöscht.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">7. Anwendbares Recht</h2>
              <p>Österreichisches Recht. Gerichtsstand: Vöcklabruck.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">8. Kontakt</h2>
              <p>Ahmed Kamal el din, a.kamal.vb@gmail.com</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
