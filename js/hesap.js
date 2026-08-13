/* ---------------- HESAP / GİRİŞ DUVARI ----------------
   Uygulama yalnızca IZINLI_UID_LISTESI'ndeki (config.js) Google hesaplarına
   açık. Gerçek koruma firestore.rules'ta; burası sadece yabancı bir ziyaretçi
   siteyi açtığında boş bir uygulama yerine bir giriş ekranı görmesini sağlar.

   Kilit mekanizması: <body> varsayılan olarak "kilitli" sınıfıyla açılır
   (bkz. index.html), bu durumda #girisEkrani dışındaki her şey CSS ile
   gizlenir (bkz. stil.css). Yetkili giriş doğrulanınca sınıf kaldırılır. */

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const girisEkrani = document.getElementById("girisEkrani");
const girisIcerik = document.getElementById("girisIcerik");

function girisEkraniniCiz(durum, ekBilgi) {
  if (!girisIcerik) return;

  if (durum === "bekleniyor") {
    girisIcerik.innerHTML = `
      <div class="karsilama-kalp">${(typeof AYARLAR !== "undefined" && AYARLAR.kalp) || "🎬"}</div>
      <div class="karsilama-ad">${(typeof markaBasligi === "function" && markaBasligi()) || "CineMory"}</div>
      <p class="giris-aciklama">Bu uygulama özel — devam etmek için giriş yap.</p>
      <button id="googleGirisBtn" class="ekleme-secenek-btn giris-btn">Google ile Giriş Yap</button>
      <div id="girisHata" class="ortak-kod-hata" style="display:none"></div>`;
    document.getElementById("googleGirisBtn").addEventListener("click", girisYap);
    return;
  }

  if (durum === "yetkisiz") {
    girisIcerik.innerHTML = `
      <div class="karsilama-kalp">🔒</div>
      <div class="karsilama-ad">Bu uygulama özel</div>
      <p class="giris-aciklama">Bu hesap yetkili değil.</p>
      <p class="giris-uid">UID: <code>${ekBilgi}</code></p>
      <p class="giris-aciklama giris-ipucu">Bu senin hesabınsa, bu UID'yi <code>js/config.js</code>
        içindeki <code>IZINLI_UID_LISTESI</code>'ne ve <code>firestore.rules</code>'a ekleyip
        Firebase konsolundan kuralları yeniden yayınla.</p>
      <button id="cikisBtn" class="ekleme-secenek-btn ekleme-geri-btn">Çıkış yap</button>`;
    document.getElementById("cikisBtn").addEventListener("click", () => auth.signOut());
  }
}

async function girisYap() {
  const hataEl = document.getElementById("girisHata");
  try {
    if (hataEl) hataEl.style.display = "none";
    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  } catch (e) {
    if (hataEl) {
      hataEl.textContent = "Giriş yapılamadı. İnternetini kontrol edip tekrar dene.";
      hataEl.style.display = "block";
    }
    console.warn("Google girişi başarısız:", e);
  }
}

/* ---------------- HESABIM SEKMESİ ----------------
   Diğer birinci sınıf sekmeler gibi #listem'e çizilir (bkz. js/liste.js
   aktifSekme === "hesabim"). İstatistikler ve Ayarlar zaten var olan
   modalları açar; sadece giriş noktaları burada toplanır. */
function hesabimSekmesiCiz() {
  const k = auth.currentUser;
  if (!k) { listeAlani.innerHTML = ""; return; }

  const fotoHTML = k.photoURL
    ? `<img class="hesabim-avatar" src="${k.photoURL}" alt="">`
    : `<div class="hesabim-avatar hesabim-avatar-bos">${(k.displayName || "?")[0]}</div>`;

  listeAlani.innerHTML = `
    <div class="hesabim-satiri">
      ${fotoHTML}
      <div>
        <div class="hesabim-ad">${k.displayName || "İsimsiz"}</div>
        <div class="hesabim-email">${k.email || ""}</div>
      </div>
    </div>
    <p class="hesabim-durum">☁️ Kişisel listen buluta senkronize ediliyor.</p>

    <div class="ekleme-secenekler">
      <button class="ekleme-secenek-btn" data-hesabim-istatistik>📊 İstatistikler</button>
      <button class="ekleme-secenek-btn" data-hesabim-ayarlar>⚙️ Ayarlar</button>
    </div>

    <div class="detay-baslik-kucuk">Veri Yedekleme</div>
    <div class="ekleme-secenekler">
      <button class="ekleme-secenek-btn" data-hesabim-yedek-indir>💾 Yedeği indir</button>
      <button class="ekleme-secenek-btn" data-hesabim-yedek-yukle>📂 Yedekten geri yükle</button>
      <input id="hesabimYedekDosyaInput" type="file" accept="application/json" style="display:none">
    </div>

    <div class="ekleme-secenekler">
      <button class="ekleme-secenek-btn ekleme-geri-btn" data-hesabim-cikis>🚪 Çıkış yap</button>
    </div>`;

  const dosyaInput = document.getElementById("hesabimYedekDosyaInput");
  dosyaInput.addEventListener("change", () => {
    const dosya = dosyaInput.files[0];
    dosyaInput.value = "";
    if (!dosya || typeof depoYedekYukle !== "function") return;
    depoYedekYukle(dosya, (basarili) => {
      alert(basarili ? "Yedek geri yüklendi." : "Yedek dosyası okunamadı.");
    });
  });
}

// Hesabım sekmesindeki tıklamalar (liste.js'in ana listeAlani dinleyicisinden yönlendirilir)
function hesabimSekmesiTiklama(e) {
  if (e.target.closest("[data-hesabim-istatistik]")) {
    if (typeof istatistikAc === "function") istatistikAc();
    return;
  }
  if (e.target.closest("[data-hesabim-ayarlar]")) {
    if (typeof ayarlarAc === "function") ayarlarAc();
    return;
  }
  if (e.target.closest("[data-hesabim-yedek-indir]")) {
    if (typeof depoYedekIndir === "function") depoYedekIndir();
    return;
  }
  if (e.target.closest("[data-hesabim-yedek-yukle]")) {
    document.getElementById("hesabimYedekDosyaInput").click();
    return;
  }
  if (e.target.closest("[data-hesabim-cikis]")) {
    auth.signOut();
    return;
  }
}

auth.onAuthStateChanged(async (kullanici) => {
  if (!kullanici) {
    document.body.classList.add("kilitli");
    if (girisEkrani) girisEkrani.style.display = ""; // girişte "none" yapılmıştı, çıkışta geri aç
    girisEkraniniCiz("bekleniyor");
    return;
  }
  if (!IZINLI_UID_LISTESI.includes(kullanici.uid)) {
    document.body.classList.add("kilitli");
    girisEkraniniCiz("yetkisiz", kullanici.uid);
    return;
  }

  // Yetkili: kişisel listeyi buluta bağla/birleştir, sonra kilidi kaldır.
  // Kilit kaldırılmadan önce bitirdiği için kullanıcı yerel-önce/bulut-sonra
  // yanıp sönmesini hiç görmüyor.
  if (typeof depoBulutBaglan === "function") await depoBulutBaglan(kullanici.uid);
  if (typeof listeyiCiz === "function") listeyiCiz();

  document.body.classList.remove("kilitli");
  if (girisEkrani) girisEkrani.style.display = "none";
});
