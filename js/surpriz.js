/* ---------------- SÜRPRİZ SEÇİCİ: "Bu akşam ne izlesek?" ----------------
   İki mod:
   - Liste: kişisel "İstek Listesi" + ortak listedeki yapımlardan rastgele.
   - Keşfet: TMDB Discover ile tür/kişi/puan filtreli taze öneri.
   Sonuç kartı; kayıtlı öğede "Detayı aç", keşifte "Detayı gör" + "Listeye ekle".
   Ekleme/detay için mevcut fonksiyonlar (detayAc, detayAcTmdb, eklemeSecimiAc) kullanılır. */

const surprizModal = document.getElementById("surprizModal");
const surprizBtn = document.getElementById("surprizBtn");
const surprizKapatBtn = document.getElementById("surprizKapatBtn");
const surprizSonuc = document.getElementById("surprizSonuc");
const surprizPanelListe = document.getElementById("surprizPanelListe");
const surprizPanelKesfet = document.getElementById("surprizPanelKesfet");

let surprizMod = "liste";
let surprizKesfetTur = "movie";
let surprizListeTur = "hepsi";
let surprizSeciliKisi = null; // {id, ad}
let surprizSonSonuclar = [];  // keşif havuzu (reroll için)

/* ---- Aç / kapat ---- */
function surprizAc() {
  kesfetFormuSifirla();  // her açılışta temiz başla
  surprizModal.style.display = "flex";
  const mk = surprizModal.querySelector(".modal-kutu");
  if (mk) mk.scrollTop = 0;
  turSeciciDoldur(); // keşif tür menüsü (önbellekli)
}
function surprizKapat() {
  surprizModal.style.display = "none";
  kesfetFormuSifirla(); // filtreler bir sonraki açılışa taşınmasın
}

// Keşfet filtrelerini ve sonucu varsayılana döndür
function kesfetFormuSifirla() {
  surprizSeciliKisi = null;
  surprizSonSonuclar = [];
  surprizKisiInput.value = "";
  surprizKisiSonuc.innerHTML = "";
  surprizKisiSecili.style.display = "none";
  surprizKisiSecili.innerHTML = "";
  const turSec = document.getElementById("surprizTurSecici");
  if (turSec) turSec.value = "";
  const puanSec = document.getElementById("surprizPuanSecici");
  if (puanSec) puanSec.value = "7";
  surprizSonuc.innerHTML = "";
}

surprizBtn.addEventListener("click", surprizAc);
surprizKapatBtn.addEventListener("click", surprizKapat);
surprizModal.addEventListener("click", (e) => { if (e.target === surprizModal) surprizKapat(); });

/* ---- Mod seçimi (Listemizden / Keşfet) ---- */
document.querySelectorAll(".surpriz-mod-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    surprizMod = btn.dataset.mod;
    document.querySelectorAll(".surpriz-mod-btn").forEach((b) => b.classList.toggle("aktif", b === btn));
    surprizPanelListe.style.display = surprizMod === "liste" ? "block" : "none";
    surprizPanelKesfet.style.display = surprizMod === "kesfet" ? "block" : "none";
    surprizSonuc.innerHTML = "";
  });
});

/* ---- Tür toggle (dizi/film) her iki panelde ---- */
document.querySelectorAll(".surpriz-turtoggle").forEach((grup) => {
  grup.addEventListener("click", (e) => {
    const btn = e.target.closest(".tur-toggle-btn");
    if (!btn) return;
    grup.querySelectorAll(".tur-toggle-btn").forEach((b) => b.classList.toggle("aktif", b === btn));
    if (grup.dataset.grup === "liste") {
      surprizListeTur = btn.dataset.tur;
    } else {
      surprizKesfetTur = btn.dataset.tur;
      turSeciciDoldur(); // tür menüsünü yeni tipe göre yenile
    }
  });
});

/* ---- Keşif tür menüsünü doldur ---- */
async function turSeciciDoldur() {
  const secici = document.getElementById("surprizTurSecici");
  const turler = await turleriGetir(surprizKesfetTur);
  secici.innerHTML = `<option value="">Farketmez</option>`
    + turler.map((t) => `<option value="${t.id}">${t.ad}</option>`).join("");
}

/* ---- Kişi arama (oyuncu / yönetmen) ---- */
const surprizKisiInput = document.getElementById("surprizKisiInput");
const surprizKisiSonuc = document.getElementById("surprizKisiSonuc");
const surprizKisiSecili = document.getElementById("surprizKisiSecili");
let kisiZamanlayici;

surprizKisiInput.addEventListener("input", () => {
  clearTimeout(kisiZamanlayici);
  const isim = surprizKisiInput.value.trim();
  // Yeni arama başlarken önceki seçimi bırak
  surprizSeciliKisi = null;
  surprizKisiSecili.style.display = "none";
  if (isim.length < 2) { surprizKisiSonuc.innerHTML = ""; return; }
  kisiZamanlayici = setTimeout(async () => {
    const kisiler = await kisiAra(isim);
    if (surprizKisiInput.value.trim() !== isim) return;
    surprizKisiSonuc.innerHTML = kisiler.map((k) => `
      <button class="kisi-oneri" data-kisi-id="${k.id}" data-kisi-ad="${(k.ad || "").replace(/"/g, "&quot;")}">
        <img src="${posterUrl(k.foto)}" alt="">
        <span>${k.ad}</span>
      </button>`).join("");
  }, 400);
});

// Bir kişiyi seç: çipini göster, arama kutusunu/sonuçlarını temizle
function kisiSec(id, ad) {
  surprizSeciliKisi = { id: Number(id), ad: ad };
  surprizKisiInput.value = "";
  surprizKisiSonuc.innerHTML = "";
  surprizKisiSecili.style.display = "flex";
  surprizKisiSecili.innerHTML =
    `<span>👤 ${ad}</span><button id="kisiKaldirBtn" aria-label="Kaldır">✕</button>`;
}

surprizKisiSonuc.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-kisi-id]");
  if (!btn) return;
  kisiSec(Number(btn.dataset.kisiId), btn.dataset.kisiAd);
});

surprizKisiSecili.addEventListener("click", (e) => {
  if (!e.target.closest("#kisiKaldirBtn")) return;
  surprizSeciliKisi = null;
  surprizKisiSecili.style.display = "none";
});

/* ---- MOD A: Listemizden rastgele ---- */
document.getElementById("surprizCevirBtn").addEventListener("click", () => {
  const havuz = listeHavuzu();
  if (havuz.length === 0) {
    surprizSonuc.innerHTML = `<div class="surpriz-bos">İstek listende (veya Birlikte listende) hiç yapım yok.
      Önce birkaç şey ekle, sonra çevirelim. 💛</div>`;
    return;
  }
  cevirmeAnimasyonu(havuz, (secilen) => sonucKartiCiz(secilen, "liste"));
});

// İstek listesi (kişisel) + ortak listedeki tüm yapımlar, tür süzgeciyle
function listeHavuzu() {
  let havuz = listem.filter((o) => o.durum === "izlemek_istiyor");
  if (typeof ortakListem !== "undefined" && ortakListem.length) {
    havuz = havuz.concat(ortakListem);
  }
  if (surprizListeTur !== "hepsi") havuz = havuz.filter((o) => o.type === surprizListeTur);
  return havuz;
}

/* ---- MOD B: Keşfet ---- */
document.getElementById("surprizGetirBtn").addEventListener("click", async () => {
  const turId = document.getElementById("surprizTurSecici").value;
  const minPuan = document.getElementById("surprizPuanSecici").value;
  surprizSonuc.innerHTML = `<div class="surpriz-yukleniyor">🎬 Aranıyor...</div>`;

  // Kişi kutusuna isim yazılmış ama listeden seçilmemişse ilk eşleşeni otomatik seç
  const yaziliIsim = surprizKisiInput.value.trim();
  if (yaziliIsim.length >= 2 && !surprizSeciliKisi) {
    const bulunan = await kisiAra(yaziliIsim);
    if (bulunan.length) kisiSec(bulunan[0].id, bulunan[0].ad);
  }

  surprizSonSonuclar = await kesfet({
    type: surprizKesfetTur,
    turId: turId || null,
    kisiId: surprizSeciliKisi ? surprizSeciliKisi.id : null,
    minPuan: minPuan || null,
  });

  if (surprizSonSonuclar.length === 0) {
    const kisiKismi = surprizSeciliKisi ? ` (${surprizSeciliKisi.ad})` : "";
    surprizSonuc.innerHTML = `<div class="surpriz-bos">Seçtiğin kriterlere${kisiKismi} uygun film/dizi bulunamadı.
      Puanı düşürmeyi veya türü/kişiyi değiştirmeyi dene. 🙈</div>`;
    return;
  }
  cevirmeAnimasyonu(surprizSonSonuclar, (secilen) => sonucKartiCiz(secilen, "kesfet"));
});

/* ---- Çevirme animasyonu: hızlıca posterler geçsin, sonra sonuçta dursun ---- */
function cevirmeAnimasyonu(havuz, bitince) {
  const posterOf = (o) => posterUrl(o.poster || o.poster_path);
  let sayac = 0;
  const tur = Math.min(10, Math.max(6, havuz.length));
  surprizSonuc.innerHTML = `<div class="surpriz-cark"><img id="surprizCarkPoster" src="${posterOf(rastgele(havuz))}" alt=""></div>`;
  const img = document.getElementById("surprizCarkPoster");
  const zaman = setInterval(() => {
    img.src = posterOf(rastgele(havuz));
    sayac++;
    if (sayac >= tur) {
      clearInterval(zaman);
      bitince(rastgele(havuz));
    }
  }, 90);
}

function rastgele(dizi) { return dizi[Math.floor(Math.random() * dizi.length)]; }

/* ---- Sonuç kartı ---- */
function sonucKartiCiz(oge, mod) {
  const diziMi = oge.type === "tv" || oge.media_type === "tv";
  const ad = oge.ad || oge.title || oge.name || "";
  const poster = oge.poster || oge.poster_path;
  const yil = oge.yil
    || ((diziMi ? oge.first_air_date : oge.release_date) || "").slice(0, 4)
    || "—";
  const puan = oge.vote_average ? Number(oge.vote_average).toFixed(1) : null;

  const butonlar = mod === "liste"
    ? `<button class="surpriz-aksiyon birincil" data-aksiyon="detay-kayitli" data-key="${oge.key}">Detayı aç</button>
       <button class="surpriz-aksiyon" data-aksiyon="tekrar">🎲 Başka bir tane</button>`
    : `<button class="surpriz-aksiyon birincil" data-aksiyon="ekle">➕ Listeye ekle</button>
       <button class="surpriz-aksiyon" data-aksiyon="detay-tmdb">Detayı gör</button>
       <button class="surpriz-aksiyon" data-aksiyon="tekrar">🎲 Başka bir tane</button>`;

  surprizSonuc.innerHTML = `
    <div class="surpriz-kart">
      <img class="surpriz-kart-poster" src="${posterUrl(poster)}" alt="">
      <div class="surpriz-kart-bilgi">
        <div class="surpriz-kart-ad">${ad}</div>
        <div class="surpriz-kart-alt">
          <span class="rozet ${diziMi ? "dizi" : "film"}">${diziMi ? "Dizi" : "Film"}</span>
          <span class="surpriz-kart-yil">${yil}</span>
          ${puan ? `<span class="surpriz-kart-puan">★ ${puan}</span>` : ""}
        </div>
        <div class="surpriz-kart-butonlar">${butonlar}</div>
      </div>
    </div>`;

  // Bu sonuç için buton olaylarını bağla
  surprizSonuc.querySelector(".surpriz-kart-butonlar").onclick = (e) => {
    const btn = e.target.closest("[data-aksiyon]");
    if (!btn) return;
    const a = btn.dataset.aksiyon;
    if (a === "tekrar") {
      if (mod === "liste") {
        const havuz = listeHavuzu();
        if (havuz.length) cevirmeAnimasyonu(havuz, (s) => sonucKartiCiz(s, "liste"));
      } else if (surprizSonSonuclar.length) {
        cevirmeAnimasyonu(surprizSonSonuclar, (s) => sonucKartiCiz(s, "kesfet"));
      }
    } else if (a === "detay-kayitli") {
      surprizModal.style.display = "none"; // gizle (filtre bir sonraki açılışta sıfırlanır)
      detayAc(btn.dataset.key);
    } else if (a === "detay-tmdb") {
      surprizModal.style.display = "none";
      // Keşif havuzunu detaya taşı: detayda tek tuşla "başka öneri" için
      detayAcTmdb(oge, true, mod === "kesfet" ? surprizSonSonuclar : null);
      // "Geri" ile sürpriz ekranına (filtreler duruyor) dönebilelim
      if (mod === "kesfet") {
        detaySurprizDonAyarla(() => { surprizModal.style.display = "flex"; });
      }
    } else if (a === "ekle") {
      surprizKapat();
      eklemeSecimiAc(oge);
    }
  };
}
