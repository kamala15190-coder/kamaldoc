# iOS — verbleibende native Einrichtung (manuell)

Der Code ist für diese Features fertig; die folgenden Schritte brauchen Xcode,
Apple-Developer- und Firebase-Zugänge und können nicht aus dem Code automatisiert
werden.

## 1. Sign in with Apple (Guideline 4.8)
Der Button erscheint auf Login/Register **nur auf iOS** und ruft das native Plugin
über `Capacitor.Plugins.SignInWithApple` auf (kein JS-Import → Web-Build bleibt
unberührt). Damit er funktioniert:

1. Plugin installieren:
   ```
   cd frontend && npm i @capacitor-community/apple-sign-in && npx cap sync ios
   ```
2. Xcode → Target „App" → Signing & Capabilities → **+ Sign in with Apple**.
3. Apple Developer → App ID `at.kamaldoc.app` → Capability „Sign in with Apple"
   aktivieren; in Supabase den **Apple**-Provider (Services-ID + Key) konfigurieren.
   Der Code übergibt `clientId: 'at.kamaldoc.app'` und `redirectURI`
   `${API_URL}/auth/callback` — beides in Supabase/Apple hinterlegen.

## 2. Push Notifications (iOS)
Backend sendet über **FCM v1**, daher braucht iOS das Firebase-SDK (nicht nur APNs):

1. Xcode → Signing & Capabilities → **+ Push Notifications** (referenziert
   `App/App.entitlements`, das bereits `aps-environment` enthält).
2. `GoogleService-Info.plist` aus der Firebase-Console (Projekt `kdoc-e0c17`)
   in das `App`-Target legen.
3. Firebase-iOS-SDK (FirebaseMessaging) via Swift Package Manager einbinden und in
   `AppDelegate` `FirebaseApp.configure()` aufrufen sowie den **FCM-Token** (statt
   des rohen APNs-Tokens) an Capacitor weiterreichen.
4. APNs-Auth-Key (.p8) in der Firebase-Console hinterlegen.

## 3. Android Push
`frontend/android/app/google-services.json` aus der Firebase-Console hinzufügen
(der JS-Guard in `pushNotifications.js` aktiviert Push automatisch, sobald Firebase
initialisiert ist).
