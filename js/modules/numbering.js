/* Numbering policy:
 * - Preview / template-switch must NEVER consume a number. Use peekNumber /
 *   peekNumberByCategory for display-only purposes.
 * - Reserve (increment) the counter ONLY when a document is actually issued
 *   (quota debit path), via nextNumber / nextNumberByCategory.
 *
 * Cross-tab race limitation: the counter lives in localStorage with a
 * read-modify-write cycle and no locking, so two tabs issuing at the same
 * moment can read the same sequence value and produce duplicate numbers.
 * For guaranteed uniqueness use a server-side sequence (e.g. Supabase RPC).
 */
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

/* Display-only preview: format the NEXT number without incrementing. */
export function peekNumber(prefix) {
  const store = load();
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const seq = (store[key] || 0) + 1;
  return `${key}-${String(seq).padStart(3, "0")}`;
}

/* generate nomor berdasarkan kategori (bukan template) */
export function nextNumberByCategory(category) {
  return nextNumber(getPrefix(category));
}

/* preview nomor berdasarkan kategori — tanpa increment (untuk template-switch/preview) */
export function peekNumberByCategory(category) {
  return peekNumber(getPrefix(category));
}
