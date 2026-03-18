import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { API_BASE_URL } from '../config'
import { Mail, Lock, AlertCircle, Loader2, CheckCircle, Globe } from 'lucide-react'
import { LANGUAGES } from '../languages'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [appLanguage, setAppLanguage] = useState(i18n.language || 'de')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptAGB, setAcceptAGB] = useState(false)

  const canSubmit = acceptPrivacy && acceptTerms && acceptAGB

  // Redirect if already authenticated (e.g. after OAuth callback)
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError(t('auth.passwordMismatch'))
      return
    }

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      // Save language to Supabase profile
      if (data?.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            app_language: appLanguage,
            updated_at: new Date().toISOString(),
          })
        } catch (profileErr) {
          console.error('Profile save failed:', profileErr)
        }
      }

      // Set app language immediately
      i18n.changeLanguage(appLanguage)
      localStorage.setItem('kamaldoc_language', appLanguage)

      setSuccess(true)
    } catch (err) {
      setError(err.message || t('auth.registerFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError(null)
    setLoading(true)

    try {
      if (Capacitor.isNativePlatform()) {
        // Native: use OAuth proxy with platform=android
        const loginUrl = `${API_BASE_URL}/auth/google/login?platform=android`
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: loginUrl })
      } else {
        // Web: redirect to our OAuth proxy (Google shows "Weiter zu kdoc.at")
        window.location.href = `${API_BASE_URL}/auth/google/login?platform=web`
      }
    } catch (err) {
      setError(err.message || t('auth.googleRegisterFailed'))
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="glass-card animate-scale-in" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle style={{ width: 28, height: 28, color: 'var(--success)' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              {t('auth.registerSuccess')}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px' }} dangerouslySetInnerHTML={{ __html: t('auth.confirmEmail', { email }) }} />
            <Link to="/login" className="btn-accent" style={{ display: 'inline-block', padding: '12px 28px', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
              {t('auth.toLogin')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }} className="animate-fade-in">
          <img src="/KDoc_Appheader.png" alt="KamalDoc" style={{ height: 40, objectFit: 'contain', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{t('common.appDesc')}</p>
        </div>

        <div className="glass-card animate-fade-in-up" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>{t('auth.register')}</h2>

          {error && (
            <div style={{ marginBottom: 18, padding: '12px 14px', borderRadius: 10, background: 'var(--danger-soft)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle style={{ width: 16, height: 16, color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: 'var(--danger-text)', margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('auth.email')}</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--text-muted)' }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" style={{ paddingLeft: 40 }} placeholder={t('auth.emailPlaceholder')} required disabled={loading} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--text-muted)' }} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-dark" style={{ paddingLeft: 40 }} placeholder={t('auth.passwordMinLength')} required disabled={loading} minLength={6} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('auth.passwordRepeat')}</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--text-muted)' }} />
                <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="input-dark" style={{ paddingLeft: 40 }} placeholder={t('auth.passwordConfirmPlaceholder')} required disabled={loading} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('auth.chooseLanguage')}</label>
              <div style={{ position: 'relative' }}>
                <Globe style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--text-muted)' }} />
                <select value={appLanguage} onChange={(e) => setAppLanguage(e.target.value)} className="input-dark" style={{ paddingLeft: 40, appearance: 'none' }} disabled={loading}>
                  {LANGUAGES.slice(0, 2).map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
                  ))}
                  <option disabled>──────────</option>
                  {LANGUAGES.slice(2).map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--accent-solid)' }} />
                <span>{t('auth.iHaveRead')}{' '}<Link to="/datenschutz" style={{ color: 'var(--accent-solid)', fontWeight: 600 }}>{t('auth.privacyPolicy')}</Link>{' '}{t('auth.readAndAccepted')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--accent-solid)' }} />
                <span>{t('auth.iHaveRead')}{' '}<Link to="/nutzungsbedingungen" style={{ color: 'var(--accent-solid)', fontWeight: 600 }}>{t('auth.termsOfService')}</Link>{' '}{t('auth.readAndAccepted')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={acceptAGB} onChange={(e) => setAcceptAGB(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--accent-solid)' }} />
                <span>{t('auth.iHaveRead')}{' '}<Link to="/agb" style={{ color: 'var(--accent-solid)', fontWeight: 600 }}>{t('auth.agb')}</Link>{' '}{t('auth.readAndAccepted')}</span>
              </label>
            </div>

            <button type="submit" disabled={loading || !canSubmit} className="btn-accent" style={{
              width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (loading || !canSubmit) ? 0.5 : 1, cursor: (loading || !canSubmit) ? 'not-allowed' : 'pointer',
            }}>
              {loading ? (<><Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} />{t('auth.registering')}</>) : t('auth.registerButton')}
            </button>
          </form>

          <div style={{ position: 'relative', marginBottom: 18 }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '100%', height: 1, background: 'var(--border-glass)' }} />
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <span style={{ padding: '0 12px', fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)' }}>{t('auth.or')}</span>
            </div>
          </div>

          <button onClick={handleGoogleSignUp} disabled={loading || !canSubmit} className="btn-ghost" style={{
            width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: (loading || !canSubmit) ? 0.5 : 1,
          }}>
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t('auth.googleRegister')}
          </button>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {t('auth.hasAccount')}{' '}
              <Link to="/login" style={{ color: 'var(--accent-solid)', fontWeight: 600 }}>{t('auth.loginNow')}</Link>
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
