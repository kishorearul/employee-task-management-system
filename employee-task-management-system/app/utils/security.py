"""Password hashing + JWT helpers.

Design choice (interview-ready answer): we use PyJWT + pwdlib/bcrypt
instead of python-jose/passlib because those two are unmaintained.
The API (hash/verify/create/decode tokens) is equivalent.
"""
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config.settings import settings

_password_hash = PasswordHash.recommended()  # bcrypt under the hood


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password (never store plaintext)."""
    return _password_hash.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Check a plaintext password against its stored hash."""
    return _password_hash.verify(plain_password, password_hash)


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    """Create a signed JWT whose subject (sub) is the user id."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes if expires_minutes is not None else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> str:
    """Decode a JWT and return the subject (user id). Raises jwt exceptions on failure."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return str(payload.get("sub"))
