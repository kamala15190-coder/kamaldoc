/**
 * GmxProvider
 * GMX IMAP via backend proxy.
 * Supports OAuth2 where available, falls back to app-password.
 */

import { ImapProvider } from './ImapProvider';

export class GmxProvider extends ImapProvider {
  getImapConfig() {
    return {
      host: 'imap.gmx.net',
      port: 993,
      secure: true,
    };
  }

  /**
   * GMX uses app-password authentication.
   * The OAuth flow for GMX collects the app password via a form,
   * not a traditional OAuth redirect.
   */
  static startOAuthFlow() {
    // GMX does not offer public OAuth2 for third-party apps.
    // We use an app-password flow instead.
    // This returns a special flag so the UI shows a password input form.
    return { provider: 'gmx', mode: 'app_password' };
  }

  /**
   * Handle the app-password "callback" (user entered credentials in-app).
   */
  static async handleOAuthCallback(_callbackUrl, manualCredentials) {
    if (!manualCredentials?.email || !manualCredentials?.password) {
      throw new Error('Email and app password are required');
    }

    return {
      provider: 'gmx',
      email: manualCredentials.email,
      tokens: {
        auth_type: 'password',
        app_password: manualCredentials.password,
      },
    };
  }
}
