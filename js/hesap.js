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

auth.onAuthStateChanged((kullanici) => {
  if (!kullanici) {
    document.body.classList.add("kilitli");
    girisEkraniniCiz("bekleniyor");
    return;
  }
  if (!IZINLI_UID_LISTESI.includes(kullanici.uid)) {
    document.body.classList.add("kilitli");
    girisEkraniniCiz("yetkisiz", kullanici.uid);
    return;
  }
  // Yetkili: kilidi kaldır, uygulama görünür olsun
  document.body.classList.remove("kilitli");
  if (girisEkrani) girisEkrani.style.display = "none";
});
