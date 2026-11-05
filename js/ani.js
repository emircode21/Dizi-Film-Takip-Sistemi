/* ---------------- ANILAR ----------------
   Ortak listedeki ("Birlikte İzlenenler") bir yapıma bağlı anılar:
   tarih + not (yazı) + fotoğraf + sesli not. Foto/ses cihazda küçültülüp
   base64 olarak Firestore alt-koleksiyonuna yazılır; ikiniz de görür/dinler.

   Depolama: ortakListeler/{kod}/ogeler/{key}/anilar/{aniId}
   → { tarih, not, olusturma, guncelleme, yazanUid, medyaAyri: true,
       fotoVar, sesSayisi, kucukFoto(~20KB önizleme) }
   Büyük foto + sesler ayrı dokümanda: .../anilar/{aniId}/medya/icerik → { foto, sesler }
   Böylece akış yalnızca hafif dokümanları indirir; büyük medya kart ekrana
   yaklaşınca (IntersectionObserver) çekilir. Eski anılar (foto/ses içinde gömülü)
   ilk görüldüklerinde arka planda bir kez bu düzene taşınır. */

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

/* ---------------- MEDYA: ayrı dokümanda, gerektiğinde yüklenir ---------------- */
const ANI_KUCUK_FOTO_KENAR = 320;
const ANI_KUCUK_FOTO_BAYT = 24000;
const aniKayitlari = new Map();     // aniId → anı nesnesi (ekranda gösterilen son hali)
const aniMedyaOnbellek = new Map(); // aniId|guncelleme → { foto, sesler }
const aniTasinanlar = new Set();    // bu oturumda taşınan/taşınmaya çalışılan eski anılar

function aniMedyaRef(key, aniId) {
  return aniKoleksiyon(key).doc(aniId).collection("medya").doc("icerik");
}
function _aniSesler(a) { return (a.sesler && a.sesler.length) ? a.sesler : (a.ses ? [a.ses] : []); }
function _aniEskiMi(a) { return !a.medyaAyri && !!(a.foto || _aniSesler(a).length); }
function _aniMedyaHazir(a) { return !a.medyaAyri || a.medyaYuklendi || (!a.fotoVar && !a.sesSayisi); }
function _aniOnbellekAnahtar(a) { return a.id + "|" + (a.guncelleme || a.olusturma || 0); }

// Firestore'dan gelen dokümanı anı nesnesine çevirir, önbellekte medyası varsa ekler
function aniNesne(doc, key, oge) {
  const a = Object.assign({ id: doc.id, _key: key }, doc.data());
  if (oge) a.oge = oge;
  const m = aniMedyaOnbellek.get(_aniOnbellekAnahtar(a));
  if (a.medyaAyri && m) Object.assign(a, m, { medyaYuklendi: true });
  aniKayitlari.set(a.id, a);
  return a;
}

// Kartın foto + ses kısmı. Medya henüz yüklenmediyse önizleme + bekleme satırı.
function aniMedyaIcHTML(a, fotoTiklanir) {
  const fotoOz = fotoTiklanir ? ` data-ani-foto="${a.id}"` : "";
  if (!_aniMedyaHazir(a)) {
    const foto = a.fotoVar
      ? (a.kucukFoto
        ? `<img class="ani-foto ani-foto-bekliyor" src="${a.kucukFoto}" alt="anı fotoğrafı">`
        : `<div class="ani-foto ani-foto-yer"></div>`)
      : "";
    const ses = a.sesSayisi ? `<div class="ani-ses-bekliyor">🎙 ${a.sesSayisi} sesli not yükleniyor…</div>` : "";
    return foto + ses;
  }
  const foto = a.foto ? `<img class="ani-foto" src="${a.foto}" alt="anı fotoğrafı"${fotoOz} loading="lazy">` : "";
  const ses = _aniSesler(a).map((x) => `<audio class="ani-ses" controls preload="none" src="${x}"></audio>`).join("");
  return foto + ses;
}
function aniMedyaHTML(a, fotoTiklanir) {
  return `<div class="ani-medya" data-ani-medya="${a.id}"${_aniMedyaHazir(a) ? "" : " data-ani-medya-bekliyor"}>${aniMedyaIcHTML(a, fotoTiklanir)}</div>`;
}

async function aniMedyaYukle(a) {
  if (!a || _aniMedyaHazir(a)) return a;
  if (!a._medyaSozu) {
    a._medyaSozu = aniMedyaRef(a._key, a.id).get().then((d) => {
      const m = d.exists ? d.data() : {};
      const medya = { foto: m.foto || "", sesler: m.sesler || [] };
      aniMedyaOnbellek.set(_aniOnbellekAnahtar(a), medya);
      Object.assign(a, medya, { medyaYuklendi: true });
      document.querySelectorAll(`[data-ani-medya="${a.id}"]`).forEach((el) => {
        el.removeAttribute("data-ani-medya-bekliyor");
        el.innerHTML = aniMedyaIcHTML(a, !el.closest("[data-ani-akis-idx]"));
      });
    }).catch((e) => { a._medyaSozu = null; console.warn("Anı medyası yüklenemedi:", e); });
  }
  await a._medyaSozu;
  return a;
}

const aniMedyaGozlemci = typeof IntersectionObserver !== "undefined"
  ? new IntersectionObserver((girisler) => {
    girisler.forEach((g) => {
      if (!g.isIntersecting) return;
      aniMedyaGozlemci.unobserve(g.target);
      aniMedyaYukle(aniKayitlari.get(g.target.dataset.aniMedya));
    });
  }, { rootMargin: "400px 0px" })
  : null;

function aniMedyaGozle(kapsayici) {
  if (!kapsayici) return;
  kapsayici.querySelectorAll("[data-ani-medya-bekliyor]").forEach((el) => {
    if (aniMedyaGozlemci) aniMedyaGozlemci.observe(el);
    else aniMedyaYukle(aniKayitlari.get(el.dataset.aniMedya));
  });
}

async function aniKucukFotoUret(foto) {
  try {
    const blob = await (await fetch(foto)).blob();
    return await fotoKucult(blob, ANI_KUCUK_FOTO_KENAR, ANI_KUCUK_FOTO_BAYT);
  } catch (e) { return ""; }
}

// Anıyı yeni düzende yazar: önce medya (varsa), sonra hafif ana doküman.
// Medya yazılmadan ana doküman "medyaAyri" işaretlenmez → yarıda kalırsa veri kaybolmaz.
async function aniYaz(key, aniId, veri) {
  const ref = aniId ? aniKoleksiyon(key).doc(aniId) : aniKoleksiyon(key).doc();
  const foto = veri.foto || "";
  const sesler = veri.sesler || [];
  const medyaRef = ref.collection("medya").doc("icerik");
  if (foto || sesler.length) await medyaRef.set({ foto, sesler });
  else if (aniId) await medyaRef.delete().catch(() => {});
  const ana = {
    tarih: veri.tarih, not: veri.not || "", olusturma: veri.olusturma || Date.now(),
    guncelleme: Date.now(), yazanUid: veri.yazanUid || "",
    medyaAyri: true, fotoVar: !!foto, sesSayisi: sesler.length,
    kucukFoto: foto ? await aniKucukFotoUret(foto) : "",
  };
  await ref.set(ana);
  aniMedyaOnbellek.set(ref.id + "|" + ana.guncelleme, { foto, sesler });
  return Object.assign(ana, { id: ref.id });
}

async function aniBelgeSil(key, aniId) {
  await aniMedyaRef(key, aniId).delete().catch(() => {});
  await aniKoleksiyon(key).doc(aniId).delete();
}

// Eski (medyası gömülü) anıları arka planda tek tek yeni düzene taşır
async function aniEskileriTasi(anilar) {
  for (const a of anilar) {
    if (!_aniEskiMi(a) || aniTasinanlar.has(a.id) || !a._key) continue;
    aniTasinanlar.add(a.id);
    try {
      const yeni = await aniYaz(a._key, a.id, {
        tarih: a.tarih, not: a.not, olusturma: a.olusturma, yazanUid: a.yazanUid,
        foto: a.foto, sesler: _aniSesler(a),
      });
      Object.assign(a, yeni, { sesler: _aniSesler(a), medyaYuklendi: true });
      delete a.ses;
    } catch (e) {
      console.warn("Eski anı taşınamadı (sonra tekrar denenecek):", e);
    }
  }
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
    const anilar = snap.docs.map((d) => aniNesne(d, key));
    aniListeCiz(anilar);
    aniEskileriTasi(anilar);
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
  aniMedyaGozle(liste);
}

function aniKartHTML(a) {
  const not = a.not ? `<div class="ani-not">${aniKacis(a.not)}</div>` : "";
  const yazan = aniYazanAdi(a.yazanUid);
  return `
    <div class="ani-kart" data-ani-kart="${a.id}">
      <div class="ani-kart-ust">
        <span class="ani-tarih">📅 ${aniTarihBicim(a.tarih)}${yazan ? ` · ✍️ ${yazan}` : ""}</span>
        <div class="ani-kart-islem">
          <button class="ani-duzenle-btn" data-ani-duzenle="${a.id}" aria-label="Anıyı düzenle">✏️</button>
          <button class="ani-sil-btn" data-ani-sil="${a.id}" aria-label="Anıyı sil">🗑</button>
        </div>
      </div>
      ${not}
      ${aniMedyaHTML(a, true)}
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
    yazanUid: (typeof firebase !== "undefined" && firebase.auth().currentUser) ? firebase.auth().currentUser.uid : "",
  };

  const sesToplam = oge.sesler.reduce((t, s) => t + s.length, 0);
  if (oge.foto.length + sesToplam > ANI_DOKUMAN_SINIR) {
    aniDurumYaz("Fotoğraf + ses çok büyük. Daha kısa bir ses ya da daha küçük bir foto deneyin.");
    return;
  }

  const duzenleMi = !!aniDuzenlenenId;
  if (duzenleMi) {
    oge.olusturma = aniDuzenlenenOlusturma || Date.now();
    // Düzenlemede orijinal yazarı koru (kim düzenlerse etsin anı ilk kimin ise ona ait kalsın)
    const orijinal = aniMevcutListe.find((x) => x.id === aniDuzenlenenId);
    if (orijinal && orijinal.yazanUid) oge.yazanUid = orijinal.yazanUid;
  }

  const kaydetBtn = document.getElementById("aniKaydetBtn");
  const eskiMetin = duzenleMi ? "💾 Güncelle" : "💾 Kaydet";
  if (kaydetBtn) { kaydetBtn.disabled = true; kaydetBtn.textContent = "Kaydediliyor..."; }

  const anahtar = aniAcikKey;
  const duzId = aniDuzenlenenId;
  try {
    await aniYaz(anahtar, duzenleMi ? duzId : null, oge);
    aniAkisOnbellekKod = null; // Anılar sekmesi bir sonraki açılışta tazelensin
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
    await aniBelgeSil(key, aniId);
    aniAkisOnbellekKod = null;
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
  detayAnilar.addEventListener("click", async (e) => {
    if (e.target.closest("#aniEkleAcBtn")) { aniFormAc(); return; }
    const duzBtn = e.target.closest("[data-ani-duzenle]");
    if (duzBtn) {
      const a = aniMevcutListe.find((x) => x.id === duzBtn.dataset.aniDuzenle);
      if (a) {
        duzBtn.disabled = true;
        await aniMedyaYukle(a); // formda mevcut foto/ses görünsün ve kaydederken kaybolmasın
        duzBtn.disabled = false;
        if (!_aniMedyaHazir(a)) { alert("Anının fotoğraf/sesi yüklenemedi, internetini kontrol et."); return; }
        aniFormAc(a);
        const sarmal = document.getElementById("aniFormSarmal");
        if (sarmal) sarmal.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      return;
    }
    const silBtn = e.target.closest("[data-ani-sil]");
    if (silBtn) { aniSil(silBtn.dataset.aniSil); return; }
    const foto = e.target.closest("[data-ani-foto]");
    if (foto && foto.tagName === "IMG" && !foto.classList.contains("ani-foto-bekliyor")) { aniFotoBuyut(foto.getAttribute("src")); return; }
  });
}

/* ---------------- ANILAR SEKMESİ (tüm Birlikte yapımların anılarının tek zaman tüneli) ---------------- */
// "Birlikte" sekmesiyle aynı desen: koda bağlı değilsek tanıtım + Bağlan butonu göster
function anilarSekmesiCiz() {
  if (!ortakKod) {
    listeAlani.innerHTML = `
      <div class="ortak-bilgi-kutu">
        <div class="ortak-bilgi-baslik">📖 Anılarımız</div>
        <p>Birlikte izlediğiniz yapımlara bıraktığınız notlar, fotoğraflar ve sesli
        notlar burada tek bir zaman tünelinde birleşir. Görmek için ortak koda bağlan.</p>
        <button class="ekleme-secenek-btn" data-ortak-baglan>Bağlan</button>
      </div>`;
    return;
  }

  // Daha önce yüklendiyse hemen göster, arka planda tazele
  const onbellekVar = aniAkisOnbellekKod === ortakKod && aniAkisTumListe.length;
  if (onbellekVar) aniAkisUygula();
  else listeAlani.innerHTML = "<div class='bilgi'>Yükleniyor...</div>";
  const buSekme = aktifSekme;
  const buKod = ortakKod;

  Promise.all(ortakListem.map(async (o) => {
    const snap = await aniKoleksiyon(o.key).get();
    return snap.docs.map((d) => aniNesne(d, o.key, o));
  })).then((tumu) => {
    if (aktifSekme !== buSekme || ortakKod !== buKod) return; // beklerken sekme/kod değiştiyse yazma
    aniAkisTumListe = [].concat(...tumu).sort((a, b) => (b.tarih || "").localeCompare(a.tarih || ""));
    aniAkisOnbellekKod = buKod;
    aniAkisUygula();
    aniEskileriTasi(aniAkisTumListe);
  }).catch((e) => {
    console.warn("Anı akışı yüklenemedi:", e);
    if (aktifSekme === buSekme && !onbellekVar) listeAlani.innerHTML = "<div class='ani-bos'>Anılar yüklenemedi.</div>";
  });
}

let aniAkisTumListe = [];    // fetch edilen tüm anılar (filtresiz)
let aniAkisOnbellekKod = null; // aniAkisTumListe hangi ortak koda ait (null → tazele)
let aniAkisMevcutListe = []; // ekranda o an gösterilen (filtrelenmiş) anılar — kart tıklamasında idx ile bulmak için

// Arama kutusundaki kelimeye göre anı notunda veya yapım adında eşleşenleri gösterir
function aniAkisUygula() {
  const kelime = (typeof kutu !== "undefined" && kutu.value.trim()) || "";
  const kucuk = kelime.toLocaleLowerCase("tr");
  const filtreli = !kucuk ? aniAkisTumListe : aniAkisTumListe.filter((a) =>
    (a.not || "").toLocaleLowerCase("tr").includes(kucuk) ||
    (a.oge.ad || "").toLocaleLowerCase("tr").includes(kucuk)
  );
  aniAkisCiz(filtreli, !!kucuk);
}

function aniAkisCiz(anilar, filtreliMi) {
  aniAkisMevcutListe = anilar;
  if (!anilar.length) {
    listeAlani.innerHTML = filtreliMi
      ? "<div class='ani-bos'>Aramanla eşleşen anı bulunamadı.</div>"
      : "<div class='ani-bos'>Henüz hiçbir yapıma anı eklenmedi. İlk anınızı bir yapımın detayından ekleyebilirsiniz 💛</div>";
    return;
  }
  listeAlani.innerHTML = "<div class='ani-liste'>" + anilar.map((a, i) => {
    const not = a.not ? `<div class="ani-not">${aniKacis(a.not)}</div>` : "";
    const yazan = aniYazanAdi(a.yazanUid);
    return `
      <div class="ani-kart ani-kart-tiklanabilir" data-ani-akis-idx="${i}">
        <div class="ani-kart-ust">
          <span class="ani-tarih">📅 ${aniTarihBicim(a.tarih)}</span>
          ${yazan ? `<span class="ani-yazan">✍️ ${yazan}</span>` : ""}
        </div>
        <div class="ani-akis-yapim">
          <img class="ani-akis-poster" src="${posterUrl(a.oge.poster)}" alt="" loading="lazy">
          ${a.oge.ad}
        </div>
        ${not}
        ${aniMedyaHTML(a, false)}
      </div>`;
  }).join("") + "</div>";
  aniMedyaGozle(listeAlani);
}

// Anılar sekmesindeki tıklamalar (liste.js'in ana listeAlani dinleyicisinden yönlendirilir).
// Kartın tamamı tıklanabilir → önce anının kendi detayı (büyütülmüş görünüm) açılır;
// oradan isteğe bağlı olarak yapıma geçilebilir. Ses kontrollerine tıklama kartı açmaz.
function anilarSekmesiTiklama(e) {
  if (e.target.closest("[data-ortak-baglan]")) { ortakKodModalAc(); return; }
  if (e.target.closest("audio")) return;
  const kart = e.target.closest("[data-ani-akis-idx]");
  if (!kart) return;
  const a = aniAkisMevcutListe[Number(kart.dataset.aniAkisIdx)];
  if (a) aniDetayAc(a);
}

/* ---- Anı detayı: akıştan bir anıya tıklayınca açılan büyütülmüş görünüm ---- */
const aniDetayModal = document.getElementById("aniDetayModal");
const aniDetayKapatBtn = document.getElementById("aniDetayKapatBtn");
const aniDetayIcerik = document.getElementById("aniDetayIcerik");
let aniDetayAcikOge = null; // { ...anı verisi, oge } — üstteki katmanda gösterilen anı

function aniDetayIcerikHTML(a) {
  const yazan = aniYazanAdi(a.yazanUid);
  const not = a.not ? `<div class="ani-not">${aniKacis(a.not)}</div>` : "";
  return `
    <div class="ani-kart-ust">
      <span class="ani-tarih">📅 ${aniTarihBicim(a.tarih)}</span>
      ${yazan ? `<span class="ani-yazan">✍️ ${yazan}</span>` : ""}
    </div>
    ${aniMedyaHTML(a, true)}
    ${not}
    <div class="ekleme-secenekler">
      <button class="ekleme-secenek-btn" data-ani-detay-git>🎬 ${a.oge.ad} yapımına git</button>
      <button class="ekleme-secenek-btn" data-ani-detay-duzenle>✏️ Düzenle</button>
      <button class="ekleme-secenek-btn" data-ani-detay-sil>🗑 Sil</button>
    </div>`;
}

function aniDetayAc(a) {
  if (!aniDetayModal || !aniDetayIcerik) return;
  aniDetayAcikOge = a;
  aniDetayIcerik.innerHTML = aniDetayIcerikHTML(a);
  aniDetayModal.style.display = "flex";
  aniMedyaYukle(a); // önizleme hemen, tam boy foto + sesler gelince yerine geçer
}

function aniDetayKapat() {
  if (aniDetayModal) aniDetayModal.style.display = "none";
  aniDetayAcikOge = null;
}

// "Düzenle": ilgili yapımın detayını açar ve mevcut anı formunu doğrudan onunla doldurur
async function aniDetayDuzenleyeGit(a) {
  if (!a) return;
  aniDetayKapat();
  await detayAc(a.oge.key, true, true);
  if (aniAcikKey !== a.oge.key) return;
  const mevcut = aniMevcutListe.find((x) => x.id === a.id);
  if (!mevcut) return;
  await aniMedyaYukle(mevcut);
  if (!_aniMedyaHazir(mevcut)) { alert("Anının fotoğraf/sesi yüklenemedi, internetini kontrol et."); return; }
  aniFormAc(mevcut);
  const sarmal = document.getElementById("aniFormSarmal");
  if (sarmal) sarmal.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function aniDetaydanSil(a) {
  if (!a) return;
  if (!confirm("Bu anıyı silmek istediğine emin misin?")) return;
  try {
    await aniBelgeSil(a.oge.key, a.id);
    aniAkisOnbellekKod = null;
  } catch (e) {
    console.warn("Anı silinemedi:", e);
    return;
  }
  aniDetayKapat();
  if (aktifSekme === "anilar") anilarSekmesiCiz();
}

if (aniDetayKapatBtn) aniDetayKapatBtn.addEventListener("click", aniDetayKapat);
if (aniDetayModal) {
  aniDetayModal.addEventListener("click", (e) => {
    if (e.target === aniDetayModal) { aniDetayKapat(); return; }
    if (e.target.closest("[data-ani-detay-git]")) {
      const a = aniDetayAcikOge;
      aniDetayKapat();
      if (a) detayAc(a.oge.key, true, true);
      return;
    }
    if (e.target.closest("[data-ani-detay-duzenle]")) { aniDetayDuzenleyeGit(aniDetayAcikOge); return; }
    if (e.target.closest("[data-ani-detay-sil]")) { aniDetaydanSil(aniDetayAcikOge); return; }
    const foto = e.target.closest("[data-ani-foto]");
    if (foto && foto.tagName === "IMG" && !foto.classList.contains("ani-foto-bekliyor")) aniFotoBuyut(foto.getAttribute("src"));
  });
}

// Anıyı kaydeden kişinin adı (UID → config.js'teki izinli sırayla ayarlar.js'teki isim1/isim2)
function aniYazanAdi(uid) {
  if (!uid || typeof IZINLI_UID_LISTESI === "undefined") return "";
  const idx = IZINLI_UID_LISTESI.indexOf(uid);
  if (idx === 0) return AYARLAR.isim1;
  if (idx === 1) return AYARLAR.isim2;
  return "";
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
