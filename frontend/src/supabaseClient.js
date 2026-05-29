import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const supabaseUrl = 'https://grbalaqdgdukzwumejfu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYmFsYXFkZ2R1a3p3dW1lamZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzIyMjAsImV4cCI6MjA4OTAwODIyMH0.KiW_34a8Aw-mfauBezhgFuJwwDPC0RLFtWR-VFP8KWw'

// H8: On native, persist the Supabase session in @capacitor/preferences
// (app-private storage) instead of the WebView's localStorage, which is more
// exposed. On web we keep the default localStorage behaviour unchanged.
function nativePreferencesStorage() {
  let prefsPromise
  const prefs = () => (prefsPromise ??= import('@capacitor/preferences').then((m) => m.Preferences))
  return {
    async getItem(key) {
      const { value } = await (await prefs()).get({ key })
      return value ?? null
    },
    async setItem(key, value) {
      await (await prefs()).set({ key, value })
    },
    async removeItem(key) {
      await (await prefs()).remove({ key })
    },
  }
}

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
}
if (Capacitor.isNativePlatform()) {
  authOptions.storage = nativePreferencesStorage()
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: authOptions })
