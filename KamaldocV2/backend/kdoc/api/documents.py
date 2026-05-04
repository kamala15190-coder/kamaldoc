"""Documents API — upload, list, detail, delete. Stub-friendly for V2 testing."""
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from kdoc.auth.jwks import get_current_user
from kdoc.db.base import new_id
from kdoc.db.models import DocAnalysis, Document
from kdoc.db.session import get_db

router = APIRouter(prefix="/api/documents", tags=["documents"])

STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "storage/documents"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


class DocumentSummary(BaseModel):
    id: str
    original_filename: str
    mime_type: str
    size_bytes: int
    page_count: int
    status: str
    detected_language: str | None = None
    uploaded_at: datetime
    category: str | None = None
    sender: str | None = None
    amount: float | None = None
    due_date: str | None = None
    ai_summary: str | None = None


class DocumentDetail(DocumentSummary):
    full_text: str | None = None
    iban: str | None = None
    contact_email: str | None = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentSummary]
    total: int


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
    status_filter: str | None = None,
    category: str | None = None,
):
    stmt = select(Document).where(Document.user_id == user_id)
    if status_filter:
        stmt = stmt.where(Document.status == status_filter)
    stmt = stmt.order_by(desc(Document.created_at)).limit(limit).offset(offset)

    result = await db.execute(stmt)
    docs = result.scalars().all()

    summaries: list[DocumentSummary] = []
    for d in docs:
        a = await db.get(DocAnalysis, d.id)
        if category and (not a or a.category != category):
            continue
        summaries.append(
            DocumentSummary(
                id=d.id,
                original_filename=d.original_filename,
                mime_type=d.mime_type,
                size_bytes=d.size_bytes,
                page_count=d.page_count,
                status=d.status,
                detected_language=d.detected_language,
                uploaded_at=d.created_at,
                category=a.category if a else None,
                sender=a.sender if a else None,
                amount=a.amount if a else None,
                due_date=a.due_date.isoformat() if a and a.due_date else None,
                ai_summary=a.ai_summary if a else None,
            )
        )
    return DocumentListResponse(documents=summaries, total=len(summaries))


@router.post("", response_model=DocumentSummary)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(400, "Missing filename")

    doc_id = new_id()
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    storage_key = f"{user_id}/{doc_id}__{safe_name}"
    target = STORAGE_DIR / storage_key
    target.parent.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    target.write_bytes(content)

    doc = Document(
        id=doc_id,
        user_id=user_id,
        source="upload",
        original_filename=safe_name,
        storage_key=storage_key,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
        page_count=1,
        status="queued",
    )
    db.add(doc)
    await db.commit()

    # NOTE: in production this would enqueue an Arq job for OCR + analysis.
    # For now we just create the record; analysis can be triggered manually
    # via /api/documents/{id}/analyze (TODO).

    return DocumentSummary(
        id=doc.id,
        original_filename=doc.original_filename,
        mime_type=doc.mime_type,
        size_bytes=doc.size_bytes,
        page_count=doc.page_count,
        status=doc.status,
        detected_language=None,
        uploaded_at=doc.created_at,
    )


@router.get("/{doc_id}", response_model=DocumentDetail)
async def get_document(
    doc_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if not doc or doc.user_id != user_id:
        raise HTTPException(404, "Not found")
    a = await db.get(DocAnalysis, doc.id)
    return DocumentDetail(
        id=doc.id,
        original_filename=doc.original_filename,
        mime_type=doc.mime_type,
        size_bytes=doc.size_bytes,
        page_count=doc.page_count,
        status=doc.status,
        detected_language=doc.detected_language,
        uploaded_at=doc.created_at,
        category=a.category if a else None,
        sender=a.sender if a else None,
        amount=a.amount if a else None,
        due_date=a.due_date.isoformat() if a and a.due_date else None,
        ai_summary=a.ai_summary if a else None,
        full_text=a.full_text if a else None,
        iban=a.iban if a else None,
        contact_email=a.contact_email if a else None,
    )


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if not doc or doc.user_id != user_id:
        raise HTTPException(404, "Not found")
    target = STORAGE_DIR / doc.storage_key
    if target.exists():
        target.unlink()
    await db.delete(doc)
    await db.commit()
    return {"ok": True}
