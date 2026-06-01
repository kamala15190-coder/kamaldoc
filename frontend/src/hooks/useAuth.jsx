/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../supabaseClient'
import { initPushNotifications } from '../pushNotifications'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleSession = useCallback((session) => {
    setUser(session?.user ?? null)
    setLoading(false)
    if (session?.user) initPushNotifications()
  }, [])

  useEffect(() => {
    let mounted = true
    const safeHandle = (session) => { if (mounted) handleSession(session) }

    // Safety net: never let the app hang on an unresolved auth check. On native
    // the session is read from @capacitor/preferences and a stale token may
    // trigger a network refresh; if any of that stalls, fall back to "logged out"
    // after 8s so the user reaches the login screen instead of an infinite
    // loading state. onAuthStateChange still updates `user` if a session arrives
    // later, so this can only ever release the UI, never lose a valid session.
    let watchdog = setTimeout(() => { if (mounted) setLoading(false) }, 8000)
    const clearWatchdog = () => { if (watchdog) { clearTimeout(watchdog); watchdog = null } }

    // 1) Listen for auth changes FIRST (before getSession)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      clearWatchdog()
      safeHandle(session)
    })

    // 2) Helper: extract tokens from a URL hash fragment
    const extractTokensFromHash = (hash) => {
      if (!hash) return null
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      return access_token && refresh_token ? { access_token, refresh_token } : null
    }

    // 3) On web: handle OAuth redirect — PKCE (?code=) or implicit (#access_token)
    const initSession = async () => {
      try {
        // PKCE flow: exchange code for session
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        if (code) {
          url.searchParams.delete('code')
          window.history.replaceState(null, '', url.pathname + url.search + window.location.hash)
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (!error && data?.session) {
              safeHandle(data.session)
              return
            }
          } catch { /* fall through */ }
        }

        // Implicit flow: extract tokens from hash fragment (redirect-based fallback)
        const hash = window.location.hash?.substring(1)
        const tokens = extractTokensFromHash(hash)
        if (tokens) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
          const { data, error } = await supabase.auth.setSession(tokens)
          if (!error && data?.session) {
            safeHandle(data.session)
            return
          }
        }

        // Fallback: normal session check (reads from native Preferences / localStorage)
        const { data: { session } } = await supabase.auth.getSession()
        safeHandle(session)
      } catch {
        // Storage/network failure during init → treat as logged out, don't hang.
        safeHandle(null)
      } finally {
        clearWatchdog()
      }
    }
    initSession()

    // 4) Refresh session when tab/app becomes visible again (prevents stale state)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession()
          .then(({ data: { session } }) => { safeHandle(session) })
          .catch(() => { /* ignore */ })
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // 5) Deep link handling for native OAuth callback
    let appUrlListener = null
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        appUrlListener = App.addListener('appUrlOpen', async ({ url }) => {
          if (url.includes('login-callback')) {
            // Close in-app browser
            try {
              const { Browser } = await import('@capacitor/browser')
              await Browser.close()
            } catch { /* ignore */ }

            // Extract tokens from deep link hash
            const hashPart = url.split('#')[1]
            const tokens = extractTokensFromHash(hashPart)
            if (tokens) {
              const { data, error } = await supabase.auth.setSession(tokens)
              if (!error && data?.session) {
                safeHandle(data.session)
                return
              }
            }
            // Fallback
            const { data: { session } } = await supabase.auth.getSession()
            safeHandle(session)
          }
        })
      })
    }

    return () => {
      mounted = false
      clearWatchdog()
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (appUrlListener) appUrlListener.remove()
    }
  }, [handleSession])

  const value = {
    user,
    loading,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
