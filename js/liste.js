const kutu = document.getElementById("arama");
const sonucAlani = document.getElementById("sonuclar");
const sonucBaslik = document.getElementById("sonuc-baslik");
const listeAlani = document.getElementById("listem");
const sekmeAlani = document.getElementById("sekmeler");
const siralamaSecici = document.getElementById("siralamaSecici");

let zamanlayici;
let sonSonuclar = [];
let aktifSekme = "izliyor";
let aktifSiralama = "eklenme";

kutu.addEventListener("input", () => {
  clearTimeout(zamanlayici);
  const kelime = kutu.value.trim();
  if (kelime.length < 2) {
    sonucAlani.innerHTML = "";
    sonucBaslik.style.display = "none"; // arama boşsa başlığı da gizle
    return;
  }
  zamanlayici = setTimeout(() => ara(kelime), 400);
});

async function ara(kelime) {
  sonucBaslik.style.display = "block"; // arama sonuçları başlığını göster
  sonucAlani.innerHTML = "<div class='bilgi'>Aranıyor...</div>";

  const url = "https://api.themoviedb.org/3/search/multi"
    + "?api_key=" + API_KEY
    + "&language=tr-TR"
    + "&query=" + encodeURIComponent(kelime);

  try {
    const cevap = await fetch(url);
    const veri = await cevap.json();
    sonSonuclar = (veri.results || []).filter(
      (x) => x.media_type === "movie" || x.media_type === "tv"
    );
    goster(sonSonuclar);
  } catch (hata) {
    sonucAlani.innerHTML = "<div class='bilgi'>Bir şeyler ters gitti.</div>";
  }
}

function goster(liste) {
  if (liste.length === 0) {
    sonucAlani.innerHTML = "<div class='bilgi'>Sonuç bulunamadı.</div>";
    return;
  }

  sonucAlani.innerHTML = liste.map((x, i) => {
    const diziMi = x.media_type === "tv";
    const ad = diziMi ? x.name : x.title;
    const tarih = diziMi ? x.first_air_date : x.release_date;
    const yil = tarih ? tarih.slice(0, 4) : "—";

    const key = x.media_type + "-" + x.id;
    const zatenVar = listem.some((o) => o.key === key);
    const sagKisim = zatenVar
      ? `<span class="eklendi-etiket">✓ Eklendi</span>`
      : `<button class="ekle-btn" data-ekle="${i}">+</button>`;

    return `
      <div class="kart">
        <img src="${posterUrl(x.poster_path)}" alt="">
        <div class="orta">
          <div class="baslik">${ad}</div>
          <div class="alt">${yil}</div>
          <span class="rozet ${diziMi ? "dizi" : "film"}">${diziMi ? "Dizi" : "Film"}</span>
        </div>
        ${sagKisim}
      </div>`;
  }).join("");
}

sonucAlani.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-ekle]");
  if (!btn) return;
  ekle(sonSonuclar[btn.dataset.ekle]);
});


/* ---------------- LİSTEYE EKLEME ---------------- */
async function ekle(x) {
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
    durum: "izliyor",
    eklenmeZamani: Date.now(),
  };

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

  listem.push(yeniOge);

  kaydet();
  listeyiCiz();
  // Arama sonuçları açıksa, oradaki "+" artık "Eklendi" olsun diye yeniden çiz
  if (sonSonuclar.length) goster(sonSonuclar);
}


/* ---------------- SEKMELER / SIRALAMA ---------------- */
sekmeAlani.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-sekme]");
  if (!btn) return;
  aktifSekme = btn.dataset.sekme;
  listeyiCiz();
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
function listeyiCiz() {
  sekmeAlani.querySelectorAll("[data-sekme]").forEach((btn) => {
    const sayi = listem.filter((o) => o.durum === btn.dataset.sekme).length;
    btn.classList.toggle("aktif", btn.dataset.sekme === aktifSekme);
    btn.querySelector(".sekme-sayi").textContent = sayi;
  });

  const goruntulenecek = gorunecekListe();

  if (goruntulenecek.length === 0) {
    listeAlani.innerHTML = "<div class='bos'>Bu bölümde henüz bir şey yok.</div>";
    return;
  }

  listeAlani.innerHTML = goruntulenecek.map(kartHTML).join("");
}

function kartHTML(o) {
  const diziMi = o.type === "tv";

  let bolumSatiri = "";
  let aksiyonHTML = "";

  if (diziMi && o.bolumSayilari) {
    const buSezonToplam = o.bolumSayilari[o.sezon] || 1;
    bolumSatiri = `<span class="bolum-etiket">S${o.sezon} • B${o.bolum} / ${buSezonToplam}</span>`;

    if (o.durum === "izlemek_istiyor") {
      aksiyonHTML = `<button class="sonraki-btn" data-baslat-izleme="${o.key}">İzlemeye Başla</button>`;
    } else if (o.durum === "izliyor") {
      const bitti = sonBolumMu(o);
      aksiyonHTML = `<button class="sonraki-btn" data-sonraki="${o.key}" ${bitti ? "disabled" : ""}>${bitti ? "Bitti ✓" : "Sonraki Bölüm ▶"}</button>`;
    }
  } else if (diziMi) {
    // Bölüm takibi özelliğinden önce eklenmiş eski bir dizi
    aksiyonHTML = `<button class="sonraki-btn" data-baslat="${o.key}">Bölüm takibini başlat</button>`;
  } else if (!diziMi && o.durum !== "bitirdi") {
    aksiyonHTML = `<button class="sonraki-btn" data-izledim="${o.key}">İzledim</button>`;
  }

  return `
    <div class="kart">
      <div class="kart-ust" data-detay="${o.key}">
        <img src="${posterUrl(o.poster)}" alt="">
        <div class="orta">
          <div class="baslik">${o.ad}</div>
          <div class="alt">${o.yil}</div>
          <span class="rozet ${diziMi ? "dizi" : "film"}">${diziMi ? "Dizi" : "Film"}</span>
          ${bolumSatiri}
        </div>
      </div>
      <div class="kart-aksiyonlar">
        <select class="durum-secici" data-durum-sec="${o.key}">
          <option value="izliyor" ${o.durum === "izliyor" ? "selected" : ""}>İzliyorum</option>
          <option value="bitirdi" ${o.durum === "bitirdi" ? "selected" : ""}>Bitirdim</option>
          <option value="izlemek_istiyor" ${o.durum === "izlemek_istiyor" ? "selected" : ""}>İzlemek İstiyorum</option>
        </select>
        ${aksiyonHTML}
        <button class="sil-btn" data-sil="${o.key}">Kaldır</button>
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
  const detayHedefi = e.target.closest("[data-detay]");
  const baslatBtn = e.target.closest("[data-baslat]");
  const baslatIzlemeBtn = e.target.closest("[data-baslat-izleme]");
  const sonrakiBtn = e.target.closest("[data-sonraki]");
  const izledimBtn = e.target.closest("[data-izledim]");
  const silBtn = e.target.closest("[data-sil]");

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
    listem = listem.filter((o) => o.key !== silBtn.dataset.sil);
    kaydet();
    listeyiCiz();
    // Listeden çıkanın arama sonucundaki hali tekrar "+" olsun
    if (sonSonuclar.length) goster(sonSonuclar);
    return;
  }
  if (detayHedefi) {
    detayAc(detayHedefi.dataset.detay);
  }
});

listeAlani.addEventListener("change", (e) => {
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
