/* ---------------- BAŞLANGIÇ ---------------- */
let listem = yukle();
listeyiCiz();

// Esc: en üstteki açık pencereyi kapat (varsa kendi kapatma fonksiyonuyla,
// ek state temizliği yapmayanlar için düz gizleme ile)
const ESC_MODAL_KAPAT = [
  ["detayModal", () => detayKapat()],
  ["kesfetTumModal", () => kesfetTumKapat()],
  ["kisiModal", () => kisiKapat()],
  ["eklemeModal", () => eklemeKapat()],
  ["ortakKodModal", () => ortakKodModalKapat()],
  ["surprizModal", () => surprizKapat()],
];
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  for (const [id, kapat] of ESC_MODAL_KAPAT) {
    const el = document.getElementById(id);
    if (el && el.style.display !== "none" && el.style.display !== "") { kapat(); return; }
  }
  // Kendi kapatma fonksiyonu olmayan basit modallar (Anı Akışı, İstatistik, Bildirim)
  document.querySelectorAll(".modal-arkaplan").forEach((m) => {
    if (m.style.display !== "none" && m.style.display !== "") m.style.display = "none";
  });
});

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
