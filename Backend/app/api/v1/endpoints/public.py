from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.rate_limiter import rate_limiter
from app.core.security import sanitize_message_content
from app.db.session import get_db, AsyncSessionLocal
from app.models.item import Item
from app.models.qr_code import QRCode
from app.schemas.public import (
    PublicItemResponse,
    PublicContactRequest,
    PublicContactResponse,
)
from app.services.scan_service import scan_service
from app.services.chat_service import chat_service
from app.services.notification_service import notification_service
from app.services.storage_service import storage_service

router = APIRouter()


async def record_scan_in_background(
    item_id: str,
    client_ip: str,
    user_agent: str,
    city: str = None,
    country: str = None,
):
    """Background task to record scan without blocking public response."""
    async with AsyncSessionLocal() as db:
        query = select(Item).where(Item.id == item_id).options(selectinload(Item.owner))
        result = await db.execute(query)
        item = result.scalars().first()
        if item:
            scan = await scan_service.log_scan(
                db=db,
                item=item,
                client_ip=client_ip,
                user_agent=user_agent,
                approximate_city=city,
                approximate_country=country,
            )
            
            # Check owner's notification preferences
            send_email = item.owner.email_on_scan if item.owner else True
            owner_email = item.owner.email if item.owner else None

            location_text = f" ({scan.approximate_city})" if scan.approximate_city else ""
            await notification_service.create_notification(
                db=db,
                user_id=item.user_id,
                type_="qr_scanned",
                title=f"QR Kodun Okutuldu! ({item.name})",
                body=f"'{item.name}' eşyanızın QR kodu {scan.device_type} bir cihaz tarafından tarandı{location_text}.",
                item_id=item.id,
                link=f"/dashboard?item={item.id}",
                send_email=send_email,
                user_email=owner_email,
                extra_data={
                    "item_name": item.name,
                    "device_type": scan.device_type,
                    "city": scan.approximate_city,
                },
            )


@router.get("/q/{unique_code}", response_model=PublicItemResponse)
async def get_public_item_by_qr(
    unique_code: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Bulan kişi QR okuttuğunda çalışan endpoint.
    Hassas sahip bilgilerini KESİNLİKLE gizler.
    Rate limiting ile spam taramalara karşı korunur.
    """
    # Rate limit: Max 30 scans per minute per IP
    await rate_limiter.check_rate_limit(request, max_requests=30, window_seconds=60, key_prefix="public_scan")

    code_clean = unique_code.strip().upper()
    query = (
        select(QRCode)
        .where(QRCode.unique_code == code_clean)
        .options(selectinload(QRCode.item))
    )
    result = await db.execute(query)
    qr = result.scalars().first()

    if not qr or not qr.item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KayıpQR kodu bulunamadı veya geçersiz.",
        )

    item = qr.item

    if not item.is_active:
        return PublicItemResponse(
            unique_code=code_clean,
            name="Devre Dışı",
            category="Genel",
            description="Bu QR kodu sahibi tarafından geçici olarak devre dışı bırakılmıştır.",
            owner_display_name="Eşya Sahibi",
            image_url=None,
            status=item.status,
            is_active=False,
            reward_text=None,
            created_at=item.created_at,
        )

    # Queue background scan recording with real client IP and User-Agent
    client_ip = rate_limiter.get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    cf_city = None
    cf_country = None
    if rate_limiter.is_trusted_proxy(request):
        raw_city = (
            request.headers.get("cf-ipcity")
            or request.headers.get("x-vercel-ip-city")
            or request.headers.get("x-geo-city")
        )
        raw_country = (
            request.headers.get("cf-ipcountry")
            or request.headers.get("x-vercel-ip-country")
            or request.headers.get("x-geo-country")
        )
        cf_city = raw_city.strip()[:100] if raw_city else None
        cf_country = raw_country.strip()[:100] if raw_country else None

    background_tasks.add_task(
        record_scan_in_background,
        item.id,
        client_ip,
        user_agent,
        cf_city,
        cf_country,
    )

    return PublicItemResponse(
        unique_code=code_clean,
        name=item.name if item.show_name_to_finder else "Kayıp Eşya",
        category=item.category,
        description=item.description if item.show_desc_to_finder else None,
        owner_display_name=item.owner_display_name or "Eşya Sahibi",
        image_url=item.image_url,
        status=item.status,
        is_active=item.is_active,
        reward_text=item.reward_text,
        created_at=item.created_at,
    )


@router.post("/q/{unique_code}/contact", response_model=PublicContactResponse, status_code=status.HTTP_201_CREATED)
async def contact_item_owner(
    unique_code: str,
    contact_in: PublicContactRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Bulan kişinin sahibe anonim ilk mesajı ve opsiyonel konumu göndermesini sağlar.
    Rate limit ve içerik sanitizasyonu ile korunur.
    """
    # Rate limit: Max 5 new contact creations per minute per IP
    await rate_limiter.check_rate_limit(request, max_requests=5, window_seconds=60, key_prefix="public_contact")

    code_clean = unique_code.strip().upper()
    query = (
        select(QRCode)
        .where(QRCode.unique_code == code_clean)
        .options(selectinload(QRCode.item))
    )
    result = await db.execute(query)
    qr = result.scalars().first()

    if not qr or not qr.item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KayıpQR kodu bulunamadı.",
        )

    item = qr.item
    if not item.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu QR kodu pasif durumdadır.",
        )

    clean_content = sanitize_message_content(contact_in.message)
    if not clean_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mesaj içeriği boş olamaz.",
        )

    if contact_in.location_lat is not None and contact_in.location_lng is not None:
        client_ip = rate_limiter.get_client_ip(request)
        cf_city = None
        cf_country = None
        if rate_limiter.is_trusted_proxy(request):
            raw_city = (
                request.headers.get("cf-ipcity")
                or request.headers.get("x-vercel-ip-city")
                or request.headers.get("x-geo-city")
            )
            raw_country = (
                request.headers.get("cf-ipcountry")
                or request.headers.get("x-vercel-ip-country")
                or request.headers.get("x-geo-country")
            )
            cf_city = raw_city.strip()[:100] if raw_city else None
            cf_country = raw_country.strip()[:100] if raw_country else None

        city_val = (contact_in.approximate_city[:100] if contact_in.approximate_city else None) or cf_city
        country_val = (contact_in.approximate_country[:100] if contact_in.approximate_country else None) or cf_country

        await scan_service.log_scan(
            db=db,
            item=item,
            client_ip=client_ip,
            user_agent=contact_in.user_agent or request.headers.get("user-agent"),
            approximate_city=city_val,
            approximate_country=country_val,
            latitude=contact_in.location_lat,
            longitude=contact_in.location_lng,
        )

    conv, msg = await chat_service.create_conversation_from_finder(
        db=db,
        item=item,
        content=clean_content,
        location_lat=contact_in.location_lat,
        location_lng=contact_in.location_lng,
        location_address=contact_in.location_address,
    )

    return PublicContactResponse(
        conversation_id=conv.id,
        finder_session_token=conv.finder_session_token,
        message="Mesajınız eşya sahibine güvenle iletildi.",
        status=conv.status,
    )


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_public_image(
    request: Request,
    file: UploadFile = File(...),
):
    """
    Bulan kişinin fotoğraf / kanıt yüklemesini sağlar.
    Rate limit ve sıkı görsel doğrulaması (EXIF temizleme dahil) ile korunur.
    """
    # Rate limit: Max 6 uploads per minute per IP
    await rate_limiter.check_rate_limit(request, max_requests=6, window_seconds=60, key_prefix="public_upload")
    await rate_limiter.check_rate_limit(request, max_requests=60, window_seconds=86400, key_prefix="public_upload_daily")
    
    file_url = await storage_service.save_upload_file(file)
    return {"url": file_url}

