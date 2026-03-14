import asyncio
import logging
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
from fastapi import FastAPI, File, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
from pydantic import BaseModel

from database import DB_PATH, DATA_DIR, get_db, init_db
from llm_service import analyze_document, check_together_status, generate_reply
from auth import get_current_user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="KamalDoc API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ORIGINALS_DIR = DATA_DIR / "originals"
THUMBNAILS_DIR = DATA_DIR / "thumbnails"


@app.on_event("startup")
async def startup():
    await init_db()
    logger.info("KamalDoc Backend gestartet")


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
                kontakt_telefon = ?
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


# --- Routen ---

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
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
            """INSERT INTO documents (dateiname, originalpfad, thumbnailpfad, dateityp)
               VALUES (?, ?, ?, ?)""",
            (file.filename, original_name, thumb_name, ext.lstrip(".")),
        )
        doc_id = cursor.lastrowid
        await db.commit()
    finally:
        await db.close()

    # Analyse im Hintergrund starten
    asyncio.create_task(run_analysis(doc_id, str(image_path)))

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
):
    query = "SELECT * FROM documents WHERE 1=1"
    params = []

    if search:
        query += " AND (absender LIKE ? OR empfaenger LIKE ? OR zusammenfassung LIKE ? OR volltext LIKE ? OR dateiname LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s, s])

    if kategorie:
        query += " AND kategorie = ?"
        params.append(kategorie)

    if archiv:
        query += " AND handlung_erforderlich = 1 AND handlung_erledigt = 1"
    elif handlung_offen:
        query += " AND handlung_erforderlich = 1 AND handlung_erledigt = 0"
    elif handlung_erforderlich is not None:
        query += " AND handlung_erforderlich = ? AND handlung_erledigt = 0"
        params.append(1 if handlung_erforderlich else 0)

    if status:
        query += " AND status = ?"
        params.append(status)

    if archiv:
        query += " ORDER BY erledigt_am DESC, hochgeladen_am DESC"
    else:
        query += " ORDER BY hochgeladen_am DESC"

    db = await get_db()
    try:
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [row_to_dict(r) for r in rows]
    finally:
        await db.close()


@app.get("/api/documents/{doc_id}")
async def get_document(doc_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
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
            "SELECT originalpfad, dateiname FROM documents WHERE id = ?", (doc_id,)
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
            "SELECT thumbnailpfad FROM documents WHERE id = ?", (doc_id,)
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
        cursor = await db.execute("SELECT id FROM documents WHERE id = ?", (doc_id,))
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

        if not fields:
            raise HTTPException(400, "Keine Felder zum Aktualisieren")

        params.append(doc_id)
        await db.execute(
            f"UPDATE documents SET {', '.join(fields)} WHERE id = ?", params
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
        return row_to_dict(await cursor.fetchone())
    finally:
        await db.close()


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT originalpfad, thumbnailpfad FROM documents WHERE id = ?", (doc_id,)
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
        await db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        await db.commit()

        return {"message": "Dokument gelöscht"}
    finally:
        await db.close()


@app.post("/api/documents/{doc_id}/reply")
async def create_reply(doc_id: int, target_language: str = "de", user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")

        doc = row_to_dict(row)

        # Einstellungen laden für Absenderdaten
        einstellungen = {}
        try:
            settings_cursor = await db.execute("SELECT key, value FROM einstellungen")
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
        cursor = await db.execute("SELECT key, value FROM einstellungen")
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
                    "INSERT OR REPLACE INTO einstellungen (key, value) VALUES (?, ?)",
                    (key, data[key]),
                )
        await db.commit()
        cursor = await db.execute("SELECT key, value FROM einstellungen")
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
