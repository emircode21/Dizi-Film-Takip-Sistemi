/* ---------------- YIL ÖZETİ + BİRLİKTE KARNESİ ----------------
   Seçilen yılda bitirilen yapımlardan (kişisel + Birlikte) hikâye gibi
   sayfa sayfa ilerleyen bir özet. Tarih olarak bitirmeZamani kullanılır;
   Ağustos 2026 öncesi kayıtlarda o yoksa eklenme tarihine düşülür.
   Birlikte Karnesi, ortak listedeki kişi bazlı puanlardan (degerlendirmeler)
   hesaplanır. Ek veri isteği yok; tür/oyuncu için istatistik.js'in
   önbellekli TMDB çağrısı yeniden kullanılır. */

const yilOzetiModal = document.getElementById("yilOzetiModal");
const yilOzetiIcerik = document.getElementById("yilOzetiIcerik");
const yilOzetiKapatBtn = document.getElementById("yilOzetiKapatBtn");

const YIL_OZETI_AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const YIL_OZETI_VARSAYILAN_BOLUM = 10; // bölüm sayısı bilinmeyen dizi için tahmin

let yilOzetiYil = new Date().getFullYear();
let yilOzetiSayfa = 0;
let yilOzetiVeri = null;
let yilOzetiSevdikleri = null; // async gelen tür/oyuncu/yönetmen

function _yoOrtak() { return typeof ortakListem !== "undefined" ? ortakListem : []; }
function _yoTarih(o) { return o.bitirmeZamani || o.eklenmeZamani || null; }

function yilOzetiYillar() {
  const yillar = new Set([new Date().getFullYear()]);
  listem.concat(_yoOrtak()).forEach((o) => {
    if (o.durum === "bitirdi" && _yoTarih(o)) yillar.add(new Date(_yoTarih(o)).getFullYear());
  });
  return Array.from(yillar).sort((a, b) => b - a);
}

// Bir yapımın tek puanı: ortakta iki kişinin ortalaması, kişiselde kendi puanı
function _yoPuan(o) {
  const d = Object.values(o.degerlendirmeler || {}).map(puanOnluk).filter((p) => p);
  if (d.length) return d.reduce((t, p) => t + p, 0) / d.length;
  return puanOnluk(o);
}

function yilOzetiHesapla(yil) {
  const yildaMi = (o) => o.durum === "bitirdi" && _yoTarih(o)
    && new Date(_yoTarih(o)).getFullYear() === yil;
  const kisisel = listem.filter(yildaMi);
  const birlikte = _yoOrtak().filter(yildaMi);
  const tumu = kisisel.concat(birlikte)
    .sort((a, b) => _yoTarih(a) - _yoTarih(b));

  const film = tumu.filter((o) => o.type === "movie").length;
  const dizi = tumu.length - film;
  let bolum = 0;
  tumu.filter((o) => o.type === "tv").forEach((o) => {
    const toplam = Object.values(o.bolumSayilari || {}).reduce((t, n) => t + (n || 0), 0);
    bolum += toplam || YIL_OZETI_VARSAYILAN_BOLUM;
  });
  const saat = Math.round((film * ISTATISTIK_ORT_FILM_DK + bolum * ISTATISTIK_ORT_BOLUM_DK) / 60);

  const aylar = new Array(12).fill(0);
  tumu.forEach((o) => { aylar[new Date(_yoTarih(o)).getMonth()]++; });
  const enYogunAyNo = aylar.indexOf(Math.max(...aylar));

  const puanlilar = tumu
    .map((o) => ({ o, puan: _yoPuan(o) }))
    .filter((x) => x.puan)
    .sort((a, b) => b.puan - a.puan);

  // Birlikte Karnesi: iki kişinin de puan verdiği ortak yapımlar
  const ciftler = birlikte
    .map((o) => {
      const d = o.degerlendirmeler || {};
      return { o, p1: puanOnluk(d.kisi1), p2: puanOnluk(d.kisi2) };
    })
    .filter((x) => x.p1 && x.p2);
  let karne = null;
  if (ciftler.length) {
    const ort = (dizi) => dizi.reduce((t, n) => t + n, 0) / dizi.length;
    const farkli = ciftler.slice().sort((a, b) => Math.abs(b.p1 - b.p2) - Math.abs(a.p1 - a.p2));
    karne = {
      sayi: ciftler.length,
      ort1: ort(ciftler.map((x) => x.p1)),
      ort2: ort(ciftler.map((x) => x.p2)),
      uyum: ort(ciftler.map((x) => 10 - Math.abs(x.p1 - x.p2))) * 10, // % benzerlik
      enAyrik: farkli[0],
      enUyumlu: farkli[farkli.length - 1],
    };
  }

  return {
    yil, tumu, kisisel, birlikte, film, dizi, bolum, saat, aylar, enYogunAyNo, puanlilar, karne,
    ilk: tumu[0] || null, son: tumu[tumu.length - 1] || null,
  };
}

/* ---- Sayfalar ---- */
function _yoPoster(o, buyuk) {
  return `<img class="yo-poster ${buyuk ? "yo-poster-buyuk" : ""}" src="${posterUrl(o.poster)}" alt="">`;
}
function _yoIsim(kim) { return kim === "kisi1" ? AYARLAR.isim1 : AYARLAR.isim2; }

function yilOzetiSayfalar(v) {
  const sayfalar = [];
  const biz = AYARLAR.kisiselMod ? markaBasligi() : "Senin";

  sayfalar.push(`
    <div class="yo-ust-etiket">Yıl Özeti</div>
    <div class="yo-dev-yil">${v.yil}</div>
    <div class="yo-baslik">${AYARLAR.kisiselMod ? biz + "'nin yılı" : "Bir yılın hikâyesi"}</div>
    <div class="yo-yil-secici">
      ${yilOzetiYillar().map((y) =>
        `<button class="tur-toggle-btn ${y === v.yil ? "aktif" : ""}" data-yo-yil="${y}">${y}</button>`).join("")}
    </div>
    <p class="yo-alt">${v.tumu.length ? "Hazırsan ileri dokun ›" : "Bu yıl henüz bitirilen yapım yok."}</p>`);

  if (!v.tumu.length) return sayfalar;

  sayfalar.push(`
    <div class="yo-ust-etiket">Bu yıl</div>
    <div class="yo-dev-sayi">${v.tumu.length}</div>
    <div class="yo-baslik">yapım bitirdiniz</div>
    <div class="istatistik-grid">
      <div class="istatistik-kutu"><div class="istatistik-sayi">${v.film}</div><div class="istatistik-etiket">Film</div></div>
      <div class="istatistik-kutu"><div class="istatistik-sayi">${v.dizi}</div><div class="istatistik-etiket">Dizi</div></div>
      <div class="istatistik-kutu"><div class="istatistik-sayi">~${v.saat}</div><div class="istatistik-etiket">Saat</div></div>
      <div class="istatistik-kutu"><div class="istatistik-sayi">${v.birlikte.length}</div><div class="istatistik-etiket">Birlikte</div></div>
    </div>
    <p class="yo-alt">${v.saat >= 24 ? `Yani aşağı yukarı <b>${Math.round(v.saat / 24)} gün</b> ekran başındaydınız 🍿` : "Süreler ortalamaya göre tahmini."}</p>`);

  const maxAy = Math.max(1, ...v.aylar);
  sayfalar.push(`
    <div class="yo-ust-etiket">Zaman çizelgesi</div>
    <div class="yo-baslik">En yoğun ayınız <b>${YIL_OZETI_AYLAR[v.enYogunAyNo]}</b></div>
    <div class="yo-aylar">
      ${v.aylar.map((n, i) => `
        <div class="yo-ay ${i === v.enYogunAyNo ? "yo-ay-zirve" : ""}">
          <div class="yo-ay-cubuk"><div style="height:${(n / maxAy) * 100}%"></div></div>
          <span>${YIL_OZETI_AYLAR[i].slice(0, 3)}</span>
        </div>`).join("")}
    </div>
    <div class="yo-ilk-son">
      <div>${_yoPoster(v.ilk)}<div class="yo-kucuk">Yılı açan</div><div class="yo-ad">${v.ilk.ad}</div></div>
      ${v.son !== v.ilk ? `<div>${_yoPoster(v.son)}<div class="yo-kucuk">Son biten</div><div class="yo-ad">${v.son.ad}</div></div>` : ""}
    </div>`);

  sayfalar.push(`
    <div class="yo-ust-etiket">Zevkiniz</div>
    <div class="yo-baslik">Bu yıl en çok neyi sevdiniz?</div>
    <div id="yoSevdikleri" class="yo-sevdikleri">${yilOzetiSevdikleriHTML()}</div>`);

  if (v.puanlilar.length) {
    const [bir, ...kalan] = v.puanlilar.slice(0, 3);
    sayfalar.push(`
      <div class="yo-ust-etiket">Yılın zirvesi</div>
      ${_yoPoster(bir.o, true)}
      <div class="yo-baslik">${bir.o.ad}</div>
      <div class="yo-puan">⭐ ${bir.puan.toFixed(1)}</div>
      ${kalan.length ? `<div class="yo-siralama">
        ${kalan.map((x, i) => `<div class="yo-siralama-satir"><span>${i + 2}.</span>${_yoPoster(x.o)}<span class="yo-ad">${x.o.ad}</span><b>${x.puan.toFixed(1)}</b></div>`).join("")}
      </div>` : ""}`);
  }

  if (AYARLAR.kisiselMod && v.karne) {
    const k = v.karne;
    const comert = Math.abs(k.ort1 - k.ort2) < 0.15 ? null : (k.ort1 > k.ort2 ? "kisi1" : "kisi2");
    sayfalar.push(`
      <div class="yo-ust-etiket">Birlikte Karnesi</div>
      <div class="yo-dev-sayi">%${Math.round(k.uyum)}</div>
      <div class="yo-baslik">zevk uyumu</div>
      <div class="yo-karne-kisiler">
        <div><div class="yo-kucuk">${AYARLAR.isim1}</div><div class="yo-puan">⭐ ${k.ort1.toFixed(1)}</div></div>
        <div><div class="yo-kucuk">${AYARLAR.isim2}</div><div class="yo-puan">⭐ ${k.ort2.toFixed(1)}</div></div>
      </div>
      <p class="yo-alt">${comert ? `Daha cömert puan veren: <b>${_yoIsim(comert)}</b> 😄` : "Puanlarınız neredeyse aynı, tam bir ikili!"}</p>
      <div class="yo-karne-satir">🤝 En çok anlaştığınız: <b>${k.enUyumlu.o.ad}</b>
        (${k.enUyumlu.p1.toFixed(1)} / ${k.enUyumlu.p2.toFixed(1)})</div>
      ${k.sayi > 1 ? `<div class="yo-karne-satir">⚔️ En çok tartıştığınız: <b>${k.enAyrik.o.ad}</b>
        (${k.enAyrik.p1.toFixed(1)} / ${k.enAyrik.p2.toFixed(1)})</div>` : ""}
      <p class="yo-kucuk">${k.sayi} ortak yapımda ikinizin de puanına göre</p>`);
  }

  sayfalar.push(`
    <div class="yo-ust-etiket">${v.yil}</div>
    <div class="yo-dev-kalp">${AYARLAR.kalp || "🎬"}</div>
    <div class="yo-baslik">${AYARLAR.kisiselMod ? "Nice yıllara, birlikte nice yapımlara" : "Nice yapımlara"}</div>
    <p class="yo-alt">${v.birlikte.length ? `${v.birlikte.length} yapımı birlikte bitirdiniz.` : ""}</p>
    <div class="ekleme-secenekler">
      <button class="ekleme-secenek-btn" data-yo-basa>↺ Baştan izle</button>
      <button class="ekleme-secenek-btn" data-yo-istatistik>📊 Tüm istatistikler</button>
    </div>`);

  return sayfalar;
}

function yilOzetiSevdikleriHTML() {
  const r = yilOzetiSevdikleri;
  if (!r) return "<span class='bilgi-soluk'>Hesaplanıyor...</span>";
  const satirlar = [];
  if (r.tur) satirlar.push(`<div class="yo-sevgi"><span>🎭</span><div><div class="yo-kucuk">Tür</div><b>${r.tur.ad}</b></div></div>`);
  if (r.oyuncu) satirlar.push(`<div class="yo-sevgi"><span>🎬</span><div><div class="yo-kucuk">Oyuncu</div><b>${r.oyuncu.ad}</b> · ${r.oyuncu.sayi} yapım</div></div>`);
  if (r.yonetmen) satirlar.push(`<div class="yo-sevgi"><span>🎥</span><div><div class="yo-kucuk">Yönetmen / yaratıcı</div><b>${r.yonetmen.ad}</b></div></div>`);
  return satirlar.length ? satirlar.join("") : "<span class='bilgi-soluk'>Yeterli veri yok.</span>";
}

/* ---- Çizim / gezinme ---- */
function yilOzetiCiz() {
  const sayfalar = yilOzetiSayfalar(yilOzetiVeri);
  yilOzetiSayfa = Math.max(0, Math.min(yilOzetiSayfa, sayfalar.length - 1));
  yilOzetiIcerik.innerHTML = `
    <div class="yo-noktalar">
      ${sayfalar.map((_, i) => `<span class="${i <= yilOzetiSayfa ? "dolu" : ""}"></span>`).join("")}
    </div>
    <div class="yo-sayfa" data-yo-dokun>${sayfalar[yilOzetiSayfa]}</div>
    <div class="yo-gezinme">
      <button class="ekleme-secenek-btn" data-yo-geri ${yilOzetiSayfa === 0 ? "disabled" : ""}>‹ Geri</button>
      <button class="ekleme-secenek-btn" data-yo-ileri ${yilOzetiSayfa === sayfalar.length - 1 ? "disabled" : ""}>İleri ›</button>
    </div>`;
}

function yilOzetiYukle(yil) {
  yilOzetiYil = yil;
  yilOzetiVeri = yilOzetiHesapla(yil);
  yilOzetiSevdikleri = null;
  yilOzetiCiz();
  if (yilOzetiVeri.tumu.length && typeof istatistikEnSevdikleriHesapla === "function") {
    istatistikEnSevdikleriHesapla(yilOzetiVeri.tumu).then((r) => {
      if (yilOzetiYil !== yil) return; // beklerken yıl değiştiyse yazma
      yilOzetiSevdikleri = r;
      const el = document.getElementById("yoSevdikleri");
      if (el) el.innerHTML = yilOzetiSevdikleriHTML();
    });
  }
}

function yilOzetiAc(yil) {
  if (!yilOzetiModal) return;
  yilOzetiSayfa = 0;
  yilOzetiModal.style.display = "flex";
  yilOzetiYukle(yil || new Date().getFullYear());
}

function yilOzetiKapat() { if (yilOzetiModal) yilOzetiModal.style.display = "none"; }

function _yoGit(fark) {
  yilOzetiSayfa += fark;
  yilOzetiCiz();
}

if (yilOzetiKapatBtn) yilOzetiKapatBtn.addEventListener("click", yilOzetiKapat);
if (yilOzetiModal) {
  yilOzetiModal.addEventListener("click", (e) => {
    if (e.target === yilOzetiModal) { yilOzetiKapat(); return; }
    const yilBtn = e.target.closest("[data-yo-yil]");
    if (yilBtn) { yilOzetiYukle(Number(yilBtn.dataset.yoYil)); return; }
    if (e.target.closest("[data-yo-ileri]")) { _yoGit(1); return; }
    if (e.target.closest("[data-yo-geri]")) { _yoGit(-1); return; }
    if (e.target.closest("[data-yo-basa]")) { yilOzetiSayfa = 0; yilOzetiCiz(); return; }
    if (e.target.closest("[data-yo-istatistik]")) {
      yilOzetiKapat();
      if (typeof istatistikAc === "function") istatistikAc();
      return;
    }
    // Hikâye gibi: sayfanın sol üçte birine dokunmak geri, gerisi ileri
    const alan = e.target.closest("[data-yo-dokun]");
    if (alan && !e.target.closest("button")) {
      const kutu = alan.getBoundingClientRect();
      const sayfaSayisi = yilOzetiSayfalar(yilOzetiVeri).length;
      if (e.clientX - kutu.left < kutu.width / 3) { if (yilOzetiSayfa > 0) _yoGit(-1); }
      else if (yilOzetiSayfa < sayfaSayisi - 1) _yoGit(1);
    }
  });
}
