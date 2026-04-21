/**
 * GmailProvider
 * Uses Gmail REST API with Google OAuth2.
 * Scopes: gmail.readonly
 */

import { Capacitor } from '@capacitor/core';
import { createPkcePair, consumePkceVerifier } from '../oauthPkce';
import { supabase } from '../../supabaseClient';

const API_BASE = 'https://api.kdoc.at';

// These must be replaced with your actual Google OAuth2 Client IDs
const GMAIL_CLIENT_ID_WEB = import.meta.env.VITE_GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_ID_IOS = import.meta.env.VITE_GMAIL_CLIENT_ID_IOS || GMAIL_CLIENT_ID_WEB;
const GMAIL_CLIENT_ID_ANDROID = import.meta.env.VITE_GMAIL_CLIENT_ID_ANDROID || GMAIL_CLIENT_ID_WEB;

// Only request gmail.readonly — adding openid/email causes Google to return an
// OIDC continuation redirect (with iss/authuser/prompt params but NO code).
// The account email is fetched from the Gmail profile endpoint after token exchange.
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_API = 'https://www.googleapis.com/gmail/v1';
const REDIRECT_URI_WEB = `${window.location.origin}/email-callback/gmail`;
const REDIRECT_URI_NATIVE = 'at.kamaldoc.app://email-callback/gmail';

// Refresh the access token when it has less than this much time left.
const REFRESH_LEEWAY_MS = 60 * 1000;

function getClientId() {
  if (!Capacitor.isNativePlatform()) return GMAIL_CLIENT_ID_WEB;
  return Capacitor.getPlatform() === 'ios' ? GMAIL_CLIENT_ID_IOS : GMAIL_CLIENT_ID_ANDROID;
}

function getRedirectUri() {
  return Capacitor.isNativePlatform() ? REDIRECT_URI_NATIVE : REDIRECT_URI_WEB;
}

export class GmailProvider {
  constructor(account) {
    this.account = account;
    this.accessToken = account.tokens?.access_token;
    this.refreshTokenValue = account.tokens?.refresh_token;
    this.expiresAt = account.tokens?.expires_at || 0;
    // Caller (EmailConnectorService) sets this to persist fresh tokens.
    this.onTokensRefreshed = null;
  }

  /**
   * Refresh proactively if the stored access token is close to expiring.
   * Returns the (possibly new) token bundle, or null if refresh failed.
   */
  async _ensureFreshToken() {
    if (this.accessToken && this.expiresAt - Date.now() > REFRESH_LEEWAY_MS) return null;
    const refreshed = await this.refreshToken();
    if (refreshed) {
      this.accessToken = refreshed.access_token;
      this.refreshTokenValue = refreshed.refresh_token || this.refreshTokenValue;
      this.expiresAt = refreshed.expires_at;
      if (this.onTokensRefreshed) {
        try { await this.onTokensRefreshed(refreshed); } catch { /* persist best-effort */ }
      }
    }
    return refreshed;
  }

  async _fetch(url, options = {}) {
    await this._ensureFreshToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const error = new Error(`Gmail API error: ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  }

  /**
   * Search emails using Gmail query syntax.
   */
  async search(query, options = {}) {
    const maxResults = options.maxResults || 20;
    const gmailQuery = query.trim();

    const data = await this._fetch(
      `${GMAIL_API}/users/me/messages?q=${encodeURIComponent(gmailQuery)}&maxResults=${maxResults}`
    );

    if (!data.messages || data.messages.length === 0) return [];

    // Fetch metadata for each message in parallel
    const details = await Promise.all(
      data.messages.map(msg =>
        this._fetch(
          `${GMAIL_API}/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
        )
      )
    );

    return details.map(msg => this._normalize(msg));
  }

  _normalize(msg) {
    const headers = msg.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject');
    const fromRaw = getHeader('From');
    const date = getHeader('Date');
    const sender = this._parseFrom(fromRaw);

    const parts = msg.payload?.parts || [];
    const attachments = parts
      .filter(p => p.filename && p.filename.length > 0)
      .map(p => ({
        id: p.body?.attachmentId || p.partId,
        name: p.filename,
        mimeType: p.mimeType,
        size: p.body?.size || 0,
      }));

    return {
      id: `gmail_${this.account.email}_${msg.id}`,
      accountId: this.account.id,
      provider: 'gmail',
      subject,
      sender,
      date: date ? new Date(date) : new Date(),
      preview: msg.snippet || '',
      hasAttachments: attachments.length > 0,
      attachments,
      rawId: msg.id,
    };
  }

  _parseFrom(fromStr) {
    const match = fromStr.match(/^"?(.+?)"?\s*<(.+?)>$/);
    if (match) return { name: match[1].trim(), email: match[2].trim() };
    return { name: fromStr, email: fromStr };
  }

  /**
   * Fetch full email content for preview.
   */
  async getEmailDetail(messageId) {
    const msg = await this._fetch(
      `${GMAIL_API}/users/me/messages/${messageId}?format=full`
    );

    const headers = msg.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const body = this._extractBody(msg.payload);
    const parts = msg.payload?.parts || [];
    const attachments = this._extractAttachments(parts);

    return {
      id: messageId,
      subject: getHeader('Subject'),
      sender: this._parseFrom(getHeader('From')),
      to: getHeader('To'),
      cc: getHeader('Cc'),
      date: getHeader('Date') ? new Date(getHeader('Date')) : new Date(),
      body: body.html || body.text || '',
      bodyType: body.html ? 'html' : 'text',
      attachments,
    };
  }

  _extractBody(payload) {
    if (!payload) return { text: '', html: '' };

    // Direct body
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return { text: this._decodeBase64(payload.body.data), html: '' };
    }
    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return { text: '', html: this._decodeBase64(payload.body.data) };
    }

    // Multipart
    const parts = payload.parts || [];
    let text = '';
    let html = '';
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text = this._decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = this._decodeBase64(part.body.data);
      } else if (part.mimeType?.startsWith('multipart/')) {
        const nested = this._extractBody(part);
        if (nested.text) text = nested.text;
        if (nested.html) html = nested.html;
      }
    }
    return { text, html };
  }

  _extractAttachments(parts) {
    const attachments = [];
    for (const part of parts) {
      if (part.filename && part.filename.length > 0) {
        attachments.push({
          id: part.body?.attachmentId || part.partId,
          name: part.filename,
          mimeType: part.mimeType,
          size: part.body?.size || 0,
        });
      }
      if (part.parts) {
        attachments.push(...this._extractAttachments(part.parts));
      }
    }
    return attachments;
  }

  _decodeBase64(data) {
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
    try {
      return decodeURIComponent(
        atob(normalized)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      return atob(normalized);
    }
  }

  /**
   * Download an attachment.
   */
  async getAttachment(messageId, attachmentId) {
    const data = await this._fetch(
      `${GMAIL_API}/users/me/messages/${messageId}/attachments/${attachmentId}`
    );
    const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes]);
  }

  /**
   * Refresh the access token via the backend proxy (keeps client_secret off the client).
   */
  async refreshToken() {
    if (!this.refreshTokenValue) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/auth/gmail/token-refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ refresh_token: this.refreshTokenValue }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || this.refreshTokenValue,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      };
    } catch {
      return null;
    }
  }

  // ---------- Static OAuth Flow ----------

  static async startOAuthFlow() {
    const state = crypto.randomUUID();
    sessionStorage.setItem('gmail_oauth_state', state);

    // Google requires PKCE for public SPA clients (no client_secret available).
    const { challenge } = await createPkcePair('gmail');

    const params = new URLSearchParams({
      client_id: getClientId(),
      redirect_uri: getRedirectUri(),
      response_type: 'code',
      scope: GMAIL_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: authUrl, presentationStyle: 'popover' });
    } else {
      window.location.href = authUrl;
    }

    return { state, provider: 'gmail' };
  }

  static async handleOAuthCallback(callbackUrl) {
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');

    if (errorParam) {
      const desc = url.searchParams.get('error_description') || errorParam;
      throw new Error(`Gmail authorization denied: ${desc}`);
    }

    const savedState = sessionStorage.getItem('gmail_oauth_state');
    if (state !== savedState) throw new Error('OAuth state mismatch');
    sessionStorage.removeItem('gmail_oauth_state');

    if (!code) {
      // Provide a diagnostic message showing what params were received
      const receivedParams = [...url.searchParams.keys()].join(', ') || '(none)';
      throw new Error(`No authorization code received (params: ${receivedParams})`);
    }

    const codeVerifier = consumePkceVerifier('gmail');
    if (!codeVerifier) throw new Error('Missing PKCE verifier — please restart the OAuth flow');

    // Exchange code via backend proxy so GMAIL_CLIENT_SECRET stays off the client.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE}/api/auth/gmail/token-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: getRedirectUri(),
      }),
    });

    if (!res.ok) {
      let detail = '';
      try {
        const errBody = await res.json();
        detail = errBody.detail || '';
      } catch { /* not JSON */ }
      throw new Error(`Gmail token exchange failed (${res.status})${detail ? ': ' + detail : ''}`);
    }

    const tokenData = await res.json();
    const email = tokenData.email;
    if (!email) throw new Error('Could not determine Gmail account address');

    return {
      provider: 'gmail',
      email,
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
      },
    };
  }
}
