# İzleme Defteri

Dizi ve film takibi için kişisel + ortak liste, TMDB destekli keşif ekranı, anılar ve bildirimler sunan bir PWA (Progressive Web App). Build adımı yok — düz HTML/CSS/JS, herhangi bir statik sunucudan çalışır.

## Özellikler

- **Kişisel liste** — İzliyorum / Bitti / İzlemek İstiyorum durumlarıyla dizi-film takibi (localStorage).
- **Birlikte İzlenenler** — ortak bir kod ile iki kişinin senkronize paylaştığı liste (Firebase Firestore).
- **Keşfet ekranı** — Bu Hafta Trend, Vizyondaki Filmler (TR/Global), Oscar Kazananları, En Beğenilenler, Popüler Diziler, Şu An Yayında (Aktif Diziler) ve Reality & Yarışma Programları şeritleri; her biri için "tümünü gör" + sıralama/tür filtresi.
- **Sürpriz Seçici** — ne izleneceğine karar veremeyenler için rastgele öneri.
- **Anı Akışı** — bir yapıma foto, sesli not ve yazılı anı ekleme.
- **İstatistikler** — izlenen bölüm/film sayısı, toplam süre gibi özet veriler.
- **Bildirimler** — takip edilen dizilerde yeni bölüm yayınlanınca uyarı; kaydırarak sil/okundu işaretleme.
- **PWA** — ana ekrana eklenebilir, service worker ile çevrimdışı çalışır.
- **Açık/koyu tema.**

## Teknolojiler

- Vanilla JavaScript (framework/build aracı yok), modüller `<script>` etiketleriyle sırayla yüklenir.
- [TMDB API](https://www.themoviedb.org/documentation/api) — dizi/film verisi ve posterler.
- [OMDb API](https://www.omdbapi.com/) — IMDb puanı ve ödül metni.
- Firebase Firestore (compat SDK) — ortak liste senkronizasyonu.
- Service Worker (`sw.js`) — önbellekleme ve çevrimdışı destek.

## Kurulum

1. `js/config.js` içine kendi TMDB/OMDb API anahtarlarını gir.
2. Ortak liste özelliği için bir Firebase projesi oluşturup ayarlarını `js/config.js`'e ekle (opsiyonel — olmadan kişisel liste yine çalışır).
3. Proje kökünde bir statik sunucu başlat, örn.:

   ```bash
   python -m http.server 8000
   ```

4. Tarayıcıda `http://localhost:8000` adresini aç.

## Klasör yapısı

```
index.html        # sayfa iskeleti
css/stil.css       # tüm stiller (tema, responsive kabuk)
js/
  ayarlar.js       # marka/kişisel ayarlar
  config.js        # API anahtarları
  depo.js          # localStorage veri modeli
  tmdb.js          # TMDB/OMDb istekleri
  liste.js         # kişisel liste, sekmeler, keşfet entegrasyonu
  detay.js         # dizi/film detay penceresi
  ortak.js         # Firebase ile ortak liste
  surpriz.js        # sürpriz seçici
  kisi.js          # oyuncu/yapımcı detay penceresi
  ani.js           # anı akışı (foto/ses/not)
  istatistik.js    # istatistik penceresi
  bildirim.js      # bildirim popover'ı
  kesfet.js        # keşfet ekranı şeritleri
  arayuz.js        # tema, hero, karşılama
  uygulama.js      # başlangıç, klavye/dokunma olayları, service worker kaydı
manifest.json      # PWA manifesti
sw.js              # service worker
icons/             # PWA ikonları
```

## Canlı

GitHub Pages üzerinden `main` branch'i yayınlanır.
