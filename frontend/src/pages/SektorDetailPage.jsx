import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, FileText, AlertCircle, Receipt, Mail, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getDocuments } from '../api'

const SEKTOR_CONFIG = {
  gesamt: { icon: FileText, color: 'text-indigo-600 bg-indigo-50', labelKey: 'dashboard.total' },
  offen: { icon: AlertCircle, color: 'text-red-600 bg-red-50', labelKey: 'dashboard.open' },
  rechnungen: { icon: Receipt, color: 'text-amber-600 bg-amber-50', labelKey: 'dashboard.invoices' },
  briefe: { icon: Mail, color: 'text-blue-600 bg-blue-50', labelKey: 'dashboard.letters' },
}

export default function SektorDetailPage() {
  const { type } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  const config = SEKTOR_CONFIG[type] || SEKTOR_CONFIG.gesamt
  const Icon = config.icon

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        let params = {}
        if (type === 'offen') {
          params.handlung_offen = true
        } else if (type === 'rechnungen') {
          params.kategorie = 'rechnung'
        } else if (type === 'briefe') {
          params.kategorie = 'brief'
        }
        const data = await getDocuments(params)
        const docs = data.documents || data
        setDocuments(docs)
      } catch (err) {
        console.error('Fehler:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [type])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-none"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className={`p-2 rounded-lg ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t(config.labelKey)}</h1>
          <p className="text-sm text-slate-500">{documents.length} Dokumente</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Keine Dokumente in diesem Bereich.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 font-medium text-slate-500 text-xs">{t('dashboard.sender')}</th>
                  <th className="px-5 py-3 font-medium text-slate-500 text-xs">Upload-Datum</th>
                  <th className="px-5 py-3 font-medium text-slate-500 text-xs">Deadline</th>
                  <th className="px-5 py-3 font-medium text-slate-500 text-xs">Notizen</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-t border-slate-100 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {doc.absender || doc.dateiname || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {doc.hochgeladen_am
                        ? new Date(doc.hochgeladen_am).toLocaleDateString('de-DE')
                        : doc.datum
                        ? new Date(doc.datum).toLocaleDateString('de-DE')
                        : '—'}
                    </td>
                    <td className={`px-5 py-3 whitespace-nowrap ${
                      doc.faelligkeitsdatum && new Date(doc.faelligkeitsdatum) < new Date()
                        ? 'text-red-600 font-medium'
                        : 'text-slate-600'
                    }`}>
                      {doc.faelligkeitsdatum
                        ? new Date(doc.faelligkeitsdatum).toLocaleDateString('de-DE')
                        : doc.deadline
                        ? new Date(doc.deadline).toLocaleDateString('de-DE')
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 max-w-xs truncate">
                      {doc.notizen || doc.zusammenfassung || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <p className="text-base font-semibold text-slate-900 truncate">
                  {doc.absender || doc.dateiname || '—'}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                  <span>
                    {doc.hochgeladen_am
                      ? new Date(doc.hochgeladen_am).toLocaleDateString('de-DE')
                      : '—'}
                  </span>
                  {(doc.faelligkeitsdatum || doc.deadline) && (
                    <span className={
                      doc.faelligkeitsdatum && new Date(doc.faelligkeitsdatum) < new Date()
                        ? 'text-red-600 font-medium'
                        : ''
                    }>
                      Deadline: {new Date(doc.faelligkeitsdatum || doc.deadline).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>
                {(doc.notizen || doc.zusammenfassung) && (
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {doc.notizen || doc.zusammenfassung}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
