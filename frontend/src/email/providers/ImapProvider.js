/**
 * ImapProvider (Base Class)
 * IMAP cannot be used directly from the browser.
 * This base class calls a backend proxy endpoint for IMAP operations.
 *
 * Backend must expose:
 *   POST /api/email/imap/search   { provider, credentials, query, maxResults }
 *   POST /api/email/imap/detail   { provider, credentials, messageId }
 *   POST /api/email/imap/attachment { provider, credentials, messageId, attachmentId }
 *
 * Credentials are sent per-request (no server-side storage).
 */

import api from '../../api';

export class ImapProvider {
  constructor(account) {
    this.account = account;
    this.providerName = account.provider;
  }

  /**
   * Returns IMAP connection config for the backend proxy.
   * Subclasses override this to set host, port, etc.
   */
  getImapConfig() {
    throw new Error('Subclass must implement getImapConfig()');
  }

  _getCredentials() {
    return {
      ...this.getImapConfig(),
      auth: {
        type: this.account.tokens?.auth_type || 'oauth2',
        access_token: this.account.tokens?.access_token,
        refresh_token: this.account.tokens?.refresh_token,
        // For app-password based auth (e.g. iCloud)
        password: this.account.tokens?.app_password,
        user: this.account.email,
      },
    };
  }

  async search(query, options = {}) {
    const { data } = await api.post('/email/imap/search', {
      provider: this.providerName,
      credentials: this._getCredentials(),
      query: query.trim(),
      maxResults: options.maxResults || 20,
    });

    return (data.results || []).map(msg => ({
      id: `${this.providerName}_${this.account.email}_${msg.id}`,
      accountId: this.account.id,
      provider: this.providerName,
      subject: msg.subject || '',
      sender: msg.sender || { name: '', email: '' },
      date: msg.date ? new Date(msg.date) : new Date(),
      preview: (msg.preview || '').substring(0, 150),
      hasAttachments: msg.hasAttachments || false,
      attachments: (msg.attachments || []).map(a => ({
        id: a.id,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size || 0,
      })),
      rawId: msg.id,
    }));
  }

  async getEmailDetail(messageId) {
    const { data } = await api.post('/email/imap/detail', {
      provider: this.providerName,
      credentials: this._getCredentials(),
      messageId,
    });
    return data;
  }

  async getAttachment(messageId, attachmentId) {
    const response = await api.post('/email/imap/attachment', {
      provider: this.providerName,
      credentials: this._getCredentials(),
      messageId,
      attachmentId,
    }, { responseType: 'blob' });
    return response.data;
  }

  async refreshToken() {
    // Subclasses with OAuth2 support override this
    return null;
  }
}
