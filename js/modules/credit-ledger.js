import { PAYMENT_WHATSAPP } from "../config.js";

const KEY = "fakturku:ledger";

/* CATATAN KEAMANAN: semua enforcement lokal di file ini hanya UX
   convenience (localStorage mudah diubah via DevTools) dan gampang
   di-bypass. Yang otoritatif adalah RPC Supabase server-side
   (issue_document / request_topup / approve_topup). */

export const CONTACT =
  `WhatsApp +${PAYMENT_WHATSAPP.slice(0, 2)} ${PAYMENT_WHATSAPP.slice(2, 5)}-${PAYMENT_WHATSAPP.slice(5, 9)}-${PAYMENT_WHATSAPP.slice(9)}`;

export const PACKAGES = [
  { id: "starter", label: "Saldo Rp15.000", balance: 15000, price: 15000 },
  { id: "bisnis", label: "Saldo Rp40.000", balance: 40000, price: 40000 },
  { id: "pro", label: "Saldo Rp85.000", balance: 85000, price: 85000 },
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

export function billingState() {
  return { trialCredits: creditsLeft(), balance: 0 };
}

export function requestHistory() {
  return load().history;
}

/* Debit 1 kuota saat dokumen pertama kali diterbitkan (print/share).
   Re-print / re-share dokumen yang sama tetap gratis. */
export function tryDebit(ref, category) {
  const l = load();
  if (l.credits <= 0) return false;
  l.credits -= 1;
  l.history.push({
    at: new Date().toISOString(),
    amount: -1,
    sisa: l.credits,
    ref: ref || "",
    category: category || "",
  });
  save(l);
  return true;
}

/* DULU: adminCode() menghitung kode 6-digit deterministik (djb2 +
   SECRET hardcoded) di client — siapa pun bisa menempa kode top-up
   sendiri. Sekarang: client TIDAK PERNAH menerbitkan kode. Kode hanya
   dibuat server-side (RPC request_topup) dan di-approve via admin
   panel online. Stub ini gagal tertutup (fail closed). */
export function adminCode(_requestId) {
  throw new Error("hubungi admin — kode top-up hanya diterbitkan server (mode online).");
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
    id: "FKT-" + Date.now().toString(36).toUpperCase().slice(-6).padStart(6, "0"),
    balance: pkg.balance,
    price: pkg.price,
    status: "pending",
    at: new Date().toISOString(),
  };
  l.requests.push(rec);
  save(l);
  return rec;
}

/* Mode lokal = trial saja: permintaan dicatat sebagai pending, tapi
   pemenuhannya WAJIB via server (admin panel online). redeem() lokal
   dinonaktifkan — menerima kode di client sama dengan mencetak kuota
   sendiri. Selalu gagal tertutup; user diarahkan hubungi admin
   (lihat CONTACT). */
export function redeem(_code) {
  return false;
}
