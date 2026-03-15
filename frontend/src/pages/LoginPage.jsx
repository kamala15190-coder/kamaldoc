import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../supabaseClient'
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const canSubmit = acceptPrivacy && acceptTerms

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      navigate('/')
    } catch (err) {
      setError(err.message || t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)

    try {
      const redirectTo = Capacitor.isNativePlatform()
        ? 'at.kamaldoc.app://login-callback'
        : window.location.origin

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err.message || t('auth.googleLoginFailed'))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/KDoc_Logo.png" alt="KamalDoc" className="h-12 object-contain mx-auto mb-2" />
          <p className="text-slate-600">{t('common.appDesc')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('auth.login')}</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Checkboxen */}
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  className="mt-0.5 accent-indigo-600"
                />
                <span>
                  Ich habe die{' '}
                  <Link to="/datenschutz" className="text-indigo-600 hover:underline font-medium">Datenschutzerklärung</Link>
                  {' '}gelesen und akzeptiert
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 accent-indigo-600"
                />
                <span>
                  Ich habe die{' '}
                  <Link to="/nutzungsbedingungen" className="text-indigo-600 hover:underline font-medium">Nutzungsbedingungen</Link>
                  {' '}gelesen und akzeptiert
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('auth.loggingIn')}
                </>
              ) : (
                t('auth.loginButton')
              )}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">{t('auth.or')}</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading || !canSubmit}
            className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('auth.googleLogin')}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              {t('auth.noAccount')}{' '}
              <Link
                to="/register"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {t('auth.registerNow')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
