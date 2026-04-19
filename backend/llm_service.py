import base64
import io
import json
import logging
import os
import re as _re
from datetime import datetime

import httpx
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

logger = logging.getLogger(__name__)

# Mistral AI API Configuration
MISTRAL_BASE_URL = os.getenv("MISTRAL_BASE_URL", "https://api.mistral.ai/v1")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
MISTRAL_TEXT_MODEL = os.getenv("MISTRAL_TEXT_MODEL", "mistral-small-latest")
MISTRAL_OCR_MODEL = os.getenv("MISTRAL_OCR_MODEL", "mistral-ocr-latest")


async def _log_mistral_usage(model: str, input_tokens: int, output_tokens: int):
    """Log Mistral API token usage to the database."""
    try:
        from database import get_db

        db = await get_db()
        try:
            await db.execute(
                "INSERT INTO mistral_usage (model, input_tokens, output_tokens) VALUES (?, ?, ?)",
                (model, input_tokens, output_tokens),
            )
            await db.commit()
        finally:
            await db.close()
    except Exception as e:
        logger.warning(f"[Mistral Usage] Failed to log: {e}")


# Global no-markdown instruction appended to all text prompts
NO_MARKDOWN_RULE = """
FORMATIERUNGSREGEL (STRIKT EINHALTEN):
- Verwende KEIN Markdown: kein **, kein *, kein ###, kein ---, kein ```.
- Schreibe fliessenden, gut lesbaren Klartext.
- Verwende fuer Ueberschriften eine einfache Zeile mit Doppelpunkt, z.B. "Diagnose:"
- Erklaere Fachbegriffe in Klammern, z.B. "Demyelinisierung (Schaedigung der Nervenhuellen)"
- Verwende KEINE Emojis.
- Wenn du ein Datum einsetzen musst, verwende das heutige Datum: {heute}
"""


def _build_system_msg():
    """Build a system message with current date and no-markdown rule."""
    heute = datetime.now().strftime("%d.%m.%Y")
    return {"role": "system", "content": NO_MARKDOWN_RULE.replace("{heute}", heute)}


def _build_json_system_msg():
    """Build a system message for JSON-only responses (no prose rules)."""
    return {
        "role": "system",
        "content": "Du bist ein Dokumentenanalyse-Assistent. Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein erklärender Text, keine Markdown-Formatierung, nur reines JSON.",
    }


def extract_json_from_llm_response(text: str) -> dict:
    """
    Extrahiert JSON aus LLM-Antwort robust.
    Behandelt: reines JSON, JSON in Markdown, JSON mit Text davor/danach,
    truncated JSON und trailing commas.
    """
    if not text:
        raise ValueError("Leere Antwort vom LLM")

    text = text.strip()

    # Fall 1: Direkt valides JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Fall 2: JSON in Markdown-Codeblock (```json ... ``` oder ``` ... ```)
    match = _re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, _re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Fall 3: JSON irgendwo im Text — erstes { bis letztes }
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        candidate = text[start:end]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

        # Fall 4: Trailing commas entfernen und erneut versuchen
        candidate_fixed = _re.sub(r",\s*([}\]])", r"\1", candidate)
        try:
            return json.loads(candidate_fixed)
        except json.JSONDecodeError:
            pass

        # Fall 5: Truncated JSON — schließende Klammern ergänzen
        depth = candidate_fixed.count("{") - candidate_fixed.count("}")
        if depth > 0:
            candidate_closed = candidate_fixed + ("}" * depth)
            try:
                return json.loads(candidate_closed)
            except json.JSONDecodeError:
                pass

    raise ValueError(f"Konnte kein JSON extrahieren aus LLM-Antwort (Länge {len(text)}): {text[:300]}...")


ANALYSE_PROMPT = """Du bist ein Dokumenten-Analyse-System. Analysiere den folgenden extrahierten Dokumententext und extrahiere alle relevanten Informationen.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt im folgenden Format (keine Erkl\u00e4rung, kein Markdown, nur JSON):

{
  "kategorie": "brief" | "rechnung" | "lohnzettel" | "kontoauszug" | "vertrag" | "behoerde" | "sonstiges",
  "absender": "Name/Firma des Absenders oder null",
  "empfaenger": "Name des Empf\u00e4ngers oder null",
  "datum": "YYYY-MM-DD oder null",
  "betrag": 0.00,
  "faelligkeitsdatum": "YYYY-MM-DD oder null",
  "handlung_erforderlich": true,
  "handlung_beschreibung": "Beschreibung der erforderlichen Handlung oder null",
  "zusammenfassung": "Kurze Zusammenfassung des Dokuments in 1-3 S\u00e4tzen",
  "volltext": "Vollst\u00e4ndiger extrahierter Text des Dokuments",
  "kontakt_name": "Kontaktperson oder null",
  "kontakt_adresse": "Adresse oder null",
  "kontakt_email": "E-Mail oder null",
  "kontakt_telefon": "Telefonnummer oder null",
  "dokument_sprache": "ISO 639-1 Sprachcode des Dokuments (z.B. de, en, fr, tr, ar)",
  "expense_category": "versicherung | miete | strom | internet | telefon | lebensmittel | transport | gesundheit | bildung | unterhaltung | kleidung | haushalt | steuern | gebuehren | abonnement | sonstiges | null"
}

STRIKTE KATEGORISIERUNGS-REGELN (in dieser Priorit\u00e4t pr\u00fcfen!):
1. "rechnung" \u2014 Hat das Dokument eine Rechnungsnummer, einen Zahlungsbetrag mit F\u00e4lligkeit, Bankverbindung/IBAN, Positionen/Leistungen mit Preisen, oder W\u00f6rter wie "Rechnung", "Invoice", "Fatura", "Zahlungsaufforderung", "Mahnung"? \u2192 IMMER "rechnung" verwenden, NIEMALS "brief"!
2. "lohnzettel" \u2014 Enth\u00e4lt Brutto/Netto-Gehalt, Lohnsteuer, Sozialversicherungsbeitr\u00e4ge, Arbeitgeber-/Arbeitnehmerangaben? \u2192 "lohnzettel"
3. "kontoauszug" \u2014 Kontobewegungen, Saldo, IBAN des Kontoinhabers, Banklogo? \u2192 "kontoauszug"
4. "vertrag" \u2014 Vertragsbedingungen, Unterschriftsfelder, Laufzeit, K\u00fcndigungsfristen? \u2192 "vertrag"
5. "behoerde" \u2014 Offizielles Schreiben einer Beh\u00f6rde (Finanzamt, Stadt, Gericht, Amt), Aktenzeichen, Dienstsiegel? \u2192 "behoerde"
6. "brief" \u2014 NUR wenn es ein allgemeines Schreiben OHNE Zahlungsaufforderung ist (pers\u00f6nlicher Brief, Info-Schreiben, Mitteilung). Ein Brief MIT Rechnung/Zahlungsaufforderung ist KEINE "brief" sondern "rechnung"!
7. "sonstiges" \u2014 Nur wenn nichts anderes passt

WICHTIG: Wenn ein Dokument wie ein Brief aussieht ABER eine Zahlungsaufforderung, Rechnungsnummer oder einen zu zahlenden Betrag enth\u00e4lt, ist die Kategorie IMMER "rechnung", nicht "brief"!

WICHTIGE REGELN f\u00fcr "handlung_erforderlich":
Setze "handlung_erforderlich" auf true wenn EINER dieser F\u00e4lle zutrifft:
- Rechnung/Zahlungsaufforderung \u2192 "Rechnung \u00fcber X EUR bezahlen bis [Datum]"
- Antwort/Stellungnahme erforderlich \u2192 "Antwort bis [Datum] erforderlich"
- Frist vorhanden (z.B. Widerspruchsfrist, K\u00fcndigungsfrist) \u2192 "Frist bis [Datum] beachten"
- Beh\u00f6rdenschreiben mit Aufforderung \u2192 "Unterlagen einreichen / Formular ausf\u00fcllen"
- Vertragsverl\u00e4ngerung/K\u00fcndigung \u2192 "Vertrag verl\u00e4ngert sich automatisch, K\u00fcndigung bis [Datum]"
- Termin/Einladung \u2192 "Termin am [Datum] wahrnehmen"
- Mahnung \u2192 "Offener Betrag von X EUR sofort bezahlen"

Setze "handlung_erforderlich" auf false NUR wenn das Dokument rein informativ ist (z.B. Kontoauszug, Gehaltsabrechnung ohne Nachforderung, reine Info-Post).

Im Zweifelsfall: Setze "handlung_erforderlich" auf true \u2014 es ist besser eine Aufgabe zu viel anzuzeigen als eine zu \u00fcbersehen.

AUSGABEN-KATEGORISIERUNG f\u00fcr "expense_category":
- Nur setzen wenn kategorie="rechnung" ist, sonst null
- "versicherung" \u2014 Krankenversicherung, KFZ-Versicherung, Haftpflicht, Lebensversicherung
- "miete" \u2014 Miete, Nebenkosten, Betriebskosten, Hausverwaltung
- "strom" \u2014 Strom, Gas, Energie, Heizung
- "internet" \u2014 Internet, Breitband, WLAN
- "telefon" \u2014 Mobilfunk, Festnetz, Telefonrechnung
- "gesundheit" \u2014 Arzt, Apotheke, Krankenhaus, Medikamente
- "transport" \u2014 \u00d6ffentlicher Verkehr, Tanken, KFZ-Steuer, Werkstatt
- "steuern" \u2014 Einkommensteuer, Lohnsteuer, Vorschreibung Finanzamt
- "gebuehren" \u2014 Beh\u00f6rdengeb\u00fchren, Kontof\u00fchrung, Bankgeb\u00fchren
- "abonnement" \u2014 Streaming, Zeitschriften, Software-Abos
- "haushalt" \u2014 M\u00f6bel, Reparaturen, Reinigung
- "bildung" \u2014 Schule, Universit\u00e4t, Kurse, Lehrmaterial
- "sonstiges" \u2014 Alles andere was eine Rechnung ist aber in keine Kategorie passt

Weitere Regeln:
- Setze "betrag" auf null wenn kein Betrag erkennbar ist
- Erkenne die Sprache des Dokuments und setze "dokument_sprache" auf den ISO 639-1 Code
- Alle Analyse-Texte (zusammenfassung, handlung_beschreibung) auf Deutsch
- Nur valides JSON ausgeben, keine weiteren Zeichen
- Kein Markdown, keine Erkl\u00e4rung, NUR das JSON-Objekt
- Verwende KEINE Emojis in den JSON-Werten (zusammenfassung, handlung_beschreibung, etc.)
- Schreibe handlung_beschreibung als einfachen deutschen Klartext ohne Sonderzeichen"""

ANTWORT_PROMPT_TEMPLATE = """Du bist ein Assistent, der Antwortbriefe verfasst.

Hier sind die Informationen zum erhaltenen Dokument:
- Absender: {absender}
- Datum: {datum}
- Zusammenfassung: {zusammenfassung}
- Erforderliche Handlung: {handlung_beschreibung}
- Volltext: {volltext}

{absender_info}

Verfasse einen h\u00f6flichen, formellen Antwortbrief auf {target_language_name}. Der Brief soll:
1. Sich auf das Originaldokument beziehen
2. Die erforderliche Handlung adressieren
3. Professionell und freundlich formuliert sein
4. Das aktuelle Datum verwenden
5. KOMPLETT in {target_language_name} geschrieben sein

Schreibe nur den Brieftext, keine Erkl\u00e4rungen.

WICHTIG: Verwende KEIN Markdown (kein **, kein ###, kein ---). Schreibe reinen Klartext.
Verwende KEINE Emojis. Wenn du ein Datum brauchst, das heutige Datum ist {{heute}}."""


def normalize_image(image_path: str, max_size: int = 1920) -> bytes:
    """Bild normalisieren: max Gr\u00f6\u00dfe, JPEG-Format."""
    with Image.open(image_path) as img:
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        ratio = min(max_size / img.width, max_size / img.height)
        if ratio < 1:
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        return buffer.getvalue()


def image_to_base64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")


def strip_markdown(text: str) -> str:
    """Remove common markdown formatting as safety net."""
    if not text:
        return text
    # Remove bold/italic markers
    text = _re.sub(r"\*{1,3}(.+?)\*{1,3}", r"\1", text)
    # Remove heading markers
    text = _re.sub(r"^#{1,6}\s+", "", text, flags=_re.MULTILINE)
    # Remove horizontal rules
    text = _re.sub(r"^-{3,}$", "", text, flags=_re.MULTILINE)
    text = _re.sub(r"^\*{3,}$", "", text, flags=_re.MULTILINE)
    # Remove code fences (but keep content)
    text = _re.sub(r"```[a-z]*\n?", "", text)
    return text.strip()


# --- Shared helper: call Mistral chat completions ---


async def _mistral_chat(
    messages: list, model: str = None, temperature: float = 0.3, max_tokens: int = 4096, timeout: float = 120.0
) -> str:
    """Send a chat completion request to Mistral AI and return the content."""
    if not MISTRAL_API_KEY:
        raise ValueError("MISTRAL_API_KEY Umgebungsvariable nicht gesetzt")

    use_model = model or MISTRAL_TEXT_MODEL
    payload = {
        "model": use_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{MISTRAL_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    # Track token usage
    usage = data.get("usage", {})
    if usage:
        await _log_mistral_usage(use_model, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))

    return data["choices"][0]["message"]["content"]


# --- OCR via Mistral OCR model ---


async def _mistral_ocr(image_path: str) -> str:
    """Extract text from a document image using Mistral OCR endpoint (/v1/ocr)."""
    if not MISTRAL_API_KEY:
        raise ValueError("MISTRAL_API_KEY Umgebungsvariable nicht gesetzt")

    image_bytes = normalize_image(image_path)
    b64 = image_to_base64(image_bytes)

    payload = {
        "model": MISTRAL_OCR_MODEL,
        "document": {"type": "image_url", "image_url": f"data:image/jpeg;base64,{b64}"},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{MISTRAL_BASE_URL}/ocr",
            headers={
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    # Track token usage (OCR uses combined input+output billing)
    usage = data.get("usage", {})
    total_tokens = usage.get("total_tokens", 0) or usage.get("pages_processed", len(data.get("pages", []))) * 1000
    if total_tokens or usage:
        await _log_mistral_usage(MISTRAL_OCR_MODEL, total_tokens, 0)

    # OCR endpoint returns pages with markdown content
    pages = data.get("pages", [])
    ocr_text = "\n\n".join(p.get("markdown", "") for p in pages).strip()
    if not ocr_text:
        # Fallback: try top-level text field
        ocr_text = data.get("text", "") or json.dumps(data)
    logger.info(f"[Mistral OCR] Extracted {len(ocr_text)} chars from {len(pages)} pages")
    return ocr_text


# --- Status check ---


async def check_mistral_status() -> dict:
    """Mistral AI API Status pr\u00fcfen."""
    if not MISTRAL_API_KEY:
        return {"verbunden": False, "fehler": "MISTRAL_API_KEY nicht gesetzt"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{MISTRAL_BASE_URL}/models", headers={"Authorization": f"Bearer {MISTRAL_API_KEY}"}
            )
            if resp.status_code == 200:
                data = resp.json()
                models = [m["id"] for m in data.get("data", [])][:10]
                return {
                    "verbunden": True,
                    "modelle": models,
                    "url": MISTRAL_BASE_URL,
                    "text_model": MISTRAL_TEXT_MODEL,
                    "ocr_model": MISTRAL_OCR_MODEL,
                }
            return {"verbunden": False, "fehler": f"Status {resp.status_code}"}
    except Exception as e:
        return {"verbunden": False, "fehler": str(e)}


# --- Document analysis (two-step: OCR then analyze) ---


async def ocr_image(image_path: str) -> str:
    """Public wrapper for OCR on a single image. Returns extracted text."""
    return await _mistral_ocr(image_path)


async def analyze_document(image_path: str) -> dict:
    """Dokument via Mistral AI analysieren (Schritt 1: OCR, Schritt 2: Analyse)."""
    # Step 1: OCR \u2014 extract text from document image
    ocr_text = await _mistral_ocr(image_path)
    logger.info(f"[Mistral OCR] Text preview: {ocr_text[:300]}")
    return await _analyze_from_ocr_text(ocr_text)


async def analyze_document_from_text(ocr_text: str) -> dict:
    """Analyse with pre-extracted OCR text (for multi-page documents)."""
    logger.info(f"[Mistral OCR multi-page] Total text length: {len(ocr_text)}, preview: {ocr_text[:300]}")
    return await _analyze_from_ocr_text(ocr_text)


async def _analyze_from_ocr_text(ocr_text: str) -> dict:
    """Internal: analyze pre-extracted OCR text with LLM."""

    # Step 2: Analyze extracted text with text model
    messages = [
        _build_json_system_msg(),
        {"role": "user", "content": f"{ANALYSE_PROMPT}\n\nDokumententext:\n---\n{ocr_text}\n---"},
    ]
    content = await _mistral_chat(messages, temperature=0.1, max_tokens=4096)
    logger.info(f"[LLM RAW Response] length={len(content)}, preview={content[:500]}")

    # JSON aus der Antwort extrahieren (robust)
    try:
        result = extract_json_from_llm_response(content)
    except ValueError:
        logger.error(f"[LLM Parse Error] Vollständige Antwort:\n{content}")
        raise

    # Use OCR text as volltext if the LLM didn't include it or returned a short summary
    if not result.get("volltext") or len(result.get("volltext", "")) < len(ocr_text) * 0.5:
        result["volltext"] = ocr_text

    # Sicherstellen dass handlung_erforderlich ein Boolean ist
    he = result.get("handlung_erforderlich")
    if isinstance(he, str):
        result["handlung_erforderlich"] = he.lower() in ("true", "1", "ja", "yes")
    elif he is None:
        result["handlung_erforderlich"] = False

    logger.info(
        f"[LLM Parsed] kategorie={result.get('kategorie')}, "
        f"handlung_erforderlich={result.get('handlung_erforderlich')}, "
        f"handlung_beschreibung={result.get('handlung_beschreibung')}, "
        f"absender={result.get('absender')}, "
        f"betrag={result.get('betrag')}"
    )

    return result


# --- Expense items extraction ---

EXPENSE_ITEMS_PROMPT = """Analysiere diese Rechnung und extrahiere ALLE einzelnen Positionen.
F\u00fcr jede Position gib zur\u00fcck:
- name: genaue Bezeichnung des Artikels/der Leistung
- category: Oberkategorie (Lebensmittel, Telekommunikation, Versicherung, Energie, Miete, Transport, Gesundheit, Unterhaltung, Haushalt, Bildung, Kleidung, Abonnement, Steuern, Gebuehren, Sonstiges)
- subcategory: Unterkategorie falls m\u00f6glich (z.B. Milchprodukte, Mobilfunk, Haftpflicht, etc.)
- price: Preis in Euro als Zahl (positiv)

Wenn nur ein Gesamtbetrag ohne Einzelpositionen erkennbar ist, erstelle EINE Position mit dem Gesamtbetrag.

Antworte NUR mit JSON:
{"items": [{"name": "...", "category": "...", "subcategory": "...", "price": 0.00}]}"""


async def extract_expense_items(volltext: str) -> list:
    """Einzelne Positionen aus einer Rechnung extrahieren."""
    if not MISTRAL_API_KEY or not volltext:
        return []

    try:
        messages = [
            _build_json_system_msg(),
            {"role": "user", "content": f"{EXPENSE_ITEMS_PROMPT}\n\nRechnungstext:\n{volltext}"},
        ]
        content = await _mistral_chat(messages, temperature=0.1, max_tokens=4096)

        result = extract_json_from_llm_response(content)
        items = result.get("items", [])
        logger.info(f"[ExpenseItems] Extracted {len(items)} items")
        return items
    except Exception as e:
        logger.error(f"[ExpenseItems] Extraction failed: {e}")
        return []


# Mapping language codes to full language names for the prompt
LANGUAGE_NAMES = {
    "de": "Deutsch",
    "en": "English",
    "es": "Espa\u00f1ol",
    "fr": "Fran\u00e7ais",
    "ar": "\u0627\u0644\u0639\u0631\u0628\u064a\u0629 (Arabic)",
    "pt": "Portugu\u00eas",
    "tr": "T\u00fcrk\u00e7e",
    "it": "Italiano",
    "pl": "Polski",
    "bs": "Bosanski",
    "hr": "Hrvatski",
    "sr": "Srpski",
    "cs": "\u010ce\u0161tina",
    "sk": "Sloven\u010dina",
    "sl": "Sloven\u0161\u010dina",
    "nl": "Nederlands",
    "ru": "\u0420\u0443\u0441\u0441\u043a\u0438\u0439 (Russian)",
    "uk": "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430 (Ukrainian)",
    "ro": "Rom\u00e2n\u0103",
    "hu": "Magyar",
    "bg": "\u0411\u044a\u043b\u0433\u0430\u0440\u0441\u043a\u0438 (Bulgarian)",
    "el": "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac (Greek)",
    "sv": "Svenska",
    "no": "Norsk",
    "da": "Dansk",
    "fi": "Suomi",
    "hi": "\u0939\u093f\u0928\u094d\u0926\u0940 (Hindi)",
    "zh": "\u4e2d\u6587 (Chinese)",
    "ja": "\u65e5\u672c\u8a9e (Japanese)",
    "ko": "\ud55c\uad6d\uc5b4 (Korean)",
    "id": "Indonesian",
    "sw": "Kiswahili",
    "vi": "Ti\u1ebfng Vi\u1ec7t",
    "th": "\u0e44\u0e17\u0e22 (Thai)",
    "tl": "Tagalog",
    "af": "Afrikaans",
    "ca": "Catal\u00e0",
    "eu": "Euskara",
    "gl": "Galego",
    "et": "Eesti",
    "lv": "Latvie\u0161u",
    "lt": "Lietuvi\u0173",
    "mk": "\u041c\u0430\u043a\u0435\u0434\u043e\u043d\u0441\u043a\u0438 (Macedonian)",
    "sq": "Shqip",
    "be": "\u0411\u0435\u043b\u0430\u0440\u0443\u0441\u043a\u0430\u044f (Belarusian)",
    "kk": "\u049a\u0430\u0437\u0430\u049b\u0448\u0430 (Kazakh)",
    "az": "Az\u0259rbaycanca",
    "ka": "\u10e5\u10d0\u10e0\u10d7\u10e3\u10da\u10d8 (Georgian)",
    "hy": "\u0540\u0561\u0575\u0565\u0580\u0565\u0576 (Armenian)",
    "he": "\u05e2\u05d1\u05e8\u05d9\u05ea (Hebrew)",
}


# --- Reply generation ---

ANTWORTTYP_PROMPTS = {
    "allgemein": "",
    "kuendigung": "Schreibe eine formelle Kündigung des Vertrags/der Vereinbarung. Der Brief soll klar und eindeutig die Kündigung aussprechen, das Kündigungsdatum nennen und um Bestätigung bitten.",
    "zahlungsbestaetigung": "Schreibe eine Zahlungsbestätigung für den genannten Betrag. Der Brief soll den bezahlten Betrag, das Zahlungsdatum und die Zahlungsmethode erwähnen.",
    "reklamation": "Schreibe eine professionelle Reklamation/Beschwerde. Der Brief soll das Problem klar beschreiben, eine Frist für die Lösung setzen und auf die Rechte des Verbrauchers hinweisen.",
}


async def generate_reply(
    document: dict,
    einstellungen: dict = None,
    target_language: str = "de",
    hints: str = "",
    reply_type: str = "allgemein",
) -> str:
    """Antwortbrief via Mistral AI generieren."""
    target_language_name = LANGUAGE_NAMES.get(target_language, "Deutsch")

    if einstellungen and any(einstellungen.values()):
        name = f"{einstellungen.get('vorname', '')} {einstellungen.get('nachname', '')}".strip()
        adresse = einstellungen.get("adresse", "")
        plz_ort = f"{einstellungen.get('plz', '')} {einstellungen.get('ort', '')}".strip()
        email = einstellungen.get("email", "")
        telefon = einstellungen.get("telefon", "")
        parts = ["Verwende folgende Absenderdaten f\u00fcr den Brief:"]
        if name:
            parts.append(f"- Name: {name}")
        if adresse:
            parts.append(f"- Adresse: {adresse}")
        if plz_ort:
            parts.append(f"- PLZ/Ort: {plz_ort}")
        if email:
            parts.append(f"- E-Mail: {email}")
        if telefon:
            parts.append(f"- Telefon: {telefon}")
        absender_info = "\n".join(parts)
    else:
        absender_info = "Verwende Platzhalter [IHR NAME] und [IHRE ADRESSE] f\u00fcr die eigenen Absenderdaten."

    # Antworttyp-Zusatz (Kündigung, Zahlungsbestätigung, Reklamation, ...)
    typ_text = ANTWORTTYP_PROMPTS.get(reply_type, "")
    typ_instruction = f"\n\n**ANTWORTTYP:** {typ_text}" if typ_text else ""

    hints_text = (
        f'\n\n**WICHTIG - H\u00d6CHSTE PRIORIT\u00c4T** Der Benutzer hat folgende Kontext-Hinweise/Anweisungen gegeben, die UNBEDINGT im Brief ber\u00fccksichtigt und umgesetzt werden M\u00dcSSEN:\n"{hints}"\n\nDiese Anweisungen haben Vorrang vor allen anderen Informationen. Der generierte Brief MUSS den Inhalt dieser Hinweise widerspiegeln.'
        if hints
        else ""
    )
    prompt = (
        ANTWORT_PROMPT_TEMPLATE.format(
            absender=document.get("absender", "Unbekannt"),
            datum=document.get("datum", "Unbekannt"),
            zusammenfassung=document.get("zusammenfassung", ""),
            handlung_beschreibung=document.get("handlung_beschreibung", ""),
            volltext=document.get("volltext", ""),
            absender_info=absender_info,
            target_language_name=target_language_name,
        )
        + typ_instruction
        + hints_text
    )

    heute = datetime.now().strftime("%d.%m.%Y")
    prompt = prompt.replace("{heute}", heute)
    # Strong language override (models weight final instructions highest)
    if target_language != "de":
        prompt += f"\n\nSPRACHE: Der gesamte Brief MUSS vollstaendig in {target_language_name} verfasst sein. Kein einziges Wort auf Deutsch. Sprache: {target_language_name}."

    messages = [_build_system_msg(), {"role": "user", "content": prompt}]
    result = await _mistral_chat(messages, temperature=0.7, max_tokens=2048)
    return strip_markdown(result)


# --- Beh\u00f6rden-Assistent ---

BEHOERDE_PROMPT = """Du bist ein Experte f\u00fcr \u00f6sterreichische, deutsche und Schweizer Beh\u00f6rdenschreiben.

Der Benutzer hat ein Beh\u00f6rdenschreiben hochgeladen. Hier ist der vollst\u00e4ndige Text:

---
{volltext}
---

Deine Aufgabe:
1. Erkl\u00e4re den Inhalt des Schreibens in einfacher, verst\u00e4ndlicher Sprache.
2. Verwende kurze S\u00e4tze und vermeide Fachbegriffe \u2013 oder erkl\u00e4re sie in Klammern.
3. Erkl\u00e4re was das Schreiben bedeutet, was der Empf\u00e4nger tun muss, und bis wann.
4. Wenn Fristen, Betr\u00e4ge oder Aktenzeichen vorkommen, hebe diese hervor.
5. Strukturiere deine Erkl\u00e4rung mit klaren Abs\u00e4tzen.
6. Antworte auf {target_language_name}.

Schreibe NUR die Erkl\u00e4rung, keine Einleitung wie "Hier ist die Erkl\u00e4rung".

WICHTIG: Verwende KEIN Markdown (kein **, kein ###, kein ---). Schreibe reinen, fliessenden Klartext. Verwende fuer Ueberschriften einfache Zeilen mit Doppelpunkt. Verwende KEINE Emojis."""


async def explain_authority_document(volltext: str, target_language: str = "de") -> str:
    """Beh\u00f6rdenschreiben in einfacher Sprache erkl\u00e4ren."""
    target_language_name = LANGUAGE_NAMES.get(target_language, "Deutsch")
    prompt = BEHOERDE_PROMPT.format(volltext=volltext, target_language_name=target_language_name)
    # Strong language override for non-German
    if target_language != "de":
        prompt += f"\n\nSPRACHE: Die gesamte Erklaerung MUSS vollstaendig in {target_language_name} verfasst sein. Kein einziges Wort auf Deutsch. Sprache: {target_language_name}."

    messages = [_build_system_msg(), {"role": "user", "content": prompt}]
    result = await _mistral_chat(messages, temperature=0.3, max_tokens=3000)
    return strip_markdown(result)


# --- Befund-Assistent ---

BEFUND_SIMPLIFY_PROMPT = """Du bist ein erfahrener Arzt, der einem Patienten seinen Befund in einfachen Worten erklaert. Dein Ton ist warm, verstaendlich und beruhigend.

Hier ist der medizinische Text:

---
{volltext}
---

Deine Aufgabe:
1. Erklaere den gesamten Befund in einfacher, fliessender Sprache — so als wuerdest du einem Patienten gegenuebersitzen.
2. Uebersetze JEDEN medizinischen Fachbegriff und schreibe die Erklaerung in Klammern dahinter.
   Beispiele: "Demyelinisierung (Schaedigung der Nervenhuellen)", "Hypertonie (Bluthochdruck)", "Anaemie (Blutarmut, zu wenig rote Blutkoerperchen)"
3. Erklaere Laborwerte: was sie messen und ob die Werte normal, erhoeht oder niedrig sind.
4. Verwende kurze, klare Saetze und einen warmen, verstaendlichen Ton.
5. Strukturiere den Text mit einfachen Ueberschriften gefolgt von Doppelpunkt, z.B. "Untersuchungsergebnisse:" — KEIN Markdown.
6. Schreibe auf Deutsch.

FORMATIERUNG (STRIKT):
- KEIN Markdown: kein **, kein *, kein ###, kein ---, kein ```
- KEINE Emojis
- Ueberschriften als einfache Zeile mit Doppelpunkt
- Fliessender Klartext, gut lesbar auch ohne Formatierung

Schreibe NUR den vereinfachten Text, keine Einleitung wie 'Hier ist die Vereinfachung'."""

BEFUND_TRANSLATE_PROMPT = """\u00dcbersetze den folgenden vereinfachten medizinischen Text vollst\u00e4ndig in {target_language_name}.
Behalte die Struktur und Formatierung bei. \u00dcbersetze ALLES, auch Erkl\u00e4rungen in Klammern.

Text:
---
{text}
---

Schreibe NUR die \u00dcbersetzung, nichts anderes.

WICHTIG: Verwende KEIN Markdown (kein **, kein ###, kein ---). Schreibe reinen Klartext. Verwende KEINE Emojis."""


async def simplify_medical_report(volltext: str) -> str:
    """Medizinischen Befund in einfache Sprache \u00fcbersetzen (Instanz 1)."""
    prompt = BEFUND_SIMPLIFY_PROMPT.format(volltext=volltext)
    messages = [_build_system_msg(), {"role": "user", "content": prompt}]
    result = await _mistral_chat(messages, temperature=0.2, max_tokens=4000)
    return strip_markdown(result)


async def translate_simplified_report(text: str, target_language: str = "de") -> str:
    """Vereinfachten Befund in Zielsprache \u00fcbersetzen (Instanz 2)."""
    if target_language == "de":
        return text  # Bereits auf Deutsch

    target_language_name = LANGUAGE_NAMES.get(target_language, "Deutsch")
    prompt = BEFUND_TRANSLATE_PROMPT.format(text=text, target_language_name=target_language_name)
    # Strong language override
    prompt += f"\n\nSPRACHE: Der gesamte Text MUSS vollstaendig in {target_language_name} uebersetzt sein. Kein einziges Wort auf Deutsch. Sprache: {target_language_name}."

    messages = [_build_system_msg(), {"role": "user", "content": prompt}]
    result = await _mistral_chat(messages, temperature=0.3, max_tokens=4000)
    return strip_markdown(result)


# --- Beh\u00f6rden-Assistent: Rechtseinsch\u00e4tzung ---

LEGAL_ASSESSMENT_PROMPT = """Du bist ein rechtlicher Assistent f\u00fcr \u00d6sterreich, Deutschland und die Schweiz.
Analysiere dieses Beh\u00f6rdenschreiben rechtlich:

---
{volltext}
---

1. Um welche Art von Schreiben handelt es sich rechtlich?
2. Welche Rechte hat der Empf\u00e4nger?
3. Welche Fristen sind zu beachten?
4. Welche Gesetze/Paragraphen sind relevant?
5. Was sind die empfohlenen n\u00e4chsten Schritte?

Antworte auf Deutsch, klar und verst\u00e4ndlich.
Strukturiere deine Antwort mit folgenden Abschnitten (als einfache Zeile mit Doppelpunkt, KEIN Markdown):
Rechtliche Einordnung:
Rechte des Empfaengers:
Fristen:
Relevante Gesetze:
Empfohlene naechste Schritte:

WICHTIG: Weise am Ende darauf hin, dass dies eine KI-Einschaetzung ist und keine professionelle Rechtsberatung ersetzt.

FORMATIERUNG: Verwende KEIN Markdown (kein **, kein ###, kein ---). Schreibe reinen Klartext. Verwende KEINE Emojis."""


async def legal_assessment(volltext: str, language: str = "de") -> str:
    """Rechtliche Einsch\u00e4tzung eines Beh\u00f6rdenschreibens."""
    lang_name = LANGUAGE_NAMES.get(language, "Deutsch")
    prompt = LEGAL_ASSESSMENT_PROMPT.format(volltext=volltext)
    if language != "de":
        prompt += f"\n\nSPRACHE: Die gesamte Antwort MUSS vollstaendig in {lang_name} verfasst sein. Kein einziges Wort auf Deutsch. Sprache: {lang_name}."
    messages = [_build_system_msg(), {"role": "user", "content": prompt}]
    result = await _mistral_chat(messages, temperature=0.3, max_tokens=4000)
    return strip_markdown(result)


# --- Beh\u00f6rden-Assistent: Anfechtbare Elemente ---

CONTESTABLE_ELEMENTS_PROMPT = """Du bist ein rechtlicher Assistent f\u00fcr \u00d6sterreich, Deutschland und die Schweiz.
Analysiere dieses Beh\u00f6rdenschreiben und identifiziere ALLE Elemente, die angefochten, widersprochen oder eingesprochen werden k\u00f6nnten:

---
{volltext}
---

Antworte AUSSCHLIESSLICH mit einem JSON-Array. Jedes Element hat:
- "id": fortlaufende Nummer (1, 2, 3, ...)
- "element": Kurzbezeichnung (z.B. "Bescheiddatum", "Betrag", "Berechnung", "Frist", "Rechtsgrundlage")
- "description": Konkreter Wert/Text aus dem Dokument
- "reason": Begr\u00fcndung warum dieses Element anfechtbar sein k\u00f6nnte

Beispiel:
[
  {{"id": 1, "element": "Betrag", "description": "340,00 EUR", "reason": "Berechnung unklar, keine Aufschl\u00fcsselung vorhanden"}},
  {{"id": 2, "element": "Frist", "description": "14 Tage", "reason": "M\u00f6glicherweise zu kurz bemessen"}}
]

Antworte NUR mit dem JSON-Array, kein anderer Text."""


async def get_contestable_elements(volltext: str, language: str = "de") -> list:
    """Anfechtbare Elemente aus Beh\u00f6rdenschreiben extrahieren."""
    lang_name = LANGUAGE_NAMES.get(language, "Deutsch")
    prompt = CONTESTABLE_ELEMENTS_PROMPT.format(volltext=volltext)
    if language != "de":
        prompt += f"\n\nAntworte auf {lang_name}, aber behalte das JSON-Format bei."

    # Strong language override for non-German
    if language != "de":
        prompt += f"\n\nSPRACHE: Schreibe die reason-Felder vollstaendig in {lang_name}. Sprache: {lang_name}."

    messages = [_build_system_msg(), {"role": "user", "content": prompt}]
    content = await _mistral_chat(messages, temperature=0.2, max_tokens=3000)

    import re

    try:
        match = re.search(r"\[.*\]", content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return json.loads(content)
    except (json.JSONDecodeError, TypeError):
        return []


# --- Beh\u00f6rden-Assistent: Widerspruchsschreiben ---

OBJECTION_LETTER_PROMPT = """Du bist ein rechtlicher Assistent f\u00fcr \u00d6sterreich, Deutschland und die Schweiz.
Erstelle ein professionelles Widerspruchsschreiben (Einspruch/Beschwerde) basierend auf dem folgenden Beh\u00f6rdenschreiben.

Originaldokument:
---
{volltext}
---

Absenderdaten des Widerspruchsf\u00fchrers:
{absender_daten}

Folgende Elemente sollen angefochten werden:
{selected_elements}

Erstelle ein f\u00f6rmliches Widerspruchsschreiben mit:
1. Korrektem Briefkopf (Absender oben, Empf\u00e4nger darunter)
2. Datum und Betreff mit Aktenzeichen (falls vorhanden)
3. F\u00f6rmliche Anrede
4. Einleitung mit Bezug auf den Bescheid
5. F\u00fcr JEDES ausgew\u00e4hlte Element: rechtliche Begr\u00fcndung des Widerspruchs
6. Antrag (was genau beantragt wird)
7. Fristsetzung f\u00fcr Antwort
8. F\u00f6rmlicher Abschluss mit Unterschriftszeile

Verwende korrekte rechtliche Formulierungen passend f\u00fcr AT/DE/CH.
Schreibe das gesamte Widerspruchsschreiben auf {target_language}.

WICHTIG: Gib NUR das fertige Widerspruchsschreiben aus. KEIN zus\u00e4tzlicher Text danach.
KEINE Erkl\u00e4rungen, KEINE Meta-Kommentare, KEINE Hinweise wie "Bitte beachten Sie, dass...",
KEIN Text nach der Grussformel und Unterschriftszeile. Das Schreiben endet mit der Unterschriftszeile.

FORMATIERUNG: Verwende KEIN Markdown (kein **, kein ###, kein ---). Schreibe reinen Klartext. Verwende KEINE Emojis."""


async def generate_objection_letter(
    volltext: str, absender_daten: str, selected_elements: str, target_language: str = "Deutsch"
) -> str:
    """Widerspruchsschreiben generieren."""
    prompt = OBJECTION_LETTER_PROMPT.format(
        volltext=volltext,
        absender_daten=absender_daten,
        selected_elements=selected_elements,
        target_language=target_language,
    )
    # Strong language override for non-German
    if target_language != "Deutsch":
        prompt += f"\n\nSPRACHE: Das gesamte Schreiben MUSS vollstaendig in {target_language} verfasst sein. Kein einziges Wort auf Deutsch. Sprache: {target_language}."

    messages = [_build_system_msg(), {"role": "user", "content": prompt}]
    result = await _mistral_chat(messages, temperature=0.3, max_tokens=5000)
    return strip_markdown(result)
