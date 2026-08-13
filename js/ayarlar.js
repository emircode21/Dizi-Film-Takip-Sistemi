/* ============================================================
   AYARLAR — Kişisel / marka içeriği burada.
   Uygulamayı başkasına vermek istersen SADECE bu dosyayı düzenle:
   - kisiselMod: false  ->  isimler ve gün sayacı kapanır, genel ürün olur.
   - İsimleri, sloganı, başlangıç tarihini değiştir, gerisi kendiliğinden uyar.
   ============================================================ */
const AYARLAR = {
  // Kişisel romantik mod açık mı? false yaparsan aşağıdaki isim/tarih gizlenir.
  kisiselMod: true,

  // kisiselMod false iken kullanılacak nötr uygulama adı
  appAdi: "CineMory",

  // Çiftin isimleri (başlıkta "Emir & Özge" gibi görünür)
  isim1: "Emir",
  isim2: "Özge",

  // Başlığın altındaki tatlı cümle
  slogan: "birlikte izlediğimiz her şey, tek yerde",

  // Birlikte olunan başlangıç tarihi (YYYY-AA-GG). "" yaparsan gün sayacı gizlenir.
  baslangicTarihi: "2023-08-06",

  // Her yerde kullanılan kalp/simge
  kalp: "💛",
};

// Kullanıcının Ayarlar ekranından değiştirdiği alanlar localStorage'dan üstüne yazılır
const AYARLAR_OZEL_ANAHTARI = "ayarlarOzel";
Object.assign(AYARLAR, JSON.parse(localStorage.getItem(AYARLAR_OZEL_ANAHTARI) || "{}"));

function ayarlariKaydet(yeni) {
  Object.assign(AYARLAR, yeni);
  localStorage.setItem(AYARLAR_OZEL_ANAHTARI, JSON.stringify({
    isim1: AYARLAR.isim1,
    isim2: AYARLAR.isim2,
    slogan: AYARLAR.slogan,
    baslangicTarihi: AYARLAR.baslangicTarihi,
  }));
  if (typeof markayiCiz === "function") markayiCiz();
}

/* ---- Ayarlar ekranı ---- */
const ayarlarBtn = document.getElementById("ayarlarBtn");
const ayarlarModal = document.getElementById("ayarlarModal");
const ayarlarKapatBtn = document.getElementById("ayarlarKapatBtn");
const ayarlarKaydetBtn = document.getElementById("ayarlarKaydetBtn");

function ayarlarAc() {
  if (!ayarlarModal) return;
  document.getElementById("ayarIsim1").value = AYARLAR.isim1 || "";
  document.getElementById("ayarIsim2").value = AYARLAR.isim2 || "";
  document.getElementById("ayarSlogan").value = AYARLAR.slogan || "";
  document.getElementById("ayarBaslangicTarihi").value = AYARLAR.baslangicTarihi || "";
  document.getElementById("ayarlarDurum").textContent = "";
  ayarlarModal.style.display = "flex";
}

if (ayarlarBtn) ayarlarBtn.addEventListener("click", ayarlarAc);
if (ayarlarKapatBtn) ayarlarKapatBtn.addEventListener("click", () => { ayarlarModal.style.display = "none"; });
if (ayarlarModal) {
  ayarlarModal.addEventListener("click", (e) => { if (e.target === ayarlarModal) ayarlarModal.style.display = "none"; });
}
if (ayarlarKaydetBtn) {
  ayarlarKaydetBtn.addEventListener("click", () => {
    ayarlariKaydet({
      isim1: document.getElementById("ayarIsim1").value.trim() || AYARLAR.isim1,
      isim2: document.getElementById("ayarIsim2").value.trim() || AYARLAR.isim2,
      slogan: document.getElementById("ayarSlogan").value.trim(),
      baslangicTarihi: document.getElementById("ayarBaslangicTarihi").value,
    });
    document.getElementById("ayarlarDurum").textContent = "Kaydedildi 💛";
  });
}

/* Uygulama başlığını (üst yazı) hesaplar */
function markaBasligi() {
  if (AYARLAR.kisiselMod && AYARLAR.isim1 && AYARLAR.isim2) {
    return `${AYARLAR.isim1} & ${AYARLAR.isim2}`;
  }
  return AYARLAR.appAdi;
}

/* Başlangıç tarihinden bugüne kaç gün geçtiğini döndürür (yoksa null) */
function birlikteGunSayisi() {
  const s = birlikteSure();
  return s ? s.gun : null;
}

/* Başlangıç tarihinden bugüne geçen süreyi gün/saat/dakika/saniye olarak döndürür (yoksa null) */
function birlikteSure() {
  if (!AYARLAR.kisiselMod || !AYARLAR.baslangicTarihi) return null;
  const baslangic = Date.parse(AYARLAR.baslangicTarihi);
  if (isNaN(baslangic)) return null;

  let fark = Date.now() - baslangic;
  if (fark < 0) return null;

  const gun = Math.floor(fark / 86400000); fark %= 86400000;
  const saat = Math.floor(fark / 3600000); fark %= 3600000;
  const dakika = Math.floor(fark / 60000); fark %= 60000;
  const saniye = Math.floor(fark / 1000);
  return { gun, saat, dakika, saniye };
}
