/* Ledger lokal (mode tanpa Supabase) — SENGAJA dibuat meniru server:
   trial dokumen + saldo Rupiah + daftar kategori yang sudah dibuka.
   Sumber kebenaran tetap server; file ini hanya fallback offline. */
const KEY = "fakturku:ledger:v2";
const SECRET = "FakturKuSecret2026";

/* Owner: ganti nomor kontak di bawah sebelum rilis ke user */
export const CONTACT = "089508053795";

export const TRIAL_CREDITS = 10;

/* Paket top-up lokal disamakan dengan tabel `packages` di server (Rp15.000/40.000/85.000). */
export const PACKAGES = [
  { id: "starter", label: "Starter", balance_amount: 15000, price: 15000 },
  { id: "bisnis",  label: "Bisnis",  balance_amount: 40000, price: 40000 },
  { id: "pro",     label: "Pro",     balance_amount: 85000, price: 85000 },
];

/* Harga paket "semua kategori" — harus sama dengan public.billing_settings.all_categories_price. */
export const UNLOCK_ALL_PRICE = 129000;

function fresh() {
  return {
    trial: TRIAL_CREDITS,
    balance: 0,
    unlocks: [],
    requests: [],
    history: [{ at: new Date().toISOString(), reason: "trial", amount: TRIAL_CREDITS, sisa: TRIAL_CREDITS, ref: "TRIAL" }],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const l = JSON.parse(raw);
      if (l && typeof l.trial === "number" && Array.isArray(l.requests)) {
        if (!Array.isArray(l.history)) l.history = [];
        if (!Array.isArray(l.unlocks)) l.unlocks = [];
        if (typeof l.balance !== "number") l.balance = 0;
        return l;
      }
    }
  } catch { /* jatuh ke data baru */ }
  const f = fresh();
  save(f);
  return f;
}

function save(l) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); }
  catch (e) { console.warn("ledger save gagal", e); }
}

function note(l, reason, amount, sisa, ref, category) {
  l.history.push({ at: new Date().toISOString(), reason, amount, sisa, ref: ref || "", category: category || "" });
}

export function billingState() {
  const l = load();
  return { credits: l.trial, trialCredits: l.trial, balance: l.balance };
}

export function creditsLeft() {
  return load().trial;
}

export function unlocks() {
  return load().unlocks.slice();
}

export function requestHistory() {
  return load().history;
}

/* Debit saat dokumen pertama kali diterbitkan (print/share).
   Urutan aturan sama dengan server issue_document:
   kategori dibuka -> gratis · harga 0 (tier A) -> gratis · trial -> saldo.
   Re-print / re-share dokumen yang sama tetap gratis (dicek pemanggil). */
export function tryDebit(ref, category, price) {
  const l = load();
  const cat = String(category || "");
  const p = Number(price) || 0;

  if (l.unlocks.indexOf(cat) >= 0) {
    note(l, "unlock_issue", 0, l.trial, ref, cat);
  } else if (p <= 0) {
    note(l, "free_issue", 0, l.trial, ref, cat);
  } else if (l.trial > 0) {
    l.trial -= 1;
    note(l, "trial_issue", -1, l.trial, ref, cat);
  } else if (l.balance >= p) {
    l.balance -= p;
    note(l, "issue", -p, l.balance, ref, cat);
  } else {
    return false;
  }
  save(l);
  return true;
}

export function unlockCategory(category, price) {
  const l = load();
  const cat = String(category || "");
  const p = Number(price) || 0;
  if (l.unlocks.indexOf(cat) >= 0) return { ok: true, already: true, balance: l.balance };
  if (p <= 0) return { ok: false, reason: "no_price", balance: l.balance };
  if (l.balance < p) return { ok: false, reason: "insufficient", price: p, balance: l.balance };
  l.balance -= p;
  l.unlocks.push(cat);
  note(l, "unlock_category", -p, l.balance, cat, cat);
  save(l);
  return { ok: true, price: p, balance: l.balance };
}

export function unlockAllCategories(categories, price) {
  const l = load();
  const p = Number(price) || 0;
  const targets = (categories || [])
    .filter((c) => c.active !== false && Number(c.unlock_price) > 0)
    .map((c) => c.id)
    .filter((id) => l.unlocks.indexOf(id) < 0);

  if (!targets.length) return { ok: true, already: true, balance: l.balance };
  if (p <= 0) return { ok: false, reason: "no_price", balance: l.balance };
  if (l.balance < p) return { ok: false, reason: "insufficient", price: p, balance: l.balance };

  l.balance -= p;
  for (const id of targets) l.unlocks.push(id);
  note(l, "unlock_all", -p, l.balance, "all_categories", "");
  save(l);
  return { ok: true, price: p, balance: l.balance };
}

export function adminCode(requestId) {
  let h = 5381;
  const s = String(requestId) + "|" + SECRET;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

export function pendingRequest() {
  return load().requests.find((r) => r.status === "pending") || null;
}

export function cancelPending() {
  const l = load();
  l.requests = l.requests.filter((r) => r.status !== "pending");
  save(l);
}

export function requestTopUp(pkg) {
  const l = load();
  if (l.requests.some((r) => r.status === "pending")) return pendingRequest();
  const rec = {
    id: "FKT-" + Date.now().toString(36).toUpperCase().slice(-6),
    balance_amount: Number(pkg.balance_amount ?? pkg.price) || 0,
    price: Number(pkg.price) || 0,
    status: "pending",
    at: new Date().toISOString(),
  };
  l.requests.push(rec);
  save(l);
  return rec;
}

export function redeem(code) {
  const l = load();
  const c = String(code || "").trim().toUpperCase();
  const req = l.requests.find((r) => r.status === "pending" && adminCode(r.id) === c);
  if (!req) return false;
  req.status = "fulfilled";
  req.fulfilledAt = new Date().toISOString();
  const amount = Number(req.balance_amount ?? req.price) || 0;
  l.balance += amount;
  note(l, "topup", amount, l.balance, req.id, "");
  save(l);
  return true;
}
