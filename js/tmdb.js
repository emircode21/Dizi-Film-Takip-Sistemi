/* ---------------- TMDB İLE İLGİLİ AĞ İSTEKLERİ ---------------- */
/* Bu dosya sadece veri çeker, sayfada hiçbir şey çizmez. */

function posterUrl(path) {
  if (!path) {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='54' height='80'><rect width='100%' height='100%' fill='%23342d40'/></svg>";
  }
  return "https://images.weserv.nl/?url=image.tmdb.org/t/p/w200" + path;
}

async function tmdbAra(kelime) {
  const url = "https://api.themoviedb.org/3/search/multi"
    + "?api_key=" + API_KEY
    + "&language=tr-TR"
    + "&query=" + encodeURIComponent(kelime);

  const cevap = await fetch(url);
  const veri = await cevap.json();
  return (veri.results || []).filter(
    (x) => x.media_type === "movie" || x.media_type === "tv"
  );
}

async function sezonSayisiGetir(tvId) {
  try {
    const url = "https://api.themoviedb.org/3/tv/" + tvId + "?api_key=" + API_KEY + "&language=tr-TR";
    const cevap = await fetch(url);
    const veri = await cevap.json();
    return veri.number_of_seasons || 1;
  } catch (e) {
    return 1;
  }
}

// Bir sezonun bölüm sayısını VE her bölümün adı/yayın tarihini döner
async function bolumSayisiGetir(tvId, sezonNo) {
  try {
    const url = "https://api.themoviedb.org/3/tv/" + tvId + "/season/" + sezonNo + "?api_key=" + API_KEY + "&language=tr-TR";
    const cevap = await fetch(url);
    const veri = await cevap.json();
    const bolumler = (veri.episodes || []).map((b) => ({
      bolumNo: b.episode_number,
      ad: b.name,
      tarih: b.air_date,
    }));
    return { sayi: bolumler.length || 1, bolumler: bolumler };
  } catch (e) {
    return { sayi: 1, bolumler: [] };
  }
}

async function diziOzetiGetir(tvId) {
  try {
    const url = "https://api.themoviedb.org/3/tv/" + tvId + "?api_key=" + API_KEY + "&language=tr-TR";
    const cevap = await fetch(url);
    const veri = await cevap.json();
    return veri.overview || "";
  } catch (e) {
    return "";
  }
}

async function filmOzetiGetir(movieId) {
  try {
    const url = "https://api.themoviedb.org/3/movie/" + movieId + "?api_key=" + API_KEY + "&language=tr-TR";
    const cevap = await fetch(url);
    const veri = await cevap.json();
    return veri.overview || "";
  } catch (e) {
    return "";
  }
}

/* ---------------- ZENGİN DETAY (Faz 1) ---------------- */

// Küçük yardımcı: bir video listesinden YouTube fragmanının key'ini bulur
function _fragmanBul(videolar) {
  if (!videolar || !videolar.length) return null;
  // Önce "Trailer", yoksa "Teaser", yoksa ilk YouTube videosu
  const yt = videolar.filter((v) => v.site === "YouTube");
  const trailer = yt.find((v) => v.type === "Trailer") || yt.find((v) => v.type === "Teaser") || yt[0];
  return trailer ? trailer.key : null;
}

// Tek istekte kapsamlı detay çeker (tür, süre, oyuncu, yönetmen, fragman, puan, öneriler)
// + ayrı bir istekle Türkiye izleme sağlayıcıları. type: "tv" | "movie"
async function detayGetir(type, id) {
  const sonuc = {
    ozet: "", turler: [], sure: null, oyuncular: [], yonetmen: "",
    fragmanKey: null, saglayicilar: [], saglayiciLink: "", imdbId: null,
    tmdbPuan: null, oneriler: [],
  };

  try {
    const url = "https://api.themoviedb.org/3/" + type + "/" + id
      + "?api_key=" + API_KEY + "&language=tr-TR"
      + "&append_to_response=credits,videos,external_ids,recommendations";
    const veri = await (await fetch(url)).json();

    sonuc.ozet = veri.overview || "";
    sonuc.turler = (veri.genres || []).map((t) => t.name).slice(0, 3);
    sonuc.tmdbPuan = veri.vote_average ? Number(veri.vote_average.toFixed(1)) : null;
    sonuc.imdbId = (veri.external_ids && veri.external_ids.imdb_id) || veri.imdb_id || null;

    // Süre: film → runtime; dizi → bölüm başı süre
    if (type === "movie") {
      sonuc.sure = veri.runtime || null;
    } else {
      sonuc.sure = (veri.episode_run_time && veri.episode_run_time[0]) || null;
    }

    // Oyuncular (ilk 6)
    const cast = (veri.credits && veri.credits.cast) || [];
    sonuc.oyuncular = cast.slice(0, 6).map((k) => ({
      ad: k.name, karakter: k.character || "", foto: k.profile_path,
    }));

    // Yönetmen / yaratıcı
    if (type === "movie") {
      const crew = (veri.credits && veri.credits.crew) || [];
      const yon = crew.find((k) => k.job === "Director");
      sonuc.yonetmen = yon ? yon.name : "";
    } else {
      sonuc.yonetmen = (veri.created_by || []).map((k) => k.name).join(", ");
    }

    // Fragman (önce tr-TR videoları)
    let fragman = _fragmanBul(veri.videos && veri.videos.results);
    if (!fragman) {
      // tr'de yoksa en-US videoları ayrıca dene
      try {
        const enUrl = "https://api.themoviedb.org/3/" + type + "/" + id
          + "/videos?api_key=" + API_KEY + "&language=en-US";
        const enVeri = await (await fetch(enUrl)).json();
        fragman = _fragmanBul(enVeri.results);
      } catch (e) { /* yoksay */ }
    }
    sonuc.fragmanKey = fragman;

    // Öneriler (ilk 10)
    const oner = (veri.recommendations && veri.recommendations.results) || [];
    sonuc.oneriler = oner.slice(0, 10).map((x) => ({
      tmdbId: x.id,
      type: x.media_type || type,
      ad: x.title || x.name || "",
      yil: (x.release_date || x.first_air_date || "").slice(0, 4),
      poster: x.poster_path,
      puan: x.vote_average ? Number(x.vote_average.toFixed(1)) : null,
    }));
  } catch (e) {
    // detay çekilemezse boş sonuç döner, uygulama kırılmaz
  }

  // İzleme sağlayıcıları (Türkiye) — ayrı istek
  try {
    const spUrl = "https://api.themoviedb.org/3/" + type + "/" + id
      + "/watch/providers?api_key=" + API_KEY;
    const spVeri = await (await fetch(spUrl)).json();
    const tr = spVeri.results && spVeri.results.TR;
    if (tr) {
      sonuc.saglayiciLink = tr.link || "";
      // flatrate (abonelik) öncelikli; yoksa kiralık/satın alma
      const liste = tr.flatrate || tr.rent || tr.buy || [];
      sonuc.saglayicilar = liste.slice(0, 6).map((s) => ({
        ad: s.provider_name, logo: s.logo_path,
      }));
    }
  } catch (e) { /* yoksay */ }

  return sonuc;
}

// OMDb ile gerçek IMDb puanı (anahtar yoksa null döner)
async function imdbPuanGetir(imdbId) {
  if (!OMDB_KEY || !imdbId) return null;
  try {
    const url = "https://www.omdbapi.com/?apikey=" + OMDB_KEY + "&i=" + imdbId;
    const veri = await (await fetch(url)).json();
    if (veri && veri.imdbRating && veri.imdbRating !== "N/A") {
      return veri.imdbRating; // "8.4" gibi string
    }
    return null;
  } catch (e) {
    return null;
  }
}

/* ---------------- KEŞİF / SÜRPRİZ (Faz 2) ---------------- */

// Tür listesini getirir (önbellekli). type: "movie" | "tv" → [{id, ad}]
const _turOnbellek = {};
async function turleriGetir(type) {
  if (_turOnbellek[type]) return _turOnbellek[type];
  try {
    const url = "https://api.themoviedb.org/3/genre/" + type + "/list"
      + "?api_key=" + API_KEY + "&language=tr-TR";
    const veri = await (await fetch(url)).json();
    const liste = (veri.genres || []).map((t) => ({ id: t.id, ad: t.name }));
    _turOnbellek[type] = liste;
    return liste;
  } catch (e) {
    return [];
  }
}

// Kişi (oyuncu/yönetmen) arar → [{id, ad, foto}]
async function kisiAra(isim) {
  try {
    const url = "https://api.themoviedb.org/3/search/person"
      + "?api_key=" + API_KEY + "&language=tr-TR"
      + "&query=" + encodeURIComponent(isim);
    const veri = await (await fetch(url)).json();
    return (veri.results || []).slice(0, 6).map((k) => ({
      id: k.id, ad: k.name, foto: k.profile_path,
    }));
  } catch (e) {
    return [];
  }
}

// TMDB ile filtreli keşif. { type, turId, kisiId, minPuan }
// Döndürür: TMDB arama biçiminde öğe dizisi (media_type dahil).
// Not: dizi keşfinde TMDB with_people'ı yok saydığı için, kişi seçiliyse
// kişinin gerçek filmografisini (credits) çekip istemcide filtreliyoruz.
async function kesfet({ type, turId, kisiId, minPuan }) {
  const minP = minPuan ? Number(minPuan) : 0;
  const turSayi = turId ? Number(turId) : null;

  try {
    let ham;

    if (kisiId) {
      // Kişinin filmografisi (oyuncu + ekip/yönetmen), tekilleştirilmiş
      const url = "https://api.themoviedb.org/3/person/" + kisiId + "/"
        + type + "_credits?api_key=" + API_KEY + "&language=tr-TR";
      const veri = await (await fetch(url)).json();
      const hepsi = [].concat(veri.cast || [], veri.crew || []);
      const gorulen = new Set();
      ham = hepsi.filter((x) => {
        if (gorulen.has(x.id)) return false;
        gorulen.add(x.id);
        return true;
      });
    } else {
      // Kişi yoksa Discover (sunucu tarafı filtreleme)
      let url = "https://api.themoviedb.org/3/discover/" + type
        + "?api_key=" + API_KEY + "&language=tr-TR"
        + "&sort_by=vote_count.desc&vote_count.gte=200&include_adult=false";
      if (minP) url += "&vote_average.gte=" + minP;
      if (turSayi) url += "&with_genres=" + turSayi;
      const veri = await (await fetch(url)).json();
      ham = veri.results || [];
    }

    // Ortak filtreler (her iki yolda da güvenceye al)
    const suzulmus = ham.filter((x) => {
      if ((x.vote_count || 0) < 200) return false;          // yeterince bilinen
      if (minP && (x.vote_average || 0) < minP) return false; // en az puan
      if (turSayi && !(x.genre_ids || []).includes(turSayi)) return false; // tür
      return true;
    });

    return suzulmus.map((x) => ({
      media_type: type,
      id: x.id,
      name: x.name,
      title: x.title,
      poster_path: x.poster_path,
      first_air_date: x.first_air_date,
      release_date: x.release_date,
      vote_average: x.vote_average,
    }));
  } catch (e) {
    return [];
  }
}
