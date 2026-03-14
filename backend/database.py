import aiosqlite
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

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
                user_id TEXT NOT NULL DEFAULT '',
                dateiname TEXT NOT NULL,
                originalpfad TEXT NOT NULL,
                thumbnailpfad TEXT,
                dateityp TEXT NOT NULL,
                hochgeladen_am TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                status TEXT NOT NULL DEFAULT 'analyse_laeuft',
                -- Dokument-Typ: standard, behoerde, befund
                doc_type TEXT NOT NULL DEFAULT 'standard',
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
                -- Deadline-Wächter
                deadline TEXT,
                deadline_notified INTEGER DEFAULT 0,
                -- Ausgaben-Kategorie (für Rechnungen)
                expense_category TEXT,
                -- Behörden-/Befund-Assistent
                erklaerung TEXT,
                vereinfacht TEXT,
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

            CREATE TABLE IF NOT EXISTS user_einstellungen (
                user_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                PRIMARY KEY (user_id, key)
            );

            CREATE TABLE IF NOT EXISTS push_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                platform TEXT DEFAULT 'android',
                created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS befund_translations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                target_language TEXT NOT NULL,
                translated_text TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS subscriptions (
                user_id TEXT PRIMARY KEY,
                plan TEXT DEFAULT 'free',
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT,
                started_at TEXT,
                expires_at TEXT,
                cancelled_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS usage_counters (
                user_id TEXT PRIMARY KEY,
                documents_total INTEGER DEFAULT 0,
                ki_analyses_total INTEGER DEFAULT 0,
                behoerden_month INTEGER DEFAULT 0,
                befund_month INTEGER DEFAULT 0,
                last_reset TEXT
            );
        """)
        await db.commit()

        # Migrations: Spalten hinzufügen falls noch nicht vorhanden
        migrations = [
            "ALTER TABLE documents ADD COLUMN erledigt_am TEXT",
            "ALTER TABLE documents ADD COLUMN doc_type TEXT NOT NULL DEFAULT 'standard'",
            "ALTER TABLE documents ADD COLUMN deadline TEXT",
            "ALTER TABLE documents ADD COLUMN deadline_notified INTEGER DEFAULT 0",
            "ALTER TABLE documents ADD COLUMN expense_category TEXT",
            "ALTER TABLE documents ADD COLUMN erklaerung TEXT",
            "ALTER TABLE documents ADD COLUMN vereinfacht TEXT",
            "ALTER TABLE documents ADD COLUMN user_id TEXT NOT NULL DEFAULT ''",
            "ALTER TABLE documents ADD COLUMN reminder_days INTEGER DEFAULT 3",
            "ALTER TABLE subscriptions ADD COLUMN pending_plan TEXT",
        ]
        for migration in migrations:
            try:
                await db.execute(migration)
                await db.commit()
                logger.info(f"Migration erfolgreich: {migration[:60]}")
            except Exception:
                pass  # Spalte existiert bereits
    finally:
        await db.close()
