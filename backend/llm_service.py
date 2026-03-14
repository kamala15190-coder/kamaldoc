import base64
import json
import httpx
import os
from pathlib import Path
from PIL import Image
import io
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Together.ai API Configuration
TOGETHER_API_URL = "https://api.together.xyz/v1"
TOGETHER_MODEL = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY", "")

ANALYSE_PROMPT = """Du bist ein Dokumenten-Analyse-System. Analysiere das folgende Dokument-Bild und extrahiere alle relevanten Informationen.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt im folgenden Format (keine Erklärung, kein Markdown, nur JSON):

{
  "kategorie": "brief" | "rechnung" | "lohnzettel" | "kontoauszug" | "vertrag" | "behoerde" | "sonstiges",
  "absender": "Name/Firma des Absenders oder null",
  "empfaenger": "Name des Empfängers oder null",
  "datum": "YYYY-MM-DD oder null",
  "betrag": 0.00,
  "faelligkeitsdatum": "YYYY-MM-DD oder null",
  "handlung_erforderlich": true,
  "handlung_beschreibung": "Beschreibung der erforderlichen Handlung oder null",
  "zusammenfassung": "Kurze Zusammenfassung des Dokuments in 1-3 Sätzen",
  "volltext": "Vollständiger extrahierter Text des Dokuments",
  "kontakt_name": "Kontaktperson oder null",
  "kontakt_adresse": "Adresse oder null",
  "kontakt_email": "E-Mail oder null",
  "kontakt_telefon": "Telefonnummer oder null",
  "dokument_sprache": "ISO 639-1 Sprachcode des Dokuments (z.B. de, en, fr, tr, ar)"
}

STRIKTE KATEGORISIERUNGS-REGELN (in dieser Priorität prüfen!):
1. "rechnung" — Hat das Dokument eine Rechnungsnummer, einen Zahlungsbetrag mit Fälligkeit, Bankverbindung/IBAN, Positionen/Leistungen mit Preisen, oder Wörter wie "Rechnung", "Invoice", "Fatura", "Zahlungsaufforderung", "Mahnung"? → IMMER "rechnung" verwenden, NIEMALS "brief"!
2. "lohnzettel" — Enthält Brutto/Netto-Gehalt, Lohnsteuer, Sozialversicherungsbeiträge, Arbeitgeber-/Arbeitnehmerangaben? → "lohnzettel"
3. "kontoauszug" — Kontobewegungen, Saldo, IBAN des Kontoinhabers, Banklogo? → "kontoauszug"
4. "vertrag" — Vertragsbedingungen, Unterschriftsfelder, Laufzeit, Kündigungsfristen? → "vertrag"
5. "behoerde" — Offizielles Schreiben einer Behörde (Finanzamt, Stadt, Gericht, Amt), Aktenzeichen, Dienstsiegel? → "behoerde"
6. "brief" — NUR wenn es ein allgemeines Schreiben OHNE Zahlungsaufforderung ist (persönlicher Brief, Info-Schreiben, Mitteilung). Ein Brief MIT Rechnung/Zahlungsaufforderung ist KEINE "brief" sondern "rechnung"!
7. "sonstiges" — Nur wenn nichts anderes passt

WICHTIG: Wenn ein Dokument wie ein Brief aussieht ABER eine Zahlungsaufforderung, Rechnungsnummer oder einen zu zahlenden Betrag enthält, ist die Kategorie IMMER "rechnung", nicht "brief"!

WICHTIGE REGELN für "handlung_erforderlich":
Setze "handlung_erforderlich" auf true wenn EINER dieser Fälle zutrifft:
- Rechnung/Zahlungsaufforderung → "Rechnung über X EUR bezahlen bis [Datum]"
- Antwort/Stellungnahme erforderlich → "Antwort bis [Datum] erforderlich"
- Frist vorhanden (z.B. Widerspruchsfrist, Kündigungsfrist) → "Frist bis [Datum] beachten"
- Behördenschreiben mit Aufforderung → "Unterlagen einreichen / Formular ausfüllen"
- Vertragsverlängerung/Kündigung → "Vertrag verlängert sich automatisch, Kündigung bis [Datum]"
- Termin/Einladung → "Termin am [Datum] wahrnehmen"
- Mahnung → "Offener Betrag von X EUR sofort bezahlen"

Setze "handlung_erforderlich" auf false NUR wenn das Dokument rein informativ ist (z.B. Kontoauszug, Gehaltsabrechnung ohne Nachforderung, reine Info-Post).

Im Zweifelsfall: Setze "handlung_erforderlich" auf true — es ist besser eine Aufgabe zu viel anzuzeigen als eine zu übersehen.

Weitere Regeln:
- Setze "betrag" auf null wenn kein Betrag erkennbar ist
- Erkenne die Sprache des Dokuments und setze "dokument_sprache" auf den ISO 639-1 Code
- Alle Analyse-Texte (zusammenfassung, handlung_beschreibung) auf Deutsch
- Nur valides JSON ausgeben, keine weiteren Zeichen
- Kein Markdown, keine Erklärung, NUR das JSON-Objekt"""

ANTWORT_PROMPT_TEMPLATE = """Du bist ein Assistent, der Antwortbriefe verfasst.

Hier sind die Informationen zum erhaltenen Dokument:
- Absender: {absender}
- Datum: {datum}
- Zusammenfassung: {zusammenfassung}
- Erforderliche Handlung: {handlung_beschreibung}
- Volltext: {volltext}

{absender_info}

Verfasse einen höflichen, formellen Antwortbrief auf {target_language_name}. Der Brief soll:
1. Sich auf das Originaldokument beziehen
2. Die erforderliche Handlung adressieren
3. Professionell und freundlich formuliert sein
4. Das aktuelle Datum verwenden
5. KOMPLETT in {target_language_name} geschrieben sein

Schreibe nur den Brieftext, keine Erklärungen."""


def normalize_image(image_path: str, max_size: int = 1920) -> bytes:
    """Bild normalisieren: max Größe, JPEG-Format."""
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


async def check_together_status() -> dict:
    """Together.ai API Status prüfen."""
    if not TOGETHER_API_KEY:
        return {"verbunden": False, "fehler": "TOGETHER_API_KEY nicht gesetzt"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{TOGETHER_API_URL}/models",
                headers={"Authorization": f"Bearer {TOGETHER_API_KEY}"}
            )
            if resp.status_code == 200:
                data = resp.json()
                models = [m["id"] for m in data if "llama" in m.get("id", "").lower()][:5]
                return {
                    "verbunden": True,
                    "modelle": models,
                    "url": TOGETHER_API_URL,
                    "model": TOGETHER_MODEL,
                }
            return {"verbunden": False, "fehler": f"Status {resp.status_code}"}
    except Exception as e:
        return {"verbunden": False, "fehler": str(e)}


async def analyze_document(image_path: str) -> dict:
    """Dokument via Together.ai Vision-API analysieren."""
    if not TOGETHER_API_KEY:
        raise ValueError("TOGETHER_API_KEY Umgebungsvariable nicht gesetzt")
    
    image_bytes = normalize_image(image_path)
    b64 = image_to_base64(image_bytes)

    payload = {
        "model": TOGETHER_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": ANALYSE_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64}"
                        },
                    },
                ],
            }
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{TOGETHER_API_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {TOGETHER_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    content = data["choices"][0]["message"]["content"]
    logger.info(f"[LLM RAW Response] {content[:500]}")

    # JSON aus der Antwort extrahieren
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
        content = content.strip()

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        # Versuche JSON aus dem Text zu extrahieren
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(content[start:end])
        else:
            raise ValueError(f"Konnte kein JSON aus LLM-Antwort extrahieren: {content[:200]}")

    # Sicherstellen dass handlung_erforderlich ein Boolean ist
    he = result.get("handlung_erforderlich")
    if isinstance(he, str):
        result["handlung_erforderlich"] = he.lower() in ("true", "1", "ja", "yes")
    elif he is None:
        result["handlung_erforderlich"] = False

    logger.info(f"[LLM Parsed] kategorie={result.get('kategorie')}, "
                f"handlung_erforderlich={result.get('handlung_erforderlich')}, "
                f"handlung_beschreibung={result.get('handlung_beschreibung')}, "
                f"absender={result.get('absender')}, "
                f"betrag={result.get('betrag')}")

    return result


# Mapping language codes to full language names for the prompt
LANGUAGE_NAMES = {
    "de": "Deutsch", "en": "English", "es": "Español", "fr": "Français",
    "ar": "العربية (Arabic)", "pt": "Português", "tr": "Türkçe", "it": "Italiano",
    "pl": "Polski", "bs": "Bosanski", "hr": "Hrvatski", "sr": "Srpski",
    "cs": "Čeština", "sk": "Slovenčina", "sl": "Slovenščina", "nl": "Nederlands",
    "ru": "Русский (Russian)", "uk": "Українська (Ukrainian)", "ro": "Română",
    "hu": "Magyar", "bg": "Български (Bulgarian)", "el": "Ελληνικά (Greek)",
    "sv": "Svenska", "no": "Norsk", "da": "Dansk", "fi": "Suomi",
    "hi": "हिन्दी (Hindi)", "zh": "中文 (Chinese)", "ja": "日本語 (Japanese)",
    "ko": "한국어 (Korean)", "id": "Indonesian", "sw": "Kiswahili",
    "vi": "Tiếng Việt", "th": "ไทย (Thai)", "tl": "Tagalog",
    "af": "Afrikaans", "ca": "Català", "eu": "Euskara", "gl": "Galego",
    "et": "Eesti", "lv": "Latviešu", "lt": "Lietuvių",
    "mk": "Македонски (Macedonian)", "sq": "Shqip",
    "be": "Беларуская (Belarusian)", "kk": "Қазақша (Kazakh)",
    "az": "Azərbaycanca", "ka": "ქართული (Georgian)",
    "hy": "Հայերեն (Armenian)", "he": "עברית (Hebrew)",
}


async def generate_reply(document: dict, einstellungen: dict = None, target_language: str = "de") -> str:
    """Antwortbrief via Together.ai LLM generieren."""
    if not TOGETHER_API_KEY:
        raise ValueError("TOGETHER_API_KEY Umgebungsvariable nicht gesetzt")
    
    target_language_name = LANGUAGE_NAMES.get(target_language, "Deutsch")
    
    if einstellungen and any(einstellungen.values()):
        name = f"{einstellungen.get('vorname', '')} {einstellungen.get('nachname', '')}".strip()
        adresse = einstellungen.get('adresse', '')
        plz_ort = f"{einstellungen.get('plz', '')} {einstellungen.get('ort', '')}".strip()
        email = einstellungen.get('email', '')
        telefon = einstellungen.get('telefon', '')
        parts = [f"Verwende folgende Absenderdaten für den Brief:"]
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
        absender_info = "Verwende Platzhalter [IHR NAME] und [IHRE ADRESSE] für die eigenen Absenderdaten."

    prompt = ANTWORT_PROMPT_TEMPLATE.format(
        absender=document.get("absender", "Unbekannt"),
        datum=document.get("datum", "Unbekannt"),
        zusammenfassung=document.get("zusammenfassung", ""),
        handlung_beschreibung=document.get("handlung_beschreibung", ""),
        volltext=document.get("volltext", ""),
        absender_info=absender_info,
        target_language_name=target_language_name,
    )

    payload = {
        "model": TOGETHER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{TOGETHER_API_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {TOGETHER_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    return data["choices"][0]["message"]["content"]
