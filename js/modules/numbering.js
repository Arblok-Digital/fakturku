const KEY = "fakturku:numbering";

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
