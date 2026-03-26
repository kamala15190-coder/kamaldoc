/**
 * ICloudProvider
 * iCloud IMAP via backend proxy.
 * Requires app-specific password (Apple does not offer OAuth2 for IMAP).
 */

import { ImapProvider } from './ImapProvider';

export class ICloudProvider extends ImapProvider {
  getImapConfig() {
    return {
      host: 'imap.mail.me.com',
      port: 993,
      secure: true,
    };
  }

  /**
   * iCloud requires an app-specific password.
   * Returns a flag so the UI shows the appropriate form with instructions.
   */
  static startOAuthFlow() {
    return {
      provider: 'icloud',
      mode: 'app_password',
      instructions: 'icloud_app_password_hint',
    };
  }

  static async handleOAuthCallback(_callbackUrl, manualCredentials) {
    if (!manualCredentials?.email || !manualCredentials?.password) {
      throw new Error('Apple ID email and app-specific password are required');
    }

    return {
      provider: 'icloud',
      email: manualCredentials.email,
      tokens: {
        auth_type: 'password',
        app_password: manualCredentials.password,
      },
    };
  }
}
