"""Fernet-based encryption for storing API keys."""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = settings.get_encryption_key()
        # Fernet key must be 32 url-safe base64-encoded bytes.
        # If the user provides a plain secret, derive a proper key.
        try:
            _fernet = Fernet(key.encode() if isinstance(key, str) else key)
        except (ValueError, Exception):
            # Fallback: generate a fresh key (data encrypted with old key won't decrypt)
            _fernet = Fernet(Fernet.generate_key())
    return _fernet


def encrypt(plaintext: str) -> str:
    """Encrypt a string and return the ciphertext as a UTF-8 string."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a ciphertext string back to plaintext. Raises ValueError on failure."""
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as e:
        raise ValueError("Failed to decrypt value — encryption key may have changed") from e
