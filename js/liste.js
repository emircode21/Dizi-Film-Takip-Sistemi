/* ---------------- ARAMA + LİSTEM (sekmeler, sıralama, kartlar) ---------------- */

const kutu = document.getElementById("arama");
const aramaTemizleBtn = document.getElementById("aramaTemizle");
const sonucAlani = document.getElementById("sonuclar");
const sonucBaslik = document.getElementById("sonuc-baslik");
const listeAlani = document.getElementById("listem");
const sekmeAlani = document.getElementById("sekmeler");
const siralamaSecici = document.getElementById("siralamaSecici");
const snackbarAlani = document.getElementById("snackbar");

let sonSonuclar = [];
let zamanlayici;
let aktifSekme = "izliyor";
let aktifSiralama = "eklenme";
let silinenYedek = null;
let silmeZamanlayici = null;

const SVG_SIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SVG_ILERI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4l14 8-14 8V4z" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SVG_TIK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';


/* ---------------- ARAMA ---------------- */
kutu.addEventListener("input", () => {
  clearTimeout(zamanlayici);
  const kelime = kutu.value.trim();
  aramaTemizleBtn.style.display = kutu.value ? "flex" : "none";

  if (kelime.length < 2) {
    sonucAlani.innerHTML = "";
    sonucBaslik.style.display = "none";
    return;
  }
  zamanlayici = setTimeout(() => aramaCalistir(kelime), 400);
});

aramaTemizleBtn.addEventListener("click", () => {
  kutu.value = "";
  aramaTemizleBtn.style.display = "none";
  sonucAlani.innerHTML = "";
  sonucBaslik.style.display = "none";
  kutu.focus();
});

async function aramaCalistir(kelime) {
  sonucBaslik.style.display = "block";
  sonucAlani.innerHTML = iskeletHTML(3);

  try {
    sonSonuclar = await tmdbAra(kelime);
    sonucGoster(sonSonuclar);
  } catch (hata) {
    sonucAlani.innerHTML = "<div class='bilgi'>Bir şeyler ters gitti.</div>";
  }
}

function iskeletHTML(adet) {
  return Array(adet).fill(`
    <div class="sonuc-kart iskelet-kart">
      <div class="iskelet-blok sonuc-poster"></div>
      <div class="sonuc-bilgi">
        <div class="iskelet-blok" style="width:70%;height:15px;margin-bottom:8px;"></div>
        <div class="iskelet-blok" style="width:40%;height:12px;"></div>
      </div>
    </div>`).join("");
}

function sonucGoster(liste) {
  if (liste.length === 0) {
    sonucAlani.innerHTML = "<div class='bilgi'>Sonuç bulunamadı.</div>";
    return;
  }

  sonucAlani.innerHTML = liste.map((x, i) => {
    const diziMi = x.media_type === "tv";
    const ad = diziMi ? x.name : x.title;
    const tarih = diziMi ? x.first_air_date : x.release_date;
    const yil = tarih ? tarih.slice(0, 4) : "—";

    // Bu öğe zaten listemde mi? Öyleyse "+" yerine "Eklendi" göster
    const key = x.media_type + "-" + x.id;
    const zatenVar = listem.some((o) => o.key === key);
    const sagKisim = zatenVar
      ? `<span class="eklendi-etiket">✓ Eklendi</span>`
      : `<button class="ekle-btn" data-ekle="${i}">+</button>`;

    return `
      <div class="sonuc-kart" data-sonuc="${i}">
        <img class="sonuc-poster" src="${posterUrl(x.poster_path)}" alt="">
        <div class="sonuc-bilgi">
          <div class="sonuc-ad">${ad}</div>
          <div class="sonuc-yil">${yil}</div>
          <span class="rozet ${diziMi ? "dizi" : "film"}">${diziMi ? "Dizi" : "Film"}</span>
          <div class="sonuc-aksiyon">${sagKisim}</div>
        </div>
      </div>`;
  }).join("");
}

sonucAlani.addEventListener("click", (e) => {
  // "+" butonuna basıldıysa "nereye eklensin" akışını aç
  const ekleBtn = e.target.closest("[data-ekle]");
  if (ekleBtn) {
    eklemeSecimiAc(sonSonuclar[ekleBtn.dataset.ekle]);
    return;
  }
  // Kartın başka bir yerine (poster/ad) tıklandıysa detay önizlemesini aç
  const kart = e.target.closest("[data-sonuc]");
  if (kart) {
    detayAcTmdb(sonSonuclar[kart.dataset.sonuc]);
  }
});


/* ---------------- EKLERKEN "NEREYE EKLENSİN" SEÇİMİ ---------------- */
const eklemeModal = document.getElementById("eklemeModal");
const eklemeKapatBtn = document.getElementById("eklemeKapatBtn");
const eklemePoster = document.getElementById("eklemePoster");
const eklemeBaslik = document.getElementById("eklemeBaslik");
const eklemeYil = document.getElementById("eklemeYil");
const eklemeSecenekler = document.getElementById("eklemeSecenekler");

let eklenecekOge = null;

function eklemeSecimiAc(x) {
  const diziMi = x.media_type === "tv";
  const tarih = diziMi ? x.first_air_date : x.release_date;

  eklenecekOge = x;
  eklemePoster.src = posterUrl(x.poster_path);
  eklemeBaslik.textContent = diziMi ? x.name : x.title;
  eklemeYil.textContent = tarih ? tarih.slice(0, 4) : "—";
  eklemeModal.style.display = "flex";
}

function eklemeKapat() {
  eklemeModal.style.display = "none";
  eklenecekOge = null;
}

eklemeKapatBtn.addEventListener("click", eklemeKapat);
eklemeModal.addEventListener("click", (e) => {
  if (e.target === eklemeModal) eklemeKapat();
});

// "Önce detayına bak" → ekleme modalını kapat, detay önizlemesini aç
const eklemeDetayBtn = document.getElementById("eklemeDetayBtn");
eklemeDetayBtn.addEventListener("click", () => {
  if (!eklenecekOge) return;
  const oge = eklenecekOge;
  eklemeKapat();
  detayAcTmdb(oge);
});

eklemeSecenekler.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-durum-ekle]");
  if (!btn || !eklenecekOge) return;

  // "Birlikte İzlenenler" seçildiyse kişisel listeye değil, ortak (Firestore) listeye ekle
  if (btn.dataset.durumEkle === "birlikte") {
    const oge = eklenecekOge;
    eklemeKapat();
    ortakEkleAkisi(oge);
    return;
  }

  await ekle(eklenecekOge, btn.dataset.durumEkle);
  eklemeKapat();
});


/* ---------------- LİSTEYE EKLEME ---------------- */
async function ekle(x, secilenDurum) {
  const diziMi = x.media_type === "tv";
  const key = x.media_type + "-" + x.id;
  if (listem.some((o) => o.key === key)) return; // zaten varsa ekleme

  const tarih = diziMi ? x.first_air_date : x.release_date;
  const yeniOge = {
    key: key,
    type: x.media_type,
    tmdbId: x.id,
    ad: diziMi ? x.name : x.title,
    yil: tarih ? tarih.slice(0, 4) : "—",
    poster: x.poster_path,
    durum: secilenDurum,
    eklenmeZamani: Date.now(),
  };

  // "İzlemek İstiyorum" seçilirse bölüm bilgisini şimdiden çekmiyoruz,
  // "İzlemeye Başla"ya basınca (bolumTakibiBaslat ile) lazım olduğunda çekilir
  if (diziMi && secilenDurum !== "izlemek_istiyor") {
    yeniOge.sezonSayisi = await sezonSayisiGetir(x.id);
    yeniOge.bolumSayilari = {};
    yeniOge.bolumDetaylari = {};

    if (secilenDurum === "bitirdi") {
      // Dizinin tamamını izlemiş: son sezonun son bölümüne yerleştir
      const sonSezon = yeniOge.sezonSayisi;
      const sonuc = await bolumSayisiGetir(x.id, sonSezon);
      yeniOge.bolumSayilari[sonSezon] = sonuc.sayi;
      yeniOge.bolumDetaylari[sonSezon] = sonuc.bolumler;
      yeniOge.sezon = sonSezon;
      yeniOge.bolum = sonuc.sayi;
    } else {
      yeniOge.sezon = 1;
      yeniOge.bolum = 1;
      const sonuc = await bolumSayisiGetir(x.id, 1);
      yeniOge.bolumSayilari[1] = sonuc.sayi;
      yeniOge.bolumDetaylari[1] = sonuc.bolumler;
    }
  }

  listem.push(yeniOge);
  kaydet();
  listeyiCiz();
  // Arama sonuçları açıksa, oradaki "+" artık "Eklendi" olsun diye yeniden çiz
  if (sonSonuclar.length) sonucGoster(sonSonuclar);
}


/* ---------------- SEKMELER / SIRALAMA ---------------- */
sekmeAlani.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-sekme]");
  if (!btn) return;
  aktifSekme = btn.dataset.sekme;
  listeyiCiz();

  // "Birlikte" sekmesine girildiğinde henüz bağlı değilsek kod penceresini hemen aç
  if (aktifSekme === "birlikte" && typeof ortakKod !== "undefined" && !ortakKod) {
    ortakKodModalAc();
  }
});

siralamaSecici.addEventListener("change", () => {
  aktifSiralama = siralamaSecici.value;
  listeyiCiz();
});

function gorunecekListe() {
  const suzulmus = listem.filter((o) => o.durum === aktifSekme);

  return suzulmus.slice().sort((a, b) => {
    if (aktifSiralama === "alfabetik") return a.ad.localeCompare(b.ad, "tr");
    if (aktifSiralama === "tur") return a.type.localeCompare(b.type);
    return b.eklenmeZamani - a.eklenmeZamani; // son eklenen
  });
}


/* ---------------- KART ÇİZİMİ ---------------- */

// Sekme başlıklarındaki sayaçları ve aktif vurguyu günceller.
// "birlikte" sekmesi kişisel listeden değil, ortak (Firestore) listeden sayılır.
function sekmeSayilariniGuncelle() {
  sekmeAlani.querySelectorAll("[data-sekme]").forEach((btn) => {
    const s = btn.dataset.sekme;
    const sayi = s === "birlikte"
      ? (typeof ortakListem !== "undefined" ? ortakListem.length : 0)
      : listem.filter((o) => o.durum === s).length;
    btn.classList.toggle("aktif", s === aktifSekme);
    btn.querySelector(".sekme-sayi").textContent = sayi;
  });
}

function listeyiCiz() {
  sekmeSayilariniGuncelle();

  // "Birlikte İzlenenler" sekmesi tamamen ayrı bir kaynaktan (Firestore) çizilir
  if (aktifSekme === "birlikte") {
    ortakListeyiCiz();
    return;
  }

  const goruntulenecek = gorunecekListe();

  if (goruntulenecek.length === 0) {
    listeAlani.innerHTML = "<div class='bos'>Bu bölümde henüz bir şey yok.</div>";
    return;
  }

  listeAlani.innerHTML = goruntulenecek.map(kartHTML).join("");
}

function kartHTML(o) {
  const diziMi = o.type === "tv";

  let ilerlemeHTML = "";
  let aksiyonHTML = "";

  if (diziMi && o.durum === "izlemek_istiyor" && !o.bolumSayilari) {
    // Henüz hiç bölüm bilgisi çekilmemiş (izlemek istiyorum listesine direkt eklendi)
    aksiyonHTML = `<button class="sonraki-btn" data-baslat-izleme="${o.key}">İzlemeye Başla</button>`;
  } else if (diziMi && o.bolumSayilari) {
    const buSezonToplam = o.bolumSayilari[o.sezon] || 1;
    const yuzde = Math.round((o.bolum / buSezonToplam) * 100);
    ilerlemeHTML = `
      <div class="ilerleme-cubuk"><div class="ilerleme-dolu" style="width:${yuzde}%"></div></div>
      <span class="bolum-etiket">S${o.sezon} • B${o.bolum} / ${buSezonToplam}</span>`;

    if (o.durum === "izlemek_istiyor") {
      aksiyonHTML = `<button class="sonraki-btn" data-baslat-izleme="${o.key}">İzlemeye Başla</button>`;
    } else if (o.durum === "izliyor") {
      const bitti = sonBolumMu(o);
      aksiyonHTML = `<button class="sonraki-btn ikon-btn" data-sonraki="${o.key}" ${bitti ? "disabled" : ""}>${bitti ? SVG_TIK + "Bitti" : SVG_ILERI + "Sonraki Bölüm"}</button>`;
    }
  } else if (diziMi) {
    // Bölüm takibi özelliğinden önce eklenmiş eski bir dizi
    aksiyonHTML = `<button class="sonraki-btn" data-baslat="${o.key}">Bölüm takibini başlat</button>`;
  } else if (!diziMi && o.durum !== "bitirdi") {
    aksiyonHTML = `<button class="sonraki-btn ikon-btn" data-izledim="${o.key}">${SVG_TIK}İzledim</button>`;
  }

  const yildizHTML = o.durum === "bitirdi" ? `
    <div class="puan-satiri">
      ${[1, 2, 3, 4, 5].map((i) => `<button class="yildiz-btn" data-puan-ver="${o.key}" data-yildiz="${i}">${o.puan && i <= o.puan ? "★" : "☆"}</button>`).join("")}
    </div>` : "";

  return `
    <div class="kart">
      <div class="kart-ust" data-detay="${o.key}">
        <img src="${posterUrl(o.poster)}" alt="">
        <div class="orta">
          <div class="baslik">${o.ad}</div>
          <div class="alt">${o.yil}</div>
          <span class="rozet ${diziMi ? "dizi" : "film"}">${diziMi ? "Dizi" : "Film"}</span>
          ${ilerlemeHTML}
          ${yildizHTML}
        </div>
      </div>
      <div class="kart-aksiyonlar">
        <select class="durum-secici" data-durum-sec="${o.key}">
          <option value="izliyor" ${o.durum === "izliyor" ? "selected" : ""}>Devam Edenler</option>
          <option value="bitirdi" ${o.durum === "bitirdi" ? "selected" : ""}>Bitenler</option>
          <option value="izlemek_istiyor" ${o.durum === "izlemek_istiyor" ? "selected" : ""}>İstek Listesi</option>
        </select>
        ${aksiyonHTML}
        <button class="sil-btn ikon-btn" data-sil="${o.key}" aria-label="Kaldır" title="Kaldır">${SVG_SIL}</button>
      </div>
    </div>`;
}

// Dizi son sezonun son bölümüne mi geldi?
function sonBolumMu(o) {
  if (!o.bolumSayilari) return false;
  const buSezonBolumSayisi = o.bolumSayilari[o.sezon];
  return o.sezon >= o.sezonSayisi && o.bolum >= buSezonBolumSayisi;
}


/* ---------------- LİSTE KARTI OLAYLARI ---------------- */
listeAlani.addEventListener("click", async (e) => {
  // "Birlikte" sekmesindeyken kartlar ortak listeden gelir; olayları ortak.js yönetir
  if (aktifSekme === "birlikte") { ortakListeTiklama(e); return; }

  const detayHedefi = e.target.closest("[data-detay]");
  const baslatBtn = e.target.closest("[data-baslat]");
  const baslatIzlemeBtn = e.target.closest("[data-baslat-izleme]");
  const sonrakiBtn = e.target.closest("[data-sonraki]");
  const izledimBtn = e.target.closest("[data-izledim]");
  const silBtn = e.target.closest("[data-sil]");
  const yildizBtn = e.target.closest("[data-puan-ver]");

  if (yildizBtn) {
    const o = listem.find((x) => x.key === yildizBtn.dataset.puanVer);
    if (o) {
      const secilen = Number(yildizBtn.dataset.yildiz);
      o.puan = o.puan === secilen ? 0 : secilen; // aynı yıldıza tekrar basınca puanı kaldır
      kaydet();
      listeyiCiz();
    }
    return;
  }
  if (baslatBtn) {
    await bolumTakibiBaslat(baslatBtn.dataset.baslat);
    return;
  }
  if (baslatIzlemeBtn) {
    const o = listem.find((x) => x.key === baslatIzlemeBtn.dataset.baslatIzleme);
    if (o) {
      o.durum = "izliyor";
      if (!o.bolumSayilari) await bolumTakibiBaslat(o.key);
      kaydet();
      listeyiCiz();
    }
    return;
  }
  if (sonrakiBtn) {
    await sonrakiBolume(sonrakiBtn.dataset.sonraki);
    return;
  }
  if (izledimBtn) {
    const o = listem.find((x) => x.key === izledimBtn.dataset.izledim);
    if (o) {
      o.durum = "bitirdi";
      kaydet();
      listeyiCiz();
    }
    return;
  }
  if (silBtn) {
    sil(silBtn.dataset.sil);
    return;
  }
  if (detayHedefi) {
    detayAc(detayHedefi.dataset.detay);
  }
});

listeAlani.addEventListener("change", (e) => {
  // "Birlikte" sekmesindeyken durum değişimini ortak.js Firestore'a yazar
  if (aktifSekme === "birlikte") { ortakListeDegisim(e); return; }

  const secici = e.target.closest("[data-durum-sec]");
  if (!secici) return;
  const o = listem.find((x) => x.key === secici.dataset.durumSec);
  if (o) {
    o.durum = secici.value;
    kaydet();
    listeyiCiz();
  }
});


/* ---------------- BÖLÜM TAKİBİ ---------------- */

// Bölüm takibi olmadan eklenmiş eski bir diziye sonradan bölüm takibi ekler
async function bolumTakibiBaslat(key) {
  const o = listem.find((x) => x.key === key);
  if (!o || o.bolumSayilari) return;

  o.sezon = 1;
  o.bolum = 1;
  o.sezonSayisi = await sezonSayisiGetir(o.tmdbId);
  o.bolumSayilari = {};
  o.bolumDetaylari = {};
  const sonuc = await bolumSayisiGetir(o.tmdbId, 1);
  o.bolumSayilari[1] = sonuc.sayi;
  o.bolumDetaylari[1] = sonuc.bolumler;

  kaydet();
  listeyiCiz();
}

// Bir dizinin bölümünü bir ileri götürür, sezon biterse otomatik sonraki sezona geçer
async function sonrakiBolume(key) {
  const o = listem.find((x) => x.key === key);
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

  if (sonBolumMu(o)) o.durum = "bitirdi"; // tüm bölümler bitince otomatik "Bitirdim"e taşı

  kaydet();
  listeyiCiz();
}


/* ---------------- SİLME + GERİ AL ---------------- */
function sil(key) {
  const index = listem.findIndex((o) => o.key === key);
  if (index === -1) return;

  silinenYedek = { oge: listem[index], index: index };
  listem.splice(index, 1);
  kaydet();
  listeyiCiz();
  if (sonSonuclar.length) sonucGoster(sonSonuclar);

  snackbarGoster(`"${silinenYedek.oge.ad}" kaldırıldı`, geriAl);
}

function geriAl() {
  if (!silinenYedek) return;
  listem.splice(silinenYedek.index, 0, silinenYedek.oge);
  silinenYedek = null;
  kaydet();
  listeyiCiz();
  if (sonSonuclar.length) sonucGoster(sonSonuclar);
  snackbarGizle();
}

function snackbarGoster(mesaj, geriAlFn) {
  clearTimeout(silmeZamanlayici);
  snackbarAlani.innerHTML = `<span>${mesaj}</span><button id="snackbarGeriAlBtn">Geri Al</button>`;
  snackbarAlani.style.display = "flex";
  document.getElementById("snackbarGeriAlBtn").onclick = geriAlFn;

  silmeZamanlayici = setTimeout(() => {
    silinenYedek = null;
    snackbarGizle();
  }, 5000);
}

function snackbarGizle() {
  snackbarAlani.style.display = "none";
  snackbarAlani.innerHTML = "";
}
