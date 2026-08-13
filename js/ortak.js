/* ---------------- BİRLİKTE İZLENENLER (Firestore ortak liste) ----------------
   Kişisel liste localStorage'da kalır; bu dosya tamamen ayrı, buluttaki
   ortak listeyi yönetir. Aynı "ortak kod"u giren herkes aynı listeyi görür
   ve değişiklikler anlık senkron olur (onSnapshot ile canlı dinleme). */

/* ---- Firebase başlat ----
   firebase.initializeApp zaten hesap.js'te (giriş duvarı için) çağrıldı;
   burada sadece firestore örneğini alıyoruz. */
let db = null;
try {
  db = firebase.firestore();
  // Çevrimdışı açılışta ortak liste boş gelmesin, yazmalar kaybolmasın diye
  // yerel önbellek açık. Birden fazla sekme açıksa ikincisi sessizce reddedilir,
  // uygulamayı bozmaz — o yüzden hatayı yutuyoruz.
  db.enablePersistence().catch(() => {});
} catch (e) {
  console.warn("Firebase başlatılamadı, ortak liste çalışmayabilir:", e);
}

/* ---- Durum ----
   Uygulama zaten sadece IZINLI_UID_LISTESI'ndeki iki hesaba kilitli (bkz.
   hesap.js) — "ortak kod" artık kimseyi doğrulamıyor, sadece hangi Firestore
   klasörüne bakılacağını belirliyor. Madem sadece iki kişi girebiliyor,
   kodu sabit/otomatik yapıp hiç yazdırmıyoruz: her iki cihaz da kendiliğinden
   aynı odaya bağlanır. */
const ORTAK_KOD_ANAHTARI = "ortak_kod";
const VARSAYILAN_ORTAK_KOD = "zebra2023";
let ortakKod = localStorage.getItem(ORTAK_KOD_ANAHTARI) || VARSAYILAN_ORTAK_KOD;
if (!localStorage.getItem(ORTAK_KOD_ANAHTARI)) localStorage.setItem(ORTAK_KOD_ANAHTARI, ortakKod);
let ortakListem = [];            // Firestore'dan gelen canlı liste
let ortakAboneligi = null;       // onSnapshot dinleyicisini kapatmak için
let ortakBekleyenEkleme = null;  // koda bağlanınca eklenmeyi bekleyen öğe
let ortakSilinenYedek = null;    // "Geri Al" için

// Firestore'da bu ortak kodun öğelerinin bulunduğu koleksiyon
function ortakKoleksiyon() {
  return db.collection("ortakListeler").doc(ortakKod).collection("ogeler");
}

/* ---- Canlı dinleme ---- */
function ortakAbone() {
  if (!db || !ortakKod) return;
  if (ortakAboneligi) ortakAboneligi(); // önceki dinleyiciyi kapat

  ortakAboneligi = ortakKoleksiyon().onSnapshot(
    (snap) => {
      ortakListem = snap.docs.map((d) => d.data());
      sekmeSayilariniGuncelle();
      if (aktifSekme === "birlikte") ortakListeyiCiz();
    },
    (hata) => console.warn("Ortak liste dinlenemedi:", hata)
  );
}

/* ---- Firestore'a yazma / silme ---- */
async function ortakGuncelle(o) {
  if (!db || !ortakKod) return;
  try {
    await ortakKoleksiyon().doc(o.key).set(o);
  } catch (e) {
    console.warn("Ortak listeye yazılamadı:", e);
  }
}

async function ortakSil(key) {
  if (!db || !ortakKod) return;
  const o = ortakListem.find((x) => x.key === key);
  if (!o) return;

  ortakSilinenYedek = o;
  try {
    await ortakKoleksiyon().doc(key).delete();
  } catch (e) {
    console.warn("Ortak listeden silinemedi:", e);
  }
  snackbarGoster(`"${o.ad}" ortak listeden kaldırıldı`, ortakGeriAl);
}

async function ortakGeriAl() {
  if (!ortakSilinenYedek) return;
  await ortakGuncelle(ortakSilinenYedek);
  ortakSilinenYedek = null;
  snackbarGizle();
}

/* ---- Ekleme ---- */
// Ekleme modalından "Birlikte İzlenenler" seçilince buraya gelinir.
// Kod yoksa önce bağlanma kutusunu açar, öğeyi bekletir.
function ortakEkleAkisi(x, durum) {
  if (!ortakKod) {
    ortakBekleyenEkleme = { x, durum };
    ortakKodModalAc();
    return;
  }
  ortakEkle(x, durum);
}

async function ortakEkle(x, durum) {
  if (!db || !ortakKod) return;
  const diziMi = x.media_type === "tv";
  const key = x.media_type + "-" + x.id;
  if (ortakListem.some((o) => o.key === key)) return; // zaten ortak listede

  const tarih = diziMi ? x.first_air_date : x.release_date;
  const yeniOge = {
    key: key,
    type: x.media_type,
    tmdbId: x.id,
    ad: diziMi ? x.name : x.title,
    yil: tarih ? tarih.slice(0, 4) : "—",
    poster: x.poster_path || "",
    durum: durum || "izliyor",
    eklenmeZamani: Date.now(),
  };
  if (yeniOge.durum === "bitirdi") yeniOge.bitirmeZamani = Date.now();

  if (diziMi) {
    yeniOge.sezon = 1;
    yeniOge.bolum = 1;
    yeniOge.sezonSayisi = await sezonSayisiGetir(x.id);
    yeniOge.bolumSayilari = {};
    yeniOge.bolumDetaylari = {};
    const sonuc = await bolumSayisiGetir(x.id, 1);
    yeniOge.bolumSayilari[1] = sonuc.sayi;
    yeniOge.bolumDetaylari[1] = sonuc.bolumler;
  }

  await ortakGuncelle(yeniOge);
}

/* ---- Bölüm takibi (kişisel liste ile aynı mantık, ama Firestore'a yazar) ---- */
async function ortakBolumTakibiBaslat(o) {
  o.sezon = 1;
  o.bolum = 1;
  o.sezonSayisi = await sezonSayisiGetir(o.tmdbId);
  o.bolumSayilari = {};
  o.bolumDetaylari = {};
  const sonuc = await bolumSayisiGetir(o.tmdbId, 1);
  o.bolumSayilari[1] = sonuc.sayi;
  o.bolumDetaylari[1] = sonuc.bolumler;
}

async function ortakSonrakiBolume(key) {
  const o = ortakListem.find((x) => x.key === key);
  if (!o || sonBolumMu(o)) return;

  const buSezonBolumSayisi = o.bolumSayilari[o.sezon];
  if (o.bolum < buSezonBolumSayisi) {
    o.bolum += 1;
  } else {
    o.sezon += 1;
    o.bolum = 1;
    if (!o.bolumSayilari[o.sezon]) {
      const sonuc = await bolumSayisiGetir(o.tmdbId, o.sezon);
      o.bolumSayilari[o.sezon] = sonuc.sayi;
      o.bolumDetaylari[o.sezon] = sonuc.bolumler;
    }
  }

  if (sonBolumMu(o)) durumAta(o, "bitirdi");
  await ortakGuncelle(o);
}

/* ---- Çizim (kart görünümü kişisel listeyle aynı: kartHTML'i tekrar kullanır) ---- */
function ortakListeyiCiz() {
  // Henüz koda bağlanılmadıysa: tanıtım + "Bağlan" butonu
  if (!ortakKod) {
    listeAlani.innerHTML = `
      <div class="ortak-bilgi-kutu">
        <div class="ortak-bilgi-baslik">💛 Birlikte İzlenenler</div>
        <p>İkinizin ortak izlediklerini burada tutabilirsiniz. Bağlanmak için
        belirlediğiniz gizli kodu girin — aynı kodu giren herkes aynı listeyi
        görür ve değişiklikler anlık olarak senkron olur.</p>
        <button class="ekleme-secenek-btn" data-ortak-baglan>Bağlan</button>
      </div>`;
    return;
  }

  const ustBar = `
    <div class="ortak-mini-bar">
      <button class="ortak-degistir-btn" data-ortak-degistir>🔗 kodu değiştir</button>
    </div>`;

  if (ortakListem.length === 0) {
    listeAlani.innerHTML = ustBar +
      "<div class='bos'>Henüz ortak listede bir şey yok. Yukarıdan bir dizi/film arayıp “💛 Birlikte İzlenenler”i seçerek ekleyebilirsin.</div>";
    return;
  }

  // Kişisel sayfayla aynı üç bölüm; kart görünümü de aynı (kartHTML)
  listeAlani.innerHTML = ustBar + bolumlerHTML(ortakListem);
  siradakiBadgeleriDoldur(ortakListem);
  bolumGozlemiBaslat();
}

/* ---- Ortak listedeki kartların olayları (liste.js buraya yönlendirir) ---- */
async function ortakListeTiklama(e) {
  if (e.target.closest("[data-ortak-baglan]") || e.target.closest("[data-ortak-degistir]")) {
    ortakKodModalAc();
    return;
  }
  const detayHedefi = e.target.closest("[data-detay]");
  const baslatIzlemeBtn = e.target.closest("[data-baslat-izleme]");
  const baslatBtn = e.target.closest("[data-baslat]");
  const sonrakiBtn = e.target.closest("[data-sonraki]");
  const izledimBtn = e.target.closest("[data-izledim]");
  const silBtn = e.target.closest("[data-sil]");

  if (baslatBtn || baslatIzlemeBtn) {
    const key = (baslatBtn || baslatIzlemeBtn).dataset.baslat
      || (baslatBtn || baslatIzlemeBtn).dataset.baslatIzleme;
    const o = ortakListem.find((x) => x.key === key);
    if (o) {
      o.durum = "izliyor";
      if (!o.bolumSayilari) await ortakBolumTakibiBaslat(o);
      await ortakGuncelle(o);
    }
    return;
  }
  if (sonrakiBtn) {
    await ortakSonrakiBolume(sonrakiBtn.dataset.sonraki);
    return;
  }
  if (izledimBtn) {
    const o = ortakListem.find((x) => x.key === izledimBtn.dataset.izledim);
    if (o) {
      durumAta(o, "bitirdi");
      await ortakGuncelle(o);
    }
    return;
  }
  if (silBtn) {
    ortakSil(silBtn.dataset.sil);
    return;
  }
  if (detayHedefi) {
    detayAc(detayHedefi.dataset.detay, true, true);
  }
}

async function ortakListeDegisim(e) {
  const secici = e.target.closest("[data-durum-sec]");
  if (!secici) return;
  const o = ortakListem.find((x) => x.key === secici.dataset.durumSec);
  if (o) {
    o.durum = secici.value;
    await ortakGuncelle(o);
  }
}

/* ---- Ortak kod bağlanma kutusu ---- */
const ortakKodModal = document.getElementById("ortakKodModal");
const ortakKodInput = document.getElementById("ortakKodInput");
const ortakKodBaglanBtn = document.getElementById("ortakKodBaglanBtn");
const ortakKodKapatBtn = document.getElementById("ortakKodKapatBtn");
const ortakKodHata = document.getElementById("ortakKodHata");

function ortakKodModalAc() {
  ortakKodInput.value = ortakKod || "";
  ortakKodHata.style.display = "none";
  ortakKodModal.style.display = "flex";
  setTimeout(() => ortakKodInput.focus(), 50);
}

function ortakKodModalKapat() {
  ortakKodModal.style.display = "none";
}

function ortakKoduUygula() {
  const kod = ortakKodInput.value.trim().toLowerCase();
  if (kod.length < 4) {
    ortakKodHata.textContent = "Kod en az 4 karakter olmalı.";
    ortakKodHata.style.display = "block";
    return;
  }
  if (!db) {
    ortakKodHata.textContent = "Bağlantı kurulamadı. İnternetini kontrol edip sayfayı yenile.";
    ortakKodHata.style.display = "block";
    return;
  }

  ortakKod = kod;
  localStorage.setItem(ORTAK_KOD_ANAHTARI, kod);
  ortakAbone();
  ortakKodModalKapat();

  aktifSekme = "birlikte";
  listeyiCiz();

  // Bağlanmadan önce eklenmek istenen bir öğe varsa şimdi ekle
  if (ortakBekleyenEkleme) {
    const bekleyen = ortakBekleyenEkleme;
    ortakBekleyenEkleme = null;
    ortakEkle(bekleyen.x, bekleyen.durum);
  }
}

ortakKodBaglanBtn.addEventListener("click", ortakKoduUygula);
ortakKodKapatBtn.addEventListener("click", ortakKodModalKapat);
ortakKodInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") ortakKoduUygula();
});
ortakKodModal.addEventListener("click", (e) => {
  if (e.target === ortakKodModal) ortakKodModalKapat();
});

/* ---- Başlangıç: kayıtlı kod varsa hemen bağlan ---- */
if (ortakKod) ortakAbone();
