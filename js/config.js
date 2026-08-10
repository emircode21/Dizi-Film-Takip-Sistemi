/* TMDB API anahtarı — public repoda herkese görünür, TMDB bu tür anahtarları
   tarayıcı tarafında kullanmak için tasarlıyor, ödeme/kredi kartı bilgisi içermiyor. */
const API_KEY = "39b78a1d396b1cfa373400eda1856126";

/* OMDb anahtarı — detay ekranında gerçek IMDb puanını göstermek için (omdbapi.com, ücretsiz).
   Boş bırakılırsa IMDb puanı sessizce gizlenir, uygulama sorunsuz çalışır. */
const OMDB_KEY = "a2197e2e";

/* Firebase (Firestore) bağlantı bilgileri — "Birlikte İzlenenler" ortak listesi için.
   Bu apiKey de herkese açık görünür ve normaldir; Firebase'de gerçek güvenlik bu
   anahtarı gizlemekle değil, konsoldaki "Rules" (kurallar) ile sağlanır. */
const firebaseConfig = {
  apiKey: "AIzaSyDgNciXocQ55vf8N_C75W6YN8dx9KhoL3s",
  authDomain: "dizi-film-takip.firebaseapp.com",
  projectId: "dizi-film-takip",
  storageBucket: "dizi-film-takip.firebasestorage.app",
  messagingSenderId: "364221872880",
  appId: "1:364221872880:web:029da94ef333642c59a035",
};

/* Uygulamaya girebilecek Google hesaplarının UID'leri. Bu liste bir gizlilik
   önlemi değil (UID zaten hassas bilgi sayılmaz) — gerçek erişim kontrolü
   firestore.rules'ta aynı listeyle yapılıyor, ikisi birbirini tamamlıyor.
   İlk girişte hesap.js ekrana UID'ni yazar; onu buraya ve firestore.rules'a
   ekleyip Firebase konsolundan kuralları yayınla. */
const IZINLI_UID_LISTESI = [
  // "BURAYA_ILK_UID",
  // "BURAYA_IKINCI_UID",
];
