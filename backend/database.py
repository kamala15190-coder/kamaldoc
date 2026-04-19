import logging
import os
from pathlib import Path

import aiosqlite

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DATA_DIR / "documents.db"


def _admin_user_ids() -> list[str]:
    """Parse ADMIN_USER_IDS env var (comma-separated UUIDs)."""
    raw = os.getenv("ADMIN_USER_IDS", "")
    return [uid.strip() for uid in raw.split(",") if uid.strip()]


def permanent_admin_id() -> str | None:
    """First entry in ADMIN_USER_IDS is the permanent admin (cannot be removed via API)."""
    ids = _admin_user_ids()
    return ids[0] if ids else None


async def get_db() -> aiosqlite.Connection:
    """Legacy: öffnet eine Connection – Aufrufer muss `await db.close()` garantieren.

    Für neue Routen bitte `Depends(get_db_dep)` verwenden – das kümmert sich
    automatisch um den Close am Request-Ende.
    """
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def get_db_dep():
    """FastAPI-Dependency: eine Connection pro Request, auto-close am Ende.

    Nutzung:
        @app.get("/x")
        async def handler(db: aiosqlite.Connection = Depends(get_db_dep)):
            ...
    """
    db = await get_db()
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    os.makedirs(DATA_DIR / "originals", exist_ok=True)
    os.makedirs(DATA_DIR / "thumbnails", exist_ok=True)

    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
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

            CREATE TABLE IF NOT EXISTS behoerden_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                erklaerung TEXT,
                rechtseinschaetzung TEXT,
                anfechtbare_elemente TEXT,
                widerspruchsschreiben TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS expense_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                subcategory TEXT,
                price REAL NOT NULL,
                date TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS admins (
                user_id TEXT PRIMARY KEY
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            INSERT OR IGNORE INTO settings (key, value) VALUES ('support_email', 'a.kamal.vb@gmail.com');

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

            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL,
                text TEXT NOT NULL,
                done INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );


            CREATE TABLE IF NOT EXISTS support_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                subject TEXT NOT NULL DEFAULT '',
                message TEXT NOT NULL,
                priority TEXT DEFAULT 'mittel',
                status TEXT DEFAULT 'erstellt',
                screenshot_path TEXT,
                admin_solution TEXT,
                unread_user INTEGER DEFAULT 0,
                unread_admin INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS ticket_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                sender_type TEXT NOT NULL DEFAULT 'user',
                message TEXT NOT NULL,
                file_name TEXT,
                file_path TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS mistral_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model TEXT NOT NULL,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS usage_counters (
                user_id TEXT PRIMARY KEY,
                documents_total INTEGER DEFAULT 0,
                ki_analyses_total INTEGER DEFAULT 0,
                behoerden_month INTEGER DEFAULT 0,
                befund_month INTEGER DEFAULT 0,
                last_reset TEXT
            );

            CREATE TABLE IF NOT EXISTS feature_flags (
                key TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 1,
                updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );

            -- Default Feature-Flags für E-Mail
            INSERT OR IGNORE INTO feature_flags (key, enabled) VALUES ('email_enabled', 0);
            INSERT OR IGNORE INTO feature_flags (key, enabled) VALUES ('email_gmail', 0);
            INSERT OR IGNORE INTO feature_flags (key, enabled) VALUES ('email_outlook', 0);
            INSERT OR IGNORE INTO feature_flags (key, enabled) VALUES ('email_gmx', 0);
            INSERT OR IGNORE INTO feature_flags (key, enabled) VALUES ('email_icloud', 0);
            INSERT OR IGNORE INTO feature_flags (key, enabled) VALUES ('email_yahoo', 0);

            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );
        """)
        await db.commit()

        # Migrations: idempotente ALTER TABLE (SQLite prüft nicht CREATE IF NOT EXISTS für Spalten).
        # `user_id DEFAULT ''` bleibt hier aus Backwards-Compat-Gründen: existierende alte
        # Rows würden sonst den NOT-NULL-Constraint verletzen. Der Sanity-Check unten warnt
        # vor verbliebenen Leerstring-Rows.
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
            "ALTER TABLE usage_counters ADD COLUMN ki_analyses_month INTEGER DEFAULT 0",
            "ALTER TABLE usage_counters ADD COLUMN registration_date TEXT",
            "ALTER TABLE usage_counters ADD COLUMN documents_month INTEGER DEFAULT 0",
        ]
        for migration in migrations:
            try:
                await db.execute(migration)
                await db.commit()
                logger.info(f"Migration erfolgreich: {migration[:60]}")
            except aiosqlite.OperationalError as exc:
                msg = str(exc).lower()
                # Idempotente ADD COLUMN – wenn die Spalte schon existiert, ist das ok.
                if "duplicate column" in msg or "already exists" in msg:
                    continue
                logger.error(f"Migration fehlgeschlagen: {migration[:80]} → {exc}")
                raise

        # Admin-Seed aus ENV (ADMIN_USER_IDS=uuid1,uuid2,...)
        for admin_id in _admin_user_ids():
            try:
                await db.execute("INSERT OR IGNORE INTO admins (user_id) VALUES (?)", (admin_id,))
            except Exception as exc:
                logger.warning(f"Admin-Seed für {admin_id} fehlgeschlagen: {exc}")
        await db.commit()

        # Versionierte Migrationen (Indizes, Schema-Evolution jenseits ADD COLUMN).
        await _apply_versioned_migrations(db)

        # Sanity-Check: Altlasten aus Zeit als user_id DEFAULT '' erlaubt war.
        try:
            cursor = await db.execute("SELECT COUNT(*) AS cnt FROM documents WHERE user_id = '' OR user_id IS NULL")
            row = await cursor.fetchone()
            orphan_count = row["cnt"] if row else 0
            if orphan_count > 0:
                logger.warning(
                    "Es existieren %d Dokumente mit leerer user_id. "
                    "Diese sind unzuordenbar und sollten manuell bereinigt werden.",
                    orphan_count,
                )
        except Exception as exc:
            logger.debug(f"Orphan-Check übersprungen: {exc}")
    finally:
        await db.close()


# --- Versionierte Migrationen -------------------------------------------------
# Jede Migration ist ein (version, description, statements)-Tuple und wird genau
# einmal ausgeführt. Bereits angewendete Versionen stehen in `schema_version`.
# Reihenfolge ist bindend – neue Einträge IMMER nur ans Ende anfügen.

VERSIONED_MIGRATIONS: list[tuple[int, str, list[str]]] = [
    (
        1,
        "Indices für Hot-Paths auf documents / expenses / replies / tickets",
        [
            "CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_documents_user_status ON documents(user_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_documents_user_handlung ON documents(user_id, handlung_erforderlich, handlung_erledigt)",
            "CREATE INDEX IF NOT EXISTS idx_documents_user_doctype ON documents(user_id, doc_type)",
            "CREATE INDEX IF NOT EXISTS idx_documents_deadline ON documents(deadline) WHERE deadline IS NOT NULL",
            "CREATE INDEX IF NOT EXISTS idx_expense_items_user_date ON expense_items(user_id, date)",
            "CREATE INDEX IF NOT EXISTS idx_antworten_doc ON antworten(document_id)",
            "CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id)",
            "CREATE INDEX IF NOT EXISTS idx_befund_translations_doc ON befund_translations(document_id)",
            "CREATE INDEX IF NOT EXISTS idx_behoerden_results_doc ON behoerden_results(document_id)",
            "CREATE INDEX IF NOT EXISTS idx_todos_doc_user ON todos(document_id, user_id)",
            "CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_mistral_usage_created ON mistral_usage(created_at)",
        ],
    ),
]


async def _apply_versioned_migrations(db: aiosqlite.Connection) -> None:
    cursor = await db.execute("SELECT version FROM schema_version")
    applied = {row["version"] for row in await cursor.fetchall()}

    for version, description, statements in VERSIONED_MIGRATIONS:
        if version in applied:
            continue
        logger.info(f"Migration {version}: {description}")
        try:
            for stmt in statements:
                await db.execute(stmt)
            await db.execute("INSERT INTO schema_version (version) VALUES (?)", (version,))
            await db.commit()
        except Exception as exc:
            logger.error(f"Migration {version} fehlgeschlagen: {exc}")
            raise
