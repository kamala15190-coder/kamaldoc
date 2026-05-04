"""User profile + subscription overview."""
from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from kdoc.auth.jwks import get_current_user
from kdoc.db.models import Profile, Subscription, UsageCounter
from kdoc.db.session import get_db

router = APIRouter(prefix="/api/me", tags=["me"])


class ProfileOut(BaseModel):
    id: str
    email: str | None = None
    vorname: str | None = None
    nachname: str | None = None
    adresse: str | None = None
    plz: str | None = None
    ort: str | None = None
    land: str = "AT"
    telefon: str | None = None
    app_locale: str = "de"
    theme: str = "onyx"


class SubscriptionOut(BaseModel):
    plan: str
    expires_at: datetime | None = None
    cancelled_at: datetime | None = None


class UsageOut(BaseModel):
    documents_month: int = 0
    ki_analyses_month: int = 0
    translations_month: int = 0
    befund_month: int = 0
    rechtshilfe_month: int = 0
    phishing_month: int = 0
    doka_messages_month: int = 0
    last_reset: date | None = None


class MeResponse(BaseModel):
    profile: ProfileOut
    subscription: SubscriptionOut
    usage: UsageOut


@router.get("", response_model=MeResponse)
async def get_me(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await db.get(Profile, user_id)
    if not profile:
        # Auto-create on first login
        profile = Profile(id=user_id)
        db.add(profile)
        await db.flush()

    sub = await db.get(Subscription, user_id)
    if not sub:
        sub = Subscription(user_id=user_id, plan="free", started_at=datetime.now(tz=timezone.utc))
        db.add(sub)
        await db.flush()

    usage = await db.get(UsageCounter, user_id)
    if not usage:
        usage = UsageCounter(user_id=user_id, registration_date=date.today())
        db.add(usage)
        await db.flush()

    await db.commit()

    return MeResponse(
        profile=ProfileOut.model_validate(profile, from_attributes=True),
        subscription=SubscriptionOut.model_validate(sub, from_attributes=True),
        usage=UsageOut.model_validate(usage, from_attributes=True),
    )
