import asyncio
import html
import smtplib
import time
import ssl
import logging
import re
from email.utils import formatdate, make_msgid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Optional
from app.core.config import settings
from app.core.redis import get_redis, redis_key
from redis.exceptions import RedisError
import httpx


class EmailService:
    """
    Production-grade asynchronous transactional email service with HTML templates.
    Supports SMTP / Resend / AWS SES / Mailgun and implements scan-cooldown anti-spam.
    """

    def __init__(self):
        # Cache for scan email cooldown: item_id -> timestamp
        self._scan_cooldown_cache: Dict[str, float] = {}

    async def should_suppress_scan_email(self, item_id: str, cooldown_seconds: int = 600) -> bool:
        """
        Prevents spamming the user's inbox if a QR code is scanned repeatedly in a short time.
        Suppresses duplicate scan emails within the cooldown window (default 10 minutes).
        """
        if settings.SERVERLESS_MODE:
            from app.services.runtime_limits import consume_window
            try:
                return bool(await consume_window(f"scan-mail:{item_id}", 1, cooldown_seconds))
            except Exception:
                logging.getLogger(__name__).exception("Scan email cooldown unavailable")
                return True
        client = get_redis()
        if client is not None:
            try:
                return not await client.set(redis_key(f"scan-mail:{item_id}"), "1", ex=cooldown_seconds, nx=True)
            except RedisError:
                # Keep the in-app notification; do not spam email on cache outage.
                logging.getLogger(__name__).error("Scan email cooldown unavailable")
                return True
        now = time.time()
        last_sent = self._scan_cooldown_cache.get(item_id)
        if last_sent and (now - last_sent < cooldown_seconds):
            return True
        self._scan_cooldown_cache[item_id] = now
        return False

    def _send_smtp_sync(self, to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """Synchronous worker executed within asyncio.to_thread."""
        clean_subject = (subject or "").replace("\r", " ").replace("\n", " ").strip()
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            if settings.ENVIRONMENT in ("production", "staging"):
                logging.getLogger(__name__).error("SMTP configuration missing; email was not delivered")
                return False
            logging.getLogger(__name__).debug("Development email mock: delivery skipped")
            return True

        msg = MIMEMultipart("alternative")
        msg["Subject"] = clean_subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Date"] = formatdate(localtime=False, usegmt=True)
        msg["Message-ID"] = make_msgid()

        # Attach text and HTML parts
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        server = None
        try:
            if settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10, context=ssl.create_default_context())
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
                if settings.SMTP_TLS:
                    server.starttls(context=ssl.create_default_context())

            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            server.sendmail(settings.EMAILS_FROM_EMAIL, [to_email], msg.as_string())
            server.quit()
            return True
        except Exception as exc:
            logging.getLogger(__name__).error("SMTP delivery failed (%s)", type(exc).__name__)
            return False
        finally:
            if server is not None:
                server.close()

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: Optional[str] = None,
        text_body: Optional[str] = None,
        html_content: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> bool:
        """Non-blocking email delivery."""
        body_html = html_body if html_body is not None else (html_content or "")
        clean_subject = (subject or "").replace("\r", " ").replace("\n", " ").strip()
        if not text_body:
            # Strip tags for plain text fallback
            text_body = re.sub(r"<(style|script)\b[^>]*>.*?</\1>", "", body_html, flags=re.I | re.S)
            text_body = re.sub(r"<br\s*/?>|</(?:p|div|h[1-6])>", "\n", text_body, flags=re.I)
            text_body = html.unescape(re.sub(r"<[^>]+>", "", text_body)).strip()

        if settings.EMAIL_PROVIDER == "resend":
            if not settings.RESEND_API_KEY:
                return False
            headers = {"Authorization": f"Bearer {settings.RESEND_API_KEY}"}
            if idempotency_key:
                headers["Idempotency-Key"] = idempotency_key
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    response = await client.post("https://api.resend.com/emails", headers=headers, json={
                        "from": f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>",
                        "to": [to_email], "subject": clean_subject, "html": body_html, "text": text_body,
                    })
                if response.is_success and response.json().get("id"):
                    return True
                logging.getLogger(__name__).error("Resend delivery failed (HTTP %s)", response.status_code)
            except (httpx.HTTPError, ValueError):
                logging.getLogger(__name__).error("Resend delivery unavailable")
            return False
        return await asyncio.to_thread(self._send_smtp_sync, to_email, clean_subject, body_html, text_body)

    # ==========================================================================
    # HTML Email Template Generators
    # ==========================================================================

    def _get_base_template(self, title: str, preheader: str, content_html: str) -> str:
        return f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title, quote=True)}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FAF6EE;
      color: #33302B;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      width: 100%;
      background-color: #FAF6EE;
      padding: 40px 16px;
    }}
    .card {{
      max-width: 540px;
      margin: 0 auto;
      background-color: #FFFDF7;
      border: 2px solid #33302B;
      border-radius: 16px;
      box-shadow: 0 8px 0 #33302B;
      overflow: hidden;
    }}
    .header {{
      background-color: #F2B63C;
      border-bottom: 2px solid #33302B;
      padding: 24px 32px;
      text-align: center;
    }}
    .logo-text {{
      font-size: 24px;
      font-weight: 800;
      color: #33302B;
      letter-spacing: -0.5px;
      margin: 0;
    }}
    .body {{
      padding: 32px;
    }}
    .btn {{
      display: inline-block;
      background-color: #F2B63C;
      color: #33302B;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 28px;
      border: 2px solid #33302B;
      border-radius: 10px;
      box-shadow: 0 4px 0 #33302B;
      margin: 20px 0;
    }}
    .footer {{
      border-top: 1px solid rgba(51, 48, 43, 0.1);
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #6B665E;
    }}
    .preheader {{
      display: none !important;
      font-size: 1px;
      color: #FAF6EE;
      line-height: 1px;
      max-height: 0px;
      max-width: 0px;
      opacity: 0;
      overflow: hidden;
    }}
  </style>
</head>
<body>
  <span class="preheader">{html.escape(preheader, quote=True)}</span>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="logo-text">kayıp<span style="color: #9A680C;">qr</span></h1>
      </div>
      <div class="body">
        {content_html}
      </div>
      <div class="footer">
        <p>© {time.strftime('%Y')} KayıpQR — Anonim & Güvenli Kayıp Eşya İletişim Platformu</p>
        <p style="margin: 4px 0 0;">Bu e-posta sistem tarafından otomatik olarak gönderilmiştir.</p>
      </div>
    </div>
  </div>
</body>
</html>"""

    def render_password_reset_email(self, reset_url: str, user_name: Optional[str] = None) -> str:
        greeting = f"Merhaba {html.escape(user_name, quote=True)}," if user_name else "Merhaba,"
        safe_url = html.escape(reset_url or "", quote=True)
        content = f"""
        <h2 style="font-size: 20px; font-weight: 800; color: #33302B; margin-top: 0;">Şifre Sıfırlama Talebi 🔐</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #33302B;">{greeting}</p>
        <p style="font-size: 14px; line-height: 1.6; color: #33302B;">
          KayıpQR hesabınız için bir şifre sıfırlama talebinde bulundunuz. Yeni şifrenizi belirlemek için aşağıdaki butona tıklayabilirsiniz:
        </p>
        <div style="text-align: center;">
          <a href="{safe_url}" class="btn" target="_blank">Yeni Şifremi Belirle →</a>
        </div>
        <div style="background-color: #F6F1E3; border-left: 4px solid #F2B63C; padding: 12px 16px; border-radius: 6px; margin-top: 20px;">
          <p style="font-size: 12px; margin: 0; color: #6B665E;">
            ⏳ <strong>Önemli:</strong> Bu bağlantı güvenlik nedeniyle <strong>30 dakika</strong> boyunca geçerlidir. Eğer bu talebi siz yapmadıysanız bu e-postayı dikkate almayınız.
          </p>
        </div>
        """
        return self._get_base_template("Şifre Sıfırlama", "KayıpQR şifrenizi sıfırlama bağlantısı", content)

    def render_qr_scanned_email(
        self, item_name: str, device_type: str, city: Optional[str] = None, dashboard_url: str = ""
    ) -> str:
        location_text = f" ({html.escape(city, quote=True)})" if city else ""
        safe_item = html.escape(item_name or "", quote=True)
        safe_device = html.escape(device_type or "", quote=True)
        safe_url = html.escape(dashboard_url or (settings.PUBLIC_APP_URL + "/dashboard"), quote=True)
        content = f"""
        <div style="display: inline-block; background-color: #FEF3C7; border: 1px solid #F59E0B; color: #92400E; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px;">
          🚨 QR KOD TARAMASI
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #33302B; margin-top: 0;">Eşyanızın QR Kodu Okutuldu!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #33302B;">
          <strong>"{safe_item}"</strong> isimli eşyanıza ait KayıpQR kodu <strong>{safe_device}</strong> bir cihaz tarafından okutuldu{location_text}.
        </p>
        <div style="background-color: #F6F1E3; border: 1.5px solid #33302B; border-radius: 10px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px; color: #33302B;">
            <tr>
              <td style="padding: 4px 0; color: #6B665E;">Eşya:</td>
              <td style="padding: 4px 0; font-weight: 700; text-align: right;">{safe_item}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6B665E;">Cihaz:</td>
              <td style="padding: 4px 0; font-weight: 700; text-align: right;">{safe_device}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6B665E;">Zaman:</td>
              <td style="padding: 4px 0; font-weight: 700; text-align: right;">{time.strftime('%d.%m.%Y %H:%M')}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center;">
          <a href="{safe_url}" class="btn" target="_blank">Eşya Durumunu Gör →</a>
        </div>
        <p style="font-size: 12px; color: #6B665E; margin-top: 16px;">
          Bulan kişi size mesaj gönderdiğinde anında ayrıca bilgilendirileceksiniz.
        </p>
        """
        return self._get_base_template("QR Kodunuz Tarandı", f"'{item_name}' eşyanızın QR kodu okutuldu.", content)

    def render_new_message_email(self, item_name: str, message_snippet: str, chat_url: str) -> str:
        safe_item = html.escape(item_name or "", quote=True)
        safe_snippet = html.escape(message_snippet or "", quote=True)
        safe_url = html.escape(chat_url or "", quote=True)
        content = f"""
        <div style="display: inline-block; background-color: #D1FAE5; border: 1px solid #10B981; color: #065F46; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px;">
          💬 YENİ BULAN KİŞİ MESAJI
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #33302B; margin-top: 0;">Eşyanız İçin Mesaj Geldi!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #33302B;">
          <strong>"{safe_item}"</strong> eşyanızı bulan kişi size anonim bir mesaj gönderdi:
        </p>
        <div style="background-color: #FFFFFF; border: 1.5px solid #33302B; border-radius: 10px; padding: 16px; margin: 20px 0; font-style: italic; color: #33302B; font-size: 14px; box-shadow: 0 2px 0 #33302B;">
          "{safe_snippet}"
        </div>
        <div style="text-align: center;">
          <a href="{safe_url}" class="btn" target="_blank">Mesaja Cevap Ver →</a>
        </div>
        <p style="font-size: 12px; color: #6B665E; margin-top: 16px;">
          Hesap e-postanız ve telefonunuz bulan kişiye otomatik gösterilmez. Mesajlarınızda kendiniz paylaştığınız bilgiler karşı tarafa görünür.
        </p>
        """
        return self._get_base_template("Yeni Mesajınız Var", f"'{item_name}' için yeni bir mesajınız var.", content)


    def render_finder_reply_email(self, chat_url: str) -> str:
        safe_url = html.escape(chat_url, quote=True)
        content = f"""
        <h2>Eşya sahibi yanıtladı</h2>
        <p>Mesaj gönderdiğiniz eşyanın sahibi sohbetinize ilk yanıtını yazdı.</p>
        <div style="text-align: center;"><a href="{safe_url}" class="btn">Sohbete dön →</a></div>
        <p>Bu e-postayı saklayarak aynı sohbete daha sonra da dönebilirsiniz.
        Sonraki mesajlarda ayrıca e-posta gönderilmez.</p>
        <p>Bu bağlantı sohbetinize erişim sağlar; başkalarıyla paylaşmayın.
        Sohbet silindiğinde bağlantı çalışmaz. E-posta adresiniz eşya sahibine gösterilmez.</p>
        """
        return self._get_base_template("Eşya sahibi yanıtladı", "Sohbetinize geri dönebilirsiniz.", content)


email_service = EmailService()
