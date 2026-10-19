import os
import asyncio
import logging
from contextlib import suppress
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from app.api.media import router as media_router
from app.core.config import settings
from app.core.security import decode_access_token, token_matches_user
from sqlalchemy import select, text
from fastapi.responses import JSONResponse
from app.models.conversation import Conversation
from app.models.item import Item
from app.models.user import User
from app.models.message import Message
from app.db.session import init_db, AsyncSessionLocal, engine
from app.api.v1.api import api_router
from app.websockets.connection_manager import manager
from app.services.chat_service import chat_service
from app.core.logging import configure_logging

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Production schema is managed by Alembic, never implicitly by create_all.
    if settings.ENVIRONMENT not in ("production", "staging"):
        await init_db()
    await manager.start()
    from app.services.outbox_service import run_dispatcher
    tasks = []
    async def clean_uploads():
        from app.services.storage_service import cleanup_orphan_uploads
        while True:
            await asyncio.sleep(3600)
            try:
                await cleanup_orphan_uploads()
            except Exception:
                logging.getLogger(__name__).exception("Upload cleanup failed")
    if settings.RUN_BACKGROUND_TASKS:
        tasks = [asyncio.create_task(run_dispatcher()), asyncio.create_task(clean_uploads())]
    try:
        yield
    finally:
        for task in tasks:
            task.cancel()
        for task in tasks:
            with suppress(asyncio.CancelledError):
                await task
        await manager.stop()
        from app.core.redis import close_redis
        await close_redis()
        await engine.dispose()


is_production = settings.ENVIRONMENT in ("production", "staging")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="KayıpQR — Anonim ve Güvenli Kayıp Eşya İletişim Platformu REST & WebSocket API",
    version="1.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# 1. Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response

# 2. CORS Configuration
from app.core.request_limits import RequestLimitsMiddleware
app.add_middleware(RequestLimitsMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Retry-After"],
)

# 3. Serve public assets and capability-protected chat uploads.
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.include_router(media_router)

# 4. Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Sistem"])
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs": None if is_production else "/docs",
    }


@app.get("/health", tags=["Sistem"])
async def health_check():
    return {"status": "healthy"}


@app.get("/ready", tags=["Sistem"])
async def readiness_check():
    try:
        async with AsyncSessionLocal() as db:
            await asyncio.wait_for(db.execute(text("SELECT 1")), timeout=3)
            from app.models.email_outbox import EmailOutbox
            await asyncio.wait_for(db.execute(select(EmailOutbox.id).limit(1)), timeout=3)
            from app.models.upload_asset import UploadAsset
            await asyncio.wait_for(db.execute(select(UploadAsset.filename).limit(1)), timeout=3)
        from app.core.redis import get_redis
        redis = get_redis()
        if redis is not None:
            await redis.ping()
            if not manager.healthy:
                raise RuntimeError("Event subscription unavailable")
        if settings.STORAGE_BACKEND == "s3":
            from app.services.object_storage import check_bucket
            await check_bucket()
        return {"status": "ready"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable"})


# ==============================================================================
# Canlı Sohbet WebSocket Endpoint (Mesajlaşma, Yazıyor..., Okundu Bilgisi)
# ==============================================================================

@app.websocket("/ws/chat/{conversation_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    conversation_id: str,
    token: str = Query(None, description="JWT token (Eşya Sahibi için)"),
    finder_token: str = Query(None, description="Finder Session Token (Bulan Kişi için)"),
):
    """
    Eşya sahibi ve bulan kişi arasındaki çift yönlü anlık sohbet kanalı.
    Desteklenen Event'ler:
    - Mesaj gönderme: {"type": "message", "content": "..."}
    - Yazıyor durumu: {"type": "typing", "is_typing": true/false}
    - Okundu bildirimi: {"type": "read_ack"}
    - Ping/Pong: {"type": "ping"}
    """
    from app.core.rate_limiter import rate_limiter
    try:
        await rate_limiter.check_rate_limit(websocket, max_requests=30, window_seconds=60, key_prefix="ws_connect")
    except HTTPException:
        await websocket.close(code=1008)
        return
    if len(token or "") > 4096 or len(finder_token or "") > 256:
        await websocket.close(code=1008)
        return
    # Browser WebSocket cannot set Authorization headers. Send credentials as a
    # non-echoed subprotocol, keeping them out of request URLs/access logs.
    for protocol in websocket.scope.get("subprotocols", []):
        if protocol.startswith("auth."):
            token = protocol[5:]
        elif protocol.startswith("finder."):
            finder_token = protocol[7:]
    if len(token or "") > 4096 or len(finder_token or "") > 256:
        await websocket.close(code=1008)
        return
    origin = websocket.headers.get("origin")
    if origin and origin not in settings.BACKEND_CORS_ORIGINS:
        await websocket.close(code=1008)
        return

    sender_type = "finder" if finder_token else "owner"

    async def authorized():
        async with AsyncSessionLocal() as db:
            row = (await db.execute(select(Conversation.finder_session_token, User.id, User.hashed_password, User.is_active)
                .join(Item, Item.id == Conversation.item_id)
                .join(User, User.id == Item.user_id)
                .where(Conversation.id == conversation_id))).first()
            if not row or not row.is_active:
                return False
            if finder_token:
                import secrets
                return secrets.compare_digest(row.finder_session_token, finder_token)
            payload = decode_access_token(token or "")
            if not payload or payload["sub"] != row.id:
                return False
            return token_matches_user(payload, row)

    if not await authorized():
        await websocket.close(code=1008)
        return
    websocket.scope["chat_authorizer"] = authorized

    await manager.connect_conversation(websocket, conversation_id)
    import time
    ws_msg_timestamps: list[float] = []
    actor_identity = conversation_id if sender_type == "finder" else (decode_access_token(token or "") or {}).get("sub", "")

    try:
        while True:
            timeout = 30.0
            if token and not finder_token:
                payload = decode_access_token(token)
                if not payload:
                    await websocket.close(code=1008)
                    break
                timeout = max(0.01, min(timeout, payload["exp"] - datetime.now(timezone.utc).timestamp()))
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=timeout)
            except asyncio.TimeoutError:
                if not await authorized():
                    await websocket.close(code=1008)
                    break
                continue
            if not await authorized():
                await websocket.close(code=1008)
                break
            if not isinstance(data, dict):
                continue

            # Flood protection: max 30 events per 10 seconds per socket (before ping handling)
            now = time.time()
            ws_msg_timestamps = [t for t in ws_msg_timestamps if now - t < 10.0]
            if len(ws_msg_timestamps) >= 30:
                await websocket.send_json(
                    {"type": "error", "detail": "Çok hızlı işlem yapıyorsunuz, lütfen birkaç saniye bekleyin."}
                )
                continue
            ws_msg_timestamps.append(now)

            event_type = data.get("type", "message")

            # 1. Ping / Heartbeat
            if event_type == "ping":
                async with AsyncSessionLocal() as db:
                    latest = select(Message.id).where(Message.conversation_id == conversation_id).order_by(Message.created_at.desc(), Message.id.desc()).limit(1).scalar_subquery()
                    snapshot = (await db.execute(select(Conversation.status, latest.label("last_message_id"))
                        .where(Conversation.id == conversation_id))).first()
                await websocket.send_json({"type": "pong", "last_message_id": snapshot.last_message_id if snapshot else None,
                    "status": snapshot.status if snapshot else None})
                continue

            # 2. Typing indicator
            if event_type == "typing":
                async with AsyncSessionLocal() as db:
                    conv_check = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id, include_messages=False)
                    if not conv_check or conv_check.status in ("blocked", "closed"):
                        continue
                is_typing = bool(data.get("is_typing", False))
                await manager.broadcast_to_conversation(
                    conversation_id,
                    {
                        "type": "typing",
                        "sender_type": sender_type,
                        "is_typing": is_typing,
                        "conversation_id": conversation_id,
                    },
                )
                continue

            # 3. Read Ack
            elif event_type in ("read_ack", "messages_read"):
                async with AsyncSessionLocal() as db:
                    other_type = "finder" if sender_type == "owner" else "owner"
                    await chat_service.mark_conversation_as_read(
                        db=db, conversation_id=conversation_id, sender_type_to_mark=other_type
                    )
                continue

            # 4. Standard Message
            elif event_type in ["message", None]:
                content = str(data.get("content") or "").strip()
                if content:
                    from app.core.rate_limiter import rate_limiter
                    try:
                        await rate_limiter.check_rate_limit(websocket, max_requests=30 if sender_type == "owner" else 20,
                            window_seconds=60, key_prefix=f"msg_{sender_type}", identity=actor_identity)
                    except HTTPException as exc:
                        await websocket.send_json({"type": "error", "detail": exc.detail})
                        continue
                    raw_lat = data.get("location_lat")
                    raw_lng = data.get("location_lng")
                    raw_addr = data.get("location_address")

                    loc_lat = None
                    loc_lng = None
                    if raw_lat is not None and raw_lng is not None:
                        try:
                            lat_val = float(raw_lat)
                            lng_val = float(raw_lng)
                            if -90.0 <= lat_val <= 90.0 and -180.0 <= lng_val <= 180.0:
                                loc_lat = lat_val
                                loc_lng = lng_val
                        except (TypeError, ValueError):
                            pass

                    loc_addr = str(raw_addr).strip()[:255] if raw_addr else None

                    async with AsyncSessionLocal() as db:
                        conv_fresh = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id, include_messages=False)
                        if conv_fresh:
                            try:
                                await chat_service.add_message(
                                    db=db,
                                    conversation=conv_fresh,
                                    sender_type=sender_type,
                                    content=content,
                                    location_lat=loc_lat,
                                    location_lng=loc_lng,
                                    location_address=loc_addr,
                                )
                            except Exception as exc:
                                detail = getattr(exc, "detail", "Mesaj gönderilemedi.")
                                await websocket.send_json({"type": "error", "detail": str(detail)})
    except WebSocketDisconnect:
        pass
    except Exception:
        logging.getLogger(__name__).exception("WebSocket handler failed")
    finally:
        manager.disconnect_conversation(websocket, conversation_id)

