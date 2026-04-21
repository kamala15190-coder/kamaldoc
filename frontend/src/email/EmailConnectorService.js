/**
 * EmailConnectorService
 * Central service managing all email provider connections.
 * Handles account storage (tokens in secure storage), provider instantiation,
 * and parallel search across all connected accounts.
 */

import { Capacitor } from '@capacitor/core';
import { GmailProvider } from './providers/GmailProvider';
import { OutlookProvider } from './providers/OutlookProvider';
import { GmxProvider } from './providers/GmxProvider';
import { ICloudProvider } from './providers/ICloudProvider';
import { YahooProvider } from './providers/YahooProvider';

const STORAGE_KEY = 'kdoc_email_accounts';
const PROVIDER_TIMEOUT = 5000; // 5s per provider

const PROVIDER_MAP = {
  gmail: GmailProvider,
  outlook: OutlookProvider,
  gmx: GmxProvider,
  icloud: ICloudProvider,
  yahoo: YahooProvider,
};

export const PROVIDER_INFO = {
  gmail: { name: 'Gmail', color: '#EA4335', icon: 'gmail' },
  outlook: { name: 'Outlook', color: '#0078D4', icon: 'outlook' },
  gmx: { name: 'GMX', color: '#1C449B', icon: 'gmx' },
  icloud: { name: 'iCloud', color: '#333333', icon: 'icloud' },
  yahoo: { name: 'Yahoo', color: '#720E9E', icon: 'yahoo' },
};

// ---------- Secure Token Storage ----------

async function secureSet(key, value) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value: JSON.stringify(value) });
      return;
    } catch { /* fallback */ }
  }
  localStorage.setItem(key, JSON.stringify(value));
}

async function secureGet(key) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } catch { /* fallback */ }
  }
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

// ---------- Account CRUD ----------

/**
 * Returns all connected email accounts (without exposing tokens directly).
 * Each account: { id, provider, email, connectedAt }
 */
export async function getConnectedAccounts() {
  const accounts = await secureGet(STORAGE_KEY);
  return (accounts || []).map(({ tokens: _tok, ...rest }) => rest); // eslint-disable-line no-unused-vars
}

/**
 * Returns full account data including tokens (internal use).
 */
async function getAccountsFull() {
  return (await secureGet(STORAGE_KEY)) || [];
}

/**
 * Save a newly connected account.
 */
export async function saveAccount({ provider, email, tokens }) {
  const accounts = await getAccountsFull();
  const existing = accounts.findIndex(a => a.provider === provider && a.email === email);
  const account = {
    id: `${provider}_${email}`,
    provider,
    email,
    tokens,
    connectedAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    accounts[existing] = account;
  } else {
    accounts.push(account);
  }
  await secureSet(STORAGE_KEY, accounts);
  return account;
}

/**
 * Update tokens for an existing account (e.g. after refresh).
 */
export async function updateAccountTokens(accountId, tokens) {
  const accounts = await getAccountsFull();
  const idx = accounts.findIndex(a => a.id === accountId);
  if (idx >= 0) {
    accounts[idx].tokens = tokens;
    await secureSet(STORAGE_KEY, accounts);
  }
}

/**
 * Remove an account and delete all stored tokens.
 */
export async function disconnectAccount(accountId) {
  const accounts = await getAccountsFull();
  const filtered = accounts.filter(a => a.id !== accountId);
  await secureSet(STORAGE_KEY, filtered);
}

// ---------- Provider Instantiation ----------

function createProvider(account) {
  const ProviderClass = PROVIDER_MAP[account.provider];
  if (!ProviderClass) throw new Error(`Unknown provider: ${account.provider}`);
  const provider = new ProviderClass(account);
  // Persist new tokens whenever the provider silently refreshes them
  // (proactive expiry check). The provider assigns this only if supported.
  provider.onTokensRefreshed = async (newTokens) => {
    try {
      await updateAccountTokens(account.id, newTokens);
      account.tokens = newTokens;
    } catch (err) {
      console.error('Failed to persist refreshed tokens:', err);
    }
  };
  return provider;
}

// ---------- Search ----------

/**
 * Search all connected email accounts in parallel.
 * Returns { results: EmailResult[], errors: { provider, error }[] }
 */
export async function searchAllAccounts(query, options = {}) {
  const accounts = await getAccountsFull();
  if (accounts.length === 0) return { results: [], errors: [] };

  const results = [];
  const errors = [];

  const promises = accounts.map(async (account) => {
    const provider = createProvider(account);
    try {
      const providerResults = await Promise.race([
        provider.search(query, options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), PROVIDER_TIMEOUT)
        ),
      ]);
      return { account, results: providerResults };
    } catch (error) {
      // If token expired, try refresh once
      if (error.status === 401 || error.message?.includes('token')) {
        try {
          const newTokens = await provider.refreshToken();
          if (newTokens) {
            await updateAccountTokens(account.id, newTokens);
            account.tokens = newTokens;
            const retryProvider = createProvider(account);
            const retryResults = await Promise.race([
              retryProvider.search(query, options),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), PROVIDER_TIMEOUT)
              ),
            ]);
            return { account, results: retryResults };
          }
        } catch { /* refresh failed */ }
      }
      return { account, error: error.message || 'Unknown error' };
    }
  });

  const settled = await Promise.allSettled(promises);
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      const val = outcome.value;
      if (val.error) {
        errors.push({ provider: val.account.provider, email: val.account.email, error: val.error });
      } else {
        results.push(...val.results);
      }
    } else {
      errors.push({ provider: 'unknown', error: outcome.reason?.message || 'Unknown error' });
    }
  }

  // Sort by date descending
  results.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { results, errors };
}

// ---------- OAuth Flow Helpers ----------

/**
 * Initiates the OAuth2 flow for a given provider.
 * Opens the browser and returns a promise that resolves with the auth result.
 */
export async function startOAuthFlow(providerName) {
  const ProviderClass = PROVIDER_MAP[providerName];
  if (!ProviderClass) throw new Error(`Unknown provider: ${providerName}`);
  return ProviderClass.startOAuthFlow();
}

/**
 * Handles the OAuth callback (deep link or redirect).
 * Extracts tokens from the URL and saves the account.
 */
export async function handleOAuthCallback(providerName, callbackUrl) {
  const ProviderClass = PROVIDER_MAP[providerName];
  if (!ProviderClass) throw new Error(`Unknown provider: ${providerName}`);
  const result = await ProviderClass.handleOAuthCallback(callbackUrl);
  if (result) {
    await saveAccount(result);
  }
  return result;
}

/**
 * Fetches full email content for preview.
 */
export async function getEmailDetail(accountId, rawId) {
  const accounts = await getAccountsFull();
  const account = accounts.find(a => a.id === accountId);
  if (!account) throw new Error('Account not found');
  const provider = createProvider(account);
  return provider.getEmailDetail(rawId);
}

/**
 * Fetches an attachment blob for download/preview.
 */
export async function getAttachment(accountId, rawId, attachmentId) {
  const accounts = await getAccountsFull();
  const account = accounts.find(a => a.id === accountId);
  if (!account) throw new Error('Account not found');
  const provider = createProvider(account);
  return provider.getAttachment(rawId, attachmentId);
}
