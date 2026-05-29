/**
 * EmailAccountSettings
 * UI component for the profile/settings page.
 * Shows connected email accounts and allows connecting/disconnecting.
 */

import { useState } from 'react';
import { Mail, Plus, Trash2, Loader2, CheckCircle, AlertCircle, Shield, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEmailAccounts } from './useEmailAccounts';
import { PROVIDER_INFO } from './EmailConnectorService';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

const ALL_PROVIDERS = ['gmail', 'outlook', 'gmx', 'icloud', 'yahoo'];

export default function EmailAccountSettings() {
  const { t } = useTranslation();
  const { accounts, loading, connecting, connect, connectWithPassword, disconnect, setConnecting } = useEmailAccounts();
  const { isEnabled } = useFeatureFlags();
  const PROVIDERS = ALL_PROVIDERS.filter(p => isEnabled(`email_${p}`));
  const [showPasswordForm, setShowPasswordForm] = useState(null); // { provider, instructions }
  const [pwEmail, setPwEmail] = useState('');
  const [pwPassword, setPwPassword] = useState('');
  const [pwError, setPwError] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleConnect = async (provider) => {
    setPwError(null);
    try {
      const result = await connect(provider);
      if (result?.mode === 'app_password') {
        setShowPasswordForm({ provider, instructions: result.instructions });
        setPwEmail('');
        setPwPassword('');
      }
    } catch {
      setPwError(t('email.connectFailed'));
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pwEmail || !pwPassword) {
      setPwError(t('email.fillAllFields'));
      return;
    }
    setPwError(null);
    try {
      await connectWithPassword(showPasswordForm.provider, pwEmail, pwPassword);
      setShowPasswordForm(null);
      setPwEmail('');
      setPwPassword('');
    } catch (err) {
      setPwError(err.message || t('email.connectFailed'));
    }
  };

  const handleDisconnect = async (accountId) => {
    setDisconnecting(accountId);
    try {
      await disconnect(accountId);
    } catch { /* ignore */ }
    setDisconnecting(null);
  };

  if (loading) return null;

  const connectedProviders = new Set(accounts.map(a => a.provider));

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Mail style={{ width: 16, height: 16, color: 'var(--accent-solid)' }} />
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {t('email.connectedAccounts')}
        </h2>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>
        {t('email.connectedDesc')}
      </p>

      {/* DSGVO/Privacy Notice */}
      <button
        onClick={() => setShowPrivacy(!showPrivacy)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 8, marginBottom: 14, width: '100%',
          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', textAlign: 'left',
        }}
      >
        <Shield style={{ width: 12, height: 12, flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{t('email.privacyNotice')}</span>
      </button>
      {showPrivacy && (
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 14,
          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
        }}>
          <p style={{ margin: '0 0 6px' }}>{t('email.privacyDetail1')}</p>
          <p style={{ margin: '0 0 6px' }}>{t('email.privacyDetail2')}</p>
          <p style={{ margin: 0 }}>{t('email.privacyDetail3')}</p>
        </div>
      )}

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {accounts.map((acc) => {
            const info = PROVIDER_INFO[acc.provider] || {};
            return (
              <div
                key={acc.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                  background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${info.color || '#666'}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mail style={{ width: 14, height: 14, color: info.color || '#666' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {info.name || acc.provider}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {acc.email}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle style={{ width: 12, height: 12, color: 'var(--success)' }} />
                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    disabled={disconnecting === acc.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 6,
                      background: 'var(--danger-soft)', border: 'none',
                      color: 'var(--danger)', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', opacity: disconnecting === acc.id ? 0.5 : 1,
                    }}
                  >
                    {disconnecting === acc.id ? (
                      <Loader2 style={{ width: 10, height: 10, animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <Trash2 style={{ width: 10, height: 10 }} />
                    )}
                    {t('email.disconnect')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available Providers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PROVIDERS.filter(p => !connectedProviders.has(p)).map((provider) => {
          const info = PROVIDER_INFO[provider] || {};
          const isConnecting = connecting === provider;
          return (
            <button
              key={provider}
              onClick={() => handleConnect(provider)}
              disabled={!!connecting}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                cursor: connecting ? 'default' : 'pointer',
                opacity: connecting && !isConnecting ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${info.color || '#666'}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Mail style={{ width: 14, height: 14, color: info.color || '#666' }} />
              </div>
              <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {info.name || provider}
              </span>
              {isConnecting ? (
                <Loader2 style={{ width: 14, height: 14, color: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 6,
                  background: 'var(--accent-soft)', color: 'var(--accent-solid)',
                  fontSize: 11, fontWeight: 600,
                }}>
                  <Plus style={{ width: 10, height: 10 }} />
                  {t('email.connect')}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* App Password Form Modal */}
      {showPasswordForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={() => { setShowPasswordForm(null); setConnecting(null); }}>
          <div
            className="glass-card animate-scale-in"
            style={{ padding: 24, width: '100%', maxWidth: 380 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Mail style={{ width: 18, height: 18, color: PROVIDER_INFO[showPasswordForm.provider]?.color || 'var(--accent-solid)' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {PROVIDER_INFO[showPasswordForm.provider]?.name} {t('email.connectTitle')}
              </h3>
            </div>

            {/* Provider-specific instructions */}
            {showPasswordForm.instructions && (
              <div style={{
                padding: 10, borderRadius: 8, marginBottom: 14,
                background: 'var(--warning-soft)', border: '1px solid rgba(245,158,11,0.15)',
                fontSize: 12, color: 'var(--warning-text)', lineHeight: 1.5,
              }}>
                <AlertCircle style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {t(`email.${showPasswordForm.instructions}`)}
                {showPasswordForm.provider === 'icloud' && (
                  <a
                    href="https://appleid.apple.com/account/manage"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-solid)', marginTop: 6, fontSize: 11 }}
                  >
                    Apple ID {t('email.manage')} <ExternalLink style={{ width: 10, height: 10 }} />
                  </a>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {t('email.emailAddress')}
                </label>
                <input
                  type="email"
                  value={pwEmail}
                  onChange={e => setPwEmail(e.target.value)}
                  placeholder={`user@${showPasswordForm.provider === 'icloud' ? 'icloud.com' : showPasswordForm.provider + '.net'}`}
                  className="input-dark"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {t('email.appPassword')}
                </label>
                <input
                  type="password"
                  value={pwPassword}
                  onChange={e => setPwPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-dark"
                />
              </div>
            </div>

            {pwError && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle style={{ width: 12, height: 12, color: 'var(--danger)' }} />
                <span style={{ fontSize: 12, color: 'var(--danger-text)' }}>{pwError}</span>
              </div>
            )}

            <button
              onClick={handlePasswordSubmit}
              disabled={!!connecting}
              className="btn-accent"
              style={{
                width: '100%', marginTop: 14, padding: '12px 0',
                fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: connecting ? 0.5 : 1,
              }}
            >
              {connecting ? (
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <Mail style={{ width: 16, height: 16 }} />
              )}
              {t('email.connectButton')}
            </button>

            <button
              onClick={() => { setShowPasswordForm(null); setConnecting(null); }}
              style={{
                width: '100%', marginTop: 6, padding: 10,
                background: 'transparent', border: 'none',
                color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
              }}
            >
              {t('email.cancel')}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
