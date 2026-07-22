/* ---------------- BAŞLANGIÇ ---------------- */
let listem = yukle();
listeyiCiz();

// PWA: ana ekrana eklenince gerçek uygulama gibi açılması için servis çalışanı
if ("serviceWorker" in navigator) {
  const swKaydet = () => navigator.serviceWorker.register("sw.js").catch(() => {});
  // "load" olayı bu script çalışırken çoktan geçmiş olabiliyor, o yüzden önce kontrol ediyoruz
  if (document.readyState === "complete") {
    swKaydet();
  } else {
    window.addEventListener("load", swKaydet);
  }
}
