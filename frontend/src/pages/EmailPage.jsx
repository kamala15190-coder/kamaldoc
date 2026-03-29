import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmailAccountSettings from '../email/EmailAccountSettings';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

export default function EmailPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isEnabled, loaded } = useFeatureFlags();

  if (loaded && !isEnabled('email_enabled')) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}>
            <ArrowLeft style={{ width: 16, height: 16, color: 'var(--text-primary)' }} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {t('email.connectTitle', 'E-Mail verbinden')}
          </h1>
        </div>
        <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
          <Mail style={{ width: 32, height: 32, color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            Diese Funktion ist derzeit nicht verfügbar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
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