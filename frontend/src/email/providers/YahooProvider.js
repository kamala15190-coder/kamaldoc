/**
 * YahooProvider
 * Yahoo Mail IMAP via backend proxy.
 * Uses app-password authentication (Yahoo requires app passwords for third-party apps).
 */

import { ImapProvider } from './ImapProvider';

export class YahooProvider extends ImapProvider {
  getImapConfig() {
    return {
      host: 'imap.mail.yahoo.com',
      port: 993,
      secure: true,
    };
  }

  static startOAuthFlow() {
    return {
      provider: 'yahoo',
      mode: 'app_password',
      instructions: 'yahoo_app_password_hint',
    };
  }

  static async handleOAuthCallback(_callbackUrl, manualCredentials) {
    if (!manualCredentials?.email || !manualCredentials?.password) {
      throw new Error('Yahoo email and app password are required');
    }

    return {
      provider: 'yahoo',
      email: manualCredentials.email,
      tokens: {
        auth_type: 'password',
        app_password: manualCredentials.password,
      },
    };
  }
}
