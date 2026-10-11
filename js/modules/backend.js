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

export async function creditsLeft() {
  if (!sb) return local.creditsLeft();
  const user = await getUser();
  if (!user) return 0;
  const { data, error } = await sb
    .from("ledger_accounts")
    .select("credits")
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data?.credits ?? 0;
}

export async function tryDebit(ref) {
  if (!sb) return local.tryDebit(ref);
  const user = await getUser();
  if (!user) return false;
  const { data, error } = await sb.rpc("issue_document", { p_ref: ref });
  if (error) throw error;
  return data === true;
}

export async function history() {
  if (!sb) return local.requestHistory();
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from("credit_transactions")
    .select("created_at, delta, ref, credits_after")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    at: r.created_at,
    amount: r.delta,
    ref: r.ref || "",
    sisa: r.credits_after,
  }));
}

export async function createTopup(pkg) {
  if (!sb) return local.requestTopUp(pkg);
  const { data, error } = await sb.rpc("request_topup", {
    p_credits: pkg.credits,
    p_price: pkg.price,
  });
  if (error) throw error;
  return { id: data, price: pkg.price, credits: pkg.credits, status: "pending" };
}

export async function pendingTopup() {
  if (!sb) return local.pendingRequest();
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from("topup_requests")
    .select("code, credits, price, status, created_at")
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

// ---------- invoices (cloud sync) ----------

export async function saveInvoice(state) {
  if (!sb || !state?.number) return;
  const user = await getUser();
  if (!user) return;
  await sb.from("invoices").upsert(
    {
      user_id: user.id,
      template: state.template || "",
      number: state.number,
      status: state.issued ? "issued" : "draft",
      verify_code: state.verify || "",
      data: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,number" }
  );
}

// ---------- admin ----------

export async function adminPending() {
  const { data, error } = await sb
    .from("topup_requests")
    .select("code, credits, price, status, created_at, user_id, profiles:user_id ( full_name, role )")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
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
  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, email, role, created_at, ledger:user_id ( credits )");
  if (error) throw error;
  return (data ?? []).map((u) => ({
    id: u.id,
    name: u.full_name || "-",
    email: u.email || "-",
    role: u.role,
    created: u.created_at,
    credits: u.ledger?.credits ?? 0,
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
  const { data, error } = await sb
    .from("credit_transactions")
    .select("created_at, delta, reason, ref, credits_after, user_id, profiles:user_id ( full_name )")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
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
