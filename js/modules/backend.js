import { isRemote } from "../config.js";
import * as local from "./credit-ledger.js";

export { isRemote };

let sb = null;

export async function init() {
  if (!isRemote() || sb) return sb;
  const { createClient } = await import(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
  );
  sb = createClient(
    (await import("../config.js")).SUPABASE_URL,
    (await import("../config.js")).SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true } }
  );
  return sb;
}

export function client() {
  return sb;
}

// ---------- auth ----------

export async function getSession() {
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session ?? null;
}

export async function getUser() {
  const s = await getSession();
  return s?.user ?? null;
}

export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUp(email, password, fullName) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (sb) await sb.auth.signOut();
}

export function onAuthChange(cb) {
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/* Wewenang admin untuk UI (mis. memunculkan panel approval).
   Memakai RPC publik `is_admin()` yang sudah ada di database — SECURITY DEFINER,
   membaca profiles.role milik sesi aktif. Jadi tidak ada keputusan wewenang di
   sisi klien; ini hanya untuk menentukan apa yang ditampilkan.
   Gagal = anggap bukan admin (fail closed). */
export async function isAdminUser() {
  if (!sb) return false;
  const user = await getUser();
  if (!user) return false;
  const { data, error } = await sb.rpc("is_admin");
  if (error) {
    console.warn("cek wewenang admin gagal", error.message);
    return false;
  }
  return data === true;
}

// ---------- billing ----------

export async function billingState() {
  if (!sb) {
    return { credits: local.creditsLeft(), trialCredits: local.creditsLeft(), balance: 0 };
  }
  const user = await getUser();
  if (!user) return { credits: 0, trialCredits: 0, balance: 0 };
  const { data, error } = await sb
    .from("ledger_accounts")
    .select("credits, trial_credits, balance")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return {
    credits: Number(data?.credits) || 0,
    trialCredits: Number(data?.trial_credits) || 0,
    balance: Number(data?.balance) || 0,
  };
}

export async function creditsLeft() {
  const state = await billingState();
  return state.credits;
}

export async function nextDocumentNumber(category) {
  if (!sb) return null;
  const user = await getUser();
  if (!user) throw new Error("Login diperlukan untuk membuat nomor dokumen cloud.");
  const { data, error } = await sb.rpc("next_document_number", {
    p_category: category,
  });
  if (error) throw error;
  if (typeof data !== "string" || !data) {
    throw new Error("Server tidak mengembalikan nomor dokumen.");
  }
  return data;
}

export async function tryDebit(ref, category, template, documentData) {
  if (!sb) return local.tryDebit(ref, category);
  const user = await getUser();
  if (!user) return false;
  if (!template || !documentData || typeof documentData !== "object") {
    throw new Error("Data template dokumen tidak lengkap.");
  }
  const { data, error } = await sb.rpc("issue_document", {
    p_ref: ref,
    p_category: category || null,
    p_template: template,
    p_data: documentData,
  });
  if (error) throw error;
  return data === true;
}

export async function history() {
  if (!sb) return local.requestHistory();
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from("credit_transactions")
    .select("created_at, delta, ref, credits_after, reason, category, trial_delta, trial_after, balance_delta, balance_after")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    at: r.created_at,
    amount: ["topup", "issue"].includes(r.reason) ? Number(r.balance_delta) || 0
      : Number(r.trial_delta) || Number(r.delta) || 0,
    reason: r.reason || "",
    ref: r.ref || "",
    category: r.category || "",
    sisa: ["topup", "issue"].includes(r.reason) ? r.balance_after : (r.trial_after ?? r.credits_after),
    balanceAfter: r.balance_after,
    trialAfter: r.trial_after,
  }));
}

export async function createTopup(pkg) {
  if (!sb) return local.requestTopUp(pkg);
  if (!pkg?.id) throw new Error("Paket top-up tidak valid.");
  const { data, error } = await sb.rpc("request_topup", {
    p_package_id: pkg.id,
  });
  if (error) throw error;
  return {
    id: data,
    packageId: pkg.id,
    price: Number(pkg.price) || 0,
    balance_amount: Number(pkg.balance_amount ?? pkg.price) || 0,
    credits: Number(pkg.credits) || 0,
    status: "pending",
  };
}

export async function pendingTopup() {
  if (!sb) return local.pendingRequest();
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from("topup_requests")
    .select("code, credits, price, balance_amount, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.code,
    price: data.price,
    credits: data.credits,
    balance_amount: data.balance_amount ?? data.price,
    status: data.status,
    at: data.created_at,
  };
}

export async function cancelTopup(code) {
  if (!sb) return local.cancelPending();
  const { data, error } = await sb.rpc("cancel_topup", { p_code: code });
  if (error) throw error;
  return data === true;
}

// ---------- categories & packages ----------

let _categories = null;
let _packages = null;

export async function getCategories(force) {
  if (_categories && !force) return _categories;
  if (!sb) {
    _categories = LOCAL_CATEGORIES;
    return _categories;
  }
  const { data, error } = await sb.rpc("get_categories");
  if (error) throw error;
  _categories = data ?? [];
  return _categories;
}

export async function getPackages(force) {
  if (_packages && !force) return _packages;
  if (!sb) {
    _packages = local.PACKAGES.map((p, i) => ({
      id: ["starter", "bisnis", "pro"][i] || `pkg${i}`,
      label: `${p.credits} dokumen`,
      credits: p.credits,
      price: p.price,
    }));
    return _packages;
  }
  const { data, error } = await sb.rpc("get_packages");
  if (error) throw error;
  _packages = data ?? [];
  return _packages;
}

export function getCategoryMeta(categories, id) {
  return (categories || []).find((c) => c.id === id) || null;
}

/* fallback lokal (tanpa Supabase) — kategori default */
const LOCAL_CATEGORIES = [
  { id: "finance",     label: "Finance",     icon: "💰", color: "#16324F", price_per_doc: 1000, prefix: "FIN", active: true, sort_order: 1 },
  { id: "legal",       label: "Legal",       icon: "⚖️", color: "#4A3B7A", price_per_doc: 2000, prefix: "LEG", active: true, sort_order: 2 },
  { id: "umkm",        label: "UMKM",        icon: "🏪", color: "#0E7C6B", price_per_doc: 500,  prefix: "UMK", active: true, sort_order: 3 },
  { id: "logistik",    label: "Logistik",    icon: "📦", color: "#B45309", price_per_doc: 500,  prefix: "LOG", active: true, sort_order: 4 },
  { id: "pajak",       label: "Pajak",       icon: "🧾", color: "#A4291F", price_per_doc: 1500, prefix: "PKT", active: true, sort_order: 5 },
  { id: "proyek",      label: "Proyek",      icon: "🏗️", color: "#2D6A4F", price_per_doc: 1500, prefix: "PRJ", active: true, sort_order: 6 },
  { id: "operasional", label: "Operasional", icon: "📋", color: "#475569", price_per_doc: 750,  prefix: "OPS", active: true, sort_order: 7 },
];

// ---------- invoices (cloud sync) ----------

export async function saveInvoice(state) {
  // Issued documents are immutable from the draft autosync path.
  // issue_document() already persists the final document atomically with billing.
  // Skipping issued states prevents a delayed autosync from overwriting issued data.
  if (!sb || !state?.number || state.issued || state._serverNumberRequired) return;
  const user = await getUser();
  if (!user) throw new Error("Sesi login tidak tersedia untuk sinkronisasi draft.");
  const { error } = await sb.from("invoices").upsert(
    {
      user_id: user.id,
      template: state.template || "",
      number: state.number,
      status: "draft",
      verify_code: state.verify || "",
      data: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,number" }
  );
  if (error) throw error;
}

// ---------- admin ----------

async function fetchProfileMap() {
  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, email, role");
  if (error) throw error;
  const map = {};
  for (const p of data ?? []) map[p.id] = p;
  return map;
}

export async function adminPending() {
  const [reqRes, profMap] = await Promise.all([
    sb.from("topup_requests")
      .select("code, credits, price, status, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(50),
    fetchProfileMap(),
  ]);
  if (reqRes.error) throw reqRes.error;
  return (reqRes.data ?? []).map((r) => {
    const p = profMap[r.user_id];
    return { ...r, profiles: p ? { full_name: p.full_name, role: p.role } : null };
  });
}

export async function approveTopup(code) {
  const { data, error } = await sb.rpc("approve_topup", { p_code: code });
  if (error) throw error;
  return data === true;
}

export async function rejectTopup(code) {
  const { data, error } = await sb.rpc("reject_topup", { p_code: code });
  if (error) throw error;
  return data === true;
}

export async function adminUsers() {
  const [profRes, ledRes] = await Promise.all([
    sb.from("profiles").select("id, full_name, email, role, created_at"),
    sb.from("ledger_accounts").select("user_id, credits"),
  ]);
  if (profRes.error) throw profRes.error;
  if (ledRes.error) throw ledRes.error;
  const ledMap = {};
  for (const l of ledRes.data ?? []) ledMap[l.user_id] = l.credits;
  return (profRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.full_name || "-",
    email: u.email || "-",
    role: u.role,
    created: u.created_at,
    credits: ledMap[u.id] ?? 0,
  }));
}

export async function setRole(userId, role) {
  const { error } = await sb.rpc("set_role", { p_user_id: userId, p_role: role });
  if (error) throw error;
}

export async function adjustCredits(userId, delta, note) {
  const { error } = await sb.rpc("adjust_credits", {
    p_user_id: userId,
    p_delta: delta,
    p_note: note || "",
  });
  if (error) throw error;
}

export async function adminTransactions() {
  const [txRes, profMap] = await Promise.all([
    sb.from("credit_transactions")
      .select("created_at, delta, reason, ref, credits_after, user_id")
      .order("created_at", { ascending: false })
      .limit(30),
    fetchProfileMap(),
  ]);
  if (txRes.error) throw txRes.error;
  return (txRes.data ?? []).map((t) => {
    const p = profMap[t.user_id];
    return { ...t, profiles: p ? { full_name: p.full_name } : null };
  });
}

export async function adminStats() {
  const [users, txs, pending] = await Promise.all([
    sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("invoices").select("id", { count: "exact", head: true }),
    sb.from("topup_requests").select("code", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return {
    users: users.count ?? 0,
    invoices: txs.count ?? 0,
    pending: pending.count ?? 0,
  };
}

/* Jumlah top-up menunggu — dipakai badge auto-refresh. Hanya membaca. */
export async function adminPendingCount() {
  const { count, error } = await sb
    .from("topup_requests")
    .select("code", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

/* Buku besar top-up untuk screening keuangan (semua status, terbaru dulu).
   Hanya membaca kolom yang perlu; agregasi per periode dihitung di klien.
   Sumber pemasukan = price pada baris berstatus "approved". */
export async function topupLedger(limit = 2000) {
  const { data, error } = await sb
    .from("topup_requests")
    .select("code, credits, price, status, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
