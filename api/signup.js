// Endpoint pendaftaran FakturKu.
//
// Tujuan: Penyaringan email palsu + batas pendaftaran per IP.
// Semua keputusan risiko diambil di database (RPC signup_guard_check) supaya
// aturan tidak bisa dilewati dari sisi klien.
//
// Aturan (lihat supabase/migrations/20261020100000_signup_guard.sql):
//   - domain sekali pakai (mailinator, tempmail, ...)  -> DITOLAK
//   - alamat role di domain gratis (info@gmail.com)    -> DITOLAK
//   - pola acak (7+ digit berurutan)                    -> DITOLAK
//   - plus-addressing / domain saturated                -> DAFTAR tanpa kuota trial
//   - > 8 pendaftaran per IP per 24 jam                 -> DITOLAK
//   - > 300 pendaftaran per 24 jam (global)             -> DITOLAK
//
// Catatan: kuota trial user sah tetap 10 (tidak diubah).

const SUPABASE_URL = "https://pcydwlfyughwasyqglwq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWR3bGZ5dWdod2FzeXFnbHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjA3NTIsImV4cCI6MjEwNzI5Njc1Mn0.OdCmJBVCtC0t824Py-uKqA5GHcJF4pdvbNvGCv4n2oE"; // Public anon key; hanya untuk memanggil API publik Supabase.

const MAX_PER_MINUTE = 5;
const MAX_BODY_BYTES = 4096;
const requestCounts = new Map();

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function send(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

function clientIp(req) {
  const candidates = [
    req.headers["x-vercel-forwarded-for"],
    req.headers["x-real-ip"],
    String(req.headers["x-forwarded-for"] || "").split(",")[0],
  ];
  for (const c of candidates) {
    const v = String(c || "").trim();
    if (v) return v;
  }
  return "unknown";
}

function allowRequest(ip) {
  const now = Date.now();
  const current = requestCounts.get(ip);
  if (!current || now - current.start >= 60_000) {
    requestCounts.set(ip, { start: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_PER_MINUTE) return false;
  current.count += 1;
  return true;
}

function friendly(reason) {
  switch (reason) {
    case "domain_blocked":
      return "Email dari layanan sekali pakai tidak kami terima. Pakai email pribadi atau email kantor yang aktif.";
    case "role_address":
      return "Alamat email generik tidak bisa dipakai untuk pendaftaran. Pakai email utama kamu.";
    case "random_pattern":
      return "Format email ini tidak valid. Coba pakai email pribadi yang aktif.";
    case "invalid_email":
      return "Format email tidak valid. Periksa kembali alamat emailmu.";
    case "ip_rate_limited":
      return "Terlalu banyak pendaftaran dari perangkat ini. Coba lagi besok atau hubungi kami.";
    case "global_rate_limited":
      return "Pendaftaran sedang dibatasi sementara karena beban tinggi. Coba lagi nanti.";
    default:
      return "Pendaftaran belum bisa diproses. Coba lagi sebentar.";
  }
}

async function guardCheck(email, ip) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/signup_guard_check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ p_email: email, p_ip: ip }),
  });
  if (!res.ok) throw new Error("GUARD_UNAVAILABLE");
  const data = await res.json();
  return data && typeof data.allowed === "boolean" ? data : { allowed: false, reason: "guard_invalid" };
}

async function gotrueSignup(email, password, fullName) {
  const res = await fetch(SUPABASE_URL + "/auth/v1/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* biarkan null */ }
  return { status: res.status, ok: res.ok, json, raw: text };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Permintaan tidak didukung." });
  }

  const ip = clientIp(req);
  if (!allowRequest(ip)) {
    return send(res, 429, { code: "TOO_MANY_REQUESTS", error: "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi." });
  }

  const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  if (raw.length > MAX_BODY_BYTES) {
    return send(res, 413, { error: "Data pendaftaran terlalu besar." });
  }
  let body;
  try { body = JSON.parse(raw || "{}"); } catch { body = null; }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return send(res, 400, { error: "Data pendaftaran tidak terbaca. Muat ulang halaman lalu coba lagi." });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const fullName = String(body.fullName || "").trim().slice(0, 80);

  if (!EMAIL_RE.test(email)) {
    return send(res, 400, { code: "INVALID_EMAIL", error: "Format email tidak valid. Periksa kembali alamat emailmu." });
  }
  if (password.length < 8) {
    return send(res, 400, { code: "WEAK_PASSWORD", error: "Password minimal 8 karakter." });
  }

  // 1) cek aturan anti-penyalahgunaan (database)
  let guard;
  try {
    guard = await guardCheck(email, ip);
  } catch {
    return send(res, 503, { code: "GUARD_UNAVAILABLE", error: "Pendaftaran sedang tidak tersedia. Coba lagi sebentar." });
  }
  if (!guard.allowed) {
    return send(res, 400, { code: "SIGNUP_NOT_ALLOWED", reason: guard.reason, error: friendly(guard.reason) });
  }

  // 2) daftar ke Supabase Auth
  let signup;
  try {
    signup = await gotrueSignup(email, password, fullName);
  } catch {
    return send(res, 503, { code: "SIGNUP_UNAVAILABLE", error: "Pendaftaran sedang gangguan. Coba lagi sebentar." });
  }

  if (!signup.ok) {
    const msg = String(signup.json?.msg || signup.json?.error_description || signup.json?.message || "");
    const lower = msg.toLowerCase();
    if (lower.includes("already registered") || lower.includes("already been registered")) {
      return send(res, 409, { code: "EMAIL_EXISTS", error: "Email ini sudah terdaftar. Silakan masuk atau pakai “Lupa password?”." });
    }
    if (lower.includes("password") && lower.includes("at least")) {
      return send(res, 400, { code: "WEAK_PASSWORD", error: "Password minimal 8 karakter." });
    }
    if (signup.status === 429) {
      return send(res, 429, { code: "TOO_MANY_REQUESTS", error: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi." });
    }
    if (signup.status === 503 || signup.status === 500) {
      return send(res, 503, { code: "SIGNUP_UNAVAILABLE", error: "Pendaftaran sedang gangguan. Coba lagi sebentar." });
    }
    return send(res, 400, { code: "SIGNUP_FAILED", error: "Pendaftaran gagal. Periksa email & password lalu coba lagi." });
  }

  const session = signup.json?.access_token
    ? { access_token: signup.json.access_token, refresh_token: signup.json.refresh_token }
    : null;

  return send(res, 200, {
    ok: true,
    session,
    // akun berisiko tetap boleh daftar, tapi tanpa kuota trial
    limited: guard.action === "limit",
    limitReason: guard.action === "limit" ? guard.reason : null,
  });
}
