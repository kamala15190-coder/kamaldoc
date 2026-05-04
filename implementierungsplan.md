# kdoc · Implementierungsplan

**Version:** 1.0
**Datum:** 2026-05-04
**Status:** Vorschlag zur Freigabe
**Zielgruppe:** Implementierende Entwickler/Opus in VS Code

---

## 0. Wie dieses Dokument zu lesen ist

Dieser Plan beschreibt einen **vollständigen Neuaufbau** von kdoc. Jede Sektion ist eigenständig lesbar, sodass eine LLM-Instanz oder ein Entwickler abschnittsweise implementieren kann. Wo eine Entscheidung getroffen wurde, ist sie begründet — wo eine Entscheidung **offen** ist, steht sie in Abschnitt 21.

**Leitprinzipien** für alle Entscheidungen in diesem Dokument:

1. **Mobile first.** kdoc lebt auf dem Handy. Browser-Use ist sekundär.
2. **Kritisch sein.** Wo der heutige Code Schwächen hat, wird er nicht 1:1 mitgenommen. Sicherheitsschulden werden bereinigt, bevor Features gebaut werden.
3. **Klein und kompetent.** Lieber 80 % Feature-Tiefe statt 100 % Halbgares.
4. **Ein Connector-Modell.** Mehrere E-Mail-Konten pro Anbieter, mehrere Anbieter, einheitlich angebunden über MCP — sodass Doka (KI-Chat) und Search dasselbe Interface nutzen.
5. **Privatsphäre als Feature.** Tokens nicht im Browser, Bilder serverseitig verschlüsselt, KI-Anfragen mit minimalem Scope.

---

## 1. Ziele & Nicht-Ziele

### 1.1 Ziele

* **Mobile-first Dokumentenverwaltung** mit KI-Analyse, das auf Android und iOS produktiv läuft.
* **Multi-Konto-Anbindung** für E-Mail (mehrere Gmail/Outlook/IMAP-Konten gleichzeitig) und in Zukunft Cloud-Storage, Banking, Behördenportale.
* **Doka KI-Assistent**, der Dokumente, E-Mails und externe Datenquellen über MCP-Connectors zusammenführen und beantworten kann.
* **Premium-Designsprache** (Onyx & Amber, Instrument Serif × Inter, Cupra-artige Animationen) wie im Click-Prototyp.
* **Saubere Subscription** (Free / Basic / Pro) mit transparenten Limits und Stripe-basiertem Billing.
* **Stabile Sicherheit** ohne HS256-Fallback, mit per-User-Rate-Limits, mit verschlüsselter Token-Speicherung.

### 1.2 Nicht-Ziele

* **Kein lokales LLM** in V1. Mistral oder Anthropic Claude werden als Cloud-LLM genutzt; lokales LM Studio bleibt eine *spätere* Variante für Pro+ oder Enterprise.
* **Keine Web-Desktop-Optimierung.** Tablets und Desktop bekommen den Mobile-Layout im Mockup-Frame; eine eigene Desktop-Layout-Schiene wird nicht gebaut.
* **Keine Multi-User-Workspaces.** Ein Konto = eine Person. Familien-/Team-Funktionen sind v2.
* **Kein eigener E-Mail-Client.** Wir lesen Mails *kontextuell* in Doka und Search; das Schreiben/Versenden bleibt im nativen Mail-Client des Betriebssystems.

---

## 2. Aktueller Zustand — Auditzusammenfassung

Die heutige Codebasis (3.300+ Zeilen `backend/main.py`, ~9.000 Zeilen Frontend-Pages) ist funktionsfähig, hat aber Schulden, die im Neuaufbau adressiert werden:

| Bereich | Befund | Konsequenz für Rebuild |
|---|---|---|
| **HS256-JWT-Fallback** | Aktiviert via Env-Var. Wenn jemand `ALLOW_HS256_FALLBACK=1` mitschleppt, sind Tokens fälschbar bei Secret-Leak. | **Komplett entfernen.** JWKS-only. |
| **README-Realität-Mismatch** | README behauptet „lokales LLM, kein Internet". Tatsächlich werden Mistral-API, Supabase Auth, Stripe, Firebase verwendet. | README neu schreiben, Architektur ehrlich darstellen. |
| **E-Mail-Tokens im localStorage** | Refresh-Tokens für Gmail/Outlook im Browser-Storage. XSS-Risiko. | **Tokens serverseitig** mit Envelope-Encryption. |
| **OAuth-State im Memory** | `_oauth_states`-Dict im Process. Multi-Instance-Deployment broken. | Redis-basiert. |
| **Stripe-Webhook ohne Pflicht-Secret** | Wenn `STRIPE_WEBHOOK_SECRET` leer ist, wird Webhook ignoriert. | Hart erzwingen, Fail-fast. |
| **LLM-Calls ohne Timeout** | Mistral-Call kann unbegrenzt blockieren. | Pro Call-Typ harte Timeouts (3 / 10 / 30 s). |
| **Monatliche Counter-Race** | Concurrent Uploads → Counter-Off-by-N. | Postgres `SELECT FOR UPDATE` oder atomic UPSERT. |
| **SQLite-Schreib-Lock** | Single-writer, OK für Single-User. Bei vielen Concurrent-Uploads zu langsam. | **PostgreSQL-Migration.** |
| **`feature_flags.email_enabled=0`** | E-Mail-Code teilweise live, aber Feature gated. | Email vollständig fertigstellen, dann standardmäßig an. |
| **Keine Per-User-Rate-Limits** | Nur IP-basiert; hinter CDN unbrauchbar. | Per-User-Buckets. |
| **`_log_mistral_usage` ohne Quota-Enforcement** | Token-Verbrauch wird nur protokolliert, nicht limitiert. | An Subscription-Counter koppeln. |
| **Multi-Account-E-Mail technisch da, UI fehlt** | `EmailConnectorService.searchAllAccounts()` iteriert bereits parallel; UI-Konnektor pro Konto fehlt. | UI-Flow „Konto hinzufügen" pro Anbieter, Backend-Storage mit Encryption. |

**Bewertung:** Es gibt Substanz — Subscription-Logik, Befund-/Behörden-Pipeline, OCR-Pipeline funktionieren. Aber das Sicherheitsmodell ist nicht ausgereift genug, um darauf produktiv zu skalieren. Wir bauen neu, aber lassen uns vom alten Code als *Spec* leiten.

---

## 3. Architektur-Vision

```
┌────────────────────────────────────────────────────────────────┐
│  Native App (Capacitor 7+)                                     │
│  ├─ React 18 SPA (Vite, Tailwind v4)                          │
│  ├─ State: Zustand (kein Redux)                               │
│  ├─ Routing: React Router v6                                  │
│  ├─ i18n: react-i18next (50 Sprachen)                         │
│  └─ Plugins: Camera, Filesystem, Push, ML Kit Scanner,        │
│              Preferences (encrypted), Haptics, App, Browser   │
└────────────────────────────────────────────────────────────────┘
                          │ HTTPS · JWT (Supabase JWKS)
                          ▼
┌────────────────────────────────────────────────────────────────┐
│  kdoc-API (FastAPI 0.115+, Python 3.12)                       │
│  ├─ Async durchgängig (asyncpg + SQLAlchemy 2.0 Async)        │
│  ├─ Auth: Supabase JWKS (RS256/ES256), kein HS256             │
│  ├─ Rate Limit: per-user (Redis, Sliding Window)              │
│  ├─ Background-Jobs: Arq (Redis-basiert) für OCR/Analyse/Push │
│  ├─ Object Storage: Cloudflare R2 (S3-kompatibel)             │
│  └─ Observability: Sentry + OpenTelemetry → Tempo/Grafana     │
└────────────────────────────────────────────────────────────────┘
        │                         │                    │
        ▼                         ▼                    ▼
┌────────────────┐   ┌────────────────────────┐   ┌──────────────┐
│ PostgreSQL 16  │   │ MCP-Connector-Hub      │   │ LLM Gateway  │
│ + pgvector     │   │ ├─ gmail-mcp (×N)      │   │ Anthropic /  │
│ + pg_trgm      │   │ ├─ outlook-mcp (×N)    │   │ Mistral      │
│ Supabase       │   │ ├─ imap-mcp (×N)       │   │ + Circuit-   │
│ Postgres       │   │ ├─ kdoc-search-mcp     │   │   Breaker    │
│                │   │ ├─ kdoc-tools-mcp      │   │ + Stream     │
│                │   │ └─ … (insurance, etc.) │   │              │
└────────────────┘   └────────────────────────┘   └──────────────┘
```

**Kernideen:**

* **Single-Source-of-Truth:** Alles nutzerbezogene lebt in PostgreSQL. Keine localStorage-Schatten-DB.
* **Connector über MCP:** Jeder externe Datenkanal ist ein MCP-Server. Doka & Search nutzen dasselbe Tool-Catalog.
* **Background Jobs:** Lange Tasks (OCR, Analyse, Push-Versand) laufen in Arq-Workern, nicht in der HTTP-Request-Pipeline.
* **Zero-Trust Tokens:** Externe API-Tokens (Gmail-Refresh-Token etc.) liegen *nur* server-side, envelope-verschlüsselt mit per-User-Datakey.

---

## 4. Tech-Stack mit Begründung

### 4.1 Backend

| Layer | Wahl | Begründung |
|---|---|---|
| Language | Python 3.12 | Bestehender Code ist Python; `asyncio` ausgereift; FastAPI-Ökosystem. |
| Framework | FastAPI 0.115+ | Auto-OpenAPI, Pydantic-v2-Validierung, async nativ. |
| ORM | SQLAlchemy 2.0 Async | Migrations via Alembic; type-safe; weite Adoption. |
| DB | PostgreSQL 16 (Supabase Postgres) | Concurrent writes, JSONB für LLM-Outputs, pgvector für Semantic-Search, pg_trgm für Volltext. |
| Cache/Queue | Redis 7 (Upstash oder selbst-gehostet) | Rate-Limits, OAuth-State, Arq-Queue. |
| Job Queue | Arq | Schlanker Redis-basierter Worker. Celery wäre Overkill. |
| Object Storage | Cloudflare R2 | S3-API, kein Egress-Cost, EU-Region wählbar. |
| Auth | Supabase Auth | Bereits genutzt, ausgereift, Apple/Google/Email/Password OOTB. |
| Billing | Stripe Subscriptions | Bereits genutzt, EU-fähig (SCA), Webhook-Pflicht. |
| Push | Firebase Cloud Messaging (FCM v1) | Cross-Platform Android+iOS, Free-Tier. |
| LLM | **Anthropic Claude 4.7 Opus** primär, **Mistral-Large** Fallback | Claude 4.7 ist Stand 2026 das stärkste Modell für Deutsch+Recht+Medizin. Mistral als Cost-Optimierung für einfachere Tasks (Klassifikation, Übersetzung). |
| OCR | **Anthropic Claude Vision** (4.7 sieht direkt) | Vereinheitlicht Pipeline, kein separater OCR-Schritt mehr. Fallback: Mistral-OCR oder AWS Textract. |
| MCP Runtime | `mcp-python` SDK + Subprocess-Worker | Connectors als isolierte Worker-Prozesse, gestartet on-demand. |

### 4.2 Frontend

| Layer | Wahl | Begründung |
|---|---|---|
| Build | Vite 5+ | Schnell, ESM-nativ. |
| Framework | React 18 (Concurrent) | Bestand bleibt; kein Rewrite zu Vue/Svelte. |
| Styling | Tailwind v4 + CSS-Variablen | Tokens aus Design-System mappen 1:1. |
| State | Zustand | Leichtgewichtig, mobile-friendly, kein Provider-Boilerplate. |
| Forms | React Hook Form + Zod | Performance, Validation-Gleichlauf zu Pydantic. |
| Routing | React Router v6 | Bestand. |
| Charts | Recharts | Für Ausgaben-Dashboard. |
| i18n | react-i18next | Bereits genutzt. |
| Vector Icons | Lucide | Bereits genutzt, konsistent. |

### 4.3 Native

| Layer | Wahl | Begründung |
|---|---|---|
| Wrapper | Capacitor 7 | Bestand, ausgereift, plug-in-rich. |
| Scanner | Google ML Kit Document Scanner (Android) + VisionKit (iOS) | Native Edge-Detection, perspektivische Korrektur, native Geschwindigkeit. |
| Push | `@capacitor-firebase/messaging` | Cross-Platform FCM. |
| Storage | `@capacitor/preferences` (Secure-Backed) | Tokens **nicht** hier — nur User-Preferences (Theme, Locale). |
| Haptics | `@capacitor/haptics` | Subtile Tap-Feedback, schon im Prototyp eingeplant. |

---

## 5. Sicherheitsmodell — kritisch hinterfragt

### 5.1 Authentifizierung

**Entscheidung:** Supabase Auth via JWKS, ES256/RS256 only.

* **HS256-Fallback wird komplett entfernt.** Auch dev. Wer dev braucht, nutzt einen lokalen Supabase-Container.
* JWT wird in jedem Request via `Depends(get_current_user)` validiert.
* JWKS-Cache: 1 h Lifespan, automatisches Refresh bei Key-Rotation.
* `audience: "authenticated"` ist Pflicht-Claim.
* Token-Lifetime: 1 h; Refresh-Token: 30 d. Frontend nutzt Supabase-SDK, das automatisch refresht.

### 5.2 Token-Storage (Sign-in Tokens)

| Plattform | Storage | Begründung |
|---|---|---|
| iOS / Android (Capacitor) | Native Secure Enclave via `@capacitor/preferences` (verschlüsselt durch OS-Keychain/Keystore) | OS-level Schutz. |
| Web (PWA) | IndexedDB mit Subtle-Crypto-AES-GCM, Schlüssel via `WebCrypto` derived from Session-Cookie | localStorage XSS-vulnerable; IndexedDB mit AES ist Best-Effort-Schutz. |

### 5.3 Connector-Tokens (Gmail/Outlook/IMAP)

**Entscheidung:** **Niemals im Frontend.** Tokens fließen so:

```
1. Frontend startet OAuth → Browser/CustomTab → Anbieter-Login
2. Anbieter redirect → kdoc-Backend (/connectors/{type}/callback)
3. Backend tauscht Code gegen Refresh-Token
4. Backend verschlüsselt Token mit per-User Data-Encryption-Key (DEK)
5. DEK wird mit Master-KEK (KMS oder Env) verschlüsselt
6. Speichert in `connector_accounts.encrypted_credentials` (BYTEA)
7. Frontend bekommt nur eine `connector_account_id` zurück
```

Wenn Doka oder Search auf einen Connector zugreift, läuft die Anfrage *immer* über das Backend, das den MCP-Server mit den entschlüsselten Credentials startet.

### 5.4 Rate Limiting

**Entscheidung:** Sliding-Window in Redis, Schlüssel `rl:{user_id}:{route}`.

| Route | Limit | Begründung |
|---|---|---|
| `/api/upload` | 30/min, 200/h, 1500/d | Verhindert Abuse, ausreichend für menschliche Nutzung. |
| `/api/doka/chat` | 60/min, 500/h | LLM-Cost-Schutz. |
| `/api/connectors/*/sync` | 10/min, 100/h | Anbieter-API-Rate-Limits respektieren. |
| `/api/push-token` | 5/min | DoS-Schutz auf Token-Storage. |
| Default | 200/min | Allgemein. |

IP-basierte Limits zusätzlich für unauthentifizierte Endpoints (`/healthz`, OAuth-Callbacks).

### 5.5 Stripe-Webhook

**Entscheidung:** Webhook-Secret ist Pflicht, sonst Boot-Failure.

* Beim Startup wird `STRIPE_WEBHOOK_SECRET` validiert; fehlt es → Process exit code 1.
* Webhook-Handler nutzt `stripe.Webhook.construct_event()` mit Signatur-Check.
* Idempotenz: `processed_stripe_events`-Tabelle mit Event-ID als PK.

### 5.6 Daten-Verschlüsselung

| Daten | Schutz |
|---|---|
| Originale Dokumente in R2 | Server-Side-Encryption (AES-256), kdoc-eigener KMS-Key |
| Connector-Tokens | Envelope-Encryption (DEK pro User, KEK in KMS) |
| Datenbank-Backups | Postgres-Native-Encryption + Bucket-Encryption |
| Übertragung | TLS 1.3 only, HSTS-Header, Pin via Capacitor Network-Security-Config |

### 5.7 RLS (Row-Level-Security)

In Postgres aktivieren wir RLS auf allen User-Daten-Tabellen. Auch wenn das Backend ohnehin via JWT filtert, ist RLS eine zusätzliche Sicherheitsschicht für den Fall, dass eine WHERE-Klausel mal vergessen wird.

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_owner ON documents
  USING (user_id = current_setting('app.user_id')::uuid);
```

Das Backend setzt `SET LOCAL app.user_id = '<jwt-sub>'` zu Beginn jeder Transaktion.

### 5.8 Content-Security-Policy (Frontend)

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https://*.r2.cloudflarestorage.com;
connect-src 'self' https://api.kdoc.at wss://api.kdoc.at https://*.supabase.co;
frame-ancestors 'none';
```

---

## 6. Datenmodell

Komplettes Postgres-Schema. Alle `id`-Felder sind UUID v7 (zeitlich sortierbar).

### 6.1 User & Auth

```
auth.users               -- managed by Supabase Auth
profiles
  id          uuid PK FK auth.users
  vorname     text
  nachname    text
  adresse     text
  plz         text
  ort         text
  land        text  -- ISO 3166-1 alpha-2
  email       text  -- denormalized for queries
  telefon     text
  app_locale  text  -- 'de' | 'en' | 'tr' | …
  theme       text  -- 'onyx' | 'pearl' | 'system'
  created_at  timestamptz
  updated_at  timestamptz
```

### 6.2 Subscription

```
subscriptions
  user_id              uuid PK FK
  plan                 enum('free','basic','pro')
  stripe_customer_id   text
  stripe_subscription_id text
  started_at           timestamptz
  expires_at           timestamptz
  cancelled_at         timestamptz
  pending_plan         enum
  updated_at           timestamptz

usage_counters
  user_id              uuid PK FK
  documents_total      int
  ki_analyses_total    int
  documents_month      int
  ki_analyses_month    int
  rechtshilfe_month    int
  befund_month         int
  doka_messages_month  int
  phishing_checks_month int
  last_reset           date
  registration_date    date

processed_stripe_events
  event_id             text PK
  processed_at         timestamptz
```

### 6.3 Dokumente

```
documents
  id                  uuid PK
  user_id             uuid FK profiles NOT NULL
  source              enum('camera','upload','email_attach','imap_fetch')
  original_filename   text
  storage_key         text  -- R2 path
  thumbnail_key       text
  mime_type           text
  size_bytes          bigint
  page_count          int
  uploaded_at         timestamptz
  status              enum('queued','analyzing','ready','failed')
  error_message       text
  detected_language   text  -- ISO 639-1
  is_encrypted        boolean

doc_pages              -- only for multi-page PDFs
  id                  uuid PK
  document_id         uuid FK CASCADE
  page_number         int
  thumbnail_key       text
  ocr_text            text
  unique (document_id, page_number)

doc_analysis           -- LLM extracted structured data
  document_id         uuid PK FK CASCADE
  category            enum('rechnung','brief','behoerde','befund','vertrag','lohnzettel','sonstiges')
  sender              text
  recipient           text
  document_date       date
  amount              numeric(12,2)
  currency            text
  due_date            date
  iban                text
  has_action          boolean
  action_summary      text
  ai_summary          text
  full_text           text
  contact_email       text
  contact_phone       text
  expense_category    text
  raw_json            jsonb  -- complete LLM output for debugging/re-extraction
  analyzed_at         timestamptz

doc_embeddings         -- pgvector for semantic search
  document_id         uuid PK FK CASCADE
  embedding           vector(1536)
  model               text
  created_at          timestamptz
```

### 6.4 Aufgaben & Erinnerungen

```
tasks
  id                  uuid PK
  user_id             uuid FK
  document_id         uuid FK SET NULL  -- nullable: manual tasks possible
  title               text NOT NULL
  description         text
  deadline            timestamptz
  notify_at           timestamptz       -- when push fires
  notification_lead   interval          -- e.g. '3 days'
  done                boolean default false
  done_at             timestamptz
  source              enum('extracted','manual','recurring')
  created_at          timestamptz
  updated_at          timestamptz
```

### 6.5 Tool-Outputs

```
replies                -- generated reply letters
  id                  uuid PK
  document_id         uuid FK CASCADE
  user_id             uuid FK
  topic_keywords      text[]
  user_instruction    text
  body                text
  tone                enum('formal','friendly','firm')
  language            text
  created_at          timestamptz

translations
  id                  uuid PK
  document_id         uuid FK CASCADE
  source_language     text
  target_language     text
  translated_text     text
  created_at          timestamptz
  unique (document_id, target_language)

befund_simplifications
  id                  uuid PK
  document_id         uuid FK CASCADE
  language            text
  what_was_examined   text
  what_was_found      text
  what_it_means       text
  raw_text            text
  created_at          timestamptz
  unique (document_id, language)

rechtshilfe_results
  id                  uuid PK
  document_id         uuid FK CASCADE
  jurisdiction        enum('AT','DE','CH')
  language            text
  conformity_score    int  -- 0..100
  conformity_label    text
  issues              jsonb  -- [{ severity, title, text, citation }]
  contestable         boolean
  draft_objection     text
  created_at          timestamptz

phishing_checks
  id                  uuid PK
  user_id             uuid FK
  document_id         uuid FK CASCADE -- nullable: standalone checks possible
  raw_storage_key     text
  risk_score          int  -- 0..100, 0 = phishing, 100 = safe
  verdict             enum('phishing','suspicious','likely_safe','safe')
  reasoning           jsonb  -- [{ type: 'red'|'green', title, text }]
  created_at          timestamptz
```

### 6.6 Connectors (MCP-basiert)

```
connector_accounts
  id                       uuid PK
  user_id                  uuid FK NOT NULL
  connector_type           text   -- 'gmail' | 'outlook' | 'imap' | 'icloud' | 'gmx' | …
  display_name             text   -- "Privat (kamal@gmail.com)" — set by user
  remote_account_id        text   -- e.g. Gmail address, Outlook email
  status                   enum('active','disconnected','token_expired','error')
  encrypted_credentials    bytea  -- envelope-encrypted refresh token + provider config
  capabilities             text[] -- ['search','read','attachments','draft']
  last_sync_at             timestamptz
  last_error               text
  created_at               timestamptz
  unique (user_id, connector_type, remote_account_id)

connector_tokens_dek
  user_id                  uuid PK FK
  encrypted_dek            bytea  -- DEK encrypted by master KEK
  created_at               timestamptz
```

**Zentrale Erkenntnis:** `connector_accounts` ist auf `(user_id, connector_type, remote_account_id)` **unique**. Damit kann jeder User N Konten pro Anbieter haben — z. B. drei Gmail-Adressen, zwei Outlook-Konten. Genau das, was du wolltest.

### 6.7 Doka KI-Chat

```
doka_conversations
  id                  uuid PK
  user_id             uuid FK NOT NULL
  title               text  -- auto-generated from first message
  created_at          timestamptz
  updated_at          timestamptz

doka_messages
  id                  uuid PK
  conversation_id     uuid FK CASCADE
  role                enum('user','assistant','tool')
  content             text   -- markdown
  attachments         jsonb  -- [{ kind: 'image'|'document', storage_key }]
  tool_calls          jsonb  -- when role=assistant: [{ name, args, result }]
  tokens_in           int
  tokens_out          int
  created_at          timestamptz
```

### 6.8 Push & Devices

```
push_devices
  id                  uuid PK
  user_id             uuid FK
  fcm_token           text NOT NULL UNIQUE
  platform            enum('ios','android','web')
  last_seen_at        timestamptz

scheduled_pushes
  id                  uuid PK
  user_id             uuid FK
  task_id             uuid FK SET NULL
  title               text
  body                text
  fire_at             timestamptz
  fired_at            timestamptz
  status              enum('scheduled','fired','cancelled','failed')
```

### 6.9 Support & Admin

```
admins
  user_id             uuid PK FK

feature_flags
  key                 text PK
  enabled             boolean
  updated_at          timestamptz
  -- managed via admin UI

support_tickets
  id                  uuid PK
  user_id             uuid FK
  subject             text
  status              enum('open','answered','closed')
  priority            enum('low','normal','high')
  created_at          timestamptz
  updated_at          timestamptz

ticket_messages
  id                  uuid PK
  ticket_id           uuid FK CASCADE
  sender              enum('user','admin')
  body                text
  attachment_key      text
  created_at          timestamptz

audit_log              -- security-relevant actions
  id                  uuid PK
  user_id             uuid
  actor_admin_id      uuid  -- nullable
  action              text  -- 'login','plan_change','admin_grant','token_refresh',…
  meta                jsonb
  ip                  inet
  user_agent          text
  created_at          timestamptz
```

### 6.10 Indexes (Pflicht)

```
CREATE INDEX ON documents (user_id, status);
CREATE INDEX ON documents (user_id, uploaded_at DESC);
CREATE INDEX ON doc_analysis (document_id);
CREATE INDEX ON doc_analysis (category, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX ON tasks (user_id, deadline) WHERE done = false;
CREATE INDEX ON tasks (notify_at) WHERE done = false AND notify_at IS NOT NULL;
CREATE INDEX ON connector_accounts (user_id, connector_type);
CREATE INDEX ON doka_messages (conversation_id, created_at);
CREATE INDEX ON push_devices (user_id);
CREATE INDEX ON audit_log (user_id, created_at DESC);
CREATE INDEX ON doc_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON doc_analysis USING gin (full_text gin_trgm_ops);
```

---

## 7. API-Vertrag

**Konvention:**
* JSON in/out, snake_case.
* Pflicht-Header `Authorization: Bearer <jwt>` außer `/healthz`, `/auth/*`, `/connectors/*/callback`.
* Fehler: `{ "error": { "code": "string", "message": "string", "details": {} } }` mit HTTP-Statuscode.
* Pagination: `?limit=20&cursor=...` mit `next_cursor` in Response.

### 7.1 Auth

* `POST /auth/oauth/start?provider=google&platform=android` → redirect URL
* `GET /auth/oauth/callback?provider=google&code=...&state=...` → 302 zu Frontend mit Token
* `POST /auth/sign-out` → Invalidate device

### 7.2 Profile & Subscription

* `GET /api/me` — Profil + Subscription + Usage
* `PATCH /api/me` — Profil-Update
* `DELETE /api/me` — Konto löschen (mit Confirmation-Code per E-Mail)
* `GET /api/me/subscription` — Plan, Limits, Reset-Date
* `POST /api/me/subscription/checkout` — Stripe Checkout Session
* `POST /api/me/subscription/cancel`
* `POST /api/me/subscription/reactivate`
* `POST /api/me/subscription/downgrade`

### 7.3 Dokumente

* `POST /api/documents` — Upload (multipart). Returns `{ id, status }`. Spawnt OCR+Analyse-Job.
* `POST /api/documents/batch` — Mehrere Dateien.
* `GET /api/documents?status=&category=&q=&limit=&cursor=` — Liste.
* `GET /api/documents/:id` — Detail inkl. Analyse.
* `GET /api/documents/:id/file` — Pre-signed URL zur Originaldatei.
* `GET /api/documents/:id/thumbnail` — Pre-signed URL.
* `GET /api/documents/:id/pages/:n/thumbnail` — Multi-Page-Vorschau.
* `PATCH /api/documents/:id` — Notizen, Tags, Status.
* `DELETE /api/documents/:id` — Inkl. R2-Cleanup.

### 7.4 Tasks-Extract

* `GET /api/documents/:id/extracted-tasks` — Was die KI extrahiert hat.
* `POST /api/documents/:id/extracted-tasks/commit` — Mehrfachauswahl mit Deadline + Notify übernehmen.

### 7.5 Tasks (Übersicht)

* `GET /api/tasks?filter=open|overdue|today|week`
* `POST /api/tasks` — Manuelle Task.
* `PATCH /api/tasks/:id` — Update.
* `POST /api/tasks/:id/done` — Erledigt-Markierung.
* `DELETE /api/tasks/:id`

### 7.6 Tools

* `POST /api/documents/:id/translate` `{ target_language }` → `{ translation_id }`
* `GET /api/translations/:id` — Ergebnis.
* `POST /api/documents/:id/reply` `{ topics[], instruction, tone, language }`
* `POST /api/documents/:id/befund` `{ language? }`
* `POST /api/documents/:id/rechtshilfe` `{ jurisdiction: 'AT'|'DE'|'CH', language? }`
* `POST /api/phishing/check` (multipart oder document_id) `{ }` → `{ check_id, risk_score, verdict, reasoning }`

### 7.7 Search

* `POST /api/search` `{ query, sources: ['documents','emails','tasks'], limit }` → ranked results

### 7.8 Connectors (Multi-Account-Email)

* `GET /api/connectors/available` — Liste verfügbarer Connector-Typen + Capabilities.
* `GET /api/connectors/accounts` — User's verbundene Konten.
* `POST /api/connectors/:type/oauth/start?display_name=...` → `{ url, state }`
* `GET /api/connectors/:type/oauth/callback?code=&state=` — Backend-Relay, schließt OAuth ab.
* `POST /api/connectors/imap/connect` `{ display_name, host, port, username, password }` — IMAP nicht via OAuth.
* `PATCH /api/connectors/accounts/:id` — Display-Name ändern.
* `DELETE /api/connectors/accounts/:id` — Konto trennen + Tokens löschen.
* `POST /api/connectors/accounts/:id/sync` — Manueller Sync.
* `GET /api/connectors/accounts/:id/health` — Status-Check.

### 7.9 Doka KI-Chat

* `POST /api/doka/conversations` — Neue Konversation.
* `GET /api/doka/conversations` — Liste.
* `GET /api/doka/conversations/:id` — Verlauf.
* `POST /api/doka/conversations/:id/message` (multipart, optional `file`) → SSE-Stream der Antwort. Server ruft MCP-Tools, streamt Token + Tool-Calls.
* `DELETE /api/doka/conversations/:id`

### 7.10 Push

* `POST /api/push/devices` — FCM-Token registrieren.
* `DELETE /api/push/devices/:token` — Abmelden.

### 7.11 Admin (RBAC: nur Admins)

* `GET /api/admin/users?q=`
* `POST /api/admin/users/:id/plan` — Plan ändern.
* `GET /api/admin/feature-flags`
* `POST /api/admin/feature-flags/:key`
* `GET /api/admin/finance/overview` — MRR/ARR/Churn.
* `GET /api/admin/tickets`

---

## 8. Backend-Aufbau (Verzeichnisstruktur)

```
backend/
├── pyproject.toml          # uv- oder Poetry-managed
├── alembic.ini
├── alembic/
│   └── versions/           # autogenerated migrations
├── kdoc/
│   ├── __init__.py
│   ├── main.py             # FastAPI app + lifespan
│   ├── settings.py         # pydantic-settings
│   ├── deps.py             # Depends() factories: get_current_user, get_db, get_redis
│   ├── auth/
│   │   ├── jwks.py         # PyJWKClient wrapper
│   │   └── routes.py       # /auth/*
│   ├── api/
│   │   ├── documents.py
│   │   ├── tasks.py
│   │   ├── tools.py        # translate/reply/befund/rechtshilfe/phishing
│   │   ├── search.py
│   │   ├── connectors.py
│   │   ├── doka.py
│   │   ├── subscription.py
│   │   ├── push.py
│   │   ├── admin.py
│   │   └── support.py
│   ├── db/
│   │   ├── session.py
│   │   ├── models/         # SQLAlchemy models, one file per aggregate
│   │   └── repositories/   # Data access, one per aggregate
│   ├── domain/
│   │   ├── analysis.py     # LLM analysis use case
│   │   ├── tasks.py
│   │   ├── doka.py         # MCP-orchestration, tool routing
│   │   ├── connectors/     # Connector framework
│   │   │   ├── base.py     # ConnectorAdapter abstract
│   │   │   ├── gmail.py
│   │   │   ├── outlook.py
│   │   │   ├── imap.py
│   │   │   └── registry.py # type → adapter mapping
│   │   ├── crypto.py       # Envelope encryption
│   │   └── rate_limit.py
│   ├── llm/
│   │   ├── client.py       # Anthropic SDK wrapper with timeouts
│   │   ├── prompts/        # Jinja templates
│   │   └── circuit.py      # Circuit-breaker
│   ├── workers/
│   │   ├── arq_app.py
│   │   ├── analysis.py     # OCR + LLM background job
│   │   ├── push.py         # FCM scheduled-push fire
│   │   └── connector_sync.py
│   └── observability.py    # Sentry + OTel setup
└── tests/
    ├── unit/
    ├── integration/        # uses pgtap-test-database
    └── e2e/
```

---

## 9. Frontend-Aufbau

```
frontend/
├── package.json
├── vite.config.ts
├── capacitor.config.ts
├── android/
├── ios/
├── public/
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx
    │   ├── routes.tsx
    │   ├── providers.tsx       # Theme, i18n, Auth, Subscription, FeatureFlags
    │   └── ErrorBoundary.tsx
    ├── design-system/
    │   ├── tokens.css          # CSS variables (Onyx & Amber)
    │   ├── typography.css
    │   ├── animations.css
    │   └── components/         # Button, Card, Chip, Sheet, Toast, …
    ├── features/
    │   ├── splash/
    │   │   ├── Splash.tsx
    │   │   └── Logomark.tsx    # SVG with chronograph orbits
    │   ├── home/
    │   │   ├── Home.tsx
    │   │   ├── SearchTrigger.tsx
    │   │   ├── TodayHero.tsx
    │   │   ├── ToolsRow.tsx
    │   │   └── DocStrip.tsx
    │   ├── documents/
    │   │   ├── DocumentsFolder.tsx     # kdoc-Dokumente
    │   │   ├── DocumentDetail.tsx
    │   │   ├── ActionGrid.tsx          # 6 actions
    │   │   └── PaperPreview.tsx
    │   ├── upload/
    │   │   ├── ScanScreen.tsx
    │   │   └── DocumentScanner.ts      # Capacitor ML Kit wrapper
    │   ├── tasks/
    │   │   ├── TasksList.tsx
    │   │   └── TasksExtract.tsx        # multi-select after upload
    │   ├── tools/
    │   │   ├── TranslateScreen.tsx
    │   │   ├── ReplyScreen.tsx
    │   │   ├── BefundScreen.tsx
    │   │   └── RechtshilfeScreen.tsx
    │   ├── phishing/
    │   │   ├── PhishingScreen.tsx
    │   │   └── PhishingMeter.tsx       # animated risk gauge
    │   ├── doka/
    │   │   ├── DokaChat.tsx
    │   │   ├── MessageBubble.tsx
    │   │   └── ToolCallCard.tsx
    │   ├── search/
    │   │   ├── SearchScreen.tsx
    │   │   └── SearchResults.tsx
    │   ├── connectors/
    │   │   ├── ConnectorsScreen.tsx
    │   │   ├── AddConnectorSheet.tsx   # multi-account flow
    │   │   └── ConnectorCard.tsx
    │   ├── profile/
    │   │   ├── ProfileScreen.tsx
    │   │   └── SubscriptionPanel.tsx
    │   └── auth/
    │       ├── LoginScreen.tsx
    │       └── RegisterScreen.tsx
    ├── lib/
    │   ├── api.ts              # Axios instance with auth-refresh
    │   ├── storage.ts          # Capacitor Preferences wrapper
    │   ├── push.ts             # FCM registration
    │   ├── haptics.ts
    │   ├── i18n.ts
    │   └── feature-flags.ts
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useSubscription.ts
    │   ├── useDocuments.ts
    │   ├── useDoka.ts          # SSE-streaming chat
    │   └── useConnectors.ts
    └── stores/
        ├── auth.store.ts
        ├── ui.store.ts
        └── doka.store.ts
```

**State-Konvention:**
* **Server-State** via Tanstack-Query (Caching, Background-Refetch, Mutation).
* **UI-State** (Theme, Drawer-open, Modal) via Zustand.
* **Form-State** lokal in Komponenten via React-Hook-Form.

---

## 10. Design-System

Quelle: [Click-Prototyp](Click-Prototyp/). Werte werden 1:1 übernommen.

### 10.1 Tokens

```css
/* Surfaces */
--bg: #0E0F12;
--bg-deep: #0A0B0E;
--surface: #16181D;
--surface-2: #1C1F26;
--surface-3: #242833;
--hairline: rgba(241, 236, 227, 0.07);
--hairline-2: rgba(241, 236, 227, 0.12);

/* Ink */
--ink: #F1ECE3;
--ink-2: #C9C3B6;
--ink-muted: #8E887C;
--ink-faint: #5A554C;

/* Accent (copper / amber) */
--amber: #E89A52;
--amber-soft: rgba(232, 154, 82, 0.14);
--amber-glow: rgba(232, 154, 82, 0.35);
--copper-grad: linear-gradient(135deg, #F6C58A 0%, #E89A52 50%, #B66B2C 100%);

/* Semantic */
--petrol: #6FA7B8;     /* Behörde */
--rose: #D87E78;       /* Befund / Warnings */
--success: #94B89A;
--danger: #E15F5F;
```

### 10.2 Pearl-Mode (Light)

Jeder Token muss in einer hellen Variante existieren. Standardvariante ist Onyx (dark).

### 10.3 Type-Scale

| Token | Größe | Schrift | Use-Case |
|---|---|---|---|
| `display` | 44 / 34 / 30 px | Instrument Serif | Editoriale Headlines |
| `title-sm` | 17 / 15 px | Inter 600 | Kartentitel |
| `body-lg` | 15 px | Inter 400 | Lede, AI-Output |
| `body` | 14 px | Inter 400 | Standard |
| `caption` | 12 / 11 px | Inter 500 | Meta, Sub-Labels |
| `kicker` | 11 px UPPER, letter-spacing 0.2em | Inter 500 | Sektion-Vorlauf |

### 10.4 Komponenten

Alle aus dem Prototyp dokumentiert:
* `Button` (primary, ghost, sm/md/lg)
* `Card` (hero, action, doc-tile, folder-tile, ai-card)
* `Chip` (default, muted, active, with-count)
* `Sheet` (modal, bottom-sheet)
* `IconButton` (ghost, light)
* `TaskItem` (with check, with chip)
* `MessageBubble` (ai, user, thinking, photo, structured)
* `Meter` (Phishing-Risk-Gauge, gradient + animated needle)
* `LangTile` (compact + standard variants)
* `Avatar` (round, mit copper grad + status dot)

### 10.5 Animationen

Codiert als CSS Custom Properties + `@keyframes`:

* **Splash-Choreographie:** Logo-Strokes + Chronograph-Orbits (siehe `Click-Prototyp/styles.css`).
* **FAB-Aura-Breathe:** 5,5 s ease-in-out infinite, opacity 0.22 ↔ 0.62, scale 1.00 ↔ 1.04.
* **Reveal-Stagger:** Standard-Pattern für jeden Screen. CSS Custom Property `--d` für Delay.
* **Hero-Pulse:** Heute-fällig-Indikator, 1,6 s.
* **Phishing-Meter:** Needle-Slide 1,6 s ease-out + Score-Counter via JS rAF.
* **Page-Transition:** Crossfade 0,36 s + 8 px Translate.

### 10.6 Motion-Reduce-Respekt

`@media (prefers-reduced-motion: reduce)` overridet alle Animationen auf 0,01 ms — bestätigt im Prototyp.

---

## 11. MCP-Architektur (Multi-Account-Connectors)

Dies ist der Schlüssel zu deiner Anforderung „mehrere Gmail-Konten verbinden".

### 11.1 Konzept

Ein **Connector** ist ein Datenkanal (Gmail, Outlook, IMAP, iCloud, GMX, etc.). Jeder Connector hat:

* Eine **Adapter-Klasse** im Backend (`backend/kdoc/domain/connectors/gmail.py`)
* Eine **MCP-Server-Implementierung**, die als Subprocess gestartet wird
* Definierte **Capabilities** (`search`, `read`, `attachments`, `draft`, `send`, `list_folders`)
* Standardisierte **Tools**, die Doka & Search aufrufen können

### 11.2 Multi-Account-Modell

```
User: kamal@kdoc.app
  ├─ Connector: gmail (display_name: "Privat")
  │   └─ MCP-Server-Instanz #1, credentials für kamal.privat@gmail.com
  ├─ Connector: gmail (display_name: "Arbeit")
  │   └─ MCP-Server-Instanz #2, credentials für kamal@kanzlei.at
  ├─ Connector: outlook (display_name: "Hauptmail")
  │   └─ MCP-Server-Instanz #3, credentials für …
  └─ Connector: imap (display_name: "GMX")
      └─ MCP-Server-Instanz #4, credentials für …
```

Die Tabelle `connector_accounts` hat `unique (user_id, connector_type, remote_account_id)` — also kannst du beliebig viele Konten *unterschiedlicher* Adressen pro Anbieter haben. Aber das gleiche Konto nicht doppelt.

### 11.3 MCP-Server-Lifecycle

* **Lazy Start:** MCP-Server wird erst gestartet, wenn Doka oder Search ihn anfragt.
* **Idle-Timeout:** Nach 10 min ohne Anfrage wird der Worker terminiert.
* **Sandbox:** Jeder Worker läuft als eigener Process (psutil-managed) mit RLIMIT_AS und RLIMIT_CPU.
* **Credentials:** Beim Start setzt das Backend die entschlüsselten Tokens in den Environment des Worker-Process. Worker hat keinen DB-Zugang.

### 11.4 Tool-Catalog (Beispiel Gmail)

```json
{
  "name": "gmail__search",
  "description": "Sucht E-Mails in einem verbundenen Gmail-Konto.",
  "input_schema": {
    "type": "object",
    "properties": {
      "account_id": { "type": "string" },
      "query":      { "type": "string" },
      "max":        { "type": "integer", "default": 20 }
    },
    "required": ["account_id", "query"]
  }
}
```

### 11.5 Flow: Doka durchsucht alle Gmail-Konten

```
1. User in Doka: "Hab ich eine Versicherung für Glasbruch?"
2. Backend ruft Claude mit System-Prompt + Tool-Catalog (alle MCP-Tools).
3. Claude entscheidet: "Ich brauche kdoc__search('Versicherung') und gmail__search(*, 'Versicherung')"
4. Backend dispatched Tool-Calls parallel an alle aktiven MCP-Server.
5. Tool-Results (JSON) zurück an Claude.
6. Claude synthetisiert Antwort + streamt zum Client.
```

### 11.6 Eingebaute MCP-Server

* `kdoc__search` — Volltext + Vector-Search über User's Dokumente.
* `kdoc__document` — Get-Document, Get-Page, Get-Analysis.
* `kdoc__tasks` — List, Create, Update Tasks.
* `kdoc__draft_letter` — Generiert Antwortbrief mit Profildaten.
* `gmail__*`, `outlook__*`, `imap__*` — pro Account.
* `web_search` (optional, Pro-Feature, kostet Tokens) — Externe Web-Suche für Versicherungsklauseln, Behördeninfos.

### 11.7 UI-Flow „Konto hinzufügen"

```
Profil → Verbundene Konten → "+ Konto hinzufügen"
  → Sheet zeigt 5 Anbieter-Tiles (Gmail, Outlook, GMX, iCloud, Yahoo, IMAP)
    → User wählt Gmail → Sheet fragt "Anzeigename" (z. B. "Arbeit")
      → Auto-redirect zu Gmail OAuth
        → Backend Callback verarbeitet, speichert encrypted credentials
          → Sheet schließt mit Toast "Verbunden"
            → Liste zeigt jetzt alle verbundenen Konten mit Anzeigename
```

Wenn der User noch ein zweites Gmail-Konto hinzufügt: gleicher Flow, anderer Anzeigename. Im Backend entsteht eine zweite `connector_accounts`-Zeile.

### 11.8 MCP-Konversation (für Claude)

Pro Doka-Message führt das Backend einen **Multi-Turn-Tool-Loop**:

1. System-Prompt (Doka-Persona) + User-Message + bisherige History → Claude
2. Wenn Claude Tools nutzt → Tools werden parallel im Backend ausgeführt → Tool-Results zurück → Claude
3. Loop bis Claude `stop_reason: "end_turn"` ausgibt
4. Final-Antwort wird gespeichert, gestreamt, Tool-Calls auch persistiert (für Audit + UI)

---

## 12. Feature-Spezifikationen

### 12.1 Splash & Intro (3,7 s)

Detail in `Click-Prototyp/styles.css`. Wird 1:1 in React-Komponente übernommen, mit `prefers-reduced-motion`-Override.

### 12.2 Dashboard

Aus dem Prototyp:
* Begrüßung mit Datum + Display-Headline
* Search-Trigger (großer Card-Button) mit rotierendem Placeholder
* Heute-fällig-Hero (eine Aufgabe, prominentester Inhalt)
* Aufgaben-Vorschau (max 3 Items, „Alle ansehen" → Tasks)
* Tools-Reihe (Phishing, Übersetzen, Befund, Rechtshilfe als Pills)
* kdoc-Dokumente-Strip (4 letzte Docs als horizontaler Carousel, „Alle ansehen" → Folder)

**Was im Prototyp NICHT war**, aber hier ergänzt wird: Das **Sectoren-Grid** kommt zurück als Quick-Action-Reihe NUR wenn der User keine Dokumente und keine Aufgaben hat (Empty-State). Ansonsten bleibt das Dashboard schlank.

### 12.3 kdoc-Dokumente Folder

* Grid-Ansicht mit echten Thumbnail-Previews aus R2 (pre-signed URLs).
* Filter-Chips: Alle / Rechnung / Behörde / Befund / Vertrag / Sonstiges.
* Sortier-Optionen: Datum, Name, Größe.
* Originalqualität verfügbar via Long-Press → „Original anzeigen" (öffnet Capacitor Browser oder native Vorschau).
* Volltext durchsuchbar — Search-Screen aggregiert.

### 12.4 Document Detail

Mit 6 Action-Cards im Grid:
1. **Aufgaben übernehmen** → Tasks-Extract
2. **Übersetzen** → 50 Sprachen
3. **Antwort schreiben**
4. **Befund erklären**
5. **Rechtshilfe**
6. **Phishing prüfen**

Plus AI-Summary, Facts (Absender, Datum, Betrag), Original-Vorschau.

### 12.5 Tasks-Extract

* Multi-Select-Liste mit Checkboxen.
* Pro Task:
  * Auto-Deadline aus Dokument (oder leer)
  * Editier-Tap auf Deadline → Date-Picker
  * Push-Glocke: bei Free locked, bei Basic 3-Tage-Vorlauf, bei Pro frei wählbar (1, 3, 7 Tage)
* Bottom-CTA „N Aufgaben übernehmen" → schreibt in `tasks` + `scheduled_pushes`.

### 12.6 Translate

* Quellsprache automatisch erkannt aus `documents.detected_language`.
* Zielsprache aus 50 Sprachen (Inter-Locales-Liste).
* Result-Screen zeigt Original + Übersetzung side-by-side (im Mobile: Tabs).
* Caching: pro `(document_id, target_language)` einmalig generiert.

### 12.7 Reply

* Pre-extracted Topics als Chip-Reihe (Multi-Select).
* Freitext-Anweisung an die KI.
* Tone-Picker: Formell / Freundlich / Bestimmt.
* Length-Picker: Kompakt / Standard / Ausführlich.
* Generate → Result-Screen mit Edit-Möglichkeit + „Per Mail senden" / „PDF speichern".

### 12.8 Befund

* Standard-Output in Dokumentsprache (3-Sektionen: Was untersucht, Was gefunden, Was es bedeutet).
* Sprachwechsel optional (50 Sprachen).
* PDF-Export.
* Wichtige Info: **Keine Diagnose**. Disclaimer prominent: „Kein Ersatz für ärztliches Gespräch."

### 12.9 Rechtshilfe

* Country-Picker: AT / DE / CH (Default = User's `profiles.land`).
* Score-Bar zeigt Konformitäts-Score (0–100) animiert.
* Anfechtbare Elemente als Liste mit Severity (warn/info/ok) + Begründung + Gesetzesreferenz.
* CTA: „Anfechtungs-Schreiben generieren" → erstellt Reply mit Rechtsbezug.
* Disclaimer: „Keine Rechtsberatung — nur Hinweise."

### 12.10 Phishing

* Eingang: Foto / Screenshot / PDF / forwarded Mail.
* Pipeline:
  1. OCR via Vision-LLM (falls Bild)
  2. Risiko-Analyse-Prompt mit definierten Heuristiken (Domain-Spoofing, Drucksprache, Linkanalyse, Anrede, etc.)
  3. Score 0–100 + Verdict + Reasoning
* UI: Animated Meter (rot ↔ grün), Score-Counter, Reasoning-Liste mit roten/grünen Flags.
* CTA: „Als Phishing melden" (öffnet `report-phishing@bsi.de` / österreichisches BMI etc., je nach Locale).

### 12.11 Doka KI-Chat

* Prompt-Vorschläge oben (verschwinden nach erster Message).
* Foto/Datei attachen über Plus-Button.
* Streaming-Antwort via SSE.
* Tool-Calls werden als „kdoc durchsucht 28 Dokumente …" angezeigt (Thinking-Bubble).
* Strukturierte Antworten via spezielle Markdown-Konvention oder Tool-Output-Cards.
* Conversation-History (letzte 30 Tage), Pro-Feature: unbegrenzt.

### 12.12 Search

* Trigger-Card auf Dashboard öffnet eigenes Screen.
* Live-Suche während Tippen (debounced 300 ms).
* Filter-Chips: Alle / Dokumente / E-Mails / Aufgaben / Notizen.
* Treffer-Highlighting mit `<mark>`.
* Quelle pro Treffer sichtbar (kdoc-Dokumente vs E-Mail xy@...).
* Recent-Searches gespeichert lokal (Capacitor Preferences).

### 12.13 Multi-Account-Email

Spezifiziert in Sektion 11. UI:
* `Profil → Verbundene Konten`
* Liste aller Connector-Accounts mit Status-Badge (active / token_expired / error).
* Add/Remove/Rename pro Konto.
* Verbinden mehrerer Konten gleichen Typs ist explizit unterstützt.

---

## 13. Native (Capacitor)

### 13.1 Konfiguration

```ts
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'at.kdoc.app',
  appName: 'kdoc',
  webDir: 'dist',
  ios:    { contentInset: 'automatic' },
  android:{ allowMixedContent: false, captureInput: true },
  plugins: {
    SplashScreen: {
      launchAutoHide: false  // we use our React-based splash
    },
    PushNotifications: {
      presentationOptions: ['badge','sound','alert']
    }
  }
};
```

### 13.2 Plugins

| Plugin | Zweck |
|---|---|
| `@capacitor/app` | Deep-Links, App-State |
| `@capacitor/preferences` | Theme/Locale-Storage (verschlüsselt) |
| `@capacitor/camera` | Kamera + Galerie |
| `@capacitor/filesystem` | PDF-Export, Cache |
| `@capacitor-mlkit/document-scanner` | Edge-Detection beim Scannen |
| `@capacitor-firebase/messaging` | FCM |
| `@capacitor/haptics` | Tap-Feedback |
| `@capacitor/browser` | OAuth-Flows in CustomTab/SFSafariViewController |

### 13.3 Deep-Links

```
at.kdoc.app://auth/callback?token=…
at.kdoc.app://connector/{type}/callback?account_id=…
at.kdoc.app://document/{id}
```

### 13.4 Build-Pipeline

* `npm run build` → Vite produziert `dist/`
* `npx cap sync` → kopiert nach iOS/Android
* iOS: `xcodebuild` über Fastlane
* Android: `./gradlew bundleRelease` → AAB → Play Console
* CI: GitHub Actions, Codesigning via App Store Connect API + Google Play Service Account

---

## 14. Push-Benachrichtigungen

### 14.1 Provider-Strategie

Firebase Cloud Messaging v1 (HTTP API) für iOS und Android. Ein einziger Server-Code-Pfad.

### 14.2 Devices

Bei App-Start: FCM-Token holen → POST `/api/push/devices`. Bei Logout: DELETE.

### 14.3 Scheduled Pushes (für Aufgaben-Erinnerungen)

* Worker `arq` läuft mit Cron-Job alle 60 s.
* SELECT alle `scheduled_pushes` mit `fire_at <= now()` und `status='scheduled'`.
* Pro Push: FCM v1 Send-Call.
* Bei Erfolg: `status='fired', fired_at=now()`.
* Bei Fail: Retry-Counter, max 3, dann `failed`.

### 14.4 Notification-Categories

| Category | Wer? | Wann? |
|---|---|---|
| `task_due` | Free, Basic, Pro | Pro Lead-Time vor `tasks.deadline` |
| `analysis_complete` | Alle | Nach OCR+Analyse-Job |
| `phishing_warning` | Alle | Nach hoch-risiko Phishing-Check |
| `subscription_renewed` | Alle | Stripe-Webhook |

### 14.5 Plan-Gating

* Free: nur `analysis_complete`, keine Task-Reminders.
* Basic: + Task-Reminders mit Lead-Time 3 Tage (fix).
* Pro: + Task-Reminders mit konfigurierbarer Lead-Time (1, 3, 7).

---

## 15. Subscription & Billing

### 15.1 Plan-Matrix

| Feature | Free | Basic | Pro |
|---|---|---|---|
| Dokumente / Monat | 10 | 100 | unbegrenzt |
| KI-Analysen / Monat | 10 | 100 | 1.000 |
| Übersetzungen / Monat | 5 | 50 | unbegrenzt |
| Befund / Monat | 2 | 20 | unbegrenzt |
| Rechtshilfe / Monat | 2 | 20 | unbegrenzt |
| Phishing-Checks / Monat | 5 | 50 | unbegrenzt |
| Doka-Messages / Monat | 30 | 300 | 3.000 |
| E-Mail-Konten | 1 | 3 | 10 |
| Push-Erinnerungen | nein | ja, 3 d fix | ja, frei wählbar |
| Doka mit Web-Search | nein | nein | ja |
| Lokales LLM (zukünftig) | nein | nein | ja |

**Neu vs. heute:** Doka-Messages und Phishing-Checks als Limitfaktor; Multi-Account-Email als Plan-Differenzierung.

### 15.2 Preise (Vorschlag)

* Free — €0
* Basic — €4,90 / Monat oder €49 / Jahr
* Pro — €9,90 / Monat oder €99 / Jahr

### 15.3 Stripe-Integration

* Eine Subscription-Stripe-API.
* Pro Plan zwei Preise (monthly / yearly).
* Webhook-Events:
  * `checkout.session.completed` → Plan aktivieren
  * `customer.subscription.updated` → Plan-Wechsel synchronisieren
  * `customer.subscription.deleted` → Auf Free zurück
  * `invoice.payment_failed` → User benachrichtigen, Grace-Period 7 d
* Webhook-Secret ist Pflicht (siehe 5.5).

### 15.4 Counter-Reset-Logik

* Reset alle 30 d ab `usage_counters.registration_date`, nicht Kalendermonat.
* Verwendet Postgres-Transaction mit `SELECT ... FOR UPDATE` um Race-Condition zu vermeiden.

---

## 16. Observability & Operations

### 16.1 Errors

* **Sentry** für Backend (Python SDK) und Frontend (React SDK).
* PII-Filter: User-IDs OK, E-Mail-Inhalte/Tokens NICHT.

### 16.2 Tracing

* OpenTelemetry-Instrumentierung im FastAPI.
* Export zu Grafana Tempo (selbstgehostet) oder Honeycomb.

### 16.3 Metriken

* Prometheus-Endpoint `/metrics` (intern, nicht öffentlich).
* Wichtige Metriken:
  * `kdoc_uploads_total{plan}`
  * `kdoc_analysis_duration_seconds`
  * `kdoc_llm_tokens_total{model,task}`
  * `kdoc_doka_messages_total{plan}`
  * `kdoc_connector_sync_errors_total{type}`

### 16.4 Logs

* Structured-JSON via `structlog`.
* Log-Level pro Env (DEBUG dev, INFO prod).
* Aggregation: Loki oder Datadog.

### 16.5 Health-Checks

* `/healthz` — DB-Ping, Redis-Ping, S3-Ping. Returns 200 nur wenn alle gesund.
* Capacitor-App pingt vor jedem Login.

---

## 17. Testing-Strategie

### 17.1 Backend

| Layer | Test-Typ | Tool |
|---|---|---|
| Pure functions / domain | Unit | pytest |
| Repositories | Integration mit echter DB | pytest + testcontainers-postgres |
| API-Endpunkte | E2E gegen lokalen Stack | pytest + httpx |
| LLM-Prompts | Snapshot-Test mit fixierten Outputs | pytest + syrupy |
| Connectors | Mock-Provider mit responses-lib | pytest |

### 17.2 Frontend

| Layer | Test-Typ | Tool |
|---|---|---|
| Komponenten | Snapshot + Interaction | Vitest + Testing-Library |
| Stores | Unit | Vitest |
| Flows | E2E | Playwright (mobile-emulation) |

### 17.3 Coverage-Ziele

* Backend Domain-Layer: ≥ 80 %
* Backend API-Layer: ≥ 60 %
* Frontend Critical-Paths (Auth, Upload, Tasks): E2E grün

---

## 18. Deployment

### 18.1 Umgebungen

* `local` — Docker-Compose (Postgres, Redis, MinIO als R2-Stand-in, Backend, Frontend-Dev)
* `staging` — auf Fly.io oder Render, eigene DB-Instanz, kdoc-staging.at
* `prod` — Fly.io Multi-Region (Frankfurt + Dublin), kdoc.at

### 18.2 Secrets

* `.env.example` im Repo, echte `.env` niemals.
* Secrets in Fly.io / Render Secret-Storage.
* Rotation-Plan: Mistral/Anthropic-Keys quartärlich, JWT-Keys wenn Supabase rotiert.

### 18.3 CI

* GitHub Actions Workflow:
  * Lint (ruff + eslint)
  * Type-check (mypy + tsc)
  * Test (pytest + vitest)
  * Build (Docker für Backend, Vite für Frontend)
  * Auf `main`-Push: Auto-Deploy zu Staging
  * Auf Tag `v*`: Manueller Approval → Prod-Deploy

### 18.4 Migrations

* Alembic-Migration wird beim Deploy automatisch via Pre-Deploy-Hook ausgeführt.
* Rollback-Strategie: jede Migration muss `downgrade()` definieren.

### 18.5 Datenbank-Backups

* Supabase Postgres Point-in-Time-Recovery 7 d.
* Tägliche Logical-Backup nach R2 (verschlüsselt), 90 d Retention.

---

## 19. Migration vom alten System

### 19.1 Daten-Migration

Wir entscheiden uns gegen Big-Bang-Cutover. Stattdessen Coexistence-Phase:

1. Neues Backend kdoc-API V2 wird *parallel* zum alten deployed (`api-v2.kdoc.at`).
2. Migrations-Script liest alte SQLite-DB → Postgres:
   * Profile via Supabase Auth bereits dort
   * Documents inkl. Original-Files nach R2 kopieren
   * Subscriptions 1:1
   * E-Mail-Connector-Tokens werden NICHT migriert (User muss neu verbinden für Backend-Encryption)
3. Frontend V2 wird als Kanary-Release in TestFlight / Internal-Testing deployed.
4. Beta-User testen 4 Wochen.
5. Prod-Cutover an Stichtag, alte Codebase wird `legacy/` archiviert.

### 19.2 Was nicht migriert wird

* `documents.notizen` (selten genutzt → User-Hinweis bei erstem Login)
* `mistral_usage` (nur Telemetrie)
* Support-Tickets älter als 30 d (geschlossen lassen)

### 19.3 User-Kommunikation

* In-App-Banner 7 d vor Cutover: „kdoc bekommt ein Update. Verbinde deine E-Mail-Konten neu."
* E-Mail an alle aktiven User mit Migrations-Anleitung.

---

## 20. Phasen-Roadmap

Geschätzt: ~14 Wochen mit einem Entwickler in Vollzeit. Bei Multi-Person-Team entsprechend kürzer.

### Phase 0 — Foundation (Woche 1)

* Repo-Setup (Monorepo: `backend/`, `frontend/`, `mcp-servers/`).
* Postgres + Redis + R2 lokal via Docker-Compose.
* CI-Pipeline.
* Sentry + OTel hello-world.

### Phase 1 — Core Backend (Woche 2–3)

* Auth (JWKS only).
* DB-Schema (Alembic).
* Profile + Subscription + Stripe-Webhook.
* Document-Upload + R2-Integration.
* OCR + Analyse-Pipeline (Arq-Worker).
* Rate-Limiting.
* Tests.

### Phase 2 — Core Frontend (Woche 4–5)

* Vite + Capacitor-Setup, Native-Builds funktionieren.
* Splash + Login + Home + Document-Detail (mit Prototyp-Design).
* Upload-Flow inkl. ML Kit Scanner.
* Tasks-Liste + Tasks-Extract.
* i18n-Setup.

### Phase 3 — Tools (Woche 6–7)

* Translate, Reply, Befund, Rechtshilfe-Backend-Endpunkte + LLM-Prompts.
* Frontend-Screens.
* Phishing-Backend + Frontend-Meter.

### Phase 4 — Connectors & Doka (Woche 8–10)

* Connector-Framework + Gmail-Adapter + Outlook-Adapter + IMAP-Adapter.
* MCP-Subprocess-Runtime.
* Multi-Account-UI.
* Doka-Backend mit Tool-Loop, SSE-Streaming.
* Doka-Frontend mit Bubbles, Photo-Attach, Tool-Cards.

### Phase 5 — Search (Woche 11)

* Postgres FTS + pgvector für Dokumente.
* Aggregator über Connector-MCPs.
* Frontend-Search-Screen.

### Phase 6 — Push & Reminders (Woche 12)

* FCM-Setup, Devices, Scheduled-Pushes-Worker.
* Frontend-Push-Permission-Flow.
* Plan-Gating.

### Phase 7 — Polish & Migration (Woche 13–14)

* Pearl-Mode (Light-Theme).
* PWA-Optimierung (Service-Worker, Install-Prompt).
* Migrations-Script & Beta-Test.
* Performance-Tuning.
* Documentation.

---

## 21. Offene Entscheidungen

Vor Implementierung sollten diese Punkte geklärt werden:

| # | Frage | Empfehlung | Wer entscheidet |
|---|---|---|---|
| 1 | LLM-Provider primär: Anthropic Claude oder Mistral? | Claude für Qualität, Mistral als Fallback. | Du, basierend auf Cost-Test. |
| 2 | Object-Storage: Cloudflare R2 oder AWS S3? | R2 wegen Zero-Egress-Cost. | Du. |
| 3 | Hosting: Fly.io oder Render? | Fly.io wegen Multi-Region + nähe DB. | Du. |
| 4 | Soll iOS in V1 dabei sein, oder erst Android? | Android first (existierender Stack), iOS nach 4 Wochen. | Du. |
| 5 | Lokales LLM wirklich als Pro-Feature in V1? | NEIN — verschieben auf v1.5 oder v2. | Empfehlung: verschieben. |
| 6 | Apple-Sign-In (App-Store-Pflicht)? | Ja, zum App-Launch nötig. | Du, sobald iOS-Phase. |
| 7 | DSGVO-Datenschutzerklärung | Vor Launch reviewen lassen (Anwalt). | Externe Beratung. |
| 8 | Behörden-Rechtshilfe: Datenquellen für AT/CH-Rechtsbezüge? | RIS.bka.gv.at + admin.ch APIs prüfen. | Recherche-Aufgabe. |
| 9 | Phishing-Heuristik: eigenes Prompt oder externes Tool wie URLscan? | Prompt-only in V1, URLscan-Integration v1.5. | Du. |
| 10 | Marketing-Site: Teil dieses Repos oder separat? | Separat (kdoc.at Landing in eigenem Repo). | Du. |

---

## 22. Anhang: Konkrete LLM-Prompts (Stub)

### 22.1 Document-Analyse

```
System: Du bist die Dokumenten-KI von kdoc. Extrahiere strukturierte Daten
aus dem Bild oder Text des Briefs. Antworte ausschließlich als JSON nach
folgendem Schema: …

User: <image: page 1>
```

Schema (Pydantic-validiert):

```json
{
  "language": "de",
  "category": "rechnung|brief|behoerde|befund|vertrag|lohnzettel|sonstiges",
  "sender": "string",
  "recipient": "string",
  "document_date": "YYYY-MM-DD|null",
  "amount": "number|null",
  "currency": "EUR|CHF|...|null",
  "due_date": "YYYY-MM-DD|null",
  "iban": "string|null",
  "has_action": true,
  "action_summary": "string",
  "ai_summary": "string",
  "full_text": "string",
  "contact_email": "string|null",
  "contact_phone": "string|null",
  "expense_category": "string|null",
  "extracted_tasks": [
    { "title": "string", "deadline": "YYYY-MM-DD|null", "description": "string" }
  ]
}
```

### 22.2 Phishing-Check

```
System: Du bist ein Sicherheits-Analyst. Bewerte das angegebene Dokument
auf Phishing-Indikatoren. Berücksichtige:
- Domain-Spoofing (Absender vs. echte Bank-Domain)
- Druckaufbau (Fristen, Drohungen)
- Link-Analyse (Shortener, fremde Domains)
- Anrede (persönlich vs. generisch)
- Grammatik / Tippfehler
- Inkonsistenz (Logo vs. Absender)

Gib einen Score 0-100 zurück (0=Phishing, 100=sicher) und liste
Indikatoren als Array, jeweils mit type 'red' oder 'green'.

Antwort als JSON: { "risk_score": int, "verdict": "...", "reasoning": [...] }
```

### 22.3 Doka System-Prompt

```
Du bist Doka, der KI-Begleiter von kdoc. Du hilfst dem User, seine
Dokumente und E-Mails zu durchsuchen und zu verstehen.

Regeln:
- Beantworte präzise auf Basis der vorhandenen Tools.
- Wenn Information fehlt, frag nach oder schlag eine Aktion vor.
- Wenn es um Versicherung/Vertrag/Behörde geht, biete an, ein Schreiben
  zu generieren.
- Verwende Markdown für Listen und Hervorhebungen.
- Zitiere immer das Quelldokument (Absender + Datum) bei Antworten,
  die auf Dokumenten basieren.

Verfügbare Tools: {tool_catalog}
```

---

## 23. Anhang: Definition-of-Done pro Feature

Jedes Feature gilt als „done", wenn:

* [ ] Backend-Endpoint mit Pydantic-Schema dokumentiert in OpenAPI.
* [ ] DB-Migration mit `upgrade()` und `downgrade()`.
* [ ] Unit-Test für Domain-Logik.
* [ ] Integration-Test für API.
* [ ] Frontend-Screen mit Reveal-Animationen.
* [ ] i18n-Strings für mind. de + en.
* [ ] Plan-Limit-Check, falls relevant.
* [ ] Sentry-Breadcrumbs in kritischen Pfaden.
* [ ] Manueller Test auf Android + Browser.
* [ ] Eintrag in CHANGELOG.md.

---

## 24. Referenzen

* Click-Prototyp (Design-Quellcode): [Click-Prototyp/](Click-Prototyp/)
* Design-Notizen: [Click-Prototyp/README.md](Click-Prototyp/README.md)
* Bestehende Codebase: [backend/](backend/), [frontend/](frontend/) (als Spec, nicht als Vorlage)
* Anthropic MCP Spec: https://modelcontextprotocol.io
* Capacitor 7 Docs: https://capacitorjs.com
* FastAPI Async Best-Practices: https://fastapi.tiangolo.com/async
* Stripe Subscriptions: https://stripe.com/docs/billing/subscriptions/overview

---

**Ende des Plans.** Bei Fragen oder Änderungswünschen: an Sektion 21 erweitern, dann implementieren.
