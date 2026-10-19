# Railway kurulumu

## Düşük trafikli, Redis'siz kurulum (seçilen yapı)

`railway.env.example` artık **tek Backend + PostgreSQL + özel Bucket** profilini kullanır. Frontend ayrı yayımlanır. Redis ve ayrı Worker servisi oluşturulmaz. `SINGLE_INSTANCE_MODE=true`, boş `REDIS_URL`, `APP_ROLE=web` ve `RUN_BACKGROUND_TASKS=true` birlikte kullanılmalıdır. Backend yalnızca **bir replica ve bir uvicorn process** çalıştırmalıdır. İstek limitleri ve canlı bağlantılar bu process'in belleğinde tutulur; yeniden başlatıldığında limit sayaçları sıfırlanır. Mesajlar veritabanında kalır. E-posta outbox'ı ve saatlik dosya bakımı aynı backend içinde çalışır.

`CHAT_PHOTO_RETENTION_DAYS=30` yalnızca sohbet fotoğraflarına uygulanır. Süre mesajın gönderildiği tarihten hesaplanır; saatlik bakımda en fazla 100 eski mesajın fotoğraf bağlantısı kaldırılır ve saklama süresinin dolduğu yazılır. Mesaj metni ve tarihi korunur. Profil/eşya görselleri kapsam dışıdır; daha yeni bir mesajda veya profil/eşyada kullanılan ortak dosya fiziksel olarak silinmez. Dosya silme hataları sonraki yetim dosya bakımında yeniden denenir. Bakım sırasında uygulama kapalıysa temizlik tekrar çalıştıktan sonra devam eder; yoğun birikimde birden fazla tur gerekir. Bucket'a bütün dosyaları yaşına göre silen genel bir lifecycle kuralı eklemeyin.

Bu profil sürekli çalışan bir backend içindir; Vercel gibi istek ömrüne bağlı fonksiyonlara taşıma düzenlemesi değildir. Aşağıdaki Worker/Redis ve replica adımları yalnızca ileride birden çok backend kopyasına geçildiğinde uygulanır. Kaynaklar bu kod değişikliğiyle hesabınızda otomatik oluşturulmaz.

## Birden çok backend için alternatif kurulum

Belgenin devamı **Frontend + Backend + Worker + PostgreSQL + Redis + Bucket** alternatifi içindir. Bu yapıda `SINGLE_INSTANCE_MODE=false`, `REDIS_URL=${{Redis.REDIS_URL}}`, `RUN_BACKGROUND_TASKS=false` ayarlarını kullanın.

## 1. Servisleri hazırlama

Aynı proje ve ortamda PostgreSQL, Redis ve bir Bucket oluşturun. Ardından aynı GitHub reposundan üç uygulama servisi ekleyin:

| Servis | Root Directory | Config File (repo kökünden) | Public domain |
|---|---|---|---|
| Backend | `/Backend` | `/Backend/railway.json` | Evet, API domain'i |
| Worker | `/Backend` | `/Backend/railway.worker.json` | Hayır |
| Frontend | `/Frontend` | `/Frontend/railway.json` | Evet, site domain'i |

Railway monorepo config yolu Root Directory'ye göre otomatik değişmez. Özellikle Worker'ın config dosyasını açıkça seçin; web sağlık kontrolünü worker'a uygulamayın. Dockerfile her servis kökünde bulunur. Backend ve Worker'a **volume bağlamayın**; bütün görseller Bucket'ta tutulur. İlk kurulumu tek bölgede, veritabanı ve uygulamalar birbirine yakın olacak şekilde yapın. Backend bir process/container çalıştırır; yatay ölçekleme Railway replica sayısıyla yapılır.

Kaynaklar: [monorepo](https://docs.railway.com/deployments/monorepo), [volume/replica sınırı](https://docs.railway.com/volumes/reference#caveats).

## 2. Değişkenler

`railway.env.example` içindeki değerleri Backend ve Worker'a uygulayın. Postgres/Redis/Bucket adlarını gerçek kaynak adlarıyla eşleştirin. Bağlantıları Railway variable reference ile bağlayın; internetten erişim açmayın. Ortamlar ayrı DB/Redis/Bucket kullanmalı; paylaşılan Redis varsa REDIS_PREFIX farklı olmalı. Web kopyaları aynı SECRET_KEY, Redis prefix'i, DB ve Bucket değerlerini kullanmalı.

- Backend: `APP_ROLE=web`, `RUN_BACKGROUND_TASKS=false`, `RUN_MIGRATIONS=false`.
- Worker: `APP_ROLE=worker`, diğer ortak ayarlar aynı; `RUN_BACKGROUND_TASKS=false`.
- SECRET_KEY: bağımsız rastgele en az 32 karakter; örneğin `python -c "import secrets; print(secrets.token_hex(32))"` ile üretin ve yalnızca panel secrets alanına kaydedin.
- PUBLIC_APP_URL gerçek HTTPS site origin'i olmalı. BACKEND_CORS_ORIGINS site origin'lerini JSON liste olarak içermeli; domain değişince güncelleyin. BACKEND_BASE_URL gerçek HTTPS API origin'i olmalı.
- Railway için `PROXY_MODE=railway`: platformun yeniden ürettiği X-Real-IP kullanılır. X-Forwarded-For/Cloudflare istemci başlıklarına güvenilmez. Bu modda API portuna ayrıca public TCP proxy açmayın; private ağdaki servisler güven sınırının içindedir. Platform dışında `PROXY_MODE=explicit` ve belirli proxy IP/CIDR listesi kullanın.
- S3 endpoint ve addressing style'ı Bucket Credentials ekranından alın. Yeni Railway bucket'ları genellikle virtual-hosted stil kullanır; eski bucket path stil istiyorsa S3_ADDRESSING_STYLE=path seçin. S3 endpoint HTTPS olmalı, bucket adı endpoint'in içine tekrar eklenmemeli.

Frontend'e yalnızca NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL ve NEXT_PUBLIC_APP_URL girin. Bunlar Docker build arg'larıdır; değişince frontend yeniden build edilmelidir. DB, Redis, Bucket ve e-posta anahtarlarını frontend'e koymayın.

## 3. E-posta

Railway Hobby/Trial/Free ortamlarında SMTP çıkışı kapalı olduğundan önerilen yapı `EMAIL_PROVIDER=resend` ve HTTPS API'dir. Resend hesabında gönderici domain'ini doğrulayıp API key'i Backend ve Worker'a girin. SPF/DKIM/DMARC ayarlarını sağlayıcının verdiği DNS kayıtlarıyla tamamlayın. Gerçek maili worker gönderir; web yalnızca DB outbox kaydı oluşturur. Pro ve üzerinde mevcut SMTP desteği de kullanılabilir; config sağlayıcıya göre gerekli alanları doğrular.

Outbox işleri tek atomik DB güncellemesiyle sahiplenilir; iş başına 180 saniyelik lease vardır. Worker kapanırsa süresi dolan iş başka worker tarafından alınır. Denemeler artan aralıklarla en fazla 8 kez yapılır. Resend'e aynı iş için aynı idempotency anahtarı gönderilir. Bu, uçtan uca mutlak exactly-once garantisi değildir: sağlayıcının idempotency süresi ve SMTP'nin sınırları geçerlidir. Başarılı gövdeler temizlenir, teslim/başarısız kayıtlar 7 gün sonra silinir. `pending/processing/failed` adetleri ve en eski iş yaşını izleyin. Silinen hesabın sıradaki e-postaları da kaldırılır; zaten gönderilmeye başlanmış mail geri alınamaz.

Kaynak: [Railway e-posta çıkışı](https://docs.railway.com/networking/outbound-networking), [Resend gönderim API'si](https://resend.com/docs/api-reference/emails/send-email).

## 4. Migration ve ilk deploy

Backend config, `python -m app.migrate` komutunu pre-deploy aşamasında çalıştırır. PostgreSQL advisory lock aynı DB'ye eşzamanlı migration yapılmasını önler. Başarısız migration'da Railway dağıtımı ilerletmez. Worker migration çalıştırmaz; ilk kurulumda Backend migration'ı tamamlandıktan sonra Worker'ı açın. Sonraki şema değişikliklerini eski/yeni sürümlerle uyumlu yapın; web ve worker dağıtımlarının birbirleriyle otomatik atomik olmadığını dikkate alın.

Backend, Railway PORT değişkenini dinler. Sağlık yolu `/ready`; DB şeması, Redis aboneliği ve Bucket erişimi kontrol edilir. `/health` yalnızca process liveness içindir. Worker HTTP servisi değildir ve healthcheckPath almaz. Railway'in deploy sağlık kontrolü sürekli izleme yerine geçmez; servis ve kuyruk için ayrıca alarm kurun.

Kaynak: [pre-deploy](https://docs.railway.com/deployments/pre-deploy-command), [healthcheck](https://docs.railway.com/deployments/healthchecks).

## 5. Mevcut veriler ve dosyalar

Gerçek SQLite/yerel uploads bu çalışma sırasında değiştirilmedi. Alembic, SQLite'daki kullanıcı/eşya/mesaj verilerini kendiliğinden PostgreSQL'e taşımaz. Mevcut verileri koruyacaksanız önce ayrı bir veri aktarımı ve doğrulaması gerekir. Veritabanı ve uploads yedeği olmadan kaynakları silmeyin.

Hedef iş veritabanı ve S3 değişkenleriyle, mevcut uploads klasörünün bulunduğu makinede:

```sh
python -m app.import_uploads --directory /path/to/uploads
python -m app.import_uploads --directory /path/to/uploads --apply
```

İlk komut dry-run'dır. İkinci komut yalnızca DB'de referans verilen dosyaları, aynı dosya adı/yoluyla kopyalar; yerel asılları silmez. Eksik dosyada durur, farklı içerikli S3 nesnesinin üzerine yazmaz. Aynı verilerle tekrar çalıştırılabilir; kısmi aktarımda yeniden deneyebilirsiniz. Eski `/uploads/...` bağlantıları korunur. Aktarım tamamlanmadan S3 backend'iyle kullanıcı trafiği açmayın.

Yeni S3 dosyaları SQL metadata ve ortak kota rezervasyonuyla izlenir; iki kopya eşzamanlı yüklese de toplam kota aşılmaz. Ağ hatasında PUT'ın ulaşıp ulaşmadığı belirsizse rezervasyon korunur ve 24 saat sonra kontrol/temizlik yapılır. Bu sırada kota kullanımı görülebilir; bucket'a uygulama dışından dosya eklemek kota takibine dahil değildir. Silme hatası iş verisini geri almaz; worker yeniden dener. 24 saati aşmış, referanssız dosyalar en fazla 100'lük bakım partilerinde temizlenir. Uygulamanın kota ve metadata düzenini bypass ederek Bucket'a yazmayın.

## 6. Ölçekleme ve mesaj tutarlılığı

Redis, atomik kayan pencere istek limitlerini, scan-mail cooldown'u ve backend kopyaları arasındaki canlı olay yayınını ortaklaştırır. Redis kapalıyken korumalı istekler bellek limitine düşmez; 503 döner. WebSocket aboneliği kesilirse yerel soketler yeniden bağlanıp DB geçmişini alır. Publish hatası kaydedilmiş mesajı hatalı HTTP 500'e dönüştürmez. Heartbeat, DB'deki son mesaj/status ile istemciyi uzlaştırır; Redis Pub/Sub kalıcı mesaj deposu olarak kullanılmaz.

Her container için HTTP eşzamanlı istek kabul sınırı MAX_ACTIVE_REQUESTS ile ayarlanır (varsayılan 200); kapasite dolunca 503 ve Retry-After döner. WebSocket bağlantıları bu HTTP sayacına dahil edilmez. Body boyutu multipart ayrıştırılmadan önce MAX_UPLOAD_SIZE_MB + 1 MB ile sınırlanır; aşımda 413 döner. Görsel işleme/yükleme iki eşzamanlı işle sınırlandırılır. Bu değerleri replica RAM/CPU ölçümlerine göre ayarlayın; platform WAF/edge koruması ve bütçe alarmları yine gereklidir.

API listeleri varsayılan 100, en fazla 200 kayıt döner (`limit`, `offset`). Mesaj geçmişi `limit` ve konuşmaya bağlı `before` cursor'uyla sayfalanır, yanıt `next_cursor` içerir. İstemci mevcut ekran davranışını korumak için sayfaları birleştirir. Bu, tarayıcının toplam geçmiş belleğini sınırsız ölçeklenebilir yapmaz; çok büyük sohbetler için ileride görünür eski mesaj yükleme/sanallaştırma ayrıca değerlendirilebilir. HTTP mesaj yazımı, typing ve WebSocket yetkilendirmesi tüm geçmişi yüklemez.

İlk doğrulamadan sonra Backend replica sayısını 2 yapın ve test edin. Her process'in kendi DB havuzu vardır; toplam bağlantı bütçesi yaklaşık `replica × (DB_POOL_SIZE + DB_MAX_OVERFLOW)` artı worker ve migration bağlantılarıdır. Varsayılan 5+5 havuz değerlerini PostgreSQL kapasitesine göre ayarlayın. Gerekirse Railway connection pooler kullanın. Worker'ı web isteğine bağlı ölçeklemeyin; kuyruk gecikmesine göre artırın. Redis tek düğüm ve PostgreSQL tek düğüm kendiliğinden yüksek erişilebilirlik sağlamaz; gerektiğinde HA/yedek stratejisini ayrıca kurun.

## 7. Doğrulama ve yük testi

```sh
python -m pip install -r requirements.lock -r requirements-dev.txt
python -m pytest tests -q
```

Varsayılan testler geçici SQLite ve izole dosyalar kullanır; e-posta göndermez. `TEST_DATABASE_URL` ile yalnızca adı test içeren izole PostgreSQL seçilebilir. `TEST_REDIS_URL` varsa replica/limit testleri gerçek Redis kullanır; yoksa fakeredis kullanılır. Gerçek S3 protokol testi `TEST_S3_ENDPOINT`, `TEST_S3_ACCESS_KEY`, `TEST_S3_SECRET_KEY` tanımlanınca seçilen izole S3 test servisine karşı çalışır; aksi halde atlanır. Varsayılan CI, PostgreSQL fotoğraf depolamasını doğrular; S3 servisi başlatmaz.

`.github/workflows/backend.yml`, PostgreSQL + Redis + S3 protokol testlerini ve iki gerçek backend process'iyle fonksiyon/yük smoke testini çalıştıracak şekilde tanımlıdır. Workflow dosyasının bulunması, bu makinede CI'nin çalıştığı anlamına gelmez.

Staging'de kontrollü test:

```sh
python scripts/load_smoke.py --base-url https://staging-api.example --allow-external --requests 80 --concurrency 8
```

Test geçici hesap oluşturur ve sonunda siler; mail bildirimlerini kapatır. İki replica'yı doğrudan yerelde test etmek için iki ayrı localhost origin'i `--base-url` ile verilir. p50/p95, durum kodları ve sohbet iletimi raporlanır. Bu küçük smoke testi, binlerce kullanıcılık kapasite garantisi değildir; gerçek trafik dağılımına uygun kademeli yük testini staging'de ayrıca yapın. Rastgele production URL'sine yük testi uygulamayın.

## 8. Yayın kontrolü

- İki replica arasında owner/finder mesajı, typing, read ack, bağlantı yenileme ve eksik olay uzlaştırması çalışmalı.
- Redis kesintisi, worker yeniden başlatma ve başarısız mail denemesi incelenmeli.
- Gerçek Resend e-postası ulaşmalı; parola sıfırlaması eski oturumu iptal etmeli.
- Özel görsel imzasız açılmamalı; geçerli bağlantı Bucket'tan yüklenmeli.
- PostgreSQL ve dosyalar için ayrı yedek/geri dönüş denemesi yapılmalı. Railway Bucket'ta volume yedeği veya S3 object versioning varmış gibi varsaymayın; ayrı kopya politikasını belirleyin.
- Uygulama/Redis/DB CPU-RAM, bağlantı sayısı, p95, 429/503/507 ve kuyruk yaşı izlenmeli; bütçe/kapasite alarmları ayarlanmalı.

Platform sınırları ve özellikleri zamanla değişebilir; kaynak belgeler deploy günü tekrar kontrol edilmelidir.
