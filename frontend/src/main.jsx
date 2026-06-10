import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
// Onyx & Amber type system — Inter (body) × Instrument Serif (display)
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/instrument-serif/400.css'
import './i18n'
import './index.css'
import App from './App.jsx'

// StatusBar für Native-App konfigurieren
if (Capacitor.isNativePlatform()) {
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {})
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})

    // Handle deep link redirects (Stripe checkout)
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appUrlOpen', (event) => {
        const url = event.url || '';
        // The app uses BrowserRouter (path-based), so a hash like '#/profil?...'
        // is meaningless to the router and lands the user on '/'. Navigate via the
        // real path+query (a href change reloads the SPA at that route).
        if (url.includes('checkout-success')) {
          import('@capacitor/browser').then(({ Browser }) => Browser.close().catch(() => {}));
          window.location.href = '/profil?checkout=success';
        } else if (url.includes('checkout-cancel')) {
          import('@capacitor/browser').then(({ Browser }) => Browser.close().catch(() => {}));
          window.location.href = '/pricing?checkout=cancel';
        }
      });
    }).catch(() => {})
  }).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
