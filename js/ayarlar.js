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
  appAdi: "İzleme Defteri",

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
