/* Uygulama kabuğunu (HTML/CSS/JS/ikonlar) önbelleğe alır.
   TMDB API isteklerine ve poster görsellerine hiç dokunmaz — onlar her zaman ağdan gelir. */

const ONBELLEK_ADI = "izleme-defteri-v7";

const KABUK_DOSYALARI = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/stil.css",
  "./js/ayarlar.js",
  "./js/config.js",
  "./js/depo.js",
  "./js/tmdb.js",
  "./js/liste.js",
  "./js/detay.js",
  "./js/ortak.js",
  "./js/arayuz.js",
  "./js/uygulama.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ONBELLEK_ADI).then((onbellek) => onbellek.addAll(KABUK_DOSYALARI))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((isimler) =>
      Promise.all(
        isimler
          .filter((isim) => isim !== ONBELLEK_ADI)
          .map((isim) => caches.delete(isim))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Sadece kendi sitemizdeki dosyalar için devreye gir; TMDB/poster istekleri ağa gitsin
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  // Stale-while-revalidate: önce önbellekteki hızlı halini göster,
  // arka planda güncel halini çekip bir sonraki açılış için önbelleği tazele
  event.respondWith(
    caches.open(ONBELLEK_ADI).then((onbellek) =>
      onbellek.match(event.request).then((onbellekteki) => {
        const agdanGetir = fetch(event.request)
          .then((yanit) => {
            onbellek.put(event.request, yanit.clone());
            return yanit;
          })
          .catch(() => onbellekteki);

        return onbellekteki || agdanGetir;
      })
    )
  );
});
