"""Google authorization-code flow with PKCE, browser-bound state and one-use handoff."""
import asyncio
import hashlib
import hmac
import secrets
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
import httpx
import jwt
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.core.security import create_access_token, token_matches_user
from app.models.user import User
from app.schemas.user import Token, UserResponse

_keys = {}
_keys_until = 0.0
_keys_lock = asyncio.Lock()


def enabled():
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)


def callback_url():
    return settings.BACKEND_BASE_URL.rstrip("/") + settings.API_V1_STR + "/auth/google/callback"


def safe_redirect(value: str):
    return value if value.split("?", 1)[0] in ("/dashboard", "/studio", "/messages", "/settings") and "\\" not in value else "/dashboard"


def start_flow(redirect: str):
    if not enabled():
        raise HTTPException(status_code=503, detail="Google ile giriş henüz yapılandırılmadı.")
    state, nonce, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(32), secrets.token_urlsafe(48)
    import base64
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    cookie = jwt.encode({"type": "google_state", "state": state, "nonce": nonce, "verifier": verifier,
        "redirect": safe_redirect(redirect), "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({"client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": callback_url(), "response_type": "code", "scope": "openid email profile", "state": state,
        "nonce": nonce, "code_challenge": challenge, "code_challenge_method": "S256", "prompt": "select_account"})
    return url, cookie


async def verify_id_token(token: str, nonce: str):
    global _keys, _keys_until
    try:
        header = jwt.get_unverified_header(token)
        if header.get("alg") != "RS256":
            raise ValueError("Invalid signing algorithm")
        async with _keys_lock:
            if time.monotonic() >= _keys_until or header.get("kid") not in _keys:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.get("https://www.googleapis.com/oauth2/v3/certs")
                    response.raise_for_status()
                    _keys = {key["kid"]: key for key in response.json()["keys"]}
                    _keys_until = time.monotonic() + 3600
        key = jwt.PyJWK.from_dict(_keys[header["kid"]]).key
        claims = jwt.decode(token, key, algorithms=["RS256"], audience=settings.GOOGLE_CLIENT_ID,
            issuer=["accounts.google.com", "https://accounts.google.com"],
            options={"require": ["exp", "iat", "sub", "aud", "iss", "nonce", "email", "email_verified"]})
        if (not hmac.compare_digest(str(claims["nonce"]), nonce) or claims["email_verified"] is not True
            or claims.get("azp", settings.GOOGLE_CLIENT_ID) != settings.GOOGLE_CLIENT_ID
            or (isinstance(claims["aud"], list) and len(claims["aud"]) > 1 and claims.get("azp") != settings.GOOGLE_CLIENT_ID)):
            raise ValueError("Invalid identity")
        return claims
    except (jwt.PyJWTError, KeyError, ValueError, httpx.HTTPError):
        raise HTTPException(status_code=400, detail="Google kimliği doğrulanamadı. Yeniden dene.")


async def finish_flow(db, code: str, state: str, cookie: str):
    if not enabled():
        raise HTTPException(status_code=503, detail="Google ile giriş yapılandırılmadı.")
    try:
        flow = jwt.decode(cookie, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "type", "state", "nonce", "verifier", "redirect"]})
        if flow["type"] != "google_state" or not hmac.compare_digest(flow["state"], state):
            raise ValueError("Invalid state")
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=400, detail="Google oturumu geçersiz veya süresi dolmuş.")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post("https://oauth2.googleapis.com/token", data={"code": code,
                "client_id": settings.GOOGLE_CLIENT_ID, "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": callback_url(), "grant_type": "authorization_code", "code_verifier": flow["verifier"]})
            response.raise_for_status()
            claims = await verify_id_token(response.json()["id_token"], flow["nonce"])
    except (httpx.HTTPError, KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Google ile giriş tamamlanamadı. Yeniden dene.")
    from app.schemas.user import UserForgotPassword
    email = str(UserForgotPassword(email=claims["email"]).email).lower()
    user = (await db.execute(select(User).where(User.google_sub == claims["sub"]))).scalar_one_or_none()
    if user is None:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user and user.google_sub and user.google_sub != claims["sub"]:
            raise HTTPException(status_code=409, detail="Bu adres başka bir Google hesabına bağlı.")
        authoritative = email.endswith("@gmail.com") or bool(claims.get("hd"))
        if user and user.email_verified and not authoritative:
            raise HTTPException(status_code=409, detail="Bu e-posta için mevcut hesabına şifrenle giriş yap.")
        if user is None:
            user = User(email=email, full_name=str(claims.get("name", ""))[:255],
                hashed_password="google:" + secrets.token_urlsafe(48), email_verified=True, email_on_scan=False, is_active=True)
            db.add(user)
        elif not user.email_verified or user.email_verified_at is None:
            # Never retain a password chosen by someone who did not own this mailbox.
            user.hashed_password = "google:" + secrets.token_urlsafe(48)
        user.email_verified = True
        user.email_verified_at = datetime.now(timezone.utc)
        user.google_sub = claims["sub"]
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Bu hesap devre dışı.")
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Hesap başka bir işlemde güncellendi. Yeniden giriş yap.")
    from app.core.security import _password_fingerprint
    ticket = jwt.encode({"type": "google_ticket", "sub": user.id, "fgp": _password_fingerprint(user.hashed_password),
        "jti": secrets.token_urlsafe(32), "exp": datetime.now(timezone.utc) + timedelta(seconds=60)},
        settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return settings.PUBLIC_APP_URL.rstrip("/") + "/auth/google/callback#" + urlencode({"ticket": ticket, "redirect": flow["redirect"]})


async def exchange_ticket(db, ticket: str):
    from app.services.runtime_limits import consume_window
    try:
        payload = jwt.decode(ticket, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub", "type", "fgp", "jti"]})
        if payload["type"] != "google_ticket":
            raise ValueError("Invalid ticket")
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=400, detail="Google giriş bağlantısı geçersiz veya süresi dolmuş.")
    # Claim before opening the user transaction, including SQLite development.
    if await consume_window("google-ticket:" + payload["jti"], 1, 120):
        raise HTTPException(status_code=400, detail="Google giriş bağlantısı daha önce kullanılmış.")
    user = await db.get(User, payload["sub"])
    if not token_matches_user(payload, user):
        raise HTTPException(status_code=401, detail="Oturum bilgileri değişti. Yeniden giriş yap.")
    return Token(access_token=create_access_token(user.id, user.hashed_password), user=UserResponse.model_validate(user))
