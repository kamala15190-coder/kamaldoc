# kdoc V2 — offene Punkte

Status: 2026-05-05 · V2-Skelett steht, Frontend läuft, Backend antwortet auf Stub-Routen.

## ✅ Schon fertig

- [x] Onyx-&-Amber-Designsystem (`frontend/src/styles.css`, ~2.640 Zeilen)
- [x] Splash mit Chronograph-Orbits (3,7 s)
- [x] Bottom-Nav mit „Doka" statt „Sektoren" + atmender Scan-FAB
- [x] Alle 14 Hauptscreens als React-Komponenten
- [x] React-Router mit Tiefenlinks (`/detail/:id`, `/translate/:id`, …)
- [x] Toast-Provider, TopBar, DeviceFrame
- [x] FastAPI-Skelett mit Auth (JWKS, kein HS256-Fallback)
- [x] SQLAlchemy-2.0-Models für alle Tabellen aus dem Plan
- [x] Mistral-Client mit Timeout + JSON-Extraction
- [x] Routen für Documents / Tasks / Tools / Search / Doka / Connectors / Me
- [x] Phishing-Prompt sehr ausführlich (`backend/kdoc/llm/prompts.py` → `PHISHING_SYSTEM`)
- [x] Multi-Account-Datenmodell (`unique(user_id, connector_type, remote_account_id)`)
- [x] Connectors-UI mit „mehrere Konten pro Anbieter" hinzufügen
- [x] Docker-Compose für Hetzner-Deployment

## 🔨 Manuelle TODOs für dich

### Sofort (vor erstem Login-Test)

- [ ] **Mistral-API-Key besorgen** und in `backend/.env` als `MISTRAL_API_KEY` eintragen.
  (https://console.mistral.ai → API Keys)
- [ ] **Supabase-Projekt erstellen** (https://supabase.com → New Project, EU-Region) und
  - `SUPABASE_URL` aus den Project-Settings → API in `.env` eintragen.
  - Apple-/Google-/Email-Auth-Provider in Supabase Dashboard aktivieren.
- [ ] **Cloudflare-R2-Bucket** anlegen (https://dash.cloudflare.com → R2):
  - Bucket `kdoc-documents` in EU-Region
  - API-Token mit Read+Write für `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`

### Vor Production-Launch

- [ ] **Hetzner-Server** provisionieren (CX21 mit Ubuntu 24.04 LTS reicht für Start)
  - Docker + docker-compose installieren
  - Caddy (oder nginx) als Reverse-Proxy mit Let's-Encrypt
  - DNS für `kdoc.at` und `api.kdoc.at` setzen
- [ ] **Stripe-Produkte** anlegen (Basic monthly/yearly, Pro monthly/yearly) und
  Price-IDs in `.env` als `STRIPE_BASIC_PRICE_ID` / `STRIPE_PRO_PRICE_ID` eintragen.
- [ ] **Stripe-Webhook** auf `https://api.kdoc.at/api/stripe/webhook` registrieren
  und `STRIPE_WEBHOOK_SECRET` setzen. (Backend startet ohne dieses Secret nicht in Produktion.)
- [ ] **Firebase-Projekt** erstellen, Service-Account-JSON herunterladen,
  `FCM_SERVICE_ACCOUNT_JSON` in `.env` eintragen.
- [ ] **Sentry-Projekt** anlegen, DSN in `.env`.
- [ ] **Apple Developer Account** und **Google Play Developer Account** registrieren
  (für iOS / Android Releases).

### Datenschutz & Recht

- [ ] **Datenschutzerklärung** anwaltlich prüfen lassen (DSGVO-konform).
- [ ] **AGB / Nutzungsbedingungen** anwaltlich prüfen lassen.
- [ ] **Impressum** für österreichische Anbieterkennzeichnung erstellen.
- [ ] Abklären: brauchen wir eine Auftragsverarbeitungs-Vereinbarung mit Mistral?
  (Mistral hat EU-Region, sollte machbar sein.)

## 🔧 Coding-TODOs (nicht von dir, sondern für die nächste Implementierungs-Session)

### Phase 1 — Funktionalität bis MVP

- [ ] Echte Supabase-OAuth-Flows im Frontend (`useAuth`-Hook + Capacitor-Browser-Plugin)
- [ ] Document-Upload zu R2 (statt lokalem Filesystem) im Backend
- [ ] OCR-Pipeline mit `mistral-ocr-latest` als Arq-Background-Job
- [ ] Dokumenten-Analyse-Pipeline → DocAnalysis-Tabelle befüllen
- [ ] Frontend: Upload-Page mit Native-File-Inputs (Camera / Galerie / PDF)

### Phase 2 — Connectors / MCP

- [ ] OAuth-Implementierung pro Provider (`backend/kdoc/domain/connectors/gmail.py`, `outlook.py`, …)
- [ ] Envelope-Encryption für Connector-Tokens (`backend/kdoc/domain/crypto.py`)
- [ ] MCP-Server-Subprocess-Runtime (Lazy-Start, Idle-Timeout, Sandboxing)
- [ ] Tool-Catalog-Builder für Doka
- [ ] Frontend: OAuth-Callback-Handling via Deep-Links

### Phase 3 — Doka mit Tools

- [ ] Multi-Turn-Tool-Loop: Mistral-Tool-Calls → MCP-Server → Tool-Results → Mistral
- [ ] SSE-Streaming der Antworten
- [ ] Strukturierte Antwort-Cards (z. B. Versicherung-Info-Card aus dem Mock)

### Phase 4 — Tasks-Erinnerungen

- [ ] Arq-Worker `scheduled_pushes` (alle 60 s)
- [ ] FCM-Send-Helper
- [ ] Frontend: Permission-Flow für Push (iOS / Android)

### Phase 5 — Rechtshilfe AT mit RIS-API

- [ ] Recherche: Endpunkte von https://ris.bka.gv.at (öffentlich, kostenlos)
- [ ] RIS-Connector als MCP-Tool: Gesetzes-Lookup, Paragraf-Zitierung
- [ ] Prompt-Erweiterung um RIS-Daten als Kontext

### Phase 6 — Native Mobile

- [ ] `npx cap add ios` + Xcode-Setup
- [ ] `npx cap add android` + Android-Studio-Setup
- [ ] ML-Kit-Document-Scanner-Plugin für Edge-Detection
- [ ] FCM-Push-Plugin
- [ ] Build-Pipeline (Fastlane für iOS, Gradle für Android)
- [ ] App-Store-Listings (Screenshots, Beschreibung, Keywords)

### Phase 7 — Migration vom alten kdoc

- [ ] Migrations-Script `tools/migrate_v1_to_v2.py`
  - SQLite → Postgres
  - Dateisystem → R2-Upload
  - Alte E-Mail-Tokens NICHT migrieren (User muss neu verbinden)

## 🔥 Bekannte Limitierungen aktuell

- Frontend läuft mit Mock-Daten, wenn Backend nicht erreichbar
- `Bearer dev` als Auth-Token im `local`-Modus → für Produktion **muss** `env=production`
  und echte Supabase-Tokens
- Stripe / FCM / R2 sind noch Stubs in den API-Routen — kein echter Versand / Upload
- Phishing-Check parst PDF/Bild noch nicht (nur Text)
- Doka-MCP-Tool-Loop nicht implementiert (Phase 2)
- Kein TypeScript — V2-Frontend ist JSX. Migration auf TS möglich, nicht priorisiert.

## 💡 Schöne Erweiterungen (nicht V1-blockierend)

- [ ] Pearl-Mode (Light-Theme) — Tokens stehen im Plan, müssen nur ergänzt werden
- [ ] Onboarding-Tour für Neuanmeldungen
- [ ] Apple-Watch-Companion (Aufgaben-Snippets)
- [ ] Web-Search-Tool für Doka (kostet Tokens)
- [ ] Eigener „Versicherungs-Scan"-Wizard für Erstanmeldung

---

**Kurzfassung:** Du musst vor allem Mistral-API-Key + Supabase-Projekt + R2-Bucket besorgen, dann kann
die nächste Implementierungs-Session die Pipeline gerade ziehen.
