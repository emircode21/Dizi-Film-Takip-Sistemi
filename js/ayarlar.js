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
  if (!AYARLAR.kisiselMod || !AYARLAR.baslangicTarihi) return null;
  const baslangic = Date.parse(AYARLAR.baslangicTarihi);
  if (isNaN(baslangic)) return null;
  const gun = Math.floor((Date.now() - baslangic) / 86400000);
  return gun >= 0 ? gun : null;
}
