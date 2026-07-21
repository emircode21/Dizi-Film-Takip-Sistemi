/* ---------------- HAFIZA (localStorage) ---------------- */
const DEPO_ANAHTARI = "izleme_listem";

// Eski kayıtlara (durum sekmeleri özelliğinden önce eklenmiş) eksik alanları tamamlar
function yukle() {
  let liste;
  try {
    liste = JSON.parse(localStorage.getItem(DEPO_ANAHTARI)) || [];
  } catch (e) {
    liste = [];
  }

  let degisiklikOldu = false;
  liste.forEach((o) => {
    if (!o.tmdbId) {
      o.tmdbId = Number(o.key.split("-")[1]);
      degisiklikOldu = true;
    }
    if (!o.durum) {
      o.durum = "izliyor";
      degisiklikOldu = true;
    }
    if (!o.eklenmeZamani) {
      o.eklenmeZamani = Date.now();
      degisiklikOldu = true;
    }
  });

  if (degisiklikOldu) kaydetListe(liste);
  return liste;
}

function kaydetListe(liste) {
  try {
    localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(liste));
  } catch (e) {}
}

// Global "listem" dizisini kaydetmek için kısayol
function kaydet() {
  kaydetListe(listem);
}
