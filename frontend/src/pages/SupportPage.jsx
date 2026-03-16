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
      <div className="max-w-xl mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('support.successTitle')}</h2>
          <p className="text-slate-600 mb-6">{t('support.successDesc')}</p>
          <button
            onClick={() => setSuccess(false)}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors cursor-pointer border-none"
          >
            {t('support.newTicket')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Headphones className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('support.title')}</h1>
          <p className="text-sm text-slate-500">{t('support.subtitle')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('support.priority')}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              disabled={loading}
            >
              <option value="niedrig">{t('support.priorityLow')}</option>
              <option value="mittel">{t('support.priorityMedium')}</option>
              <option value="hoch">{t('support.priorityHigh')}</option>
              <option value="sehr_hoch">{t('support.priorityVeryHigh')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('support.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('support.emailPlaceholder')}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('support.describeLabel')} <span className="text-slate-400 font-normal">{t('support.minChars')}</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={5}
              placeholder={t('support.describePlaceholder')}
              required
              minLength={20}
              disabled={loading}
            />
            <p className={`text-xs mt-1 ${message.length >= 20 ? 'text-green-600' : 'text-slate-400'}`}>
              {t('support.charCount', { count: message.length })}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('support.sending')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t('support.submitButton')}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
