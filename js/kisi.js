/* ---------------- KİŞİ (OYUNCU/YÖNETMEN) DETAYI ----------------
   Aramada bir kişiye tıklanınca açılır; fotoğrafı, rolü ve filmografisini gösterir.
   Bir yapıma tıklanınca mevcut detay önizlemesi (detayAcTmdb) açılır. */

const kisiModal = document.getElementById("kisiModal");
const kisiKapatBtn = document.getElementById("kisiKapatBtn");
const kisiFoto = document.getElementById("kisiFoto");
const kisiAdEl = document.getElementById("kisiAd");
const kisiRol = document.getElementById("kisiRol");
const kisiYapimlar = document.getElementById("kisiYapimlar");

let kisiAcikId = null;

async function kisiDetayAc(personId) {
  kisiAcikId = personId;
  kisiFoto.src = posterUrl(null);
  kisiAdEl.textContent = "Yükleniyor...";
  kisiRol.textContent = "";
  kisiYapimlar.innerHTML = "";
  kisiModal.style.display = "flex";
  const mk = kisiModal.querySelector(".modal-kutu");
  if (mk) mk.scrollTop = 0;

  const k = await kisiDetayGetir(personId);
  if (kisiAcikId !== personId) return; // kullanıcı beklerken başka kişi açtıysa

  kisiFoto.src = posterUrl(k.foto);
  kisiAdEl.textContent = k.ad;
  kisiRol.textContent = k.bolum;

  if (!k.yapimlar.length) {
    kisiYapimlar.innerHTML = "<div class='bilgi'>Yapım bulunamadı.</div>";
    return;
  }

  kisiYapimlar.innerHTML = k.yapimlar.map((y) => `
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

function kisiKapat() {
  kisiModal.style.display = "none";
  kisiAcikId = null;
}

kisiKapatBtn.addEventListener("click", kisiKapat);
kisiModal.addEventListener("click", (e) => { if (e.target === kisiModal) kisiKapat(); });

// Bir yapıma tıklayınca o film/dizinin detay önizlemesini aç
kisiYapimlar.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-yapim-id]");
  if (!btn) return;
  const type = btn.dataset.yapimType;
  const ad = btn.dataset.yapimAd;
  const yil = btn.dataset.yapimYil || "";
  const tarih = yil ? yil + "-01-01" : "";
  kisiKapat();
  detayAcTmdb({
    media_type: type,
    id: Number(btn.dataset.yapimId),
    poster_path: btn.dataset.yapimPoster || null,
    name: ad, title: ad,
    first_air_date: type === "tv" ? tarih : "",
    release_date: type === "movie" ? tarih : "",
  });
});
