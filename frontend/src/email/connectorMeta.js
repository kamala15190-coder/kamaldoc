/**
 * connectorMeta — display metadata for e-mail connectors.
 * Server (/api/connectors/available) is the source of truth for which providers
 * exist and how they authenticate; this only carries the name/color/icon used
 * for rendering, so no credentials or logic live here.
 */

export const PROVIDER_META = {
  gmail:   { name: 'Gmail',                color: '#EA4335' },
  outlook: { name: 'Outlook',             color: '#0078D4' },
  imap:    { name: 'IMAP',                 color: '#E89A52' },
  gmx:     { name: 'GMX',                  color: '#1C449B' },
  icloud:  { name: 'iCloud',               color: '#8E8E93' },
  yahoo:   { name: 'Yahoo',                color: '#720E9E' },
};

// i18n key for the app-password instructions shown in the IMAP form.
export const APP_PASSWORD_HINT = {
  icloud: 'email.icloud_app_password_hint',
  yahoo:  'email.yahoo_app_password_hint',
};

export function providerMeta(type) {
  return PROVIDER_META[type] || { name: type, color: '#E89A52' };
}
