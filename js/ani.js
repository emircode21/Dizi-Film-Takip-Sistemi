/* ---------------- ANILAR ----------------
   Ortak listedeki ("Birlikte İzlenenler") bir yapıma bağlı anılar:
   tarih + not (yazı) + fotoğraf + sesli not. Foto/ses cihazda küçültülüp
   base64 olarak Firestore alt-koleksiyonuna yazılır; ikiniz de görür/dinler.

   Depolama: ortakListeler/{kod}/ogeler/{key}/anilar/{aniId}
   → { tarih, not, foto(base64), ses(base64), sesTur, olusturma }
   Her anı kendi dokümanında (1MB doküman sınırına takılmamak için). */

const detayAnilar = document.getElementById("detayAnilar");

const ANI_SES_MAX_SN = 60;          // sesli not en fazla 60 saniye
const ANI_FOTO_MAX_KENAR = 900;     // foto en uzun kenarı (px)
const ANI_FOTO_HEDEF_BAYT = 520000; // foto base64 hedef boyutu (~520KB)
const ANI_DOKUMAN_SINIR = 950000;   // foto+ses toplamı için güvenli sınır

const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

let aniAcikKey = null;      // anıları gösterilen ortak öğe (yoksa null)
let aniSecilenFoto = null;  // formda hazır bekleyen foto (base64)
let aniSecilenSes = null;   // formda hazır bekleyen ses (base64)
let aniSecilenSesTur = "";  // sesin MIME türü
let aniKayitState = null;   // { recorder, stream, timer } — aktif kayıt

// Bu öğenin anılar alt-koleksiyonu
function aniKoleksiyon(key) {
  return db.collection("ortakListeler").doc(ortakKod)
    .collection("ogeler").doc(key).collection("anilar");
}

/* Detay açılınca çağrılır. key verilirse o ortak öğenin anıları yüklenir;
   null verilirse bölüm gizlenir ve varsa süren kayıt temizlenir. */
async function anilariGoster(key) {
  aniKayitTemizle();
  aniSecilenFoto = null;
  aniSecilenSes = null;
  aniSecilenSesTur = "";

  if (!key || !db || !ortakKod || !detayAnilar) {
    aniAcikKey = null;
    if (detayAnilar) { detayAnilar.style.display = "none"; detayAnilar.innerHTML = ""; }
    return;
  }

  aniAcikKey = key;
  detayAnilar.style.display = "block";
  detayAnilar.innerHTML = `
    <div class="ani-baslik-satiri">
      <div class="detay-baslik-kucuk">📖 Anılarımız</div>
      <button id="aniEkleAcBtn" class="ani-ekle-ac-btn">➕ Anı ekle</button>
    </div>
    <div id="aniFormSarmal"></div>
    <div id="aniListe" class="ani-liste"><div class="bilgi">Yükleniyor...</div></div>`;

  await anilariYenile(key);
}

// Listeyi yeniden çeker (ekleme/silme sonrası)
async function anilariYenile(key) {
  try {
    const snap = await aniKoleksiyon(key).orderBy("tarih", "desc").get();
    if (aniAcikKey !== key) return; // kullanıcı bu arada başka öğe açtı
    const anilar = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    aniListeCiz(anilar);
  } catch (e) {
    console.warn("Anılar yüklenemedi:", e);
    const liste = document.getElementById("aniListe");
    if (liste) {
      liste.innerHTML = "<div class='ani-bos'>Anılar yüklenemedi. (İnternet ve Firestore kuralları güncel mi?)</div>";
    }
  }
}

function aniListeCiz(anilar) {
  const liste = document.getElementById("aniListe");
  if (!liste) return;
  if (!anilar.length) {
    liste.innerHTML = "<div class='ani-bos'>Henüz anı yok. İzledikten sonra ilk anınızı bırakın 💛</div>";
    return;
  }
  liste.innerHTML = anilar.map(aniKartHTML).join("");
}

function aniKartHTML(a) {
  const foto = a.foto
    ? `<img class="ani-foto" src="${a.foto}" alt="anı fotoğrafı" data-ani-foto="${a.id}">`
    : "";
  const ses = a.ses
    ? `<audio class="ani-ses" controls preload="none" src="${a.ses}"></audio>`
    : "";
  const not = a.not ? `<div class="ani-not">${aniKacis(a.not)}</div>` : "";
  return `
    <div class="ani-kart" data-ani-kart="${a.id}">
      <div class="ani-kart-ust">
        <span class="ani-tarih">📅 ${aniTarihBicim(a.tarih)}</span>
        <button class="ani-sil-btn" data-ani-sil="${a.id}" aria-label="Anıyı sil">🗑</button>
      </div>
      ${not}
      ${foto}
      ${ses}
    </div>`;
}

/* ---- Ekleme formu ---- */
function aniFormAc() {
  const sarmal = document.getElementById("aniFormSarmal");
  if (!sarmal || sarmal.querySelector(".ani-form")) return; // zaten açık

  aniSecilenFoto = null;
  aniSecilenSes = null;
  aniSecilenSesTur = "";

  const sesDestek = aniDesteklenenSesTuru() !== null;
  const sesBolumu = sesDestek
    ? `<label class="ani-etiket">Sesli not (opsiyonel, en fazla ${ANI_SES_MAX_SN} sn)</label>
       <div class="ani-ses-kayit">
         <button id="aniKayitBtn" class="ani-kayit-btn" type="button">🎙 Kaydı başlat</button>
         <span id="aniKayitSure" class="ani-kayit-sure"></span>
       </div>
       <div id="aniSesOnizleme" class="ani-ses-onizleme"></div>`
    : `<div class="ani-not-bilgi">Bu cihaz/tarayıcı sesli not kaydını desteklemiyor.</div>`;

  sarmal.innerHTML = `
    <div class="ani-form">
      <label class="ani-etiket">Tarih</label>
      <input id="aniTarih" class="ani-input" type="date" value="${bugunISO()}">

      <label class="ani-etiket">Notunuz (opsiyonel)</label>
      <textarea id="aniNot" class="ani-textarea" rows="3" placeholder="Bu yapım hakkında düşünceleriniz, o anki hisleriniz..."></textarea>

      <label class="ani-etiket">Fotoğraf (opsiyonel)</label>
      <input id="aniFoto" class="ani-input" type="file" accept="image/*">
      <div id="aniFotoOnizleme" class="ani-foto-onizleme"></div>

      ${sesBolumu}

      <div class="ani-form-alt">
        <button id="aniKaydetBtn" class="ani-kaydet-btn" type="button">💾 Kaydet</button>
        <button id="aniVazgecBtn" class="ani-vazgec-btn" type="button">Vazgeç</button>
      </div>
      <div id="aniFormDurum" class="ani-form-durum"></div>
    </div>`;

  document.getElementById("aniFoto").addEventListener("change", aniFotoSecildi);
  document.getElementById("aniKaydetBtn").addEventListener("click", aniKaydet);
  document.getElementById("aniVazgecBtn").addEventListener("click", aniFormKapat);
  const kayitBtn = document.getElementById("aniKayitBtn");
  if (kayitBtn) kayitBtn.addEventListener("click", aniKayitTus);
}

function aniFormKapat() {
  aniKayitTemizle();
  aniSecilenFoto = null;
  aniSecilenSes = null;
  aniSecilenSesTur = "";
  const sarmal = document.getElementById("aniFormSarmal");
  if (sarmal) sarmal.innerHTML = "";
}

/* ---- Fotoğraf: cihazda küçült ---- */
async function aniFotoSecildi(e) {
  const dosya = e.target.files && e.target.files[0];
  const onizle = document.getElementById("aniFotoOnizleme");
  if (!dosya) { aniSecilenFoto = null; if (onizle) onizle.innerHTML = ""; return; }
  if (onizle) onizle.innerHTML = "<div class='bilgi'>Fotoğraf hazırlanıyor...</div>";
  try {
    aniSecilenFoto = await fotoKucult(dosya, ANI_FOTO_MAX_KENAR, ANI_FOTO_HEDEF_BAYT);
    if (onizle) onizle.innerHTML = `<img class="ani-foto-onizleme-img" src="${aniSecilenFoto}" alt="önizleme">`;
  } catch (err) {
    console.warn("Fotoğraf işlenemedi:", err);
    aniSecilenFoto = null;
    if (onizle) onizle.innerHTML = "<div class='bilgi'>Fotoğraf yüklenemedi.</div>";
  }
}

// Dosyayı canvas ile küçültüp JPEG base64 döndürür; hedef boyuta inene dek kaliteyi düşürür.
function fotoKucult(dosya, maxKenar, hedefBayt) {
  return new Promise((resolve, reject) => {
    const okuyucu = new FileReader();
    okuyucu.onerror = () => reject(new Error("dosya okunamadı"));
    okuyucu.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("görsel bozuk"));
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxKenar || h > maxKenar) {
          if (w >= h) { h = Math.round(h * maxKenar / w); w = maxKenar; }
          else { w = Math.round(w * maxKenar / h); h = maxKenar; }
        }
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        let kalite = 0.7;
        let veri = c.toDataURL("image/jpeg", kalite);
        while (veri.length > hedefBayt && kalite > 0.3) {
          kalite -= 0.1;
          veri = c.toDataURL("image/jpeg", kalite);
        }
        resolve(veri);
      };
      img.src = okuyucu.result;
    };
    okuyucu.readAsDataURL(dosya);
  });
}

/* ---- Sesli not: MediaRecorder ---- */
// Bu cihazda desteklenen ilk ses MIME'ini döndürür; hiç yoksa null.
function aniDesteklenenSesTuru() {
  if (typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return null;
  }
  const adaylar = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];
  for (const m of adaylar) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) { /* yoksay */ }
  }
  return ""; // MediaRecorder var ama tür sorgulanamadı → varsayılanla dene
}

async function aniKayitTus() {
  const btn = document.getElementById("aniKayitBtn");

  // Kayıt sürüyorsa durdur
  if (aniKayitState && aniKayitState.recorder && aniKayitState.recorder.state === "recording") {
    try { aniKayitState.recorder.stop(); } catch (e) { /* yoksay */ }
    return;
  }

  const mime = aniDesteklenenSesTuru();
  if (mime === null) { aniDurumYaz("Bu cihaz ses kaydını desteklemiyor."); return; }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    aniDurumYaz("Mikrofon izni verilmedi.");
    return;
  }

  let recorder;
  try { recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); }
  catch (e) { recorder = new MediaRecorder(stream); }

  const chunks = [];
  const baslangic = Date.now();
  aniKayitState = { recorder, stream, timer: null };

  recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
  recorder.onstop = () => {
    if (aniKayitState && aniKayitState.timer) clearInterval(aniKayitState.timer);
    stream.getTracks().forEach((t) => t.stop());
    aniKayitState = null;

    const tur = (recorder.mimeType || mime || "audio/webm").split(";")[0];
    const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
    const okuyucu = new FileReader();
    okuyucu.onload = () => {
      aniSecilenSes = okuyucu.result;
      aniSecilenSesTur = tur;
      aniSesOnizlemeCiz();
    };
    okuyucu.readAsDataURL(blob);
  };

  try { recorder.start(); }
  catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    aniKayitState = null;
    aniDurumYaz("Kayıt başlatılamadı.");
    return;
  }

  if (btn) btn.textContent = "⏹ Kaydı durdur";
  aniDurumYaz("");
  const sureEl = document.getElementById("aniKayitSure");
  aniKayitState.timer = setInterval(() => {
    const gecen = Math.floor((Date.now() - baslangic) / 1000);
    if (sureEl) sureEl.textContent = aniSureBicim(gecen) + " / " + aniSureBicim(ANI_SES_MAX_SN);
    if (gecen >= ANI_SES_MAX_SN) { try { recorder.stop(); } catch (e) { /* yoksay */ } }
  }, 250);
}

function aniSesOnizlemeCiz() {
  const el = document.getElementById("aniSesOnizleme");
  const btn = document.getElementById("aniKayitBtn");
  if (btn) btn.textContent = aniSecilenSes ? "🎙 Yeniden kaydet" : "🎙 Kaydı başlat";
  const sureEl = document.getElementById("aniKayitSure");
  if (sureEl) sureEl.textContent = "";
  if (!el) return;
  if (!aniSecilenSes) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <audio class="ani-ses" controls src="${aniSecilenSes}"></audio>
    <button id="aniSesSilBtn" class="ani-ses-sil-btn" type="button">✕ Sesi sil</button>`;
  document.getElementById("aniSesSilBtn").addEventListener("click", () => {
    aniSecilenSes = null;
    aniSecilenSesTur = "";
    aniSesOnizlemeCiz();
  });
}

// Süren kayıt varsa durdur, akışı kapat, zamanlayıcıyı temizle
function aniKayitTemizle() {
  if (!aniKayitState) return;
  try { if (aniKayitState.timer) clearInterval(aniKayitState.timer); } catch (e) { /* yoksay */ }
  try {
    if (aniKayitState.recorder && aniKayitState.recorder.state === "recording") {
      aniKayitState.recorder.onstop = null;
      aniKayitState.recorder.stop();
    }
  } catch (e) { /* yoksay */ }
  try {
    if (aniKayitState.stream) aniKayitState.stream.getTracks().forEach((t) => t.stop());
  } catch (e) { /* yoksay */ }
  aniKayitState = null;
}

/* ---- Kaydetme ---- */
async function aniKaydet() {
  if (!aniAcikKey || !db || !ortakKod) return;

  aniKayitTemizle(); // kayıt hâlâ sürüyorsa güvenli kapat

  const tarihEl = document.getElementById("aniTarih");
  const notEl = document.getElementById("aniNot");
  const tarih = (tarihEl && tarihEl.value) || bugunISO();
  const not = (notEl && notEl.value || "").trim();

  if (!not && !aniSecilenFoto && !aniSecilenSes) {
    aniDurumYaz("En az bir not, fotoğraf veya sesli not ekleyin.");
    return;
  }

  const oge = {
    tarih: tarih,
    not: not,
    foto: aniSecilenFoto || "",
    ses: aniSecilenSes || "",
    sesTur: aniSecilenSesTur || "",
    olusturma: Date.now(),
  };

  if (oge.foto.length + oge.ses.length > ANI_DOKUMAN_SINIR) {
    aniDurumYaz("Fotoğraf + ses çok büyük. Daha kısa bir ses ya da daha küçük bir foto deneyin.");
    return;
  }

  const kaydetBtn = document.getElementById("aniKaydetBtn");
  if (kaydetBtn) { kaydetBtn.disabled = true; kaydetBtn.textContent = "Kaydediliyor..."; }

  const anahtar = aniAcikKey;
  try {
    await aniKoleksiyon(anahtar).add(oge);
  } catch (e) {
    console.warn("Anı kaydedilemedi:", e);
    aniDurumYaz("Kaydedilemedi. (İnternet ve Firestore kuralları güncel mi?)");
    if (kaydetBtn) { kaydetBtn.disabled = false; kaydetBtn.textContent = "💾 Kaydet"; }
    return;
  }

  aniFormKapat();
  if (aniAcikKey === anahtar) anilariYenile(anahtar);
}

/* ---- Silme ---- */
async function aniSil(aniId) {
  if (!aniAcikKey || !db || !ortakKod) return;
  if (!confirm("Bu anıyı silmek istediğine emin misin?")) return;
  const key = aniAcikKey;
  try {
    await aniKoleksiyon(key).doc(aniId).delete();
  } catch (e) {
    console.warn("Anı silinemedi:", e);
    return;
  }
  if (aniAcikKey === key) anilariYenile(key);
}

/* ---- Fotoğrafı büyük göster ---- */
function aniFotoBuyut(src) {
  const kat = document.createElement("div");
  kat.className = "ani-foto-buyuk-kat";
  kat.innerHTML = `<img src="${src}" alt="anı"><button class="ani-foto-buyuk-kapat" aria-label="Kapat">✕</button>`;
  kat.addEventListener("click", () => kat.remove());
  document.body.appendChild(kat);
}

/* ---- Olay yönlendirme (detayAnilar kapsayıcısı kalıcı) ---- */
if (detayAnilar) {
  detayAnilar.addEventListener("click", (e) => {
    if (e.target.closest("#aniEkleAcBtn")) { aniFormAc(); return; }
    const silBtn = e.target.closest("[data-ani-sil]");
    if (silBtn) { aniSil(silBtn.dataset.aniSil); return; }
    const foto = e.target.closest("[data-ani-foto]");
    if (foto && foto.tagName === "IMG") { aniFotoBuyut(foto.getAttribute("src")); return; }
  });
}

/* ---- Yardımcılar ---- */
function aniTarihBicim(iso) {
  if (!iso) return "";
  const p = String(iso).split("-").map(Number);
  const [y, m, d] = p;
  if (!y || !m || !d) return iso;
  return d + " " + (AY_ADLARI[m - 1] || "") + " " + y;
}

function bugunISO() {
  const t = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
}

function aniSureBicim(sn) {
  const d = Math.floor(sn / 60), s = sn % 60;
  return d + ":" + String(s).padStart(2, "0");
}

function aniDurumYaz(msg) {
  const el = document.getElementById("aniFormDurum");
  if (el) el.textContent = msg;
}

function aniKacis(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}
