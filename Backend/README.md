# KayıpQR API

FastAPI, async SQLAlchemy ve WebSocket tabanlı API. Kimlik doğrulama, eşya ve QR yönetimi, üyeliksiz bulan kişi iletişimi, mesajlaşma, dosya erişimi ve e-posta outbox servislerini içerir.

## Başlangıç

Tam yerel kurulum, ekran görüntüleri ve mimari için [ana README](../README.md) dosyasına bakın.

```powershell
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.lock
Copy-Item .env.example .env
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Mevcut `.env` dosyanızın üzerine yazmayın. Yeni ortam için rastgele bir `SECRET_KEY` üretin. Yerel varsayılanlar SQLite ve yerel dosya depolamasıdır; e-posta servisi yapılandırılmadan gerçek mail gönderilmez.

Bulan kişinin isteğe bağlı e-postası ve ilk sahip yanıtı bildirimi için dağıtımdan önce `alembic upgrade head` çalıştırılmalıdır (`20261023_finder_reply`). `PUBLIC_APP_URL` kullanıcıların eriştiği frontend adresi olmalıdır. İlk yanıt bildirimi, mesajla aynı işlemde outbox'a alınır; paralel yanıtlar tek bildirim oluşturur. Gönderim hataları mevcut outbox yeniden deneme mekanizmasını kullanır. Sohbet bağlantısı erişim anahtarını URL fragment'inde (`#chat=...`) taşır; bu bağlantı kişiye özeldir ve sohbet silinince geçersiz olur.

- `/docs` ve `/redoc`: yalnızca geliştirme/test ortamında API dokümantasyonu.
- `/health`: process canlılığı.
- `/ready`: veritabanı şeması ve yapılandırılan bağımlılıkların hazır olması.

## Testler

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\venv\Scripts\python.exe -m pytest tests -q
```

Varsayılan testler izole SQLite ve dosyalar kullanır. Gerçek PostgreSQL/Redis/S3 entegrasyonu için test değişkenleri ayrıca sağlanır. Gerçek kullanıcı veritabanını testlere vermeyin.

## Dağıtım

- [Railway: Frontend + API + Worker + PostgreSQL + Redis + Bucket](RAILWAY.md)
- [Genel production notları](PRODUCTION.md)
- [Yerel ortam örneği](.env.example)
- [Railway ortam örneği](railway.env.example)

Production migration: `python -m app.migrate`. Railway web servisinde pre-deploy aşamasına tanımlıdır. Worker `APP_ROLE=worker` ile `python -m app.entrypoint` komutundan başlar; HTTP portu açmaz.

SQLite iş verileri PostgreSQL'e otomatik taşınmaz. Referans verilen yerel dosyaların Bucket'a aktarımı için `python -m app.import_uploads --directory <uploads-yolu>` önce dry-run çalıştırır; gerçek kopyalama için ayrıca `--apply` gerekir.
