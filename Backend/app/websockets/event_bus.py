import asyncio
import json
import logging
import uuid
from redis.exceptions import RedisError
from app.core.redis import redis_key

logger = logging.getLogger(__name__)


class EventBus:
    def __init__(self, client, on_event, on_disconnect):
        self.client = client
        self.on_event = on_event
        self.on_disconnect = on_disconnect
        self.origin = uuid.uuid4().hex
        self.channel = redis_key("events")
        self.healthy = False
        self.pubsub = None
        self.task = None

    async def subscribe(self):
        self.pubsub = self.client.pubsub()
        await self.pubsub.subscribe(self.channel)
        ack = await self.pubsub.get_message(timeout=5)
        if not ack or ack["type"] != "subscribe":
            raise ConnectionError("Redis subscription was not acknowledged")
        self.healthy = True

    async def start(self):
        await self.subscribe()
        self.task = asyncio.create_task(self.listen())

    async def stop(self):
        self.healthy = False
        if self.task:
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)
        if self.pubsub:
            await self.pubsub.aclose()

    async def listen(self):
        while True:
            try:
                if not self.healthy:
                    if self.pubsub:
                        await self.pubsub.aclose()
                    await self.subscribe()
                message = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1)
                if message:
                    event = json.loads(message["data"])
                    if not isinstance(event, dict) or not isinstance(event.get("data"), dict) or not isinstance(event.get("target"), str):
                        raise ValueError("Invalid event envelope")
                    if event.get("origin") != self.origin:
                        await self.on_event(event)
            except (RedisError, ConnectionError, OSError):
                self.healthy = False
                logger.error("Redis event subscription unavailable; clients must resync")
                await self.on_disconnect()
                await asyncio.sleep(1)
            except (ValueError, KeyError, TypeError):
                logger.warning("Malformed event ignored")
            except Exception:
                self.healthy = False
                logger.exception("Event dispatcher failed; clients must resync")
                await self.on_disconnect()
                await asyncio.sleep(1)

    async def publish(self, kind: str, target: str, data: dict):
        try:
            await self.client.publish(self.channel, json.dumps({
                "origin": self.origin, "kind": kind, "target": target, "data": data,
            }, default=str))
        except RedisError:
            # The message is already committed. Do not turn successful writes into
            # retryable HTTP failures: disconnect sockets so clients refetch history.
            self.healthy = False
            logger.error("Redis publish failed; persisted messages remain available")
            await self.on_disconnect()
