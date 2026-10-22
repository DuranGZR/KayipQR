# 13 kullanıcı deneyimi ve sistem iyileştirmesi

22 Ekim 2026 tarihli incelemedeki 13 başlık kaynak kodda uygulandı. Bu belge yerel doğrulamayı anlatır; canlıya yayın veya fiziksel cihaz/baskı onayı değildir. Krem/sarı görünüm ve ayrı masaüstü/mobil düzenler korundu.

| Başlık | Uygulanan değişiklik | Kontrol |
|---|---|---|
| UX-01 · QR okunabilirliği | Aynı veya 3:1 altı kontrastta kaydetme/indirme engeli; sunucuda oluşturma, düzenleme ve PNG için aynı kontrol. Orijinal renkleri geri getirme. Karbon tasarımının küçük boyuttaki yön bulma merkezini düzeltme. | API oluşturma/güncelleme reddi ve geri alma testi; mobil/masaüstü düğmeleri; 8 tasarım × 420/900 px dijital okuma başarılı. |
| UX-02 · Bağlantı hataları | Yükleniyor, hata, boş ve dolu durumlarını ayırma; Türkçe bağlantı/zaman aşımı metinleri; yeniden deneme; eski listeyi güncellenemediği bilgisiyle koruma. Mesaj, hesap, tarama ve bildirim hatalarını görünür yapma. | Yerel API kapatıldı: 20 eski kayıt korundu; yenilemede sahte boş hesap gösterilmedi. HTTP katmanı otomatik işlem tekrarı yapmıyor. |
| UX-03 · Taslak korunması | Stüdyo, hesap ve cevap/yer notlarını responsive görünümün üstünde ortak bellekte tutma. İşlem sırasında görünüm değişiminde ortak meşgul durumu. | Stüdyo adı/notu 390→844→390; hesap adı ve sohbet cevabı masaüstü→mobil geçişinde korundu. Form/parolalar kalıcı tarayıcı depolamasına yazılmıyor. |
| UX-04 · Form erişilebilirliği | Giriş/kayıt ve masaüstü alanlarında adlandırma; otomatik doldurma bilgileri; parola göster/gizle adı ve durumu; hata mesajına bağlantı. | Giriş alanları etiketleriyle dolduruldu; stüdyo/ayar alanlarının erişilebilir adları kontrol edildi. |
| UX-05 · Onay pencereleri | Sheet ve masaüstü pencereleri için ortak dialog davranışı: ad, modal semantiği, ilk odak, Tab sınırı, Escape ve odak dönüşü. | Hesap silme onayı klavyeyle açıldı; odak içeride kaldı; Escape kapattı ve açan düğmeye döndü. Silme metni ve koşulu korunuyor; hesap silinmedi. |
| UX-06 · E-posta doğrulama | Token URL'den temizlenirken sekmeye ve geçmiş kaydına bağlı, süreli devam bilgisi. İzinli dönüş hedefini kayıt, tekrar gönderme ve e-postada taşıma. | Yenileme ve Strict Mode devam testi; süresi dolan/ilgisiz geçmiş kaydını reddetme; gerçek test tokenıyla doğrulama ve tek kullanım; `/studio` e-postaya taşındı. |
| UX-07 · Bildirimler | Gerçek okunmamış toplamı; okunmamış filtresi; 20'lik sayfalar ve daha fazla yükleme; okundu işleminde liste/sayacı birlikte yenileme. | En eski kaydı okunmamış 51 bildirimde sayaç 1; eski kayıt filtreyle bulundu; başka hesaba erişim reddedildi. |
| UX-08 · Bulan kişinin geri dönüşü | İlk mesajdan sonra aynı tarayıcıdan QR'ı yeniden açma ve depolama/gizli sekme kaybı açıklaması, Türkçe/İngilizce. | Yerel ilk mesajdan sonra açıklama göründü; aynı tarayıcıyla yenilemede konuşma sürdü. |
| UX-09 · Ortak alan kuralları | Eşya/sahip adı 255, web notu 2000, baskı yazısı 22; kaydetme ve indirmede aynı zorunlu isim kuralı. İndirmede gerçek kayıt kodunu doğrudan kullanma. | İki görünümde alan sınırları eşitlendi; görünüm geçişinde not ve isim kaybolmadı; boş isim aynı kontrolü kullanıyor. |
| UX-10 · Ayarlardan çıkış | Bölümden veya site içi bağlantıyla çıkışta uygulama içi vazgeçme penceresi; pencere kapatmada tarayıcı uyarısı; doğru “Değişiklik yok” durumu. | Vazgeçme iptal edildiğinde profil taslağı kaldı; sayfadan çıkış ayrıca uyarı gösterdi. |
| UX-11 · Başlama ve dil | Yeni kullanıcı CTA'larında `/register?redirect=/studio`; devre dışı Google düğmesine neden; sade tasarım metinleri; dijital etiket/baskı açıklaması; footer ve hesapta destek e-postası. | Rotalar ve arayüz metinleri kontrol edildi; mevcut ürün ve masaüstü düzeni korundu. |
| UX-12 · Bildirim beklentisi | Site açık ve görünürken yaklaşık dakikalık kontrolü açıklama; kapalı sitede ilk mesaj e-postası tercihinin geçerli olduğunu belirtme; masaüstü izin teklifini oturum boyunca kapatabilme. | Görünürlük/ağ/çakışan sorgu testleri geçti; yanlış “anında” vaatleri kaldırıldı. Yeni push altyapısı veya dakikalık e-posta cron'u eklenmedi. |
| SYS-01 · Liste yükü | Başlangıçta yalnızca 20 eşya/konuşma; sunucuda arama/filtre; kullanıcı isteğiyle daha fazla yükleme. Yenilemede yalnızca kullanıcının açtığı sayfalar. Profil sorgularını token bazında 15 saniye paylaşma. | 25 eşyada önce 20, sonra 5; ilk sayfada olmayan eşya sunucu aramasında bulundu; konuşma araması ve hesap izolasyonu test edildi; eşzamanlı profil okumaları tek istek. |

## Doğrulama

- Backend: `venv/Scripts/python.exe -m pytest -q` — **90 başarılı, 2 atlanan**. Atlananlar izole PostgreSQL içe aktarma ve harici S3 test ortamına bağlı testlerdir.
- Migrasyon: izole SQLite veritabanında eski hesaplı yükseltme, `alembic check`, düşürme ve yeniden yükseltme testi başarılı. Üretim PostgreSQL migrasyonu bu çalışmada çalıştırılmadı.
- Frontend: `npx --no-install tsc --noEmit`, `npm run build` ve `tests/api-pagination.cjs`, `tests/message-media.cjs`, `tests/visible-polling.cjs`, `tests/ux-flows.cjs` kontrolleri.
- Tarayıcı: 390×844, 844×900 ve 1280×900; yalnızca izole veritabanı ve sahte hesap. Gerçek kullanıcıya mesaj/e-posta gönderilmedi, canlı veriler değiştirilmedi.
- QR dijital okuma: gerçek uzunluktaki `https://kayipqr-web.vercel.app/q/KQ-2HKMRUC7` bağlantısıyla 16 PNG, ZXing ile çözüldü. Test aracı yalnızca yok sayılan `artifacts/ux-fixes/decoder` klasörüne kuruldu; uygulamaya bağımlılık eklenmedi.
- Ekran kanıtları yerel `artifacts/ux-fixes/` klasöründe. Fiziksel iPhone/Android, ekran okuyucu yazılımı ve basılı etiket testi ayrıca yapılmalıdır; dijital okuma bunların garantisi değildir.

## Yayına alma

Bu değişiklikler için **`20261022_ux` migrasyonu gerekir**: `email_outbox.redirect_path` alanı eklenir. Backend Vercel build komutu `python -m app.vercel_build`, doğrudan veritabanı bağlantısıyla migrasyonu otomatik uygular. Başarılı backend build/deploy durumunu doğrulamak gerekir; başka bir ortamda yayınlanıyorsa önce `python -m alembic upgrade head` çalıştırılmalıdır. Alan nullable olduğu için eski satırlar korunur; eski doğrulama isteklerinin dönüş hedefi `/dashboard` olur. Yeni bir environment değişkeni gerekmez.

Bu belgedeki kontroller yerel uygulama aşamasına aittir; GitHub/Vercel yayın sonucu ayrıca commit durumlarından doğrulanmalıdır. Önceden kaldırılan dışa aktarma özelliği ve vazgeçilen dakikalık e-posta görevi geri eklenmedi.
