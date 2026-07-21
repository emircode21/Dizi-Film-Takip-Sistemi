const kutu = document.getElementById("arama");
const sonucAlani = document.getElementById("sonuclar");
const sonucBaslik = document.getElementById("sonuc-baslik");
const listeAlani = document.getElementById("listem");

let zamanlayici;
let sonSonuclar = [];

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

    // Bu öğe zaten listemde mi? Öyleyse "+" yerine "Eklendi" göster
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


/* ---------------- LİSTEYE EKLE / ÇİZ / SİL ---------------- */
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
  };

  if (diziMi) {
    // Dizilerde bölüm takibi 1. sezon, 1. bölümden başlar
    yeniOge.sezon = 1;
    yeniOge.bolum = 1;
    yeniOge.sezonSayisi = await sezonSayisiGetir(x.id);
    yeniOge.bolumSayilari = {}; // her sezonun kaç bölüm olduğunu burada saklıyoruz (önbellek)
    yeniOge.bolumSayilari[1] = await bolumSayisiGetir(x.id, 1);
  }

  listem.push(yeniOge);

  kaydet();
  listeyiCiz();
  // Arama sonuçları açıksa, oradaki "+" artık "Eklendi" olsun diye yeniden çiz
  if (sonSonuclar.length) goster(sonSonuclar);
}

function listeyiCiz() {
  if (listem.length === 0) {
    listeAlani.innerHTML = "<div class='bos'>Henüz bir şey eklemedin. Yukarıdan ara ve + ile ekle.</div>";
    return;
  }

  listeAlani.innerHTML = listem.map((o) => {
    const diziMi = o.type === "tv";

    // Dizi ise bölüm bilgisi + "Sonraki Bölüm" butonu göster
    // (Bölüm takibi özelliğinden önce eklenmiş eski dizilerde bu bilgiler henüz yok)
    let bolumSatiri = "";
    if (diziMi && o.bolumSayilari) {
      bolumSatiri = `
        <div class="ilerleme">
          <span class="bolum-etiket">S${o.sezon} • B${o.bolum}</span>
          <button class="sonraki-btn" data-sonraki="${o.key}" ${sonBolumMu(o) ? "disabled" : ""}>
            ${sonBolumMu(o) ? "Bitti ✓" : "Sonraki Bölüm ▶"}
          </button>
        </div>`;
    } else if (diziMi) {
      bolumSatiri = `
        <div class="ilerleme">
          <button class="sonraki-btn" data-baslat="${o.key}">Bölüm takibini başlat</button>
        </div>`;
    }

    return `
      <div class="kart">
        <img src="${posterUrl(o.poster)}" alt="">
        <div class="orta">
          <div class="baslik">${o.ad}</div>
          <div class="alt">${o.yil}</div>
          <span class="rozet ${diziMi ? "dizi" : "film"}">${diziMi ? "Dizi" : "Film"}</span>
          ${bolumSatiri}
        </div>
        <button class="sil-btn" data-sil="${o.key}">Kaldır</button>
      </div>`;
  }).join("");
}

// Dizi son sezonun son bölümüne mi geldi?
function sonBolumMu(o) {
  if (!o.bolumSayilari) return false;
  const buSezonBolumSayisi = o.bolumSayilari[o.sezon];
  return o.sezon >= o.sezonSayisi && o.bolum >= buSezonBolumSayisi;
}

// Bölüm takibi olmadan eklenmiş eski bir diziye sonradan bölüm takibi ekler
async function bolumTakibiBaslat(key) {
  const o = listem.find((x) => x.key === key);
  if (!o || o.bolumSayilari) return;

  // Çok eski kayıtlarda tmdbId alanı yoktu, key'den ("tv-1396" gibi) çıkarıyoruz
  if (!o.tmdbId) o.tmdbId = Number(o.key.split("-")[1]);

  o.sezon = 1;
  o.bolum = 1;
  o.sezonSayisi = await sezonSayisiGetir(o.tmdbId);
  o.bolumSayilari = {};
  o.bolumSayilari[1] = await bolumSayisiGetir(o.tmdbId, 1);

  kaydet();
  listeyiCiz();
}

listeAlani.addEventListener("click", async (e) => {
  const baslatBtn = e.target.closest("[data-baslat]");
  if (baslatBtn) {
    await bolumTakibiBaslat(baslatBtn.dataset.baslat);
    return;
  }

  const silBtn = e.target.closest("[data-sil]");
  if (silBtn) {
    listem = listem.filter((o) => o.key !== silBtn.dataset.sil);
    kaydet();
    listeyiCiz();
    // Listeden çıkanın arama sonucundaki hali tekrar "+" olsun
    if (sonSonuclar.length) goster(sonSonuclar);
    return;
  }

  const sonrakiBtn = e.target.closest("[data-sonraki]");
  if (sonrakiBtn) {
    await sonrakiBolume(sonrakiBtn.dataset.sonraki);
  }
});

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
      o.bolumSayilari[o.sezon] = await bolumSayisiGetir(o.tmdbId, o.sezon);
    }
  }

  kaydet();
  listeyiCiz();
}
