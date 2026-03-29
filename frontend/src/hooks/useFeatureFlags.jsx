import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { getFeatureFlags } from '../api'

const FeatureFlagsContext = createContext({})

export function FeatureFlagsProvider({ children }) {
  const [flags, setFlags] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getFeatureFlags()
      .then(data => { setFlags(data); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

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
