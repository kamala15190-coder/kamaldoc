"""Doka KI-Chat API. Streaming via SSE; multi-turn tool loop.

V2 ships with a basic conversation persistence + a Mistral-backed reply.
MCP tool integration will be added in Phase 4.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from kdoc.auth.jwks import get_current_user
from kdoc.db.base import new_id
from kdoc.db.models import DokaConversation, DokaMessage
from kdoc.db.session import get_db
from kdoc.llm import mistral_client, prompts
from kdoc.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/doka", tags=["doka"])


class ConversationOut(BaseModel):
    id: str
    title: str | None = None


class MessageIn(BaseModel):
    content: str


class MessageOut(BaseModel):
    id: str
    role: str
    content: str


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(DokaConversation).where(DokaConversation.user_id == user_id)
    result = await db.execute(stmt)
    return [ConversationOut.model_validate(c, from_attributes=True) for c in result.scalars().all()]


@router.post("/conversations", response_model=ConversationOut)
async def create_conversation(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = DokaConversation(id=new_id(), user_id=user_id, title=None)
    db.add(c)
    await db.commit()
    return ConversationOut(id=c.id, title=c.title)


@router.post("/conversations/{conv_id}/messages", response_model=list[MessageOut])
async def send_message(
    conv_id: str,
    payload: MessageIn,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await db.get(DokaConversation, conv_id)
    if not c or c.user_id != user_id:
        raise HTTPException(404, "Conversation not found")

    user_msg = DokaMessage(
        id=new_id(),
        conversation_id=conv_id,
        role="user",
        content=payload.content,
    )
    db.add(user_msg)
    await db.flush()

    # Build chat history
    stmt = select(DokaMessage).where(DokaMessage.conversation_id == conv_id).order_by(DokaMessage.created_at)
    history = (await db.execute(stmt)).scalars().all()

    if settings.mistral_api_key:
        try:
            messages = [{"role": "system", "content": prompts.DOKA_SYSTEM}]
            messages += [{"role": m.role if m.role != "tool" else "user", "content": m.content} for m in history]
            answer = await mistral_client.chat(messages=messages, temperature=0.5, max_tokens=600)
        except Exception as e:
            logger.warning("Doka chat failed: %s", e)
            answer = "(Stub) Ich kann gerade nicht antworten — Mistral ist nicht erreichbar."
    else:
        answer = ("(Demo-Modus) Ich bin Doka. Sobald `MISTRAL_API_KEY` gesetzt ist, "
                  "antworte ich richtig — und durchsuche deine Dokumente und E-Mails.")

    ai_msg = DokaMessage(
        id=new_id(),
        conversation_id=conv_id,
        role="assistant",
        content=answer,
    )
    db.add(ai_msg)
    if not c.title:
        c.title = payload.content[:60]
    await db.commit()

    return [
        MessageOut(id=user_msg.id, role="user", content=user_msg.content),
        MessageOut(id=ai_msg.id, role="assistant", content=ai_msg.content),
    ]


@router.get("/conversations/{conv_id}/messages", response_model=list[MessageOut])
async def get_messages(
    conv_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await db.get(DokaConversation, conv_id)
    if not c or c.user_id != user_id:
        raise HTTPException(404, "Conversation not found")
    stmt = select(DokaMessage).where(DokaMessage.conversation_id == conv_id).order_by(DokaMessage.created_at)
    msgs = (await db.execute(stmt)).scalars().all()
    return [MessageOut(id=m.id, role=m.role, content=m.content) for m in msgs]
