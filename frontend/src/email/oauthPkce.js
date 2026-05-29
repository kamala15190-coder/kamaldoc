/**
 * PKCE helpers for OAuth 2.0 Authorization Code flow with public clients.
 * Required for Google and recommended for Microsoft when there is no
 * server-side component holding a client_secret.
 *
 * Stores the code_verifier in sessionStorage under a per-provider key,
 * so the /email-callback/:provider page can retrieve it after redirect.
 */

const VERIFIER_KEY_PREFIX = 'oauth_pkce_verifier_';

function base64UrlEncode(bytes) {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

/**
 * Create a fresh PKCE pair and persist the verifier under the given provider key.
 * Returns { verifier, challenge } — challenge must be sent in the auth URL.
 */
export async function createPkcePair(provider) {
  const verifier = generateVerifier();
  const challenge = base64UrlEncode(await sha256(verifier));
  sessionStorage.setItem(VERIFIER_KEY_PREFIX + provider, verifier);
  return { verifier, challenge };
}

/**
 * Retrieve and clear the previously stored verifier for this provider.
 * Returns null if no verifier is stored (callback without prior auth request).
 */
export function consumePkceVerifier(provider) {
  const key = VERIFIER_KEY_PREFIX + provider;
  const verifier = sessionStorage.getItem(key);
  if (verifier) sessionStorage.removeItem(key);
  return verifier;
}
