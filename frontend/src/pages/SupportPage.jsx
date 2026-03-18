import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, CheckCircle, AlertCircle, Loader2, Headphones } from 'lucide-react'
import { submitSupportTicket } from '../api'

export default function SupportPage() {
  const { t } = useTranslation()
  const [priority, setPriority] = useState('mittel')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = email.includes('@') && message.length >= 20

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await submitSupportTicket({ priority, email, message })
      setSuccess(true)
      setPriority('mittel')
      setEmail('')
      setMessage('')
    } catch (err) {
      setError(err?.response?.data?.detail || t('support.sendError'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', paddingTop: 32 }}>
        <div className="glass-card animate-scale-in" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle style={{ width: 28, height: 28, color: 'var(--success)' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{t('support.successTitle')}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px' }}>{t('support.successDesc')}</p>
          <button onClick={() => setSuccess(false)} className="btn-accent" style={{ padding: '12px 28px', fontSize: 14, fontWeight: 600 }}>
            {t('support.newTicket')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }} className="animate-fade-in">
        <div style={{ padding: 8, borderRadius: 10, background: 'var(--accent-soft)' }}>
          <Headphones style={{ width: 18, height: 18, color: 'var(--accent-solid)' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('support.title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t('support.subtitle')}</p>
        </div>
      </div>

      <div className="glass-card animate-fade-in-up" style={{ padding: 20 }}>
        {error && (
          <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 10, background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertCircle style={{ width: 16, height: 16, color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--danger-text)', margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('support.priority')}</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-dark" disabled={loading}>
              <option value="niedrig">{t('support.priorityLow')}</option>
              <option value="mittel">{t('support.priorityMedium')}</option>
              <option value="hoch">{t('support.priorityHigh')}</option>
              <option value="sehr_hoch">{t('support.priorityVeryHigh')}</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('support.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" placeholder={t('support.emailPlaceholder')} required disabled={loading} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              {t('support.describeLabel')} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{t('support.minChars')}</span>
            </label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input-dark" style={{ resize: 'none', minHeight: 120 }} rows={5} placeholder={t('support.describePlaceholder')} required minLength={20} disabled={loading} />
            <p style={{ fontSize: 11, marginTop: 4, color: message.length >= 20 ? '#34d399' : 'var(--text-muted)' }}>
              {t('support.charCount', { count: message.length })}
            </p>
          </div>

          <button type="submit" disabled={loading || !canSubmit} className="btn-accent" style={{
            width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: (loading || !canSubmit) ? 0.5 : 1, cursor: (loading || !canSubmit) ? 'not-allowed' : 'pointer',
          }}>
            {loading ? (<><Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} />{t('support.sending')}</>) : (<><Send style={{ width: 16, height: 16 }} />{t('support.submitButton')}</>)}
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
