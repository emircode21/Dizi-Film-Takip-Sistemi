/* ---------------- HAFIZA (localStorage) ---------------- */
function kaydet() {
  try {
    localStorage.setItem("izleme_listem", JSON.stringify(listem));
  } catch (e) {}
}
function yukle() {
  try {
    return JSON.parse(localStorage.getItem("izleme_listem")) || [];
  } catch (e) {
    return [];
  }
}
