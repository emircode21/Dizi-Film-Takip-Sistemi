/* ---------------- DETAY MODALI ---------------- */

const detayModal = document.getElementById("detayModal");
const detayKapatBtn = document.getElementById("detayKapatBtn");
const detayPoster = document.getElementById("detayPoster");
const detayBaslik = document.getElementById("detayBaslik");
const detayYil = document.getElementById("detayYil");
const detayRozet = document.getElementById("detayRozet");
const detayOzet = document.getElementById("detayOzet");
const detaySezonAlani = document.getElementById("detaySezonAlani");
const detaySezonSecici = document.getElementById("detaySezonSecici");
const detayBolumSecici = document.getElementById("detayBolumSecici");
const detayKaydetBtn = document.getElementById("detayKaydetBtn");
const detayKalanBilgi = document.getElementById("detayKalanBilgi");
const detayBolumListesi = document.getElementById("detayBolumListesi");

let acikOgeKey = null;

async function detayAc(key) {
  const o = listem.find((x) => x.key === key);
  if (!o) return;

  acikOgeKey = key;
  const diziMi = o.type === "tv";

  detayPoster.src = posterUrl(o.poster);
  detayBaslik.textContent = o.ad;
  detayYil.textContent = o.yil;
  detayRozet.textContent = diziMi ? "Dizi" : "Film";
  detayRozet.className = "rozet " + (diziMi ? "dizi" : "film");
  detayOzet.textContent = "Yükleniyor...";
  detayModal.style.display = "flex";

  const ozet = diziMi ? await diziOzetiGetir(o.tmdbId) : await filmOzetiGetir(o.tmdbId);
  detayOzet.textContent = ozet || "Özet bulunamadı.";

  // Modal açık kaldıysa (kullanıcı beklerken kapatmadıysa) devam et
  if (acikOgeKey !== key) return;

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
    kaydet();
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
  const o = listem.find((x) => x.key === acikOgeKey);
  if (!o) return;
  await detayBolumleriCiz(o, Number(detaySezonSecici.value));
  detayBolumSecici.value = "1";
});

detayKaydetBtn.addEventListener("click", async () => {
  const o = listem.find((x) => x.key === acikOgeKey);
  if (!o) return;

  o.sezon = Number(detaySezonSecici.value);
  o.bolum = Number(detayBolumSecici.value);

  if (sonBolumMu(o)) o.durum = "bitirdi";
  else if (o.durum === "izlemek_istiyor") o.durum = "izliyor";

  kaydet();
  listeyiCiz();
  await detayBolumleriCiz(o, o.sezon);
});
