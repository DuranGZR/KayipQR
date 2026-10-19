"""Bounded functional/load smoke test against an explicitly selected test environment.

Example: python scripts/load_smoke.py --base-url http://127.0.0.1:8001 --base-url http://127.0.0.1:8002
Creates and then deletes one isolated account. Public URLs require --allow-external.
"""
import argparse
import asyncio
import json
import statistics
import time
import uuid
from collections import Counter
from urllib.parse import urlsplit
import httpx
from websockets.asyncio.client import connect


async def run(args):
    urls = [url.rstrip("/") for url in args.base_url]
    for url in urls:
        parsed = urlsplit(url)
        if parsed.scheme not in ("http", "https") or parsed.path not in ("", "/"):
            raise ValueError("Use the API origin, without /api/v1")
        if parsed.hostname not in ("localhost", "127.0.0.1", "::1") and not args.allow_external:
            raise ValueError("External targets require --allow-external; use a test environment")
    async with httpx.AsyncClient(timeout=20) as client:
        account = await client.post(urls[0] + "/api/v1/auth/register", json={
            "email": f"load-{uuid.uuid4().hex}@example.com", "password": uuid.uuid4().hex,
        })
        account.raise_for_status()
        token = account.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        try:
            preferences = await client.put(urls[0] + "/api/v1/auth/me", headers=headers, json={"email_on_scan": False, "email_on_message": False})
            preferences.raise_for_status()
            item = await client.post(urls[0] + "/api/v1/items", headers=headers, json={"name": "Isolated scaling smoke"})
            item.raise_for_status()
            contact = await client.post(urls[0] + "/api/v1/public/q/" + item.json()["qr_code"]["unique_code"] + "/contact", json={"message": "Isolated test"})
            contact.raise_for_status()
            conv = contact.json()
            if args.transport == "polling":
                sent = await client.post(urls[-1] + "/api/v1/conversations/finder/" + conv["finder_session_token"] + "/messages", json={"content": "Cross-replica delivery"})
                sent.raise_for_status()
                history = await client.get(urls[0] + "/api/v1/conversations/" + conv["conversation_id"], headers=headers)
                history.raise_for_status()
                assert sent.json()["id"] in {message["id"] for message in history.json()["messages"]}
                reply = await client.post(urls[0] + "/api/v1/conversations/" + conv["conversation_id"] + "/messages", headers=headers, json={"content": "Owner reply"})
                reply.raise_for_status()
                finder = await client.get(urls[-1] + "/api/v1/conversations/finder/" + conv["finder_session_token"])
                finder.raise_for_status()
                assert reply.json()["id"] in {message["id"] for message in finder.json()["messages"]}
            else:
                ws_url = urls[0].replace("https://", "wss://").replace("http://", "ws://") + "/ws/chat/" + conv["conversation_id"]
                async with connect(ws_url, subprotocols=["kayipqr", f"auth.{token}"]) as socket:
                    sent = await client.post(urls[-1] + "/api/v1/conversations/finder/" + conv["finder_session_token"] + "/messages", json={"content": "Cross-replica delivery"})
                    sent.raise_for_status()
                    event = json.loads(await asyncio.wait_for(socket.recv(), timeout=10))
                    assert event["type"] == "new_message" and event["message"]["id"] == sent.json()["id"]
            slots = asyncio.Semaphore(args.concurrency)
            latencies = []
            statuses = Counter()
            async def request(index):
                async with slots:
                    start = time.perf_counter()
                    path = "/api/v1/items?limit=100" if index % 2 else "/api/v1/dashboard/stats"
                    try:
                        result = await client.get(urls[index % len(urls)] + path, headers=headers)
                        statuses[str(result.status_code)] += 1
                    except httpx.HTTPError:
                        statuses["network_error"] += 1
                    latencies.append((time.perf_counter() - start) * 1000)
            await asyncio.gather(*(request(index) for index in range(args.requests)))
            p95 = sorted(latencies)[max(0, int(len(latencies) * .95) - 1)]
            print(json.dumps({"requests": args.requests, "concurrency": args.concurrency,
                "statuses": dict(statuses), "p50_ms": round(statistics.median(latencies), 2),
                "p95_ms": round(p95, 2), "message_delivery": "passed", "cross_replica_message": "passed" if len(set(urls)) > 1 else "not_tested_single_origin"}))
            assert statuses == {"200": args.requests}, "Some load requests failed"
            if args.max_p95_ms:
                assert p95 <= args.max_p95_ms, "p95 exceeds the configured target"
        finally:
            deleted = await client.delete(urls[0] + "/api/v1/auth/me", headers=headers)
            deleted.raise_for_status()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", action="append", required=True)
    parser.add_argument("--requests", type=int, default=40, choices=range(1, 1001), metavar="1..1000")
    parser.add_argument("--concurrency", type=int, default=8, choices=range(1, 51), metavar="1..50")
    parser.add_argument("--allow-external", action="store_true")
    parser.add_argument("--max-p95-ms", type=float)
    parser.add_argument("--transport", choices=("websocket", "polling"), default="websocket")
    asyncio.run(run(parser.parse_args()))
