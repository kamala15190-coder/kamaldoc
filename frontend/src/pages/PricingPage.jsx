import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Zap, Rocket, Lock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription';
import { createCheckout } from '../api';

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
      { key: 'pricing.kiUnlimited', included: true },
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
      { key: 'pricing.kiUnlimited', included: true },
      { key: 'pricing.behoerdeUnlimited', included: true },
      { key: 'pricing.befundUnlimited', included: true },
      { key: 'pricing.expenses', included: true },
      { key: 'pricing.pushAll', included: true },
    ],
  },
];

export default function PricingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan: currentPlan, refresh } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  const handleSelect = async (planId) => {
    if (planId === 'free' || planId === currentPlan) return;

    setLoadingPlan(planId);
    setError(null);
    try {
      const { checkout_url } = await createCheckout(planId);
      if (checkout_url) {
        window.location.href = checkout_url;
      } else {
        setError(t('pricing.stripeNotReady'));
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('pricing.error'));
    } finally {
      setLoadingPlan(null);
    }
  };

  const getButtonText = (planId) => {
    if (planId === currentPlan) return t('pricing.currentPlan');
    if (planId === 'free') return t('pricing.freePlan');
    if (currentPlan === 'pro' && planId === 'basic') return t('pricing.downgrade');
    return t('pricing.upgrade');
  };

  return (
    <div className="max-w-5xl mx-auto py-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('pricing.title')}</h1>
        <p className="text-slate-500">{t('pricing.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col transition-all ${
                isPopular
                  ? 'border-indigo-500 shadow-lg shadow-indigo-100 scale-[1.02]'
                  : isCurrent
                  ? 'border-green-400 shadow-sm'
                  : 'border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {t('pricing.recommended')}
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {t('pricing.currentBadge')}
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  {plan.id === 'free' && <Lock className="w-5 h-5 text-slate-400" />}
                  {plan.id === 'basic' && <Zap className="w-5 h-5 text-amber-500" />}
                  {plan.id === 'pro' && <Rocket className="w-5 h-5 text-indigo-600" />}
                  <h2 className="text-xl font-bold text-slate-900">{t(plan.nameKey)}</h2>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">{plan.price}€</span>
                  <span className="text-slate-500 text-sm">/{t('pricing.month')}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    {feat.included ? (
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                    )}
                    <span className={feat.included ? 'text-slate-700 text-sm' : 'text-slate-400 text-sm line-through'}>
                      {t(feat.key)}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.id)}
                disabled={isCurrent || plan.id === 'free' || loadingPlan === plan.id}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none disabled:cursor-default ${
                  isPopular && !isCurrent
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                    : isCurrent
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : plan.id === 'free'
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'
                }`}
                style={{ minHeight: '48px' }}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  getButtonText(plan.id)
                )}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 mt-8">
        {t('pricing.cancelAnytime')}
      </p>
    </div>
  );
}
