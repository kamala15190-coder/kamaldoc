/**
 * useEmailAccounts Hook
 * React hook for managing connected email accounts.
 * Provides account list, connect/disconnect, and OAuth callback handling.
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  getConnectedAccounts,
  disconnectAccount,
  startOAuthFlow,
  handleOAuthCallback,
  saveAccount,
} from './EmailConnectorService';

export function useEmailAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null); // provider name or null

  const refresh = useCallback(async () => {
    try {
      const accs = await getConnectedAccounts();
      setAccounts(accs);
    } catch (err) {
      console.error('Failed to load email accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Handle OAuth callbacks (deep link on native, URL params on web)
  useEffect(() => {
    const handleCallback = async (url) => {
      const match = url.match(/email-callback\/(gmail|outlook|gmx|icloud|yahoo)/);
      if (!match) return;

      const provider = match[1];
      setConnecting(provider);
      try {
        await handleOAuthCallback(provider, url);
        await refresh();
      } catch (err) {
        console.error(`OAuth callback failed for ${provider}:`, err);
      } finally {
        setConnecting(null);
      }
    };

    // Web: check current URL on mount
    if (!Capacitor.isNativePlatform() && window.location.pathname.includes('email-callback')) {
      handleCallback(window.location.href).then(() => {
        // Clean up URL
        window.history.replaceState(null, '', '/profil');
      });
    }

    // Native: listen for deep links
    let listener = null;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        listener = App.addListener('appUrlOpen', async ({ url }) => {
          if (url.includes('email-callback')) {
            try {
              const { Browser } = await import('@capacitor/browser');
              await Browser.close();
            } catch (_) {}
            await handleCallback(url);
          }
        });
      });
    }

    return () => {
      if (listener) listener.remove();
    };
  }, [refresh]);

  /**
   * Start connecting an email account.
   * For OAuth providers (gmail, outlook): opens browser.
   * For app-password providers (gmx, icloud, yahoo): returns { mode: 'app_password' }.
   */
  const connect = useCallback(async (providerName) => {
    setConnecting(providerName);
    try {
      const result = startOAuthFlow(providerName);
      if (result.mode === 'app_password') {
        // UI will show a form — don't close connecting state yet
        return result;
      }
      // OAuth flow opened in browser, wait for callback
      return result;
    } catch (err) {
      console.error(`Failed to start OAuth for ${providerName}:`, err);
      setConnecting(null);
      throw err;
    }
  }, []);

  /**
   * Save manually entered credentials (for app-password providers).
   */
  const connectWithPassword = useCallback(async (provider, email, password) => {
    setConnecting(provider);
    try {
      await saveAccount({
        provider,
        email,
        tokens: {
          auth_type: 'password',
          app_password: password,
        },
      });
      await refresh();
    } catch (err) {
      console.error(`Failed to connect ${provider}:`, err);
      throw err;
    } finally {
      setConnecting(null);
    }
  }, [refresh]);

  /**
   * Disconnect an email account and delete all stored tokens.
   */
  const disconnect = useCallback(async (accountId) => {
    try {
      await disconnectAccount(accountId);
      await refresh();
    } catch (err) {
      console.error('Failed to disconnect account:', err);
      throw err;
    }
  }, [refresh]);

  return {
    accounts,
    loading,
    connecting,
    connect,
    connectWithPassword,
    disconnect,
    refresh,
    setConnecting,
  };
}
