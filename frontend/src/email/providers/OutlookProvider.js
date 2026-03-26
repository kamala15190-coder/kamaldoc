/**
 * OutlookProvider
 * Uses Microsoft Graph API with Microsoft OAuth2 (MSAL).
 * Scopes: Mail.Read, User.Read
 */

import { Capacitor } from '@capacitor/core';

const MS_CLIENT_ID = import.meta.env.VITE_OUTLOOK_CLIENT_ID || '';
const MS_TENANT = 'common'; // multi-tenant
const MS_SCOPES = 'Mail.Read User.Read offline_access';
const GRAPH_API = 'https://graph.microsoft.com/v1.0';
const REDIRECT_URI_WEB = `${window.location.origin}/email-callback/outlook`;
const REDIRECT_URI_NATIVE = 'at.kamaldoc.app://email-callback/outlook';

function getRedirectUri() {
  return Capacitor.isNativePlatform() ? REDIRECT_URI_NATIVE : REDIRECT_URI_WEB;
}

export class OutlookProvider {
  constructor(account) {
    this.account = account;
    this.accessToken = account.tokens?.access_token;
    this.refreshTokenValue = account.tokens?.refresh_token;
  }

  async _fetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const error = new Error(`Graph API error: ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  }

  /**
   * Search emails via Microsoft Graph search endpoint.
   */
  async search(query, options = {}) {
    const top = options.maxResults || 20;
    const searchQuery = encodeURIComponent(query.trim());

    const data = await this._fetch(
      `${GRAPH_API}/me/messages?$search="${searchQuery}"&$top=${top}&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments`
    );

    if (!data.value || data.value.length === 0) return [];

    // Fetch attachment info for messages that have attachments
    const results = await Promise.all(
      data.value.map(async (msg) => {
        let attachments = [];
        if (msg.hasAttachments) {
          try {
            const attData = await this._fetch(
              `${GRAPH_API}/me/messages/${msg.id}/attachments?$select=id,name,contentType,size`
            );
            attachments = (attData.value || [])
              .filter(a => a['@odata.type'] === '#microsoft.graph.fileAttachment')
              .map(a => ({
                id: a.id,
                name: a.name,
                mimeType: a.contentType,
                size: a.size || 0,
              }));
          } catch (_) { /* skip attachment fetch errors */ }
        }
        return this._normalize(msg, attachments);
      })
    );

    return results;
  }

  _normalize(msg, attachments = []) {
    const sender = msg.from?.emailAddress || {};
    return {
      id: `outlook_${this.account.email}_${msg.id}`,
      accountId: this.account.id,
      provider: 'outlook',
      subject: msg.subject || '',
      sender: {
        name: sender.name || sender.address || '',
        email: sender.address || '',
      },
      date: msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date(),
      preview: (msg.bodyPreview || '').substring(0, 150),
      hasAttachments: msg.hasAttachments || false,
      attachments,
      rawId: msg.id,
    };
  }

  /**
   * Fetch full email content for preview.
   */
  async getEmailDetail(messageId) {
    const msg = await this._fetch(
      `${GRAPH_API}/me/messages/${messageId}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,hasAttachments`
    );

    let attachments = [];
    if (msg.hasAttachments) {
      try {
        const attData = await this._fetch(
          `${GRAPH_API}/me/messages/${messageId}/attachments?$select=id,name,contentType,size`
        );
        attachments = (attData.value || [])
          .filter(a => a['@odata.type'] === '#microsoft.graph.fileAttachment')
          .map(a => ({
            id: a.id,
            name: a.name,
            mimeType: a.contentType,
            size: a.size || 0,
          }));
      } catch (_) {}
    }

    const toRecipients = (msg.toRecipients || [])
      .map(r => r.emailAddress?.address)
      .filter(Boolean)
      .join(', ');

    const ccRecipients = (msg.ccRecipients || [])
      .map(r => r.emailAddress?.address)
      .filter(Boolean)
      .join(', ');

    return {
      id: messageId,
      subject: msg.subject || '',
      sender: {
        name: msg.from?.emailAddress?.name || '',
        email: msg.from?.emailAddress?.address || '',
      },
      to: toRecipients,
      cc: ccRecipients,
      date: msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date(),
      body: msg.body?.content || '',
      bodyType: msg.body?.contentType === 'html' ? 'html' : 'text',
      attachments,
    };
  }

  /**
   * Download an attachment.
   */
  async getAttachment(messageId, attachmentId) {
    const data = await this._fetch(
      `${GRAPH_API}/me/messages/${messageId}/attachments/${attachmentId}`
    );
    if (data.contentBytes) {
      const binary = atob(data.contentBytes);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: data.contentType });
    }
    throw new Error('No attachment content');
  }

  /**
   * Refresh the access token.
   */
  async refreshToken() {
    if (!this.refreshTokenValue) return null;
    const res = await fetch(`https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: this.refreshTokenValue,
        scope: MS_SCOPES,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || this.refreshTokenValue,
      expires_at: Date.now() + data.expires_in * 1000,
    };
  }

  // ---------- Static OAuth Flow ----------

  static startOAuthFlow() {
    const state = crypto.randomUUID();
    sessionStorage.setItem('outlook_oauth_state', state);

    const params = new URLSearchParams({
      client_id: MS_CLIENT_ID,
      redirect_uri: getRedirectUri(),
      response_type: 'code',
      scope: MS_SCOPES,
      state,
      prompt: 'consent',
    });

    const authUrl = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize?${params}`;

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/browser').then(({ Browser }) => {
        Browser.open({ url: authUrl, presentationStyle: 'popover' });
      });
    } else {
      window.location.href = authUrl;
    }

    return { state, provider: 'outlook' };
  }

  static async handleOAuthCallback(callbackUrl) {
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const savedState = sessionStorage.getItem('outlook_oauth_state');
    if (state !== savedState) throw new Error('OAuth state mismatch');
    sessionStorage.removeItem('outlook_oauth_state');

    if (!code) throw new Error('No authorization code received');

    const res = await fetch(`https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        redirect_uri: getRedirectUri(),
        grant_type: 'authorization_code',
        code,
        scope: MS_SCOPES,
      }),
    });

    if (!res.ok) throw new Error('Token exchange failed');
    const tokenData = await res.json();

    // Get user profile
    const profileRes = await fetch(`${GRAPH_API}/me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    return {
      provider: 'outlook',
      email: profile.mail || profile.userPrincipalName,
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
      },
    };
  }
}
