import { useState, useEffect, createContext, useContext } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../supabaseClient'
import { initPushNotifications } from '../pushNotifications'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) initPushNotifications()
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) initPushNotifications()
    })

    // Deep link handling for native OAuth callback
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

            // Try extracting tokens from hash fragment (#access_token=...)
            const hashPart = url.split('#')[1]
            if (hashPart) {
              const params = new URLSearchParams(hashPart)
              const accessToken = params.get('access_token')
              const refreshToken = params.get('refresh_token')
              if (accessToken && refreshToken) {
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                })
                return
              }
            }
            // Fallback: try getSession in case Supabase already processed the callback
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
              setUser(session.user)
              setLoading(false)
              initPushNotifications()
            }
          }
        })
      })
    }

    return () => {
      subscription.unsubscribe()
      if (appUrlListener) appUrlListener.remove()
    }
  }, [])

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
