import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmailAccountSettings from '../email/EmailAccountSettings';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

export default function EmailPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isEnabled, loaded } = useFeatureFlags();

  // Don't render the full connector UI before flags resolve — otherwise it flashes
  // for a frame even when the feature is disabled.
  if (!loaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(232,154,82,0.15)', borderTopColor: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loaded && !isEnabled('email_enabled')) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => navigate(-1)} aria-label={t('common.back', 'Zurück')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft style={{ width: 18, height: 18, color: 'var(--text-primary)' }} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {t('email.connectTitle', 'E-Mail verbinden')}
          </h1>
        </div>
        <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
          <Mail style={{ width: 32, height: 32, color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            {t('email.unavailable', 'Diese Funktion ist derzeit nicht verfügbar.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div data-intro="email" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}>
          <ArrowLeft style={{ width: 16, height: 16, color: 'var(--text-primary)' }} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {t('email.connectTitle', 'E-Mail verbinden')}
        </h1>
      </div>

      <EmailAccountSettings />
    </div>
  );
}