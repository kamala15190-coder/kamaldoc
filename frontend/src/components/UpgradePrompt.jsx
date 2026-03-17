import { Link } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function UpgradePrompt({ messageKey, minPlan = 'basic', className = '' }) {
  const { t } = useTranslation();

  return (
    <div className={`animate-fade-in ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Lock style={{ width: 28, height: 28, color: '#fbbf24' }} />
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
        {t(messageKey || 'pricing.featureLocked')}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center', maxWidth: 300 }}>
        {t('pricing.upgradeDesc', { plan: minPlan === 'pro' ? 'Pro' : 'Basic' })}
      </p>
      <Link
        to="/pricing"
        className="btn-accent"
        style={{ padding: '12px 28px', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <Zap style={{ width: 16, height: 16 }} />
        {t('pricing.upgradeNow')}
      </Link>
    </div>
  );
}

export function UpgradeOverlay({ messageKey, minPlan = 'basic' }) {
  const { t } = useTranslation();

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,20,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 10, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Lock style={{ width: 36, height: 36, color: '#fbbf24', marginBottom: 10 }} />
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, textAlign: 'center', padding: '0 16px' }}>
        {t(messageKey || 'pricing.featureLocked')}
      </p>
      <Link
        to="/pricing"
        className="btn-accent"
        style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
      >
        <Zap style={{ width: 14, height: 14 }} />
        {t('pricing.upgradeNow')}
      </Link>
    </div>
  );
}

export function LimitToast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
      background: 'rgba(245,158,11,0.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      color: '#fff', padding: '12px 24px', borderRadius: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600,
    }} className="animate-fade-in">
      <Lock style={{ width: 16, height: 16 }} />
      {message}
    </div>
  );
}
