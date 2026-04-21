import asyncio
import io
import logging
import os
import smtplib
import time
import uuid
from collections import defaultdict
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import fitz  # PyMuPDF
import stripe
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from PIL import Image
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from auth import get_current_user
from database import DATA_DIR, DB_PATH, get_db, init_db, permanent_admin_id
from llm_service import (
    analyze_document,
    analyze_document_from_text,
    check_mistral_status,
    explain_authority_document,
    extract_expense_items,
    generate_objection_letter,
    generate_reply,
    get_contestable_elements,
    legal_assessment,
    ocr_image,
    simplify_medical_report,
    translate_simplified_report,
)
from subscription import (
    PLAN_LIMITS,
    cancel_subscription,
    check_analysis_limit,
    check_befund_limit,
    check_behoerden_limit,
    check_expenses_access,
    check_upload_limit,
    create_checkout_session,
    downgrade_subscription,
    get_subscription_status,
    get_usage,
    get_user_plan,
    handle_webhook,
    increment_usage,
    reactivate_subscription,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="KamalDoc API", version="1.0.0")


def safe_task(coro, name: str = "background", on_error=None):
    """Erzeugt einen asyncio.Task mit Exception-Logging.

    Ohne diesen Wrapper gehen Exceptions aus `asyncio.create_task(...)` stumm
    verloren, wenn niemand die Task `await`-ed. Das ließ Analyse-Jobs und den
    Deadline-Checker unbemerkt sterben.

    `on_error(exc)` wird (falls gesetzt) synchron im Done-Callback aufgerufen;
    selbst dort geworfene Exceptions werden wieder nur geloggt.
    """
    task = asyncio.create_task(coro)

    def _done(t: asyncio.Task):
        if t.cancelled():
            return
        exc = t.exception()
        if exc is None:
            return
        logger.error(f"[{name}] Background-Task gecrasht: {exc}", exc_info=exc)
        if on_error is not None:
            try:
                on_error(exc)
            except Exception as cb_exc:
                logger.error(f"[{name}] on_error-Callback gecrasht: {cb_exc}", exc_info=cb_exc)

    task.add_done_callback(_done)
    return task


_PROD_ORIGINS = [
    "https://kamaldoc-flax.vercel.app",
    "https://kdoc.at",
    "https://www.kdoc.at",
    "https://api.kdoc.at",
    "capacitor://localhost",
    "ionic://localhost",
]
_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://localhost",
    "https://localhost",
    "http://127.0.0.1:5173",
]
_APP_ENV = os.getenv("APP_ENV", "development").lower()
_CORS_ORIGINS = _PROD_ORIGINS + ([] if _APP_ENV == "production" else _DEV_ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# --- Rate Limiting Middleware ---
# Global: 200 Requests/Minute pro IP
# Per-Endpoint: /api/upload → 60/min, /api/push-token → 10/min (Loop-Schutz)


class RateLimitMiddleware(BaseHTTPMiddleware):
    EXEMPT_PATHS = {"/api/status", "/auth/google/login", "/auth/google/callback"}

    # Striktere Limits pro Endpoint (requests/minute pro IP)
    PATH_LIMITS = {
        "/api/upload": 60,
        "/api/push-token": 10,
    }

    def __init__(self, app, max_requests: int = 200, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list] = defaultdict(list)
        self.path_requests: dict[str, list] = defaultdict(list)

    def _cors_headers(self, request: Request) -> dict:
        origin = request.headers.get("origin", "")
        if origin:
            return {
                "access-control-allow-origin": origin,
                "access-control-allow-credentials": "true",
            }
        return {}

    async def dispatch(self, request: Request, call_next):
        # Health-Check, Auth-Endpoints und OPTIONS vom Rate Limit ausnehmen
        if request.url.path in self.EXEMPT_PATHS or request.method == "OPTIONS":
            return await call_next(request)

        client_ip = (
            request.headers.get("x-real-ip")
            or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )
        now = time.time()
        path = request.url.path

        # Per-Endpoint-Limit prüfen (z.B. /api/push-token: 10/min)
        path_limit = self.PATH_LIMITS.get(path)
        if path_limit is not None:
            key = f"{client_ip}:{path}"
            self.path_requests[key] = [t for t in self.path_requests[key] if now - t < self.window_seconds]
            if len(self.path_requests[key]) >= path_limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": f"Too Many Requests – max {path_limit} pro Minute für diesen Endpoint"},
                    headers=self._cors_headers(request),
                )
            self.path_requests[key].append(now)

        # Globales Limit prüfen
        self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < self.window_seconds]
        if len(self.requests[client_ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too Many Requests – max 200 pro Minute"},
                headers=self._cors_headers(request),
            )
        self.requests[client_ip].append(now)
        return await call_next(request)


app.add_middleware(RateLimitMiddleware, max_requests=200, window_seconds=60)

ORIGINALS_DIR = DATA_DIR / "originals"
THUMBNAILS_DIR = DATA_DIR / "thumbnails"


@app.on_event("startup")
async def startup():
    await init_db()
    logger.info("KamalDoc Backend gestartet")
    # Deadline-Checker im Hintergrund starten
    safe_task(deadline_checker_loop(), name="deadline-checker")


# --- Google OAuth Proxy (damit Google "Weiter zu kdoc.at" anzeigt) ---

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
# Separate Gmail-only OAuth client for mailbox connections (gmail.readonly scope).
# Falls back to the sign-in client if not set, but a dedicated client is recommended.
GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID", "") or GOOGLE_CLIENT_ID
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET", "") or GOOGLE_CLIENT_SECRET
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://kamaldoc-flax.vercel.app")
API_URL = os.getenv("API_URL", "https://api.kdoc.at")
ANDROID_CALLBACK = os.getenv("ANDROID_CALLBACK", "at.kamaldoc.app://login-callback")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://grbalaqdgdukzwumejfu.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


# OAuth state store (in-memory, TTL 10 min)
_oauth_states = {}


def _cleanup_oauth_states():
    """Remove expired OAuth states (older than 10 minutes)."""
    now = time.time()
    expired = [k for k, v in _oauth_states.items() if now - v["ts"] > 600]
    for k in expired:
        del _oauth_states[k]


@app.get("/auth/google/login")
async def google_login(platform: str = "web"):
    """Redirect user to Google OAuth with our own redirect_uri."""
    import secrets

    _cleanup_oauth_states()
    token = secrets.token_urlsafe(32)
    state = f"{platform}:{token}"
    _oauth_states[token] = {"platform": platform, "ts": time.time()}
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": f"{API_URL}/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{query}")


@app.get("/auth/google/callback")
async def google_callback(code: str = None, state: str = "", error: str = None):
    """Handle Google OAuth callback, exchange code, sign in via Supabase, redirect to frontend."""
    from urllib.parse import quote, urlencode

    import httpx as _httpx

    if error or not code:
        logger.error(f"Google OAuth error: {error}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_auth_failed")

    # Verify OAuth state (CSRF protection)
    platform = "web"
    if ":" in state:
        parts = state.split(":", 1)
        platform = parts[0] if parts[0] in ("web", "android") else "web"
        state_token = parts[1]
        if state_token not in _oauth_states:
            logger.warning("Invalid OAuth state token")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=invalid_state")
        del _oauth_states[state_token]
    else:
        logger.warning("OAuth callback without valid state")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=missing_state")

    # 1. Exchange authorization code for tokens with Google
    try:
        async with _httpx.AsyncClient(timeout=15) as client:
            token_resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": f"{API_URL}/auth/google/callback",
                    "grant_type": "authorization_code",
                },
            )
            token_data = token_resp.json()

        if "error" in token_data:
            logger.error(f"Google token exchange error: {token_data}")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=token_exchange_failed")

        google_id_token = token_data.get("id_token")
        if not google_id_token:
            logger.error("No id_token in Google response")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=no_id_token")
    except Exception as e:
        logger.error(f"Google token exchange exception: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=token_exchange_exception")

    # 2. Sign in to Supabase with the Google ID token
    try:
        async with _httpx.AsyncClient(timeout=15) as client:
            supabase_resp = await client.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=id_token",
                json={"provider": "google", "id_token": google_id_token},
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
            )
            supabase_data = supabase_resp.json()

        if "access_token" not in supabase_data:
            logger.error(f"Supabase sign-in error: {supabase_data}")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=supabase_auth_failed")

        access_token = supabase_data["access_token"]
        refresh_token = supabase_data.get("refresh_token", "")
        expires_in = supabase_data.get("expires_in", 3600)
        token_type = supabase_data.get("token_type", "bearer")
    except Exception as e:
        logger.error(f"Supabase sign-in exception: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=supabase_exception")

    # 3. Redirect to frontend/app with tokens in URL hash
    fragment = urlencode(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "token_type": token_type,
        }
    )

    if platform == "android":
        redirect_url = f"{ANDROID_CALLBACK}#{fragment}"
    else:
        redirect_url = f"{FRONTEND_URL}/#access_token={quote(access_token)}&refresh_token={quote(refresh_token)}&expires_in={expires_in}&token_type={token_type}"

    return RedirectResponse(url=redirect_url)


# --- Gmail OAuth Token-Exchange (server-side, client_secret bleibt geheim) ---


class GmailTokenExchangeRequest(BaseModel):
    code: str
    code_verifier: str
    redirect_uri: str


class GmailTokenRefreshRequest(BaseModel):
    refresh_token: str


@app.post("/api/auth/gmail/token-exchange")
async def gmail_token_exchange(
    body: GmailTokenExchangeRequest,
    user_id: str = Depends(get_current_user),
):
    """Exchange a Gmail OAuth authorization code for access+refresh tokens.
    Runs server-side so that GMAIL_CLIENT_SECRET is never exposed to the client.
    PKCE (code_verifier) is forwarded for additional security."""
    import httpx as _httpx

    if not GMAIL_CLIENT_ID or not GMAIL_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Gmail OAuth not configured on server")

    async with _httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": body.code,
                "client_id": GMAIL_CLIENT_ID,
                "client_secret": GMAIL_CLIENT_SECRET,
                "redirect_uri": body.redirect_uri,
                "grant_type": "authorization_code",
                "code_verifier": body.code_verifier,
            },
        )

    if not resp.is_success:
        detail = ""
        try:
            err = resp.json()
            detail = err.get("error_description") or err.get("error") or ""
        except Exception:
            pass
        logger.error(f"Gmail token exchange failed ({resp.status_code}): {detail}")
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {detail}" if detail else "Token exchange failed")

    token_data = resp.json()
    access_token = token_data.get("access_token", "")

    # Fetch the user's Gmail address from the Gmail profile endpoint.
    # We only request gmail.readonly scope (no openid/email), so there is no
    # id_token. The /gmail/v1/users/me/profile endpoint is available with
    # gmail.readonly and returns the emailAddress directly.
    email = ""
    if access_token:
        try:
            async with _httpx.AsyncClient(timeout=10) as gclient:
                profile_resp = await gclient.get(
                    "https://www.googleapis.com/gmail/v1/users/me/profile",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
            if profile_resp.is_success:
                email = profile_resp.json().get("emailAddress", "")
        except Exception as e:
            logger.warning(f"Could not fetch Gmail profile: {e}")

    return {
        "access_token": access_token,
        "refresh_token": token_data.get("refresh_token"),
        "expires_in": token_data.get("expires_in", 3600),
        "email": email,
    }


@app.post("/api/auth/gmail/token-refresh")
async def gmail_token_refresh(
    body: GmailTokenRefreshRequest,
    user_id: str = Depends(get_current_user),
):
    """Refresh a Gmail access token server-side so client_secret stays secure."""
    import httpx as _httpx

    if not GMAIL_CLIENT_ID or not GMAIL_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Gmail OAuth not configured on server")

    async with _httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GMAIL_CLIENT_ID,
                "client_secret": GMAIL_CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": body.refresh_token,
            },
        )

    if not resp.is_success:
        detail = ""
        try:
            err = resp.json()
            detail = err.get("error_description") or err.get("error") or ""
        except Exception:
            pass
        logger.warning(f"Gmail token refresh failed ({resp.status_code}): {detail}")
        raise HTTPException(status_code=401, detail="Token refresh failed")

    token_data = resp.json()
    return {
        "access_token": token_data.get("access_token"),
        "refresh_token": token_data.get("refresh_token") or body.refresh_token,
        "expires_in": token_data.get("expires_in", 3600),
    }


@app.get("/auth/gmail/callback")
async def gmail_oauth_callback_relay(
    code: str = None,
    state: str = None,
    error: str = None,
    error_description: str = None,
):
    """Backend relay for Gmail OAuth callback (web flow).

    Google redirects here instead of directly to the frontend so that
    Supabase's detectSessionInUrl never sees the authorization code and
    cannot consume it. We exchange the code server-side with client_secret,
    then redirect to the frontend with the result encoded in the URL hash
    fragment (hash fragments are never sent to servers, so tokens stay safe).
    """
    import base64
    import json
    import httpx as _httpx
    from urllib.parse import quote as _quote

    callback_path = "/email-callback/gmail"

    def _redirect_error(msg: str) -> RedirectResponse:
        return RedirectResponse(
            url=f"{FRONTEND_URL}{callback_path}#gmail_error={_quote(msg)}",
            status_code=302,
        )

    if error:
        return _redirect_error(error_description or error)

    if not code:
        return _redirect_error("no_code_received")

    if not GMAIL_CLIENT_ID or not GMAIL_CLIENT_SECRET:
        logger.error("Gmail OAuth relay: GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET not set")
        return _redirect_error("oauth_not_configured")

    redirect_uri = f"{API_URL}/auth/gmail/callback"

    try:
        async with _httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": GMAIL_CLIENT_ID,
                    "client_secret": GMAIL_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
    except Exception as exc:
        logger.error(f"Gmail OAuth relay: token exchange exception: {exc}")
        return _redirect_error("token_exchange_error")

    if not resp.is_success:
        detail = ""
        try:
            detail = resp.json().get("error_description") or resp.json().get("error") or ""
        except Exception:
            pass
        logger.error(f"Gmail OAuth relay: token exchange failed ({resp.status_code}): {detail}")
        return _redirect_error(f"token_exchange_failed: {detail}" if detail else "token_exchange_failed")

    token_data = resp.json()
    access_token = token_data.get("access_token", "")

    email = ""
    if access_token:
        try:
            async with _httpx.AsyncClient(timeout=10) as gclient:
                profile_resp = await gclient.get(
                    "https://www.googleapis.com/gmail/v1/users/me/profile",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
            if profile_resp.is_success:
                email = profile_resp.json().get("emailAddress", "")
        except Exception as exc:
            logger.warning(f"Gmail OAuth relay: could not fetch profile: {exc}")

    result_b64 = base64.urlsafe_b64encode(
        json.dumps({
            "state": state,
            "email": email,
            "access_token": access_token,
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": token_data.get("expires_in", 3600),
        }).encode()
    ).decode()

    return RedirectResponse(
        url=f"{FRONTEND_URL}{callback_path}#gmail_result={result_b64}",
        status_code=302,
    )


# --- Hilfsfunktionen ---

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
# PNG, JPEG, und %PDF- magic bytes. Gibt uns eine kleine Defense-in-Depth
# gegen umbenannte Malware-Uploads (Pillow/fitz sind unser echter Gatekeeper).
_IMAGE_MAGIC_PREFIXES = (
    b"\x89PNG\r\n\x1a\n",  # PNG
    b"\xff\xd8\xff",  # JPEG
)
_PDF_MAGIC_PREFIX = b"%PDF-"


def _looks_like_allowed_upload(content: bytes, ext: str) -> bool:
    """Header-Inspektion + echter Decode-Versuch via PIL/fitz."""
    if not content:
        return False
    try:
        if ext == ".pdf":
            if not content.startswith(_PDF_MAGIC_PREFIX):
                return False
            doc = fitz.open(stream=content, filetype="pdf")
            try:
                if doc.page_count < 1:
                    return False
            finally:
                doc.close()
            return True
        # JPG / JPEG / PNG
        if not any(content.startswith(p) for p in _IMAGE_MAGIC_PREFIXES):
            return False
        with Image.open(io.BytesIO(content)) as img:
            img.verify()  # PIL-Integrity-Check
        return True
    except Exception as exc:
        logger.debug(f"Upload-Validation fehlgeschlagen (ext={ext}): {exc}")
        return False


def create_thumbnail(image_path: str, thumb_path: str, size=(400, 400)):
    with Image.open(image_path) as img:
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail(size, Image.LANCZOS)
        img.save(thumb_path, format="JPEG", quality=80)


def pdf_to_image(pdf_path: str, output_path: str) -> str:
    """Erste Seite eines PDFs als JPEG speichern."""
    doc = fitz.open(pdf_path)
    try:
        page = doc[0]
        pix = page.get_pixmap(dpi=200)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        img.save(output_path, format="JPEG", quality=90)
    finally:
        doc.close()
    return output_path


def row_to_dict(row) -> dict:
    if row is None:
        return None
    return dict(row)


def pdf_page_count(pdf_path: str) -> int:
    """Return the number of pages in a PDF."""
    doc = fitz.open(pdf_path)
    count = doc.page_count
    doc.close()
    return count


def pdf_page_to_image(pdf_path: str, page_idx: int, output_path: str) -> str:
    """Extract a single page from a PDF as JPEG."""
    doc = fitz.open(pdf_path)
    page = doc[page_idx]
    pix = page.get_pixmap(dpi=200)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    img.save(output_path, format="JPEG", quality=90)
    doc.close()
    return output_path


async def run_analysis(doc_id: int, image_path: str):
    """Asynchrone LLM-Analyse im Hintergrund."""
    logger.info(f"[Analyse] Starte Analyse für Dokument {doc_id}, Bild: {image_path}")
    db = await get_db()
    try:
        # Look up original file to handle multi-page PDFs
        cursor = await db.execute("SELECT originalpfad, dateityp FROM documents WHERE id = ?", (doc_id,))
        doc_row = await cursor.fetchone()
        original_path = str(ORIGINALS_DIR / doc_row["originalpfad"]) if doc_row else None
        file_type = doc_row["dateityp"] if doc_row else ""

        pdf_exists = await asyncio.to_thread(os.path.exists, original_path) if original_path else False
        if file_type == "pdf" and original_path and pdf_exists:
            num_pages = await asyncio.to_thread(pdf_page_count, original_path)
            logger.info(f"[Analyse] PDF mit {num_pages} Seiten erkannt: {original_path}")
            if num_pages > 1:
                # Multi-page PDF: OCR each page separately, combine text
                all_ocr_texts = []
                for i in range(num_pages):
                    page_img_path = str(ORIGINALS_DIR / f"{Path(original_path).stem}_page{i}.jpg")
                    await asyncio.to_thread(pdf_page_to_image, original_path, i, page_img_path)
                    page_text = await ocr_image(page_img_path)
                    all_ocr_texts.append(f"--- Seite {i + 1} ---\n{page_text}")
                    logger.info(f"[Analyse] Seite {i + 1}/{num_pages} OCR: {len(page_text)} Zeichen")
                    # Clean up temp page image
                    try:
                        await asyncio.to_thread(os.remove, page_img_path)
                    except OSError:
                        pass
                combined_ocr = "\n\n".join(all_ocr_texts)
                logger.info(f"[Analyse] Gesamt-OCR für {num_pages} Seiten: {len(combined_ocr)} Zeichen")
                result = await analyze_document_from_text(combined_ocr)
            else:
                # Single-page PDF: use existing image
                result = await analyze_document(image_path)
        else:
            # Image file: single-page OCR as before
            result = await analyze_document(image_path)

        handlung_erf_raw = result.get("handlung_erforderlich")
        handlung_erf_int = 1 if handlung_erf_raw else 0
        handlung_beschr = result.get("handlung_beschreibung")

        logger.info(
            f"[Analyse] Dokument {doc_id}: "
            f"handlung_erforderlich raw={handlung_erf_raw} ({type(handlung_erf_raw).__name__}) → DB={handlung_erf_int}, "
            f"handlung_beschreibung='{handlung_beschr}', "
            f"kategorie='{result.get('kategorie')}', "
            f"absender='{result.get('absender')}'"
        )

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
            logger.info(
                f"[Analyse] DB-Verifikation Dokument {doc_id}: "
                f"handlung_erforderlich={verify['handlung_erforderlich']}, "
                f"handlung_beschreibung='{verify['handlung_beschreibung']}', "
                f"kategorie='{verify['kategorie']}'"
            )

        logger.info(f"[Analyse] Dokument {doc_id} erfolgreich analysiert und gespeichert")

        # Extract expense items for invoices
        if result.get("kategorie") == "rechnung" and result.get("volltext"):
            try:
                items = await extract_expense_items(result["volltext"])
                if items:
                    # Get user_id for this document
                    cur2 = await db.execute("SELECT user_id FROM documents WHERE id = ?", (doc_id,))
                    doc_row = await cur2.fetchone()
                    doc_user_id = doc_row["user_id"] if doc_row else ""
                    doc_date = result.get("datum")
                    for item in items:
                        await db.execute(
                            "INSERT INTO expense_items (document_id, user_id, name, category, subcategory, price, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            (
                                doc_id,
                                doc_user_id,
                                item.get("name", ""),
                                item.get("category", "Sonstiges"),
                                item.get("subcategory"),
                                abs(float(item.get("price", 0))),
                                doc_date,
                            ),
                        )
                    await db.commit()
                    logger.info(f"[Analyse] {len(items)} expense items für Dokument {doc_id} gespeichert")
            except Exception as ei_err:
                logger.error(f"[Analyse] Expense item extraction failed for {doc_id}: {ei_err}")

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
    status: str | None = None
    notizen: str | None = None
    handlung_erledigt: bool | None = None
    tags: str | None = None
    deadline: str | None = None
    reminder_days: int | None = None

    def __init__(self, **data):
        super().__init__(**data)
        if self.notizen and len(self.notizen) > 10000:
            raise ValueError("Notizen darf maximal 10.000 Zeichen haben")
        if self.tags and len(self.tags) > 1000:
            raise ValueError("Tags darf maximal 1.000 Zeichen haben")
        if self.deadline and len(self.deadline) > 30:
            raise ValueError("Ungültiges Deadline-Format")


async def _mark_document_failed(doc_id: int, error_msg: str) -> None:
    """Last-resort: Dokument auf Status 'fehler' setzen wenn Background-Task crasht."""
    try:
        db = await get_db()
        try:
            # Nur ersten 500 Zeichen der Error-Message speichern (kein Secret-Leak in DB).
            safe_msg = (error_msg or "")[:500]
            await db.execute(
                "UPDATE documents SET status = 'fehler', analyse_fehler = ? "
                "WHERE id = ? AND status = 'analyse_laeuft'",
                (safe_msg, doc_id),
            )
            await db.commit()
        finally:
            await db.close()
    except Exception as exc:
        logger.error(f"[_mark_document_failed] Konnte Dokument {doc_id} nicht markieren: {exc}")


async def run_analysis_with_limit(doc_id: int, image_path: str, user_id: str):
    """Wrapper: check analysis limit, then run analysis and increment counter.
    Initial upload analysis always runs (user already paid/used upload quota).
    Only the usage counter increment is skipped if limit reached."""
    try:
        await check_analysis_limit(user_id)
    except HTTPException:
        logger.info(f"[Analyse] KI-Limit erreicht für User {user_id}, Analyse läuft trotzdem (Upload-Analyse)")
    await run_analysis(doc_id, image_path)
    try:
        await increment_usage(user_id, "ki_analyses_month")
        await increment_usage(user_id, "ki_analyses_total")
    except Exception as e:
        logger.error(f"[Analyse] Usage increment failed for {user_id}: {e}")


# --- Routen ---


@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...), doc_type: str = Query("standard"), user_id: str = Depends(get_current_user)
):
    # Plan enforcement: Upload-Limit prüfen
    await check_upload_limit(user_id)

    # File size limit: 50 MB
    file_content = await file.read()
    if len(file_content) > 50 * 1024 * 1024:
        raise HTTPException(413, "Datei zu groß. Maximal 50 MB erlaubt.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Nur JPG, PNG und PDF erlaubt")

    if not await asyncio.to_thread(_looks_like_allowed_upload, file_content, ext):
        raise HTTPException(400, "Ungültige oder beschädigte Datei")

    file_id = uuid.uuid4().hex[:12]
    original_name = f"{file_id}{ext}"
    original_path = ORIGINALS_DIR / original_name

    def _write_original():
        with open(original_path, "wb") as f:
            f.write(file_content)

    await asyncio.to_thread(_write_original)

    # Bild für Analyse vorbereiten
    if ext == ".pdf":
        image_name = f"{file_id}.jpg"
        image_path = ORIGINALS_DIR / image_name
        await asyncio.to_thread(pdf_to_image, str(original_path), str(image_path))
    else:
        image_path = original_path

    # Thumbnail erstellen
    thumb_name = f"{file_id}_thumb.jpg"
    thumb_path = THUMBNAILS_DIR / thumb_name
    await asyncio.to_thread(create_thumbnail, str(image_path), str(thumb_path))

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
    safe_task(
        run_analysis_with_limit(doc_id, str(image_path), user_id),
        name=f"analysis-{doc_id}",
        on_error=lambda exc: safe_task(
            _mark_document_failed(doc_id, str(exc)),
            name=f"mark-failed-{doc_id}",
        ),
    )

    return {"id": doc_id, "status": "analyse_laeuft", "dateiname": file.filename}


@app.post("/api/upload-batch")
async def upload_documents_batch(
    files: list[UploadFile] = File(...), doc_type: str = Query("standard"), user_id: str = Depends(get_current_user)
):
    """Mehrere Dokumente auf einmal hochladen. Fehler pro Datei werden isoliert."""
    results = []
    for file in files:
        try:
            await check_upload_limit(user_id)

            file_content = await file.read()
            if len(file_content) > 50 * 1024 * 1024:
                results.append({"dateiname": file.filename, "error": "Datei zu groß. Maximal 50 MB erlaubt."})
                continue

            ext = Path(file.filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                results.append({"dateiname": file.filename, "error": "Nur JPG, PNG und PDF erlaubt"})
                continue

            if not await asyncio.to_thread(_looks_like_allowed_upload, file_content, ext):
                results.append({"dateiname": file.filename, "error": "Ungültige oder beschädigte Datei"})
                continue

            file_id = uuid.uuid4().hex[:12]
            original_name = f"{file_id}{ext}"
            original_path = ORIGINALS_DIR / original_name

            def _write_original(path=original_path, data=file_content):
                with open(path, "wb") as f:
                    f.write(data)

            await asyncio.to_thread(_write_original)

            if ext == ".pdf":
                image_name = f"{file_id}.jpg"
                image_path = ORIGINALS_DIR / image_name
                await asyncio.to_thread(pdf_to_image, str(original_path), str(image_path))
            else:
                image_path = original_path

            thumb_name = f"{file_id}_thumb.jpg"
            thumb_path = THUMBNAILS_DIR / thumb_name
            await asyncio.to_thread(create_thumbnail, str(image_path), str(thumb_path))

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

            await increment_usage(user_id, "documents_total")
            safe_task(
                run_analysis_with_limit(doc_id, str(image_path), user_id),
                name=f"analysis-{doc_id}",
                on_error=lambda exc, d=doc_id: safe_task(
                    _mark_document_failed(d, str(exc)),
                    name=f"mark-failed-{d}",
                ),
            )

            results.append({"id": doc_id, "status": "analyse_laeuft", "dateiname": file.filename})

        except HTTPException as e:
            error_detail = e.detail if isinstance(e.detail, str) else e.detail.get("message", str(e.detail))
            results.append({"dateiname": file.filename, "error": error_detail})
        except Exception as e:
            logger.error(f"Batch upload error for {file.filename}: {e}")
            results.append({"dateiname": file.filename, "error": "Upload fehlgeschlagen"})

    return {"results": results}


@app.get("/api/documents")
async def list_documents(
    user_id: str = Depends(get_current_user),
    search: str | None = None,
    kategorie: str | None = None,
    handlung_erforderlich: bool | None = None,
    handlung_offen: bool | None = None,
    archiv: bool | None = None,
    status: str | None = None,
    doc_type: str | None = None,
    limit: int | None = None,
    offset: int | None = 0,
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
        cursor = await db.execute("SELECT thumbnailpfad FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
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
        await db.execute(f"UPDATE documents SET {', '.join(fields)} WHERE id = ? AND user_id = ?", params)
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
async def create_reply(
    doc_id: int, data: dict = None, target_language: str = "de", user_id: str = Depends(get_current_user)
):
    await check_analysis_limit(user_id)
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
            settings_cursor = await db.execute(
                "SELECT key, value FROM user_einstellungen WHERE user_id = ?", (user_id,)
            )
            settings_rows = await settings_cursor.fetchall()
            einstellungen = {r["key"]: r["value"] for r in settings_rows}
        except Exception:
            pass

        try:
            hints = (data or {}).get("hints", "")
            reply_type = (data or {}).get("reply_type", "allgemein")
            reply_text = await generate_reply(doc, einstellungen, target_language, hints, reply_type)
        except Exception as e:
            logger.error(f"LLM-Fehler: {e}", exc_info=True)
            raise HTTPException(502, "KI-Analyse fehlgeschlagen. Bitte versuche es erneut.")

        cursor = await db.execute(
            "INSERT INTO antworten (document_id, inhalt) VALUES (?, ?)",
            (doc_id, reply_text),
        )
        reply_id = cursor.lastrowid
        await db.commit()

        await increment_usage(user_id, "ki_analyses_month")
        await increment_usage(user_id, "ki_analyses_total")

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


# --- Todos ---


@app.get("/api/documents/{doc_id}/todos")
async def get_todos(doc_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        doc_cursor = await db.execute("SELECT id FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        if not await doc_cursor.fetchone():
            raise HTTPException(404, "Dokument nicht gefunden")
        cursor = await db.execute(
            "SELECT * FROM todos WHERE document_id = ? AND user_id = ? ORDER BY created_at ASC",
            (doc_id, user_id),
        )
        rows = await cursor.fetchall()
        return [row_to_dict(r) for r in rows]
    finally:
        await db.close()


@app.post("/api/documents/{doc_id}/todos")
async def create_todo(doc_id: int, data: dict, user_id: str = Depends(get_current_user)):
    text = data.get("text", "").strip()
    if not text:
        raise HTTPException(400, "Text darf nicht leer sein")
    if len(text) > 2000:
        raise HTTPException(400, "Text darf maximal 2.000 Zeichen haben")
    db = await get_db()
    try:
        doc_cursor = await db.execute("SELECT id FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        if not await doc_cursor.fetchone():
            raise HTTPException(404, "Dokument nicht gefunden")
        cursor = await db.execute(
            "INSERT INTO todos (document_id, user_id, text) VALUES (?, ?, ?)",
            (doc_id, user_id, text),
        )
        todo_id = cursor.lastrowid
        await db.commit()
        return {"id": todo_id, "document_id": doc_id, "text": text, "done": 0}
    finally:
        await db.close()


@app.patch("/api/todos/{todo_id}")
async def update_todo(todo_id: int, data: dict, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM todos WHERE id = ? AND user_id = ?", (todo_id, user_id))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Todo nicht gefunden")
        done = data.get("done", row["done"])
        await db.execute("UPDATE todos SET done = ? WHERE id = ?", (int(done), todo_id))
        await db.commit()
        return {"id": todo_id, "done": int(done)}
    finally:
        await db.close()


@app.delete("/api/todos/{todo_id}")
async def delete_todo(todo_id: int, user_id: str = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM todos WHERE id = ? AND user_id = ?", (todo_id, user_id))
        if not await cursor.fetchone():
            raise HTTPException(404, "Todo nicht gefunden")
        await db.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()


EINSTELLUNGEN_KEYS = ["vorname", "nachname", "adresse", "plz", "ort", "email", "telefon"]


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


@app.get("/api/intro-status")
async def get_intro_status(user_id: str = Depends(get_current_user)):
    """Check if user has seen the intro guide."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT value FROM user_einstellungen WHERE user_id = ? AND key = 'has_seen_intro'",
            (user_id,),
        )
        row = await cursor.fetchone()
        return {"has_seen_intro": row["value"] == "true" if row else False}
    finally:
        await db.close()


@app.post("/api/intro-complete")
async def mark_intro_complete(user_id: str = Depends(get_current_user)):
    """Mark intro guide as completed for this user."""
    db = await get_db()
    try:
        await db.execute(
            "INSERT OR REPLACE INTO user_einstellungen (user_id, key, value) VALUES (?, 'has_seen_intro', 'true')",
            (user_id,),
        )
        await db.commit()
        return {"status": "ok"}
    finally:
        await db.close()


@app.get("/api/status")
async def get_status():
    mistral_status = await check_mistral_status()
    return {
        "backend": "online",
        "datenbank": str(DB_PATH),
        "mistral_ai": mistral_status,
    }


# --- Ausgaben-Dashboard ---


@app.get("/api/expenses")
async def get_expenses(
    user_id: str = Depends(get_current_user),
    year: int | None = None,
    month: int | None = None,
    expense_category: str | None = None,
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


@app.get("/api/expenses/categories")
async def get_expense_categories(user_id: str = Depends(get_current_user)):
    """Alle vorhandenen Kategorien des Users (expense_items + documents fallback)."""
    await check_expenses_access(user_id)
    db = await get_db()
    try:
        # Categories from expense_items
        cursor = await db.execute(
            "SELECT DISTINCT category FROM expense_items WHERE user_id = ? ORDER BY category",
            (user_id,),
        )
        rows = await cursor.fetchall()
        result = {}
        for r in rows:
            cat = r["category"]
            cur2 = await db.execute(
                "SELECT DISTINCT subcategory FROM expense_items WHERE user_id = ? AND category = ? AND subcategory IS NOT NULL ORDER BY subcategory",
                (user_id, cat),
            )
            subs = await cur2.fetchall()
            result[cat] = [s["subcategory"] for s in subs]

        # Fallback: categories from documents without expense_items
        cur3 = await db.execute(
            """SELECT DISTINCT d.expense_category FROM documents d
               LEFT JOIN expense_items ei ON ei.document_id = d.id
               WHERE d.user_id = ? AND d.kategorie = 'rechnung'
                 AND d.betrag IS NOT NULL AND d.betrag > 0
                 AND ei.id IS NULL AND d.expense_category IS NOT NULL""",
            (user_id,),
        )
        for r in await cur3.fetchall():
            cat = r["expense_category"]
            if cat and cat not in result:
                result[cat] = []

        return {"categories": result}
    finally:
        await db.close()


@app.get("/api/expenses/items")
async def get_expense_items(
    user_id: str = Depends(get_current_user),
    category: str | None = None,
    subcategory: str | None = None,
    year: int | None = None,
    month: int | None = None,
):
    """Gefilterte Expense Items (expense_items + documents fallback)."""
    await check_expenses_access(user_id)
    db = await get_db()
    try:
        all_items = []

        # 1) Real expense_items
        query = "SELECT ei.*, d.absender FROM expense_items ei LEFT JOIN documents d ON ei.document_id = d.id WHERE ei.user_id = ?"
        params = [user_id]
        if category:
            query += " AND ei.category = ?"
            params.append(category)
        if subcategory:
            query += " AND ei.subcategory = ?"
            params.append(subcategory)
        if year:
            query += " AND CAST(strftime('%Y', ei.date) AS INTEGER) = ?"
            params.append(year)
        if month:
            query += " AND CAST(strftime('%m', ei.date) AS INTEGER) = ?"
            params.append(month)
        query += " ORDER BY ei.date DESC, ei.id DESC"
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        doc_ids_with_items = set()
        for r in rows:
            d = row_to_dict(r)
            all_items.append(d)
            doc_ids_with_items.add(d.get("document_id"))

        # 2) Fallback: documents without expense_items
        fb_query = """SELECT d.id as document_id, d.user_id, d.absender, d.betrag as price,
                             d.datum as date, d.expense_category as category, d.zusammenfassung as name
                      FROM documents d
                      LEFT JOIN expense_items ei ON ei.document_id = d.id
                      WHERE d.user_id = ? AND d.kategorie = 'rechnung'
                        AND d.betrag IS NOT NULL AND d.betrag > 0
                        AND ei.id IS NULL"""
        fb_params = [user_id]
        if category:
            fb_query += " AND d.expense_category = ?"
            fb_params.append(category)
        if year:
            fb_query += " AND CAST(strftime('%Y', d.datum) AS INTEGER) = ?"
            fb_params.append(year)
        if month:
            fb_query += " AND CAST(strftime('%m', d.datum) AS INTEGER) = ?"
            fb_params.append(month)
        fb_query += " ORDER BY d.datum DESC"
        cur2 = await db.execute(fb_query, fb_params)
        for r in await cur2.fetchall():
            d = row_to_dict(r)
            d["id"] = f"doc_{d['document_id']}"
            d["subcategory"] = None
            if not d.get("name"):
                d["name"] = d.get("absender") or "Rechnung"
            all_items.append(d)

        return {"items": all_items}
    finally:
        await db.close()


@app.get("/api/expenses/summary")
async def get_expense_summary(
    user_id: str = Depends(get_current_user),
    year: int | None = None,
    month: int | None = None,
):
    """Zusammenfassung: total, by_category, by_month (expense_items + documents fallback)."""
    await check_expenses_access(user_id)
    db = await get_db()
    try:
        all_items = []

        # 1) Real expense_items
        base = "SELECT * FROM expense_items WHERE user_id = ?"
        params = [user_id]
        if year:
            base += " AND CAST(strftime('%Y', date) AS INTEGER) = ?"
            params.append(year)
        if month:
            base += " AND CAST(strftime('%m', date) AS INTEGER) = ?"
            params.append(month)
        cursor = await db.execute(base, params)
        rows = await cursor.fetchall()
        doc_ids_with_items = set()
        for r in rows:
            d = row_to_dict(r)
            all_items.append({"price": d["price"], "category": d.get("category", "Sonstiges"), "date": d.get("date")})
            doc_ids_with_items.add(d.get("document_id"))

        # 2) Fallback: invoices from documents table without expense_items
        fb = """SELECT d.id, d.betrag, d.datum, d.expense_category
                FROM documents d
                LEFT JOIN expense_items ei ON ei.document_id = d.id
                WHERE d.user_id = ? AND d.kategorie = 'rechnung'
                  AND d.betrag IS NOT NULL AND d.betrag > 0
                  AND ei.id IS NULL"""
        fb_params = [user_id]
        if year:
            fb += " AND CAST(strftime('%Y', d.datum) AS INTEGER) = ?"
            fb_params.append(year)
        if month:
            fb += " AND CAST(strftime('%m', d.datum) AS INTEGER) = ?"
            fb_params.append(month)
        cur2 = await db.execute(fb, fb_params)
        for r in await cur2.fetchall():
            all_items.append(
                {"price": r["betrag"], "category": r["expense_category"] or "Sonstiges", "date": r["datum"]}
            )

        total = sum(i["price"] for i in all_items)
        by_category = {}
        by_month = {}
        by_day = {}
        for i in all_items:
            cat = i.get("category", "Sonstiges")
            by_category[cat] = by_category.get(cat, 0) + i["price"]
            if i.get("date"):
                m = i["date"][:7]
                by_month[m] = by_month.get(m, 0) + i["price"]
                d_key = i["date"][:10]
                by_day[d_key] = by_day.get(d_key, 0) + i["price"]

        return {
            "total": round(total, 2),
            "count": len(all_items),
            "by_category": {k: round(v, 2) for k, v in sorted(by_category.items())},
            "by_month": {k: round(v, 2) for k, v in sorted(by_month.items())},
            "by_day": {k: round(v, 2) for k, v in sorted(by_day.items())},
        }
    finally:
        await db.close()


# --- Behörden-Assistent ---


@app.get("/api/documents/{doc_id}/behoerden-results")
async def get_behoerden_results(
    doc_id: int,
    user_id: str = Depends(get_current_user),
):
    """Gespeicherte Behörden-Ergebnisse abrufen."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT erklaerung, rechtseinschaetzung, anfechtbare_elemente, widerspruchsschreiben "
            "FROM behoerden_results WHERE document_id = ? AND user_id = ?",
            (doc_id, user_id),
        )
        row = await cursor.fetchone()
        if not row:
            return {
                "erklaerung": None,
                "rechtseinschaetzung": None,
                "anfechtbare_elemente": None,
                "widerspruchsschreiben": None,
            }
        import json as _json

        ae = row["anfechtbare_elemente"]
        return {
            "erklaerung": row["erklaerung"],
            "rechtseinschaetzung": row["rechtseinschaetzung"],
            "anfechtbare_elemente": _json.loads(ae) if ae else None,
            "widerspruchsschreiben": row["widerspruchsschreiben"],
        }
    finally:
        await db.close()


async def _upsert_behoerden_result(db, doc_id: int, user_id: str, **fields):
    """Insert or update a single field in behoerden_results."""
    cursor = await db.execute(
        "SELECT id FROM behoerden_results WHERE document_id = ? AND user_id = ?",
        (doc_id, user_id),
    )
    row = await cursor.fetchone()
    if row:
        sets = ", ".join(f"{k} = ?" for k in fields)
        vals = list(fields.values()) + [doc_id, user_id]
        await db.execute(
            f"UPDATE behoerden_results SET {sets}, updated_at = datetime('now','localtime') WHERE document_id = ? AND user_id = ?",
            vals,
        )
    else:
        cols = ["document_id", "user_id"] + list(fields.keys())
        placeholders = ", ".join(["?"] * len(cols))
        vals = [doc_id, user_id] + list(fields.values())
        await db.execute(
            f"INSERT INTO behoerden_results ({', '.join(cols)}) VALUES ({placeholders})",
            vals,
        )
    await db.commit()


@app.post("/api/documents/{doc_id}/explain")
async def explain_document(
    doc_id: int,
    target_language: str = "de",
    user_id: str = Depends(get_current_user),
):
    """Behördenschreiben in einfacher Sprache erklären."""
    await check_analysis_limit(user_id)
    await check_behoerden_limit(user_id)

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT volltext, erklaerung FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")

        volltext = row["volltext"]
        if not volltext:
            raise HTTPException(400, "Dokument hat keinen extrahierten Text")

        try:
            erklaerung = await explain_authority_document(volltext, target_language)
        except Exception as e:
            logger.error(f"LLM-Fehler: {e}", exc_info=True)
            raise HTTPException(502, "KI-Analyse fehlgeschlagen. Bitte versuche es erneut.")

        # Erklärung speichern
        await db.execute(
            "UPDATE documents SET erklaerung = ? WHERE id = ? AND user_id = ?", (erklaerung, doc_id, user_id)
        )
        await _upsert_behoerden_result(db, doc_id, user_id, erklaerung=erklaerung)

        await increment_usage(user_id, "behoerden_month")

        return {"erklaerung": erklaerung, "document_id": doc_id}
    finally:
        await db.close()


@app.post("/api/documents/{doc_id}/legal-assessment")
async def legal_assessment_endpoint(
    doc_id: int,
    language: str = "de",
    user_id: str = Depends(get_current_user),
):
    """Unverbindliche Rechtseinschätzung eines Behördenschreibens."""
    await check_analysis_limit(user_id)
    await check_behoerden_limit(user_id)

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
            assessment = await legal_assessment(volltext, language)
        except Exception as e:
            logger.error(f"LLM-Fehler: {e}", exc_info=True)
            raise HTTPException(502, "KI-Analyse fehlgeschlagen. Bitte versuche es erneut.")

        await _upsert_behoerden_result(db, doc_id, user_id, rechtseinschaetzung=assessment)

        await increment_usage(user_id, "behoerden_month")

        return {"assessment": assessment, "document_id": doc_id}
    finally:
        await db.close()


@app.post("/api/documents/{doc_id}/contestable-elements")
async def contestable_elements_endpoint(
    doc_id: int,
    language: str = "de",
    user_id: str = Depends(get_current_user),
):
    """Anfechtbare Elemente eines Behördenschreibens identifizieren."""
    await check_analysis_limit(user_id)
    await check_behoerden_limit(user_id)

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
            elements = await get_contestable_elements(volltext, language)
        except Exception as e:
            logger.error(f"LLM-Fehler: {e}", exc_info=True)
            raise HTTPException(502, "KI-Analyse fehlgeschlagen. Bitte versuche es erneut.")

        import json as _json

        await _upsert_behoerden_result(
            db, doc_id, user_id, anfechtbare_elemente=_json.dumps(elements, ensure_ascii=False)
        )

        await increment_usage(user_id, "behoerden_month")

        return {"elements": elements, "document_id": doc_id}
    finally:
        await db.close()


@app.post("/api/documents/{doc_id}/generate-objection")
async def generate_objection_endpoint(
    doc_id: int,
    data: dict,
    user_id: str = Depends(get_current_user),
):
    """Widerspruchsschreiben generieren."""
    await check_behoerden_limit(user_id)

    selected_ids = data.get("selected_elements", [])
    target_language = data.get("target_language", "Deutsch")
    if not selected_ids:
        raise HTTPException(400, "Keine Elemente ausgewählt")

    db = await get_db()
    try:
        cursor = await db.execute("SELECT volltext FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "Dokument nicht gefunden")

        volltext = row["volltext"]
        if not volltext:
            raise HTTPException(400, "Dokument hat keinen extrahierten Text")

        # Get user settings for sender data (key-value table)
        settings_cur = await db.execute("SELECT key, value FROM user_einstellungen WHERE user_id = ?", (user_id,))
        settings_rows = await settings_cur.fetchall()
        s = {r["key"]: r["value"] for r in settings_rows}
        if s:
            absender_daten = f"""Name: {s.get('vorname', '')} {s.get('nachname', '')}
Adresse: {s.get('adresse', '')}, {s.get('plz', '')} {s.get('ort', '')}
Land: {s.get('land', '')}
E-Mail: {s.get('email', '')}
Telefon: {s.get('telefon', '')}"""
        else:
            absender_daten = "(Keine Absenderdaten hinterlegt)"

        selected_text = "\n".join([f"- Element {eid}" for eid in selected_ids])

        try:
            letter = await generate_objection_letter(volltext, absender_daten, selected_text, target_language)
        except Exception as e:
            logger.error(f"LLM-Fehler: {e}", exc_info=True)
            raise HTTPException(502, "KI-Analyse fehlgeschlagen. Bitte versuche es erneut.")

        await _upsert_behoerden_result(db, doc_id, user_id, widerspruchsschreiben=letter)

        await increment_usage(user_id, "behoerden_month")

        return {"letter": letter, "document_id": doc_id}
    finally:
        await db.close()


# --- Befund-Assistent ---


@app.post("/api/documents/{doc_id}/simplify")
async def simplify_document(
    doc_id: int,
    user_id: str = Depends(get_current_user),
):
    """Medizinischen Befund vereinfachen (Instanz 1)."""
    await check_analysis_limit(user_id)
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
            logger.error(f"LLM-Fehler: {e}", exc_info=True)
            raise HTTPException(502, "KI-Analyse fehlgeschlagen. Bitte versuche es erneut.")

        await db.execute(
            "UPDATE documents SET vereinfacht = ? WHERE id = ? AND user_id = ?", (vereinfacht, doc_id, user_id)
        )
        await db.commit()

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
    await check_analysis_limit(user_id)
    await check_befund_limit(user_id)
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
            logger.error(f"LLM-Fehler: {e}", exc_info=True)
            raise HTTPException(502, "KI-Analyse fehlgeschlagen. Bitte versuche es erneut.")

        # Übersetzung in befund_translations speichern
        await db.execute(
            "INSERT INTO befund_translations (document_id, target_language, translated_text) VALUES (?, ?, ?)",
            (doc_id, target_language, translated),
        )
        await db.commit()

        await increment_usage(user_id, "befund_month")

        return {"translated": translated, "target_language": target_language, "document_id": doc_id}
    finally:
        await db.close()


# --- Account Deletion ---


@app.delete("/api/account")
async def delete_account(user_id: str = Depends(get_current_user)):
    """Delete user account and all associated data."""
    db = await get_db()
    try:
        # Delete user files from disk (originals + thumbnails)
        cursor = await db.execute("SELECT originalpfad, thumbnailpfad FROM documents WHERE user_id = ?", (user_id,))
        rows = await cursor.fetchall()
        for row in rows:
            orig = ORIGINALS_DIR / row["originalpfad"]
            if orig.exists():
                os.remove(orig)
            # PDF-converted image (same base, .jpg)
            base = row["originalpfad"].rsplit(".", 1)[0]
            converted = ORIGINALS_DIR / f"{base}.jpg"
            if converted.exists() and str(converted) != str(orig):
                os.remove(converted)
            thumb = THUMBNAILS_DIR / row["thumbnailpfad"]
            if thumb.exists():
                os.remove(thumb)

        # Delete document-linked rows
        await db.execute(
            "DELETE FROM antworten WHERE document_id IN (SELECT id FROM documents WHERE user_id = ?)", (user_id,)
        )
        await db.execute(
            "DELETE FROM befund_translations WHERE document_id IN (SELECT id FROM documents WHERE user_id = ?)",
            (user_id,),
        )
        await db.execute(
            "DELETE FROM behoerden_results WHERE document_id IN (SELECT id FROM documents WHERE user_id = ?)",
            (user_id,),
        )
        await db.execute("DELETE FROM todos WHERE user_id = ?", (user_id,))
        # Delete user-owned rows
        for table in [
            "documents",
            "expense_items",
            "push_tokens",
            "user_einstellungen",
            "usage_counters",
            "subscriptions",
        ]:
            await db.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
        await db.commit()

        # Delete Supabase user
        try:
            import httpx as _httpx

            supabase_url = os.getenv("SUPABASE_URL", "")
            supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
            if supabase_url and supabase_service_key:
                async with _httpx.AsyncClient(timeout=15.0) as client:
                    await client.delete(
                        f"{supabase_url}/auth/v1/admin/users/{user_id}",
                        headers={
                            "Authorization": f"Bearer {supabase_service_key}",
                            "apikey": supabase_service_key,
                        },
                    )
        except Exception as e:
            logger.error(f"Failed to delete Supabase user {user_id}: {e}")

        logger.info(f"Account deleted: user_id={user_id}")
        return {"message": "Account gelöscht"}
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
    source = data.get("source", "web")
    return await create_checkout_session(user_id, plan, source=source)


@app.post("/api/subscription/cancel")
async def subscription_cancel(user_id: str = Depends(get_current_user)):
    """Cancel subscription."""
    return await cancel_subscription(user_id)


@app.post("/api/subscription/downgrade")
async def subscription_downgrade(data: dict, user_id: str = Depends(get_current_user)):
    """Schedule a downgrade to a lower plan."""
    target_plan = data.get("target_plan")
    return await downgrade_subscription(user_id, target_plan)


@app.post("/api/subscription/reactivate")
async def subscription_reactivate(user_id: str = Depends(get_current_user)):
    """Reactivate a cancelled subscription."""
    return await reactivate_subscription(user_id)


@app.get("/api/subscription/usage")
async def subscription_usage(user_id: str = Depends(get_current_user)):
    """Get current usage counters."""
    return await get_usage(user_id)


@app.post("/api/subscription/webhook")
async def subscription_webhook(request: Request):
    """Stripe webhook (no auth — verified via Stripe signature)."""
    return await handle_webhook(request)


# --- Support API ---

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "office@kdoc.at")


def PERMANENT_ADMIN() -> str | None:
    """First ADMIN_USER_IDS entry is the permanent admin (cannot be removed via API)."""
    return permanent_admin_id()


async def _get_support_email():
    """Get support email from DB settings, fallback to env."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT value FROM settings WHERE key = 'support_email'")
        row = await cursor.fetchone()
        return row["value"] if row else SUPPORT_EMAIL
    finally:
        await db.close()


async def _is_admin(user_id: str) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT 1 FROM admins WHERE user_id = ?", (user_id,))
        return await cursor.fetchone() is not None
    finally:
        await db.close()


async def _require_admin(user_id: str):
    if not await _is_admin(user_id):
        raise HTTPException(403, "Nur Admins haben Zugriff.")


@app.post("/api/support/ticket")
async def support_ticket(data: dict, user_id: str = Depends(get_current_user)):
    """Create a support ticket and send email."""
    priority = data.get("priority", "mittel")
    email = data.get("email", "")
    message = data.get("message", "")

    if not email or "@" not in email:
        raise HTTPException(400, "Gültige E-Mail-Adresse erforderlich.")
    if len(message) < 20:
        raise HTTPException(400, "Nachricht muss mindestens 20 Zeichen haben.")
    if len(message) > 5000:
        raise HTTPException(400, "Nachricht darf maximal 5.000 Zeichen haben.")

    priority_labels = {
        "niedrig": "NIEDRIG",
        "mittel": "MITTEL",
        "hoch": "HOCH",
        "sehr_hoch": "SEHR HOCH",
    }
    prio_label = priority_labels.get(priority, priority.upper())
    target_email = await _get_support_email()
    timestamp = datetime.now().strftime("%d.%m.%Y %H:%M:%S")

    subject = f"[KamalDoc Support] [{prio_label}] Ticket von {email}"
    body = (
        f"Priorität: {prio_label}\n"
        f"E-Mail: {email}\n"
        f"User ID: {user_id}\n"
        f"Zeitstempel: {timestamp}\n\n"
        f"Problembeschreibung:\n{message}"
    )

    # Try SMTP if configured, otherwise just log
    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg["From"] = SMTP_USER
            msg["To"] = target_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain", "utf-8"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, target_email, msg.as_string())
            logger.info(f"[Support] Ticket gesendet an {target_email} von {email}")
        except Exception as e:
            logger.error(f"[Support] SMTP Fehler: {e}")
            raise HTTPException(500, "E-Mail konnte nicht gesendet werden.")
    else:
        logger.info(f"[Support] SMTP nicht konfiguriert. Ticket:\n{subject}\n{body}")

    return {"status": "ok", "message": "Ticket erstellt"}


# --- Admin API ---


@app.get("/api/admin/check")
async def admin_check(user_id: str = Depends(get_current_user)):
    """Check if the current user is an admin."""
    return {"is_admin": await _is_admin(user_id)}


@app.get("/api/admin/list")
async def admin_list(user_id: str = Depends(get_current_user)):
    """List all admins."""
    await _require_admin(user_id)
    db = await get_db()
    try:
        cursor = await db.execute("SELECT user_id FROM admins")
        rows = await cursor.fetchall()
        admins = []
        for row in rows:
            aid = row["user_id"]
            # Try to find email from Supabase profiles or just show ID
            email_cursor = await db.execute(
                "SELECT value FROM user_einstellungen WHERE user_id = ? AND key = 'email'", (aid,)
            )
            email_row = await email_cursor.fetchone()
            admins.append(
                {
                    "user_id": aid,
                    "email": email_row["value"] if email_row else None,
                    "is_permanent": aid == PERMANENT_ADMIN(),
                }
            )
        return {"admins": admins}
    finally:
        await db.close()


@app.post("/api/admin/add")
async def admin_add(data: dict, user_id: str = Depends(get_current_user)):
    """Add a new admin by email."""
    await _require_admin(user_id)
    email = data.get("email", "").strip()
    if not email:
        raise HTTPException(400, "E-Mail erforderlich.")

    import httpx

    from auth import SUPABASE_URL

    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Search user in Supabase by email
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
            },
            params={"page": 1, "per_page": 1000},
        )
        if resp.status_code != 200:
            raise HTTPException(500, "Fehler bei der Benutzersuche.")
        users = resp.json().get("users", [])

    target = next((u for u in users if u.get("email", "").lower() == email.lower()), None)
    if not target:
        raise HTTPException(404, "Kein User mit dieser E-Mail gefunden.")

    target_id = target["id"]
    db = await get_db()
    try:
        await db.execute("INSERT OR IGNORE INTO admins (user_id) VALUES (?)", (target_id,))
        # Store email mapping for display
        await db.execute(
            "INSERT OR REPLACE INTO user_einstellungen (user_id, key, value) VALUES (?, 'email', ?)", (target_id, email)
        )
        await db.commit()
    finally:
        await db.close()

    return {"status": "ok", "user_id": target_id, "email": email}


@app.delete("/api/admin/remove")
async def admin_remove(data: dict, user_id: str = Depends(get_current_user)):
    """Remove an admin."""
    await _require_admin(user_id)
    target_id = data.get("user_id", "")
    if target_id == PERMANENT_ADMIN():
        raise HTTPException(400, "Dieser Admin kann nicht entfernt werden.")
    if not target_id:
        raise HTTPException(400, "User ID erforderlich.")

    db = await get_db()
    try:
        await db.execute("DELETE FROM admins WHERE user_id = ?", (target_id,))
        await db.commit()
    finally:
        await db.close()

    return {"status": "ok"}


@app.get("/api/admin/support-email")
async def admin_get_support_email(user_id: str = Depends(get_current_user)):
    """Get current support email."""
    await _require_admin(user_id)
    return {"email": await _get_support_email()}


@app.post("/api/admin/support-email")
async def admin_set_support_email(data: dict, user_id: str = Depends(get_current_user)):
    """Update support email."""
    await _require_admin(user_id)
    email = data.get("email", "").strip()
    if not email or "@" not in email:
        raise HTTPException(400, "Gültige E-Mail erforderlich.")

    db = await get_db()
    try:
        await db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('support_email', ?)", (email,))
        await db.commit()
    finally:
        await db.close()

    return {"status": "ok", "email": email}


@app.get("/api/admin/search-user")
async def admin_search_user(email: str = Query(...), user_id: str = Depends(get_current_user)):
    """Search user by email and return their plan."""
    await _require_admin(user_id)

    import httpx

    from auth import SUPABASE_URL

    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
            },
            params={"page": 1, "per_page": 1000},
        )
        if resp.status_code != 200:
            raise HTTPException(500, "Fehler bei der Benutzersuche.")
        users = resp.json().get("users", [])

    target = next((u for u in users if u.get("email", "").lower() == email.lower()), None)
    if not target:
        raise HTTPException(404, "Kein User mit dieser E-Mail gefunden.")

    target_id = target["id"]
    plan = await get_user_plan(target_id)

    return {"user_id": target_id, "email": target["email"], "plan": plan}


@app.post("/api/admin/change-plan")
async def admin_change_plan(data: dict, user_id: str = Depends(get_current_user)):
    """Manually change a user's plan (admin only). Supports optional duration_days for expiry."""
    await _require_admin(user_id)
    email = data.get("email", "").strip()
    new_plan = data.get("new_plan", "").strip()
    expires_at_input = data.get("expires_at")  # Optional: ISO date string YYYY-MM-DD

    if new_plan not in ("free", "basic", "pro"):
        raise HTTPException(400, "Plan muss free, basic oder pro sein.")
    if not email:
        raise HTTPException(400, "E-Mail erforderlich.")

    import httpx

    from auth import SUPABASE_URL

    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
            },
            params={"page": 1, "per_page": 1000},
        )
        if resp.status_code != 200:
            raise HTTPException(500, "Fehler bei der Benutzersuche.")
        users = resp.json().get("users", [])

    target = next((u for u in users if u.get("email", "").lower() == email.lower()), None)
    if not target:
        raise HTTPException(404, "Kein User mit dieser E-Mail gefunden.")

    target_id = target["id"]
    now = datetime.now()
    expires_at = None
    if expires_at_input and new_plan != "free":
        try:
            # Datum validieren: muss YYYY-MM-DD Format sein und in der Zukunft liegen
            expires_date = datetime.strptime(expires_at_input[:10], "%Y-%m-%d")
            if expires_date.date() < now.date():
                raise HTTPException(400, "Ablaufdatum muss in der Zukunft liegen.")
            # Auf Ende des Tages setzen (23:59:59)
            expires_at = expires_date.replace(hour=23, minute=59, second=59).isoformat()
        except HTTPException:
            raise
        except (ValueError, TypeError):
            raise HTTPException(400, "Ungültiges Datum. Format: YYYY-MM-DD.")

    db = await get_db()
    try:
        if expires_at:
            await db.execute(
                """INSERT INTO subscriptions (user_id, plan, started_at, expires_at, cancelled_at, updated_at)
                   VALUES (?, ?, ?, ?, NULL, ?)
                   ON CONFLICT(user_id) DO UPDATE SET plan = ?, pending_plan = NULL,
                   started_at = ?, expires_at = ?, cancelled_at = NULL, updated_at = ?""",
                (
                    target_id,
                    new_plan,
                    now.isoformat(),
                    expires_at,
                    now.isoformat(),
                    new_plan,
                    now.isoformat(),
                    expires_at,
                    now.isoformat(),
                ),
            )
        else:
            await db.execute(
                """INSERT INTO subscriptions (user_id, plan, updated_at)
                   VALUES (?, ?, datetime('now'))
                   ON CONFLICT(user_id) DO UPDATE SET plan = ?, pending_plan = NULL, updated_at = datetime('now')""",
                (target_id, new_plan, new_plan),
            )
        await db.commit()
    finally:
        await db.close()

    logger.info(
        f"[Admin] Plan für {email} ({target_id}) auf '{new_plan}' geändert von Admin {user_id}"
        + (f", aktiv bis {expires_at}" if expires_at else ", unbegrenzt")
    )
    return {"status": "ok", "email": email, "new_plan": new_plan, "expires_at": expires_at}


# --- Admin Finance Overview ---

USD_TO_EUR = 0.92

# Mistral pricing per 1M tokens (USD)
MISTRAL_PRICING = {
    "mistral-ocr-latest": {"combined": 2.00},  # $2.00/1M tokens (input+output)
    "mistral-small-latest": {"input": 0.10, "output": 0.30},
}


@app.get("/api/admin/finance-overview")
async def admin_finance_overview(user_id: str = Depends(get_current_user)):
    """Finance overview: Stripe revenue + Mistral costs for current month."""
    await _require_admin(user_id)

    # --- Stripe: count active subscriptions and get prices ---
    basic_price_id = os.getenv("STRIPE_BASIC_PRICE_ID", "")
    pro_price_id = os.getenv("STRIPE_PRO_PRICE_ID", "")

    basic_count = 0
    pro_count = 0
    basic_unit_price = 0.0
    pro_unit_price = 0.0

    try:
        # Count active Basic subscriptions
        basic_subs = stripe.Subscription.list(price=basic_price_id, status="active", limit=100)
        basic_count = len(basic_subs.data)
        # Paginate if needed
        while basic_subs.has_more:
            basic_subs = stripe.Subscription.list(
                price=basic_price_id, status="active", limit=100, starting_after=basic_subs.data[-1].id
            )
            basic_count += len(basic_subs.data)

        # Count active Pro subscriptions
        pro_subs = stripe.Subscription.list(price=pro_price_id, status="active", limit=100)
        pro_count = len(pro_subs.data)
        while pro_subs.has_more:
            pro_subs = stripe.Subscription.list(
                price=pro_price_id, status="active", limit=100, starting_after=pro_subs.data[-1].id
            )
            pro_count += len(pro_subs.data)

        # Get unit prices from Stripe Price API
        if basic_price_id:
            bp = stripe.Price.retrieve(basic_price_id)
            basic_unit_price = (bp.unit_amount or 0) / 100.0  # cents → EUR
        if pro_price_id:
            pp = stripe.Price.retrieve(pro_price_id)
            pro_unit_price = (pp.unit_amount or 0) / 100.0
    except Exception as e:
        logger.error(f"[Finance] Stripe error: {e}")

    basic_revenue = basic_count * basic_unit_price
    pro_revenue = pro_count * pro_unit_price
    total_revenue = basic_revenue + pro_revenue

    # --- Mistral: usage for current month from local DB ---
    now = datetime.now()
    current_month = now.strftime("%Y-%m")
    month_start = f"{current_month}-01 00:00:00"

    ocr_cost = 0.0
    small_cost = 0.0

    db = await get_db()
    try:
        # Sum OCR tokens for current month
        cursor = await db.execute(
            "SELECT COALESCE(SUM(input_tokens + output_tokens), 0) as total FROM mistral_usage WHERE model LIKE '%ocr%' AND created_at >= ?",
            (month_start,),
        )
        row = await cursor.fetchone()
        ocr_tokens = row["total"] if row else 0
        ocr_cost = (ocr_tokens / 1_000_000) * MISTRAL_PRICING["mistral-ocr-latest"]["combined"]

        # Sum small model tokens for current month
        cursor = await db.execute(
            "SELECT COALESCE(SUM(input_tokens), 0) as inp, COALESCE(SUM(output_tokens), 0) as outp FROM mistral_usage WHERE model LIKE '%small%' AND created_at >= ?",
            (month_start,),
        )
        row = await cursor.fetchone()
        if row:
            pricing = MISTRAL_PRICING["mistral-small-latest"]
            small_cost = (row["inp"] / 1_000_000) * pricing["input"] + (row["outp"] / 1_000_000) * pricing["output"]
    except Exception as e:
        logger.error(f"[Finance] Mistral DB usage error: {e}")
    finally:
        await db.close()

    # Convert USD to EUR
    ocr_cost_eur = round(ocr_cost * USD_TO_EUR, 2)
    small_cost_eur = round(small_cost * USD_TO_EUR, 2)
    total_cost_eur = round((ocr_cost + small_cost) * USD_TO_EUR, 2)

    net = round(total_revenue - total_cost_eur, 2)

    return {
        "stripe": {
            "basic_count": basic_count,
            "pro_count": pro_count,
            "basic_revenue": round(basic_revenue, 2),
            "pro_revenue": round(pro_revenue, 2),
            "total_revenue": round(total_revenue, 2),
        },
        "mistral": {
            "ocr_cost": ocr_cost_eur,
            "small_cost": small_cost_eur,
            "total_cost": total_cost_eur,
            "month": current_month,
        },
        "net": net,
    }


# --- Feature Flags ---


@app.get("/api/feature-flags")
async def get_feature_flags_public():
    """Öffentlicher Endpoint: gibt alle Feature-Flags als {key: enabled} zurück."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT key, enabled FROM feature_flags")
        rows = await cursor.fetchall()
        return {row["key"]: bool(row["enabled"]) for row in rows}
    finally:
        await db.close()


@app.get("/api/admin/feature-flags")
async def admin_get_feature_flags(user_id: str = Depends(get_current_user)):
    """Admin: alle Feature-Flags mit Timestamps."""
    await _require_admin(user_id)
    db = await get_db()
    try:
        cursor = await db.execute("SELECT key, enabled, updated_at FROM feature_flags ORDER BY key")
        rows = await cursor.fetchall()
        return {
            "flags": [{"key": r["key"], "enabled": bool(r["enabled"]), "updated_at": r["updated_at"]} for r in rows]
        }
    finally:
        await db.close()


@app.post("/api/admin/feature-flags/{key}")
async def admin_set_feature_flag(key: str, data: dict, user_id: str = Depends(get_current_user)):
    """Admin: einzelnen Feature-Flag setzen."""
    await _require_admin(user_id)
    enabled = data.get("enabled")
    if enabled is None:
        raise HTTPException(400, "enabled (true/false) erforderlich")
    db = await get_db()
    try:
        cursor = await db.execute("SELECT 1 FROM feature_flags WHERE key = ?", (key,))
        if not await cursor.fetchone():
            raise HTTPException(404, f"Feature-Flag '{key}' nicht gefunden")
        await db.execute(
            "UPDATE feature_flags SET enabled = ?, updated_at = datetime('now','localtime') WHERE key = ?",
            (1 if enabled else 0, key),
        )
        await db.commit()
        return {"key": key, "enabled": bool(enabled)}
    finally:
        await db.close()


# --- Deadline-Checker Background Job ---


async def deadline_checker_loop():
    """Background job: check deadlines + plan expiry every 6 hours."""
    while True:
        try:
            await check_deadlines()
        except Exception as e:
            logger.error(f"[Deadline-Checker] Fehler: {e}", exc_info=True)
        try:
            await check_plan_expiry()
        except Exception as e:
            logger.error(f"[Plan-Expiry] Fehler: {e}", exc_info=True)
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

            logger.info(
                f"[Deadline-Checker] Deadline-Warnung für Dokument {doc['id']}: "
                f"{doc['absender']} - Deadline: {doc['deadline']} (reminder: {reminder_days}d)"
            )

            # Token für Push-Notifications des Dokument-Besitzers holen
            token_cursor = await db.execute("SELECT token, platform FROM push_tokens WHERE user_id = ?", (user_id,))
            tokens = await token_cursor.fetchall()

            for t in tokens:
                await send_push_notification(
                    token=t["token"],
                    title=f"Deadline in Kürze: {doc.get('absender', 'Dokument')}",
                    body=doc.get("handlung_beschreibung")
                    or doc.get("zusammenfassung")
                    or f"Fällig am {doc['deadline']}",
                )

            # Als benachrichtigt markieren
            await db.execute("UPDATE documents SET deadline_notified = 1 WHERE id = ?", (doc["id"],))

        await db.commit()
        if rows:
            logger.info(f"[Deadline-Checker] {len(rows)} Deadline-Warnungen verarbeitet")
    finally:
        await db.close()


async def check_plan_expiry():
    """Check all users whose plan has expired and downgrade if no active Stripe sub."""
    now = datetime.now()
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT user_id, plan, expires_at, stripe_subscription_id, pending_plan
               FROM subscriptions
               WHERE plan IN ('basic', 'pro')
                 AND expires_at IS NOT NULL
                 AND cancelled_at IS NOT NULL""",
        )
        rows = await cursor.fetchall()
        downgraded = 0

        for row in rows:
            try:
                exp_date = datetime.fromisoformat(row["expires_at"])
                if exp_date > now:
                    continue  # Not expired yet
            except (ValueError, TypeError):
                continue

            user_id = row["user_id"]
            stripe_sub_id = row["stripe_subscription_id"]
            new_plan = row["pending_plan"] or "free"

            # If Stripe sub exists and was cancelled, Stripe handles it via webhook
            # For admin-granted plans without Stripe, downgrade directly
            if not stripe_sub_id:
                await db.execute(
                    """UPDATE subscriptions SET plan = ?, pending_plan = NULL,
                       cancelled_at = NULL, updated_at = ? WHERE user_id = ?""",
                    (new_plan, now.isoformat(), user_id),
                )
                downgraded += 1
                logger.info(f"[Plan-Expiry] User {user_id} downgraded to {new_plan} (expired {row['expires_at']})")

                # Send push notification about downgrade
                t_cursor = await db.execute("SELECT token FROM push_tokens WHERE user_id = ?", (user_id,))
                for t in await t_cursor.fetchall():
                    await send_push_notification(
                        t["token"], "Plan abgelaufen", f"Dein Plan wurde auf {new_plan.capitalize()} zurückgestuft."
                    )

        await db.commit()
        if downgraded:
            logger.info(f"[Plan-Expiry] {downgraded} Pläne heruntergestuft")
    finally:
        await db.close()


# --- FCM V1 OAuth2 Token Cache ---
# Der Access Token ist ~1h gültig; wir cachen ihn und holen ihn 5 min vor Ablauf neu.
_fcm_token_cache: dict = {"token": None, "expires_at": 0.0}

FCM_PROJECT_ID = os.getenv("FCM_PROJECT_ID", "kdoc-e0c17")
FCM_V1_URL = f"https://fcm.googleapis.com/v1/projects/{FCM_PROJECT_ID}/messages:send"


async def _get_fcm_access_token() -> str:
    """Holt einen OAuth2 Bearer Token für FCM V1 API via Service Account.

    Liest den Pfad zur Service-Account-JSON aus der Umgebungsvariable
    GOOGLE_APPLICATION_CREDENTIALS. Cached das Token bis 5 min vor Ablauf.

    Returns:
        Access token als String, oder "" wenn nicht konfiguriert.
    """
    import time

    global _fcm_token_cache

    # Cache prüfen – Token noch mindestens 5 Minuten gültig?
    if _fcm_token_cache["token"] and time.time() < _fcm_token_cache["expires_at"] - 300:
        return _fcm_token_cache["token"]

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    if not credentials_path:
        logger.warning("[Push] GOOGLE_APPLICATION_CREDENTIALS nicht gesetzt – FCM deaktiviert.")
        return ""
    if not os.path.exists(credentials_path):
        logger.error(f"[Push] Service Account Datei nicht gefunden: {credentials_path}")
        return ""

    try:
        import asyncio

        import google.auth.transport.requests
        from google.oauth2 import service_account

        SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]
        creds = service_account.Credentials.from_service_account_file(credentials_path, scopes=SCOPES)

        # google-auth ist synchron → im Thread-Pool ausführen, um den Event-Loop nicht zu blockieren
        request = google.auth.transport.requests.Request()
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, creds.refresh, request)

        _fcm_token_cache["token"] = creds.token
        # creds.expiry ist ein datetime-Objekt, Fallback: +1h ab jetzt
        _fcm_token_cache["expires_at"] = creds.expiry.timestamp() if creds.expiry else (time.time() + 3600)

        logger.info("[Push] OAuth2 Token erfolgreich erneuert.")
        return creds.token

    except Exception as e:
        logger.error(f"[Push] OAuth2 Token-Fehler: {e}", exc_info=True)
        return ""


async def send_push_notification(token: str, title: str, body: str):
    """Push-Notification via Firebase Cloud Messaging HTTP V1 API senden.

    Verwendet OAuth2 Service Account Auth (kein Legacy-Server-Key).
    Konfiguration: GOOGLE_APPLICATION_CREDENTIALS=/pfad/zum/service-account.json
                   FCM_PROJECT_ID=kdoc-e0c17  (Standard bereits gesetzt)

    Args:
        token: FCM Device-Token des Empfängers
        title: Notification-Titel
        body:  Notification-Text
    """
    access_token = await _get_fcm_access_token()
    if not access_token:
        logger.info(f"[Push] FCM nicht konfiguriert. Würde senden an {token[:20]}...: {title} – {body}")
        return

    import httpx

    payload = {
        "message": {
            "token": token,
            # notification-Block → wird von Android/iOS als System-Notification angezeigt
            "notification": {
                "title": title,
                "body": body,
            },
            # data-Block → wird auch bei Hintergrund-Notifications an die App weitergegeben
            "data": {
                "title": title,
                "body": body,
            },
            # Android-spezifische Einstellungen
            "android": {
                "priority": "HIGH",
                "notification": {
                    "sound": "default",
                    "channel_id": "kdoc_notifications",
                },
            },
            # APNs-Einstellungen für iOS (falls später benötigt)
            "apns": {
                "payload": {
                    "aps": {
                        "sound": "default",
                        "badge": 1,
                    }
                }
            },
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                FCM_V1_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=10,
            )

        if resp.status_code == 200:
            logger.info(f"[Push] ✓ Gesendet an {token[:20]}...: {title}")
        elif resp.status_code == 401:
            # Token abgelaufen → Cache leeren, damit beim nächsten Aufruf neu geholt wird
            logger.warning("[Push] OAuth2 Token abgelaufen – Cache wird geleert.")
            _fcm_token_cache["token"] = None
            _fcm_token_cache["expires_at"] = 0.0
        elif resp.status_code == 404:
            logger.warning(f"[Push] Device-Token nicht mehr gültig (404) – {token[:20]}...")
        else:
            logger.warning(f"[Push] FCM HTTP {resp.status_code}: {resp.text[:300]}")

    except Exception as e:
        logger.error(f"[Push] Sende-Fehler: {e}", exc_info=True)


# --- Support Ticket System ---

TICKET_FILES_DIR = DATA_DIR / "ticket_files"
TICKET_FILES_DIR.mkdir(parents=True, exist_ok=True)


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
MAX_TICKET_FILE_SIZE = 5 * 1024 * 1024  # 5MB


async def _save_ticket_file(file: UploadFile) -> tuple:
    """Save uploaded ticket image, return (file_name, file_path). Validates format and size."""
    ext = Path(file.filename).suffix.lower() or ".bin"
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(400, f"Nur Bilder erlaubt ({', '.join(ALLOWED_IMAGE_EXTENSIONS)})")

    content = await file.read()
    if len(content) > MAX_TICKET_FILE_SIZE:
        raise HTTPException(400, f"Datei zu groß (max. {MAX_TICKET_FILE_SIZE // (1024*1024)}MB)")

    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest = TICKET_FILES_DIR / safe_name
    with open(dest, "wb") as f:
        f.write(content)
    return (file.filename, safe_name)


@app.post("/api/tickets")
async def create_ticket(
    message: str = Form(...),
    priority: str = Form("mittel"),
    subject: str = Form(""),
    file: UploadFile = File(None),
    user_id: str = Depends(get_current_user),
):
    """Create a support ticket (multipart form)."""
    if len(message) < 10:
        raise HTTPException(400, "Nachricht muss mindestens 10 Zeichen haben.")

    file_name, file_path = None, None
    if file and file.filename:
        file_name, file_path = await _save_ticket_file(file)

    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO support_tickets (user_id, subject, message, priority, status, unread_admin)
               VALUES (?, ?, ?, ?, 'erstellt', 1)""",
            (user_id, subject, message, priority),
        )
        ticket_id = cursor.lastrowid
        await db.execute(
            "INSERT INTO ticket_messages (ticket_id, sender_type, message, file_name, file_path) VALUES (?, 'user', ?, ?, ?)",
            (ticket_id, message, file_name, file_path),
        )
        await db.commit()

        # Notify admins
        admin_cursor = await db.execute("SELECT user_id FROM admins")
        admin_rows = await admin_cursor.fetchall()
        for admin in admin_rows:
            t_cursor = await db.execute("SELECT token FROM push_tokens WHERE user_id = ?", (admin["user_id"],))
            tokens = await t_cursor.fetchall()
            for t in tokens:
                await send_push_notification(
                    t["token"], "Neues Support-Ticket", f"Priorität: {priority} — {subject or message[:60]}"
                )

        return {"status": "ok", "ticket_id": ticket_id}
    finally:
        await db.close()


@app.get("/api/tickets")
async def list_tickets(user_id: str = Depends(get_current_user)):
    """List user's tickets."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, subject, message, priority, status, unread_user, created_at, updated_at FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        )
        rows = await cursor.fetchall()
        return {"tickets": [dict(r) for r in rows]}
    finally:
        await db.close()


@app.get("/api/tickets/unread-count")
async def tickets_unread_count(user_id: str = Depends(get_current_user)):
    """Count tickets with unread updates for this user."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT COUNT(*) as cnt FROM support_tickets WHERE user_id = ? AND unread_user = 1",
            (user_id,),
        )
        row = await cursor.fetchone()
        return {"count": row["cnt"] if row else 0}
    finally:
        await db.close()


@app.get("/api/tickets/{ticket_id}")
async def get_ticket(ticket_id: int, user_id: str = Depends(get_current_user)):
    """Get ticket detail with messages."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM support_tickets WHERE id = ? AND user_id = ?",
            (ticket_id, user_id),
        )
        ticket = await cursor.fetchone()
        if not ticket:
            raise HTTPException(404, "Ticket nicht gefunden.")

        # Mark as read
        await db.execute("UPDATE support_tickets SET unread_user = 0 WHERE id = ?", (ticket_id,))
        await db.commit()

        msg_cursor = await db.execute(
            "SELECT id, sender_type, message, file_name, file_path, created_at FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC",
            (ticket_id,),
        )
        messages = []
        for m in await msg_cursor.fetchall():
            md = dict(m)
            if md.get("file_path"):
                md["file_url"] = f"/api/tickets/files/{md['file_path']}"
            messages.append(md)
        return {"ticket": dict(ticket), "messages": messages}
    finally:
        await db.close()


@app.post("/api/tickets/{ticket_id}/messages")
async def add_ticket_message(
    ticket_id: int,
    message: str = Form(""),
    file: UploadFile = File(None),
    user_id: str = Depends(get_current_user),
):
    """User adds a message to their ticket (multipart form)."""
    has_file = file and file.filename
    if not message.strip() and not has_file:
        raise HTTPException(400, "Nachricht oder Datei erforderlich.")

    file_name, file_path = None, None
    if has_file:
        file_name, file_path = await _save_ticket_file(file)

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM support_tickets WHERE id = ? AND user_id = ?",
            (ticket_id, user_id),
        )
        ticket = await cursor.fetchone()
        if not ticket:
            raise HTTPException(404, "Ticket nicht gefunden.")
        if ticket["status"] == "abgeschlossen":
            raise HTTPException(400, "Ticket ist bereits abgeschlossen.")

        await db.execute(
            "INSERT INTO ticket_messages (ticket_id, sender_type, message, file_name, file_path) VALUES (?, 'user', ?, ?, ?)",
            (ticket_id, message, file_name, file_path),
        )
        # If ticket was 'bearbeitet', move back to 'in bearbeitung'
        new_status = "in bearbeitung" if ticket["status"] == "bearbeitet" else ticket["status"]
        await db.execute(
            "UPDATE support_tickets SET status = ?, unread_admin = 1, updated_at = datetime('now','localtime') WHERE id = ?",
            (new_status, ticket_id),
        )
        await db.commit()

        # Notify admins if status changed
        if new_status != ticket["status"]:
            admin_cursor = await db.execute("SELECT user_id FROM admins")
            for admin in await admin_cursor.fetchall():
                t_cursor = await db.execute("SELECT token FROM push_tokens WHERE user_id = ?", (admin["user_id"],))
                for t in await t_cursor.fetchall():
                    await send_push_notification(
                        t["token"], "Ticket-Antwort", f"User hat auf Ticket #{ticket_id} geantwortet"
                    )

        return {"status": "ok"}
    finally:
        await db.close()


@app.post("/api/tickets/{ticket_id}/accept")
async def accept_ticket(ticket_id: int, user_id: str = Depends(get_current_user)):
    """User accepts admin solution — sets status to abgeschlossen."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM support_tickets WHERE id = ? AND user_id = ? AND status = 'bearbeitet'",
            (ticket_id, user_id),
        )
        ticket = await cursor.fetchone()
        if not ticket:
            raise HTTPException(404, "Ticket nicht gefunden oder nicht im Status 'bearbeitet'.")

        await db.execute(
            "UPDATE support_tickets SET status = 'abgeschlossen', updated_at = datetime('now','localtime') WHERE id = ?",
            (ticket_id,),
        )
        await db.commit()
        return {"status": "ok"}
    finally:
        await db.close()


@app.get("/api/tickets/files/{filename}")
async def get_ticket_file(filename: str, user_id: str = Depends(get_current_user)):
    """Serve a ticket attachment file. Accessible by ticket owner or any admin."""
    fpath = TICKET_FILES_DIR / filename
    if not fpath.exists():
        raise HTTPException(404, "Datei nicht gefunden.")
    # Verify: user owns a ticket with this file OR user is admin
    db = await get_db()
    try:
        # Check if admin
        admin_check = await db.execute("SELECT 1 FROM admins WHERE user_id = ?", (user_id,))
        is_admin = await admin_check.fetchone()
        if not is_admin:
            # Check if user owns the ticket that has this file
            owner_check = await db.execute(
                """SELECT 1 FROM ticket_messages tm
                   JOIN support_tickets st ON tm.ticket_id = st.id
                   WHERE tm.file_path = ? AND st.user_id = ?""",
                (filename, user_id),
            )
            if not await owner_check.fetchone():
                raise HTTPException(403, "Kein Zugriff auf diese Datei.")
    finally:
        await db.close()
    return FileResponse(str(fpath), filename=filename)


# --- Admin Ticket API ---


@app.get("/api/admin/tickets")
async def admin_list_tickets(user_id: str = Depends(get_current_user)):
    """Admin: list all tickets."""
    db = await get_db()
    try:
        is_admin = await db.execute("SELECT 1 FROM admins WHERE user_id = ?", (user_id,))
        if not await is_admin.fetchone():
            raise HTTPException(403, "Nur Admins haben Zugriff.")

        cursor = await db.execute(
            "SELECT id, user_id, subject, message, priority, status, unread_admin, created_at, updated_at FROM support_tickets ORDER BY CASE status WHEN 'erstellt' THEN 0 WHEN 'in bearbeitung' THEN 1 WHEN 'bearbeitet' THEN 2 ELSE 3 END, updated_at DESC"
        )
        rows = await cursor.fetchall()
        return {"tickets": [dict(r) for r in rows]}
    finally:
        await db.close()


@app.get("/api/admin/tickets/{ticket_id}")
async def admin_get_ticket(ticket_id: int, user_id: str = Depends(get_current_user)):
    """Admin: get ticket detail."""
    db = await get_db()
    try:
        is_admin = await db.execute("SELECT 1 FROM admins WHERE user_id = ?", (user_id,))
        if not await is_admin.fetchone():
            raise HTTPException(403, "Nur Admins haben Zugriff.")

        cursor = await db.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,))
        ticket = await cursor.fetchone()
        if not ticket:
            raise HTTPException(404, "Ticket nicht gefunden.")

        # Mark as read by admin
        await db.execute("UPDATE support_tickets SET unread_admin = 0 WHERE id = ?", (ticket_id,))
        await db.commit()

        msg_cursor = await db.execute(
            "SELECT id, sender_type, message, file_name, file_path, created_at FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC",
            (ticket_id,),
        )
        messages = []
        for m in await msg_cursor.fetchall():
            md = dict(m)
            if md.get("file_path"):
                md["file_url"] = f"/api/tickets/files/{md['file_path']}"
            messages.append(md)
        return {"ticket": dict(ticket), "messages": messages}
    finally:
        await db.close()


@app.post("/api/admin/tickets/{ticket_id}/close")
async def admin_close_ticket(ticket_id: int, data: dict, user_id: str = Depends(get_current_user)):
    """Admin closes ticket — sets status to 'bearbeitet', adds solution."""
    db = await get_db()
    try:
        is_admin = await db.execute("SELECT 1 FROM admins WHERE user_id = ?", (user_id,))
        if not await is_admin.fetchone():
            raise HTTPException(403, "Nur Admins haben Zugriff.")

        solution = data.get("solution", "")
        status = data.get("status", "bearbeitet")
        if status not in ("erstellt", "in bearbeitung", "bearbeitet", "abgeschlossen"):
            raise HTTPException(400, "Ungültiger Status.")

        await db.execute(
            "UPDATE support_tickets SET status = ?, admin_solution = ?, unread_user = 1, updated_at = datetime('now','localtime') WHERE id = ?",
            (status, solution, ticket_id),
        )

        # Add solution as admin message
        if solution:
            await db.execute(
                "INSERT INTO ticket_messages (ticket_id, sender_type, message) VALUES (?, 'admin', ?)",
                (ticket_id, solution),
            )

        await db.commit()

        # Push notification to user
        ticket_cursor = await db.execute("SELECT user_id FROM support_tickets WHERE id = ?", (ticket_id,))
        ticket = await ticket_cursor.fetchone()
        if ticket:
            t_cursor = await db.execute("SELECT token FROM push_tokens WHERE user_id = ?", (ticket["user_id"],))
            for t in await t_cursor.fetchall():
                await send_push_notification(
                    t["token"], "Ticket aktualisiert", f"Dein Support-Ticket #{ticket_id} wurde bearbeitet."
                )

        return {"status": "ok"}
    finally:
        await db.close()


@app.post("/api/admin/tickets/{ticket_id}/message")
async def admin_add_message(ticket_id: int, data: dict, user_id: str = Depends(get_current_user)):
    """Admin adds a message to a ticket."""
    db = await get_db()
    try:
        is_admin = await db.execute("SELECT 1 FROM admins WHERE user_id = ?", (user_id,))
        if not await is_admin.fetchone():
            raise HTTPException(403, "Nur Admins haben Zugriff.")

        message = data.get("message", "")
        if not message.strip():
            raise HTTPException(400, "Nachricht darf nicht leer sein.")

        await db.execute(
            "INSERT INTO ticket_messages (ticket_id, sender_type, message) VALUES (?, 'admin', ?)",
            (ticket_id, message),
        )
        await db.execute(
            "UPDATE support_tickets SET unread_user = 1, updated_at = datetime('now','localtime') WHERE id = ?",
            (ticket_id,),
        )
        await db.commit()

        # Push notification to user
        ticket_cursor = await db.execute("SELECT user_id FROM support_tickets WHERE id = ?", (ticket_id,))
        ticket = await ticket_cursor.fetchone()
        if ticket:
            t_cursor = await db.execute("SELECT token FROM push_tokens WHERE user_id = ?", (ticket["user_id"],))
            for t in await t_cursor.fetchall():
                await send_push_notification(
                    t["token"], "Neue Nachricht", f"Admin hat auf Ticket #{ticket_id} geantwortet."
                )

        return {"status": "ok"}
    finally:
        await db.close()


@app.delete("/api/admin/tickets/{ticket_id}")
async def admin_delete_ticket(ticket_id: int, user_id: str = Depends(get_current_user)):
    """Admin deletes a ticket and all associated messages and files."""
    db = await get_db()
    try:
        is_admin = await db.execute("SELECT 1 FROM admins WHERE user_id = ?", (user_id,))
        if not await is_admin.fetchone():
            raise HTTPException(403, "Nur Admins haben Zugriff.")

        ticket = await db.execute("SELECT id FROM support_tickets WHERE id = ?", (ticket_id,))
        if not await ticket.fetchone():
            raise HTTPException(404, "Ticket nicht gefunden.")

        # Delete associated files from disk
        file_cursor = await db.execute(
            "SELECT file_path FROM ticket_messages WHERE ticket_id = ? AND file_path IS NOT NULL",
            (ticket_id,),
        )
        for row in await file_cursor.fetchall():
            fpath = TICKET_FILES_DIR / row["file_path"]
            if fpath.exists():
                fpath.unlink()

        # Delete messages then ticket
        await db.execute("DELETE FROM ticket_messages WHERE ticket_id = ?", (ticket_id,))
        await db.execute("DELETE FROM support_tickets WHERE id = ?", (ticket_id,))
        await db.commit()
        return {"status": "ok"}
    finally:
        await db.close()


@app.get("/download/kamaldoc.apk")
async def download_apk():
    """APK-Download für Android."""
    apk_path = "/opt/kamaldoc/kamaldoc-latest.apk"
    if not os.path.exists(apk_path):
        raise HTTPException(404, "APK nicht verfügbar")
    return FileResponse(apk_path, filename="KamalDoc.apk", media_type="application/vnd.android.package-archive")
