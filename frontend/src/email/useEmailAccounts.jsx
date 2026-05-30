/**
 * useEmailAccounts — server-side connector accounts (Phase F).
 *
 * All credentials live encrypted on the backend. This hook only talks to the
 * /api/connectors/* endpoints; tokens and passwords never pass through or rest
 * in the frontend. OAuth providers (Gmail) use a fully server-side flow: we ask
 * the backend for an auth URL, the provider redirects to the backend relay, and
 * the relay stores the account before bouncing us back to /email-callback/*.
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/useToast';
import {
  getConnectorAccounts,
  getConnectorMeta,
  connectImapAccount,
  startConnectorOAuth,
  deleteConnectorAccount,
  syncConnectorAccount,
  patchConnectorAccount,
} from '../api';

// Only process a given OAuth callback once (React StrictMode double-mounts,
// back-navigation). Keyed by the email/marker carried in the redirect.
const processedCallbacks = new Set();

export function useEmailAccounts() {
  const { t } = useTranslation();
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [connectors, setConnectors] = useState({});      // type -> meta from server
  const [encryptionReady, setEncryptionReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);                // connector_type or account id currently working

  const refresh = useCallback(async () => {
    try {
      const [accs, meta] = await Promise.all([getConnectorAccounts(), getConnectorMeta()]);
      setAccounts(accs);
      setConnectors(meta.connectors || {});
      setEncryptionReady(!!meta.encryption_ready);
    } catch (err) {
      console.error('Failed to load connector accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Handle the OAuth success/error bounce (web URL hash or native deep link).
  useEffect(() => {
    const cleanUrl = () => {
      try { window.history.replaceState(null, '', '/profil'); } catch { /* ignore */ }
    };

    const handleCallback = async (url) => {
      if (!/email-callback\//.test(url)) return;
      let connected = null, errorMsg = null, email = '';
      try {
        const hash = (url.split('#')[1] || '');
        const query = (url.split('?')[1] || '').split('#')[0];
        const params = new URLSearchParams(hash || query);
        connected = params.get('connected');
        email = params.get('email') || '';
        errorMsg = params.get('gmail_error') || params.get('error');
      } catch { /* ignore */ }

      const key = email || errorMsg || url;
      if (processedCallbacks.has(key)) return;
      processedCallbacks.add(key);

      if (errorMsg) {
        toast.error(t('email.connectFailedWithReason', { reason: decodeURIComponent(errorMsg) }));
        return;
      }
      if (connected) {
        await refresh();
        toast.success(
          email
            ? t('email.connectSuccess') + ` (${decodeURIComponent(email)})`
            : t('email.connectSuccess')
        );
      }
    };

    if (!Capacitor.isNativePlatform() && window.location.pathname.includes('email-callback')) {
      handleCallback(window.location.href).finally(cleanUrl);
    }

    let listener = null;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        listener = App.addListener('appUrlOpen', async ({ url }) => {
          if (url.includes('email-callback')) {
            try {
              const { Browser } = await import('@capacitor/browser');
              await Browser.close();
            } catch { /* ignore */ }
            await handleCallback(url);
          }
        });
      });
    }
    return () => { if (listener) listener.remove(); };
  }, [refresh, toast, t]);

  // Start a server-side OAuth flow (Gmail). Redirects the browser / opens the
  // in-app browser to the provider; the backend relay finishes and stores it.
  const startOAuth = useCallback(async (connectorType) => {
    setBusy(connectorType);
    try {
      const platform = Capacitor.isNativePlatform() ? 'native' : 'web';
      const { auth_url } = await startConnectorOAuth(connectorType, platform);
      if (!auth_url) throw new Error('no_auth_url');
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: auth_url, presentationStyle: 'popover' });
        setBusy(null);
      } else {
        window.location.href = auth_url; // full redirect; page unloads
      }
    } catch (err) {
      setBusy(null);
      const reason = err?.response?.data?.detail || err?.message || '';
      toast.error(t('email.connectFailedWithReason', { reason }));
      throw err;
    }
  }, [toast, t]);

  // Connect an IMAP / app-password mailbox. Credentials go straight to the
  // backend, which encrypts them at rest.
  const connectImap = useCallback(async ({ connectorType, displayName, email, password, host, port }) => {
    setBusy(connectorType);
    try {
      await connectImapAccount({
        connector_type: connectorType,
        display_name: displayName || null,
        email, password,
        host: host || null,
        port: port || 993,
      });
      await refresh();
    } catch (err) {
      const reason = err?.response?.data?.detail || err?.message || '';
      throw new Error(reason || t('email.connectFailed'));
    } finally {
      setBusy(null);
    }
  }, [refresh, t]);

  const remove = useCallback(async (accountId) => {
    await deleteConnectorAccount(accountId);
    await refresh();
  }, [refresh]);

  const sync = useCallback(async (accountId) => {
    setBusy(accountId);
    try {
      await syncConnectorAccount(accountId);
      await refresh();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const rename = useCallback(async (accountId, displayName) => {
    await patchConnectorAccount(accountId, { display_name: displayName });
    await refresh();
  }, [refresh]);

  return {
    accounts,
    connectors,
    encryptionReady,
    loading,
    busy,
    startOAuth,
    connectImap,
    remove,
    sync,
    rename,
    refresh,
  };
}
