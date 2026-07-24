/* ---------------- KEŞFET ANA EKRANI ----------------
   Uygulama açılınca aramadan önce görülen posterli öneri şeritleri.
   Bu dosya sadece çizim yapar; veri js/tmdb.js'ten gelir. */

// Gerçek Oscar "En İyi Film" kazananları (1934-2023), TMDB id+poster ile.
// (yil: yaygın bilinen ödül yılı; TMDB'nin release_date'i bazen festival
// tarihi olduğu için 1-2 yapımda elle düzeltildi — Ölümcül Tuzak, Nomadland.)
const OSCAR_KAZANANLARI = [
  { id: 3078, ad: "Bir Gecede Oldu", yil: "1934", poster: "/Aw0pKKswRxkFlcq5KWgliGRZcDD.jpg" },
  { id: 770, ad: "Rüzgâr Gibi Geçti", yil: "1939", poster: "/h5nPZruCCL9V5uvBHhKzcfMyT2f.jpg" },
  { id: 289, ad: "Kazablanka", yil: "1943", poster: "/lGCEKlJo2CnWydQj7aamY7s1S7Q.jpg" },
  { id: 705, ad: "Perde Açılıyor", yil: "1950", poster: "/blBzZaatPWVuWpXEnPscMA4Xp6m.jpg" },
  { id: 654, ad: "Rıhtımlar Üzerinde", yil: "1954", poster: "/v1RtJ1qR4v9nrnfoBVBl6hjTW9.jpg" },
  { id: 665, ad: "Ben Hur", yil: "1959", poster: "/m4WQ1dBIrEIHZNCoAjdpxwSKWyH.jpg" },
  { id: 947, ad: "Arabistanlı Lawrence", yil: "1962", poster: "/vObizdg0Hepg8nMBfdmVMHSQH5V.jpg" },
  { id: 15121, ad: "Neşeli Günler", yil: "1965", poster: "/fAIkPvmlIsOAChA3lQIw6dg6Oz1.jpg" },
  { id: 10633, ad: "Gecenin Sıcağında", yil: "1967", poster: "/qFpfALhprXmOAbA5upTNupZw8rq.jpg" },
  { id: 3116, ad: "Geceyarısı Kovboyu", yil: "1969", poster: "/ckklq45UxUkwgHve9xItXqXr06r.jpg" },
  { id: 238, ad: "Baba", yil: "1972", poster: "/vseIVRdN4xasYwStQIi6SI7DcEu.jpg" },
  { id: 240, ad: "Baba II", yil: "1974", poster: "/3Yaj5y25485A2YeixwayoP8ywZ0.jpg" },
  { id: 510, ad: "Guguk Kuşu", yil: "1975", poster: "/ctsV8lVuuuQqAYvv4dJuN5GYwMU.jpg" },
  { id: 1366, ad: "Rocky", yil: "1976", poster: "/oWABvAo7vWGGaFk37yUd0SKhrch.jpg" },
  { id: 703, ad: "Annie Hall", yil: "1977", poster: "/dEtjPywhDbAXYjoFfhBC4U9unU7.jpg" },
  { id: 12102, ad: "Kramer Kramer'e Karşı", yil: "1979", poster: "/3CUP5V5SWfHSK4qvkZF7lMNyugY.jpg" },
  { id: 16619, ad: "Büyük Ceza", yil: "1980", poster: "/tJVETEDAKgD3fEh88SHOvMvOQue.jpg" },
  { id: 279, ad: "Amadeus", yil: "1984", poster: "/gQRfiyfGvr1az0quaYyMram3Aqt.jpg" },
  { id: 792, ad: "Müfreze", yil: "1986", poster: "/fWvUNtKwj8t9X71oXNiQGMVXZSM.jpg" },
  { id: 380, ad: "Yağmur Adam", yil: "1988", poster: "/iTNHwO896WKkaoPtpMMS74d8VNi.jpg" },
  { id: 581, ad: "Kurtlarla Dans", yil: "1990", poster: "/hw0ZEHAaTqTxSXGVwUFX7uvanSA.jpg" },
  { id: 274, ad: "Kuzuların Sessizliği", yil: "1991", poster: "/4AoIoP6q006blFeb7vV9kKPD4En.jpg" },
  { id: 33, ad: "Affedilmeyen", yil: "1992", poster: "/l5QZ6V0TjH0BGSqG5uk4yKmzTwF.jpg" },
  { id: 424, ad: "Schindler'in Listesi", yil: "1993", poster: "/2mOH8EqumIaepdP94e0cy4Xnyg7.jpg" },
  { id: 13, ad: "Forrest Gump", yil: "1994", poster: "/Cw4hIUIAmSYfK9QfaUW5igp9La.jpg" },
  { id: 197, ad: "Cesur Yürek", yil: "1995", poster: "/h98Ml18umVRDuS9nLoJoLK7qIm8.jpg" },
  { id: 409, ad: "İngiliz Hasta", yil: "1996", poster: "/5ltGPW5P2dyi5r1tfsHFb724tfp.jpg" },
  { id: 597, ad: "Titanik", yil: "1997", poster: "/hEntfzxB8yUXIxqZY929dELjLsi.jpg" },
  { id: 1934, ad: "Aşık Shakespeare", yil: "1998", poster: "/zdW7jdzPi4J9KZR3TyY2jn3Xh5e.jpg" },
  { id: 14, ad: "Amerikan Güzeli", yil: "1999", poster: "/al7lLfyGPtzJivdcK6dl67B2Z6S.jpg" },
  { id: 98, ad: "Gladyatör", yil: "2000", poster: "/kRSCWiRPEVhUIleK1bZKMZ5uZ4p.jpg" },
  { id: 453, ad: "Akıl Oyunları", yil: "2001", poster: "/iQNRCyDdb5wxOmmkou7t5kKKZaU.jpg" },
  { id: 1574, ad: "Chicago", yil: "2002", poster: "/3ED8cWCXY9zkx77Sd0N5qMbsdDP.jpg" },
  { id: 122, ad: "Yüzüklerin Efendisi: Kralın Dönüşü", yil: "2003", poster: "/qwigzi0gOcXZRxbm488wT31t2UZ.jpg" },
  { id: 70, ad: "Milyonluk Bebek", yil: "2004", poster: "/mHvW7YiOmKB822kV29Z0jU5bk7l.jpg" },
  { id: 1640, ad: "Çarpışma", yil: "2005", poster: "/86BdPC6RDX88NC880pLidKn2LCj.jpg" },
  { id: 1422, ad: "Köstebek", yil: "2006", poster: "/8dnfEnLpLJh7dRHnkN8AfIo4mpq.jpg" },
  { id: 6977, ad: "İhtiyarlara Yer Yok", yil: "2007", poster: "/20SlBJZS0Hfjt4WeT6GTCMu7lzq.jpg" },
  { id: 12405, ad: "Milyoner", yil: "2008", poster: "/kUWM6uZXAf5oodgCOQcpnoLXFIc.jpg" },
  { id: 12162, ad: "Ölümcül Tuzak", yil: "2009", poster: "/io2dfBJhasvGbgkCX9cCGVOiA99.jpg" },
  { id: 45269, ad: "Zoraki Kral", yil: "2010", poster: "/h8JVlHCM2C4WvqM5vxvzU5YTx9I.jpg" },
  { id: 74643, ad: "Artist", yil: "2011", poster: "/e7jDSrBVQ6a5QEeA6NcYQwazwYE.jpg" },
  { id: 68734, ad: "Operasyon: Argo", yil: "2012", poster: "/1cEKmX4UFAoiZUVgAlc2CD8mFwa.jpg" },
  { id: 76203, ad: "12 Yıllık Esaret", yil: "2013", poster: "/nDULvi2x4IO82lFlXMpnJxU27pS.jpg" },
  { id: 194662, ad: "Birdman veya (Cahilliğin Umulmayan Erdemi)", yil: "2014", poster: "/ueSmUbyr36raTlRKCLCT5WmvvwG.jpg" },
  { id: 314365, ad: "Spotlight", yil: "2015", poster: "/6LIgss0b6Si4ZQgMoDtW1zgabvT.jpg" },
  { id: 376867, ad: "Ay Işığı", yil: "2016", poster: "/rs1z3Tzu7mV4hnX8pzrXP0ziLJi.jpg" },
  { id: 399055, ad: "Suyun Sesi", yil: "2017", poster: "/o0cnudVI3BL9UUbk4zHMYyaIs8V.jpg" },
  { id: 490132, ad: "Yeşil Rehber", yil: "2018", poster: "/vEzS2VOhdpBIANoEYBHRvcaeBXD.jpg" },
  { id: 496243, ad: "Parazit", yil: "2019", poster: "/nx7TmJDMkgyBc09DVo5ze52Wt3F.jpg" },
  { id: 581734, ad: "Nomadland", yil: "2020", poster: "/8Vc5EOUEIF1EUXuX9eLFf7BvN3P.jpg" },
  { id: 776503, ad: "CODA", yil: "2021", poster: "/BzVjmm8l23rPsijLiNLUzuQtyd.jpg" },
  { id: 545611, ad: "Her Şey Her Yerde Aynı Anda", yil: "2022", poster: "/vt5Fd1wouNEL7HN3TQ0PMls4auE.jpg" },
  { id: 872585, ad: "Oppenheimer", yil: "2023", poster: "/mmZi0tyPFfbcCqEsJIPxVldCPOL.jpg" },
];

// Oscar listesini detayAcTmdb/kesfetKartHTML'in beklediği TMDB arama biçimine çevirir
const OSCAR_TMDB_BICIMI = OSCAR_KAZANANLARI.map((f) => ({
  media_type: "movie",
  id: f.id,
  title: f.ad,
  release_date: f.yil + "-01-01",
  poster_path: f.poster,
  vote_average: null,
})).reverse(); // en yeni önce

// Kategori kodu → başlık (şerit + "tümü" penceresi ikisi de kullanır)
const KESFET_KATEGORI_BASLIK = {
  trend: "🔥 Bu Hafta Trend",
  vizyon: "🎬 Vizyondaki Filmler",
  oscar: "🏆 Oscar Kazananları — En İyi Film",
  begenilen: "⭐ En Beğenilenler",
  dizi: "📺 Popüler Diziler",
};

/* ---- Vizyondaki filmler bölge durumu ---- */
let kesfetVizyonBolge = "TR"; // "TR" | "GLOBAL"

/* ---- Ana çizim ---- */
async function kesfetEkraniCiz() {
  listeAlani.innerHTML = `
    <div class="kesfet-sarmal" id="kesfetSarmal">
      ${kesfetBolumIskelet("trend")}
      ${kesfetBolumIskelet("vizyon", true)}
      ${kesfetBolumIskelet("oscar")}
      ${kesfetBolumIskelet("begenilen")}
      ${kesfetBolumIskelet("dizi")}
    </div>`;

  // Oscar listesi zaten elde hazır (ağ isteği yok), hemen çiz
  kesfetSeritDoldur("kesfet-serit-oscar", OSCAR_TMDB_BICIMI);

  // Diğerleri TMDB'den; her biri bağımsız yüklensin (biri yavaşsa diğerleri beklemesin)
  trendGetir().then((liste) => kesfetSeritDoldur("kesfet-serit-trend", liste));
  vizyondakiler(kesfetVizyonBolge).then((liste) => kesfetSeritDoldur("kesfet-serit-vizyon", liste));
  topRatedGetir("movie").then((liste) => kesfetSeritDoldur("kesfet-serit-begenilen", liste));
  populerGetir("tv").then((liste) => kesfetSeritDoldur("kesfet-serit-dizi", liste));
}

function kesfetBolumIskelet(kategori, vizyonToggleMi = false) {
  const toggleHTML = vizyonToggleMi
    ? `<div class="kesfet-vizyon-toggle" data-grup="vizyon">
         <button class="tur-toggle-btn ${kesfetVizyonBolge === "TR" ? "aktif" : ""}" data-bolge="TR">Türkiye</button>
         <button class="tur-toggle-btn ${kesfetVizyonBolge === "GLOBAL" ? "aktif" : ""}" data-bolge="GLOBAL">Global</button>
       </div>`
    : "";
  return `
    <div class="kesfet-bolum">
      <div class="kesfet-bolum-ust">
        <div class="detay-baslik-kucuk kesfet-baslik-tiklanabilir" data-kesfet-baslik="${kategori}">
          ${KESFET_KATEGORI_BASLIK[kategori]} <span class="kesfet-tumunu-gor">Tümünü gör →</span>
        </div>
        ${toggleHTML}
      </div>
      <div class="kesfet-serit" id="kesfet-serit-${kategori}"><div class="bilgi">Yükleniyor...</div></div>
    </div>`;
}

function kesfetSeritDoldur(seritId, liste) {
  const el = document.getElementById(seritId);
  if (!el) return; // kullanıcı Keşfet'ten çıktıysa
  if (!liste || !liste.length) {
    el.innerHTML = "<div class='bilgi'>Şu an gösterilecek bir şey yok.</div>";
    return;
  }
  el.innerHTML = liste.map(kesfetKartHTML).join("");
}

function kesfetKartHTML(x) {
  const diziMi = x.media_type === "tv";
  const ad = diziMi ? x.name : x.title;
  const tarih = diziMi ? x.first_air_date : x.release_date;
  const yil = tarih ? tarih.slice(0, 4) : "—";
  const puan = x.vote_average ? Number(x.vote_average.toFixed(1)) : null;
  return `
    <button class="oneri-kart"
            data-kesfet-tmdb="${x.id}"
            data-kesfet-type="${x.media_type || "movie"}"
            data-kesfet-poster="${x.poster_path || ""}"
            data-kesfet-yil="${yil !== "—" ? yil : ""}"
            data-kesfet-ad="${ad.replace(/"/g, "&quot;")}">
      <img class="oneri-poster" src="${posterUrl(x.poster_path)}" alt="${ad}">
      <div class="oneri-ad">${ad}</div>
      <div class="oneri-alt">${yil}${puan ? " · ★ " + puan : ""}</div>
    </button>`;
}

/* ---- Olaylar: karta tıklama (detay aç) + vizyon bölge değişimi ---- */
document.addEventListener("click", (e) => {
  if (aktifSekme !== "kesfet") return;

  const kart = e.target.closest("[data-kesfet-tmdb]");
  if (kart) {
    const sarmal = document.getElementById("kesfetSarmal");
    if (!sarmal || !sarmal.contains(kart)) return;
    const type = kart.dataset.kesfetType;
    const ad = kart.dataset.kesfetAd;
    const yil = kart.dataset.kesfetYil;
    const tarih = yil ? yil + "-01-01" : "";
    detayAcTmdb({
      media_type: type,
      id: Number(kart.dataset.kesfetTmdb),
      poster_path: kart.dataset.kesfetPoster || null,
      name: ad, title: ad,
      first_air_date: type === "tv" ? tarih : "",
      release_date: type === "movie" ? tarih : "",
    });
    return;
  }

  const bolgeBtn = e.target.closest("[data-bolge]");
  if (bolgeBtn) {
    const yeni = bolgeBtn.dataset.bolge;
    if (yeni === kesfetVizyonBolge) return;
    kesfetVizyonBolge = yeni;
    document.querySelectorAll("[data-grup='vizyon'] [data-bolge]").forEach((b) => {
      b.classList.toggle("aktif", b.dataset.bolge === yeni);
    });
    const el = document.getElementById("kesfet-serit-vizyon");
    if (el) el.innerHTML = "<div class='bilgi'>Yükleniyor...</div>";
    vizyondakiler(kesfetVizyonBolge).then((liste) => kesfetSeritDoldur("kesfet-serit-vizyon", liste));
    return;
  }

  const baslikEl = e.target.closest("[data-kesfet-baslik]");
  if (baslikEl) {
    const sarmal = document.getElementById("kesfetSarmal");
    if (!sarmal || !sarmal.contains(baslikEl)) return;
    kesfetTumAc(baslikEl.dataset.kesfetBaslik);
  }
});

/* ================================================================
   "TÜMÜNÜ GÖR" PENCERESİ — bir bölüm başlığına tıklanınca o kategorinin
   daha geniş bir listesi (birkaç TMDB sayfası birleştirilmiş) + sıralama.
   ================================================================ */
const kesfetTumModal = document.getElementById("kesfetTumModal");
const kesfetTumKapatBtn = document.getElementById("kesfetTumKapatBtn");
const kesfetTumBaslik = document.getElementById("kesfetTumBaslik");
const kesfetTumSiralaSecici = document.getElementById("kesfetTumSiralaSecici");
const kesfetTumGrid = document.getElementById("kesfetTumGrid");

let kesfetTumKategori = null;
let kesfetTumVeri = [];      // o an açık kategorinin ham (normalize) listesi
let kesfetTumSiraMod = null;

// Oscar filmlerinin ödül kazanma sayısı (filmId → sayı); "en çok ödül" sıralaması için lazy hesaplanır
const kesfetOscarOdulOnbellek = {};
let kesfetOscarOdulHesaplaniyor = false;

async function kesfetTumAc(kategori) {
  kesfetTumKategori = kategori;
  kesfetTumBaslik.textContent = KESFET_KATEGORI_BASLIK[kategori] || "";
  kesfetTumSiraSeciciDoldur(kategori);
  kesfetTumGrid.innerHTML = "<div class='bilgi'>Yükleniyor...</div>";
  kesfetTumModal.style.display = "flex";
  const mk = kesfetTumModal.querySelector(".modal-kutu");
  if (mk) mk.scrollTop = 0;

  const veri = await kesfetTumVeriGetir(kategori);
  if (kesfetTumKategori !== kategori) return; // kullanıcı beklerken başka kategori açtı
  kesfetTumVeri = veri;
  kesfetTumCiz();
}

function kesfetTumSiraSeciciDoldur(kategori) {
  if (kategori === "oscar") {
    kesfetTumSiraMod = "tarih-yeni";
    kesfetTumSiralaSecici.innerHTML = `
      <option value="tarih-yeni">Tarihsel (Yeni → Eski)</option>
      <option value="tarih-eski">Tarihsel (Eski → Yeni)</option>
      <option value="odul">En çok ödül alandan aza</option>`;
  } else {
    kesfetTumSiraMod = "puan";
    kesfetTumSiralaSecici.innerHTML = `
      <option value="puan">Puana göre (Yüksek → Düşük)</option>
      <option value="yeni">Yıla göre (Yeni → Eski)</option>
      <option value="eski">Yıla göre (Eski → Yeni)</option>`;
  }
  kesfetTumSiralaSecici.value = kesfetTumSiraMod;
}

async function kesfetTumVeriGetir(kategori) {
  if (kategori === "oscar") return OSCAR_TMDB_BICIMI.slice();
  if (kategori === "trend") return trendTumGetir();
  if (kategori === "vizyon") return vizyondakilerTum(kesfetVizyonBolge);
  if (kategori === "begenilen") return topRatedTumGetir("movie");
  if (kategori === "dizi") return populerTumGetir("tv");
  return [];
}

function _kesfetYil(x) {
  const t = x.media_type === "tv" ? x.first_air_date : x.release_date;
  return t ? Number(t.slice(0, 4)) : 0;
}

function kesfetTumCiz() {
  let liste = kesfetTumVeri.slice();

  if (kesfetTumKategori === "oscar") {
    if (kesfetTumSiraMod === "tarih-yeni") liste.sort((a, b) => _kesfetYil(b) - _kesfetYil(a));
    else if (kesfetTumSiraMod === "tarih-eski") liste.sort((a, b) => _kesfetYil(a) - _kesfetYil(b));
    else if (kesfetTumSiraMod === "odul") liste.sort((a, b) => (kesfetOscarOdulOnbellek[b.id] || 0) - (kesfetOscarOdulOnbellek[a.id] || 0));
  } else {
    if (kesfetTumSiraMod === "puan") liste.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    else if (kesfetTumSiraMod === "yeni") liste.sort((a, b) => _kesfetYil(b) - _kesfetYil(a));
    else if (kesfetTumSiraMod === "eski") liste.sort((a, b) => _kesfetYil(a) - _kesfetYil(b));
  }

  if (!liste.length) {
    kesfetTumGrid.innerHTML = "<div class='bilgi'>Gösterilecek bir şey yok.</div>";
    return;
  }
  kesfetTumGrid.innerHTML = liste.map(kesfetTumKartHTML).join("");
}

function kesfetTumKartHTML(x) {
  const diziMi = x.media_type === "tv";
  const ad = diziMi ? x.name : x.title;
  const tarih = diziMi ? x.first_air_date : x.release_date;
  const yil = tarih ? tarih.slice(0, 4) : "—";
  const puan = x.vote_average ? Number(x.vote_average.toFixed(1)) : null;
  const odulSayisi = kesfetTumKategori === "oscar" ? kesfetOscarOdulOnbellek[x.id] : undefined;
  const altMetin = (kesfetTumSiraMod === "odul" && odulSayisi !== undefined)
    ? `${yil} · 🏆 ${odulSayisi} ödül`
    : `${yil}${puan ? " · ★ " + puan : ""}`;
  return `
    <button class="kisi-yapim"
            data-kesfet-tumkart
            data-kesfet-tmdb="${x.id}"
            data-kesfet-type="${x.media_type || "movie"}"
            data-kesfet-poster="${x.poster_path || ""}"
            data-kesfet-yil="${yil !== "—" ? yil : ""}"
            data-kesfet-ad="${ad.replace(/"/g, "&quot;")}">
      <img class="kisi-yapim-poster" src="${posterUrl(x.poster_path)}" alt="${ad}">
      <div class="kisi-yapim-ad">${ad}</div>
      <div class="kisi-yapim-alt">${altMetin}</div>
    </button>`;
}

// "En çok ödül alandan aza" seçilince gereken 54 OMDb sorgusu (tek seferlik, sonra önbellekten)
async function kesfetOscarOdulleriHazirla() {
  if (kesfetOscarOdulHesaplaniyor) return;
  const eksikler = OSCAR_KAZANANLARI.filter((f) => kesfetOscarOdulOnbellek[f.id] === undefined);
  if (!eksikler.length) return;
  kesfetOscarOdulHesaplaniyor = true;
  kesfetTumGrid.innerHTML = "<div class='bilgi'>Ödül sayıları hesaplanıyor (yalnızca ilk seferde)...</div>";
  await Promise.all(eksikler.map(async (f) => {
    kesfetOscarOdulOnbellek[f.id] = await oscarFilmOdulSayisiGetir(f.id);
  }));
  kesfetOscarOdulHesaplaniyor = false;
}

kesfetTumSiralaSecici.addEventListener("change", async () => {
  kesfetTumSiraMod = kesfetTumSiralaSecici.value;
  if (kesfetTumKategori === "oscar" && kesfetTumSiraMod === "odul") {
    await kesfetOscarOdulleriHazirla();
  }
  kesfetTumCiz();
});

kesfetTumGrid.addEventListener("click", (e) => {
  const kart = e.target.closest("[data-kesfet-tumkart]");
  if (!kart) return;
  const type = kart.dataset.kesfetType;
  const ad = kart.dataset.kesfetAd;
  const yil = kart.dataset.kesfetYil;
  const tarih = yil ? yil + "-01-01" : "";
  kesfetTumModal.style.display = "none";
  detayAcTmdb({
    media_type: type,
    id: Number(kart.dataset.kesfetTmdb),
    poster_path: kart.dataset.kesfetPoster || null,
    name: ad, title: ad,
    first_air_date: type === "tv" ? tarih : "",
    release_date: type === "movie" ? tarih : "",
  });
  detayDonusAyarla(() => { kesfetTumModal.style.display = "flex"; });
});

function kesfetTumKapat() {
  kesfetTumModal.style.display = "none";
  kesfetTumKategori = null;
}

kesfetTumKapatBtn.addEventListener("click", kesfetTumKapat);
kesfetTumModal.addEventListener("click", (e) => { if (e.target === kesfetTumModal) kesfetTumKapat(); });
