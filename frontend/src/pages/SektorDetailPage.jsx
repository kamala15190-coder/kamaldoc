import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, FileText, AlertCircle, Receipt, Mail, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getDocuments } from '../api'
import { formatLocalDate, parseUTC } from '../utils/dateUtils'

const SEKTOR_CONFIG = {
  gesamt: { icon: FileText, color: 'var(--accent-solid)', bg: 'var(--accent-soft)', labelKey: 'dashboard.total' },
  offen: { icon: AlertCircle, color: 'var(--danger)', bg: 'var(--danger-soft)', labelKey: 'dashboard.open' },
  rechnungen: { icon: Receipt, color: 'var(--warning-text)', bg: 'var(--warning-soft)', labelKey: 'dashboard.invoices' },
  briefe: { icon: Mail, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', labelKey: 'dashboard.letters' },
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }} className="animate-fade-in">
        <button onClick={() => navigate('/')} style={{ padding: 8, borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft style={{ width: 18, height: 18, color: 'var(--text-secondary)' }} />
        </button>
        <div style={{ padding: 8, borderRadius: 10, background: config.bg }}>
          <Icon style={{ width: 18, height: 18, color: config.color }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t(config.labelKey)}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>{documents.length} Dokumente</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.15)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText style={{ width: 48, height: 48, color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: 0 }}>Keine Dokumente in diesem Bereich.</p>
        </div>
      ) : (
        <div className="glass-card animate-fade-in-up" style={{ overflow: 'hidden', padding: 0 }}>
          <div>
            {documents.map((doc, idx) => (
              <div
                key={doc.id}
                style={{
                  padding: '14px 16px', cursor: 'pointer', transition: 'background 0.15s ease',
                  borderBottom: idx < documents.length - 1 ? '1px solid var(--border-glass)' : 'none',
                }}
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.absender || doc.dateiname || '—'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>
                    {doc.hochgeladen_am
                      ? formatLocalDate(doc.hochgeladen_am)
                      : '—'}
                  </span>
                  {(doc.faelligkeitsdatum || doc.deadline) && (
                    <span style={{
                      color: doc.faelligkeitsdatum && parseUTC(doc.faelligkeitsdatum) < new Date() ? '#ef4444' : 'var(--text-muted)',
                      fontWeight: doc.faelligkeitsdatum && parseUTC(doc.faelligkeitsdatum) < new Date() ? 600 : 400,
                    }}>
                      Deadline: {formatLocalDate(doc.faelligkeitsdatum || doc.deadline)}
                    </span>
                  )}
                </div>
                {(doc.notizen || doc.zusammenfassung) && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.notizen || doc.zusammenfassung}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
