/* ---------------- KİŞİ (OYUNCU/YÖNETMEN) DETAYI ----------------
   Aramada bir kişiye tıklanınca açılır; fotoğrafı, rolü ve filmografisini gösterir.
   Yapımlar bilinirlik / yıl / puana göre sıralanabilir.
   Bir yapıma tıklanınca detay açılır ve "geri" ile bu kişi ekranına dönülebilir. */

const kisiModal = document.getElementById("kisiModal");
const kisiKapatBtn = document.getElementById("kisiKapatBtn");
const kisiFoto = document.getElementById("kisiFoto");
const kisiAdEl = document.getElementById("kisiAd");
const kisiRol = document.getElementById("kisiRol");
const kisiYapimlar = document.getElementById("kisiYapimlar");
const kisiSiralaSecici = document.getElementById("kisiSiralaSecici");

let kisiAcikId = null;
let kisiYapimListesi = [];        // bilinirlik sırasında (kisiDetayGetir'den geldiği gibi)
let kisiSiraMod = "yeni";   // yeni | eski | puan

async function kisiDetayAc(personId) {
  kisiAcikId = personId;
  kisiFoto.src = posterUrl(null);
  kisiAdEl.textContent = "Yükleniyor...";
  kisiRol.textContent = "";
  kisiYapimlar.innerHTML = "";
  kisiYapimListesi = [];
  kisiSiraModAyarla("yeni"); // her yeni kişide varsayılan: yeniden eskiye
  kisiModal.style.display = "flex";
  const mk = kisiModal.querySelector(".modal-kutu");
  if (mk) mk.scrollTop = 0;

  const k = await kisiDetayGetir(personId);
  if (kisiAcikId !== personId) return; // kullanıcı beklerken başka kişi açtıysa

  kisiFoto.src = posterUrl(k.foto);
  kisiAdEl.textContent = k.ad;
  kisiRol.textContent = k.bolum;
  kisiYapimListesi = k.yapimlar;
  kisiYapimlariCiz();
}

// Seçili sıralamaya göre yapım gridini çizer
function kisiYapimlariCiz() {
  if (!kisiYapimListesi.length) {
    kisiYapimlar.innerHTML = "<div class='bilgi'>Yapım bulunamadı.</div>";
    return;
  }
  let liste = kisiYapimListesi.slice();
  if (kisiSiraMod === "yeni") {
    // Yeniden eskiye; yılı bilinmeyenler sona
    liste.sort((a, b) => (Number(b.yil) || 0) - (Number(a.yil) || 0));
  } else if (kisiSiraMod === "eski") {
    // Eskiden yeniye; yılı bilinmeyenler sona
    liste.sort((a, b) => (Number(a.yil) || 9999) - (Number(b.yil) || 9999));
  } else if (kisiSiraMod === "puan") {
    liste.sort((a, b) => (b.puan || 0) - (a.puan || 0));
  }

  kisiYapimlar.innerHTML = liste.map((y) => `
    <button class="kisi-yapim"
            data-yapim-id="${y.id}"
            data-yapim-type="${y.media_type}"
            data-yapim-poster="${y.poster || ""}"
            data-yapim-yil="${y.yil || ""}"
            data-yapim-ad="${(y.ad || "").replace(/"/g, "&quot;")}">
      <img class="kisi-yapim-poster" src="${posterUrl(y.poster)}" alt="${y.ad}">
      <div class="kisi-yapim-ad">${y.ad}</div>
      <div class="kisi-yapim-alt">${y.yil || ""}${y.puan ? " · ★ " + y.puan : ""}</div>
    </button>`).join("");
}

function kisiSiraModAyarla(mod) {
  kisiSiraMod = mod;
  if (kisiSiralaSecici) kisiSiralaSecici.value = mod;
}

kisiSiralaSecici.addEventListener("change", () => {
  kisiSiraMod = kisiSiralaSecici.value;
  kisiYapimlariCiz();
});

function kisiKapat() {
  kisiModal.style.display = "none";
  kisiAcikId = null;
}

kisiKapatBtn.addEventListener("click", kisiKapat);
kisiModal.addEventListener("click", (e) => { if (e.target === kisiModal) kisiKapat(); });

// Bir yapıma tıklayınca: kişi ekranını GİZLE (kapatma), detay aç;
// detaydaki "geri" bu kişi ekranına (aynı sıralama/kaydırma) döndürsün
kisiYapimlar.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-yapim-id]");
  if (!btn) return;
  const type = btn.dataset.yapimType;
  const ad = btn.dataset.yapimAd;
  const yil = btn.dataset.yapimYil || "";
  const tarih = yil ? yil + "-01-01" : "";

  kisiModal.style.display = "none"; // gizle ama durumu koru
  detayAcTmdb({
    media_type: type,
    id: Number(btn.dataset.yapimId),
    poster_path: btn.dataset.yapimPoster || null,
    name: ad, title: ad,
    first_air_date: type === "tv" ? tarih : "",
    release_date: type === "movie" ? tarih : "",
  });
  detayDonusAyarla(() => { kisiModal.style.display = "flex"; });
});
