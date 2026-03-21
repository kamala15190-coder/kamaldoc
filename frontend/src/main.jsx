import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
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
        if (url.includes('checkout-success')) {
          // Close in-app browser and navigate to profile
          import('@capacitor/browser').then(({ Browser }) => Browser.close().catch(() => {}));
          window.location.hash = '#/profil?checkout=success';
          window.location.reload();
        } else if (url.includes('checkout-cancel')) {
          import('@capacitor/browser').then(({ Browser }) => Browser.close().catch(() => {}));
          window.location.hash = '#/pricing?checkout=cancel';
          window.location.reload();
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
