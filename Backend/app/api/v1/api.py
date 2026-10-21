from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    google,
    items,
    qr,
    scans,
    conversations,
    notifications,
    dashboard,
    public,
    uploads,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Kimlik Doğrulama (Auth)"])
api_router.include_router(google.router, prefix="/auth/google", tags=["Google Giriş"])
api_router.include_router(items.router, prefix="/items", tags=["Eşyalarım (Items)"])
api_router.include_router(qr.router, prefix="/qr", tags=["QR Stüdyo (QR Codes)"])
api_router.include_router(scans.router, prefix="/scans", tags=["Tarama Analitiği (Scans)"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Mesajlaşma (Chat)"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Bildirimler (Notifications)"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard Özet"])
api_router.include_router(public.router, prefix="/public", tags=["Public Bulan Kişi (Finder)"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["Dosya Yükleme (Uploads)"])
