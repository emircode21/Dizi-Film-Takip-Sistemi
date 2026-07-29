/* ---------------- BİLDİRİMLER ----------------
   Cihazda tutulan basit bildirim kutusu. Şu an tek üretici "yeni bölüm
   yayında" uyarıları (bkz. sıradaki-bölüm kontrolü); ileride başka bildirim
   türleri de aynı depoya eklenebilir. */

const BILDIRIM_ANAHTARI = "bildirimler";

const bildirimBtn = document.getElementById("bildirimBtn");
const bildirimRozet = document.getElementById("bildirimRozet");
const bildirimModal = document.getElementById("bildirimModal");
const bildirimKapatBtn = document.getElementById("bildirimKapatBtn");
const bildirimListe = document.getElementById("bildirimListe");

function bildirimlerOku() {
  try { return JSON.parse(localStorage.getItem(BILDIRIM_ANAHTARI)) || []; }
  catch (e) { return []; }
}
function bildirimlerYaz(liste) {
  try { localStorage.setItem(BILDIRIM_ANAHTARI, JSON.stringify(liste)); } catch (e) { /* yoksay */ }
}

// id verilirse aynı id'li bildirim tekrar eklenmez (ör. aynı bölüm için bir kez uyar)
function bildirimEkle({ id, mesaj, ogeKey }) {
  const liste = bildirimlerOku();
  if (id && liste.some((b) => b.id === id)) return;
  liste.unshift({ id: id || String(Date.now()), mesaj, ogeKey: ogeKey || null, tarih: Date.now(), okunduMu: false });
  bildirimlerYaz(liste);
  bildirimRozetGuncelle();
}

function bildirimRozetGuncelle() {
  if (!bildirimRozet) return;
  const okunmamis = bildirimlerOku().filter((b) => !b.okunduMu).length;
  bildirimRozet.textContent = okunmamis;
  bildirimRozet.style.display = okunmamis > 0 ? "flex" : "none";
}

function bildirimGoster() {
  const liste = bildirimlerOku();
  bildirimListe.innerHTML = liste.length
    ? liste.map((b) => `
        <div class="bildirim-satiri-sarmal" data-bildirim-id="${b.id}">
          <div class="bildirim-arka-aksiyon bildirim-arka-sil">🗑 Sil</div>
          <div class="bildirim-arka-aksiyon bildirim-arka-okundu">✓ Okundu</div>
          <div class="bildirim-satiri ${b.okunduMu ? "" : "bildirim-okunmamis"} ${b.ogeKey ? "bildirim-tiklanabilir" : ""}" ${b.ogeKey ? `data-bildirim-git="${b.ogeKey}"` : ""}>
            <div class="bildirim-mesaj">${b.mesaj}</div>
            <div class="bildirim-tarih">${new Date(b.tarih).toLocaleDateString("tr-TR")}</div>
          </div>
        </div>`).join("")
    : "<div class='bilgi'>Henüz bildirim yok.</div>";
}

function bildirimSil(id) {
  bildirimlerYaz(bildirimlerOku().filter((b) => b.id !== id));
  bildirimGoster();
  bildirimRozetGuncelle();
}

function bildirimOkunduYap(id) {
  bildirimlerYaz(bildirimlerOku().map((b) => (b.id === id ? { ...b, okunduMu: true } : b)));
  bildirimGoster();
  bildirimRozetGuncelle();
}

/* ---- Kaydırarak sil (sola) / okundu yap (sağa) ---- */
const BILDIRIM_KAYDIRMA_ESIGI = 70;
let bildirimKaydirma = null;

if (bildirimListe) {
  bildirimListe.addEventListener("touchstart", (e) => {
    const sarmal = e.target.closest(".bildirim-satiri-sarmal");
    if (!sarmal) return;
    bildirimKaydirma = { sarmal, satir: sarmal.querySelector(".bildirim-satiri"), x: e.touches[0].clientX };
  }, { passive: true });

  bildirimListe.addEventListener("touchmove", (e) => {
    if (!bildirimKaydirma) return;
    const delta = e.touches[0].clientX - bildirimKaydirma.x;
    bildirimKaydirma.satir.style.transition = "none";
    bildirimKaydirma.satir.style.transform = `translateX(${delta}px)`;
    bildirimKaydirma.sarmal.classList.toggle("kaydiriliyor-sol", delta < -10);
    bildirimKaydirma.sarmal.classList.toggle("kaydiriliyor-sag", delta > 10);
  }, { passive: true });

  bildirimListe.addEventListener("touchend", (e) => {
    if (!bildirimKaydirma) return;
    const { sarmal, satir, x } = bildirimKaydirma;
    bildirimKaydirma = null;
    const delta = e.changedTouches[0].clientX - x;
    const id = sarmal.dataset.bildirimId;

    if (delta < -BILDIRIM_KAYDIRMA_ESIGI) { bildirimSil(id); return; }
    if (delta > BILDIRIM_KAYDIRMA_ESIGI) { bildirimOkunduYap(id); return; }

    satir.style.transition = "transform 0.2s ease";
    satir.style.transform = "";
    sarmal.classList.remove("kaydiriliyor-sol", "kaydiriliyor-sag");
  });
}

function bildirimKapat() {
  if (bildirimModal) bildirimModal.style.display = "none";
}

function bildirimAc() {
  if (!bildirimModal) return;
  bildirimModal.style.display = "block";
  bildirimGoster();
}

if (bildirimBtn) {
  bildirimBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // dışarı tıklama dinleyicisi hemen kapatmasın
    if (bildirimModal.style.display === "block") bildirimKapat();
    else bildirimAc();
  });
}
if (bildirimKapatBtn) bildirimKapatBtn.addEventListener("click", bildirimKapat);

// Arka plan karartması yok — popover dışına tıklayınca kapanır
document.addEventListener("click", (e) => {
  if (bildirimModal && bildirimModal.style.display === "block"
    && !bildirimModal.contains(e.target) && e.target !== bildirimBtn) {
    bildirimKapat();
  }
});

if (bildirimListe) {
  bildirimListe.addEventListener("click", (e) => {
    const satir = e.target.closest("[data-bildirim-git]");
    if (!satir) return;
    bildirimKapat();
    detayAc(satir.dataset.bildirimGit);
  });
}

bildirimRozetGuncelle();

/* ---- Yeni bölüm kontrolü: sayfa açılışında devam eden gerçek-hayatta-süren
   dizilerin yeni yayınlanmış bölümü varsa bildirim kutusuna ekler + kısa toast gösterir ---- */
const bolumToast = document.getElementById("bolumToast");

function bolumToastGoster(mesaj) {
  if (!bolumToast) return;
  bolumToast.innerHTML = `<span>${mesaj}</span><button id="bolumToastBtn">Bildirimler</button>`;
  bolumToast.style.display = "flex";
  document.getElementById("bolumToastBtn").onclick = () => { bolumToast.style.display = "none"; bildirimAc(); };
  setTimeout(() => { bolumToast.style.display = "none"; }, 6000);
}

async function yeniBolumKontrolEt() {
  const bugun = new Date().toISOString().slice(0, 10);
  const takipEdilenler = (typeof listem !== "undefined" ? listem : [])
    .filter((o) => o.type === "tv" && o.durum === "izliyor");

  const yeniler = [];
  for (const o of takipEdilenler) {
    const devamMi = await diziDevamEdiyorMu(o.tmdbId);
    if (!devamMi) continue;
    const son = await sonYayinlananBolum(o.tmdbId);
    if (!son || !son.tarih || son.tarih > bugun) continue;

    const yeniMi = son.sezon > o.sezon || (son.sezon === o.sezon && son.bolum > o.bolum);
    if (!yeniMi) continue;

    const id = "bolum-" + o.key + "-" + son.sezon + "-" + son.bolum;
    bildirimEkle({ id, mesaj: `📺 <b>${o.ad}</b> dizisinin ${son.sezon}. sezon ${son.bolum}. bölümü yayında!`, ogeKey: o.key });
    yeniler.push(o);
  }

  if (yeniler.length === 1) {
    bolumToastGoster(`📺 ${yeniler[0].ad} dizisinde yeni bölüm var`);
  } else if (yeniler.length > 1) {
    bolumToastGoster(`📺 ${yeniler.length} dizide yeni bölüm var`);
  }
}

if (typeof listem !== "undefined") yeniBolumKontrolEt();
