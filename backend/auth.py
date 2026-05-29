import logging
import os

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

logger = logging.getLogger(__name__)

# Supabase Konfiguration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# JWKS-Client mit Cache (holt Keys nur bei Bedarf neu).
# H1: Ausschließlich asymmetrische Verifikation (ES256/RS256). Kein HS256-
# Fallback mehr — ein mit dem Shared-Secret signierter Token wird abgelehnt.
_jwks_client = PyJWKClient(JWKS_URL, cache_keys=True, lifespan=3600)


def _decode_jwks(token: str) -> dict:
    """Asymmetrische Verifikation über Supabase JWKS Endpoint (ES256/RS256)."""
    signing_key = _jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
    )


async def get_current_user(authorization: str | None = Header(None)) -> str:
    """Extrahiert und validiert das JWT aus dem Authorization-Header (JWKS-only)."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header fehlt")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Ungültiges Authorization Format")

    token = authorization[len("Bearer ") :]

    try:
        payload = _decode_jwks(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except Exception as jwks_err:  # noqa: BLE001
        logger.warning(f"JWT-Validierung fehlgeschlagen (JWKS): {jwks_err}")
        raise HTTPException(status_code=401, detail="Ungültiger Token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Ungültiger Token: user_id fehlt")
    logger.debug(f"JWT validiert (JWKS): user_id={user_id}")
    return user_id
