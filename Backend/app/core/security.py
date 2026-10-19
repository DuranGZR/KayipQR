from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import hashlib
import hmac
import asyncio
import html
import re
import secrets
import string
import bcrypt
import jwt
from argon2 import PasswordHasher
from app.core.config import settings

password_hasher = PasswordHasher()
_password_workers = asyncio.Semaphore(4)


async def hash_password(password: str) -> str:
    async with _password_workers:
        return await asyncio.to_thread(get_password_hash, password)


async def check_password(password: str, hashed: str) -> bool:
    async with _password_workers:
        return await asyncio.to_thread(verify_password, password, hashed)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith("$argon2id$"):
            return password_hasher.verify(hashed_password, plain_password)
        # Compatibility for existing bcrypt accounts only. New hashes use Argon2id.
        password_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return password_hasher.hash(password)


def password_needs_rehash(hashed_password: str) -> bool:
    return not hashed_password.startswith("$argon2id$") or password_hasher.check_needs_rehash(hashed_password)


def _password_fingerprint(hashed_password: str) -> str:
    return hashlib.sha256(hashed_password.encode("utf-8")).hexdigest()[:16]


def create_access_token(subject: Union[str, Any], password_hash: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject), "type": "access", "fgp": _password_fingerprint(password_hash)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"require": ["exp", "sub", "type", "fgp"]})
        if payload.get("type") != "access":
            return None
        return payload
    except Exception:
        return None


def token_matches_user(payload: dict, user: Any) -> bool:
    return bool(user and user.is_active and payload.get("sub") == user.id
                and hmac.compare_digest(str(payload.get("fgp", "")), _password_fingerprint(user.hashed_password)))


def create_password_reset_token(email: str, current_hashed_password: Optional[str] = None) -> str:
    """Generates a single-use 30-minute password reset JWT token bound to current password hash."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    to_encode: dict[str, Any] = {"exp": expire, "sub": email.lower(), "type": "password_reset"}
    if current_hashed_password:
        to_encode["fgp"] = _password_fingerprint(current_hashed_password)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_password_reset_token(token: str, current_hashed_password: Optional[str] = None) -> Optional[str]:
    """Validates and extracts the email from a password reset token, ensuring it hasn't been used already."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"require": ["exp", "sub", "type", "fgp"]})
        if payload.get("type") != "password_reset":
            return None
        token_fgp = payload.get("fgp")
        if current_hashed_password:
            if not hmac.compare_digest(str(token_fgp), _password_fingerprint(current_hashed_password)):
                return None
        return payload.get("sub")
    except Exception:
        return None


def sanitize_text(text: str) -> str:
    """Unescapes existing HTML entities first, strips script/HTML tags, and escapes cleanly (idempotent)."""
    if not text:
        return ""
    clean = html.unescape(text).strip()
    clean = re.sub(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", "", clean, flags=re.IGNORECASE | re.DOTALL)
    clean = re.sub(r"<[^>]+>", "", clean)
    clean = html.escape(clean, quote=True)
    return clean.strip()


def sanitize_message_content(text: str) -> str:
    """Unescapes existing HTML entities first, strips script/HTML tags, escapes cleanly, and normalizes whitespace."""
    if not text:
        return ""
    clean = html.unescape(text).strip()
    clean = re.sub(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", "", clean, flags=re.IGNORECASE | re.DOTALL)
    clean = re.sub(r"<[^>]+>", "", clean)
    clean = html.escape(clean, quote=True)
    clean = re.sub(r"\n{3,}", "\n\n", clean)
    return clean.strip()


def generate_unique_qr_code(length: int = 8) -> str:
    """
    Generates a secure, human-readable, non-ambiguous unique code for QR codes.
    Omits confusing characters (0, O, 1, I, L).
    Example: KQ-7X9B2K
    """
    alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
    random_str = "".join(secrets.choice(alphabet) for _ in range(length))
    return f"KQ-{random_str}"


def generate_finder_session_token() -> str:
    """Generates a high-entropy secret token for anonymous finder chat sessions."""
    return f"finder_{secrets.token_urlsafe(32)}"


