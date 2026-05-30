/**
 * EmailAccountSettings — multi-account mailbox connector UI (Phase F).
 *
 * Talks only to the server-side /api/connectors/* endpoints via useEmailAccounts.
 * Credentials never touch the frontend: OAuth (Gmail) redirects through the
 * backend relay, IMAP/app-passwords are POSTed once and encrypted at rest.
 */

import { useState } from 'react';
import {
  Mail, Plus, Trash2, Loader2, CheckCircle, AlertCircle, Shield,
  RefreshCw, ChevronLeft, Clock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEmailAccounts } from './useEmailAccounts';
import { providerMeta, APP_PASSWORD_HINT } from './connectorMeta';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { formatLocalDate } from '../utils/dateUtils';

// Outlook has no server-side OAuth credentials yet → offered as "coming soon".
const COMING_SOON = new Set(['outlook']);

export default function EmailAccountSettings() {
  const { t } = useTranslation();
  const { isEnabled } = useFeatureFlags();
  const {
    accounts, connectors, encryptionReady, loading, busy,
    startOAuth, connectImap, remove, sync,
  } = useEmailAccounts();

  const [picking, setPicking] = useState(false);     // provider-picker open
  const [imapForm, setImapForm] = useState(null);    // { type, meta }
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', host: '', port: 993 });
  const [formError, setFormError] = useState(null);

  // Providers the server offers, filtered by feature flags (email_<type>).
  const providerTypes = Object.keys(connectors).filter(
    (type) => isEnabled(`email_${type}`) !== false
  );

  const openImapForm = (type, meta) => {
    setForm({ displayName: '', email: '', password: '', host: meta.host || '', port: meta.port || 993 });
    setFormError(null);
    setImapForm({ type, meta });
    setPicking(false);
  };

  const handlePick = async (type, meta) => {
    if (COMING_SOON.has(type)) return;
    if (meta.auth === 'oauth') {
      setPicking(false);
      try { await startOAuth(type); } catch { /* toast handled in hook */ }
    } else {
      openImapForm(type, meta);
    }
  };

  const submitImap = async () => {
    if (!form.email || !form.password || (imapForm.type === 'imap' && !form.host)) {
      setFormError(t('email.fillAllFields'));
      return;
    }
    setFormError(null);
    try {
      await connectImap({
        connectorType: imapForm.type,
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        host: form.host,
        port: Number(form.port) || 993,
      });
      setImapForm(null);
    } catch (err) {
      setFormError(err.message || t('email.connectFailed'));
    }
  };

  const handleRemove = async (id) => {
    setRemoving(id);
    try { await remove(id); } catch { /* ignore */ }
    setRemoving(null);
  };

  if (loading) return null;

  const STATUS = {
    active:        { color: 'var(--success)',      soft: 'rgba(0,200,150,0.12)',  Icon: CheckCircle,  label: t('email.statusActive', 'Active') },
    token_expired: { color: 'var(--warning-text)', soft: 'var(--warning-soft)',   Icon: AlertCircle,  label: t('email.statusTokenExpired', 'Reconnect needed') },
    error:         { color: 'var(--danger)',       soft: 'var(--danger-soft)',    Icon: AlertCircle,  label: t('email.statusError', 'Error') },
  };

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Mail style={{ width: 16, height: 16, color: 'var(--accent-solid)' }} />
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {t('email.connectedAccounts')}
        </h2>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>
        {t('email.connectedDesc')}
      </p>

      {/* Privacy notice */}
      <button
        onClick={() => setShowPrivacy(!showPrivacy)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8,
          marginBottom: 14, width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', textAlign: 'left',
        }}
      >
        <Shield style={{ width: 12, height: 12, flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{t('email.privacyNotice')}</span>
      </button>
      {showPrivacy && (
        <div style={{
          padding: 12, borderRadius: 8, marginBottom: 14, background: 'var(--bg-glass)',
          border: '1px solid var(--border-glass)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
        }}>
          <p style={{ margin: '0 0 6px' }}>{t('email.privacyDetail1')}</p>
          <p style={{ margin: '0 0 6px' }}>{t('email.privacyDetail2')}</p>
          <p style={{ margin: 0 }}>{t('email.privacyDetail3')}</p>
        </div>
      )}

      {/* Encryption unavailable */}
      {!encryptionReady ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10,
          background: 'var(--warning-soft)', border: '1px solid rgba(245,158,11,0.15)',
          fontSize: 12, color: 'var(--warning-text)',
        }}>
          <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
          {t('email.unavailable', 'Email connection is currently unavailable.')}
        </div>
      ) : (
        <>
          {/* Connected accounts */}
          {accounts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {accounts.map((acc) => {
                const meta = providerMeta(acc.connector_type);
                const st = STATUS[acc.status] || STATUS.active;
                const isBusy = busy === acc.id;
                return (
                  <div key={acc.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                    background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: `${meta.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Mail style={{ width: 14, height: 14, color: meta.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {acc.display_name || meta.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {acc.remote_account_id}
                      </div>
                      {/* Status + last sync */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600,
                          padding: '1px 6px', borderRadius: 4, background: st.soft, color: st.color,
                        }}>
                          <st.Icon style={{ width: 10, height: 10 }} />
                          {st.label}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)' }}>
                          <Clock style={{ width: 9, height: 9 }} />
                          {acc.last_sync_at
                            ? formatLocalDate(acc.last_sync_at)
                            : t('email.neverSynced', 'Not synced yet')}
                        </span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => sync(acc.id)}
                        disabled={isBusy}
                        title={t('email.sync', 'Sync')}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28,
                          borderRadius: 6, background: 'var(--accent-soft)', border: 'none',
                          color: 'var(--accent-solid)', cursor: 'pointer', opacity: isBusy ? 0.5 : 1,
                        }}
                      >
                        <RefreshCw style={{ width: 12, height: 12, animation: isBusy ? 'spin 0.8s linear infinite' : 'none' }} />
                      </button>
                      <button
                        onClick={() => handleRemove(acc.id)}
                        disabled={removing === acc.id}
                        title={t('email.disconnect')}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28,
                          borderRadius: 6, background: 'var(--danger-soft)', border: 'none',
                          color: 'var(--danger)', cursor: 'pointer', opacity: removing === acc.id ? 0.5 : 1,
                        }}
                      >
                        {removing === acc.id
                          ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 0.8s linear infinite' }} />
                          : <Trash2 style={{ width: 12, height: 12 }} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {accounts.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px', textAlign: 'center' }}>
              {t('email.noAccounts', 'No mailboxes connected yet.')}
            </p>
          )}

          {/* Add mailbox button */}
          {!picking && (
            <button
              onClick={() => setPicking(true)}
              className="btn-accent"
              style={{
                width: '100%', padding: '11px 0', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              {t('email.addAccount', 'Add mailbox')}
            </button>
          )}

          {/* Provider picker */}
          {picking && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <button
                  onClick={() => setPicking(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}
                >
                  <ChevronLeft style={{ width: 14, height: 14, color: 'var(--text-primary)' }} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('email.chooseProvider', 'Choose a provider')}
                </span>
              </div>
              {providerTypes.map((type) => {
                const meta = providerMeta(type);
                const srv = connectors[type] || {};
                const soon = COMING_SOON.has(type);
                const isBusy = busy === type;
                return (
                  <button
                    key={type}
                    onClick={() => handlePick(type, srv)}
                    disabled={soon || !!busy}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                      background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                      cursor: soon ? 'default' : 'pointer', opacity: soon ? 0.5 : 1, transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mail style={{ width: 14, height: 14, color: meta.color }} />
                    </div>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {srv.label || meta.name}
                    </span>
                    {soon ? (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
                        {t('email.comingSoon', 'Coming soon')}
                      </span>
                    ) : isBusy ? (
                      <Loader2 style={{ width: 14, height: 14, color: 'var(--accent-solid)', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <Plus style={{ width: 14, height: 14, color: 'var(--accent-solid)' }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* IMAP / app-password form modal */}
      {imapForm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => setImapForm(null)}
        >
          <div className="glass-card animate-scale-in" style={{ padding: 24, width: '100%', maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Mail style={{ width: 18, height: 18, color: providerMeta(imapForm.type).color }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {imapForm.meta.label || providerMeta(imapForm.type).name}
              </h3>
            </div>

            {APP_PASSWORD_HINT[imapForm.type] && (
              <div style={{
                padding: 10, borderRadius: 8, marginBottom: 14, background: 'var(--warning-soft)',
                border: '1px solid rgba(245,158,11,0.15)', fontSize: 12, color: 'var(--warning-text)', lineHeight: 1.5,
              }}>
                <AlertCircle style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {t(APP_PASSWORD_HINT[imapForm.type])}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label={t('email.displayName', 'Display name (optional)')}>
                <input className="input-dark" value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder={t('email.displayNamePlaceholder', 'e.g. Work, Private')} />
              </Field>
              <Field label={t('email.emailAddress')}>
                <input className="input-dark" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com" />
              </Field>
              <Field label={t('email.appPassword')}>
                <input className="input-dark" type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••" />
              </Field>
              {imapForm.type === 'imap' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 2 }}>
                    <Field label={t('email.imapServer', 'IMAP server')}>
                      <input className="input-dark" value={form.host}
                        onChange={(e) => setForm({ ...form, host: e.target.value })}
                        placeholder="imap.example.com" />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label={t('email.port', 'Port')}>
                      <input className="input-dark" type="number" value={form.port}
                        onChange={(e) => setForm({ ...form, port: e.target.value })} />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            {formError && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle style={{ width: 12, height: 12, color: 'var(--danger)' }} />
                <span style={{ fontSize: 12, color: 'var(--danger-text)' }}>{formError}</span>
              </div>
            )}

            <button
              onClick={submitImap}
              disabled={busy === imapForm.type}
              className="btn-accent"
              style={{
                width: '100%', marginTop: 14, padding: '12px 0', fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: busy === imapForm.type ? 0.5 : 1,
              }}
            >
              {busy === imapForm.type
                ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />
                : <Mail style={{ width: 16, height: 16 }} />}
              {t('email.connectButton')}
            </button>
            <button
              onClick={() => setImapForm(null)}
              style={{ width: '100%', marginTop: 6, padding: 10, background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
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

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
