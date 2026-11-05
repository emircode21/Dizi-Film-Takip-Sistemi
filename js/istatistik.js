/* ---------------- İSTATİSTİKLER ----------------
   Kişisel + Birlikte listelerinden istemci tarafında hesaplanır.
   "En sevdikleriniz" (tür/oyuncu/yönetmen) için TMDB'den bitirilen yapım
   başına bir kerelik detay isteği atılır, sonuç cihazda kalıcı önbelleklenir. */

// ponytail: gerçek film/bölüm süresini TMDB'den çekmek her öğe için ayrı istek
// gerektirir; onun yerine ortalama sabitlerle "tahmini" saat hesaplanıyor.
const ISTATISTIK_ORT_FILM_DK = 110;
const ISTATISTIK_ORT_BOLUM_DK = 45;
const ISTATISTIK_META_ANAHTARI = "istatistikMetaOnbellek";

const istatistikBtn = document.getElementById("istatistikBtn");
const istatistikModal = document.getElementById("istatistikModal");
const istatistikKapatBtn = document.getElementById("istatistikKapatBtn");
const istatistikIcerik = document.getElementById("istatistikIcerik");

let istatistikKaynak = "toplam"; // "toplam" | "kisisel" | "birlikte"

function istatistikOgelerSec(kaynak) {
  const ortak = typeof ortakListem !== "undefined" ? ortakListem : [];
  if (kaynak === "kisisel") return listem.slice();
  if (kaynak === "birlikte") return ortak.slice();
  return listem.concat(ortak);
}

function istatistikHesapla(kaynak) {
  const tumu = istatistikOgelerSec(kaynak);
  const bitenler = tumu.filter((o) => o.durum === "bitirdi");
  const bitenFilm = bitenler.filter((o) => o.type === "movie").length;
  const bitenDizi = bitenler.filter((o) => o.type === "tv").length;

  // İzlenen bölüm sayısı: biten sezonların tamamı + mevcut sezonda gelinen bölüm
  let toplamBolum = 0;
  tumu.filter((o) => o.type === "tv" && o.bolumSayilari).forEach((o) => {
    for (let s = 1; s < o.sezon; s++) toplamBolum += o.bolumSayilari[s] || 0;
    toplamBolum += o.bolum || 0;
  });

  const toplamDk = bitenFilm * ISTATISTIK_ORT_FILM_DK + toplamBolum * ISTATISTIK_ORT_BOLUM_DK;
  const toplamSaat = Math.round(toplamDk / 60);

  // En aktif yıl: bitirme tarihine göre; eski kayıtlarda yoksa eklenme tarihine düşer
  const yilSayaci = {};
  bitenler.forEach((o) => {
    const yil = new Date(o.bitirmeZamani || o.eklenmeZamani || Date.now()).getFullYear();
    yilSayaci[yil] = (yilSayaci[yil] || 0) + 1;
  });
  let enAktifYil = null, enAktifSayi = 0;
  Object.entries(yilSayaci).forEach(([yil, sayi]) => {
    if (sayi > enAktifSayi) { enAktifYil = yil; enAktifSayi = sayi; }
  });

  // Puan dağılımı (10'luk): kişisel puanlar + ortak listedeki herkesin kişi bazlı puanı.
  // Dilimler: [0-3), [3-5), [5-7), [7-9), [9-10]
  const puanlar = [];
  tumu.forEach((o) => {
    const p = puanOnluk(o);
    if (p) puanlar.push(p);
    Object.values(o.degerlendirmeler || {}).forEach((d) => {
      const dp = puanOnluk(d);
      if (dp) puanlar.push(dp);
    });
  });
  const puanDagilimi = [0, 0, 0, 0, 0];
  puanlar.forEach((p) => {
    const dilim = p >= 9 ? 4 : p >= 7 ? 3 : p >= 5 ? 2 : p >= 3 ? 1 : 0;
    puanDagilimi[dilim]++;
  });
  const puanOrtalama = puanlar.length
    ? (puanlar.reduce((t, p) => t + p, 0) / puanlar.length).toFixed(1) : null;

  return { bitenler, bitenFilm, bitenDizi, toplamBolum, toplamSaat, enAktifYil, enAktifSayi,
    puanDagilimi, puanOrtalama, puanSayisi: puanlar.length };
}

/* ---- "En sevdikleriniz": tür / oyuncu / yönetmen (TMDB'den, kalıcı önbellekli) ---- */
function _istatistikMetaOku() {
  try { return JSON.parse(localStorage.getItem(ISTATISTIK_META_ANAHTARI)) || {}; }
  catch (e) { return {}; }
}
function _istatistikMetaYaz(o) {
  try { localStorage.setItem(ISTATISTIK_META_ANAHTARI, JSON.stringify(o)); } catch (e) { /* yoksay */ }
}

async function istatistikMetaGetir(o) {
  const onbellek = _istatistikMetaOku();
  if (onbellek[o.key]) return onbellek[o.key];
  try {
    const url = "https://api.themoviedb.org/3/" + o.type + "/" + o.tmdbId
      + "?api_key=" + API_KEY + "&language=tr-TR&append_to_response=credits";
    const veri = await (await fetch(url)).json();
    const turler = (veri.genres || []).map((g) => g.name);
    const oyuncular = ((veri.credits && veri.credits.cast) || []).slice(0, 5).map((c) => c.name);
    let yonetmen = null;
    if (o.type === "movie") {
      const y = ((veri.credits && veri.credits.crew) || []).find((c) => c.job === "Director");
      yonetmen = y ? y.name : null;
    } else {
      yonetmen = (veri.created_by && veri.created_by[0] && veri.created_by[0].name) || null;
    }
    const meta = { turler, oyuncular, yonetmen };
    onbellek[o.key] = meta;
    _istatistikMetaYaz(onbellek);
    return meta;
  } catch (e) {
    return { turler: [], oyuncular: [], yonetmen: null };
  }
}

function _istatistikEnCoku(sayac) {
  let enIyi = null, enSayi = 0;
  Object.entries(sayac).forEach(([ad, sayi]) => { if (sayi > enSayi) { enIyi = ad; enSayi = sayi; } });
  return enIyi ? { ad: enIyi, sayi: enSayi } : null;
}

async function istatistikEnSevdikleriHesapla(bitenler) {
  const metalar = await Promise.all(bitenler.map(istatistikMetaGetir));
  const turSayac = {}, oyuncuSayac = {}, yonetmenSayac = {};
  metalar.forEach((m) => {
    m.turler.forEach((t) => { turSayac[t] = (turSayac[t] || 0) + 1; });
    m.oyuncular.forEach((o) => { oyuncuSayac[o] = (oyuncuSayac[o] || 0) + 1; });
    if (m.yonetmen) yonetmenSayac[m.yonetmen] = (yonetmenSayac[m.yonetmen] || 0) + 1;
  });
  return {
    tur: _istatistikEnCoku(turSayac),
    oyuncu: _istatistikEnCoku(oyuncuSayac),
    yonetmen: _istatistikEnCoku(yonetmenSayac),
  };
}

/* ---- Çizim ---- */
function istatistikGovdeHTML(s) {
  const maxPuan = Math.max(1, ...s.puanDagilimi);
  const kaynakBtn = (deger, etiket) =>
    `<button class="tur-toggle-btn ${istatistikKaynak === deger ? "aktif" : ""}" data-kaynak="${deger}">${etiket}</button>`;

  return `
    <div class="istatistik-kaynak-toggle">
      ${kaynakBtn("toplam", "Toplam")}
      ${kaynakBtn("kisisel", "Kişisel")}
      ${kaynakBtn("birlikte", "Birlikte")}
    </div>
    <div class="istatistik-grid">
      <div class="istatistik-kutu"><div class="istatistik-sayi">${s.bitenFilm}</div><div class="istatistik-etiket">Bitirilen Film</div></div>
      <div class="istatistik-kutu"><div class="istatistik-sayi">${s.bitenDizi}</div><div class="istatistik-etiket">Bitirilen Dizi</div></div>
      <div class="istatistik-kutu"><div class="istatistik-sayi">${s.toplamBolum}</div><div class="istatistik-etiket">İzlenen Bölüm</div></div>
      <div class="istatistik-kutu"><div class="istatistik-sayi">~${s.toplamSaat}</div><div class="istatistik-etiket">Tahmini Saat</div></div>
    </div>
    <button class="ekleme-secenek-btn yo-istatistik-btn" data-yil-ozeti-ac>🎁 ${new Date().getFullYear()} Yıl Özeti'ni aç</button>
    ${s.enAktifYil ? `<div class="istatistik-satir">🏆 En aktif yılınız: <b>${s.enAktifYil}</b> (${s.enAktifSayi} yapım bitirdiniz)</div>` : ""}
    <div class="detay-baslik-kucuk">En Sevdikleriniz</div>
    <div id="istatistikSevdikleri" class="istatistik-satir">Hesaplanıyor...</div>
    <div class="detay-baslik-kucuk">Puan Dağılımı</div>
    ${s.puanOrtalama ? `<div class="istatistik-satir">⭐ Ortalama puan: <b>${s.puanOrtalama}</b> (${s.puanSayisi} puan)</div>` : ""}
    <div class="istatistik-puan-dagilimi">
      ${[[4, "9 – 10"], [3, "7 – 8.9"], [2, "5 – 6.9"], [1, "3 – 4.9"], [0, "0 – 2.9"]].map(([i, etiket]) => `
        <div class="istatistik-puan-satiri">
          <span class="istatistik-puan-etiket">⭐ ${etiket}</span>
          <div class="istatistik-puan-cubuk"><div class="istatistik-puan-dolu" style="width:${(s.puanDagilimi[i] / maxPuan) * 100}%"></div></div>
          <span class="istatistik-puan-sayi">${s.puanDagilimi[i]}</span>
        </div>`).join("")}
    </div>`;
}

function istatistikGoster() {
  const s = istatistikHesapla(istatistikKaynak);
  istatistikIcerik.innerHTML = istatistikGovdeHTML(s);

  const sevdiklerimEl = document.getElementById("istatistikSevdikleri");
  if (!s.bitenler.length) {
    if (sevdiklerimEl) sevdiklerimEl.innerHTML = "<span class='bilgi-soluk'>Henüz bitirilen yapım yok.</span>";
    return;
  }

  const buKaynak = istatistikKaynak;
  istatistikEnSevdikleriHesapla(s.bitenler).then((r) => {
    if (istatistikKaynak !== buKaynak) return; // kullanıcı beklerken kaynağı değiştirdiyse eski sonucu yazma
    const el = document.getElementById("istatistikSevdikleri");
    if (!el) return;
    const satirlar = [];
    if (r.tur) satirlar.push(`🎭 En sevdiğiniz tür: <b>${r.tur.ad}</b> (${r.tur.sayi} yapım)`);
    if (r.oyuncu) satirlar.push(`🎬 En çok izlediğiniz oyuncu: <b>${r.oyuncu.ad}</b> (${r.oyuncu.sayi} yapım)`);
    if (r.yonetmen) satirlar.push(`🎥 En çok izlediğiniz yönetmen: <b>${r.yonetmen.ad}</b> (${r.yonetmen.sayi} yapım)`);
    el.innerHTML = satirlar.length ? satirlar.join("<br>") : "<span class='bilgi-soluk'>Yeterli veri yok.</span>";
  });
}

function istatistikAc() {
  if (!istatistikModal) return;
  istatistikModal.style.display = "flex";
  istatistikGoster();
}

if (istatistikBtn) istatistikBtn.addEventListener("click", istatistikAc);
if (istatistikKapatBtn) istatistikKapatBtn.addEventListener("click", () => { istatistikModal.style.display = "none"; });
if (istatistikModal) {
  istatistikModal.addEventListener("click", (e) => { if (e.target === istatistikModal) istatistikModal.style.display = "none"; });
}
if (istatistikIcerik) {
  istatistikIcerik.addEventListener("click", (e) => {
    if (e.target.closest("[data-yil-ozeti-ac]")) {
      istatistikModal.style.display = "none";
      if (typeof yilOzetiAc === "function") yilOzetiAc();
      return;
    }
    const btn = e.target.closest("[data-kaynak]");
    if (!btn) return;
    istatistikKaynak = btn.dataset.kaynak;
    istatistikGoster();
  });
}
