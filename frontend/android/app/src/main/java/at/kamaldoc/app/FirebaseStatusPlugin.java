package at.kamaldoc.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.firebase.FirebaseApp;

/**
 * FirebaseStatus — winziges natives Plugin, das prüft ob eine Firebase-Default-App
 * tatsächlich initialisiert ist.
 *
 * HINTERGRUND (Crash-Fix):
 * Ohne gültige google-services.json wird das Gradle-Plugin
 * `com.google.gms.google-services` nicht angewandt (siehe app/build.gradle),
 * also fehlt die String-Ressource `google_app_id`. Firebase' FirebaseInitProvider
 * legt dann KEINE Default-App an. Ruft das JS-Layer danach
 * PushNotifications.register() auf, ruft dessen nativer Code intern
 * FirebaseMessaging.getInstance() — was eine IllegalStateException
 * ("Default FirebaseApp is not initialized") wirft. Capacitor fängt diese im
 * Bridge ab und wirft sie als unbehandelte RuntimeException auf dem
 * taskHandler-Thread erneut → die App stürzt SOFORT ab (genau beim "Zulassen").
 *
 * Dieses Plugin erlaubt dem JS-Layer, vor register() zu prüfen ob Firebase
 * überhaupt konfiguriert ist, und Push sonst sauber zu überspringen.
 * Sobald eine echte google-services.json hinzugefügt wird, liefert isAvailable()
 * automatisch true und der normale Push-Flow läuft unverändert.
 */
@CapacitorPlugin(name = "FirebaseStatus")
public class FirebaseStatusPlugin extends Plugin {

    /**
     * Gibt { available: boolean } zurück.
     * true  → eine Firebase-Default-App ist initialisiert (google-services.json vorhanden)
     * false → Firebase ist NICHT konfiguriert; register() würde abstürzen.
     *
     * Jede Ausnahme wird bewusst zu false degradiert (fail-safe: lieber kein Push
     * als ein Crash).
     */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean available = false;
        try {
            available = !FirebaseApp.getApps(getContext()).isEmpty();
        } catch (Throwable t) {
            available = false;
        }
        JSObject ret = new JSObject();
        ret.put("available", available);
        call.resolve(ret);
    }
}
