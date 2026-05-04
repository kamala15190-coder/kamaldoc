"""JWT validation via Supabase JWKS — no HS256 fallback. Ever.

If running in `local` env without Supabase configured, a dev-token mode is allowed
(returns a fixed user_id). This is gated explicitly by env=local.
"""
from __future__ import annotations

import logging

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from kdoc.settings import settings

logger = logging.getLogger(__name__)

DEV_USER_ID = "00000000-0000-0000-0000-000000000001"

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None and settings.supabase_url:
        _jwks_client = PyJWKClient(
            f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
            cache_keys=True,
            lifespan=3600,
        )
    return _jwks_client  # type: ignore[return-value]


async def get_current_user(authorization: str | None = Header(None)) -> str:
    """Validate JWT against Supabase JWKS. Returns user_id (sub claim)."""
    # Local dev convenience — explicitly gated
    if settings.env == "local" and authorization in (None, "Bearer dev"):
        return DEV_USER_ID

    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization[len("Bearer "):]
    client = _get_jwks_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Auth not configured")

    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status_code=401, detail="Token expired") from e
    except Exception as e:
        logger.warning("JWT validation failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token") from e

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing sub")
    return user_id
