const KEY = "fakturku:ledger";
const SECRET = "FakturKuSecret2026";

/* Owner: ganti nomor kontak di bawah sebelum rilis ke user */
export const CONTACT = "Hubungi admin — WhatsApp 0812-0000-0000";

export const PACKAGES = [
  { credits: 5, price: 50000 },
  { credits: 12, price: 100000 },
  { credits: 30, price: 250000 },
];

const TRIAL_CREDITS = 10;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const l = JSON.parse(raw);
      if (l && typeof l.credits === "number" && Array.isArray(l.requests)) {
        if (!Array.isArray(l.history)) l.history = [];
        return l;
      }
    }
  } catch { /* fallthrough */ }
  const fresh = {
    credits: TRIAL_CREDITS,
    requests: [],
    history: [{ at: new Date().toISOString(), amount: TRIAL_CREDITS, sisa: TRIAL_CREDITS, ref: "TRIAL" }],
  };
  try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch { /* ignore */ }
  return fresh;
}

function save(l) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); }
  catch (e) { console.warn("ledger save gagal", e); }
}

export function creditsLeft() {
  return load().credits;
}

export function requestHistory() {
  return load().history;
}

/* Debit 1 kuota saat dokumen pertama kali diterbitkan (print/share).
   Re-print / re-share dokumen yang sama tetap gratis. */
export function tryDebit(ref) {
  const l = load();
  if (l.credits <= 0) return false;
  l.credits -= 1;
  l.history.push({ at: new Date().toISOString(), amount: -1, sisa: l.credits, ref: ref || "" });
  save(l);
  return true;
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
    credits: pkg.credits,
    price: pkg.price,
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
  l.credits += req.credits;
  l.history.push({ at: req.fulfilledAt, amount: req.credits, sisa: l.credits, ref: req.id });
  save(l);
  return true;
}
