import { Link } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function UpgradePrompt({ messageKey, minPlan = 'basic', className = '' }) {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2 text-center">
        {t(messageKey || 'pricing.featureLocked')}
      </h3>
      <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
        {t('pricing.upgradeDesc', { plan: minPlan === 'pro' ? 'Pro' : 'Basic' })}
      </p>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all no-underline shadow-lg shadow-amber-200"
      >
        <Zap className="w-4 h-4" />
        {t('pricing.upgradeNow')}
      </Link>
    </div>
  );
}

export function UpgradeOverlay({ messageKey, minPlan = 'basic' }) {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-xl flex flex-col items-center justify-center">
      <Lock className="w-10 h-10 text-amber-500 mb-3" />
      <p className="text-sm font-semibold text-slate-800 mb-3 text-center px-4">
        {t(messageKey || 'pricing.featureLocked')}
      </p>
      <Link
        to="/pricing"
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs font-semibold hover:from-amber-600 hover:to-orange-600 transition-all no-underline"
      >
        <Zap className="w-3.5 h-3.5" />
        {t('pricing.upgradeNow')}
      </Link>
    </div>
  );
}

export function LimitToast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-pulse">
      <Lock className="w-4 h-4" />
      {message}
    </div>
  );
}
