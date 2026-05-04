"""Cross-source search."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from kdoc.auth.jwks import get_current_user
from kdoc.db.models import DocAnalysis, Document
from kdoc.db.session import get_db

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str
    sources: list[str] = ["documents", "emails", "tasks"]
    limit: int = 30


class SearchHit(BaseModel):
    kind: str  # document | email | task
    id: str
    title: str
    snippet: str | None = None
    source_label: str | None = None


class SearchResponse(BaseModel):
    hits: list[SearchHit]


@router.post("", response_model=SearchResponse)
async def search(
    payload: SearchRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hits: list[SearchHit] = []
    q = f"%{payload.query.lower()}%"

    if "documents" in payload.sources:
        stmt = (
            select(Document, DocAnalysis)
            .outerjoin(DocAnalysis, DocAnalysis.document_id == Document.id)
            .where(Document.user_id == user_id)
            .where(or_(
                Document.original_filename.ilike(q),
                DocAnalysis.full_text.ilike(q),
                DocAnalysis.sender.ilike(q),
                DocAnalysis.ai_summary.ilike(q),
            ))
            .limit(payload.limit)
        )
        rows = (await db.execute(stmt)).all()
        for d, a in rows:
            snippet = (a.ai_summary or a.full_text or d.original_filename) if a else d.original_filename
            if snippet and len(snippet) > 180:
                snippet = snippet[:180] + "…"
            hits.append(SearchHit(
                kind="document",
                id=d.id,
                title=(a.sender if a and a.sender else d.original_filename),
                snippet=snippet,
                source_label=f"kdoc-Dokumente · {d.created_at.strftime('%d.%m.%Y') if d.created_at else ''}",
            ))

    # TODO: email search via Connector-MCP (Phase 4)
    # TODO: task search

    return SearchResponse(hits=hits)
