import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Push Notifications: UNUserNotificationCenter-Delegate setzen
        // Capacitor's ApplicationDelegateProxy übernimmt die eigentliche Verarbeitung;
        // wir registrieren nur den Delegate damit Foreground-Notifications angezeigt werden.
        UNUserNotificationCenter.current().delegate = self

        // DocumentScanner Plugin registrieren (VNDocumentCameraViewController)
        let bridge = (window?.rootViewController as? CAPBridgeViewController)?.bridge
        bridge?.registerPluginInstance(DocumentScannerPlugin())

        return true
    }

    // MARK: - Push Notifications

    /// Wird aufgerufen wenn iOS erfolgreich einen APNs Device Token generiert hat.
    /// Capacitor's ApplicationDelegateProxy leitet ihn ans @capacitor/push-notifications Plugin weiter,
    /// welches ihn dann als FCM-Token verarbeitet und das JS 'registration'-Event feuert.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[KDocPush] APNs Device Token: \(tokenString.prefix(20))...")
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    /// Wird aufgerufen wenn die APNs-Registrierung fehlschlägt (z.B. Simulator oder kein Netz).
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[KDocPush] APNs Registrierung fehlgeschlagen: \(error.localizedDescription)")
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    // MARK: - App Lifecycle

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    // MARK: - URL / Universal Links

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

// MARK: - UNUserNotificationCenterDelegate
// Zeigt Notifications an auch wenn die App im Vordergrund ist.
extension AppDelegate: UNUserNotificationCenterDelegate {

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Notification auch im Vordergrund als Banner + Sound anzeigen
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // Capacitor informieren dass der User auf eine Notification getippt hat
        NotificationCenter.default.post(name: .capacitorNotificationReceived, object: response)
        completionHandler()
    }
}
