import { registerPlugin } from '@capacitor/core';
import { registerPushToken } from './api';

// Custom native plugin (Android): reports whether a Firebase default app is
// actually initialized (i.e. google-services.json is present). Registered ONCE at
// module level, mirroring the proven DocumentScanner pattern. On platforms without
// the native implementation, method calls reject with "not implemented" — we only
// invoke it on Android (guarded by Capacitor.isPluginAvailable) where it exists.
const FirebaseStatus = registerPlugin('FirebaseStatus');

/**
 * Push Notifications via Capacitor.
 * Registriert den Push-Token beim Backend für Deadline-Benachrichtigungen.
 * Auf Web/Browser wird dies übersprungen.
 *
 * Verwendet Capacitor.Plugins statt direktem Import, damit Vite
 * keine unresolvable-dependency-Warnung wirft.
 */

// Guard: initPushNotifications darf nur einmal pro App-Start laufen.
// Mehrfachaufrufe entstehen durch Auth-State-Changes und Visibility-Events in useAuth.
let _pushInitialized = false;

export async function initPushNotifications() {
  if (_pushInitialized) return;

  // Nur auf nativen Plattformen (Android/iOS) aktivieren
  const Capacitor = window.Capacitor;
  if (!Capacitor?.isNativePlatform()) {
    return;
  }

  try {
    // Capacitor registriert alle Plugins unter Capacitor.Plugins
    const PushNotifications = Capacitor.Plugins?.PushNotifications;
    if (!PushNotifications) {
      console.warn('[Push] PushNotifications Plugin nicht verfügbar');
      return;
    }

    // CRASH-GUARD (Android): Ohne google-services.json ist Firebase NICHT
    // initialisiert. PushNotifications.register() ruft dann nativ
    // FirebaseMessaging.getInstance() auf, was eine IllegalStateException wirft –
    // Capacitor wirft diese als unbehandelte RuntimeException auf einem
    // Hintergrund-Thread erneut → die App stürzt SOFORT beim "Zulassen" ab.
    // Ein JS-try/catch kann einen nativen Thread-Crash NICHT abfangen, deshalb
    // müssen wir hier proaktiv prüfen und Push sonst sauber überspringen.
    // (iOS nutzt APNs statt Firebase und braucht diese Prüfung nicht.)
    const platform = Capacitor.getPlatform?.() || 'android';
    if (platform === 'android') {
      if (!Capacitor.isPluginAvailable?.('FirebaseStatus')) {
        console.warn('[Push] FirebaseStatus-Plugin nicht verfügbar – Push übersprungen');
        return;
      }
      try {
        const res = await FirebaseStatus.isAvailable();
        if (!res?.available) {
          console.warn('[Push] Firebase (google-services.json) nicht konfiguriert – Push deaktiviert, kein register()');
          return;
        }
      } catch (e) {
        console.warn('[Push] Firebase-Verfügbarkeitsprüfung fehlgeschlagen – Push übersprungen:', e?.message);
        return;
      }
    }

    // Berechtigung anfragen
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.warn('[Push] Berechtigung nicht erteilt');
      return;
    }

    // Ab hier gilt die Initialisierung als gestartet – kein zweiter Versuch
    _pushInitialized = true;

    // Registrierung starten
    await PushNotifications.register();

    // Token empfangen und an Backend senden (platform aus dem äußeren Scope)
    PushNotifications.addListener('registration', async (token) => {
      try {
        await registerPushToken(token.value, platform);
      } catch (err) {
        console.error('[Push] Token-Registrierung fehlgeschlagen:', err);
      }
    });

    // Registrierungsfehler
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registrierungsfehler:', error);
    });

    // Foreground presentation (banner/sound/badge) and tap handling are done
    // natively (AppDelegate on iOS, Capacitor default on Android). No JS-side
    // logging listeners are registered in production.

  } catch (err) {
    console.warn('[Push] Capacitor Push Plugin nicht verfügbar:', err.message);
  }
}
