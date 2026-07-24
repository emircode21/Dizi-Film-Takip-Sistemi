/* ---------------- DETAY MODALI ---------------- */

const detayModal = document.getElementById("detayModal");
const detayKapatBtn = document.getElementById("detayKapatBtn");
const detayPoster = document.getElementById("detayPoster");
const detayBaslik = document.getElementById("detayBaslik");
const detayYil = document.getElementById("detayYil");
const detayRozet = document.getElementById("detayRozet");
const detayOzet = document.getElementById("detayOzet");
const detayEkstra = document.getElementById("detayEkstra");
const detayEkleAlani = document.getElementById("detayEkleAlani");
const detayOneriler = document.getElementById("detayOneriler");
const detaySezonAlani = document.getElementById("detaySezonAlani");
const detaySezonSecici = document.getElementById("detaySezonSecici");
const detayBolumSecici = document.getElementById("detayBolumSecici");
const detayKaydetBtn = document.getElementById("detayKaydetBtn");
const detayKalanBilgi = document.getElementById("detayKalanBilgi");
const detayBolumListesi = document.getElementById("detayBolumListesi");

let acikOgeKey = null;
let detayOrtakMi = false; // açık öğe ortak listeden mi geldi? (kaydetme yolunu belirler)

// Öğeyi önce kişisel listede, yoksa ortak listede arar
function detayOgeBul(key) {
  let o = listem.find((x) => x.key === key);
  if (o) { detayOrtakMi = false; return o; }
  if (typeof ortakListem !== "undefined") {
    o = ortakListem.find((x) => x.key === key);
    if (o) { detayOrtakMi = true; return o; }
  }
  return null;
}

// Açık öğeyi doğru yere kaydeder (kişisel → localStorage, ortak → Firestore)
function detayKaydet(o) {
  if (detayOrtakMi) ortakGuncelle(o);
  else kaydet();
}

// Kayıtlı olmayan (arama/öneri) öğe için TMDB ham objesi — "Listeye ekle" bunu kullanır
let detayOnizlemeHam = null;

// Detay içi gezinme: "Benzer yapımlar" için geri yığını + sürpriz "başka öneri" havuzu
const detayGeriBtn = document.getElementById("detayGeriBtn");
let detayGecmis = [];          // her biri önceki görünümü yeniden açan fonksiyon
let detaySuAnkiAcici = null;   // şu an görüneni yeniden açan fonksiyon
let detaySurprizHavuz = null;  // sürprizden geldiyse "başka öneri" için aday havuzu
let detayDonusFn = null;   // dış bir ekrandan (sürpriz/oyuncu) gelindiyse oraya dönüş fonksiyonu

function detayGeriGuncelle() {
  const goster = detayGecmis.length > 0 || !!detayDonusFn;
  if (detayGeriBtn) detayGeriBtn.style.display = goster ? "inline-flex" : "none";
}

// Dış bir ekrandan (sürpriz filtreleri / oyuncu sayfası) gelindiğinde "geri" ile oraya dönüşü ayarla
function detayDonusAyarla(fn) {
  detayDonusFn = fn;
  detayGeriGuncelle();
}

// Başlık + zengin gövde çizimi; kayıtlı ve önizleme modu için ortak.
// Dönen değer: detay objesi (başarılıysa) veya null (kullanıcı bu arada başka öğe açtıysa).
async function detayGovdeCiz(type, tmdbId, ad, yil, poster, gecerliKey) {
  const diziMi = type === "tv";

  detayPoster.src = posterUrl(poster);
  detayBaslik.textContent = ad;
  detayYil.textContent = yil;
  detayRozet.textContent = diziMi ? "Dizi" : "Film";
  detayRozet.className = "rozet " + (diziMi ? "dizi" : "film");
  detayOzet.textContent = "Yükleniyor...";
  detayEkstra.innerHTML = "";
  detayOneriler.innerHTML = "";
  detayEkleAlani.style.display = "none";
  detaySezonAlani.style.display = "none";
  if (typeof anilariGoster === "function") anilariGoster(null); // yükleme sırasında eski anıları gizle
  detayModal.style.display = "flex";
  const mKutu = detayModal.querySelector(".modal-kutu");
  if (mKutu) mKutu.scrollTop = 0;

  const detay = await detayGetir(type, tmdbId);

  // Kullanıcı beklerken başka bir öğe açtıysa bu sonucu yazma
  if (acikOgeKey !== gecerliKey) return null;

  detayOzet.textContent = detay.ozet || "Özet bulunamadı.";
  detayEkstraCiz(detay, diziMi);
  detayOnerileriCiz(detay.oneriler);

  // IMDb puanı + gerçek ödül metni (varsa) arka planda çek ve ilgili yerleri güncelle
  if (detay.imdbId) {
    omdbGetir(detay.imdbId).then((r) => {
      if (acikOgeKey !== gecerliKey) return;
      if (r.imdbRating) {
        const yer = document.getElementById("imdbPuanYeri");
        if (yer) yer.innerHTML = `<span class="puan-rozet imdb"><b>IMDb</b> ${r.imdbRating}</span>`;
      }
      if (r.awards) {
        const odulYeri = document.getElementById("odulYeri");
        if (odulYeri) odulYeri.innerHTML = `<div class="detay-odul">🏆 ${r.awards}</div>`;
      }
    });
  }

  return detay;
}

// Kayıtlı bir öğenin detayı (sezon/bölüm takibiyle)
// kok=true → yeni bir gezinme kökü (geçmiş temizlenir); false → geri/ileri gezinme
async function detayAc(key, kok = true) {
  const o = detayOgeBul(key);
  if (!o) return;

  if (kok) { detayGecmis = []; detaySurprizHavuz = null; detayDonusFn = null; }
  detaySuAnkiAcici = () => detayAc(key, false);
  detayGeriGuncelle();

  acikOgeKey = key;
  detayOnizlemeHam = null;
  const diziMi = o.type === "tv";

  const detay = await detayGovdeCiz(o.type, o.tmdbId, o.ad, o.yil, o.poster, key);
  if (detay === null) return;

  // Anılar: yalnızca ortak listedeki öğeler için (foto/ses senkronu gerektirir)
  if (typeof anilariGoster === "function") anilariGoster(detayOrtakMi ? key : null);

  if (diziMi && o.bolumSayilari) {
    detaySezonAlani.style.display = "block";
    detaySezonSeceneklerDoldur(o);
    detaySezonSecici.value = String(o.sezon);
    await detayBolumleriCiz(o, o.sezon);
    detayBolumSecici.value = String(o.bolum);
  } else {
    detaySezonAlani.style.display = "none";
  }
}

// Kayıtlı OLMAYAN bir TMDB öğesinin (arama sonucu / öneri) detay önizlemesi.
// x: TMDB arama biçimi { media_type, id, poster_path, name/title, first_air_date/release_date }
async function detayAcTmdb(x, kok = true, surprizHavuz = null) {
  if (kok) { detayGecmis = []; detaySurprizHavuz = surprizHavuz; detayDonusFn = null; }
  else if (surprizHavuz) { detaySurprizHavuz = surprizHavuz; }
  const buHavuz = detaySurprizHavuz; // bu görünümdeki "başka öneri" havuzu
  detaySuAnkiAcici = () => detayAcTmdb(x, false, buHavuz);
  detayGeriGuncelle();

  const diziMi = x.media_type === "tv";
  const ad = diziMi ? (x.name || x.title) : (x.title || x.name);
  const tarih = diziMi ? x.first_air_date : x.release_date;
  const yil = tarih ? tarih.slice(0, 4) : "—";
  const key = "onizleme:" + x.media_type + "-" + x.id;

  acikOgeKey = key;
  detayOnizlemeHam = x;

  const detay = await detayGovdeCiz(x.media_type, x.id, ad, yil, x.poster_path, key);
  if (detay === null) return;

  // Bu yapım zaten listede mi? (kişisel veya ortak)
  const kayitliKey = x.media_type + "-" + x.id;
  const zatenVar = listem.some((o) => o.key === kayitliKey)
    || (typeof ortakListem !== "undefined" && ortakListem.some((o) => o.key === kayitliKey));

  let ekleHTML = zatenVar
    ? `<div class="detay-ekli-not">✓ Bu yapım zaten listende</div>`
    : `<button id="detayEkleBtn" class="detay-ekle-btn">➕ Listeye ekle</button>`;
  // Sürprizden gelindiyse tek tuşla başka öneri
  if (buHavuz && buHavuz.length > 1) {
    ekleHTML += `<button id="detayBaskaOneriBtn" class="detay-baska-btn">🎲 Başka öneri getir</button>`;
  }
  detayEkleAlani.innerHTML = ekleHTML;
  detayEkleAlani.style.display = "block";
}

// Detay önizleme alanı: "Listeye ekle" ve "Başka öneri getir"
detayEkleAlani.addEventListener("click", (e) => {
  if (e.target.closest("#detayEkleBtn") && detayOnizlemeHam) {
    const ham = detayOnizlemeHam;
    detayKapat();
    eklemeSecimiAc(ham);
    return;
  }
  if (e.target.closest("#detayBaskaOneriBtn") && detaySurprizHavuz && detaySurprizHavuz.length) {
    const havuz = detaySurprizHavuz;
    const don = detayDonusFn; // sürprize dönüşü koru
    const yeni = havuz[Math.floor(Math.random() * havuz.length)];
    detayAcTmdb(yeni, true, havuz); // yeni kök açılış, havuz korunur
    detayDonusFn = don;
    detayGeriGuncelle();
  }
});

// Geri: önce benzer-yapım yığını, o biterse sürpriz ekranına dönüş
if (detayGeriBtn) {
  detayGeriBtn.addEventListener("click", () => {
    if (detayGecmis.length) {
      const acici = detayGecmis.pop();
      detayGeriGuncelle();
      if (acici) acici();
    } else if (detayDonusFn) {
      const don = detayDonusFn;
      detayModal.style.display = "none";
      acikOgeKey = null;
      detayDonusFn = null;
      detaySurprizHavuz = null;
      detayGeriGuncelle();
      don();
    }
  });
}

function detayKapat() {
  detayModal.style.display = "none";
  acikOgeKey = null;
  detayGecmis = [];
  detaySurprizHavuz = null;
  detayDonusFn = null;
  if (typeof anilariGoster === "function") anilariGoster(null); // varsa süren kaydı temizle
  detayGeriGuncelle();
}

/* Puan rozetleri, tür/süre, oyuncular, yönetmen, sağlayıcılar, fragman */
function detayEkstraCiz(d, diziMi) {
  const parcalar = [];

  // Puan rozetleri satırı (TMDB hemen; IMDb varsa arka planda dolar)
  const puanlar = [];
  if (d.tmdbPuan) {
    puanlar.push(`<span class="puan-rozet tmdb"><b>TMDB</b> ${d.tmdbPuan}</span>`);
  }
  puanlar.push(`<span id="imdbPuanYeri"></span>`);
  parcalar.push(`<div class="detay-puanlar">${puanlar.join("")}</div>`);

  // Tür çipleri + süre
  const turSure = [];
  d.turler.forEach((t) => turSure.push(`<span class="tur-cip">${t}</span>`));
  if (d.sure) {
    const etiket = diziMi ? "bölüm ~" + d.sure + " dk" : d.sure + " dk";
    turSure.push(`<span class="tur-cip sure-cip">⏱ ${etiket}</span>`);
  }
  if (turSure.length) parcalar.push(`<div class="detay-turler">${turSure.join("")}</div>`);

  // Gerçek ödül metni (OMDb'den arka planda gelir; gelene kadar boş/gizli)
  parcalar.push(`<div id="odulYeri"></div>`);

  // Yönetmen / yaratıcı
  if (d.yonetmen) {
    const etiket = diziMi ? "Yaratıcı" : "Yönetmen";
    parcalar.push(`<div class="detay-satir"><span class="detay-etiket">${etiket}:</span> ${d.yonetmen}</div>`);
  }

  // Nerede izlenir (sağlayıcı logoları)
  if (d.saglayicilar.length) {
    const logolar = d.saglayicilar.map((s) =>
      `<img class="saglayici-logo" src="${posterUrl(s.logo)}" alt="${s.ad}" title="${s.ad}">`
    ).join("");
    const sar = d.saglayiciLink
      ? `<a href="${d.saglayiciLink}" target="_blank" rel="noopener" class="saglayici-logolar">${logolar}</a>`
      : `<div class="saglayici-logolar">${logolar}</div>`;
    parcalar.push(`<div class="detay-satir"><span class="detay-etiket">Nerede:</span> ${sar}</div>`);
  }

  // Fragman butonu
  if (d.fragmanKey) {
    parcalar.push(
      `<a class="fragman-btn" href="https://www.youtube.com/watch?v=${d.fragmanKey}" target="_blank" rel="noopener">▶ Fragmanı izle</a>`
    );
  }

  // Oyuncular
  if (d.oyuncular.length) {
    const kartlar = d.oyuncular.map((k) => `
      <div class="oyuncu-kart">
        <img class="oyuncu-foto" src="${posterUrl(k.foto)}" alt="${k.ad}">
        <div class="oyuncu-ad">${k.ad}</div>
        ${k.karakter ? `<div class="oyuncu-karakter">${k.karakter}</div>` : ""}
      </div>`).join("");
    parcalar.push(
      `<div class="detay-baslik-kucuk">Oyuncular</div><div class="oyuncu-serit">${kartlar}</div>`
    );
  }

  detayEkstra.innerHTML = parcalar.join("");
}

/* "Benzer yapımlar" yatay poster şeridi */
function detayOnerileriCiz(oneriler) {
  if (!oneriler || !oneriler.length) { detayOneriler.innerHTML = ""; return; }
  const kartlar = oneriler.map((x) => `
    <button class="oneri-kart"
            data-oneri-tmdb="${x.tmdbId}"
            data-oneri-type="${x.type}"
            data-oneri-poster="${x.poster || ""}"
            data-oneri-yil="${x.yil || ""}"
            data-oneri-ad="${(x.ad || "").replace(/"/g, "&quot;")}">
      <img class="oneri-poster" src="${posterUrl(x.poster)}" alt="${x.ad}">
      <div class="oneri-ad">${x.ad}</div>
      ${x.puan ? `<div class="oneri-puan">★ ${x.puan}</div>` : ""}
    </button>`).join("");
  detayOneriler.innerHTML =
    `<div class="detay-baslik-kucuk">Benzer yapımlar</div><div class="oneri-serit">${kartlar}</div>`;
}

// Öneri posterine tıklayınca o yapımın detayına geç; öncekini geçmişe koy
detayOneriler.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-oneri-tmdb]");
  if (!btn) return;
  const type = btn.dataset.oneriType;
  const ad = btn.dataset.oneriAd;
  const poster = btn.dataset.oneriPoster || null;
  const yil = btn.dataset.oneriYil || "";
  const tarih = yil ? yil + "-01-01" : "";

  // Şu anki yapımı geri yığınına ekle, benzer yapıma dal (kök değil)
  if (detaySuAnkiAcici) detayGecmis.push(detaySuAnkiAcici);
  detaySurprizHavuz = null; // benzer yapıma dalınca sürpriz havuzunu bırak
  detayAcTmdb({
    media_type: type,
    id: Number(btn.dataset.oneriTmdb),
    poster_path: poster,
    name: ad, title: ad,
    first_air_date: type === "tv" ? tarih : "",
    release_date: type === "movie" ? tarih : "",
  }, false);
  detayGeriGuncelle();
});

detayKapatBtn.addEventListener("click", detayKapat);
detayModal.addEventListener("click", (e) => {
  if (e.target === detayModal) detayKapat();
});

function detaySezonSeceneklerDoldur(o) {
  detaySezonSecici.innerHTML = Array.from({ length: o.sezonSayisi }, (_, i) => i + 1)
    .map((s) => `<option value="${s}">Sezon ${s}</option>`).join("");
}

async function detayBolumleriCiz(o, sezonNo) {
  if (!o.bolumSayilari[sezonNo]) {
    const sonuc = await bolumSayisiGetir(o.tmdbId, sezonNo);
    o.bolumSayilari[sezonNo] = sonuc.sayi;
    o.bolumDetaylari[sezonNo] = sonuc.bolumler;
    detayKaydet(o);
  }

  const toplamBuSezon = o.bolumSayilari[sezonNo];
  detayBolumSecici.innerHTML = Array.from({ length: toplamBuSezon }, (_, i) => i + 1)
    .map((b) => `<option value="${b}">Bölüm ${b}</option>`).join("");

  if (sezonNo === o.sezon) {
    const kalan = Math.max(0, toplamBuSezon - o.bolum);
    detayKalanBilgi.textContent = `Bu sezon toplam ${toplamBuSezon} bölüm — ${o.bolum}. bölümdesin, ${kalan} bölüm kaldı.`;
  } else {
    detayKalanBilgi.textContent = `Bu sezon toplam ${toplamBuSezon} bölüm.`;
  }

  const bolumler = o.bolumDetaylari[sezonNo] || [];
  if (bolumler.length === 0) {
    detayBolumListesi.innerHTML = "<div class='bilgi'>Bölüm bilgisi bulunamadı.</div>";
  } else {
    detayBolumListesi.innerHTML = bolumler.map((b) => {
      const izlendiMi = sezonNo < o.sezon || (sezonNo === o.sezon && b.bolumNo <= o.bolum);
      return `
        <div class="bolum-satiri ${izlendiMi ? "izlendi-satir" : ""}">
          <span class="bolum-adi">B${b.bolumNo}. ${b.ad || "İsimsiz bölüm"}</span>
          <span class="bolum-tarih">${b.tarih || ""}</span>
        </div>`;
    }).join("");
  }
}

detaySezonSecici.addEventListener("change", async () => {
  const o = (detayOrtakMi ? ortakListem : listem).find((x) => x.key === acikOgeKey);
  if (!o) return;
  await detayBolumleriCiz(o, Number(detaySezonSecici.value));
  detayBolumSecici.value = "1";
});

detayKaydetBtn.addEventListener("click", async () => {
  const o = (detayOrtakMi ? ortakListem : listem).find((x) => x.key === acikOgeKey);
  if (!o) return;

  o.sezon = Number(detaySezonSecici.value);
  o.bolum = Number(detayBolumSecici.value);

  if (sonBolumMu(o)) o.durum = "bitirdi";
  else if (o.durum === "izlemek_istiyor") o.durum = "izliyor";

  detayKaydet(o);
  listeyiCiz();
  await detayBolumleriCiz(o, o.sezon);
});
