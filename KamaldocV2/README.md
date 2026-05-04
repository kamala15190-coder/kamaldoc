# kdoc V2

Mobile-first dokumentenmanagement mit Mistral-AI, gebaut nach dem [Implementierungsplan](../implementierungsplan.md) und den [getroffenen Entscheidungen](decisions.md).

## Lokal starten

### Frontend (für Design-Preview im Browser)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Backend (FastAPI + SQLite)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate     # macOS/Linux
# .venv\Scripts\activate      # Windows
pip install -e .
cp .env.example .env
# .env bearbeiten — vor allem MISTRAL_API_KEY setzen
uvicorn kdoc.main:app --reload --port 8000
# → http://localhost:8000/docs
```

Das Frontend redet via Vite-Proxy mit dem Backend; ohne Backend laufen die Screens trotzdem mit Mock-Daten.

## Produktion (Hetzner)

```bash
# Hetzner-Server: Docker + docker-compose installiert
git clone … KamaldocV2
cd KamaldocV2
cp backend/.env.example .env.production
# .env.production befüllen
docker compose --env-file .env.production up -d
```

Reverse-Proxy (z. B. Caddy) terminiert TLS und leitet `:443 → backend:8000`.

## Mobile (Capacitor)

```bash
cd frontend
npm run build
npx cap add android   # einmalig
npx cap add ios       # einmalig (macOS)
npx cap sync
npx cap open android  # Android Studio
npx cap open ios      # Xcode
```

## Verzeichnisse

```
KamaldocV2/
├── backend/                # FastAPI + SQLAlchemy + Mistral
│   ├── kdoc/
│   │   ├── main.py
│   │   ├── settings.py
│   │   ├── auth/jwks.py    # Supabase JWKS, kein HS256
│   │   ├── api/            # Routen
│   │   ├── db/             # Models + Session
│   │   ├── llm/            # Mistral-Client + Prompts
│   │   └── workers/        # Background-Jobs (Arq)
│   └── pyproject.toml
├── frontend/               # Vite + React + Tailwind-Tokens
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/          # Alle Screens aus dem Prototyp
│   │   ├── components/     # Wiederverwendbar
│   │   ├── lib/            # api.js, mock.js
│   │   └── styles.css      # Onyx-&-Amber-Design-System
│   └── capacitor.config.json
├── docker-compose.yml
├── decisions.md
└── todos.md
```
