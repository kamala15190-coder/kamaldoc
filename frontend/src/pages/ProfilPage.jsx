import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, Save, Loader2, CheckCircle, AlertCircle, Lock, Zap, Rocket, CreditCard, XCircle, Trash2, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getEinstellungen, saveEinstellungen, cancelSubscription, reactivateSubscription, deleteAccount } from '../api';
import { supabase } from '../supabaseClient';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../hooks/useTheme';
import EmailAccountSettings from '../email/EmailAccountSettings';

export default function ProfilPage() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getEinstellungen();
        setForm(data || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await saveEinstellungen(form);
      setForm(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwError(null);
    if (newPassword.length < 6) {
      setPwError(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== repeatPassword) {
      setPwError(t('auth.passwordMismatch'));
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwSuccess(true);
      setNewPassword('');
      setRepeatPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err.message || t('profile.passwordChangeFailed'));
    } finally {
      setPwSaving(false);
    }
  };

  // Subscription
  const { plan, limits, usage, isPro, isBasic, isFree, subscription, refresh: refreshSub } = useSubscription();
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [reactivating, setReactivating] = useState(false);
  const [reactivateSuccess, setReactivateSuccess] = useState(false);
  const [reactivateError, setReactivateError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [searchParams] = useSearchParams();

  // Refresh subscription after checkout success
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      refreshSub();
    }
  }, [searchParams, refreshSub]);

  const handleCancel = async () => {
    if (!confirm(t('profile.confirmCancel'))) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelSubscription();
      setCancelSuccess(true);
      refreshSub();
      setTimeout(() => setCancelSuccess(false), 5000);
    } catch (err) {
      setCancelError(err.response?.data?.detail || t('profile.cancelFailed'));
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    setReactivateError(null);
    try {
      await reactivateSubscription();
      setReactivateSuccess(true);
      refreshSub();
      setTimeout(() => setReactivateSuccess(false), 5000);
    } catch (err) {
      setReactivateError(err.response?.data?.detail || t('profile.reactivateFailed'));
    } finally {
      setReactivating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error('Account deletion failed:', err);
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const planBadge = {
    free: { label: 'Free', className: 'bg-slate-100 text-slate-600', icon: Lock },
    basic: { label: 'Basic', className: 'bg-amber-100 text-amber-700', icon: Zap },
    pro: { label: 'Pro', className: 'bg-indigo-100 text-indigo-700', icon: Rocket },
  };
  const badge = planBadge[plan] || planBadge.free;
  const BadgeIcon = badge.icon;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.15)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }} className="animate-fade-in">
        <div style={{ padding: 8, borderRadius: 10, background: 'var(--accent-soft)' }}>
          <User style={{ width: 18, height: 18, color: 'var(--accent-solid)' }} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('profile.title')}</h1>
      </div>

      {/* Checkout Success Banner */}
      {searchParams.get('checkout') === 'success' && (
        <div className="glass-card animate-fade-in" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle style={{ width: 18, height: 18, color: 'var(--success)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success-text)' }}>{t('profile.checkoutSuccess')}</span>
        </div>
      )}

      {/* Section: Subscription */}
      <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <CreditCard style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('profile.subscription')}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700,
            background: plan === 'pro' ? 'var(--accent-soft)' : plan === 'basic' ? 'var(--warning-soft)' : 'var(--bg-glass)',
            color: plan === 'pro' ? 'var(--accent-solid)' : plan === 'basic' ? '#fbbf24' : 'var(--text-muted)',
          }}>
            <BadgeIcon style={{ width: 14, height: 14 }} />
            {badge.label}
          </span>
          {subscription?.expires_at && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {subscription.cancelled_at
                ? t('profile.cancelledUntil', { date: new Date(subscription.expires_at).toLocaleDateString() })
                : t('profile.activeUntil', { date: new Date(subscription.expires_at).toLocaleDateString() })}
            </span>
          )}
        </div>

        {usage && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <UsageStat label={t('profile.usageDocs')} used={usage.documents_total || 0} max={limits.documents_total} monthly={isFree} />
              <UsageStat label={t('profile.usageKI')} used={usage.ki_analyses_month || 0} max={limits.ki_analyses_month} monthly={true} />
              <UsageStat label={t('profile.usageBehoerde')} used={usage.behoerden_used || 0} max={limits.behoerden} monthly={!isFree || true} />
              <UsageStat label={t('profile.usageBefund')} used={usage.befund_used || 0} max={limits.befund} monthly={!isFree || true} />
            </div>
            {usage.next_reset && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                marginBottom: 14,
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('profile.nextReset', { date: new Date(usage.next_reset).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : undefined) })}
                </span>
              </div>
            )}
          </>
        )}

        {subscription?.pending_plan && (
          <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--warning-soft)', border: '1px solid rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle style={{ width: 14, height: 14, color: 'var(--warning-text)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--warning-text)' }}>
              {t('profile.pendingDowngrade', {
                date: subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : '---',
                plan: subscription.pending_plan.charAt(0).toUpperCase() + subscription.pending_plan.slice(1),
              })}
            </span>
          </div>
        )}

        {cancelSuccess && <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle style={{ width: 14, height: 14, color: 'var(--success)' }} /><span style={{ fontSize: 13, color: 'var(--success-text)', fontWeight: 600 }}>{t('profile.cancelledSuccess')}</span></div>}
        {cancelError && <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle style={{ width: 14, height: 14, color: 'var(--danger)' }} /><span style={{ fontSize: 13, color: 'var(--danger-text)' }}>{typeof cancelError === 'string' ? cancelError : t('profile.cancelFailed')}</span></div>}
        {reactivateSuccess && <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle style={{ width: 14, height: 14, color: 'var(--success)' }} /><span style={{ fontSize: 13, color: 'var(--success-text)', fontWeight: 600 }}>{t('profile.reactivateSuccess')}</span></div>}
        {reactivateError && <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle style={{ width: 14, height: 14, color: 'var(--danger)' }} /><span style={{ fontSize: 13, color: 'var(--danger-text)' }}>{typeof reactivateError === 'string' ? reactivateError : t('profile.reactivateFailed')}</span></div>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {isFree && (
            <Link to="/pricing" className="btn-accent" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Zap style={{ width: 16, height: 16 }} /> {t('pricing.upgradeNow')}
            </Link>
          )}
          {isBasic && (
            <Link to="/pricing" className="btn-accent" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Rocket style={{ width: 16, height: 16 }} /> {t('pricing.upgradePro')}
            </Link>
          )}
          {isPro && (
            <Link to="/pricing" className="btn-ghost" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Rocket style={{ width: 16, height: 16 }} /> {t('pricing.managePlan')}
            </Link>
          )}
          {!isFree && !subscription?.cancelled_at && (
            <button onClick={handleCancel} disabled={cancelling} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: cancelling ? 0.5 : 1,
            }}>
              {cancelling ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <XCircle style={{ width: 14, height: 14 }} />}
              {t('profile.cancelPlan')}
            </button>
          )}
          {!isFree && subscription?.cancelled_at && (
            <button onClick={handleReactivate} disabled={reactivating} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: reactivating ? 0.5 : 1,
            }}>
              {reactivating ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle style={{ width: 14, height: 14 }} />}
              {t('profile.reactivate')}
            </button>
          )}
        </div>
      </div>

      {/* Section: Appearance / Theme Toggle */}
      <div data-intro="darkmode" className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {theme === 'dark' ? <Moon style={{ width: 16, height: 16, color: 'var(--accent-solid)' }} /> : <Sun style={{ width: 16, height: 16, color: 'var(--warning)' }} />}
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('profile.appearance')}</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>{t('profile.themeDesc')}</p>
        <div
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
            background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {theme === 'dark' ? <Moon style={{ width: 18, height: 18, color: 'var(--accent-solid)' }} /> : <Sun style={{ width: 18, height: 18, color: 'var(--warning)' }} />}
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {theme === 'dark' ? t('profile.darkMode') : t('profile.lightMode')}
            </span>
          </div>
          <div style={{
            width: 44, height: 24, borderRadius: 12, position: 'relative',
            background: theme === 'dark' ? 'var(--accent-solid)' : 'rgba(0,0,0,0.15)',
            transition: 'background 0.3s ease',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 10, position: 'absolute', top: 2,
              left: theme === 'dark' ? 22 : 2,
              background: 'white',
              transition: 'left 0.3s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>
      </div>


      {/* Section: Connected Email Accounts */}
      <EmailAccountSettings />

            {/* Section 1: Absenderdaten */}
      <div data-intro="absender" className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px' }}>{t('profile.senderData')}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>{t('profile.senderDesc')}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('profile.firstName')}</label>
              <input type="text" value={form.vorname || ''} onChange={e => handleChange('vorname', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('profile.lastName')}</label>
              <input type="text" value={form.nachname || ''} onChange={e => handleChange('nachname', e.target.value)} className="input-dark" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('profile.street')}</label>
            <input type="text" value={form.adresse || ''} onChange={e => handleChange('adresse', e.target.value)} className="input-dark" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('profile.zip')}</label>
              <input type="text" value={form.plz || ''} onChange={e => handleChange('plz', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('profile.city')}</label>
              <input type="text" value={form.ort || ''} onChange={e => handleChange('ort', e.target.value)} className="input-dark" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('profile.country')}</label>
            <input type="text" value={form.land || ''} onChange={e => handleChange('land', e.target.value)} className="input-dark" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('profile.emailLabel')}</label>
              <input type="email" value={form.email || ''} onChange={e => handleChange('email', e.target.value)} className="input-dark" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('profile.phoneLabel')}</label>
              <input type="tel" value={form.telefon || ''} onChange={e => handleChange('telefon', e.target.value)} className="input-dark" />
            </div>
          </div>
        </div>

        {saved && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }} className="animate-fade-in"><CheckCircle style={{ width: 14, height: 14, color: 'var(--success)' }} /><span style={{ fontSize: 13, color: 'var(--success-text)', fontWeight: 600 }}>{t('profile.saved')}</span></div>}
        {error && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle style={{ width: 14, height: 14, color: 'var(--danger)' }} /><span style={{ fontSize: 13, color: 'var(--danger-text)' }}>{error}</span></div>}

        <button onClick={handleSave} disabled={saving} className="btn-accent" style={{
          width: '100%', marginTop: 14, padding: '12px 0', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.5 : 1,
        }}>
          {saving ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> : <Save style={{ width: 16, height: 16 }} />}
          {t('profile.saveButton')}
        </button>
      </div>

      {/* Section 2: Passwort aendern */}
      <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Lock style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('profile.changePassword')}</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('profile.newPassword')}</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="--------" className="input-dark" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{t('profile.repeatPassword')}</label>
            <input type="password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} placeholder="--------" className="input-dark" />
          </div>
        </div>

        {pwSuccess && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle style={{ width: 14, height: 14, color: 'var(--success)' }} /><span style={{ fontSize: 13, color: 'var(--success-text)', fontWeight: 600 }}>{t('profile.passwordChanged')}</span></div>}
        {pwError && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle style={{ width: 14, height: 14, color: 'var(--danger)' }} /><span style={{ fontSize: 13, color: 'var(--danger-text)' }}>{pwError}</span></div>}

        <button onClick={handlePasswordChange} disabled={pwSaving || !newPassword} className="btn-ghost" style={{
          width: '100%', marginTop: 14, padding: '12px 0', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: (pwSaving || !newPassword) ? 0.5 : 1,
        }}>
          {pwSaving ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} /> : <Lock style={{ width: 16, height: 16 }} />}
          {t('profile.changePasswordButton')}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="glass-card animate-fade-in-up" style={{ padding: 16, border: '1px solid rgba(239,68,68,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Trash2 style={{ width: 16, height: 16, color: 'var(--danger)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)', margin: 0 }}>{t('profile.dangerZone')}</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          {t('profile.deleteAccountDesc')}
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', background: '#ef4444', color: 'white',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Trash2 style={{ width: 16, height: 16 }} />
          {t('profile.deleteAccountButton')}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div className="glass-card animate-scale-in" style={{ padding: 24, width: '100%', maxWidth: 380 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 18, color: 'var(--danger)', margin: '0 0 8px' }}>
                {t('profile.deleteAccountConfirm')}
              </h3>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              <p style={{ marginBottom: 8 }}>{t('profile.deleteWarning')}</p>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>{t('profile.deleteDocuments')}</li>
                <li>{t('profile.deleteAnalyses')}</li>
                <li>{t('profile.deleteProfile')}</li>
                <li>{t('profile.deleteSubscription')}</li>
                <li>{t('profile.deleteUserAccount')}</li>
              </ul>
              <p style={{ marginTop: 12, fontWeight: 600, color: 'var(--danger)' }}>
                {t('profile.deleteIrreversible')}
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              style={{
                width: '100%', padding: 12,
                backgroundColor: '#ef4444', color: 'white',
                borderRadius: 10, border: 'none',
                fontWeight: 600, fontSize: 15, cursor: 'pointer',
                marginBottom: 8, opacity: deletingAccount ? 0.6 : 1,
              }}
            >
              {deletingAccount ? t('profile.deleting') : t('profile.confirmDeleteButton')}
            </button>
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={deletingAccount}
              style={{
                width: '100%', padding: 10,
                backgroundColor: 'transparent', color: 'var(--text-muted)',
                border: 'none', cursor: 'pointer', fontSize: 14,
              }}
            >
              {t('profile.cancelButton')}
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function UsageStat({ label, used, max, monthly }) {
  const { t } = useTranslation();
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const isUnlimited = max === null || max === undefined;
  const isHigh = !isUnlimited && pct >= 80;

  return (
    <div style={{ padding: 10, borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: isHigh ? '#ef4444' : 'var(--text-primary)' }}>
        {used}{isUnlimited ? '' : `/${max}`}
      </div>
      {isUnlimited ? (
        <div style={{ fontSize: 11, color: 'var(--success-text)', fontWeight: 600, marginTop: 2 }}>{t('profile.unlimited')}</div>
      ) : (
        <>
          <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--progress-track)', marginTop: 6 }}>
            <div style={{
              height: 4, borderRadius: 2, transition: 'all 0.3s ease',
              width: `${pct}%`,
              background: isHigh ? '#ef4444' : 'var(--accent-solid)',
            }} />
          </div>
          {monthly && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{t('profile.perMonth')}</div>}
        </>
      )}
    </div>
  );
}
