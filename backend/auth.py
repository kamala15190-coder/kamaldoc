import logging
import os

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

logger = logging.getLogger(__name__)

# Supabase Konfiguration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# Opt-in Fallback auf HS256 (nur für lokale Entwicklung / Migrationsphase).
# In Produktion IMMER leer lassen – JWKS ist der sichere Pfad.
ALLOW_HS256_FALLBACK = os.getenv("ALLOW_HS256_FALLBACK", "").lower() in ("1", "true", "yes")

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
    """HS256 Fallback mit SUPABASE_JWT_SECRET (nur wenn ALLOW_HS256_FALLBACK=1)."""
    if not SUPABASE_JWT_SECRET:
        raise jwt.InvalidTokenError("SUPABASE_JWT_SECRET nicht konfiguriert")
    return jwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
    )


async def get_current_user(authorization: str | None = Header(None)) -> str:
    """
    Extrahiert und validiert JWT Token aus Authorization Header.
    Primär: asymmetrische Validierung über Supabase JWKS (ES256/RS256).
    Fallback auf HS256 nur, wenn ALLOW_HS256_FALLBACK=1 in ENV.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header fehlt")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Ungültiges Authorization Format")

    token = authorization[len("Bearer ") :]

    # --- Primär: JWKS (ES256/RS256) ---
    try:
        payload = _decode_jwks(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except Exception as jwks_err:
        if not ALLOW_HS256_FALLBACK:
            logger.warning(f"JWT-Validierung fehlgeschlagen (JWKS): {jwks_err}")
            raise HTTPException(status_code=401, detail="Ungültiger Token")

        # --- Nur wenn explizit erlaubt: HS256-Fallback ---
        logger.info(f"JWKS fehlgeschlagen ({jwks_err}), nutze HS256-Fallback (ALLOW_HS256_FALLBACK=1)")
        try:
            payload = _decode_hs256(token)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token abgelaufen")
        except jwt.InvalidTokenError as hs_err:
            raise HTTPException(status_code=401, detail=f"Ungültiger Token: {hs_err}")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Ungültiger Token: user_id fehlt")
        logger.info(f"JWT validiert (HS256-Fallback): user_id={user_id}")
        return user_id

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Ungültiger Token: user_id fehlt")
    logger.debug(f"JWT validiert (JWKS): user_id={user_id}")
    return user_id
