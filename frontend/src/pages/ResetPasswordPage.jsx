import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { Lock, AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const [pwFocused, setPwFocused] = useState(false)
  const [pw2Focused, setPw2Focused] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Also check if we already have a session (user clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => navigate('/', { replace: true }), 2000)
    } catch (err) {
      setError(err.message || t('auth.resetFailed'))
    } finally {
      setLoading(false)
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
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('auth.resetPasswordTitle')}</p>
        </div>

        {/* Card */}
        <div className="glass-card-strong" style={{
          padding: 28, borderRadius: 20,
          boxShadow: 'var(--login-card-shadow)',
        }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle style={{ width: 48, height: 48, color: 'var(--success)', margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {t('auth.passwordChanged')}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                {t('auth.redirecting')}
              </p>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Loader2 style={{ width: 32, height: 32, color: 'var(--accent-solid)', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                {t('auth.verifyingLink')}
              </p>
              <Link to="/forgot-password" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: 'var(--accent-solid)', fontWeight: 600, fontSize: 13, textDecoration: 'none',
              }}>
                <ArrowLeft style={{ width: 14, height: 14 }} />
                {t('auth.requestNewLink')}
              </Link>
            </div>
          ) : (
            <>
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

              <form onSubmit={handleSubmit}>
                {/* New password */}
                <div style={{ marginBottom: 16, position: 'relative' }}>
                  <div style={{
                    position: 'relative', borderRadius: 12,
                    border: `1px solid ${pwFocused ? 'var(--accent-solid)' : 'var(--border-glass-strong)'}`,
                    background: 'var(--bg-glass)',
                    transition: 'all 0.3s ease',
                    boxShadow: pwFocused ? '0 0 0 3px var(--accent-soft)' : 'none',
                  }}>
                    <Lock style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      width: 18, height: 18, color: pwFocused ? 'var(--accent-solid)' : 'var(--text-muted)',
                      transition: 'color 0.3s ease',
                    }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPwFocused(true)}
                      onBlur={() => setPwFocused(false)}
                      placeholder={t('auth.newPassword')}
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

                {/* Confirm password */}
                <div style={{ marginBottom: 20, position: 'relative' }}>
                  <div style={{
                    position: 'relative', borderRadius: 12,
                    border: `1px solid ${pw2Focused ? 'var(--accent-solid)' : 'var(--border-glass-strong)'}`,
                    background: 'var(--bg-glass)',
                    transition: 'all 0.3s ease',
                    boxShadow: pw2Focused ? '0 0 0 3px var(--accent-soft)' : 'none',
                  }}>
                    <Lock style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      width: 18, height: 18, color: pw2Focused ? 'var(--accent-solid)' : 'var(--text-muted)',
                      transition: 'color 0.3s ease',
                    }} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setPw2Focused(true)}
                      onBlur={() => setPw2Focused(false)}
                      placeholder={t('auth.passwordConfirmPlaceholder')}
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

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-accent"
                  style={{
                    width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} />
                      {t('auth.saving')}
                    </>
                  ) : (
                    t('auth.setNewPassword')
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes loginCardEnter {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-card-enter {
          animation: loginCardEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  )
}