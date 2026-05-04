"""Tool endpoints: translate, reply, befund, rechtshilfe, phishing.
All wired to Mistral with stub fallback when no API key is set."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from kdoc.auth.jwks import get_current_user
from kdoc.db.base import new_id
from kdoc.db.models import (
    BefundSimplification,
    DocAnalysis,
    Document,
    PhishingCheck,
    RechtshilfeResult,
    Reply,
    Translation,
)
from kdoc.db.session import get_db
from kdoc.llm import mistral_client, prompts
from kdoc.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["tools"])


def _mistral_ready() -> bool:
    return bool(settings.mistral_api_key)


# ---------- TRANSLATE ----------

class TranslateRequest(BaseModel):
    target_language: str


class TranslateResponse(BaseModel):
    id: str
    target_language: str
    translated_text: str


@router.post("/documents/{doc_id}/translate", response_model=TranslateResponse)
async def translate(
    doc_id: str,
    payload: TranslateRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if not doc or doc.user_id != user_id:
        raise HTTPException(404, "Not found")
    a = await db.get(DocAnalysis, doc_id)
    text = (a.full_text if a else None) or "(Original-Text noch nicht extrahiert)"

    if _mistral_ready():
        try:
            translated = await mistral_client.chat(
                messages=[
                    {"role": "system", "content": prompts.TRANSLATE_SYSTEM},
                    {"role": "user", "content": prompts.translate_user(text, payload.target_language)},
                ],
                temperature=0.2,
            )
        except Exception as e:
            logger.warning("Translate failed, returning stub: %s", e)
            translated = f"[Stub-Übersetzung in {payload.target_language}] {text[:200]}"
    else:
        translated = f"[Stub-Übersetzung in {payload.target_language}] {text[:200]}"

    t = Translation(
        id=new_id(),
        document_id=doc_id,
        source_language=doc.detected_language or "de",
        target_language=payload.target_language,
        translated_text=translated,
    )
    db.add(t)
    await db.commit()
    return TranslateResponse(id=t.id, target_language=t.target_language, translated_text=translated)


# ---------- REPLY ----------

class ReplyRequest(BaseModel):
    topics: list[str] = []
    instruction: str = ""
    tone: str = "formal"
    language: str = "de"


class ReplyResponse(BaseModel):
    id: str
    body: str


@router.post("/documents/{doc_id}/reply", response_model=ReplyResponse)
async def reply(
    doc_id: str,
    payload: ReplyRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if not doc or doc.user_id != user_id:
        raise HTTPException(404, "Not found")
    a = await db.get(DocAnalysis, doc_id)
    summary = (a.ai_summary if a else None) or "(Zusammenfassung noch nicht erstellt)"

    if _mistral_ready():
        try:
            body = await mistral_client.chat(
                messages=[
                    {"role": "system", "content": prompts.REPLY_SYSTEM},
                    {
                        "role": "user",
                        "content": prompts.reply_user(
                            document_summary=summary,
                            sender_data={"name": "{Profil-Daten hier einfügen}"},
                            topics=payload.topics,
                            instruction=payload.instruction,
                            tone=payload.tone,
                            language=payload.language,
                        ),
                    },
                ],
                temperature=0.5,
            )
        except Exception as e:
            logger.warning("Reply failed, stub: %s", e)
            body = "[Stub-Antwortbrief]\n\nSehr geehrte Damen und Herren, …"
    else:
        body = "[Stub-Antwortbrief]\n\nSehr geehrte Damen und Herren, …"

    r = Reply(
        id=new_id(),
        document_id=doc_id,
        user_id=user_id,
        topic_keywords={"topics": payload.topics},
        user_instruction=payload.instruction,
        body=body,
        tone=payload.tone,
        language=payload.language,
    )
    db.add(r)
    await db.commit()
    return ReplyResponse(id=r.id, body=body)


# ---------- BEFUND ----------

class BefundRequest(BaseModel):
    language: str = "de"


class BefundResponse(BaseModel):
    id: str
    language: str
    what_was_examined: str
    what_was_found: str
    what_it_means: str


@router.post("/documents/{doc_id}/befund", response_model=BefundResponse)
async def befund(
    doc_id: str,
    payload: BefundRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if not doc or doc.user_id != user_id:
        raise HTTPException(404, "Not found")
    a = await db.get(DocAnalysis, doc_id)
    text = (a.full_text if a else None) or "(Befundtext noch nicht extrahiert)"

    parsed: dict = {}
    if _mistral_ready():
        try:
            raw = await mistral_client.chat(
                messages=[
                    {"role": "system", "content": prompts.BEFUND_SYSTEM},
                    {"role": "user", "content": prompts.befund_user(text, payload.language)},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            parsed = mistral_client.extract_json(raw)
        except Exception as e:
            logger.warning("Befund failed, stub: %s", e)

    if not parsed:
        parsed = {
            "what_was_examined": "(Stub) Eine MRT-Aufnahme der linken Schulter.",
            "what_was_found": "(Stub) Eine kleine Reizung der Sehne, die deinen Oberarm hebt.",
            "what_it_means": "(Stub) Mit Schonung in 4-6 Wochen wieder gut. Sprich mit deinem Arzt.",
        }

    b = BefundSimplification(
        id=new_id(),
        document_id=doc_id,
        language=payload.language,
        what_was_examined=parsed.get("what_was_examined"),
        what_was_found=parsed.get("what_was_found"),
        what_it_means=parsed.get("what_it_means"),
        raw_text=text,
    )
    db.add(b)
    await db.commit()
    return BefundResponse(
        id=b.id,
        language=payload.language,
        what_was_examined=b.what_was_examined or "",
        what_was_found=b.what_was_found or "",
        what_it_means=b.what_it_means or "",
    )


# ---------- RECHTSHILFE ----------

class RechtshilfeRequest(BaseModel):
    jurisdiction: str = "AT"  # AT | DE | CH
    language: str = "de"


class RechtshilfeResponse(BaseModel):
    id: str
    jurisdiction: str
    conformity_score: int
    conformity_label: str
    issues: list[dict]
    contestable: bool


@router.post("/documents/{doc_id}/rechtshilfe", response_model=RechtshilfeResponse)
async def rechtshilfe(
    doc_id: str,
    payload: RechtshilfeRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.jurisdiction not in ("AT", "DE", "CH"):
        raise HTTPException(400, "jurisdiction must be AT, DE or CH")

    doc = await db.get(Document, doc_id)
    if not doc or doc.user_id != user_id:
        raise HTTPException(404, "Not found")
    a = await db.get(DocAnalysis, doc_id)
    text = (a.full_text if a else None) or "(Text noch nicht extrahiert)"

    parsed: dict = {}
    if _mistral_ready():
        try:
            raw = await mistral_client.chat(
                messages=[
                    {
                        "role": "system",
                        "content": prompts.RECHTSHILFE_SYSTEM.format(jurisdiction=payload.jurisdiction),
                    },
                    {
                        "role": "user",
                        "content": prompts.rechtshilfe_user(text, payload.language, payload.jurisdiction),
                    },
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            parsed = mistral_client.extract_json(raw)
        except Exception as e:
            logger.warning("Rechtshilfe failed, stub: %s", e)

    if not parsed:
        parsed = {
            "conformity_score": 78,
            "conformity_label": "Weitgehend konform",
            "issues": [
                {"severity": "warn", "title": "Rückzahlungsfrist", "text": "14 Tage sind kürzer als § 1417 ABGB üblich.", "citation": "§ 1417 ABGB"},
                {"severity": "ok", "title": "Widerrufsbelehrung", "text": "Vorhanden und korrekt.", "citation": None},
            ],
            "contestable": True,
        }

    r = RechtshilfeResult(
        id=new_id(),
        document_id=doc_id,
        jurisdiction=payload.jurisdiction,
        language=payload.language,
        conformity_score=int(parsed.get("conformity_score", 0)),
        conformity_label=parsed.get("conformity_label"),
        issues=parsed.get("issues", []),
        contestable=bool(parsed.get("contestable", False)),
    )
    db.add(r)
    await db.commit()
    return RechtshilfeResponse(
        id=r.id,
        jurisdiction=r.jurisdiction,
        conformity_score=r.conformity_score,
        conformity_label=r.conformity_label or "",
        issues=r.issues or [],
        contestable=r.contestable,
    )


# ---------- PHISHING ----------

class PhishingResponse(BaseModel):
    id: str
    risk_score: int
    verdict: str
    headline: str
    explanation: str
    reasoning: list[dict]


@router.post("/phishing/check", response_model=PhishingResponse)
async def phishing_check(
    file: UploadFile | None = File(None),
    text: str | None = None,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept an uploaded file or plain text and check for phishing indicators."""
    if not file and not text:
        raise HTTPException(400, "Provide either `file` or `text`")

    content = text or ""
    if file:
        raw = await file.read()
        # Attempt simple text extraction; for PDFs/images we'd need OCR — stub for now
        try:
            content = raw.decode("utf-8", errors="ignore")
        except Exception:
            content = "(binary)"

    parsed: dict = {}
    if _mistral_ready() and content.strip():
        try:
            raw_resp = await mistral_client.chat(
                messages=[
                    {"role": "system", "content": prompts.PHISHING_SYSTEM},
                    {"role": "user", "content": prompts.phishing_user(content)},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            parsed = mistral_client.extract_json(raw_resp)
        except Exception as e:
            logger.warning("Phishing check failed, stub: %s", e)

    if not parsed:
        parsed = {
            "risk_score": 18,
            "verdict": "phishing",
            "headline": "Wahrscheinlich Phishing",
            "explanation": "(Stub) Mehrere klassische Indikatoren erkannt.",
            "reasoning": [
                {"type": "red", "category": "sender", "title": "Absender-Domain weicht ab", "text": "post@bankkund3n-service.com statt @meinebank.at"},
                {"type": "red", "category": "urgency", "title": "Druckaufbau durch Frist", "text": "'Konto wird in 24 h gesperrt'"},
                {"type": "red", "category": "links", "title": "Verdächtiger Link", "text": "tinyurl.com/meinebank-login statt offizielle Domain"},
                {"type": "green", "category": "language", "title": "Anrede ist persönlich", "text": "Voller Name enthalten"},
            ],
        }

    p = PhishingCheck(
        id=new_id(),
        user_id=user_id,
        document_id=None,
        risk_score=int(parsed.get("risk_score", 50)),
        verdict=parsed.get("verdict", "suspicious"),
        reasoning=parsed.get("reasoning", []),
    )
    db.add(p)
    await db.commit()
    return PhishingResponse(
        id=p.id,
        risk_score=p.risk_score,
        verdict=p.verdict,
        headline=parsed.get("headline", ""),
        explanation=parsed.get("explanation", ""),
        reasoning=p.reasoning or [],
    )
