import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { API_BASE_URL } from '../config'

async function sha256(plain) {
  const data = new TextEncoder().encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Sign in with Apple (iOS, Guideline 4.8). Shared by Login + Register so the two
 * stay in sync. Uses the native @capacitor-community/apple-sign-in plugin via the
 * Capacitor bridge (no JS import → the web build never needs the package). The
 * returned identity token is handed to Supabase exactly like the Google id-token.
 *
 * Pass setError/setLoading to surface state in the host page.
 */
export function useAppleSignIn({ setError, setLoading } = {}) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return useCallback(async () => {
    setError?.(null)
    const SignInWithApple = window.Capacitor?.Plugins?.SignInWithApple
    if (!SignInWithApple) {
      setError?.(t('auth.appleUnavailable'))
      return
    }
    setLoading?.(true)
    try {
      const rawNonce = crypto.randomUUID()
      const hashedNonce = await sha256(rawNonce)
      const result = await SignInWithApple.authorize({
        clientId: 'at.kamaldoc.app',
        redirectURI: `${API_BASE_URL}/auth/callback`,
        scopes: 'email name',
        nonce: hashedNonce,
      })
      const idToken = result?.response?.identityToken
      if (!idToken) throw new Error('no_identity_token')
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
        nonce: rawNonce,
      })
      if (error) throw error
      navigate('/', { replace: true })
    } catch (err) {
      // 1001 / cancelled = user dismissed the sheet — not worth surfacing.
      if (err?.code !== '1001' && err?.message !== 'user_cancelled') {
        setError?.(err?.message || t('auth.appleLoginFailed'))
      }
    } finally {
      setLoading?.(false)
    }
  }, [navigate, t, setError, setLoading])
}
