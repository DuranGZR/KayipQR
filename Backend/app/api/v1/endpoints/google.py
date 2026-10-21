from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.rate_limiter import rate_limiter
from app.db.session import get_db
from app.schemas.user import EmailTokenRequest, Token
from app.services import google_auth

router = APIRouter()
COOKIE = "kayipqr_google_state"
COOKIE_PATH = settings.API_V1_STR + "/auth/google"


@router.get("/config")
async def config():
    return {"enabled": google_auth.enabled()}


@router.get("/start")
async def start(request: Request, redirect: str = Query("/dashboard", max_length=512)):
    await rate_limiter.check_rate_limit(request, max_requests=15, window_seconds=60, key_prefix="google_start")
    url, cookie = google_auth.start_flow(redirect)
    response = RedirectResponse(url, status_code=303)
    response.set_cookie(COOKIE, cookie, max_age=300, httponly=True,
        secure=settings.ENVIRONMENT in ("production", "staging"), samesite="lax", path=COOKIE_PATH)
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("/callback")
async def callback(request: Request, code: str = Query("", max_length=4096), state: str = Query("", max_length=512),
    error: str = Query("", max_length=255), db: AsyncSession = Depends(get_db)):
    await rate_limiter.check_rate_limit(request, max_requests=15, window_seconds=60, key_prefix="google_callback")
    try:
        if error or not code:
            raise HTTPException(status_code=400, detail="Google ile giriş iptal edildi.")
        url = await google_auth.finish_flow(db, code, state, request.cookies.get(COOKIE, ""))
    except HTTPException as exc:
        error_code = "use_password" if exc.status_code == 409 else "google_login_failed"
        url = settings.PUBLIC_APP_URL.rstrip("/") + "/auth/google/callback#error=" + error_code
    response = RedirectResponse(url, status_code=303)
    response.delete_cookie(COOKIE, path=COOKIE_PATH)
    response.headers.update({"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})
    return response


@router.post("/exchange", response_model=Token)
async def exchange(request: Request, body: EmailTokenRequest, db: AsyncSession = Depends(get_db)):
    await rate_limiter.check_rate_limit(request, max_requests=15, window_seconds=60, key_prefix="google_exchange")
    return await google_auth.exchange_ticket(db, body.token)
