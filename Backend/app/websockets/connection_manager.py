import json
import asyncio
from app.core.redis import get_redis
from app.websockets.event_bus import EventBus
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Map conversation_id -> set of active WebSockets
        self.active_conversations: Dict[str, Set[WebSocket]] = {}
        # Map user_id -> set of active WebSockets for user notifications
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        self.bus = None
        self._send_slots = asyncio.Semaphore(32)

    @property
    def healthy(self):
        return self.bus.healthy if self.bus else get_redis() is None

    async def start(self):
        client = get_redis()
        if client is not None:
            self.bus = EventBus(client, self.receive_event, self.close_connections)
            await self.bus.start()

    async def stop(self):
        if self.bus:
            await self.bus.stop()
            self.bus = None
        await self.close_connections()

    async def close_connections(self):
        sockets = set().union(*self.active_conversations.values(), *self.user_connections.values())
        self.active_conversations.clear()
        self.user_connections.clear()
        await asyncio.gather(*(self.close_socket(socket) for socket in sockets), return_exceptions=True)

    @staticmethod
    async def close_socket(socket):
        await asyncio.wait_for(socket.close(code=1012), timeout=3)

    async def receive_event(self, event):
        if event["kind"] == "conversation":
            await self.deliver_conversation(event["target"], event["data"])
        elif event["kind"] == "user":
            await self.deliver_user(event["target"], event["data"])

    async def connect_conversation(self, websocket: WebSocket, conversation_id: str):
        protocols = websocket.scope.get("subprotocols", [])
        await websocket.accept(subprotocol="kayipqr" if "kayipqr" in protocols else None)
        if conversation_id not in self.active_conversations:
            self.active_conversations[conversation_id] = set()
        self.active_conversations[conversation_id].add(websocket)

    def disconnect_conversation(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_conversations:
            self.active_conversations[conversation_id].discard(websocket)
            if not self.active_conversations[conversation_id]:
                del self.active_conversations[conversation_id]

    async def broadcast_to_conversation(self, conversation_id: str, message_data: dict):
        await self.deliver_conversation(conversation_id, message_data)
        if self.bus:
            await self.bus.publish("conversation", conversation_id, message_data)

    async def deliver_conversation(self, conversation_id: str, message_data: dict):
        if conversation_id in self.active_conversations:
            payload = json.dumps(message_data, default=str)
            async def deliver(connection):
                try:
                    async with self._send_slots:
                        authorize = connection.scope.get("chat_authorizer")
                        if authorize and not await asyncio.wait_for(authorize(), timeout=5):
                            await connection.close(code=1008)
                            self.disconnect_conversation(connection, conversation_id)
                            return
                        await asyncio.wait_for(connection.send_text(payload), timeout=3)
                except Exception:
                    self.disconnect_conversation(connection, conversation_id)
            await asyncio.gather(*(deliver(socket) for socket in list(self.active_conversations[conversation_id])))

    async def connect_user(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)

    def disconnect_user(self, websocket: WebSocket, user_id: str):
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def send_user_notification(self, user_id: str, notification_data: dict):
        await self.deliver_user(user_id, notification_data)
        if self.bus:
            await self.bus.publish("user", user_id, notification_data)

    async def deliver_user(self, user_id: str, notification_data: dict):
        if user_id in self.user_connections:
            payload = json.dumps(notification_data, default=str)
            for conn in list(self.user_connections[user_id]):
                try:
                    await conn.send_text(payload)
                except Exception:
                    self.disconnect_user(conn, user_id)


manager = ConnectionManager()
