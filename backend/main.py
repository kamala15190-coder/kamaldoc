import asyncio
import logging
import os
import shutil
import time
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
from fastapi import FastAPI, File, HTTPException, UploadFile, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from database import DB_PATH, DATA_DIR, get_db, init_db
from llm_service import (
    analyze_document, check_together_status, generate_reply,
    explain_authority_document, simplify_medical_report, translate_simplified_report
)
from auth import get_current_user
from subscription import (
    check_upload_limit, check_analysis_limit, check_behoerden_limit,
    check_befund_limit, check_expenses_access, increment_usage,
    get_subscription_status, create_checkout_session, cancel_subscription,
    handle_webhook, get_user_plan, get_usage, PLAN_LIMITS,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="KamalDoc API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kamaldoc-flax.vercel.app",
        "http://localhost:5173",
        "http://100.77.198.89:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# --- Rate Limiting Middleware (60 Requests/Minute pro IP) ---

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Health-Check vom Rate Limit ausnehmen
        if request.url.path == "/api/status":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        # Alte Einträge entfernen
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if now - t < self.window_seconds
        ]
        if len(self.requests[client_ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too Many Requests – max 60 pro Minute"},
            )
        self.requests[client_ip].append(now)
        return await call_next(request)

app.add_middleware(RateLimitMiddleware, max_requests=60, window_seconds=60)

ORIGINALS_DIR = DATA_DIR / "originals"
THUMBNAILS_DIR = DATA_DIR / "thumbnails"


@app.on_event("startup")
async def startup():
    await init_db()
    logger.info("KamalDoc Backend gestartet")
    # Deadline-Checker im Hintergrund starten
    asyncio.create_task(deadline_checker_loop())


# --- Hilfsfunktionen ---

def create_thumbnail(image_path: str, thumb_path: str, size=(400, 400)):
    with Image.open(image_path) as img:
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail(size, Image.LANCZOS)
        img.save(thumb_path, format="JPEG", quality=80)


def pdf_to_image(pdf_path: str, output_path: str) -> str:
    """Erste Seite eines PDFs als JPEG speichern."""
    doc = fitz.open(pdf_path)
    page = doc[0]
    pix = page.get_pixmap(dpi=200)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    img.save(output_path, format="JPEG", quality=90)
    doc.close()
    return output_path


def row_to_dict(row) -> dict:
    if row is None:
        return None
    return dict(row)


async def run_analysis(doc_id: int, image_path: str):
    """Asynchrone LLM-Analyse im Hintergrund."""
    logger.info(f"[Analyse] Starte Analyse für Dokument {doc_id}, Bild: {image_path}")
    db = await get_db()
    try:
        result = await analyze_document(image_path)

        handlung_erf_raw = result.get("handlung_erforderlich")
        handlung_erf_int = 1 if handlung_erf_raw else 0
        handlung_beschr = result.get("handlung_beschreibung")

        logger.info(f"[Analyse] Dokument {doc_id}: "
                     f"handlung_erforderlich raw={handlung_erf_raw} ({type(handlung_erf_raw).__name__}) → DB={handlung_erf_int}, "
                     f"handlung_beschreibung='{handlung_beschr}', "
                     f"kategorie='{result.get('kategorie')}', "
                     f"absender='{result.get('absender')}'")

        # Deadline: faelligkeitsdatum als initiale Deadline verwenden
        deadline = result.get("faelligkeitsdatum")
        expense_cat = result.get("expense_category")

        await db.execute(
            """UPDATE documents SET
                status = 'analysiert',
                kategorie = ?,
                absender = ?,
                empfaenger = ?,
                datum = ?,
                betrag = ?,
                faelligkeitsdatum = ?,
                handlung_erforderlich = ?,
                handlung_beschreibung = ?,
                zusammenfassung = ?,
                volltext = ?,
                kontakt_name = ?,
                kontakt_adresse = ?,
                kontakt_email = ?,
                kontakt_telefon = ?,
                deadline = ?,
                expense_category = ?
            WHERE id = ?""",
            (
                result.get("kategorie", "sonstiges"),
                result.get("absender"),
                result.get("empfaenger"),
                result.get("datum"),
                result.get("betrag"),
                result.get("faelligkeitsdatum"),
                handlung_erf_int,
                handlung_beschr,
                result.get("zusammenfassung"),
                result.get("volltext"),
                result.get("kontakt_name"),
                result.get("kontakt_adresse"),
                result.get("kontakt_email"),
                result.get("kontakt_telefon"),
                deadline,
                expense_cat,
                doc_id,
            ),
        )
        await db.commit()

        # Verifikation: direkt aus DB lesen
        cursor = await db.execute(
            "SELECT handlung_erforderlich, handlung_beschreibung, kategorie FROM documents WHERE id = ?",
            (doc_id,),
        )
        verify = await cursor.fetchone()
        if verify:
            logger.info(f"[Analyse] DB-Verifikation Dokument {doc_id}: "
                         f"handlung_erforderlich={verify['handlung_erforderlich']}, "
                         f"handlung_beschreibung='{verify['handlung_beschreibung']}', "
                         f"kategorie='{verify['kategorie']}'")

        logger.info(f"[Analyse] Dokument {doc_id} erfolgreich analysiert und gespeichert")
    except Exception as e:
        logger.error(f"[Analyse] FEHLER für Dokument {doc_id}: {e}", exc_info=True)
        await db.execute(
            "UPDATE documents SET status = 'fehler', analyse_fehler = ? WHERE id = ?",
            (str(e), doc_id),
        )
        await db.commit()
    finally:
        await db.close()


# --- Pydantic-Modelle ---

class DocumentUpdate(BaseModel):
    status: Optional[str] = None
    notizen: Optional[str] = None
    handlung_erledigt: Optional[bool] = None
    tags: Optional[str] = None
    deadline: Optional[str] = None
    reminder_days: Optional[int] = None


async def run_analysis_with_limit(doc_id: int, image_path: str, user_id: str):
    """Wrapper: check analysis limit, then run analysis and increment counter."""
    try:
        await check_analysis_limit(user_id)
        await run_analysis(doc_id, image_path)
        await increment_usage(user_id, "ki_analyses_total")
    except HTTPException:
        # Limit reached — still run analysis for free tier (already uploaded)
        await run_analysis(doc_id, image_path)


# --- Routen ---

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Query("standard"),
    user_id: str = Depends(get_current_user)
):
    # Plan enforcement: Upload-Limit prüfen
    await check_upload_limit(user_id)

    ext = Path(file.filename).suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".pdf"):
        raise HTTPException(400, "Nur JPG, PNG und PDF erlaubt")

    file_id = uuid.uuid4().hex[:12]
    original_name = f"{file_id}{ext}"
    original_path = ORIGINALS_DIR / original_name

    with open(original_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Bild für Analyse vorbereiten
    if ext == ".pdf":
        image_name = f"{file_id}.jpg"
        image_path = ORIGINALS_DIR / image_name
        pdf_to_image(str(original_path), str(image_path))
    else:
        image_path = original_path

    # Thumbnail erstellen
    thumb_name = f"{file_id}_thumb.jpg"
    thumb_path = THUMBNAILS_DIR / thumb_name
    create_thumbnail(str(image_path), str(thumb_path))

    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO documents (dateiname, originalpfad, thumbnailpfad, dateityp, doc_type, user_id)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (file.filename, original_name, thumb_name, ext.lstrip("."), doc_type, user_id),
        )
        doc_id = cursor.lastrowid
        await db.commit()
    finally:
        await db.close()

    # Usage counter erhöhen
    await increment_usage(user_id, "documents_total")

    # Analyse im Hintergrund starten (mit Limit-Check)
    asyncio.create_task(run_analysis_with_limit(doc_id, str(image_path), user_id))

    return {"id": doc_id, "status": "analyse_laeuft", "dateiname": file.filename}


@app.get("/api/documents")
async def list_documents(
    user_id: str = Depends(get_current_user),
    search: Optional[str] = None,
    kategorie: Optional[str] = None,
    handlung_erforderlich: Optional[bool] = None,
    handlung_offen: Optional[bool] = None,
    archiv: Optional[bool] = None,
    status: Optional[str] = None,
    doc_type: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = 0,
):
    query = "SELECT * FROM documents WHERE user_id = ?"
    count_query = "SELECT COUNT(*) as total FROM documents WHERE user_id = ?"
    params = [user_id]

    if search:
        query += " AND (absender LIKE ? OR empfaenger LIKE ? OR zusammenfassung LIKE ? OR volltext LIKE ? OR dateiname LIKE ?)"
        count_query += " AND (absender LIKE ? OR empfaenger LIKE ? OR zusammenfassung LIKE ? OR volltext LIKE ? OR dateiname LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s, s])

    if kategorie:
        query += " AND kategorie = ?"
        count_query += " AND kategorie = ?"
        params.append(kategorie)

    if doc_type:
        query += " AND doc_type = ?"
        count_query += " AND doc_type = ?"
        params.append(doc_type)

    if archiv:
        query += " AND handlung_erforderlich = 1 AND handlung_erledigt = 1"
        count_query += " AND handlung_erforderlich = 1 AND handlung_erledigt = 1"
    elif handlung_offen:
        query += " AND handlung_erforderlich = 1 AND handlung_erledigt = 0"
        count_query += " AND handlung_erforderlich = 1 AND handlung_erledigt = 0"
    elif handlung_erforderlich is not None:
        query += " AND handlung_erforderlich = ? AND handlung_erledigt = 0"
        count_query += " AND handlung_erforderlich = ? AND handlung_erledigt = 0"
        params.append(1 if handlung_erforderlich else 0)

    if status:
        query += " AND status = ?"
        count_query += " AND status = ?"
        params.append(status)

    if archiv:
        query += " ORDER BY erledigt_am DESC, hochgeladen_am DESC"
    else:
        query += " ORDER BY hochgeladen_am DESC"

    db = await get_db()
    try:
        # Gesamtzahl ermitteln
        cursor = await db.execute(count_query, params)
        total_row = await cursor.fetchone()
        total = total_row["total"] if total_row else 0

        # Pagination anwenden (nicht bei Suche)
        pagination_params = list(params)
        if limit and not search:
            query += " LIMIT ? OFFSET ?"
            pagination_params.extend([limit, offset or 0])

        cursor = await db.execute(query, pagination_params)
        rows = await cursor.fetchall()
        return {"documents": [row_to_dict(r) for r in rows], "total": total}
    finally:
        await db.close()


@app.get("/api/documents/{doc_id}")
async def get_document(doc_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")
        return row_to_dict(row)
    finally:
        await db.close()


@app.get("/api/documents/{doc_id}/file")
async def get_document_file(doc_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT originalpfad, dateiname FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")

        file_path = ORIGINALS_DIR / row["originalpfad"]
        if not file_path.exists():
            raise HTTPException(404, "Datei nicht gefunden")

        return FileResponse(
            str(file_path),
            filename=row["dateiname"],
            media_type="application/octet-stream",
        )
    finally:
        await db.close()


@app.get("/api/documents/{doc_id}/thumbnail")
async def get_document_thumbnail(doc_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT thumbnailpfad FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")

        thumb_path = THUMBNAILS_DIR / row["thumbnailpfad"]
        if not thumb_path.exists():
            raise HTTPException(404, "Thumbnail nicht gefunden")

        return FileResponse(str(thumb_path), media_type="image/jpeg")
    finally:
        await db.close()


@app.patch("/api/documents/{doc_id}")
async def update_document(doc_id: int, update: DocumentUpdate, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        if not await cursor.fetchone():
            raise HTTPException(404, "Dokument nicht gefunden")

        fields = []
        params = []

        if update.status is not None:
            fields.append("status = ?")
            params.append(update.status)
        if update.notizen is not None:
            fields.append("notizen = ?")
            params.append(update.notizen)
        if update.handlung_erledigt is not None:
            fields.append("handlung_erledigt = ?")
            params.append(1 if update.handlung_erledigt else 0)
            if update.handlung_erledigt:
                fields.append("erledigt_am = ?")
                params.append(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            else:
                fields.append("erledigt_am = ?")
                params.append(None)
        if update.tags is not None:
            fields.append("tags = ?")
            params.append(update.tags)
        if update.deadline is not None:
            fields.append("deadline = ?")
            params.append(update.deadline if update.deadline else None)
        if update.reminder_days is not None:
            fields.append("reminder_days = ?")
            params.append(update.reminder_days if update.reminder_days in (1, 3, 7) else None)

        if not fields:
            raise HTTPException(400, "Keine Felder zum Aktualisieren")

        params.extend([doc_id, user_id])
        await db.execute(
            f"UPDATE documents SET {', '.join(fields)} WHERE id = ? AND user_id = ?", params
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        return row_to_dict(await cursor.fetchone())
    finally:
        await db.close()


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT originalpfad, thumbnailpfad FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")

        # Dateien löschen
        orig = ORIGINALS_DIR / row["originalpfad"]
        thumb = THUMBNAILS_DIR / row["thumbnailpfad"]
        if orig.exists():
            os.remove(orig)
        if thumb.exists():
            os.remove(thumb)

        await db.execute("DELETE FROM antworten WHERE document_id = ?", (doc_id,))
        await db.execute("DELETE FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        await db.commit()

        return {"message": "Dokument gelöscht"}
    finally:
        await db.close()


@app.post("/api/documents/{doc_id}/reply")
async def create_reply(doc_id: int, target_language: str = "de", user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")

        doc = row_to_dict(row)

        # Einstellungen laden für Absenderdaten
        einstellungen = {}
        try:
            settings_cursor = await db.execute("SELECT key, value FROM user_einstellungen WHERE user_id = ?", (user_id,))
            settings_rows = await settings_cursor.fetchall()
            einstellungen = {r["key"]: r["value"] for r in settings_rows}
        except Exception:
            pass

        try:
            reply_text = await generate_reply(doc, einstellungen, target_language)
        except Exception as e:
            raise HTTPException(502, f"LLM-Fehler: {str(e)}")

        cursor = await db.execute(
            "INSERT INTO antworten (document_id, inhalt) VALUES (?, ?)",
            (doc_id, reply_text),
        )
        reply_id = cursor.lastrowid
        await db.commit()

        return {"id": reply_id, "inhalt": reply_text, "document_id": doc_id}
    finally:
        await db.close()


@app.get("/api/documents/{doc_id}/replies")
async def get_replies(doc_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        # Prüfe ob Dokument dem User gehört
        doc_cursor = await db.execute("SELECT id FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        if not await doc_cursor.fetchone():
            raise HTTPException(404, "Dokument nicht gefunden")

        cursor = await db.execute(
            "SELECT * FROM antworten WHERE document_id = ? ORDER BY erstellt_am DESC",
            (doc_id,),
        )
        rows = await cursor.fetchall()
        return [row_to_dict(r) for r in rows]
    finally:
        await db.close()


EINSTELLUNGEN_KEYS = [
    "vorname", "nachname", "adresse", "plz", "ort", "email", "telefon"
]


@app.get("/api/einstellungen")
async def get_einstellungen(user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT key, value FROM user_einstellungen WHERE user_id = ?", (user_id,))
        rows = await cursor.fetchall()
        return {row["key"]: row["value"] for row in rows}
    finally:
        await db.close()


@app.put("/api/einstellungen")
async def save_einstellungen(data: dict, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        for key in EINSTELLUNGEN_KEYS:
            if key in data:
                await db.execute(
                    "INSERT OR REPLACE INTO user_einstellungen (user_id, key, value) VALUES (?, ?, ?)",
                    (user_id, key, data[key]),
                )
        await db.commit()
        cursor = await db.execute("SELECT key, value FROM user_einstellungen WHERE user_id = ?", (user_id,))
        rows = await cursor.fetchall()
        return {row["key"]: row["value"] for row in rows}
    finally:
        await db.close()


@app.get("/api/status")
async def get_status():
    together_status = await check_together_status()
    return {
        "backend": "online",
        "datenbank": str(DB_PATH),
        "together_ai": together_status,
    }


# --- Ausgaben-Dashboard ---

@app.get("/api/expenses")
async def get_expenses(
    user_id: str = Depends(get_current_user),
    year: Optional[int] = None,
    month: Optional[int] = None,
    expense_category: Optional[str] = None,
):
    """Ausgaben-Aggregation für Rechnungen."""
    # Plan enforcement: Expenses nur für Basic/Pro
    await check_expenses_access(user_id)

    query = """SELECT id, absender, betrag, datum, expense_category, zusammenfassung
               FROM documents WHERE user_id = ? AND kategorie = 'rechnung' AND betrag IS NOT NULL AND betrag > 0"""
    params = [user_id]

    if year:
        query += " AND CAST(strftime('%Y', datum) AS INTEGER) = ?"
        params.append(year)
    if month:
        query += " AND CAST(strftime('%m', datum) AS INTEGER) = ?"
        params.append(month)
    if expense_category:
        query += " AND expense_category = ?"
        params.append(expense_category)

    query += " ORDER BY datum DESC"

    db = await get_db()
    try:
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        items = [row_to_dict(r) for r in rows]

        # Aggregationen berechnen
        total = sum(r["betrag"] for r in items if r.get("betrag"))
        by_category = {}
        by_month = {}
        for r in items:
            cat = r.get("expense_category") or "sonstiges"
            by_category[cat] = by_category.get(cat, 0) + (r.get("betrag") or 0)
            if r.get("datum"):
                m = r["datum"][:7]  # YYYY-MM
                by_month[m] = by_month.get(m, 0) + (r.get("betrag") or 0)

        return {
            "items": items,
            "total": round(total, 2),
            "by_category": {k: round(v, 2) for k, v in sorted(by_category.items())},
            "by_month": {k: round(v, 2) for k, v in sorted(by_month.items())},
        }
    finally:
        await db.close()


# --- Behörden-Assistent ---

@app.post("/api/documents/{doc_id}/explain")
async def explain_document(
    doc_id: int,
    target_language: str = "de",
    user_id: str = Depends(get_current_user),
):
    """Behördenschreiben in einfacher Sprache erklären."""
    # Plan enforcement: Behörden-Assistent Limit
    await check_behoerden_limit(user_id)

    db = await get_db()
    try:
        cursor = await db.execute("SELECT volltext, erklaerung FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")

        volltext = row["volltext"]
        if not volltext:
            raise HTTPException(400, "Dokument hat keinen extrahierten Text")

        try:
            erklaerung = await explain_authority_document(volltext, target_language)
        except Exception as e:
            raise HTTPException(502, f"LLM-Fehler: {str(e)}")

        # Erklärung speichern
        await db.execute("UPDATE documents SET erklaerung = ? WHERE id = ? AND user_id = ?", (erklaerung, doc_id, user_id))
        await db.commit()

        # Usage counter
        await increment_usage(user_id, "behoerden_month")

        return {"erklaerung": erklaerung, "document_id": doc_id}
    finally:
        await db.close()


# --- Befund-Assistent ---

@app.post("/api/documents/{doc_id}/simplify")
async def simplify_document(
    doc_id: int,
    user_id: str = Depends(get_current_user),
):
    """Medizinischen Befund vereinfachen (Instanz 1)."""
    # Plan enforcement: Befund-Assistent Limit
    await check_befund_limit(user_id)

    db = await get_db()
    try:
        cursor = await db.execute("SELECT volltext FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")

        volltext = row["volltext"]
        if not volltext:
            raise HTTPException(400, "Dokument hat keinen extrahierten Text")

        try:
            vereinfacht = await simplify_medical_report(volltext)
        except Exception as e:
            raise HTTPException(502, f"LLM-Fehler: {str(e)}")

        await db.execute("UPDATE documents SET vereinfacht = ? WHERE id = ? AND user_id = ?", (vereinfacht, doc_id, user_id))
        await db.commit()

        # Usage counter
        await increment_usage(user_id, "befund_month")

        return {"vereinfacht": vereinfacht, "document_id": doc_id}
    finally:
        await db.close()


@app.post("/api/documents/{doc_id}/translate")
async def translate_document(
    doc_id: int,
    target_language: str = "de",
    user_id: str = Depends(get_current_user),
):
    """Vereinfachten Befund übersetzen (Instanz 2)."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT vereinfacht FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")

        vereinfacht = row["vereinfacht"]
        if not vereinfacht:
            raise HTTPException(400, "Befund muss zuerst vereinfacht werden")

        try:
            translated = await translate_simplified_report(vereinfacht, target_language)
        except Exception as e:
            raise HTTPException(502, f"LLM-Fehler: {str(e)}")

        # Übersetzung in befund_translations speichern
        await db.execute(
            "INSERT INTO befund_translations (document_id, target_language, translated_text) VALUES (?, ?, ?)",
            (doc_id, target_language, translated),
        )
        await db.commit()

        return {"translated": translated, "target_language": target_language, "document_id": doc_id}
    finally:
        await db.close()


# --- Push Token Registration ---

@app.post("/api/push-token")
async def register_push_token(
    data: dict,
    user_id: str = Depends(get_current_user),
):
    """Push-Token registrieren für Deadline-Notifications."""
    token = data.get("token")
    platform = data.get("platform", "android")
    if not token:
        raise HTTPException(400, "Token erforderlich")

    db = await get_db()
    try:
        await db.execute(
            "INSERT OR REPLACE INTO push_tokens (user_id, token, platform) VALUES (?, ?, ?)",
            (user_id, token, platform),
        )
        await db.commit()
        return {"message": "Token registriert"}
    finally:
        await db.close()


# --- Subscription API ---

@app.get("/api/subscription/status")
async def subscription_status(user_id: str = Depends(get_current_user)):
    """Get subscription status, limits, and usage."""
    return await get_subscription_status(user_id)


@app.post("/api/subscription/create-checkout")
async def subscription_create_checkout(data: dict, user_id: str = Depends(get_current_user)):
    """Create Stripe checkout session."""
    plan = data.get("plan")
    return await create_checkout_session(user_id, plan)


@app.post("/api/subscription/cancel")
async def subscription_cancel(user_id: str = Depends(get_current_user)):
    """Cancel subscription."""
    return await cancel_subscription(user_id)


@app.get("/api/subscription/usage")
async def subscription_usage(user_id: str = Depends(get_current_user)):
    """Get current usage counters."""
    return await get_usage(user_id)


@app.post("/api/subscription/webhook")
async def subscription_webhook(request: Request):
    """Stripe webhook (no auth — verified via Stripe signature)."""
    return await handle_webhook(request)


# --- Deadline-Checker Background Job ---

async def deadline_checker_loop():
    """Täglicher Hintergrund-Job: Prüft Deadlines und markiert fällige Dokumente."""
    while True:
        try:
            await check_deadlines()
        except Exception as e:
            logger.error(f"[Deadline-Checker] Fehler: {e}", exc_info=True)
        # Alle 6 Stunden prüfen
        await asyncio.sleep(6 * 60 * 60)


async def check_deadlines():
    """Prüfe Dokumente mit Deadline basierend auf reminder_days pro Dokument."""
    from datetime import timedelta
    today = datetime.now().date()

    db = await get_db()
    try:
        # Hole alle Dokumente mit Deadline die noch nicht benachrichtigt wurden
        cursor = await db.execute(
            """SELECT d.id, d.user_id, d.absender, d.zusammenfassung, d.deadline,
                      d.handlung_beschreibung, d.reminder_days
               FROM documents d
               WHERE d.deadline IS NOT NULL
                 AND d.reminder_days IS NOT NULL
                 AND d.deadline_notified = 0
                 AND d.handlung_erledigt = 0""",
        )
        rows = await cursor.fetchall()

        for row in rows:
            doc = row_to_dict(row)
            reminder_days = doc.get("reminder_days") or 3

            # Prüfe ob User Push-Notifications haben darf
            user_id = doc.get("user_id")
            try:
                plan = await get_user_plan(user_id)
                if not PLAN_LIMITS.get(plan, {}).get("push_notifications", False):
                    continue  # Free user — keine Push
            except Exception:
                continue

            # Prüfe ob Deadline innerhalb des reminder_days Fensters liegt
            try:
                deadline_date = datetime.strptime(doc["deadline"][:10], "%Y-%m-%d").date()
                warning_date = today + timedelta(days=reminder_days)
                if deadline_date > warning_date or deadline_date < today:
                    continue
            except (ValueError, TypeError):
                continue

            logger.info(f"[Deadline-Checker] Deadline-Warnung für Dokument {doc['id']}: "
                       f"{doc['absender']} - Deadline: {doc['deadline']} (reminder: {reminder_days}d)")

            # Token für Push-Notifications des Dokument-Besitzers holen
            token_cursor = await db.execute("SELECT token, platform FROM push_tokens WHERE user_id = ?", (user_id,))
            tokens = await token_cursor.fetchall()

            for t in tokens:
                await send_push_notification(
                    token=t["token"],
                    title=f"Deadline in Kürze: {doc.get('absender', 'Dokument')}",
                    body=doc.get("handlung_beschreibung") or doc.get("zusammenfassung") or f"Fällig am {doc['deadline']}",
                )

            # Als benachrichtigt markieren
            await db.execute("UPDATE documents SET deadline_notified = 1 WHERE id = ?", (doc["id"],))

        await db.commit()
        if rows:
            logger.info(f"[Deadline-Checker] {len(rows)} Deadline-Warnungen verarbeitet")
    finally:
        await db.close()


async def send_push_notification(token: str, title: str, body: str):
    """Push-Notification via FCM senden (placeholder - needs Firebase setup)."""
    # TODO: Firebase Cloud Messaging Integration
    # Für jetzt nur loggen - FCM Server Key muss in .env konfiguriert werden
    logger.info(f"[Push] Würde senden an {token[:20]}...: {title} - {body}")
