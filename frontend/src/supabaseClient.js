import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const supabaseUrl = 'https://grbalaqdgdukzwumejfu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYmFsYXFkZ2R1a3p3dW1lamZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzIyMjAsImV4cCI6MjA4OTAwODIyMH0.KiW_34a8Aw-mfauBezhgFuJwwDPC0RLFtWR-VFP8KWw'

const isNative = Capacitor.isNativePlatform()

// H8: On native, persist the Supabase session in @capacitor/preferences
// (app-private storage that survives WebView storage eviction) instead of the
// WebView's localStorage. Preferences is imported STATICALLY here on purpose:
// the very first session read happens on cold start, and a runtime dynamic
// import inside the storage adapter could be slow or fail inside the Android/iOS
// WebView — which previously left the auth state stuck on "loading" and exposed
// the dashboard shell before any login. A static import resolves with the main
// bundle, so getSession() can never hang on a missing chunk. On web we keep the
// default localStorage behaviour unchanged.
const capacitorStorage = {
  async getItem(key) {
    const { value } = await Preferences.get({ key })
    return value ?? null
  },
  async setItem(key, value) {
    await Preferences.set({ key, value })
  },
  async removeItem(key) {
    await Preferences.remove({ key })
  },
}

const authOptions = {
  persistSession: true,
  autoRefreshToken: true,
  // Web handles OAuth redirects via the page URL (?code= / #access_token).
  // Native receives tokens through a deep link (handled manually in useAuth) and
  // must NOT try to parse the localhost WebView URL — so disable URL detection.
  detectSessionInUrl: !isNative,
}
if (isNative) {
  authOptions.storage = capacitorStorage
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: authOptions })
