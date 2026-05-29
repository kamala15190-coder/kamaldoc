"""
Envelope encryption for connector credentials (Phase F).

Tokens/passwords for e-mail connectors are stored server-side only, encrypted
at rest. Each record gets its own random data-encryption key (DEK); the DEK is
wrapped with a master key-encryption key (KEK) loaded from the environment.

    CONNECTOR_MASTER_KEK  — urlsafe-base64 32-byte Fernet key.
    Generate one with:  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

The stored blob is JSON: {"dek": <wrapped>, "ct": <ciphertext>}.
"""

import json
import os

from cryptography.fernet import Fernet

_MASTER_ENV = "CONNECTOR_MASTER_KEK"


def _master() -> Fernet:
    key = os.getenv(_MASTER_ENV, "")
    if not key:
        raise RuntimeError(
            f"{_MASTER_ENV} ist nicht gesetzt — Connector-Verschlüsselung nicht verfügbar."
        )
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"{_MASTER_ENV} ist kein gültiger Fernet-Key: {exc}") from exc


def encryption_available() -> bool:
    """True if a usable master key is configured (for startup/health checks)."""
    try:
        _master()
        return True
    except RuntimeError:
        return False


def encrypt_credentials(plaintext: str) -> bytes:
    """Envelope-encrypt a credential string. Returns an opaque blob (bytes)."""
    master = _master()
    dek = Fernet.generate_key()
    ct = Fernet(dek).encrypt((plaintext or "").encode("utf-8"))
    wrapped = master.encrypt(dek)
    blob = json.dumps({"dek": wrapped.decode("ascii"), "ct": ct.decode("ascii")})
    return blob.encode("utf-8")


def decrypt_credentials(blob: bytes) -> str:
    """Reverse of encrypt_credentials."""
    master = _master()
    data = json.loads(blob.decode("utf-8") if isinstance(blob, (bytes, bytearray)) else blob)
    dek = master.decrypt(data["dek"].encode("ascii"))
    pt = Fernet(dek).decrypt(data["ct"].encode("ascii"))
    return pt.decode("utf-8")
