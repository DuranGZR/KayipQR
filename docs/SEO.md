# KayıpQR SEO ve alan adı geçişi

## Mevcut yapı

- Ana sayfa, `/rehber`, üç rehber ve dört politika sayfası indekslenebilir; her birinin ayrı başlığı, açıklaması ve kendine işaret eden canonical adresi vardır.
- Rehberler sunucuda HTML olarak hazırlanır. Yeni içerik eklemek için `Frontend/src/content/guides.ts` kaydını ekleyin; sitemap ve rehber bağlantıları aynı kaynaktan üretilir.
- Yazıdaki `updated` tarihini yalnızca içerik gerçekten değiştiğinde güncelleyin. Sitemap'te politika sayfalarına yapay güncelleme tarihi eklenmez.
- Hesap, kimlik doğrulama, panel ve `/q/` sayfaları metadata ve `X-Robots-Tag` ile `noindex, nofollow` alır. Robots dosyası bu HTML sayfalarını engellemez; Google'ın noindex kuralını okuyabilmesi gerekir. Bu kurallar erişim kontrolü değildir; hesap verilerini API kimlik doğrulaması korur.
- Kişisel eşya içerikleri yapılandırılmış veriye veya sitemap'e eklenmez. Mevcut QR tarama ve mesajlaşma endpoint'leri değişmez.
- `WebSite`, `Organization`, `Article`, `BreadcrumbList` verileri gerçek sayfa içeriklerini tarif eder. Sahte yorum, puan veya ürün satışı işaretlemesi yoktur. Yapılandırılmış veri zengin sonuç garantisi vermez.
- `/opengraph-image` 1200 × 630 PNG'dir. Harici font veya görsel isteğine ihtiyaç duymaz.

## Kontrol

Frontend'de `npm run build`, ardından `npm run start -- --port 3014` çalıştırın. Ayrı terminalde:

```powershell
$env:SEO_EXPECTED_ORIGIN = 'http://localhost:3000' # build sırasında kullanılan NEXT_PUBLIC_APP_URL
node scripts/check-seo.mjs http://localhost:3014
Remove-Item Env:SEO_EXPECTED_ORIGIN
```

Üretim kontrolü: `node scripts/check-seo.mjs https://kayipqr-web.vercel.app`. HTTP ve HTML kontrolleri giriş gerektirmez, mesaj göndermez ve gerçek bir QR kodunu taramaz.

## kayipqr.com yapılandırması

- Ana frontend adresi `https://kayipqr.com`; `www.kayipqr.com` Vercel üzerinden 308 ile ana adrese yönlenir.
- Turhost isim sunucuları `dns1.turhost.com` ve `dns2.turhost.com` olarak ayarlanmıştır. A (`@`) kaydı `216.198.79.1`, CNAME (`www`) hedefi `adc716e9502804c9.vercel-dns-017.com` olarak Vercel panelinden alınmıştır. Gelecekteki değişikliklerde panelin güncel önerisini kullanın.
- Frontend Production `NEXT_PUBLIC_APP_URL` ve backend Production `APP_PUBLIC_URL`: `https://kayipqr.com`. Backend eski `PUBLIC_APP_URL` ayarını da destekler; ikisi tanımlıysa `APP_PUBLIC_URL` önceliklidir. Yeni isim, Vercel'in eski `PUBLIC_` önekli secret değişkenlerini güncelleme kısıtını aşmak için kullanılır; uygulamada adres yine `settings.PUBLIC_APP_URL` üzerinden okunur.
- Backend CORS: yeni ana adres, `https://www.kayipqr.com` ve mevcut `https://kayipqr-web.vercel.app`.
- Backend `https://kayipqr-api.vercel.app` üzerinde kalır. Google OAuth yönlendirme URI'si `https://kayipqr-api.vercel.app/api/v1/auth/google/callback` olarak korunur.
- Eski Vercel domaini erişilebilir kalır. Mevcut anonim sohbet anahtarları tarayıcıda origin'e bağlı saklandığından eski `/q/` bağlantılarını zorla başka origin'e yönlendirmeyin; kullanıcı geçmişine erişimi etkileyebilir. Yeni QR'lar ve e-posta bağlantıları yeni ana adresi kullanır; indekslenebilir sayfaların canonical adresleri yeni domaine işaret eder.
- Google Auth Platform marka bağlantıları/yetkili domain ve Search Console doğrulaması hesap panelinden ayrıca tamamlanmalıdır. Bu belge bu hesap işlemlerinin yapıldığını iddia etmez.

## Sonraki alan adı değişikliklerinde

1. Önce domaini Vercel frontend projesine bağlayın ve DNS/HTTPS doğrulamasının bitmesini bekleyin. `www` veya çıplak domain arasından tek ana adres seçin.
2. Frontend `NEXT_PUBLIC_APP_URL` değerini yeni HTTPS adresine değiştirip **yeniden build/deploy** edin. Backend `PUBLIC_APP_URL`, CORS izinleri ve varsa WebSocket origin kontrolünü de güncelleyin. Backend adresi aynı kalırsa API URL'si veya Google callback adresini gereksiz yere değiştirmeyin.
3. Google Auth Platform'da ana sayfa, gizlilik ve koşullar bağlantılarını ve yetkili domaini güncelleyin. Backend de taşınacaksa Google callback ve backend `BACKEND_BASE_URL` ayarını birlikte değiştirin.
4. Eski frontend adresini koruyun. Genel sayfalarda yönlendirme gerekiyorsa aynı yol ve sorguyu koruyan 301/308 kullanın. Anonim sohbet anahtarlarını origin'ler arasında güvenle taşıyan bir akış olmadan eski `/q/` sayfalarını zorla yönlendirmeyin. Önceden basılan QR'ları ana sayfaya toplu yönlendirmeyin.
5. Yeni domain Search Console mülkünü DNS ile doğrulayın; `/sitemap.xml` gönderin. Önceden indekslenen eski mülk varsa uygun adres değişikliği akışını değerlendirin. Ana sayfa ve rehberleri URL Denetimi ile kontrol edin.
6. Canonical/sitemap/OG adreslerini, e-posta doğrulama ve sıfırlama bağlantılarını, Google girişini ve eski basılı QR'ı gerçek telefonla test edin.
7. Search Console indeksleme ve performans raporlarından gerçek sorguları izleyin. Mobil Core Web Vitals için saha verisi oluşmasını bekleyin; laboratuvar ölçümü sıralama veya gerçek kullanıcı performansı garantisi değildir.

Henüz bağlanmamış alan adına yönlendirme kurulmaz. Eski anonim sohbetlerin origin'e bağlı tarayıcı kayıtlarını da geçiş planına dahil edin.

## Kaynaklar

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [noindex ve tarama ilişkisi](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Sitemap uygulamaları](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Alan adı taşıma](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
