/* ---------------- BAŞLANGIÇ ---------------- */
let listem = yukle();
listeyiCiz();

// Açık pencereleri kapatma haritası — Esc tuşu ve mobil aşağı-kaydırma ikisi
// de bunu kullanır. Kendi kapatma fonksiyonu olan modallar ek state
// temizliği yapar (ör. kesfetTumKategori = null); diğerleri düz gizlenir.
const MODAL_KAPAT_HARITASI = {
  detayModal: () => detayKapat(),
  kesfetTumModal: () => kesfetTumKapat(),
  kisiModal: () => kisiKapat(),
  eklemeModal: () => eklemeKapat(),
  ortakKodModal: () => ortakKodModalKapat(),
  surprizModal: () => surprizKapat(),
};
function modalKapatById(id) {
  if (MODAL_KAPAT_HARITASI[id]) { MODAL_KAPAT_HARITASI[id](); return; }
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

// Esc / geri tuşu: en üstteki açık pencereyi kapat (nested modallar için öncelik sırası önemli)
const ESC_ONCELIK_SIRASI = ["aniDetayModal", "detayModal", "kesfetTumModal", "kisiModal", "eklemeModal", "ortakKodModal", "surprizModal"];
function enUsttekiPencereyiKapat() {
  for (const id of ESC_ONCELIK_SIRASI) {
    const el = document.getElementById(id);
    if (el && el.style.display !== "none" && el.style.display !== "") { modalKapatById(id); return true; }
  }
  // Bildirim popover'ı (arkaplansız, ayrı stil) — kendi kapatma fonksiyonu var
  if (typeof bildirimKapat === "function" && bildirimModal && bildirimModal.style.display !== "none" && bildirimModal.style.display !== "") {
    bildirimKapat();
    return true;
  }
  // Öncelik sırasında olmayan basit modallar (Anı Akışı, İstatistik)
  let kapandi = false;
  document.querySelectorAll(".modal-arkaplan").forEach((m) => {
    if (m.style.display !== "none" && m.style.display !== "") { m.style.display = "none"; kapandi = true; }
  });
  return kapandi;
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") enUsttekiPencereyiKapat();
});

/* Android donanım geri tuşu: açık pencere varsa uygulamadan çıkmak yerine
   pencereyi kapatsın. Her pencere açılışında sahte bir geçmiş kaydı eklenir;
   geri tuşu o kaydı tüketip popstate tetikler. Pencere X/Esc/dışa tıklamayla
   kapanırsa da aynı kaydı history.back() ile kendimiz tüketiriz, yoksa bir
   sonraki gerçek geri tuşu basışı hiçbir şey yapmamış gibi görünür. */
let gizliGeriTemizleniyor = false;
function acikPencereVarMi() {
  return [...document.querySelectorAll(".modal-arkaplan")].some(
    (m) => m.style.display !== "none" && m.style.display !== ""
  ) || (typeof bildirimModal !== "undefined" && bildirimModal && bildirimModal.style.display !== "none" && bildirimModal.style.display !== "");
}
new MutationObserver(() => {
  if (gizliGeriTemizleniyor) return;
  const acikMi = acikPencereVarMi();
  if (acikMi && !history.state?.cmPencere) {
    history.pushState({ cmPencere: true }, "");
  } else if (!acikMi && history.state?.cmPencere) {
    gizliGeriTemizleniyor = true;
    history.back();
    setTimeout(() => { gizliGeriTemizleniyor = false; }, 0);
  }
}).observe(document.body, { attributes: true, attributeFilter: ["style"], subtree: true });

window.addEventListener("popstate", () => {
  if (acikPencereVarMi()) enUsttekiPencereyiKapat();
});

/* Mobil: pencere içeriği en üstteyken aşağı doğru kaydırınca pencere kapanır
   (iOS/Android'deki standart "sheet" kapatma jesti). İçerik kaydırılmış
   durumdaysa (scrollTop > 0) normal kaydırmayla karışmasın diye devre dışı. */
let kaydirmaBaslangic = null;
document.addEventListener("touchstart", (e) => {
  const kutu = e.target.closest(".modal-kutu");
  if (!kutu) return;
  kaydirmaBaslangic = { kutu, y: e.touches[0].clientY, enUstteydi: kutu.scrollTop <= 0 };
}, { passive: true });

document.addEventListener("touchmove", (e) => {
  if (!kaydirmaBaslangic || !kaydirmaBaslangic.enUstteydi) return;
  const delta = e.touches[0].clientY - kaydirmaBaslangic.y;
  if (delta > 0) {
    e.preventDefault(); // arkadaki ana ekranın birlikte kaymasını engeller
    kaydirmaBaslangic.kutu.style.transition = "none";
    kaydirmaBaslangic.kutu.style.transform = `translateY(${Math.min(delta, 200)}px)`;
  }
}, { passive: false });

document.addEventListener("touchend", (e) => {
  if (!kaydirmaBaslangic) return;
  const { kutu, y, enUstteydi } = kaydirmaBaslangic;
  kaydirmaBaslangic = null;
  if (!enUstteydi) return;

  const delta = (e.changedTouches[0].clientY - y);
  const arkaplan = kutu.closest(".modal-arkaplan");
  if (delta >= 90 && arkaplan) {
    // Eşik aşıldı: geri fırlatmak yerine aşağı kaydırıp ekrandan çıkararak kapat
    kutu.style.transition = "transform 0.22s ease-in, opacity 0.22s ease-in";
    kutu.style.transform = "translateY(120%)";
    kutu.style.opacity = "0";
    setTimeout(() => {
      modalKapatById(arkaplan.id);
      kutu.style.transition = "";
      kutu.style.transform = "";
      kutu.style.opacity = "";
    }, 220);
    return;
  }

  kutu.style.transition = "transform 0.2s ease";
  kutu.style.transform = "";
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
