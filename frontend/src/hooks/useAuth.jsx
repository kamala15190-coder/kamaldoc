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
    // 1) Listen for auth changes FIRST (before getSession)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
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
      // PKCE flow: exchange code for session
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (code) {
        url.searchParams.delete('code')
        window.history.replaceState(null, '', url.pathname + url.search + window.location.hash)
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error && data?.session) {
            handleSession(data.session)
            return
          }
        } catch (_) { /* fall through */ }
      }

      // Implicit flow: extract tokens from hash fragment
      const hash = window.location.hash?.substring(1)
      const tokens = extractTokensFromHash(hash)
      if (tokens) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        const { data, error } = await supabase.auth.setSession(tokens)
        if (!error && data?.session) {
          handleSession(data.session)
          // If this tab was opened by the PWA for OAuth, try to close it
          const isPWA = window.matchMedia('(display-mode: standalone)').matches
            || window.matchMedia('(display-mode: fullscreen)').matches
            || window.navigator.standalone
          if (!isPWA) {
            try { window.close() } catch (_) {}
          }
          return
        }
      }

      // Fallback: normal session check
      const { data: { session } } = await supabase.auth.getSession()
      handleSession(session)
    }
    initSession()

    // 4) Refresh session when tab becomes visible again (prevents stale state)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          handleSession(session)
        })
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
            } catch (_) {}

            // Extract tokens from deep link hash
            const hashPart = url.split('#')[1]
            const tokens = extractTokensFromHash(hashPart)
            if (tokens) {
              const { data, error } = await supabase.auth.setSession(tokens)
              if (!error && data?.session) {
                handleSession(data.session)
                return
              }
            }
            // Fallback
            const { data: { session } } = await supabase.auth.getSession()
            handleSession(session)
          }
        })
      })
    }

    return () => {
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
