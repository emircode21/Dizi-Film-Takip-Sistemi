function posterUrl(path) {
  if (!path) {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='54' height='80'><rect width='100%' height='100%' fill='%23342d40'/></svg>";
  }
  return "https://images.weserv.nl/?url=image.tmdb.org/t/p/w200" + path;
}

// Bir dizinin toplam kaç sezonu olduğunu TMDB'den öğrenir
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

// Belirli bir sezonun kaç bölüm olduğunu TMDB'den öğrenir
async function bolumSayisiGetir(tvId, sezonNo) {
  try {
    const url = "https://api.themoviedb.org/3/tv/" + tvId + "/season/" + sezonNo + "?api_key=" + API_KEY + "&language=tr-TR";
    const cevap = await fetch(url);
    const veri = await cevap.json();
    return (veri.episodes || []).length || 1;
  } catch (e) {
    return 1;
  }
}
