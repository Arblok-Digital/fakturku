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

// ---------- billing ----------

export async function billingState() {
  if (!sb) return local.billingState();
  const user = await getUser();
  if (!user) return { trialCredits: 0, balance: 0 };
  const { data, error } = await sb.rpc("get_my_billing");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    trialCredits: Number(row?.trial_credits) || 0,
    balance: Number(row?.balance) || 0,
  };
}

export async function tryDebit(ref, category, state) {
  if (!sb) return local.tryDebit(ref, category);
  const user = await getUser();
  if (!user) return false;
  const { data, error } = await sb.rpc("issue_document", {
    p_ref: ref,
    p_category: category || null,
    p_template: state?.template || "",
    p_data: state || {},
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
    .select("created_at, reason, ref, category, trial_delta, trial_after, balance_delta, balance_after, delta, credits_after")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    at: r.created_at,
    reason: r.reason,
    category: r.category,
    ref: r.ref || "",
    trialDelta: Number(r.trial_delta) || 0,
    trialAfter: Number(r.trial_after) || 0,
    balanceDelta: Number(r.balance_delta) || 0,
    balanceAfter: Number(r.balance_after) || 0,
    legacyAmount: Number(r.delta) || 0,
    legacyAfter: r.credits_after,
  }));
}

/* Top-up via server: client hanya boleh mengirim package_id. */
export async function createTopup(pkgOrId) {
  // Normalisasi ke package_id resmi (satu-satunya yang dikirim ke server).
  let pid = typeof pkgOrId === "string" ? pkgOrId : (pkgOrId?.id ?? null);
  const matchLocalPkg = () => {
    if (pid) {
      return local.PACKAGES.find((p) => p.id === pid) || null;
    }
    if (pkgOrId && typeof pkgOrId === "object") {
      return (
        local.PACKAGES.find((p) => p.balance === pkgOrId.balance && p.price === pkgOrId.price) ??
        null
      );
    }
    return null;
  };
  if (!sb) {
    const pkg = matchLocalPkg();
    if (!pkg) throw new Error("paket tidak dikenal — hubungi admin");
    return local.requestTopUp(pkg);
  }
  if (!pid && pkgOrId && typeof pkgOrId === "object")
    pid = pkgOrId.id || null;
  if (!pid) throw new Error("paket tidak dikenal — hubungi admin");
  const { data, error } = await sb.rpc("request_topup", { p_package_id: pid });
  if (error) throw error;
  // The package amount and price are resolved by the server.
  const { data: row, error: rowErr } = await sb
    .from("topup_requests")
    .select("code, balance_amount, price, status, created_at")
    .eq("code", data)
    .single();
  if (rowErr) throw rowErr;
  return { id: row.code, balance: row.balance_amount, price: row.price, status: row.status, at: row.created_at };
}

export async function registerAdminPush(subscription) {
  if (!sb) throw new Error("notifikasi admin memerlukan koneksi Supabase");
  const { data, error } = await sb.rpc("save_admin_push_subscription", {
    p_subscription: subscription.toJSON(),
  });
  if (error) throw error;
  return data === true;
}

export async function unregisterAdminPush(endpoint) {
  if (!sb) throw new Error("notifikasi admin memerlukan koneksi Supabase");
  const { error } = await sb.rpc("remove_admin_push_subscription", {
    p_endpoint: endpoint,
  });
  if (error) throw error;
}

export async function notifyAdminTopup(code) {
  if (!sb) throw new Error("notifikasi admin memerlukan koneksi Supabase");
  const { data, error } = await sb.functions.invoke("notify-admin-topup", {
    body: { code },
  });
  if (error) throw error;
  return {
    delivered: Number(data?.delivered) || 0,
    duplicate: data?.duplicate === true,
  };
}

export async function pendingTopup() {
  if (!sb) return local.pendingRequest();
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from("topup_requests")
    .select("code, balance_amount, price, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.code,
    price: data.price,
    balance: data.balance_amount,
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
    _packages = local.PACKAGES.map((p) => ({
      id: p.id,
      label: p.label,
      balance: p.balance,
      price: p.price,
    }));
    return _packages;
  }
  const { data, error } = await sb.rpc("get_packages");
  if (error) throw error;
  _packages = (data ?? []).map((p) => ({
    ...p,
    balance: Number(p.balance_amount) || 0,
  }));
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
  if (!sb || !state?.number) return;
  const user = await getUser();
  if (!user) return;
  const { error } = await sb.from("invoices").upsert(
    {
      user_id: user.id,
      template: state.template || "",
      number: state.number,
      category: state.category || null,
      status: state.issued ? "issued" : "draft",
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
      .select("code, balance_amount, price, status, created_at, user_id")
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
    sb.from("ledger_accounts").select("user_id, trial_credits, balance"),
  ]);
  if (profRes.error) throw profRes.error;
  if (ledRes.error) throw ledRes.error;
  const ledMap = {};
  for (const l of ledRes.data ?? []) ledMap[l.user_id] = l;
  return (profRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.full_name || "-",
    email: u.email || "-",
    role: u.role,
    created: u.created_at,
    trialCredits: ledMap[u.id]?.trial_credits ?? 0,
    balance: ledMap[u.id]?.balance ?? 0,
  }));
}

export async function setRole(userId, role) {
  const { error } = await sb.rpc("set_role", { p_user_id: userId, p_role: role });
  if (error) throw error;
}

export async function adjustBalance(userId, delta, note) {
  const { error } = await sb.rpc("adjust_balance", {
    p_user_id: userId,
    p_delta: delta,
    p_note: note || "",
  });
  if (error) throw error;
}

export async function adminTransactions(limit = 30) {
  const [txRes, profMap] = await Promise.all([
    sb.from("credit_transactions")
      .select("created_at, delta, reason, ref, category, credits_after, trial_delta, trial_after, balance_delta, balance_after, user_id")
      .order("created_at", { ascending: false })
      .limit(limit),
    fetchProfileMap(),
  ]);
  if (txRes.error) throw txRes.error;
  return (txRes.data ?? []).map((t) => {
    const p = profMap[t.user_id];
    return { ...t, profiles: p ? { full_name: p.full_name } : null };
  });
}

export async function adminCashflow(days = 365) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [txRes, topupRes] = await Promise.all([
    sb.from("credit_transactions")
      .select("created_at, reason, ref, category, trial_delta, balance_delta, balance_after, user_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
    sb.from("topup_requests")
      .select("code, price, balance_amount, status, created_at, user_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  if (txRes.error) throw txRes.error;
  if (topupRes.error) throw topupRes.error;
  return {
    transactions: txRes.data ?? [],
    topups: topupRes.data ?? [],
  };
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
