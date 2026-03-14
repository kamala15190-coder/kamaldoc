import aiosqlite
import os
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DATA_DIR / "documents.db"

async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db

async def init_db():
    os.makedirs(DATA_DIR / "originals", exist_ok=True)
    os.makedirs(DATA_DIR / "thumbnails", exist_ok=True)

    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dateiname TEXT NOT NULL,
                originalpfad TEXT NOT NULL,
                thumbnailpfad TEXT,
                dateityp TEXT NOT NULL,
                hochgeladen_am TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                status TEXT NOT NULL DEFAULT 'analyse_laeuft',
                -- LLM-extrahierte Felder
                kategorie TEXT,
                absender TEXT,
                empfaenger TEXT,
                datum TEXT,
                betrag REAL,
                faelligkeitsdatum TEXT,
                handlung_erforderlich INTEGER DEFAULT 0,
                handlung_beschreibung TEXT,
                handlung_erledigt INTEGER DEFAULT 0,
                erledigt_am TEXT,
                zusammenfassung TEXT,
                volltext TEXT,
                kontakt_name TEXT,
                kontakt_adresse TEXT,
                kontakt_email TEXT,
                kontakt_telefon TEXT,
                -- Benutzer-Felder
                notizen TEXT,
                tags TEXT,
                analyse_fehler TEXT
            );

            CREATE TABLE IF NOT EXISTS antworten (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                inhalt TEXT NOT NULL,
                erstellt_am TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS einstellungen (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        """)
        await db.commit()

        # Migration: erledigt_am Spalte hinzufügen falls noch nicht vorhanden
        try:
            await db.execute("ALTER TABLE documents ADD COLUMN erledigt_am TEXT")
            await db.commit()
        except Exception:
            pass  # Spalte existiert bereits
    finally:
        await db.close()
