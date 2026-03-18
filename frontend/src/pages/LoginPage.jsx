import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { API_BASE_URL } from '../config'
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptAGB, setAcceptAGB] = useState(false)
  const [waitingForOAuth, setWaitingForOAuth] = useState(false)
  const pollRef = useRef(null)

  const canSubmit = acceptPrivacy && acceptTerms && acceptAGB

  // Redirect if already authenticated (e.g. after OAuth callback)
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  // Poll for session when waiting for OAuth (PWA mode)
  useEffect(() => {
    if (!waitingForOAuth) return
    pollRef.current = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        clearInterval(pollRef.current)
        setWaitingForOAuth(false)
        navigate('/', { replace: true })
      }
    }, 1500)
    return () => clearInterval(pollRef.current)
  }, [waitingForOAuth, navigate])

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
      if (Capacitor.isNativePlatform()) {
        // Native: use OAuth proxy with platform=android
        const loginUrl = `${API_BASE_URL}/auth/google/login?platform=android`
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: loginUrl })
      } else {
        const loginUrl = `${API_BASE_URL}/auth/google/login?platform=web`
        // In PWA mode: open in new tab so the PWA stays in the foreground
        const isPWA = window.matchMedia('(display-mode: standalone)').matches
          || window.matchMedia('(display-mode: fullscreen)').matches
          || window.navigator.standalone
        if (isPWA) {
          window.open(loginUrl, '_blank')
          setWaitingForOAuth(true)
          setLoading(false)
          return
        } else {
          window.location.href = loginUrl
        }
      }
    } catch (err) {
      setError(err.message || t('auth.googleLoginFailed'))
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }} className="animate-fade-in-up">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/KDoc_Appheader.png" alt="KamalDoc" style={{ height: 40, objectFit: 'contain', margin: '0 auto 8px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('common.appDesc')}</p>
        </div>

        <div className="glass-card-strong" style={{ padding: 28, borderRadius: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 24px' }}>{t('auth.login')}</h2>

          {error && (
            <div style={{
              marginBottom: 20, padding: 14, borderRadius: 12,
              background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <AlertCircle style={{ width: 18, height: 18, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#fca5a5', margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {t('auth.email')}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark"
                  style={{ paddingLeft: 42 }}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {t('auth.password')}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark"
                  style={{ paddingLeft: 42 }}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Checkboxen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  style={{ marginTop: 2, accentColor: 'var(--accent-solid)' }}
                />
                <span>
                  {t('auth.iHaveRead')}{' '}
                  <Link to="/datenschutz" style={{ color: 'var(--accent-solid)', fontWeight: 600, textDecoration: 'none' }}>{t('auth.privacyPolicy')}</Link>
                  {' '}{t('auth.readAndAccepted')}
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  style={{ marginTop: 2, accentColor: 'var(--accent-solid)' }}
                />
                <span>
                  {t('auth.iHaveRead')}{' '}
                  <Link to="/nutzungsbedingungen" style={{ color: 'var(--accent-solid)', fontWeight: 600, textDecoration: 'none' }}>{t('auth.termsOfService')}</Link>
                  {' '}{t('auth.readAndAccepted')}
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={acceptAGB}
                  onChange={(e) => setAcceptAGB(e.target.checked)}
                  style={{ marginTop: 2, accentColor: 'var(--accent-solid)' }}
                />
                <span>
                  {t('auth.iHaveRead')}{' '}
                  <Link to="/agb" style={{ color: 'var(--accent-solid)', fontWeight: 600, textDecoration: 'none' }}>{t('auth.agb')}</Link>
                  {' '}{t('auth.readAndAccepted')}
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="btn-accent"
              style={{
                width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: (!canSubmit || loading) ? 0.5 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} />
                  {t('auth.loggingIn')}
                </>
              ) : (
                t('auth.loginButton')
              )}
            </button>
          </form>

          <div style={{ position: 'relative', margin: '24px 0' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '100%', height: 1, background: 'var(--border-glass)' }} />
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <span style={{ padding: '0 16px', background: 'var(--bg-glass-strong)', fontSize: 13, color: 'var(--text-muted)', borderRadius: 20 }}>{t('auth.or')}</span>
            </div>
          </div>

          {waitingForOAuth ? (
            <div style={{
              textAlign: 'center', padding: '16px 0',
            }}>
              <Loader2 style={{ width: 24, height: 24, color: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                {t('auth.waitingForGoogle', 'Warte auf Google Login...')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>
                {t('auth.completeInBrowser', 'Bitte schließe den Login im Browser ab und kehre zur App zurück.')}
              </p>
              <button
                onClick={() => { setWaitingForOAuth(false); clearInterval(pollRef.current) }}
                style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {t('common.cancel', 'Abbrechen')}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={loading || !canSubmit}
              className="btn-ghost"
              style={{
                width: '100%', padding: '13px 0', fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: (!canSubmit || loading) ? 0.5 : 1,
              }}
            >
              <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t('auth.googleLogin')}
            </button>
          )}

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t('auth.noAccount')}{' '}
              <Link to="/register" style={{ color: 'var(--accent-solid)', fontWeight: 600, textDecoration: 'none' }}>
                {t('auth.registerNow')}
              </Link>
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
