"""Public health endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from kdoc import __version__

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz():
    return {"status": "ok", "version": __version__}


@router.get("/readyz")
async def readyz():
    # In production, check DB + Redis + R2 connectivity here.
    return {"ready": True}
