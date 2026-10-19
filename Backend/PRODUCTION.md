# Production işletim notları

Railway için güncel kurulum belgesi [RAILWAY.md](RAILWAY.md), değişken şablonu [railway.env.example](railway.env.example) dosyasıdır. Redis + PostgreSQL + S3 Bucket + ayrı worker yapısı backend replica kullanımını destekler.

İş verileri bu çalışma sırasında taşınmadı. Lease, dosya metadata/kota ve indeks migration'larını Railway Backend pre-deploy komutu çalıştırır. Worker migration çalıştırmaz. SQLite verileri PostgreSQL'e Alembic ile kendiliğinden aktarılmaz; mevcut veriler için ayrı aktarım gerekir.

İlk güvenlik güncellemesi öncesindeki token'lar kabul edilmez; bir kez yeniden giriş gerekir. Eski bcrypt parolaları girişte Argon2id'ye geçirilir. Argon2id okuyamayan eski sürüme doğrudan rollback yapılmamalı. Parola değişimi/sıfırlaması eski oturumları iptal eder.

Backend ve frontend birlikte dağıtılmalı. WebSocket subprotocol başlığı proxy'den geçmeli. Eski query token'lar uygulama loglarında maskelenir; proxy'de query string loglamayın. API sayfaları mevcut ekranlar için istemcide birleştirilir; sayfa tasarımları korunur. Eski /uploads/ yolları Bucket yönlendirmesiyle çalışır.

Önceden web içinde e-posta gönderen sürüm yayınlandıysa, eski web kapandıktan sonra yeni worker'ı açın. Lease kullanmayan eski göndericiyle yeni worker'ı birlikte çalıştırmayın.

Repo kökündeki .env.example tek-instance Compose içindir. Bu profil RUN_MIGRATIONS=true ile başlangıç migration'ı, yerel volume ve entegre mail/bakım görevleri kullanır. Replica hedefinde Railway yapısını kullanın. Eski volume root'a aitse sadece o volume'un sahipliğini app UID/GID'sine uyarlayın; image root olarak çalışmaz. Compose portları localhost'a bağlıdır; TLS reverse proxy, belirli TRUSTED_PROXIES ve ingress body/istek limitleri gereklidir.

Gerçek PostgreSQL/Redis/Bucket ile /ready, owner/finder mesajlaşması, e-posta teslimatı, parola sıfırlaması, dosya gizliliği ve yedekten dönüş doğrulanmalıdır. Kalıcı disk/bucket yedek değildir. Yerel testler veya CI dosyası, canlı Railway hesabının doğrulandığı anlamına gelmez.
