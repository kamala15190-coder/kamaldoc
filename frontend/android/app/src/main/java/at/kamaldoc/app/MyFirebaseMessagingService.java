package at.kamaldoc.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * KamalDoc Firebase Messaging Service
 *
 * Erweitert den Capacitor MessagingService um:
 * 1. FCM-Token im SharedPreferences zu speichern (damit das JS-Layer ihn beim App-Start lesen kann)
 * 2. Hintergrund-Notifications anzuzeigen wenn die App nicht im Vordergrund ist
 *
 * Überschreibt com.capacitorjs.plugins.pushnotifications.MessagingService in AndroidManifest.xml
 * über tools:replace, damit nur dieser Service den com.google.firebase.MESSAGING_EVENT empfängt.
 */
public class MyFirebaseMessagingService extends MessagingService {

    private static final String TAG = "KDocFCM";
    private static final String PREFS_NAME = "KDocPushPrefs";
    private static final String KEY_FCM_TOKEN = "fcm_token";
    private static final String CHANNEL_ID = "kdoc_notifications";
    private static final String CHANNEL_NAME = "KamalDoc Benachrichtigungen";

    /**
     * Wird aufgerufen wenn ein neues FCM-Token generiert wird (z.B. nach Neuinstallation).
     * Speichert das Token lokal – das JS-Layer (pushNotifications.js) sendet es beim nächsten
     * App-Start an das Backend.
     */
    @Override
    public void onNewToken(@NonNull String token) {
        // Capacitor-Plugin informieren (damit Capacitor.Plugins.PushNotifications 'registration' Event feuert)
        super.onNewToken(token);

        // Token lokal speichern für Backup-Fallback
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_FCM_TOKEN, token).apply();

        Log.i(TAG, "[Push] Neues FCM-Token gespeichert (Token: " + token.substring(0, Math.min(20, token.length())) + "...)");
    }

    /**
     * Wird aufgerufen wenn eine FCM-Nachricht empfangen wird:
     * - App im Vordergrund: Capacitor-Plugin übernimmt (pushNotificationReceived Event in JS)
     * - App im Hintergrund: Android zeigt automatisch eine System-Notification
     *
     * Zusätzlich: Notification-Channel sicherstellen und Benachrichtigung anzeigen
     * wenn die Data-Payload vorhanden ist (kein display-notification von FCM selbst).
     */
    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        // Capacitor-Plugin informieren (feuert pushNotificationReceived in JS wenn App aktiv)
        super.onMessageReceived(remoteMessage);

        Log.i(TAG, "[Push] Nachricht empfangen von: " + remoteMessage.getFrom());

        // Notification Channel für Android 8+ erstellen
        createNotificationChannel();

        // Wenn die Nachricht eine Notification-Payload hat, zeigt Android diese automatisch
        // bei Background/Killed state. Für Data-only Payloads müssen wir selbst anzeigen.
        if (remoteMessage.getNotification() == null && !remoteMessage.getData().isEmpty()) {
            String title = remoteMessage.getData().getOrDefault("title", "KamalDoc");
            String body = remoteMessage.getData().getOrDefault("body", "");
            showLocalNotification(title, body);
        }
    }

    /**
     * Erstellt den Notification-Channel für Android 8+ (Oreo).
     * Idempotent – kann mehrfach aufgerufen werden.
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Deadline-Erinnerungen und Support-Benachrichtigungen");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Zeigt eine lokale Notification für Data-only FCM Payloads.
     * Tippt der User auf die Notification, öffnet sich die App.
     */
    private void showLocalNotification(String title, String body) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE;

        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent);

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            int notificationId = (int) System.currentTimeMillis();
            manager.notify(notificationId, builder.build());
        }

        Log.i(TAG, "[Push] Lokale Notification angezeigt: " + title);
    }
}
