# Google ile giriş kurulumu

Kod Google OAuth anahtarları olmadan da e-posta/parola ile çalışır. Google düğmesi yalnızca backend'de iki anahtar da tanımlandığında görünür. Anahtarlar frontend'e verilmez.

## Google Cloud

1. Bu projeye ait Google Cloud projesini seçin veya oluşturun. Google Auth Platform'da uygulama adı, destek adresi `contact@durangezer.com`, audience ve gerekli ana sayfa/gizlilik/koşul bağlantılarını girin.
2. OAuth client oluştururken **Web application** seçin.
3. **Authorized redirect URI** alanına aşağıdaki adresi tam olarak girin:

   `https://kayipqr-api.vercel.app/api/v1/auth/google/callback`

   Backend alan adı değişirse yeni adresi hem Google'da hem `BACKEND_BASE_URL` ayarında güncelleyin. Sonuna `/` eklemeyin. Local test için ayrıca `http://127.0.0.1:8000/api/v1/auth/google/callback` eklenebilir.
4. Yalnızca `openid email profile` kapsamları kullanılır. Test durumundaki uygulamada test kullanıcılarını Google paneline ekleyin. Herkese açarken Google'ın audience/publishing ayarını tamamlayın.

## Vercel backend projesi

Production ortamına şunları ekleyin:

```text
GOOGLE_CLIENT_ID=<Google Web Client ID>
GOOGLE_CLIENT_SECRET=<Google Client Secret>
BACKEND_BASE_URL=https://kayipqr-api.vercel.app
PUBLIC_APP_URL=https://kayipqr-web.vercel.app
```

Gerçek Client Secret'ı Git'e, frontend değişkenlerine veya sohbetlere koymayın. Değişkenleri ekledikten sonra backend'i yeniden dağıtın. Frontend `/auth/google/config` ile durumu öğrenir; Google için ayrıca public anahtar değişkeni gerekmez. Preview ortamında ayrı istemci ve yönlendirme adresleri kullanın.

## Akış ve doğrulama

- Backend authorization-code + PKCE akışını başlatır. State ve nonce 5 dakikalık HttpOnly/SameSite=Lax çereziyle tarayıcıya bağlanır. Production'da çerez Secure'dür.
- Google ID token'ı Google JWKS imzası, RS256, issuer, audience, nonce, expiry ve doğrulanmış e-posta açısından denetlenir. Hesap eşleştirmesinde kalıcı `sub` kullanılır.
- Tarayıcıya uzun ömürlü erişim token'ı URL üzerinden gönderilmez. 60 saniyelik, tek kullanımlık ticket fragment ile frontend'e taşınır; adres çubuğundan kaldırılıp POST ile değiştirilir.
- Mevcut doğrulanmış yerel hesaplar aynı Google e-postası Gmail veya Google Workspace tarafından yönetiliyorsa eşleştirilebilir. Google'ın yönettiği bir alan adına ait olmayan, zaten kayıtlı adreslerde parola girişi istenir. Yeni Google hesapları da oluşturulabilir.
- Daha önce başkasınca açılmış, doğrulanmamış bir kayıt varsa Google sahibinin girişi o kaydın eski parolasını iptal eder. Doğrulama özelliğinden önce oluşturulmuş eski hesaplarda da ilk Google eşleştirmesinde eski parola ve oturumlar iptal edilir; geçmişte e-posta sahipliği doğrulanmamış olabilir. Google ile açılan hesapta yerel parola belirlemek için şifre sıfırlama kullanılabilir.

## Yayın öncesi

Migration `20261021_auth` backend build sırasında uygulanır. Önce veritabanı yedeği alın. Mevcut kullanıcılar erişimleri kesilmeden doğrulanmış kabul edilir; yeni e-posta kayıtları bağlantı doğrulaması gerektirir. Yeni kod önce migration'ı, ardından backend ve frontend dağıtımını gerektirir. Eski kuyruktaki gönderilmemiş e-postalar, eski bildirim/token davranışı sürmesin diye migration'da iptal edilir.

Gerçek Google hesabıyla kayıt/giriş, iptal etme, geri düğmesi, iki sekme ve çıkış sonrası tekrar giriş deneyin. Hesap devre dışıysa girişin reddedildiğini ve Client Secret'ın ağdaki frontend yanıtlarında bulunmadığını kontrol edin.

Kaynak: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).
