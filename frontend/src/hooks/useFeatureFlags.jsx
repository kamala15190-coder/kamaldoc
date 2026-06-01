/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { getFeatureFlags } from '../api'
import { useAuth } from './useAuth'

const FeatureFlagsContext = createContext({})

export function FeatureFlagsProvider({ children }) {
  const { user } = useAuth()
  const [flags, setFlags] = useState({})
  const [loaded, setLoaded] = useState(false)

  // Feature flags are only meaningful for an authenticated user. Don't fire the
  // request before a user is confirmed — avoids an unauthenticated call on the
  // login screen and on the brief logged-out window after auth resolves. `loaded`
  // is only read on the (protected) EmailPage, so leaving it false while logged
  // out is fine; a fresh login re-runs this effect and loads the new user's flags.
  useEffect(() => {
    if (!user) return
    getFeatureFlags()
      .then(data => { setFlags(data); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [user])

  const isEnabled = useCallback((key) => !!flags[key], [flags])

  const refresh = useCallback(() => {
    getFeatureFlags().then(setFlags).catch(() => {})
  }, [])

  return (
    <FeatureFlagsContext.Provider value={{ flags, loaded, isEnabled, refresh }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext)
}
