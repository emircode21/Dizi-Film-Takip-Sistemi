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
let aniMevcutListe = [];    // o an listelenen anılar (düzenleme için id ile bulma)
let aniSecilenFoto = null;  // formda hazır bekleyen foto (base64)
let aniSecilenSesler = [];  // formda hazır bekleyen ses kayıtları (base64 data URL listesi)
let aniKayitState = null;   // { recorder, stream, timer } — aktif kayıt
let aniDuzenlenenId = null; // düzenleme modundaysa güncellenen anının id'si (yoksa yeni ekleme)
let aniDuzenlenenOlusturma = null; // düzenlemede orijinal oluşturma zamanını koru

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
  aniSecilenSesler = [];
  aniDuzenlenenId = null;
  aniDuzenlenenOlusturma = null;

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
  aniMevcutListe = anilar; // düzenleme için id → anı bulunabilsin
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
  // Yeni anılar sesler[] dizisi tutar; eski anılarda tek ses alanı olabilir
  const sesListe = (a.sesler && a.sesler.length) ? a.sesler : (a.ses ? [a.ses] : []);
  const ses = sesListe.map((s) =>
    `<audio class="ani-ses" controls preload="none" src="${s}"></audio>`).join("");
  const not = a.not ? `<div class="ani-not">${aniKacis(a.not)}</div>` : "";
  return `
    <div class="ani-kart" data-ani-kart="${a.id}">
      <div class="ani-kart-ust">
        <span class="ani-tarih">📅 ${aniTarihBicim(a.tarih)}</span>
        <div class="ani-kart-islem">
          <button class="ani-duzenle-btn" data-ani-duzenle="${a.id}" aria-label="Anıyı düzenle">✏️</button>
          <button class="ani-sil-btn" data-ani-sil="${a.id}" aria-label="Anıyı sil">🗑</button>
        </div>
      </div>
      ${not}
      ${foto}
      ${ses}
    </div>`;
}

/* ---- Ekleme / düzenleme formu ----
   mevcut verilmezse yeni anı; verilirse o anının verileriyle düzenleme modu. */
function aniFormAc(mevcut) {
  const sarmal = document.getElementById("aniFormSarmal");
  if (!sarmal) return;

  aniKayitTemizle();
  aniDuzenlenenId = mevcut ? mevcut.id : null;
  aniDuzenlenenOlusturma = mevcut ? (mevcut.olusturma || Date.now()) : null;
  aniSecilenFoto = mevcut ? (mevcut.foto || null) : null;
  aniSecilenSesler = mevcut
    ? ((mevcut.sesler && mevcut.sesler.length) ? mevcut.sesler.slice() : (mevcut.ses ? [mevcut.ses] : []))
    : [];

  const tarihDeger = (mevcut && mevcut.tarih) || bugunISO();
  const notDeger = aniOznitelikKacis((mevcut && mevcut.not) || "");
  const duzenleMi = !!mevcut;

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
      ${duzenleMi ? `<div class="ani-form-baslik">✏️ Anıyı düzenle</div>` : ""}
      <label class="ani-etiket">Tarih</label>
      <input id="aniTarih" class="ani-input" type="date" value="${tarihDeger}">

      <label class="ani-etiket">Notunuz (opsiyonel)</label>
      <textarea id="aniNot" class="ani-textarea" rows="3" placeholder="Bu yapım hakkında düşünceleriniz, o anki hisleriniz...">${notDeger}</textarea>

      <label class="ani-etiket">Fotoğraf (opsiyonel)</label>
      <input id="aniFoto" class="ani-input" type="file" accept="image/*">
      <div id="aniFotoOnizleme" class="ani-foto-onizleme"></div>

      ${sesBolumu}

      <div class="ani-form-alt">
        <button id="aniKaydetBtn" class="ani-kaydet-btn" type="button">${duzenleMi ? "💾 Güncelle" : "💾 Kaydet"}</button>
        <button id="aniVazgecBtn" class="ani-vazgec-btn" type="button">Vazgeç</button>
      </div>
      <div id="aniFormDurum" class="ani-form-durum"></div>
    </div>`;

  document.getElementById("aniFoto").addEventListener("change", aniFotoSecildi);
  document.getElementById("aniKaydetBtn").addEventListener("click", aniKaydet);
  document.getElementById("aniVazgecBtn").addEventListener("click", aniFormKapat);
  const kayitBtn = document.getElementById("aniKayitBtn");
  if (kayitBtn) kayitBtn.addEventListener("click", aniKayitTus);

  // Düzenlemede mevcut foto/ses önizlemelerini göster
  aniFotoOnizlemeCiz();
  aniSesOnizlemeCiz();
}

function aniFormKapat() {
  aniKayitTemizle();
  aniSecilenFoto = null;
  aniSecilenSesler = [];
  aniDuzenlenenId = null;
  aniDuzenlenenOlusturma = null;
  const sarmal = document.getElementById("aniFormSarmal");
  if (sarmal) sarmal.innerHTML = "";
}

/* ---- Fotoğraf: cihazda küçült ---- */
async function aniFotoSecildi(e) {
  const dosya = e.target.files && e.target.files[0];
  const onizle = document.getElementById("aniFotoOnizleme");
  if (!dosya) return; // dosya seçici iptal edildi → mevcut fotoyu koru
  if (onizle) onizle.innerHTML = "<div class='bilgi'>Fotoğraf hazırlanıyor...</div>";
  try {
    aniSecilenFoto = await fotoKucult(dosya, ANI_FOTO_MAX_KENAR, ANI_FOTO_HEDEF_BAYT);
    aniFotoOnizlemeCiz();
  } catch (err) {
    console.warn("Fotoğraf işlenemedi:", err);
    aniSecilenFoto = null;
    if (onizle) onizle.innerHTML = "<div class='bilgi'>Fotoğraf yüklenemedi.</div>";
  }
}

// Formdaki foto önizlemesini (varsa kaldırma butonuyla) çizer
function aniFotoOnizlemeCiz() {
  const onizle = document.getElementById("aniFotoOnizleme");
  if (!onizle) return;
  if (!aniSecilenFoto) { onizle.innerHTML = ""; return; }
  onizle.innerHTML = `
    <img class="ani-foto-onizleme-img" src="${aniSecilenFoto}" alt="önizleme">
    <button id="aniFotoSilBtn" class="ani-ses-sil-btn" type="button">✕ Fotoğrafı kaldır</button>`;
  document.getElementById("aniFotoSilBtn").addEventListener("click", () => {
    aniSecilenFoto = null;
    const inp = document.getElementById("aniFoto");
    if (inp) inp.value = "";
    aniFotoOnizlemeCiz();
  });
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

    const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
    const okuyucu = new FileReader();
    okuyucu.onload = () => {
      aniSecilenSesler.push(okuyucu.result); // data URL — MIME içinde gömülü, eskiyi silmeden ekle
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
  if (btn) btn.textContent = aniSecilenSesler.length ? "🎙 Başka ses ekle" : "🎙 Kaydı başlat";
  const sureEl = document.getElementById("aniKayitSure");
  if (sureEl) sureEl.textContent = "";
  if (!el) return;
  if (!aniSecilenSesler.length) { el.innerHTML = ""; return; }
  el.innerHTML = aniSecilenSesler.map((src, i) => `
    <div class="ani-ses-satir">
      <audio class="ani-ses" controls src="${src}"></audio>
      <button class="ani-ses-sil-btn" type="button" data-ses-sil="${i}" aria-label="Bu kaydı sil">✕</button>
    </div>`).join("");
  el.querySelectorAll("[data-ses-sil]").forEach((b) => {
    b.addEventListener("click", () => {
      aniSecilenSesler.splice(Number(b.dataset.sesSil), 1);
      aniSesOnizlemeCiz();
    });
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

  if (!not && !aniSecilenFoto && !aniSecilenSesler.length) {
    aniDurumYaz("En az bir not, fotoğraf veya sesli not ekleyin.");
    return;
  }

  const oge = {
    tarih: tarih,
    not: not,
    foto: aniSecilenFoto || "",
    sesler: aniSecilenSesler.slice(),
    olusturma: Date.now(),
  };

  const sesToplam = oge.sesler.reduce((t, s) => t + s.length, 0);
  if (oge.foto.length + sesToplam > ANI_DOKUMAN_SINIR) {
    aniDurumYaz("Fotoğraf + ses çok büyük. Daha kısa bir ses ya da daha küçük bir foto deneyin.");
    return;
  }

  const duzenleMi = !!aniDuzenlenenId;
  if (duzenleMi) oge.olusturma = aniDuzenlenenOlusturma || Date.now();

  const kaydetBtn = document.getElementById("aniKaydetBtn");
  const eskiMetin = duzenleMi ? "💾 Güncelle" : "💾 Kaydet";
  if (kaydetBtn) { kaydetBtn.disabled = true; kaydetBtn.textContent = "Kaydediliyor..."; }

  const anahtar = aniAcikKey;
  const duzId = aniDuzenlenenId;
  try {
    if (duzenleMi) await aniKoleksiyon(anahtar).doc(duzId).set(oge);
    else await aniKoleksiyon(anahtar).add(oge);
  } catch (e) {
    console.warn("Anı kaydedilemedi:", e);
    aniDurumYaz("Kaydedilemedi. (İnternet ve Firestore kuralları güncel mi?)");
    if (kaydetBtn) { kaydetBtn.disabled = false; kaydetBtn.textContent = eskiMetin; }
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
    const duzBtn = e.target.closest("[data-ani-duzenle]");
    if (duzBtn) {
      const a = aniMevcutListe.find((x) => x.id === duzBtn.dataset.aniDuzenle);
      if (a) {
        aniFormAc(a);
        const sarmal = document.getElementById("aniFormSarmal");
        if (sarmal) sarmal.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      return;
    }
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

// Textarea içeriği / öznitelik için (satır sonlarını koru)
function aniOznitelikKacis(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
