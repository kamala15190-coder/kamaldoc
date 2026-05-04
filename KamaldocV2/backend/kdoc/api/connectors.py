"""Connector accounts API — multi-account-per-provider support.

Tokens are NEVER stored client-side. The OAuth flow always relays through the backend,
which encrypts credentials before persisting.

This V2 stub returns the data model wiring; provider-specific OAuth handshakes will be
implemented in domain/connectors/{type}.py.
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from kdoc.auth.jwks import get_current_user
from kdoc.db.models import ConnectorAccount
from kdoc.db.session import get_db

router = APIRouter(prefix="/api/connectors", tags=["connectors"])


SUPPORTED_TYPES = [
    {"type": "gmail", "name": "Gmail", "auth": "oauth", "capabilities": ["search", "read", "attachments"]},
    {"type": "outlook", "name": "Outlook", "auth": "oauth", "capabilities": ["search", "read", "attachments"]},
    {"type": "icloud", "name": "iCloud Mail", "auth": "oauth", "capabilities": ["search", "read"]},
    {"type": "gmx", "name": "GMX", "auth": "imap", "capabilities": ["search", "read", "attachments"]},
    {"type": "yahoo", "name": "Yahoo Mail", "auth": "oauth", "capabilities": ["search", "read"]},
    {"type": "imap", "name": "IMAP / Sonstige", "auth": "imap", "capabilities": ["search", "read"]},
]


class ConnectorTypeOut(BaseModel):
    type: str
    name: str
    auth: str
    capabilities: list[str]


class ConnectorAccountOut(BaseModel):
    id: str
    connector_type: str
    display_name: str
    remote_account_id: str
    status: str
    last_sync_at: datetime | None = None
    last_error: str | None = None


@router.get("/available", response_model=list[ConnectorTypeOut])
async def list_available():
    return [ConnectorTypeOut(**c) for c in SUPPORTED_TYPES]


@router.get("/accounts", response_model=list[ConnectorAccountOut])
async def list_accounts(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ConnectorAccount).where(ConnectorAccount.user_id == user_id)
    result = await db.execute(stmt)
    return [ConnectorAccountOut.model_validate(a, from_attributes=True) for a in result.scalars().all()]


class StartOAuthResponse(BaseModel):
    state: str
    url: str


@router.post("/{connector_type}/oauth/start", response_model=StartOAuthResponse)
async def start_oauth(
    connector_type: str,
    display_name: str = "Mein Konto",
    user_id: str = Depends(get_current_user),
):
    if not any(c["type"] == connector_type for c in SUPPORTED_TYPES):
        raise HTTPException(400, "Unknown connector type")
    # TODO: implement provider-specific OAuth in domain/connectors/{type}.py
    return StartOAuthResponse(state="stub-state", url="about:blank")


class IMAPConnectRequest(BaseModel):
    display_name: str
    host: str
    port: int = 993
    username: str
    password: str


@router.post("/imap/connect", response_model=ConnectorAccountOut)
async def connect_imap(
    payload: IMAPConnectRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # TODO: encrypt password via envelope encryption
    from kdoc.db.base import new_id

    a = ConnectorAccount(
        id=new_id(),
        user_id=user_id,
        connector_type="imap",
        display_name=payload.display_name,
        remote_account_id=payload.username,
        status="active",
        encrypted_credentials=b"",  # TODO encrypted blob
        capabilities={"capabilities": ["search", "read"]},
    )
    db.add(a)
    await db.commit()
    return ConnectorAccountOut.model_validate(a, from_attributes=True)


@router.delete("/accounts/{account_id}")
async def disconnect(
    account_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    a = await db.get(ConnectorAccount, account_id)
    if not a or a.user_id != user_id:
        raise HTTPException(404, "Not found")
    await db.delete(a)
    await db.commit()
    return {"ok": True}
