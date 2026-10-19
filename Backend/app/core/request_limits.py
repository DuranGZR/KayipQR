"""Bound HTTP work/body sizes before multipart parsing; WebSockets are separate."""
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from app.core.config import settings


class RequestLimitsMiddleware:
    def __init__(self, app):
        self.app = app
        self.active = 0

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        if self.active >= settings.MAX_ACTIVE_REQUESTS:
            return await JSONResponse({"detail": "Sunucu meşgul. Lütfen tekrar deneyin."}, status_code=503,
                headers={"Retry-After": "2"})(scope, receive, send)
        maximum = (settings.MAX_UPLOAD_SIZE_MB + 1) * 1024 * 1024
        headers = dict(scope.get("headers", []))
        if b"content-length" in headers:
            try:
                length = int(headers[b"content-length"])
            except ValueError:
                return await JSONResponse({"detail": "Geçersiz içerik uzunluğu."}, status_code=400)(scope, receive, send)
            if length > maximum:
                return await JSONResponse({"detail": "İstek gövdesi çok büyük."}, status_code=413)(scope, receive, send)
        received = 0
        exceeded = False
        started = False
        replaced = False
        async def bounded_receive():
            nonlocal received, exceeded
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > maximum:
                    exceeded = True
                    raise HTTPException(status_code=413, detail="İstek gövdesi çok büyük.")
            return message
        async def bounded_send(message):
            nonlocal started, replaced
            if exceeded:
                # FastAPI may wrap a receive exception as a generic parsing 400.
                # Preserve the actual limit error before any response is sent.
                if not started:
                    started = replaced = True
                    await JSONResponse({"detail": "İstek gövdesi çok büyük."}, status_code=413)(scope, receive, send)
                return
            if message["type"] == "http.response.start":
                started = True
            await send(message)
        # No await between admission and increment: this is atomic on one loop.
        self.active += 1
        try:
            try:
                return await self.app(scope, bounded_receive, bounded_send)
            except Exception:
                if not exceeded or (started and not replaced):
                    raise
                if not started:
                    await JSONResponse({"detail": "İstek gövdesi çok büyük."}, status_code=413)(scope, receive, send)
        finally:
            self.active -= 1
