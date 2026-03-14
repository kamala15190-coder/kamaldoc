import { registerPushToken } from './api';

/**
 * Push Notifications via Capacitor.
 * Registriert den Push-Token beim Backend für Deadline-Benachrichtigungen.
 * Auf Web/Browser wird dies übersprungen.
 * 
 * Verwendet Capacitor.Plugins statt direktem Import, damit Vite
 * keine unresolvable-dependency-Warnung wirft.
 */
export async function initPushNotifications() {
  // Nur auf nativen Plattformen (Android/iOS) aktivieren
  const Capacitor = window.Capacitor;
  if (!Capacitor?.isNativePlatform()) {
    console.log('[Push] Nicht auf nativer Plattform – Push übersprungen');
    return;
  }

  try {
    // Capacitor registriert alle Plugins unter Capacitor.Plugins
    const PushNotifications = Capacitor.Plugins?.PushNotifications;
    if (!PushNotifications) {
      console.warn('[Push] PushNotifications Plugin nicht verfügbar');
      return;
    }

    // Berechtigung anfragen
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.warn('[Push] Berechtigung nicht erteilt');
      return;
    }

    // Registrierung starten
    await PushNotifications.register();

    // Token empfangen und an Backend senden
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Token erhalten:', token.value);
      try {
        await registerPushToken(token.value, 'android');
        console.log('[Push] Token erfolgreich beim Backend registriert');
      } catch (err) {
        console.error('[Push] Token-Registrierung fehlgeschlagen:', err);
      }
    });

    // Registrierungsfehler
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registrierungsfehler:', error);
    });

    // Notification empfangen (App im Vordergrund)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification empfangen:', notification);
    });

    // Notification angetippt
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[Push] Notification angetippt:', notification);
    });

  } catch (err) {
    console.warn('[Push] Capacitor Push Plugin nicht verfügbar:', err.message);
  }
}
