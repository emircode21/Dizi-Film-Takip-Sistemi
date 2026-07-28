/* ---------------- İSTATİSTİKLER ----------------
   Kişisel + Birlikte listelerinden istemci tarafında hesaplanır, ağ isteği yok. */

// ponytail: gerçek film/bölüm süresini TMDB'den çekmek her öğe için ayrı istek
// gerektirir; onun yerine ortalama sabitlerle "tahmini" saat hesaplanıyor.
const ISTATISTIK_ORT_FILM_DK = 110;
const ISTATISTIK_ORT_BOLUM_DK = 45;

const istatistikModal = document.getElementById("istatistikModal");
const istatistikKapatBtn = document.getElementById("istatistikKapatBtn");
const istatistikIcerik = document.getElementById("istatistikIcerik");

function istatistikTumOgeler() {
  const ortak = typeof ortakListem !== "undefined" ? ortakListem : [];
  return listem.concat(ortak);
}

function istatistikHesapla() {
  const tumu = istatistikTumOgeler();
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

  // En aktif yıl: bitirilen yapımların eklenme tarihine göre (gerçek "bitirme tarihi" tutulmuyor)
  const yilSayaci = {};
  bitenler.forEach((o) => {
    const yil = new Date(o.eklenmeZamani || Date.now()).getFullYear();
    yilSayaci[yil] = (yilSayaci[yil] || 0) + 1;
  });
  let enAktifYil = null, enAktifSayi = 0;
  Object.entries(yilSayaci).forEach(([yil, sayi]) => {
    if (sayi > enAktifSayi) { enAktifYil = yil; enAktifSayi = sayi; }
  });

  const puanDagilimi = [0, 0, 0, 0, 0];
  tumu.forEach((o) => { if (o.puan >= 1 && o.puan <= 5) puanDagilimi[o.puan - 1]++; });

  return { bitenFilm, bitenDizi, toplamBolum, toplamSaat, enAktifYil, enAktifSayi, puanDagilimi };
}

function istatistikAc() {
  if (!istatistikModal) return;
  const s = istatistikHesapla();
  const maxPuan = Math.max(1, ...s.puanDagilimi);

  istatistikIcerik.innerHTML = `
    <div class="istatistik-grid">
      <div class="istatistik-kutu"><div class="istatistik-sayi">${s.bitenFilm}</div><div class="istatistik-etiket">Bitirilen Film</div></div>
      <div class="istatistik-kutu"><div class="istatistik-sayi">${s.bitenDizi}</div><div class="istatistik-etiket">Bitirilen Dizi</div></div>
      <div class="istatistik-kutu"><div class="istatistik-sayi">${s.toplamBolum}</div><div class="istatistik-etiket">İzlenen Bölüm</div></div>
      <div class="istatistik-kutu"><div class="istatistik-sayi">~${s.toplamSaat}</div><div class="istatistik-etiket">Tahmini Saat</div></div>
    </div>
    ${s.enAktifYil ? `<div class="istatistik-satir">🏆 En aktif yılınız: <b>${s.enAktifYil}</b> (${s.enAktifSayi} yapım bitirdiniz)</div>` : ""}
    <div class="detay-baslik-kucuk">Puan Dağılımı</div>
    <div class="istatistik-puan-dagilimi">
      ${[5, 4, 3, 2, 1].map((y) => `
        <div class="istatistik-puan-satiri">
          <span class="istatistik-puan-etiket">${"★".repeat(y)}</span>
          <div class="istatistik-puan-cubuk"><div class="istatistik-puan-dolu" style="width:${(s.puanDagilimi[y - 1] / maxPuan) * 100}%"></div></div>
          <span class="istatistik-puan-sayi">${s.puanDagilimi[y - 1]}</span>
        </div>`).join("")}
    </div>`;
  istatistikModal.style.display = "flex";
}

if (istatistikKapatBtn) istatistikKapatBtn.addEventListener("click", () => { istatistikModal.style.display = "none"; });
if (istatistikModal) {
  istatistikModal.addEventListener("click", (e) => { if (e.target === istatistikModal) istatistikModal.style.display = "none"; });
}
