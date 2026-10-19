from redis.asyncio import Redis
from app.core.config import settings

_client: Redis | None = None


def get_redis() -> Redis | None:
    global _client
    if not settings.REDIS_URL:
        return None
    if _client is None:
        _client = Redis.from_url(settings.REDIS_URL, decode_responses=True,
            socket_connect_timeout=3, socket_timeout=5, health_check_interval=15,
            max_connections=50, protocol=2)
    return _client


def redis_key(suffix: str) -> str:
    return f"{settings.REDIS_PREFIX}:{settings.ENVIRONMENT}:{suffix}"


async def close_redis():
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
