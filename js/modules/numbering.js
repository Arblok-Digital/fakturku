const KEY = "fakturku:numbering";

/* prefix per kategori (fallback ke template-based prefix) */
export const CATEGORY_PREFIX = {
  finance: "FIN",
  legal: "LEG",
  umkm: "UMK",
  logistik: "LOG",
  pajak: "PKT",
  proyek: "PRJ",
  operasional: "OPS",
};

export function getPrefix(category) {
  return CATEGORY_PREFIX[category] || "FKT";
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

function save(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)); }
  catch (e) { console.warn("numbering save gagal", e); }
}

export function nextNumber(prefix) {
  const store = load();
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const seq = (store[key] || 0) + 1;
  store[key] = seq;
  save(store);
  return `${key}-${String(seq).padStart(3, "0")}`;
}

/* generate nomor berdasarkan kategori (bukan template) */
export function nextNumberByCategory(category) {
  return nextNumber(getPrefix(category));
}
