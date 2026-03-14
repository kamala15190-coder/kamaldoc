import os
import jwt
from fastapi import HTTPException, Header
from typing import Optional

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """
    Extrahiert und validiert JWT Token aus Authorization Header.
    Gibt user_id zurück oder wirft 401 Unauthorized.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header fehlt")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Ungültiges Authorization Format")
    
    token = authorization.replace("Bearer ", "")
    
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET nicht konfiguriert")
    
    try:
        # Supabase JWT validieren
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Ungültiger Token: user_id fehlt")
        
        return user_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Ungültiger Token: {str(e)}")
