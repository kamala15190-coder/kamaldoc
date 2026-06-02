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

    // Shared: turn an OAuth deep-link/callback URL (at.kamaldoc.app://login-callback#...)
    // into a Supabase session. Used by BOTH the warm-start appUrlOpen listener AND
    // the cold-start launch-URL check, so a completed Google login is never dropped
    // regardless of whether the app was alive or killed during the browser session.
    // Returns true only when a session was actually established.
    const applyTokensFromUrl = async (url) => {
      if (!url || !url.includes('login-callback')) return false
      const tokens = extractTokensFromHash(url.split('#')[1])
      if (!tokens) return false
      const { data, error } = await supabase.auth.setSession(tokens)
      if (!error && data?.session) {
        safeHandle(data.session)
        return true
      }
      return false
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

        // Native COLD-START OAuth callback: the OS may kill the backgrounded app
        // while the Google login Custom Tab is in the foreground (common on Samsung/
        // Xiaomi/low-RAM devices). The callback deep link then COLD-STARTS the app and
        // is delivered as the launch intent — which the appUrlOpen listener below,
        // registered asynchronously after React mounts, does NOT reliably receive.
        // Consult the launch URL directly so the login is processed in that case.
        // On a normal launch getLaunchUrl() has no login-callback, so this is a no-op
        // and we fall through to the regular storage-based session restore — i.e. it
        // never causes a dashboard bypass.
        if (Capacitor.isNativePlatform()) {
          try {
            const { App } = await import('@capacitor/app')
            const launch = await App.getLaunchUrl()
            if (launch?.url && (await applyTokensFromUrl(launch.url))) return
          } catch { /* fall through to normal session restore */ }
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

    // 5) Deep link handling for native OAuth callback (WARM start: app still alive
    //    while the Google login browser was open). The COLD-start case is handled
    //    via App.getLaunchUrl() in initSession() above. App.addListener resolves to
    //    a Promise<PluginListenerHandle>, so we keep the promise and remove via it.
    let appUrlHandlePromise = null
    if (Capacitor.isNativePlatform()) {
      appUrlHandlePromise = import('@capacitor/app').then(({ App }) =>
        App.addListener('appUrlOpen', async ({ url }) => {
          if (!url || !url.includes('login-callback')) return
          // Close in-app browser (best effort)
          try {
            const { Browser } = await import('@capacitor/browser')
            await Browser.close()
          } catch { /* ignore */ }

          if (await applyTokensFromUrl(url)) return
          // Fallback: maybe the session arrived via storage/onAuthStateChange
          const { data: { session } } = await supabase.auth.getSession()
          safeHandle(session)
        })
      )
    }

    return () => {
      mounted = false
      clearWatchdog()
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      // appUrlHandlePromise resolves to the PluginListenerHandle — await then remove.
      if (appUrlHandlePromise) appUrlHandlePromise.then((h) => h?.remove?.()).catch(() => {})
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
