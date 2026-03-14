# KamalDoc – Lokales Dokumenten-Management-System

KamalDoc ist ein vollständig lokales Dokumenten-Management-System, das eingehende Post (Briefe, Rechnungen, Verträge etc.) digitalisiert und mittels eines lokalen LLM (LM Studio) automatisch analysiert und kategorisiert.

---

## Zusammenfassung für Laien

### Was macht KamalDoc?

Stell dir vor, du bekommst jeden Tag Post: Rechnungen, Briefe vom Amt, Verträge, Lohnzettel. Normalerweise landen die in einem Ordner oder Schuhkarton und du verlierst den Überblick.

**KamalDoc löst genau dieses Problem.** Du fotografierst einfach deinen Brief (oder legst ein Bild/PDF ab) und die App erledigt den Rest:

1. **Du fotografierst den Brief** – mit dem Handy oder am PC per Dateiauswahl
2. **Die KI liest den Brief** – eine künstliche Intelligenz, die komplett auf deinem eigenen Computer läuft (nicht in der Cloud!), liest den Text, erkennt wer den Brief geschickt hat, ob es eine Rechnung ist, welcher Betrag fällig ist, und ob du etwas tun musst
3. **Du siehst alles auf einen Blick** – auf dem Dashboard siehst du offene Aufgaben (z.B. „Rechnung bezahlen bis 15.04."), kannst sie als erledigt markieren, und sie wandern ins Archiv
4. **Antwortbriefe werden automatisch geschrieben** – wenn du auf einen Brief antworten musst, klickst du einen Knopf und die KI schreibt dir einen höflichen Antwortbrief mit deinen Absenderdaten
5. **Alles bleibt auf deinem Computer** – keine Daten gehen ins Internet. Deine Post bleibt privat

**Kurz gesagt:** KamalDoc ist wie ein digitaler Sekretär für deine Papierpost – komplett privat, komplett auf deinem Rechner.

### Die Seiten der App

- **Dashboard** – Übersicht: offene Aufgaben, Statistiken, alle Dokumente durchsuchbar
- **Hochladen** – Foto machen oder Datei auswählen, wird sofort analysiert
- **Dokumentdetails** – Alle Infos zu einem Brief, „Erledigt"-Button, Antwort generieren
- **Archiv** – Alle erledigten Aufgaben, können wieder geöffnet werden
- **Einstellungen** – Deine Absenderdaten (Name, Adresse etc.) für Antwortbriefe

### Was braucht man dafür?

- Einen einigermaßen modernen Computer (Windows)
- Die kostenlose Software „LM Studio" (lädt die KI herunter)
- Ca. 8-16 GB RAM je nach KI-Modell
- Doppelklick auf `start.bat` – fertig

---

## Technische Zusammenfassung

### Architektur

KamalDoc ist eine klassische Client-Server-Anwendung, die vollständig lokal betrieben wird:

```
[Browser/Handy]  ←HTTP→  [React-Frontend :5173]  ←Proxy→  [FastAPI-Backend :8000]  ←HTTP→  [LM Studio :1234]
                                                                    ↕
                                                              [SQLite DB]
                                                              [Dateisystem]
```

### Backend (Python/FastAPI)

- **Framework:** FastAPI mit asynchronen Routen (`async/await`)
- **Datenbank:** SQLite via `aiosqlite` (asynchroner Zugriff), WAL-Modus für Performance
- **Datei-Verarbeitung:** Hochgeladene Dateien (JPG/PNG/PDF) werden im Dateisystem gespeichert. PDFs werden via `PyMuPDF (fitz)` in Bilder konvertiert. Thumbnails werden mit `Pillow` generiert
- **LLM-Integration:** Vision-API-Aufrufe an LM Studio (`/v1/chat/completions`) mit Base64-kodierten Bildern. Verwendet `gemma-3-12b-it` als Vision-Modell
- **Analyse-Pipeline:** Upload → DB-Eintrag → `asyncio.create_task()` startet Hintergrund-Analyse → LLM extrahiert strukturierte Daten (Kategorie, Absender, Betrag, Fälligkeit, Handlungsbedarf, Volltext etc.) als JSON → DB-Update
- **Antwortgenerierung:** Lädt Dokumentdaten + Benutzer-Einstellungen (Absenderdaten) → baut Prompt zusammen → LLM generiert Antwortbrief → wird in `antworten`-Tabelle gespeichert
- **Datenmodell:**
  - `documents` – 25+ Spalten inkl. LLM-extrahierter Felder, `handlung_erledigt`, `erledigt_am` Timestamp
  - `antworten` – Generierte Antwortbriefe pro Dokument
  - `einstellungen` – Key-Value-Store für Benutzer-Absenderdaten
- **API-Design:** RESTful mit GET/POST/PATCH/DELETE. Filter-Parameter für Dokumentliste (`handlung_offen`, `archiv`, `kategorie`, `search`)

### Frontend (React/Vite/TailwindCSS)

- **Framework:** React 18 mit React Router v6 (Client-Side-Routing)
- **Build-Tool:** Vite mit Proxy-Konfiguration (`/api` → `localhost:8000`)
- **Styling:** Tailwind CSS v4 mit benutzerdefinierten Animationen (`fadeInUp`)
- **HTTP-Client:** Axios mit zentraler API-Instanz (`api.js`)
- **Seiten:**
  - `Dashboard.jsx` – Todo-Tabelle (Desktop) / Cards (Mobile), Statistik-Grid, Dokumenten-Grid mit Suche/Filter
  - `DocumentDetail.jsx` – Dokumentansicht mit Bild, extrahierten Daten, Erledigt-Markierung (animiert), Notizen/Tags, Antwortgenerierung für alle Kategorien
  - `UploadPage.jsx` – Mobile-optimiert mit nativen `addEventListener('change')` statt React-`onChange` für zuverlässige Kamera/Galerie-Auswahl auf Android. Separate Input-Elemente für Kamera (`capture="environment"`) und Galerie
  - `Archiv.jsx` – Erledigte Aufgaben mit „Wieder öffnen"-Funktion, Fade-Out-Animation
  - `Einstellungen.jsx` – Formular für Absenderdaten (Name, Adresse, PLZ/Ort, E-Mail, Telefon)
- **Mobile-Redesign:**
  - Hamburger-Menü (≤768px) mit Slide-In-Drawer von links
  - Responsive Breakpoints: Cards auf Mobile, Tabellen auf Desktop
  - Touch-Targets mindestens 44px, 16px Font-Minimum auf Mobile
  - `overflow-x: hidden` auf Root-Elementen gegen horizontalen Scroll
  - Body-Scroll-Lock wenn Drawer offen
- **Statusmanagement:** Lokaler React-State mit `useState`/`useEffect`, kein globaler Store nötig
- **Polling:** Dokumentdetail-Seite pollt alle 3s wenn Analyse läuft, stoppt automatisch bei Abschluss

### Besondere technische Entscheidungen

| Thema | Entscheidung | Begründung |
|-------|-------------|------------|
| LLM | Lokaler LM Studio Server | 100% Privatsphäre, keine API-Kosten, kein Internet nötig |
| Datenbank | SQLite statt PostgreSQL | Kein DB-Server nötig, eine Datei, perfekt für Einzelbenutzer |
| Upload Mobile | Native `addEventListener` statt React `onChange` | React-`onChange` feuert auf Android/WebView nicht zuverlässig beim ersten Kamera-Foto |
| File Inputs | Immer gerendert, außerhalb von Conditionals | Refs bleiben stabil, Input-Reset funktioniert zuverlässig |
| Analyse | `asyncio.create_task()` im Hintergrund | Upload kehrt sofort zurück, Frontend pollt Status |
| Absenderdaten | Key-Value-Tabelle statt fixem Schema | Einfach erweiterbar um neue Felder |
| Antworten | Für alle Kategorien, nicht nur Briefe | Auch auf Rechnungen/Behördenschreiben muss man manchmal antworten |

### API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | /api/upload | Dokument hochladen |
| GET | /api/documents | Dokumentenliste (Filter: search, kategorie, handlung_offen, archiv) |
| GET | /api/documents/:id | Einzeldokument |
| GET | /api/documents/:id/file | Originaldatei |
| GET | /api/documents/:id/thumbnail | Vorschaubild |
| PATCH | /api/documents/:id | Dokument aktualisieren (Status, Notizen, Erledigt, Tags) |
| DELETE | /api/documents/:id | Dokument löschen (inkl. Dateien) |
| POST | /api/documents/:id/reply | Antwortbrief generieren (mit Absenderdaten aus Einstellungen) |
| GET | /api/documents/:id/replies | Gespeicherte Antworten |
| GET | /api/einstellungen | Benutzer-Einstellungen laden |
| PUT | /api/einstellungen | Benutzer-Einstellungen speichern |
| GET | /api/status | Systemstatus (Backend + LM Studio Verbindung) |

### Technologie-Stack

- **Backend:** Python 3.11, FastAPI, aiosqlite, PyMuPDF, Pillow, httpx
- **Frontend:** React 18, Vite, Tailwind CSS v4, React Router v6, Axios, Lucide Icons
- **KI/LLM:** LM Studio (lokal), gemma-3-12b-it (Vision-Modell für Bildanalyse + Textgenerierung)
- **Datenbank:** SQLite (WAL-Modus)

---

## Voraussetzungen

- **Python 3.10+** (https://www.python.org/)
- **Node.js 18+** (https://nodejs.org/)
- **LM Studio** (https://lmstudio.ai/)

## Installation

### 1. Python-Abhängigkeiten installieren

```bash
cd backend
pip install -r requirements.txt
```

### 2. Node-Abhängigkeiten installieren

```bash
cd frontend
npm install
```

### 3. LM Studio einrichten

1. LM Studio herunterladen und installieren: https://lmstudio.ai/
2. Das Modell **gemma-3-12b-it** herunterladen (unter „Discover" suchen)
3. Das Modell laden (unter „Chat" oder „Developer")
4. Den lokalen API-Server starten:
   - Gehe zu **Developer** (links in der Seitenleiste)
   - Klicke auf **Start Server**
   - Der Server läuft standardmäßig auf `http://localhost:1234`
   - Stelle sicher, dass das gemma-3-12b-it Modell geladen ist

### 4. System starten

Einfach die Datei `start.bat` doppelklicken, oder manuell:

**Backend starten:**
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend starten:**
```bash
cd frontend
npm run dev
```

Dann im Browser öffnen: http://localhost:5173

## Projektstruktur

```
KamalDoc/
├── backend/              # FastAPI-Backend
│   ├── main.py           # API-Routen (Upload, CRUD, Antworten, Einstellungen)
│   ├── database.py       # SQLite-Schema, Migrationen, Verbindung
│   ├── llm_service.py    # LLM-Analyse (Vision) & Antwortgenerierung
│   └── requirements.txt
├── frontend/             # React + Vite + Tailwind CSS
│   └── src/
│       ├── App.jsx       # Routing, Navigation, Hamburger-Menü
│       ├── api.js        # Axios API-Client
│       ├── config.js     # API-URL Konfiguration
│       └── pages/
│           ├── Dashboard.jsx       # Übersicht, Todos, Statistiken
│           ├── DocumentDetail.jsx  # Dokumentansicht, Erledigt, Antworten
│           ├── UploadPage.jsx      # Upload (Kamera/Galerie/Drag&Drop)
│           ├── Archiv.jsx          # Erledigte Aufgaben
│           └── Einstellungen.jsx   # Absenderdaten
├── data/
│   ├── originals/        # Hochgeladene Originaldateien
│   ├── thumbnails/       # Vorschaubilder
│   └── documents.db      # SQLite-Datenbank
├── start.bat             # Startet alles mit Doppelklick
└── README.md
```
