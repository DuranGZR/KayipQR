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

## Alan adı satın alındığında

1. Önce domaini Vercel frontend projesine bağlayın ve DNS/HTTPS doğrulamasının bitmesini bekleyin. `www` veya çıplak domain arasından tek ana adres seçin.
2. Frontend `NEXT_PUBLIC_APP_URL` değerini yeni HTTPS adresine değiştirip **yeniden build/deploy** edin. Backend `PUBLIC_APP_URL`, CORS izinleri ve varsa WebSocket origin kontrolünü de güncelleyin. Backend adresi aynı kalırsa API URL'si veya Google callback adresini gereksiz yere değiştirmeyin.
3. Google Auth Platform'da ana sayfa, gizlilik ve koşullar bağlantılarını ve yetkili domaini güncelleyin. Backend de taşınacaksa Google callback ve backend `BACKEND_BASE_URL` ayarını birlikte değiştirin.
4. Eski frontend adresinden yeni adrese aynı yol ve sorguyu koruyan 301/308 yönlendirmesi kurun. `/q/KQ-…` bağlantıları yeni domaindeki aynı eşya sayfasına gitmeli. Ana sayfaya toplu yönlendirme yapmayın. Önceden basılan Vercel QR'ları için eski adresi koruyun; yalnızca yeni domaini açmak eski etiketleri taşımış olmaz.
5. Yeni domain Search Console mülkünü DNS ile doğrulayın; `/sitemap.xml` gönderin. Önceden indekslenen eski mülk varsa uygun adres değişikliği akışını değerlendirin. Ana sayfa ve rehberleri URL Denetimi ile kontrol edin.
6. Canonical/sitemap/OG adreslerini, e-posta doğrulama ve sıfırlama bağlantılarını, Google girişini ve eski basılı QR'ı gerçek telefonla test edin.
7. Search Console indeksleme ve performans raporlarından gerçek sorguları izleyin. Mobil Core Web Vitals için saha verisi oluşmasını bekleyin; laboratuvar ölçümü sıralama veya gerçek kullanıcı performansı garantisi değildir.

Domain satın alma, Search Console hesap doğrulaması ve DNS değişiklikleri bu kod değişikliğinin parçası değildir. Henüz satın alınmamış alan adına yönlendirme kurulmaz.

## Kaynaklar

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [noindex ve tarama ilişkisi](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Sitemap uygulamaları](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Alan adı taşıma](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
