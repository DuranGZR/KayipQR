import ipaddress
import time
import uuid
import hashlib
import os
from redis.exceptions import RedisError
from app.core.redis import get_redis, redis_key
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, Request, status
from app.core.config import settings


class RateLimiter:
    """
    Shared sliding-window limiter; local memory is used only without Redis.
    Extracts real client IP securely behind reverse proxies (Cloudflare, Nginx, Caddy).
    """
    def __init__(self):
        # Map: ip -> list of timestamps
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup = time.time()

    def is_trusted_proxy(self, request: Request) -> bool:
        direct_host = request.client.host if (request.client and request.client.host) else "127.0.0.1"
        trusted = settings.TRUSTED_PROXIES or []
        try:
            ip_obj = ipaddress.ip_address(direct_host)
            return any(ip_obj in ipaddress.ip_network(entry, strict=False) for entry in trusted)
        except ValueError:
            pass
        return False

    def get_client_ip(self, request: Request) -> str:
        """
        Extracts the real client IP. Only trusts proxy headers (CF-Connecting-IP, X-Forwarded-For)
        when the direct connection originates from an explicitly trusted proxy.
        """
        direct_host = request.client.host if (request.client and request.client.host) else "127.0.0.1"

        # Opt-in platform boundary: Railway edge overwrites X-Real-IP. Never use
        # caller-provided XFF/CF headers in this mode; do not expose a TCP bypass.
        if settings.PROXY_MODE == "railway" and os.getenv("RAILWAY_PROJECT_ID") and request.headers.get("x-railway-edge"):
            try:
                return str(ipaddress.ip_address(request.headers.get("x-real-ip", "")))
            except ValueError:
                return direct_host

        if self.is_trusted_proxy(request):
            # Walk from the trusted ingress towards the first untrusted hop.
            forwarded_for = request.headers.get("x-forwarded-for")
            if forwarded_for:
                try:
                    for hop in reversed(forwarded_for.split(",")):
                        candidate = ipaddress.ip_address(hop.strip())
                        if not any(candidate in ipaddress.ip_network(entry, strict=False) for entry in settings.TRUSTED_PROXIES):
                            return str(candidate)
                    return str(candidate)
                except ValueError:
                    return direct_host
            for header in ("cf-connecting-ip", "x-real-ip"):
                if value := request.headers.get(header):
                    try:
                        return str(ipaddress.ip_address(value.strip()))
                    except ValueError:
                        return direct_host

        return direct_host

    async def check_rate_limit(
        self,
        request: Request,
        max_requests: int = 10,
        window_seconds: int = 60,
        key_prefix: str = "",
        identity: str | None = None,
    ):
        client_ip = self.get_client_ip(request)
        scope = key_prefix or request.url.path
        bucket_key = f"{scope}:{identity or client_ip}"
        client = get_redis()
        if client is not None:
            key = redis_key("limit:" + hashlib.sha256(bucket_key.encode()).hexdigest())
            try:
                retry_ms = await client.eval(RATE_LIMIT_SCRIPT, 1, key, max_requests, window_seconds * 1000, uuid.uuid4().hex)
            except RedisError:
                raise HTTPException(status_code=503, detail="İstek kontrolü geçici olarak kullanılamıyor.", headers={"Retry-After": "5"})
            if retry_ms:
                self.reject(max(1, (int(retry_ms) + 999) // 1000))
            return
        now = time.time()

        # Periodic auto cleanup every 10 minutes
        if now - self._last_cleanup > 600:
            self.cleanup()
            self._last_cleanup = now

        # Filter timestamps within window
        window_start = now - window_seconds
        valid_timestamps = [t for t in self.requests[bucket_key] if t > window_start]

        if len(valid_timestamps) >= max_requests:
            retry_after = int(window_seconds - (now - valid_timestamps[0])) + 1
            self.reject(retry_after)

        valid_timestamps.append(now)
        self.requests[bucket_key] = valid_timestamps

    @staticmethod
    def reject(retry_after: int):
        raise HTTPException(status_code=429, detail="Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.", headers={"Retry-After": str(max(1, retry_after))})

    def cleanup(self):
        """Clean expired IPs to prevent memory leaks."""
        now = time.time()
        expired_ips = []
        for ip, timestamps in self.requests.items():
            fresh = [t for t in timestamps if t > now - 86400]
            if fresh:
                self.requests[ip] = fresh
            else:
                expired_ips.append(ip)
        for ip in expired_ips:
            del self.requests[ip]


rate_limiter = RateLimiter()

# Redis TIME avoids clock skew between replicas; the complete window is atomic.
RATE_LIMIT_SCRIPT = """
local t = redis.call('TIME')
local now = t[1] * 1000 + math.floor(t[2] / 1000)
local window = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[1]) then
    local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
    return math.max(1, tonumber(oldest[2]) + window - now)
end
redis.call('ZADD', KEYS[1], now, ARGV[3])
redis.call('PEXPIRE', KEYS[1], window)
return 0
"""

