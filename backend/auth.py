import logging
import os
from typing import Optional

import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Header

logger = logging.getLogger(__name__)

# Supabase Konfiguration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# JWKS-Client mit Cache (holt Keys nur bei Bedarf neu)
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


def _decode_hs256(token: str) -> dict:
    """HS256 Fallback mit SUPABASE_JWT_SECRET."""
    if not SUPABASE_JWT_SECRET:
        raise jwt.InvalidTokenError("SUPABASE_JWT_SECRET nicht konfiguriert")
    return jwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
    )


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """
    Extrahiert und validiert JWT Token aus Authorization Header.
    Versucht RS256 (JWKS) zuerst, dann HS256 als Fallback.
    Gibt user_id zurück oder wirft 401 Unauthorized.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header fehlt")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Ungültiges Authorization Format")

    token = authorization.replace("Bearer ", "")

    # --- JWKS (ES256/RS256, primär) ---
    try:
        payload = _decode_jwks(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Ungültiger Token: user_id fehlt")
        logger.info(f"JWT validiert (JWKS/ES256): user_id={user_id}")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except Exception as rs256_err:
        logger.debug(f"JWKS fehlgeschlagen: {rs256_err}, versuche HS256 Fallback...")

    # --- HS256 Fallback ---
    try:
        payload = _decode_hs256(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Ungültiger Token: user_id fehlt")
        logger.info("JWT via HS256 Fallback validiert")
        logger.info(f"JWT validiert (JWKS/ES256): user_id={user_id}")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Ungültiger Token: {str(e)}")
