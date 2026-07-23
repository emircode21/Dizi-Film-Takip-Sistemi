/* ---------------- ARAYÜZ KABUĞU (tema, karşılama, hero) ----------------
   Bu dosya sadece görünümü kurar; liste/veri mantığına karışmaz.
   AYARLAR (ayarlar.js) içeriğini okuyup hero ve karşılama ekranını çizer. */

/* ---- Tema (açık / koyu) ---- */
const TEMA_ANAHTARI = "tema";

function temaUygula(tema) {
  document.documentElement.dataset.tema = tema;
  const btn = document.getElementById("temaBtn");
  if (btn) {
    // Koyu temadayken güneş (aydınlatmayı öner), açıkta ay göster
    btn.textContent = tema === "koyu" ? "☀️" : "🌙";
    btn.setAttribute("aria-label", tema === "koyu" ? "Açık temaya geç" : "Koyu temaya geç");
  }
}

function temaBaslat() {
  // <head>'deki satır-içi script zaten bir tema atadı; onu esas al
  let tema = document.documentElement.dataset.tema;
  if (tema !== "acik" && tema !== "koyu") {
    const kayitli = localStorage.getItem(TEMA_ANAHTARI);
    tema = kayitli || (window.matchMedia("(prefers-color-scheme: light)").matches ? "acik" : "koyu");
  }
  temaUygula(tema);

  const btn = document.getElementById("temaBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      const yeni = document.documentElement.dataset.tema === "koyu" ? "acik" : "koyu";
      localStorage.setItem(TEMA_ANAHTARI, yeni);
      temaUygula(yeni);
    });
  }
}

/* ---- Marka / Hero ---- */
function markayiCiz() {
  // <title> ve ana ekran adı
  document.title = AYARLAR.kisiselMod ? `${markaBasligi()} · İzleme Defteri` : AYARLAR.appAdi;

  const kalp = AYARLAR.kalp || "";

  // Sidebar / üst köşedeki küçük marka
  const markaAlani = document.getElementById("marka");
  if (markaAlani) {
    markaAlani.innerHTML = `
      <span class="marka-kalp">${kalp}</span>
      <span class="marka-ad">${markaBasligi()}</span>`;
  }

  // İçerikteki büyük hero başlık
  const hero = document.getElementById("hero");
  if (hero) {
    const sayacHTML = birlikteSure()
      ? `<div class="hero-sayac" id="heroSayac">
           <div class="sayac-baslik">birlikte ${kalp}</div>
           <div class="sayac-satir">
             <div class="sayac-hucre"><span class="sayac-rakam" id="sayacGun">–</span><span class="sayac-etiket">days</span></div>
             <div class="sayac-hucre"><span class="sayac-rakam" id="sayacSaat">–</span><span class="sayac-etiket">hrs</span></div>
             <div class="sayac-hucre"><span class="sayac-rakam" id="sayacDakika">–</span><span class="sayac-etiket">mın</span></div>
             <div class="sayac-hucre"><span class="sayac-rakam" id="sayacSaniye">–</span><span class="sayac-etiket">sec</span></div>
           </div>
         </div>`
      : "";
    const sloganHTML = AYARLAR.kisiselMod && AYARLAR.slogan
      ? `<p class="hero-slogan">${AYARLAR.slogan}</p>`
      : "";
    hero.innerHTML = `
      <h1 class="hero-baslik">${markaBasligi()}</h1>
      ${sloganHTML}
      ${sayacHTML}`;
  }

  sayaciBaslat();
}

/* ---- Canlı gün/saat/dakika/saniye sayacı ---- */
let sayacZamanlayici = null;

function sayaciGuncelle() {
  const gunEl = document.getElementById("sayacGun");
  const s = birlikteSure();
  if (!gunEl || !s) {
    if (sayacZamanlayici) { clearInterval(sayacZamanlayici); sayacZamanlayici = null; }
    return;
  }
  const iki = (n) => String(n).padStart(2, "0"); // 09, 05 gibi iki haneli
  gunEl.textContent = s.gun;
  document.getElementById("sayacSaat").textContent = iki(s.saat);
  document.getElementById("sayacDakika").textContent = iki(s.dakika);
  document.getElementById("sayacSaniye").textContent = iki(s.saniye);
}

function sayaciBaslat() {
  if (sayacZamanlayici) { clearInterval(sayacZamanlayici); sayacZamanlayici = null; }
  if (!birlikteSure()) return;
  sayaciGuncelle();
  sayacZamanlayici = setInterval(sayaciGuncelle, 1000);
}

/* ---- Karşılama (welcome) ekranı ----
   İlk açılışta tam ekran zarif bir giriş; aynı oturumda tekrar gösterilmez. */
function karsilamaGoster() {
  const overlay = document.getElementById("karsilama");
  if (!overlay) return;

  // Aynı oturumda daha önce gösterildiyse hiç gösterme
  if (sessionStorage.getItem("karsilama_goruldu")) {
    overlay.remove();
    return;
  }

  const kalp = AYARLAR.kalp || "🎬";
  overlay.innerHTML = `
    <div class="karsilama-ic">
      <div class="karsilama-kalp">${kalp}</div>
      <div class="karsilama-ad">${markaBasligi()}</div>
      ${AYARLAR.kisiselMod && AYARLAR.slogan ? `<div class="karsilama-slogan">${AYARLAR.slogan}</div>` : ""}
    </div>`;
  overlay.classList.add("gorunur");

  // ~1.8 sn sonra yumuşakça kaybol
  setTimeout(() => {
    overlay.classList.add("kapaniyor");
    sessionStorage.setItem("karsilama_goruldu", "1");
    setTimeout(() => overlay.remove(), 600);
  }, 1800);
}

/* ---- Başlat ---- */
temaBaslat();
markayiCiz();
karsilamaGoster();
