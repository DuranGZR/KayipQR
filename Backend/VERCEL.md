# Vercel kurulumu — PostgreSQL ile tek veri deposu

Bu profil frontend ve FastAPI backend'i **iki Vercel projesi** olarak yayımlar. Hesaplar, eşyalar, sohbetler, bildirimler, e-posta kuyruğu ve sıkıştırılmış fotoğraflar PostgreSQL'de tutulur. Redis, Blob, S3 veya ayrı worker kurulmaz. PostgreSQL, Vercel Marketplace üzerinden bağlanan bir sağlayıcıda (örneğin Neon) çalışır; Vercel Function diski kalıcı depo olarak kullanılmaz. E-posta teslimi için Resend hesabı gerekir.

## 1. Backend projesi

GitHub reposunu içe aktarın, Root Directory olarak **Backend**, framework olarak **FastAPI** seçin. Repo içindeki `vercel.json` build komutunu, 60 saniye sınırını ve günlük bakım görevini tanımlar. Python sürümü `.python-version` ile 3.12'dir. Fluid Compute açık olmalıdır. Runtime bağımlılıkları `requirements.txt` dosyasındadır.

`Backend/vercel.env.example` içindeki değişkenleri panelin **Production** ortamına ekleyin:

- `DATABASE_URL`: sağlayıcının **pooled** PostgreSQL bağlantısı; runtime içindir. PostgreSQL bağlantı havuzu sağlayıcısı kullanılmalıdır. Uygulama her invocation/process için ayrı kalıcı havuz açmaz.
- `DIRECT_DATABASE_URL`: aynı veritabanının **direct / non-pooler** bağlantısı; migration kilidi için build sırasında kullanılır. Şemalar `python -m app.vercel_build` ile oluşturulur. Uygulama açılışında migration çalışmaz.
- `SECRET_KEY` ve `CRON_SECRET`: birbirinden bağımsız rastgele değerler. Her biri için `python -c "import secrets; print(secrets.token_hex(32))"` çalıştırabilirsiniz. Gerçek değerleri depoya veya README'ye yazmayın.
- `PUBLIC_APP_URL`, `BACKEND_BASE_URL`, `BACKEND_CORS_ORIGINS`: kendi frontend/backend HTTPS adresleriniz; origin'lerde sondaki `/` karakterini kaldırın. CORS'a yalnızca kendi frontend origin'lerinizi ekleyin.
- `RESEND_API_KEY` ve `EMAILS_FROM_EMAIL`: Resend'de doğrulanmış gönderici domain'inin değerleri.

Diğer bayrakları örnekteki gibi bırakın: `SERVERLESS_MODE=true`, `SINGLE_INSTANCE_MODE=false`, `RUN_BACKGROUND_TASKS=false`, `RUN_MIGRATIONS=false`, boş `REDIS_URL`, `STORAGE_BACKEND=database`, `PROXY_MODE=vercel`. Doğrudan Vercel domain'ine erişin; bu proxy ayarını başka platformda kullanmayın.

**Preview ortamına production veritabanı bağlantılarını kopyalamayın.** Preview yayımlayacaksanız ayrı PostgreSQL veritabanı ve ayrı tüm secret/origin değerlerini Preview kapsamına girin. Direct bağlantı tanımlanmadan build bilerek durur. Migration build sırasında çalıştığı için mevcut deployment ile uyumlu şema değişiklikleri yapılmalıdır; başarısız bir frontend/backend deployment veritabanını otomatik geri almaz.

## 2. Frontend projesi

Aynı repoyu tekrar içe aktarın. Root Directory **Frontend**, framework **Next.js** olsun. `Frontend/vercel.env.example` içindeki üç public değişkeni ekleyin. `NEXT_PUBLIC_API_URL` backend adresi ve `/api/v1` ile biter. `NEXT_PUBLIC_CHAT_TRANSPORT=polling` olarak kalmalıdır. Bunlar build sırasında gömülür; değişince yeniden deploy gerekir. Backend domain'i kesinleştikten sonra frontend'i; frontend domain'i kesinleştikten sonra backend CORS ve site adreslerini güncelleyin.

Frontend'e hiçbir PostgreSQL, Resend veya imza anahtarı koymayın. Backend API'sinin tarayıcıdan erişilebilir olması gerekir; Vercel Deployment Protection giriş ekranı API isteklerini engelliyorsa production domain'inin erişim ayarını düzenleyin. Deployment protection bypass anahtarını tarayıcıya eklemeyin.

## 3. Mesajlar, bildirimler ve e-posta

Mesajlar HTTP ile yazılır ve PostgreSQL'den okunur. Açık sohbet yaklaşık **15 saniye**, konuşma listesi **30 saniye**, zil/badge **60 saniye** arayla güncellenir. Süre önceki isteğin tamamlanmasından sonra başlar. Sekme gizli veya çevrimdışıysa istek gönderilmez; geri dönünce yenilenir. Bu profilde WebSocket ve yazıyor göstergesi çalıştırılmaz. Okundu bilgisi sohbet yeniden okunduğunda güncellenir. Vercel'in WebSocket desteği olsa da Redis'siz kopyalar arasında process belleğine dayalı canlı yayın kullanılmaz.

Bildirim ve şifre sıfırlama e-postaları önce SQL outbox'a kaydedilir. Başarılı POST ve QR açılışı istekleri, ASGI yanıtına bağlı ve invocation içinde beklenen kısa görevle en fazla 3 uygun e-postayı 15 saniyelik toplam bütçede göndermeyi dener. Kullanıcıya yanıtı göndermek e-posta sağlayıcısının gecikmesini beklemez; şifre sıfırlama yanıtının süresi de hesap varlığına göre değişmez. Sonsuz bir dispatcher veya sahipsiz `create_task` başlatılmaz. Invocation kesilirse kuyruk kaybolmaz. Hata/timeout kaydedilmiş mesajı başarısız saymaz. Lease süresi dolan işler daha sonraki uygun istekte veya günlük bakımda yeniden alınır. Trafik yoksa yeniden deneme günlük göreve kalabilir; bu yüzden anında teslim garantisi yoktur. Çok yoğun e-posta kuyruğu için ayrıca daha sık çalışan bir görev gerekir. Resend'de gönderici doğrulaması ve teslim loglarını kontrol edin.

## 4. Fotoğraflar ve saklama

Sunucu görselleri doğrular, EXIF bilgilerini atar, en fazla **1280×1280** alana sığdırır ve **256 KiB** veya altına kadar WebP sıkıştırması uygular. Büyük fotoğraflar tarayıcıda da küçültülür. Sunucuya gelen tek dosyanın sınırı **3 MiB**'dır; multipart ile toplam istek Vercel'in 4.5 MB sınırının altında tutulur. Sıkıştırma sonrası sınıra sığmayan fotoğraf reddedilir. Hassas sohbet fotoğrafları yalnızca süreli, imzalı uygulama URL'siyle okunur; veritabanı bağlantısı tarayıcıya açılmaz.

`MAX_STORAGE_SIZE_MB=200` yalnızca uygulamanın fotoğraf byte kotasıdır; PostgreSQL planındaki toplam disk, indeks, mesaj ve yedek alanını temsil etmez. Fotoğraf silindikten sonra PostgreSQL boş alanı tekrar kullanabilir; sağlayıcının faturalandırdığı disk boyutu hemen küçülmeyebilir. Sağlayıcı panelindeki toplam kullanım ayrıca izlenmelidir.

Günlük görev UTC **03:00** için tanımlıdır; Vercel Hobby zamanlamasında saat içinde gecikme olabilir. `CRON_SECRET` Vercel tarafından `Authorization: Bearer ...` başlığında gönderilir. `/internal/maintenance` kimlik doğrulaması olmadan çalışmaz. Her turda en fazla 100 eski fotoğraflı mesaj ve 100 yetim dosya işlenir. **Sohbet fotoğrafları 30 günü geçtikten sonraki bakımda kaldırılır; yazılı mesajlar kalır.** Profil/eşya görselleri ve daha yeni mesajların kullandığı ortak dosyalar korunur. Birikme varsa birden fazla günlük tur gerekir. Fotoğrafların eski kopyaları sağlayıcının yedek saklama süresi boyunca yedeklerde bulunabilir.

## 5. Mevcut SQLite verilerini taşıma

Otomatik migration yalnızca şemayı oluşturur. Mevcut hesap/eşya/mesajları kendiliğinden taşımaz. Yerel uygulamada yazmayı durdurun, SQLite'ı tutarlı bir snapshot olarak ve uploads klasörünü ayrıca yedekleyin. Dosyaları GitHub'a koymayın. Yedek üzerinde çalışın; hedefin bağlantılarını yerel terminal ortamına güvenli biçimde yükleyin (`STORAGE_BACKEND=database`). Hedefte önce migration çalışmış olmalı. Henüz hedefe kullanıcı trafiği açmayın.

Backend dizininden:

```sh
python -m app.import_database --source /path/to/snapshot.db --uploads /path/to/uploads
python -m app.import_database --source /path/to/snapshot.db --uploads /path/to/uploads --apply
```

İlk komut dry-run ile satır ve fotoğraf sayılarını gösterir; ikincisi tek transaction içinde aktarır. Hedefte iş verisi veya fotoğraf varsa üzerine yazmayı reddeder. Kaynak yalnızca okunur, silinmez. Hesap hash'leri, eşya/konuşma kimlikleri, QR kodları, mesajlar ve bildirimler korunur. Yalnızca referans verilen görseller sıkıştırılarak aktarılır; eski `/uploads/...` yolları korunur. Eksik dosyada aktarım durur. Eski e-posta outbox'ı ve geçici rate-limit sayaçları taşınmaz; geçmiş bildirimler yeniden mail olarak gönderilmez. Başarılı aktarım ikinci kez uygulanmaz; hedef dolu olduğu için reddedilir.

Kaynak fotoğrafların tamamını PostgreSQL'e taşımadan siteyi açmayın. Eski basılmış QR etiketleri localhost veya eski domain içeriyorsa veri aktarımı bunların içindeki adresi değiştiremez; eski domain'i yönlendirmek veya etiketi yeniden basmak gerekir.

## 6. Yayın sonrası doğrulama

`/health` ve `/ready` yanıtlarını, hesap açma/giriş/şifre sıfırlamayı, iki ayrı tarayıcıda sahip–bulan kişi mesajlaşmasını, okundu durumunu, fotoğraf yüklemeyi ve izinsiz görsel erişiminin reddini kontrol edin. Vercel Cron ve Resend loglarını inceleyin. Bakım testi için ayrı test verileri kullanın; production'da eski sohbet fotoğraflarını geri alınamaz biçimde temizler.

Kaynaklar: [FastAPI](https://vercel.com/docs/frameworks/backend/fastapi), [Cron sınırları](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Function sınırları](https://vercel.com/docs/functions/limitations), [IP başlıkları](https://vercel.com/docs/headers/request-headers).
