import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Zap, Rocket, Lock, Loader2, ArrowDown, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription';
import { createCheckout, downgradeSubscription } from '../api';

const PLAN_ORDER = { free: 0, basic: 1, pro: 2 };

const PLANS = [
  {
    id: 'free',
    nameKey: 'pricing.free',
    price: '0',
    features: [
      { key: 'pricing.docs10', included: true },
      { key: 'pricing.ki10', included: true },
      { key: 'pricing.behoerde2', included: true },
      { key: 'pricing.befund2', included: true },
      { key: 'pricing.expenses', included: false },
      { key: 'pricing.push', included: false },
    ],
  },
  {
    id: 'basic',
    nameKey: 'pricing.basic',
    price: '2,99',
    popular: false,
    features: [
      { key: 'pricing.docs50', included: true },
      { key: 'pricing.ki50', included: true },
      { key: 'pricing.behoerde10', included: true },
      { key: 'pricing.befund10', included: true },
      { key: 'pricing.expenses', included: true },
      { key: 'pricing.push3days', included: true },
    ],
  },
  {
    id: 'pro',
    nameKey: 'pricing.pro',
    price: '5,99',
    popular: true,
    features: [
      { key: 'pricing.docsUnlimited', included: true },
      { key: 'pricing.ki500', included: true },
      { key: 'pricing.behoerde50', included: true },
      { key: 'pricing.befund50', included: true },
      { key: 'pricing.expenses', included: true },
      { key: 'pricing.pushAll', included: true },
    ],
  },
];

export default function PricingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan: currentPlan, subscription, refresh } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isDowngrade = (planId) => PLAN_ORDER[planId] < PLAN_ORDER[currentPlan];
  const isUpgrade = (planId) => PLAN_ORDER[planId] > PLAN_ORDER[currentPlan];

  const handleSelect = async (planId) => {
    if (planId === currentPlan) return;

    setLoadingPlan(planId);
    setError(null);
    setSuccess(null);

    try {
      if (isDowngrade(planId)) {
        if (!confirm(t('pricing.downgradeConfirm', { plan: t(`pricing.${planId}`) }))) {
          setLoadingPlan(null);
          return;
        }
        await downgradeSubscription(planId);
        setSuccess(t('pricing.downgradeSuccess'));
        refresh();
      } else {
        const { checkout_url } = await createCheckout(planId);
        if (checkout_url) {
          window.location.href = checkout_url;
        } else {
          setError(t('pricing.stripeNotReady'));
        }
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : isDowngrade(planId) ? t('pricing.downgradeFailed') : t('pricing.error'));
    } finally {
      setLoadingPlan(null);
    }
  };

  const getButtonText = (planId) => {
    if (planId === currentPlan) return t('pricing.currentPlan');
    if (isDowngrade(planId)) return t('pricing.downgrade');
    return t('pricing.upgrade');
  };

  const getButtonStyle = (planId, isPopular, isCurrent) => {
    if (isCurrent) return 'bg-green-50 text-green-700 border border-green-200';
    if (isDowngrade(planId)) return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
    if (isPopular) return 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50';
    return 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50';
  };

  const pendingPlan = subscription?.pending_plan;

  const getButtonBg = (planId, isPopular, isCurrent) => {
    if (isCurrent) return { background: 'var(--success-soft)', color: 'var(--success-text)', border: '1px solid rgba(16,185,129,0.2)' };
    if (isDowngrade(planId)) return { background: 'var(--bg-glass)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)' };
    if (isPopular) return { background: 'var(--accent-solid)', color: '#fff', border: 'none' };
    return { background: 'var(--bg-glass)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' };
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }} className="animate-fade-in">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>{t('pricing.title')}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{t('pricing.subtitle')}</p>
      </div>

      {error && (
        <div className="glass-card" style={{ padding: 14, marginBottom: 14, textAlign: 'center', fontSize: 13, color: 'var(--danger-text)', border: '1px solid rgba(239,68,68,0.15)' }}>{error}</div>
      )}
      {success && (
        <div className="glass-card" style={{ padding: 14, marginBottom: 14, textAlign: 'center', fontSize: 13, color: 'var(--success-text)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <CheckCircle style={{ width: 14, height: 14 }} />{success}
        </div>
      )}
      {pendingPlan && (
        <div className="glass-card" style={{ padding: 14, marginBottom: 14, textAlign: 'center', fontSize: 13, color: 'var(--warning-text)', border: '1px solid rgba(245,158,11,0.15)' }}>
          {t('profile.pendingDowngrade', { date: subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : '—', plan: t(`pricing.${pendingPlan}`) })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isPopular = plan.popular;
          const isPending = pendingPlan === plan.id;
          const btnStyle = getButtonBg(plan.id, isPopular, isCurrent);

          return (
            <div
              key={plan.id}
              className="glass-card animate-fade-in-up"
              style={{
                position: 'relative', padding: 20, display: 'flex', flexDirection: 'column',
                border: isPopular && !isCurrent ? '1px solid var(--accent-solid)' : isCurrent ? '1px solid rgba(16,185,129,0.3)' : isPending ? '1px solid rgba(245,158,11,0.3)' : undefined,
              }}
            >
              {isPopular && !isCurrent && (
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-solid)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20 }}>
                  {t('pricing.recommended')}
                </div>
              )}
              {isCurrent && (
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20 }}>
                  {t('pricing.currentBadge')}
                </div>
              )}

              <div style={{ marginBottom: 14, paddingTop: (isPopular || isCurrent) ? 4 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {plan.id === 'free' && <Lock style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />}
                  {plan.id === 'basic' && <Zap style={{ width: 16, height: 16, color: 'var(--warning-text)' }} />}
                  {plan.id === 'pro' && <Rocket style={{ width: 16, height: 16, color: 'var(--accent-solid)' }} />}
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t(plan.nameKey)}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>{plan.price}€</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/{t('pricing.month')}</span>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {plan.features.map((feat, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {feat.included ? (
                      <Check style={{ width: 16, height: 16, color: 'var(--success)', flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <X style={{ width: 16, height: 16, color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0, marginTop: 1 }} />
                    )}
                    <span style={{ fontSize: 13, color: feat.included ? 'var(--text-secondary)' : 'var(--text-muted)', textDecoration: feat.included ? 'none' : 'line-through' }}>
                      {t(feat.key)}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.id)}
                disabled={isCurrent || loadingPlan === plan.id}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: isCurrent ? 'default' : 'pointer',
                  transition: 'all 0.15s ease', opacity: (isCurrent || loadingPlan === plan.id) ? 0.7 : 1,
                  ...btnStyle,
                }}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                ) : (
                  getButtonText(plan.id)
                )}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
        {t('pricing.cancelAnytime')}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

