import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, Save, Loader2, CheckCircle, AlertCircle, Lock, Zap, Rocket, CreditCard, XCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getEinstellungen, saveEinstellungen, cancelSubscription, reactivateSubscription, deleteAccount } from '../api';
import { supabase } from '../supabaseClient';
import { useSubscription } from '../hooks/useSubscription';

export default function ProfilPage() {
  const { t, i18n } = useTranslation();
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
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900">{t('profile.title')}</h1>
      </div>

      {/* Checkout Success Banner */}
      {searchParams.get('checkout') === 'success' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{t('profile.checkoutSuccess')}</span>
        </div>
      )}

      {/* Section: Subscription */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t('profile.subscription')}</h2>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${badge.className}`}>
            <BadgeIcon className="w-4 h-4" />
            {badge.label}
          </span>
          {subscription?.expires_at && (
            <span className="text-sm text-slate-500">
              {subscription.cancelled_at
                ? t('profile.cancelledUntil', { date: new Date(subscription.expires_at).toLocaleDateString() })
                : t('profile.activeUntil', { date: new Date(subscription.expires_at).toLocaleDateString() })}
            </span>
          )}
        </div>

        {/* Usage Stats */}
        {usage && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <UsageStat label={t('profile.usageDocs')} used={usage.documents_total || 0} max={limits.documents_total} />
            <UsageStat label={t('profile.usageKI')} used={usage.ki_analyses_total || 0} max={limits.ki_analyses_total} />
            <UsageStat label={t('profile.usageBehoerde')} used={usage.behoerden_used || 0} max={limits.behoerden} />
            <UsageStat label={t('profile.usageBefund')} used={usage.befund_used || 0} max={limits.befund} />
          </div>
        )}

        {/* Pending Downgrade Info */}
        {subscription?.pending_plan && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm">
              {t('profile.pendingDowngrade', {
                date: subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : '—',
                plan: subscription.pending_plan.charAt(0).toUpperCase() + subscription.pending_plan.slice(1),
              })}
            </span>
          </div>
        )}

        {cancelSuccess && (
          <div className="mb-4 flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t('profile.cancelledSuccess')}</span>
          </div>
        )}
        {cancelError && (
          <div className="mb-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{typeof cancelError === 'string' ? cancelError : t('profile.cancelFailed')}</span>
          </div>
        )}
        {reactivateSuccess && (
          <div className="mb-4 flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t('profile.reactivateSuccess')}</span>
          </div>
        )}
        {reactivateError && (
          <div className="mb-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{typeof reactivateError === 'string' ? reactivateError : t('profile.reactivateFailed')}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {isFree && (
            <Link to="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all no-underline" style={{ minHeight: '44px' }}>
              <Zap className="w-4 h-4" /> {t('pricing.upgradeNow')}
            </Link>
          )}
          {isBasic && (
            <Link to="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all no-underline" style={{ minHeight: '44px' }}>
              <Rocket className="w-4 h-4" /> {t('pricing.upgradePro')}
            </Link>
          )}
          {isPro && (
            <Link to="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-all no-underline" style={{ minHeight: '44px' }}>
              <Rocket className="w-4 h-4" /> {t('pricing.managePlan')}
            </Link>
          )}
          {!isFree && !subscription?.cancelled_at && (
            <button onClick={handleCancel} disabled={cancelling}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50" style={{ minHeight: '44px' }}>
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {t('profile.cancelPlan')}
            </button>
          )}
          {!isFree && subscription?.cancelled_at && (
            <button onClick={handleReactivate} disabled={reactivating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all cursor-pointer border-none disabled:opacity-50" style={{ minHeight: '44px' }}>
              {reactivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {t('profile.reactivate')}
            </button>
          )}
        </div>
      </div>

      {/* Section 1: Absenderdaten */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">{t('profile.senderData')}</h2>
        <p className="text-sm text-slate-500 mb-5">{t('profile.senderDesc')}</p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.firstName')}</label>
              <input type="text" value={form.vorname || ''} onChange={e => handleChange('vorname', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.lastName')}</label>
              <input type="text" value={form.nachname || ''} onChange={e => handleChange('nachname', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.street')}</label>
            <input type="text" value={form.adresse || ''} onChange={e => handleChange('adresse', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.zip')}</label>
              <input type="text" value={form.plz || ''} onChange={e => handleChange('plz', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.city')}</label>
              <input type="text" value={form.ort || ''} onChange={e => handleChange('ort', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.country')}</label>
            <input type="text" value={form.land || ''} onChange={e => handleChange('land', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.emailLabel')}</label>
              <input type="email" value={form.email || ''} onChange={e => handleChange('email', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.phoneLabel')}</label>
              <input type="tel" value={form.telefon || ''} onChange={e => handleChange('telefon', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
            </div>
          </div>
        </div>

        {saved && (
          <div className="mt-4 flex items-center gap-2 text-green-600" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t('profile.saved')}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full md:w-auto mt-5 flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none disabled:opacity-50 transition-colors"
          style={{ minHeight: '44px' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('profile.saveButton')}
        </button>
      </div>

      {/* Section 2: Passwort ändern */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t('profile.changePassword')}</h2>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.newPassword')}</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.repeatPassword')}</label>
            <input type="password" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ minHeight: '44px' }} />
          </div>
        </div>

        {pwSuccess && (
          <div className="mt-4 flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t('profile.passwordChanged')}</span>
          </div>
        )}
        {pwError && (
          <div className="mt-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{pwError}</span>
          </div>
        )}

        <button onClick={handlePasswordChange} disabled={pwSaving || !newPassword}
          className="w-full md:w-auto mt-5 flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 cursor-pointer border-none disabled:opacity-50 transition-colors"
          style={{ minHeight: '44px' }}>
          {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {t('profile.changePasswordButton')}
        </button>
      </div>

      {/* Danger Zone: Account löschen */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-4 md:p-6">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-red-700">{t('profile.dangerZone')}</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          {t('profile.deleteAccountDesc')}
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer border-none"
          style={{ minHeight: '44px' }}
        >
          <Trash2 className="w-4 h-4" />
          {t('profile.deleteAccountButton')}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px',
            padding: '24px', width: '100%', maxWidth: '380px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚠️</div>
              <h3 style={{ fontWeight: '700', fontSize: '18px', color: '#dc2626', marginBottom: '8px' }}>
                {t('profile.deleteAccountConfirm')}
              </h3>
            </div>
            <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '20px' }}>
              <p style={{ marginBottom: '8px' }}>{t('profile.deleteWarning')}</p>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li>{t('profile.deleteDocuments')}</li>
                <li>{t('profile.deleteAnalyses')}</li>
                <li>{t('profile.deleteProfile')}</li>
                <li>{t('profile.deleteSubscription')}</li>
                <li>{t('profile.deleteUserAccount')}</li>
              </ul>
              <p style={{ marginTop: '12px', fontWeight: '600', color: '#dc2626' }}>
                {t('profile.deleteIrreversible')}
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              style={{
                width: '100%', padding: '12px',
                backgroundColor: '#dc2626', color: 'white',
                borderRadius: '10px', border: 'none',
                fontWeight: '600', fontSize: '15px', cursor: 'pointer',
                marginBottom: '8px', opacity: deletingAccount ? 0.6 : 1,
              }}
            >
              {deletingAccount ? t('profile.deleting') : t('profile.confirmDeleteButton')}
            </button>
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={deletingAccount}
              style={{
                width: '100%', padding: '10px',
                backgroundColor: 'transparent', color: '#6b7280',
                border: 'none', cursor: 'pointer', fontSize: '14px',
              }}
            >
              {t('profile.cancelButton')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function UsageStat({ label, used, max }) {
  const { t } = useTranslation();
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const isUnlimited = max === null || max === undefined;
  const isHigh = !isUnlimited && pct >= 80;

  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${isHigh ? 'text-red-600' : 'text-slate-900'}`}>
        {used}{isUnlimited ? '' : `/${max}`}
      </div>
      {isUnlimited ? (
        <div className="text-xs text-green-600 font-medium mt-0.5">{t('profile.unlimited')}</div>
      ) : (
        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${isHigh ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
