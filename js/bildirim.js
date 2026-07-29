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
        <div class="bildirim-satiri ${b.ogeKey ? "bildirim-tiklanabilir" : ""}" ${b.ogeKey ? `data-bildirim-git="${b.ogeKey}"` : ""}>
          <div class="bildirim-mesaj">${b.mesaj}</div>
          <div class="bildirim-tarih">${new Date(b.tarih).toLocaleDateString("tr-TR")}</div>
        </div>`).join("")
    : "<div class='bilgi'>Henüz bildirim yok.</div>";

  // Kutuyu açınca hepsini okunmuş say
  if (liste.some((b) => !b.okunduMu)) {
    bildirimlerYaz(liste.map((b) => ({ ...b, okunduMu: true })));
    bildirimRozetGuncelle();
  }
}

function bildirimAc() {
  if (!bildirimModal) return;
  bildirimModal.style.display = "flex";
  bildirimGoster();
}

if (bildirimBtn) bildirimBtn.addEventListener("click", bildirimAc);
if (bildirimKapatBtn) bildirimKapatBtn.addEventListener("click", () => { bildirimModal.style.display = "none"; });
if (bildirimModal) {
  bildirimModal.addEventListener("click", (e) => { if (e.target === bildirimModal) bildirimModal.style.display = "none"; });
}
if (bildirimListe) {
  bildirimListe.addEventListener("click", (e) => {
    const satir = e.target.closest("[data-bildirim-git]");
    if (!satir) return;
    bildirimModal.style.display = "none";
    detayAc(satir.dataset.bildirimGit);
  });
}

bildirimRozetGuncelle();
