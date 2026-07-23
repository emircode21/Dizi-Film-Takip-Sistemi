/* ---------------- DETAY MODALI ---------------- */

const detayModal = document.getElementById("detayModal");
const detayKapatBtn = document.getElementById("detayKapatBtn");
const detayPoster = document.getElementById("detayPoster");
const detayBaslik = document.getElementById("detayBaslik");
const detayYil = document.getElementById("detayYil");
const detayRozet = document.getElementById("detayRozet");
const detayOzet = document.getElementById("detayOzet");
const detayEkstra = document.getElementById("detayEkstra");
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

async function detayAc(key) {
  const o = detayOgeBul(key);
  if (!o) return;

  acikOgeKey = key;
  const diziMi = o.type === "tv";

  detayPoster.src = posterUrl(o.poster);
  detayBaslik.textContent = o.ad;
  detayYil.textContent = o.yil;
  detayRozet.textContent = diziMi ? "Dizi" : "Film";
  detayRozet.className = "rozet " + (diziMi ? "dizi" : "film");
  detayOzet.textContent = "Yükleniyor...";
  detayEkstra.innerHTML = "";
  detayOneriler.innerHTML = "";
  detayModal.style.display = "flex";
  detayModal.scrollTop = 0;
  const kutu = detayModal.querySelector(".modal-kutu");
  if (kutu) kutu.scrollTop = 0;

  // Kapsamlı detayı tek yerde çek (tür, süre, oyuncu, yönetmen, fragman, puan, öneriler)
  const detay = await detayGetir(o.type, o.tmdbId);

  // Kullanıcı beklerken başka bir öğe açtıysa bu sonucu yazma
  if (acikOgeKey !== key) return;

  detayOzet.textContent = detay.ozet || "Özet bulunamadı.";
  detayEkstraCiz(detay, diziMi);
  detayOnerileriCiz(detay.oneriler);

  // IMDb puanını (varsa) arka planda çek ve rozeti güncelle
  if (detay.imdbId) {
    imdbPuanGetir(detay.imdbId).then((puan) => {
      if (acikOgeKey !== key || !puan) return;
      const yer = document.getElementById("imdbPuanYeri");
      if (yer) {
        yer.innerHTML = `<span class="puan-rozet imdb"><b>IMDb</b> ${puan}</span>`;
      }
    });
  }

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

function detayKapat() {
  detayModal.style.display = "none";
  acikOgeKey = null;
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

// Öneri posterine tıklayınca "nereye eklensin" akışını aç (mevcut fonksiyonu kullan)
detayOneriler.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-oneri-tmdb]");
  if (!btn) return;
  const type = btn.dataset.oneriType;
  const ad = btn.dataset.oneriAd;
  const poster = btn.dataset.oneriPoster || null;
  const yil = btn.dataset.oneriYil || "";
  // eklemeSecimiAc TMDB arama biçimini bekler → uygun şekle çevir
  const tarih = yil ? yil + "-01-01" : "";
  eklemeSecimiAc({
    media_type: type,
    id: Number(btn.dataset.oneriTmdb),
    poster_path: poster,
    name: ad, title: ad,
    first_air_date: type === "tv" ? tarih : "",
    release_date: type === "movie" ? tarih : "",
  });
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
