/* ---------------- HAFIZA (localStorage) ---------------- */
const DEPO_ANAHTARI = "izleme_listem";

// Eski kayıtlara (durum sekmeleri özelliğinden önce eklenmiş) eksik alanları tamamlar
function yukle() {
  let liste;
  try {
    liste = JSON.parse(localStorage.getItem(DEPO_ANAHTARI)) || [];
  } catch (e) {
    liste = [];
  }

  let degisiklikOldu = false;
  liste.forEach((o) => {
    if (!o.tmdbId) {
      o.tmdbId = Number(o.key.split("-")[1]);
      degisiklikOldu = true;
    }
    if (!o.durum) {
      o.durum = "izliyor";
      degisiklikOldu = true;
    }
    if (!o.eklenmeZamani) {
      o.eklenmeZamani = Date.now();
      degisiklikOldu = true;
    }
  });

  if (degisiklikOldu) kaydetListe(liste);
  return liste;
}

function kaydetListe(liste) {
  try {
    localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(liste));
  } catch (e) {}
}

// Global "listem" dizisini kaydetmek için kısayol
function kaydet() {
  kaydetListe(listem);
  bulutaKaydet();
}

// Bir yapımı yeni duruma taşırken "bitirdi"ye geçişte tarihi de damgalar
// (istatistik/Yıl Özeti bu tarihe ihtiyaç duyuyor, eklenme tarihi yetmiyor)
function durumAta(o, yeniDurum) {
  o.durum = yeniDurum;
  if (yeniDurum === "bitirdi") o.bitirmeZamani = Date.now();
}

/* ---------------- BULUT SENKRON (kişisel liste) ----------------
   Giriş yaptıktan sonra listem hem localStorage'da hem Firestore'da
   kullanicilar/{uid} altında tek dokümanda tutulur (öğe başına doküman
   değil — tek okuma/yazma yeterli). db ve girisliUid başka dosyalarda
   tanımlı ama bu fonksiyonlar hep kullanıcı etkileşimi/async giriş
   sonrası çağrıldığından script yükleme sırası sorun çıkarmıyor. */
let girisliUid = null;

async function depoBulutBaglan(uid) {
  girisliUid = uid;
  if (typeof db === "undefined" || !db) return;
  try {
    const snap = await db.collection("kullanicilar").doc(uid).get();
    const bulutListe = snap.exists && Array.isArray(snap.data().liste) ? snap.data().liste : null;
    if (bulutListe) listem = depoBirlestir(listem, bulutListe);
    kaydetListe(listem);
    await db.collection("kullanicilar").doc(uid).set({ liste: listem });
  } catch (e) {
    console.warn("Bulut senkron başlatılamadı:", e);
  }
}

// Yerel ve buluttaki listeyi key'e göre birleştirir; çakışmada daha yeni eklenme kazanır
function depoBirlestir(yerel, bulut) {
  const harita = {};
  yerel.forEach((o) => { harita[o.key] = o; });
  bulut.forEach((o) => {
    const mevcut = harita[o.key];
    if (!mevcut || (o.eklenmeZamani || 0) > (mevcut.eklenmeZamani || 0)) harita[o.key] = o;
  });
  return Object.values(harita);
}

function bulutaKaydet() {
  if (!girisliUid || typeof db === "undefined" || !db) return;
  db.collection("kullanicilar").doc(girisliUid).set({ liste: listem }).catch((e) => {
    console.warn("Bulut senkron yazılamadı:", e);
  });
}

/* ---------------- YEDEK AL / GERİ YÜKLE ---------------- */
function depoYedekIndir() {
  const veri = JSON.stringify({ liste: listem, disaAktarilma: Date.now() }, null, 2);
  const blob = new Blob([veri], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cinemory-yedek-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function depoYedekYukle(dosya, tamamlaninca) {
  const okuyucu = new FileReader();
  okuyucu.onload = () => {
    try {
      const veri = JSON.parse(okuyucu.result);
      if (!Array.isArray(veri.liste)) throw new Error("geçersiz format");
      listem = veri.liste;
      kaydet();
      if (typeof listeyiCiz === "function") listeyiCiz();
      if (tamamlaninca) tamamlaninca(true);
    } catch (e) {
      if (tamamlaninca) tamamlaninca(false);
    }
  };
  okuyucu.readAsText(dosya);
}
