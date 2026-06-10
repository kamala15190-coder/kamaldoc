# KamalDoc V3 — Vollständiges Audit-Dokument
*Erstellt von: Fable AI Architect*
*Datum: 10. Juni 2026*

> ⚠️ **Analyse basiert auf Stand VOR `git pull`.** Der lokale `main` (797ffe7) liegt **2 Commits hinter `origin/main`**:
> - `009b80d` — fix(backend): native Android-Origin `https://localhost` in Produktions-CORS erlauben → **behebt einen kritischen Live-Bug** (alle API-Calls der installierten Android-App wurden CORS-blockiert: leeres Dashboard, fehlgeschlagene Uploads)
> - `6da947f` — chore(tooling): adb-logcat-Live-Monitor
>
> **Empfehlung: vor allen Fixes `git pull` ausführen.** Befund #1 unten ist auf dem Remote bereits behoben.

---

## Executive Summary

KamalDoc V3 ist architektonisch solide: sauberes React/Vite-Frontend mit konsequentem Onyx-&-Amber-Designsystem, gut strukturiertes FastAPI-Backend mit JWKS-Auth, Envelope-Verschlüsselung für Mail-Credentials, Stripe-Webhook-Verifikation und durchdachter Apple-3.1.1-Gating-Logik. Die i18n-Abdeckung (645 Keys × 50 Sprachen) ist vollständig und konsistent. Es gibt jedoch **zwei iOS-Store-Blocker** (fehlendes „Sign in with Apple" trotz Google-Login; Push-Kette auf iOS komplett unkonfiguriert), **einen DSGVO-kritischen Befund** (Account-Löschung lässt Mail-Credentials, Doka-Chats und Ticket-Daten zurück) und **einen toten Kern-Flow auf Native** (Datei-Download via `?token=`-Parameter, den das Backend nicht kennt). Der gemeldete „native Zurück-Pfeil" im Konnektoren-Flow ist die ungestylte System-Browser-Toolbar des OAuth-Custom-Tabs — mit `toolbarColor` weitgehend behebbar. Doka funktioniert im Kern gut, hat aber einen toten Link-Renderer, wirkungsloses Auto-Scrolling, unbegrenzt wachsende Chat-History und nie gelöschte Anhänge.

**Gesamtbewertung: 🟡 Verbesserungsbedarf** — Web/Android-Kern ist produktionsnah (nach `git pull`), iOS-Einreichung ist ohne die Blocker-Fixes in Abschnitt 4.1 **nicht möglich**.

---

## 1. Gefundene Fehler & Bugs

### [KRITISCH] CORS blockiert die native Android-App in Produktion (lokal noch offen)
- **Datei/Bereich:** `backend/main.py:97-104` (`_PROD_ORIGINS`)
- **Beschreibung:** `capacitor.config.json` setzt `androidScheme: "https"` → die WebView-Origin der Android-App ist `https://localhost`. Diese Origin steht lokal nur in den Dev-Origins (nur bei `APP_ENV=development` aktiv).
- **Auswirkung:** Installierte Android-App erhält in Produktion auf jeden API-Call „Network Error" (leeres Dashboard, kein Upload).
- **Fix:** Bereits auf `origin/main` (`009b80d`) behoben → `git pull`. Kein weiterer Eingriff nötig.

### [KRITISCH] Account-Löschung unvollständig — DSGVO & Apple 5.1.1(v)
- **Datei/Bereich:** `backend/main.py:2278-2345` (`DELETE /api/account`)
- **Beschreibung:** Gelöscht werden documents (+Dateien), antworten, befund_translations, behoerden_results, todos, expense_items, push_tokens, user_einstellungen, usage_counters, subscriptions und der Supabase-User. **Nicht gelöscht werden:** `connector_accounts` (verschlüsselte E-Mail-Zugangsdaten!), `doka_conversations`/`doka_messages`, Dateien in `data/doka_attachments/`, `support_tickets`/`ticket_messages` (+ Ticket-Dateien), `phishing_checks`.
- **Auswirkung:** Nach „Account unwiderruflich löschen" bleiben Mail-Tokens/Passwörter (verschlüsselt) und komplette Chat-Verläufe auf dem Server — DSGVO-Verstoß (Art. 17), Rejection-Risiko bei Apple-Prüfung der Account-Löschung, und das UI verspricht explizit vollständige Löschung.
- **Fix:** In `delete_account` ergänzen: (1) `DELETE FROM connector_accounts WHERE user_id=?`; (2) vor dem Löschen der Konversationen die `attachments`-JSONs aller `doka_messages` einsammeln und die `stored`-Dateien aus `DOKA_ATTACHMENTS_DIR` entfernen, dann `DELETE FROM doka_conversations WHERE user_id=?` (Messages kaskadieren); (3) Ticket-Dateien (`ticket_messages.file_path` der eigenen Tickets) löschen, dann `DELETE FROM support_tickets WHERE user_id=?` (Messages kaskadieren); (4) `DELETE FROM phishing_checks WHERE user_id=?`.

### [KRITISCH] Nativer Datei-Download ist tot (`?token=` wird vom Backend nicht akzeptiert)
- **Datei/Bereich:** `frontend/src/api.js:441-461` (`downloadFile`) ↔ `backend/main.py:1386-1407` (`GET /api/documents/{id}/file`)
- **Beschreibung:** Auf Native öffnet `downloadFile` den System-Browser mit `…/file?token=<JWT>`. Der Endpoint authentifiziert aber **ausschließlich** über den `Authorization`-Header (`get_current_user`); einen `token`-Query-Parameter gibt es nirgends im Backend.
- **Auswirkung:** „Original öffnen/Herunterladen" auf Android/iOS liefert dem Nutzer eine 401-JSON-Seite im Browser. Zusätzlich würde das Muster (JWT in der URL) Token in Browser-History/Server-Logs leaken — auch nach einem „Fix" auf Backend-Seite wäre es das falsche Design.
- **Fix:** Statt Browser-Open mit Token-URL: Datei per `api.get(..., {responseType:'blob'})` laden, mit `@capacitor/filesystem` in den Cache schreiben und über `@capacitor/share`/FileOpener anzeigen. Alternativ ein Backend-Endpoint `POST /api/documents/{id}/file-ticket`, der ein kurzlebiges (60 s) Einmal-Token ausstellt, das `GET /file?ticket=…` akzeptiert.

### [HOCH] iOS-Push-Kette komplett unkonfiguriert (drei fehlende Bausteine)
- **Datei/Bereich:** `frontend/ios/App/App.xcodeproj/project.pbxproj` (kein `CODE_SIGN_ENTITLEMENTS`), `frontend/ios/App/App/` (keine `.entitlements`, keine `GoogleService-Info.plist`, kein Firebase-SDK in CapApp-SPM)
- **Beschreibung:** (1) Push-Notifications-Capability/`aps-environment`-Entitlement fehlt → `didRegisterForRemoteNotifications` feuert nie. (2) Ohne Firebase-iOS-SDK liefert `@capacitor/push-notifications` einen **rohen APNs-Token** — das Backend versendet aber über **FCM v1** (`backend/main.py:3121`), das nur FCM-Registrierungs-Tokens akzeptiert; der Kommentar im AppDelegate („verarbeitet ihn als FCM-Token") trifft ohne Firebase-SDK nicht zu. (3) Keine `GoogleService-Info.plist`.
- **Auswirkung:** Deadline-Push (zahlendes Feature: Basic/Pro „Push-Erinnerungen") funktioniert auf iOS gar nicht.
- **Fix:** In Xcode Capability „Push Notifications" hinzufügen (erzeugt `App.entitlements`, in pbxproj verdrahten); Firebase-iOS-SDK (FirebaseMessaging via SPM) einbinden, `GoogleService-Info.plist` aus der Firebase-Console (Projekt `kdoc-e0c17`) hinzufügen, in `AppDelegate` `FirebaseApp.configure()` + `Messaging.messaging().apnsToken = deviceToken` setzen und den **FCM**-Token an Capacitor weiterreichen; APNs-Auth-Key in der Firebase-Console hinterlegen (manuell, siehe Abschnitt 8).

### [HOCH] Legacy-Gmail-OAuth-Relay gibt Tokens per URL an den Client zurück — ohne State-Validierung
- **Datei/Bereich:** `backend/main.py:688-707` (`/auth/gmail/callback`, Legacy-Pfad)
- **Beschreibung:** Findet der Relay keinen Connector-State, fällt er in den Legacy-Pfad: Access- **und Refresh-Token** werden base64-kodiert per Redirect zurückgegeben — auf Android sogar als **Query-Parameter** (`?gmail_result=…`), und der `state` wird in diesem Pfad **nicht** gegen `oauth_states` geprüft (CSRF/Login-Confusion möglich).
- **Auswirkung:** Refresh-Tokens in URLs (Logs, Verlauf, ggf. Intent-Sniffing); Angreifer kann einem Opfer per präpariertem Callback-Link sein eigenes Gmail-Konto unterschieben.
- **Fix:** Der neue serverseitige Flow (`connectors_oauth_start` → verschlüsselte Speicherung) ist vollständig und wird vom aktuellen Frontend benutzt. Legacy-Pfad (Zeilen 688-707) und die Bridge-Endpoints `POST /api/auth/gmail/token-exchange`, `POST /api/auth/gmail/token-refresh` sowie `POST /api/connectors/{type}/oauth/store` entfernen, sobald die ausgerollte native App ≥ der Version mit Server-Flow ist (versionCode 27 nutzt bereits den neuen Flow → entfernen ist jetzt möglich).

### [HOCH] Konnektoren: `appUrlOpen`-Listener-Handle falsch behandelt → TypeError + Listener-Leak
- **Datei/Bereich:** `frontend/src/email/useEmailAccounts.jsx:93-107`
- **Beschreibung:** `listener = App.addListener(...)` speichert das **Promise**, nicht das Handle. Cleanup ruft `listener.remove()` auf → `TypeError: listener.remove is not a function` (Capacitor 8 gibt `Promise<PluginListenerHandle>` zurück). In `useAuth.jsx:139-165` ist dasselbe Muster korrekt gelöst.
- **Auswirkung:** Auf Native wirft jeder Unmount von ProfilPage/EmailPage im Effect-Cleanup; der Listener wird nie entfernt → bei jedem erneuten Mount stapeln sich Listener (mehrfache Callback-Verarbeitung, nur durch das `processedCallbacks`-Set teilmaskiert).
- **Fix:** Promise aufbewahren und im Cleanup auflösen:
  ```js
  let listenerPromise = null;
  if (Capacitor.isNativePlatform()) {
    listenerPromise = import('@capacitor/app').then(({ App }) =>
      App.addListener('appUrlOpen', handler));
  }
  return () => { listenerPromise?.then(h => h?.remove?.()).catch(() => {}); };
  ```

### [HOCH] Doka: Markdown-Links sind tot (Off-by-one im Regex-Gruppenindex)
- **Datei/Bereich:** `frontend/src/pages/Doka.jsx:24-39` (`renderInline`)
- **Beschreibung:** Das Pattern hat 7 Capture-Gruppen (Link = Gruppe 5, Linktext = 6, URL = 7). Der Code rendert `<a href={match[8]}>{match[7]}</a>` — `match[8]` existiert nicht.
- **Auswirkung:** Jeder Link in einer Doka-Antwort wird als nackte URL ohne `href` gerendert — nicht klickbar, Linktext verloren.
- **Fix:** `href={match[7]}` und `{match[6]}` als Text. Eine Zeile.

### [HOCH] Stripe-Checkout-Rückkehr (Android): Hash-Navigation läuft mit BrowserRouter ins Leere
- **Datei/Bereich:** `frontend/src/main.jsx:22-36`
- **Beschreibung:** Der `appUrlOpen`-Handler für `checkout-success` setzt `window.location.hash = '#/profil?checkout=success'` + `reload()`. Die App nutzt `BrowserRouter` — der Hash ist für den Router bedeutungslos; nach dem Reload landet der Nutzer auf `/` (Dashboard).
- **Auswirkung:** Nach erfolgreichem Kauf auf Android: kein Profil, kein Erfolgs-Banner (`ProfilPage` liest `searchParams.get('checkout')`, die nie gesetzt werden), kein gezielter Subscription-Refresh.
- **Fix:** `window.location.href = '/profil?checkout=success'` statt Hash+Reload (ein Navigationsvorgang, Pfad+Query korrekt). Analog `'/pricing?checkout=cancel'` für den Cancel-Fall.

### [HOCH] Dashboard-Statistiken zählen nur die geladene Seite (20 Dokumente)
- **Datei/Bereich:** `frontend/src/pages/Dashboard.jsx:251-256`
- **Beschreibung:** `rechnungen`, `briefe`, `erledigtCount`, `thisWeekCount` werden aus `documents` berechnet — das ist die paginierte Liste (`limit: 20`). Nur `total` kommt vom Server.
- **Auswirkung:** Ab dem 21. Dokument zeigen die Kachel-Zahlen falsche Werte (z. B. „3 Rechnungen" bei real 40).
- **Fix:** Backend liefert die Aggreganten mit: `GET /api/documents/stats` (ein `SELECT kategorie, COUNT(*) … GROUP BY kategorie` + offene/erledigte Counts) oder Erweiterung der bestehenden `/api/documents`-Antwort um ein `stats`-Objekt; Dashboard liest die Serverwerte.

### [HOCH] Android: `usesCleartextTraffic="true"` + Fremd-Domain-Altlast `api.schulbox.at`
- **Datei/Bereich:** `frontend/android/app/src/main/AndroidManifest.xml` (`android:usesCleartextTraffic="true"`), `frontend/android/app/src/main/res/xml/network_security_config.xml`
- **Beschreibung:** Das Manifest erlaubt global Klartext-HTTP; die Security-Config verbietet Klartext ausschließlich für `api.schulbox.at` — eine Domain aus einem **anderen Projekt** (Schulbox). Effektiv: Klartext überall erlaubt außer auf einer Domain, die die App nie kontaktiert.
- **Auswirkung:** Unnötig große Angriffsfläche (MITM bei versehentlichen http-URLs), Play-Review-Hygiene, peinliche Altlast.
- **Fix:** `network_security_config.xml` ersetzen durch `<base-config cleartextTrafficPermitted="false"/>`; `android:usesCleartextTraffic="true"` aus dem Manifest entfernen (die App spricht ausschließlich HTTPS mit `api.kdoc.at`).

### [HOCH] IMAP-Konto wird ohne Verbindungstest als „aktiv" gespeichert
- **Datei/Bereich:** `backend/main.py:4023-4037` + `backend/connectors_service.py:85-91`
- **Beschreibung:** `connectors_imap_connect` speichert E-Mail/Passwort/Host verschlüsselt und antwortet `{"status":"active"}` — ohne je einen IMAP-Login zu versuchen.
- **Auswirkung:** Tippfehler im App-Passwort → UI feiert „verbunden", der Fehler taucht erst Tage später als „Error"-Badge nach der ersten Doka-Suche auf. Klassischer Vertrauenskiller.
- **Fix:** Vor `add_imap_account` einen Test-Login ausführen: `await asyncio.wait_for(asyncio.to_thread(_imap_login_test, host, port, email, password), timeout=15)` (IMAP4_SSL → login → logout). Bei Fehlschlag HTTP 400 mit verständlicher Meldung („Login fehlgeschlagen — App-Passwort prüfen").

### [HOCH] IMAP-Suche ohne Socket-Timeout — kann Doka-Streams unbegrenzt blockieren
- **Datei/Bereich:** `backend/connectors_service.py:144-175` (`_imap_search_sync`)
- **Beschreibung:** `imaplib.IMAP4_SSL(host, port)` ohne `timeout=` → Default „ewig". `_search_one` und damit das Doka-Tool `kdoc_search_emails` awaiten den Thread ohne `asyncio.wait_for`.
- **Auswirkung:** Ein hängender IMAP-Server friert den SSE-Stream ein — der Nutzer sieht dauerhaft „Doka denkt nach…" ohne Abbruchmöglichkeit; der Worker-Thread bleibt belegt.
- **Fix:** `imaplib.IMAP4_SSL(host, int(port), timeout=20)` setzen UND in `_search_one` die IMAP-Ausführung in `asyncio.wait_for(..., timeout=30)` wickeln (TimeoutError → `_mark_account(status="error", error="timeout")`, leeres Ergebnis).

### [MITTEL] Doka: Auto-Scroll ist wirkungslos
- **Datei/Bereich:** `frontend/src/pages/Doka.jsx:155-157, 385`
- **Beschreibung:** Der Effect setzt `scrollRef.current.scrollTop = scrollHeight`, aber das Ziel-`<div>` hat kein `overflow`/`maxHeight` — es scrollt die **Seite**, nicht der Container. Die Zuweisung ist ein No-op.
- **Auswirkung:** Beim Streamen langer Antworten muss der Nutzer manuell mitscrollen; neue Nachrichten erscheinen außerhalb des Viewports.
- **Fix:** Sentinel-Element ans Listenende (`<div ref={bottomRef}/>`) und im Effect `bottomRef.current?.scrollIntoView({ block: 'end' })` — funktioniert mit Seiten-Scroll und ist keyboard-robust.

### [MITTEL] Doka: Anhänge werden nie gelöscht (Storage-Leak + DSGVO)
- **Datei/Bereich:** `backend/main.py:3767-3790` (`_doka_extract_attachment_text`), `DELETE /api/doka/conversations/{id}`
- **Beschreibung:** Jeder Chat-Anhang wird dauerhaft in `data/doka_attachments/` gespeichert. Beim Löschen einer Konversation kaskadieren nur die DB-Zeilen; Dateien bleiben. (Phishing-Uploads werden korrekt sofort gelöscht.)
- **Auswirkung:** Unbegrenztes Disk-Wachstum; Nutzerdaten überleben die Löschung.
- **Fix:** In `delete_doka_conversation` vor dem DB-Delete die `attachments`-Spalten der Messages lesen und `stored`-Dateien entfernen. Zusätzlich in der Account-Löschung (siehe KRITISCH oben).

### [MITTEL] Doka: Anhang-Validierung schwächer als beim Upload
- **Datei/Bereich:** `backend/main.py:3770-3781`
- **Beschreibung:** Doka prüft nur die Datei-Endung; `/api/upload` prüft zusätzlich Magic-Bytes + echten Decode (`_looks_like_allowed_upload`) und 50-MB-Limit. Doka hat **kein Größenlimit**.
- **Auswirkung:** Beliebig große/umbenannte Dateien landen auf der Platte und gehen ins OCR.
- **Fix:** In `_doka_extract_attachment_text` dieselben Checks aufrufen: Größenlimit (z. B. 25 MB) + `_looks_like_allowed_upload(content, ext)` vor dem Speichern.

### [MITTEL] Doka: Chat-History wächst unbegrenzt → Token-Kosten & Kontextfenster
- **Datei/Bereich:** `backend/main.py:3831-3842`
- **Beschreibung:** Jeder Turn sendet **alle** bisherigen Messages der Konversation an Mistral; es gibt kein Fenster/Limit.
- **Auswirkung:** Lange Konversationen werden linear teurer (Tokens zählen aufs Nutzer-Kontingent) und laufen irgendwann gegen Modell-/Timeout-Grenzen.
- **Fix:** History begrenzen, z. B. die letzten 20 Messages oder per Zeichenbudget (~24 k Zeichen) von hinten auffüllen; optional ältere Turns durch eine Server-Zusammenfassung ersetzen.

### [MITTEL] Doka: Client-Abbruch verwirft Antwort und Token-Abrechnung
- **Datei/Bereich:** `backend/main.py:3844-3884` (`event_stream`)
- **Beschreibung:** Persistenz der Assistant-Message + `increment_usage` laufen erst **nach** vollständigem Stream. Bricht der Client ab (App-Wechsel, Netz), wird der Generator gecancelt: Antwort weg, Tokens unberechnet, User-Message hängt ohne Antwort in der DB.
- **Auswirkung:** Nutzer kommt zurück und seine Frage steht ohne Antwort da; angerissene Mistral-Kosten werden nicht aufs Kontingent gebucht.
- **Fix:** Persist-Logik in `finally:`/`except asyncio.CancelledError` ziehen: bereits akkumulierten `final_content`-Zwischenstand (Deltas mitschreiben) + Token-Teilverbrauch speichern.

### [MITTEL] Doka: Roh-Exception geht als SSE-`error`-Event an den Client
- **Datei/Bereich:** `backend/main.py:3855-3857`
- **Beschreibung:** `{'type':'error','message': str(exc)}` sendet interne Fehlertexte (Stack-Bestandteile, Pfade) über die Leitung. Das Frontend maskiert sie zwar, im Netzwerk-Log stehen sie trotzdem.
- **Fix:** Generischen Code senden (`{'type':'error','code':'stream_failed'}`), Details nur loggen.

### [MITTEL] Upload-Analyse: Multi-Page-PDF ohne Seitenlimit
- **Datei/Bereich:** `backend/main.py:950-969` (`run_analysis`)
- **Beschreibung:** Anders als `ocr_file_multipage` (Cap 15 Seiten) OCRt die Upload-Analyse **alle** Seiten eines PDFs.
- **Auswirkung:** Ein 300-Seiten-PDF = 300 Mistral-OCR-Calls in einem Background-Task — Kosten- und Latenz-Risiko, Rate-Limit-Gefahr.
- **Fix:** Dasselbe `max_pages`-Cap (z. B. 30) anwenden und im `volltext` einen Hinweis „[gekürzt auf N Seiten]" anhängen.

### [MITTEL] LIKE-Suche: `%`/`_` werden nicht escaped (Doka + Dokumentensuche)
- **Datei/Bereich:** `backend/doka_service.py:162-169`, `backend/main.py:1316-1320`
- **Beschreibung:** Suchbegriffe landen ungefiltert in `LIKE '%…%'`. `%` oder `_` im Begriff wirken als Wildcards.
- **Auswirkung:** Suche nach „100%" matcht alles, was mit „100" beginnt; keine Injection (Parameter-Binding ✓), aber falsche Treffer.
- **Fix:** `query.replace('\\','\\\\').replace('%','\\%').replace('_','\\_')` + `LIKE ? ESCAPE '\'`. Mittelfristig: SQLite **FTS5**-Index über absender/zusammenfassung/volltext (siehe Optimierungen).

### [MITTEL] IMAP-Suchsyntax bricht bei Anführungszeichen/Nicht-ASCII
- **Datei/Bereich:** `backend/connectors_service.py:154`
- **Beschreibung:** `("TEXT", f'"{query}"')` — ein `"` im Suchbegriff zerstört das IMAP-Kommando; Umlaute/CJK erfordern `CHARSET UTF-8`, sonst antworten viele Server mit BAD.
- **Fix:** Quotes strippen/escapen und `M.literal`-Suche bzw. `M.search('UTF-8', 'TEXT', query.encode())` verwenden; Fehler je Konto abfangen (passiert bereits) und als `last_error` ausweisen.

### [MITTEL] Konnektor-Löschen & Doka-Konversation-Löschen ohne Bestätigung
- **Datei/Bereich:** `frontend/src/email/EmailAccountSettings.jsx:78-82, 196-209`; `frontend/src/pages/Doka.jsx:265-272, 375-378`
- **Beschreibung:** Ein Tap auf das (kleine) Papierkorb-Icon löscht sofort und unwiderruflich — Postfach-Verbindung bzw. kompletten Chat-Verlauf. Der app-eigene `useConfirm`-Dialog existiert und wird z. B. bei der Abo-Kündigung benutzt.
- **Fix:** `const ok = await confirm({ title: …, variant: 'danger' })` vor `remove(id)` bzw. `deleteDokaConversation(id)`.

### [MITTEL] OAuth-Web-Callback: `history.replaceState('/profil')` desynchronisiert den Router
- **Datei/Bereich:** `frontend/src/email/useEmailAccounts.jsx:55-57`
- **Beschreibung:** Nach dem OAuth-Bounce wird die URL hart auf `/profil` gebogen, ohne React Router zu informieren — gerendert bleibt die `/email-callback/:provider`-Route (die ProfilPage zeigt, daher optisch unauffällig, aber Back-Button/Refresh verhalten sich inkonsistent). Kommt der Einstieg künftig von `/email`, bounct es trotzdem auf `/profil`.
- **Fix:** `useNavigate()(`/profil`, { replace: true })` verwenden (bzw. den Ursprung im OAuth-State mitgeben und dorthin zurückkehren).

### [MITTEL] OAuth-Cold-Start (E-Mail-Connect) wird nicht verarbeitet
- **Datei/Bereich:** `frontend/src/hooks/useAuth.jsx:96-111` (behandelt nur `login-callback`), `useEmailAccounts.jsx`
- **Beschreibung:** Killt das OS die App während des Gmail-Custom-Tabs, kommt `at.kamaldoc.app://email-callback/...` als **Launch-URL** — die nur-warm registrierten Listener verpassen sie. (Fürs Login ist genau dieser Fall via `getLaunchUrl()` gelöst.)
- **Auswirkung:** Konto ist serverseitig korrekt verbunden, aber der Nutzer sieht weder Toast noch aktualisierte Liste — wirkt wie ein Fehlschlag.
- **Fix:** In `useEmailAccounts` beim Mount einmalig `App.getLaunchUrl()` prüfen und durch `handleCallback()` schicken (dedupe via `processedCallbacks` greift bereits).

### [MITTEL] Härtere Währungs-/Datums-i18n-Brüche
- **Datei/Bereich:** `Dashboard.jsx:323,511,753`, `Archiv.jsx:142`, `ExpensesPage.jsx:26`, `DocumentDetail.jsx:537`, `DokumenteListe.jsx:148` (`toLocaleString('de-DE', …)`); `Dashboard.jsx:761-774` (`getDeadlinePill`: „heute", „vor X T.")
- **Beschreibung:** Beträge sind auf de-DE/EUR festgenagelt; die Deadline-Pille spricht in 50 Sprachen Deutsch.
- **Fix:** Zentrale `formatCurrency(value, i18n.language)`-Util (Currency bleibt EUR, Locale folgt `i18n.language`); Deadline-Labels über `t('deadline.today')`, `t('deadline.daysAgo', {count})`, `t('deadline.inDays', {count})` mit Plural-Keys.

### [MITTEL] Universal-Büroklammer bietet Dateitypen an, die das Backend ablehnt
- **Datei/Bereich:** `frontend/src/utils/attachmentSources.js:21-43` (`DOC_MIME_TYPES` mit docx/xlsx/pptx/txt/csv) ↔ Backend `ALLOWED_EXTENSIONS = {jpg, jpeg, png, pdf}`
- **Beschreibung:** Der native Dokument-Browser lässt Office-Dateien auswählen; Doka/Upload/Phishing antworten dann 400 „Dateityp nicht unterstützt". HEIC (iPhone-Fotodateien aus dem Datei-Browser) ebenso.
- **Fix:** Kurzfristig: `types` der Doka-/Upload-Aufrufe auf `['application/pdf','image/jpeg','image/png']` beschränken (Picker-seitig filtern statt serverseitig scheitern). Mittelfristig: HEIC-Support im Backend (Pillow ≥ 12 + `pillow-heif`) — iPhone-Nutzer erwarten das.

### [MITTEL] Rate-Limit-Speicher wächst unbegrenzt; Multi-Worker-blind
- **Datei/Bereich:** `backend/main.py:130-211`
- **Beschreibung:** `self.requests`/`_user_rate_buckets` (defaultdicts) behalten jeden je gesehenen IP-/User-Key für immer (nur die Timestamps werden gefiltert). Bei `uvicorn --workers >1` hat jeder Worker eigene Buckets (Limit × Worker).
- **Fix:** Periodisch leere Keys löschen (z. B. bei jedem 1000. Request `{k:v for k,v in … if v}`), und dokumentieren, dass das Deployment single-worker ist — oder auf `slowapi`/Redis umstellen, wenn skaliert wird.

### [NIEDRIG] EmailPage rendert Konnektor-UI kurz, bevor Feature-Flags geladen sind
- **Datei/Bereich:** `frontend/src/pages/EmailPage.jsx:12`
- **Beschreibung:** `if (loaded && !isEnabled(...))` — solange `loaded === false`, wird die volle Konnektor-UI gerendert (Flash bei deaktiviertem Flag).
- **Fix:** `if (!loaded) return <Spinner/>;` davor.

### [NIEDRIG] Ticket-Datei-Endpoint: Dateiname ungefiltert in Pfad
- **Datei/Bereich:** `backend/main.py:3469-3493`
- **Beschreibung:** `TICKET_FILES_DIR / filename` — Starlette lässt zwar kein `/` in Pfadsegmenten zu (Traversal praktisch nicht erreichbar) und die Owner-Prüfung matcht exakt, aber Defense-in-Depth fehlt.
- **Fix:** `filename = Path(filename).name` als erste Zeile.

### [NIEDRIG] `connectors_oauth_store` akzeptiert beliebige `connector_type`-Strings
- **Datei/Bereich:** `backend/main.py:4040-4052`
- **Fix:** Gegen `AVAILABLE_CONNECTORS` validieren (entfällt, wenn der Legacy-Endpoint gelöscht wird — siehe HOCH oben).

### [NIEDRIG] Dashboard: doppelter Initial-Fetch
- **Datei/Bereich:** `frontend/src/pages/Dashboard.jsx:194-197`
- **Beschreibung:** Beim Mount feuern sowohl der `kategorie`-Effect als auch der Debounce-Effect (`search` initial `''`) je ein `fetchDocs()`.
- **Fix:** Im Debounce-Effect den ersten Lauf überspringen (`useRef(true)`-Guard).

### [NIEDRIG] Dead Code
- `frontend/src/pages/Dashboard.jsx:36-54` (`SUBLINES_DE/EN` ungenutzt), `Archiv.jsx:21-29` (`KATEGORIE_COLORS` ungenutzt), `capacitor.config.json` `plugins.App.launchUrl` (kein gültiger Config-Key des App-Plugins).
- **Fix:** Entfernen.

---

## 2. Design-Probleme

### [KONNEKTOREN] Der „native Zurück-Pfeil" — Root Cause & Einordnung
Siehe ausführlich **Abschnitt 5.2**. Kurz: Es ist die System-Toolbar des OAuth-In-App-Browsers (Chrome Custom Tab / SFSafariViewController), die ohne `toolbarColor` im Standard-Look (hell, fremder Pfeil/X, URL-Zeile) über der dunklen App aufgeht.

### [KONNEKTOREN] Zwerg-Touch-Targets und asymmetrische Trefferflächen
- **Beschreibung:** Zurück-Button EmailPage 32×32 (`EmailPage.jsx:16,36`), Provider-Picker-Zurück 26×26 (`EmailAccountSettings.jsx:242-247`), Sync/Löschen 28×28 (`EmailAccountSettings.jsx:184-209`). Die globale Regel `button { min-height: 44px }` (index.css:223-228) drückt sie auf 28×44 / 26×44 — höher als breit, optisch verrutscht, horizontal weiter unter Apples 44×44-Empfehlung.
- **Betroffen:** EmailPage-Header, Provider-Picker, Konto-Zeilen; ähnliche Mini-Buttons in Doka-Konversationsliste (Trash, `padding: 4`) — dort per `no-touch-min` sogar bewusst von der 44-px-Regel ausgenommen.
- **Fix:** Einheitliche Icon-Button-Größe 44×44 (`width:44; height:44`), Icon bleibt 16–18 px; in Listenzeilen `min-width: 44px` ergänzen statt `no-touch-min`.

### [KONNEKTOREN] „Postfach hinzufügen" wechselt die UI-Metapher dreimal
- **Beschreibung:** Inline-Button → Inline-Picker (ersetzt den Button) → Modal (IMAP) bzw. externer Browser (OAuth). Der Picker hat einen eigenen Mini-Zurück-Pfeil, das Modal einen „Abbrechen"-Textbutton, der Browser eine System-Toolbar — drei verschiedene „Zurück"-Konzepte in einem Flow.
- **Fix:** Picker und IMAP-Formular in **ein** Bottom-Sheet im Stil von `AttachmentActionSheet` legen (Sheet-Header mit Titel + X, Provider-Liste als erste Ebene, IMAP-Formular als zweite Ebene mit Sheet-internem Zurück). Ein Pattern, ein Schließen-Konzept.

### [DOKA] Eingabezeile: kein Auto-Grow, kein Stop-Button
- **Beschreibung:** `textarea rows={1}` wächst beim Tippen mehrzeiliger Nachrichten nicht (`Doka.jsx:498-506`); während des Streamings gibt es keinen Abbrechen-Button, obwohl `abortRef`/AbortController vollständig verdrahtet sind.
- **Fix:** `onInput`-Auto-Resize (`el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,120)+'px'`); Send-Button im Streaming-Zustand als Stop-Button rendern (`abortRef.current?.abort()`).

### [DOKA] Tastatur kann die fixe Eingabezeile verdecken (iOS ungetestet/ungemanagt)
- **Beschreibung:** Die Eingabe ist `position: fixed` über der Tab-Bar; `@capacitor/keyboard` ist nicht installiert, iOS-Keyboard-Resize-Verhalten ist Default (`native`-Pan). Auf iOS schiebt sich die Tastatur erfahrungsgemäß über fixe Bottom-Elemente.
- **Fix:** `@capacitor/keyboard` hinzufügen, `resize: 'native'`→`'body'` testen, oder per `keyboardWillShow`-Event `--keyboard-offset` als CSS-Var setzen und auf den Input-Container addieren. Auf einem echten iPhone verifizieren (Simulator reicht).

### [GLOBAL] ErrorBoundary fällt aus dem Designsystem und spricht nur Deutsch
- **Beschreibung:** Hartes `#2563eb`-Blau (Fremdfarbe), hartkodierte deutsche Texte (`ErrorBoundary.jsx:44-58`) in einer 50-Sprachen-App.
- **Fix:** `var(--accent-solid)`/`btn-accent`-Stil verwenden; Texte über i18n (Boundary liegt außerhalb des Providers → `i18n.t()` direkt importieren, mit deutschem Fallback).

### [GLOBAL] Theme-Color-Mismatch
- **Beschreibung:** `index.html`/`manifest.json` nutzen `#0a0f1a` (altes Blau-Schwarz); das Designsystem ist `#0E0F12` (Onyx). Sichtbar als falsche Statusbar-/Splash-Hintergrundfarbe im PWA-/Browser-Kontext.
- **Fix:** `theme-color`/`background_color` auf `#0E0F12` angleichen.

### [ANDROID] AppTheme-Basis mit ActionBar/Altfarben
- **Beschreibung:** `styles.xml`: `AppTheme` erbt von `Theme.AppCompat.Light.DarkActionBar` mit `colorPrimary`-Altwerten — wird zwar von `NoActionBarLaunch` überdeckt, ist aber die Default-Basis, falls je eine zweite Activity dazukommt.
- **Fix:** Basis auf `Theme.AppCompat.DayNight.NoActionBar` stellen, Farbwerte auf Onyx/Amber.

### [iOS] Marketing-Bilder & Service Worker im App-Bundle
- **Beschreibung:** `frontend/public/Google/Handy1-4.png` + `Google-Logo.png` (Login-/Marketing-Assets) und `sw.js` werden via `cap sync` in jede native App kopiert (`ios/App/App/public/…`).
- **Fix:** Marketing-Bilder, die nur die Web-Login-Seite braucht, raus aus `public/` (oder via Build-Step für native ausschließen); Service-Worker-Registrierung in `index.html` mit `if (!window.Capacitor)` gaten.

---

## 3. Fable-Optimierungsvorschläge

**Performance**
1. **FTS5 für die Dokumentensuche:** `CREATE VIRTUAL TABLE documents_fts USING fts5(absender, zusammenfassung, volltext, content=documents)` + Trigger; ersetzt fünf `LIKE '%…%'`-Scans pro Suche (Dashboard, Doka-Tool, DokumenteListe). Bei wachsendem Volltext-Bestand der größte einzelne Hebel.
2. **Stripe-SDK blockiert den Event-Loop:** alle `stripe.*`-Aufrufe (Checkout, Cancel, Webhook-Handler) sind synchron → `asyncio.to_thread(...)` wrappen.
3. **Doka-Tool-Ausführung parallelisieren:** mehrere Tool-Calls eines Turns werden sequenziell ausgeführt (`main loop` in `doka_service.py:416-431`) → `asyncio.gather` mit Einzel-Timeouts.
4. **`GET /api/documents` ohne `SELECT *`:** Listenansicht braucht `volltext` nicht — der größte Spaltenwert wird bei jeder Listenabfrage mitgeschleppt. Spaltenliste explizit machen.
5. **Dashboard-Requests bündeln:** Mount feuert 5 parallele Requests (docs, todos, manualTodos, archived, expenses) → ein `GET /api/dashboard`-Aggregat spart auf Mobilfunk spürbar Latenz.

**UX**
6. **Konnektor-Status nach OAuth-Rückkehr aktiv pollen:** Nach `Browser.open` bis zum Deep-Link gibt es keinen Zwischenzustand — ein „Warte auf Google…"-Inline-Status mit Spinner (und Timeout-Reset nach 2 min) nimmt die Unsicherheit.
7. **Doka-Quellen klickbar machen:** Tool-Karten („Dokument gelesen: Finanzamt") könnten auf `/documents/{id}` verlinken — die `document_id` ist im Tool-Result vorhanden, wird aber weggeworfen.
8. **Undo statt Confirm beim Konversations-Löschen:** `UndoToast` existiert bereits als Komponente — passt hier perfekt.
9. **Pull-to-Refresh** auf Dashboard/Doka (Standard-Erwartung in nativen Apps).

**Code-Qualität**
10. **`get_db_dep` konsequent nutzen:** Fast alle Routen öffnen/schließen Connections manuell (`get_db()`+`finally: close()`); die vorhandene Dependency `get_db_dep` würde ~80 Boilerplate-Blöcke eliminieren.
11. **Doppelte Upload-Logik:** `/api/upload` und `/api/upload-batch` duplizieren ~60 Zeilen — gemeinsame `_process_single_upload()`-Helper-Funktion.
12. **`main.py` (4 166 Zeilen) in Router splitten:** `routers/connectors.py`, `routers/doka.py`, `routers/tickets.py`, `routers/admin.py`, `routers/documents.py` via `APIRouter` — reine Verschiebung, große Wartbarkeitsdividende.
13. **Git-Identität prüfen:** Remote-Commits laufen unter `Schulbox <office@schulbox.at>` — für ein kommerzielles KamalDoc-Repo sollte `git config user.name/email` projektbezogen gesetzt sein.

**Sicherheit**
14. **Crash-/Error-Reporting (Sentry)** für WebView **und** Python — der ErrorBoundary-Kommentar kündigt es als „Wave 4" an; vor dem Store-Launch ist es Pflicht, sonst debuggt ihr Rejections blind.
15. **Refresh-Token-Rotation für Gmail persistieren:** `_refresh_gmail_token` speichert ein ggf. rotiertes Refresh-Token nicht explizit (Google rotiert selten, Microsoft immer — Outlook-Pfad macht es richtig).
16. **`X-Forwarded-For`-Vertrauen dokumentieren:** Rate-Limiter vertraut Header blind — sicherstellen, dass nginx auf dem Hetzner-Server `X-Real-IP` selbst setzt und Client-Werte überschreibt.
17. **Backups:** SQLite-DB + `data/originals` liegen auf einem Server — automatisiertes Off-Site-Backup (restic/borg) ist bei Live-Daten überfällig (nicht aus dem Code ableitbar, daher als Empfehlung).

---

## 4. Apple App Store: Notwendige Änderungen

### 4.1 Blocking Issues (führen zu Rejection)

| # | Problem | Lösung |
|---|---------|--------|
| B1 | **Guideline 4.8 — „Sign in with Apple" fehlt.** Die App bietet Google-Login (Drittanbieter-Login) an; damit ist eine gleichwertige Apple-Anmeldung **verpflichtend**. | Supabase unterstützt Apple nativ: Capability „Sign in with Apple" in Xcode aktivieren, Apple-Provider in Supabase konfigurieren, `SignInWithApple`-Button auf LoginPage/RegisterPage (iOS-only rendern reicht; auf Web/Android optional). |
| B2 | **Push-Feature beworben, aber auf iOS tot** (kein Entitlement, kein Firebase/APNs-Pfad — siehe Bug HOCH). Basic/Pro listen „Push-Erinnerungen" als bezahltes Feature → Guideline 2.1 (Funktionalität) / 3.1.2-Risiko, da zahlende iOS-Nutzer ein nicht funktionierendes Feature erhalten. | Push-Kette fixen (siehe Bug-Fix) **oder** Push-Feature-Zeile auf iOS aus PricingPage/Profil-Texten entfernen, bis es funktioniert. |
| B3 | **Account-Löschung unvollständig** (Guideline 5.1.1(v) verlangt echte Löschung; die App verspricht sie explizit im Dialog). | Backend-Fix siehe KRITISCH-Befund #2. |
| B4 | **Gmail-OAuth mit `gmail.readonly`** ist ein „restricted scope": Vor Produktionsfreigabe verlangt **Google** eine Verifizierung (ggf. CASA-Security-Assessment). Ohne verifizierten OAuth-Client zeigt Google Warnschirme/Limits — Apple-Reviewer, die den Flow testen, sehen „unverified app". | Google-OAuth-Verifizierung abschließen (manuell, Abschnitt 8); bis dahin Gmail-Konnektor per Feature-Flag (`email_gmail` steht default auf 0 ✓) deaktiviert lassen. |

### 4.2 Empfohlene Anpassungen (Best Practice)

1. **`ITSAppUsesNonExemptEncryption = false`** in Info.plist — erspart die Export-Compliance-Frage bei jedem Upload.
2. **`UIRequiredDeviceCapabilities` (`armv7`) entfernen** — Altlast, kann auf modernen Geräte-Filtern unerwartet wirken.
3. **Permission-Strings lokalisieren** (`InfoPlist.strings` mindestens EN+DE) — deutsche Strings bei einem en-Reviewer wirken unfertig; Kamera-String wird im Review-Video gezeigt.
4. **PrivacyInfo.xcprivacy vervollständigen:** `NSPrivacyCollectedDataTypes` ist leer, die App erhebt aber E-Mail-Adresse/Name (Account), Nutzerinhalte (Dokumente/Fotos), Kauf-Historie (Stripe) — mit den App-Store-Connect-Nutrition-Labels deckungsgleich deklarieren.
5. **MARKETING_VERSION angleichen** (iOS 1.0/Build 3 vs. Android 1.1.0/27) — einheitlich 1.1.0 vermeidet Verwirrung in Reviews/Support.
6. **Landscape auf iPhone deaktivieren** (`UISupportedInterfaceOrientations` nur Portrait): Das Layout ist strikt mobile-first (maxWidth 500); Landscape zeigt riesige Ränder. iPad-Orientierungen können bleiben (alle vier sind dort ohnehin Pflicht für Multitasking-freie Apps).
7. **Apple-Konnektoren-Hinweis:** iCloud-IMAP via App-Passwort ist zulässig, aber der Hinweistext (`email.icloud_app_password_hint`) sollte den Weg (appleid.apple.com → App-Passwort) präzise beschreiben — Reviewer testen so etwas.

### 4.3 Checkliste vor Einreichung

- [ ] `git pull` + CORS-Fix deployed; Live-API mit Android-/iOS-Build verifiziert
- [ ] Sign in with Apple implementiert und auf Gerät getestet (B1)
- [ ] Push-Entitlement + Firebase-iOS-Setup ODER Push-Claims auf iOS entfernt (B2)
- [ ] Account-Löschung löscht alle Nutzerdaten inkl. Konnektoren/Doka/Tickets (B3)
- [ ] Google-OAuth-Verifizierung (gmail.readonly) abgeschlossen oder Gmail-Flag aus (B4)
- [ ] `ITSAppUsesNonExemptEncryption` gesetzt
- [ ] Privacy Nutrition Labels in App Store Connect = PrivacyInfo.xcprivacy
- [ ] Permission-Strings lokalisiert (mind. EN/DE)
- [ ] MARKETING_VERSION/CURRENT_PROJECT_VERSION gebumpt (1.1.0 / fortlaufend)
- [ ] Frischer `npm run build:ios` (dist vom 02.06. ist älter als die letzten UI-Commits!) + `npx cap sync ios`
- [ ] Auf physischem iPhone: Login (E-Mail, Google, Apple), Upload, Scan, Doka-Stream, Tastatur über Doka-Input, Safe-Areas (Dynamic Island), Datei-Download
- [ ] Keyboard-Verhalten Doka/Login geprüft (kein verdeckter Input)
- [ ] App-Icons/Splash: 1024er-Single-Icon ✓, Splash 2732² ✓ — Dark-Splash optional
- [ ] Demo-Account für Apple-Review (mit vorbefüllten Dokumenten) in App Review Information hinterlegt
- [ ] Screenshots 6.7"/6.5"/5.5" + iPad (falls iPad-Support bleibt: App auf iPad testen oder „iPhone only" deklarieren)

---

## 5. MCP Konnektoren: Detailbericht

### 5.1 Funktionsfehler

Architektur-Kurzfassung: Frontend (`useEmailAccounts` → `/api/connectors/*`) hält **keinerlei** Credentials; OAuth läuft komplett serverseitig über einen State-Token mit `user_id`-Payload (SQLite-`oauth_states`, TTL 10 min, Einmal-Konsum ✓); IMAP-Passwörter werden envelope-verschlüsselt (per-Record-DEK + Fernet-KEK aus `CONNECTOR_MASTER_KEK`) gespeichert ✓. Suchpfad: Doka-Tool → `search_emails` → parallel pro Konto (Gmail REST / MS Graph / imaplib-Thread) mit Status-Tracking je Konto ✓. Das Fundament ist gut — die Probleme liegen am Rand:

1. **`listener.remove()`-TypeError + Listener-Leak** (HOCH, Bug #6) — `useEmailAccounts.jsx:93-107`.
2. **Kein IMAP-Verbindungstest beim Anlegen** (HOCH, Bug #10) — falsche Passwörter werden als „aktiv" gefeiert.
3. **Kein IMAP-Timeout** (HOCH, Bug #11) — hängender Mail-Server friert Doka ein.
4. **Legacy-Token-Relay** (HOCH, Bug #5) — Tokens in URLs, ohne State-Check; entfernen.
5. **Cold-Start-Callback verloren** (MITTEL, Bug #19) — Erfolgsmeldung fehlt nach App-Kill.
6. **Kein Lösch-Confirm** (MITTEL, Bug #17).
7. **`_search_one` überschreibt beim Token-Refresh `display_name`** mit dem Label (`connectors_service.py:321`) — benennt der Nutzer das Konto um und es passiert ein Refresh, ist der alte Name zurück… faktisch nein: `label = row["display_name"] or ctype` — der aktuelle Name wird re-gespeichert, aber `capabilities` werden auf `["search"]` zurückgesetzt. Harmlos heute, Falle bei künftigen Capabilities. Sauberer: gezieltes `UPDATE encrypted_credentials`-Statement statt Upsert.
8. **Outlook „Coming soon"-Gating funktioniert korrekt** über `available`-Flag + ENV (`OUTLOOK_CLIENT_ID`) ✓; Feature-Flags `email_*` stehen default auf 0 — bewusst, aber daran denken, sie für den Launch zu aktivieren.

### 5.2 Back-Button / Navigation Design

**Root Cause des „unschönen Zurück-Pfeils":** Der Weg „Profil → Postfach hinzufügen → Gmail" ruft `Browser.open({ url: auth_url, presentationStyle: 'popover' })` auf (`useEmailAccounts.jsx:118-121`). Das öffnet:
- **Android:** einen **Chrome Custom Tab** mit Standard-Toolbar — heller Hintergrund, system-eigener **X/Zurück-Pfeil** links oben, URL-Zeile. Vor der dunklen Onyx-App wirkt das wie ein Fremdkörper — exakt das beschriebene Symptom.
- **iOS:** einen **SFSafariViewController** mit grauer Toolbar und „Fertig"-Button.

Es ist also **kein** Web-Button und **kein** Navigations-Bug der App, sondern die ungestylte System-Browser-Chrome. Sie lässt sich nicht entfernen (Google **verbietet** OAuth in eingebetteten WebViews — `disallowed_useragent`), aber anpassen:

**Exakter Fix:**
```js
// useEmailAccounts.jsx — startOAuth()
const { Browser } = await import('@capacitor/browser');
await Browser.open({
  url: auth_url,
  toolbarColor: '#0E0F12',          // Onyx — färbt Custom-Tab-Toolbar (Android)
                                     // und SFSafariViewController-Bars (iOS)
  presentationStyle: 'fullscreen',   // statt 'popover' — kein abgeschnittenes
                                     // Sheet auf iPhone, konsistenter Einstieg
});
```
Damit trägt die Browser-Toolbar App-Farben; Pfeil/X bleiben systemseitig (von Google so gewollt — der Nutzer muss erkennen, dass er bei Google ist). Optional dem Einstieg einen App-eigenen Hinweis voranstellen: „Du wirst kurz zu Google weitergeleitet" als Zeile im Picker.

**Weitere Navigations-/Design-Inkonsistenzen im Konnektoren-Bereich** (Details in Abschnitt 2):
- Drei „Zurück"-Metaphern in einem Flow (Inline-Pfeil 26 px → Modal-„Abbrechen" → System-Toolbar) → ein Bottom-Sheet-Pattern verwenden.
- EmailPage-Header-Back (32 px) weicht vom Rest der App ab — alle anderen Seiten (Doka, Dashboard, Profil) haben **keinen** eigenen Back-Button, weil Tab-Navigation gilt. Entweder konsequent App-weit Header-Backs (ungewöhnlich bei Tab-Apps) oder den EmailPage-Back entfernen und auf das „Mehr"-Menü vertrauen, aus dem die Seite geöffnet wird.
- Touch-Targets 26–32 px (siehe Abschnitt 2).
- `history.replaceState('/profil')` Router-Desync (Bug #18).

---

## 6. Doka: Detailbericht

### 6.1 Funktionsfehler

1. **Markdown-Link-Renderer tot** (HOCH, Bug #7) — `match[7]/[8]` statt `[6]/[7]`.
2. **Auto-Scroll no-op** (MITTEL, Bug #12).
3. **Anhänge nie gelöscht + schwächere Validierung + kein Größenlimit** (MITTEL, Bugs #13/#14).
4. **History unbegrenzt** (MITTEL, Bug #15) — Kosten wachsen linear mit Konversationslänge.
5. **Client-Abbruch verliert Antwort & Abrechnung** (MITTEL, Bug #16).
6. **`str(exc)` im SSE-error-Event** (MITTEL, Bug #16b).
7. **E-Mail-Suche kann hängen** (HOCH, via Konnektoren-Bug #11) — der `kdoc_search_emails`-Tool-Call hat keinen eigenen Timeout.
8. **Kein Stop-Button trotz fertigem AbortController** (Design, Abschnitt 2).
9. Kein Fehler gefunden in: Limit-Enforcement (`check_doka_limit` + 30/min-Rate ✓), Token-Abrechnung (echte prompt+completion-Tokens ✓), Konversations-Ownership (`_doka_get_conversation` mit user_id ✓), Tool-Loop-Begrenzung (5 Iterationen mit sauberem Fallback-Text ✓), Prompt-Injection-Guard im System-Prompt ✓, Retry-Pfad (Senden-Button-Bug aus 44f8d80 korrekt gelöst ✓).

### 6.2 Design-Probleme in Doka

- **Eingabezeile:** kein Auto-Grow; Enter sendet (gut), aber Shift-Enter-Hinweis fehlt auf Mobile irrelevant — ok.
- **Tastatur-Überdeckung** der fixen Eingabezeile auf iOS ungeklärt (kein Keyboard-Plugin) — auf Gerät verifizieren.
- **Leere Antwort-Momente:** Zwischen `tool_result` und erstem Delta zeigt die Karte „Doka denkt nach…" — gut gelöst ✓.
- **Suggestions setzen nur den Input** (`setInput(s)`) statt direkt zu senden — zweiter Tap nötig; Direkt-Senden („Tap-to-ask") ist das erwartete Pattern.
- **Konversationsliste:** Toggle-Panel statt eigener Screen funktioniert, aber Löschen ohne Confirm (Bug #17) und kein „Umbenennen" (Titel = erste 60 Zeichen, serverseitig — ausreichend, aber unveränderbar).
- Chip-Styling der User-Nachrichten = System-Notifications (Commit 797ffe7) ist konsistent umgesetzt ✓.

### 6.3 Architektur-Bewertung

**Aufbau:** `Doka.jsx` (UI + SSE-Konsument) → `POST /api/doka/conversations/{id}/message` (Limit-Check → Attachment-OCR → Persist User-Turn → SSE-StreamingResponse) → `doka_service.stream_doka_response` (Mistral-Function-Calling-Loop, max. 5 Iterationen, 90-s-Timeout pro Mistral-Roundtrip) → Tools: `kdoc_search_documents` (SQL LIKE), `kdoc_get_document` (Volltext 6 k Cap), `kdoc_search_emails` (Konnektoren), + 4 Rechts-Tools im Anwalt-Modus (Wrapper um bestehende llm_service-Funktionen). Persistenz: `doka_conversations`/`doka_messages` mit Indizes und FK-Kaskade ✓; Token-Verbrauch landet in `usage_counters` (Nutzer) und `mistral_usage` (Finanz-Monitoring) ✓.

**Bewertung:** Die Architektur ist für den Zweck **richtig dimensioniert** — kein Framework-Overkill, klare Trennung (Endpoint = Orchestrierung, Service = Modell-Loop, Tools = dünne DB-/API-Adapter), SSE-Format sauber (delta/tool_call/tool_result/done/error), Anwalt-Modus elegant als Tool- und Prompt-Erweiterung statt Fork. Schwachstellen sind operativer Natur (History-Fenster, Abbruch-Persistenz, Tool-Timeouts, Datei-Hygiene — alle oben gelistet), nicht strukturell. Mittelfristig sinnvoll: FTS5 statt LIKE für `kdoc_search_documents` und klickbare Quellen-Karten. Note: **B+** — produktionsfähig nach den gelisteten Fixes.

---

## 7. Vollständiger Fix-Guide

Priorisiert; „(Fable behebt)" = automatisierbar ohne externe Zugänge.

**P0 — vor jedem weiteren Schritt**
- [ ] Fix #1 — `git pull` auf main (CORS-Fix 009b80d übernehmen), Backend deployen (Fable bereitet vor; Deploy ggf. Ahmed)
- [ ] Fix #2 — Account-Löschung vervollständigen (connector_accounts, doka_*, Tickets, phishing_checks, Anhang-Dateien) (Fable behebt)
- [ ] Fix #3 — Nativen Datei-Download auf Blob+Share/kurzlebiges Ticket umstellen, `?token=`-URL entfernen (Fable behebt)
- [ ] Fix #4 — Sign in with Apple (Supabase-Provider + Button; Xcode-Capability & Apple-Konsole: Ahmed) (Fable: Code-Seite)
- [ ] Fix #5 — iOS-Push: Entitlement + Firebase-SDK + AppDelegate-Verdrahtung (Fable: Projekt-/Code-Seite; APNs-Key/Plist: Ahmed)

**P1 — Sicherheit & tote Features**
- [ ] Fix #6 — Legacy-Gmail-Relay + token-exchange/-refresh + oauth/store entfernen (Fable behebt)
- [ ] Fix #7 — `useEmailAccounts`: Listener-Promise korrekt entfernen (Fable behebt)
- [ ] Fix #8 — IMAP: Verbindungstest beim Connect + `timeout=20` + `wait_for` um Suche (Fable behebt)
- [ ] Fix #9 — Android: cleartext aus, network_security_config bereinigt (schulbox-Altlast raus) (Fable behebt)
- [ ] Fix #10 — Doka-Link-Regex (match[6]/[7]) (Fable behebt)
- [ ] Fix #11 — Stripe-Checkout-Deep-Link: `location.href='/profil?checkout=success'` (Fable behebt)
- [ ] Fix #12 — Doka: SSE-error generisch, `str(exc)` nur ins Log (Fable behebt)

**P2 — Funktionsqualität**
- [ ] Fix #13 — Dashboard-Statistiken serverseitig aggregieren (Fable behebt)
- [ ] Fix #14 — Doka: Auto-Scroll via Sentinel/`scrollIntoView` (Fable behebt)
- [ ] Fix #15 — Doka: Anhang-Löschung (Konversation + Account), Magic-Byte-Check, 25-MB-Limit (Fable behebt)
- [ ] Fix #16 — Doka: History-Fenster (letzte ~20 Messages/Zeichenbudget) (Fable behebt)
- [ ] Fix #17 — Doka: Persist bei Client-Abbruch (CancelledError-Pfad) (Fable behebt)
- [ ] Fix #18 — Upload-Analyse: max_pages-Cap 30 (Fable behebt)
- [ ] Fix #19 — LIKE-Escaping (`ESCAPE '\'`) in Doka- & Dokumenten-Suche (Fable behebt)
- [ ] Fix #20 — IMAP-Query-Quoting/UTF-8-Charset (Fable behebt)
- [ ] Fix #21 — Lösch-Confirms: Konnektor-Konto & Doka-Konversation via useConfirm (Fable behebt)
- [ ] Fix #22 — OAuth: `navigate()` statt replaceState; Launch-URL-Check für email-callback (Fable behebt)
- [ ] Fix #23 — Browser.open mit `toolbarColor:'#0E0F12'` + fullscreen (Fable behebt)

**P3 — Design & Politur**
- [ ] Fix #24 — Konnektoren-Flow als ein Bottom-Sheet (Picker + IMAP-Form) (Fable behebt)
- [ ] Fix #25 — Icon-Buttons auf 44×44 normalisieren (EmailPage/Settings/Doka-Liste) (Fable behebt)
- [ ] Fix #26 — Währung/Deadline-Pille i18n-fest (formatCurrency-Util + t()-Keys) (Fable behebt)
- [ ] Fix #27 — Doka: Textarea-Auto-Grow + Stop-Button (Fable behebt)
- [ ] Fix #28 — Büroklammer-Typen auf jpg/png/pdf begrenzen; HEIC-Backend-Support evaluieren (Fable behebt)
- [ ] Fix #29 — ErrorBoundary: Designsystem + i18n (Fable behebt)
- [ ] Fix #30 — theme-color/manifest auf #0E0F12 (Fable behebt)
- [ ] Fix #31 — Info.plist: ITSAppUsesNonExemptEncryption, armv7 raus, Portrait-only iPhone, InfoPlist.strings (Fable behebt)
- [ ] Fix #32 — PrivacyInfo: CollectedDataTypes deklarieren (Fable behebt; Abgleich Labels: Ahmed)
- [ ] Fix #33 — EmailPage-Flag-Flash (`!loaded`-Spinner) (Fable behebt)
- [ ] Fix #34 — Ticket-Datei: `Path(filename).name` (Fable behebt)
- [ ] Fix #35 — Dead Code raus (SUBLINES, KATEGORIE_COLORS, launchUrl-Config) (Fable behebt)
- [ ] Fix #36 — Dashboard-Doppel-Fetch beim Mount (Fable behebt)
- [ ] Fix #37 — Rate-Limit-Buckets aufräumen (Fable behebt)
- [ ] Fix #38 — Versionsangleich iOS 1.1.0 + frischer Build + cap sync beider Plattformen (Fable behebt)

---

## 8. ⚠️ MANUELLE TODOs (nur du, nicht Fable)

1. **`google-services.json`** (Android) aus der Firebase-Console in `frontend/android/app/` legen → aktiviert Android-Push (Guard wartet bereits darauf).
2. **iOS-Push-Zugänge:** APNs-Auth-Key (.p8) in der Firebase-Console hinterlegen; `GoogleService-Info.plist` aus Firebase herunterladen und Fable geben; in Xcode einmalig die Capabilities „Push Notifications" + „Sign in with Apple" mit deinem Team (FP45W7D36D) bestätigen.
3. **Sign in with Apple:** In developer.apple.com die Capability für `at.kamaldoc.app` aktivieren; in Supabase den Apple-Provider mit Services-ID/Key konfigurieren.
4. **Google-OAuth-Verifizierung** für den Gmail-Client (`gmail.readonly`, restricted scope): Verifizierungsantrag in der Google Cloud Console (Branding, Scopes-Begründung, Demo-Video; ggf. CASA-Assessment) — Vorlaufzeit Wochen, früh starten.
5. **Server:** Nach `git pull` Backend neu starten (CORS-Fix live nehmen); `CONNECTOR_MASTER_KEK` und `APP_ENV=production` auf dem Hetzner-Server verifizieren; Off-Site-Backup für `data/` einrichten.
6. **App Store Connect:** Privacy Nutrition Labels ausfüllen (analog Fix #32), Demo-Review-Account anlegen, Screenshots hochladen, Einreichung.
7. **Stripe:** Verifizieren, dass die Custom-Scheme-`success_url` (`at.kamaldoc.app://checkout-success`) von Stripe live akzeptiert wird (ein Android-Testkauf nach Fix #11).
