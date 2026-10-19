import hashlib
from typing import List, Optional
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.item import Item
from app.models.qr_scan import QRScan
from app.schemas.qr_scan import QRScanResponse
from app.schemas.dashboard import RecentScanItem


class ScanService:
    @staticmethod
    def parse_user_agent(user_agent: Optional[str]) -> tuple[str, str]:
        if not user_agent:
            return "Bilinmeyen", "Bilinmeyen"

        ua = user_agent.lower()
        if "iphone" in ua or "ipad" in ua:
            device = "iOS (Apple)"
        elif "android" in ua:
            device = "Android"
        elif "windows" in ua:
            device = "Windows Masaüstü"
        elif "macintosh" in ua or "mac os" in ua:
            device = "Mac Masaüstü"
        else:
            device = "Mobil"

        if "chrome" in ua and "edg" not in ua and "opr" not in ua:
            browser = "Chrome"
        elif "safari" in ua and "chrome" not in ua:
            browser = "Safari"
        elif "firefox" in ua:
            browser = "Firefox"
        elif "edg" in ua:
            browser = "Edge"
        else:
            browser = "Web Tarayıcı"

        return device, browser

    @staticmethod
    def hash_ip(client_ip: Optional[str]) -> Optional[str]:
        if not client_ip:
            return None
        return hashlib.sha256(client_ip.encode("utf-8")).hexdigest()[:16]

    @staticmethod
    async def resolve_ip_location(ip: Optional[str]) -> tuple[Optional[str], Optional[str]]:
        """
        Asynchronously resolves approximate city and country from IP when ENABLE_EXTERNAL_GEOIP is enabled.
        Handles localhost/internal IPs gracefully without leaking IPs over HTTP by default.
        """
        from app.core.config import settings

        if not ip or ip in ["127.0.0.1", "::1", "localhost", "testclient"]:
            return "Yerel Konum", "Türkiye"

        if not settings.ENABLE_EXTERNAL_GEOIP:
            return None, "Türkiye"

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"http://ip-api.com/json/{ip}?fields=status,city,country")
                if res.status_code == 200:
                    data = res.json()
                    if data.get("status") == "success":
                        return data.get("city"), data.get("country")
        except Exception:
            pass

        return None, "Türkiye"

    @classmethod
    async def log_scan(
        cls,
        db: AsyncSession,
        item: Item,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        approximate_city: Optional[str] = None,
        approximate_country: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> QRScan:
        device_type, browser = cls.parse_user_agent(user_agent)
        ip_hash = cls.hash_ip(client_ip)

        # If city/country not explicitly supplied, try auto geo-ip resolve
        if not approximate_city:
            geo_city, geo_country = await cls.resolve_ip_location(client_ip)
            approximate_city = geo_city
            if not approximate_country:
                approximate_country = geo_country

        scan = QRScan(
            item_id=item.id,
            ip_hash=ip_hash,
            user_agent=user_agent[:500] if user_agent else None,
            device_type=device_type,
            browser=browser,
            approximate_city=approximate_city,
            approximate_country=approximate_country or "Türkiye",
            latitude=latitude,
            longitude=longitude,
        )
        db.add(scan)
        await db.commit()
        await db.refresh(scan)
        return scan

    @staticmethod
    async def get_item_scans(db: AsyncSession, item_id: str, limit: int = 50) -> List[QRScanResponse]:
        query = (
            select(QRScan)
            .where(QRScan.item_id == item_id)
            .order_by(QRScan.scanned_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        scans = result.scalars().all()
        return [QRScanResponse.model_validate(s) for s in scans]

    @staticmethod
    async def get_recent_scans_for_user(db: AsyncSession, user_id: str, limit: int = 10) -> List[RecentScanItem]:
        query = (
            select(QRScan, Item.name)
            .join(Item, Item.id == QRScan.item_id)
            .where(Item.user_id == user_id)
            .order_by(QRScan.scanned_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        rows = result.all()

        return [
            RecentScanItem(
                scan_id=scan.id,
                item_id=scan.item_id,
                item_name=item_name,
                scanned_at=scan.scanned_at,
                device_type=scan.device_type,
                approximate_city=scan.approximate_city,
                approximate_country=scan.approximate_country,
            )
            for scan, item_name in rows
        ]


scan_service = ScanService()
