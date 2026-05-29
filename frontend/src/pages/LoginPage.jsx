import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { API_BASE_URL } from '../config'
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

const GOOGLE_CLIENT_ID = '246007067980-44qma6u29hu8eiimp7f1n5akqo3k0j3p.apps.googleusercontent.com'

async function sha256(plain) {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const nonceRef = useRef(null)

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleGoogleCredential = useCallback(async (response) => {
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
        nonce: nonceRef.current,
      })
      if (error) throw error
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || t('auth.googleLoginFailed'))
    } finally {
      setLoading(false)
    }
  }, [navigate, t])

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
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
    if (Capacitor.isNativePlatform()) {
      setLoading(true)
      const loginUrl = `${API_BASE_URL}/auth/google/login?platform=android`
      import('@capacitor/browser').then(({ Browser }) => {
        Browser.open({ url: loginUrl })
        // Reset loading when user closes browser without completing login
        const listener = Browser.addListener('browserFinished', () => {
          setLoading(false)
          listener.then(h => h.remove()).catch(() => {})
        })
      })
      return
    }
    if (window.google?.accounts?.id) {
      const rawNonce = crypto.randomUUID()
      nonceRef.current = rawNonce
      const hashedNonce = await sha256(rawNonce)
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        nonce: hashedNonce,
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          window.location.href = `${API_BASE_URL}/auth/google/login?platform=web`
        }
      })
    } else {
      window.location.href = `${API_BASE_URL}/auth/google/login?platform=web`
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }} className="login-card-enter">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/KDoc_Appheader.png" alt="KamalDoc" style={{ height: 40, objectFit: 'contain', margin: '0 auto 8px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('common.appDesc')}</p>
        </div>

        {/* Card */}
        <div className="glass-card-strong" style={{
          padding: 28, borderRadius: 20,
          boxShadow: 'var(--login-card-shadow)',
        }}>
          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 20, padding: 14, borderRadius: 12,
              background: 'var(--danger-soft)', border: '1px solid var(--danger-border)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <AlertCircle style={{ width: 18, height: 18, color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: 'var(--danger-text)', margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailLogin}>
            {/* Email field with floating label */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <div style={{
                position: 'relative',
                borderRadius: 12,
                border: `1px solid ${emailFocused ? 'var(--accent-solid)' : 'var(--border-glass-strong)'}`,
                background: 'var(--bg-glass)',
                transition: 'all 0.3s ease',
                boxShadow: emailFocused ? '0 0 0 3px var(--accent-soft)' : 'none',
              }}>
                <Mail style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  width: 18, height: 18, color: emailFocused ? 'var(--accent-solid)' : 'var(--text-muted)',
                  transition: 'color 0.3s ease',
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px 16px 14px 42px',
                    background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text-primary)', fontSize: 15,
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 8, position: 'relative' }}>
              <div style={{
                position: 'relative',
                borderRadius: 12,
                border: `1px solid ${passwordFocused ? 'var(--accent-solid)' : 'var(--border-glass-strong)'}`,
                background: 'var(--bg-glass)',
                transition: 'all 0.3s ease',
                boxShadow: passwordFocused ? '0 0 0 3px var(--accent-soft)' : 'none',
              }}>
                <Lock style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  width: 18, height: 18, color: passwordFocused ? 'var(--accent-solid)' : 'var(--text-muted)',
                  transition: 'color 0.3s ease',
                }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px 16px 14px 42px',
                    background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text-primary)', fontSize: 15,
                  }}
                />
              </div>
            </div>

            {/* Forgot password link */}
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <Link to="/forgot-password" style={{
                fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none',
                transition: 'color 0.2s',
              }}>
                {t('auth.forgotPassword')}
              </Link>
            </div>

            {/* Login Button with shimmer */}
            <button
              type="submit"
              disabled={loading}
              className="btn-accent login-btn-shimmer"
              style={{
                width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.7 : 1,
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

          {/* Divider */}
          <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100%', height: 1, background: 'var(--border-glass-strong)' }} />
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn-ghost"
            style={{
              width: '100%', padding: '13px 0', fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: loading ? 0.5 : 1,
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

          {/* Register link */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t('auth.noAccount')}{' '}
              <Link to="/register" style={{ color: 'var(--accent-solid)', fontWeight: 600, textDecoration: 'none' }}>
                {t('auth.registerNow')}
              </Link>
            </p>
          </div>
        </div>

        {/* Legal notice at the bottom */}
        <p style={{
          textAlign: 'center', fontSize: 11, color: 'var(--text-muted)',
          marginTop: 20, lineHeight: 1.5, padding: '0 10px',
        }}>
          {t('auth.byContinuing')}{' '}
          <Link to="/datenschutz" style={{ color: 'var(--accent-solid)', textDecoration: 'underline' }}>{t('auth.privacyPolicy')}</Link>,{' '}
          <Link to="/nutzungsbedingungen" style={{ color: 'var(--accent-solid)', textDecoration: 'underline' }}>{t('auth.termsOfService')}</Link>{' '}
          {t('auth.andThe')}{' '}
          <Link to="/agb" style={{ color: 'var(--accent-solid)', textDecoration: 'underline' }}>{t('auth.agb')}</Link>.
          {' · '}
          <Link to="/impressum" style={{ color: 'var(--accent-solid)', textDecoration: 'underline' }}>Impressum</Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes loginCardEnter {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginShimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        .login-card-enter {
          animation: loginCardEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .login-btn-shimmer {
          position: relative;
          overflow: hidden;
        }
        .login-btn-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: none;
        }
        .login-btn-shimmer:hover::after {
          animation: loginShimmer 0.8s ease-in-out;
        }
      `}</style>
    </div>
  )
}