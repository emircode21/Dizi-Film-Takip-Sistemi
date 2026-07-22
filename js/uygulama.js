/* ---------------- BAŞLANGIÇ ---------------- */
let listem = yukle();
listeyiCiz();

// PWA: ana ekrana eklenince gerçek uygulama gibi açılması için servis çalışanı
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
