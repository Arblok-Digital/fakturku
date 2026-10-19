# FakturKu — Audit Fullstack & Production-Readiness (2026-10-19)

Audit ulang menyeluruh FE + BE + ops, dengan bukti eksekusi (bukan asumsi).
Target audit: `master @ 7f2815c` (lokal) — production live = `origin/master @ e889a1b`
(https://fakturku.vercel.app). Fokus: seberapa siap FakturKu untuk pelanggan nyata.

> Catatan: DB hardening B-1/B-2 (billing_settings RLS + revoke grants) sudah diterapkan
> dan diverifikasi ulang di audit ini. Tidak ada perubahan kode/production dalam audit ini.

---

## 0. Metodologi & bukti yang dijalankan

| # | Uji | Hasil |
|---|---|---|
| 1 | `node tools/check-render-coverage.mjs` | **51/51 template bersih, 0 field gagal** (exit 0) |
| 2 | Sync FE↔BE segar (id/kategori/harga template) | FE 51 = DB 51, **0 mismatch** (FE-only 0, DB-only 0) |
| 3 | Prod smoke (Playwright, landing) | 0 error konsol; semua aset 200; SW aktif (v26); 51 opsi template; auth gate benar |
| 4 | Prod `/admin` | Login gate OK (tanpa dash utk anon); 1× 404 favicon.ico (kosmetik) |
| 5 | Prod `api/gemini-assistant` | GET→405 JSON; POST tanpa auth→401 JSON fail-closed (`no-store`) |
| 6 | DB: tabel RLS off | **0 tabel** `relrowsecurity=false` |
| 7 | DB: `billing_settings` | RLS on + 1 policy (SELECT authenticated); anon grants = none |
| 8 | DB: grant anon/public fungsi sensitif | **0** (adjust_balance/set_role/update_category/is_admin/my_role/handle_new_user) |
| 9 | DB: semua fungsi yang masih bisa dipanggil `anon` | 13 fungsi — **semua fail-closed** (body diverifikasi: cek `auth.uid()`/`is_admin()`) |
| 10 | DB: migrasi vs repo | **drift**: 6 versi live tak ada di repo; 2 migrasi repo belum tercatat di live |
| 11 | DB: backup | **0 backup, PITR off** (free plan) |
| 12 | Auth config (Management API) | `site_url=http://localhost:3000`, `uri_allow_list=""`, `mailer_autoconfirm=true`, captcha off, min password 6, SMTP belum di-set |
| 13 | Data live | 4 user (4 confirmed), 31 invoice, 5 topup (4 approved, 1 rejected) — fase testing |

---

## 1. Skor production-readiness per area

Bobot disusun untuk SaaS berbayar (data dokumen + saldo uang nyata).

| Area | Bobot | Skor | Ringkas |
|---|---:|---:|---|
| Fitur & render dokumen | 25% | **90** | Kuat. 51/51 render, sync sempurna, output A4/thermal/share jalan |
| Keamanan & kontrol akses | 20% | **82** | RLS + RPC fail-closed terbukti; kurang: anti-abuse signup, MFA admin, audit log |
| Reliabilitas & data | 15% | **55** | Tanpa backup & drift migrasi — risiko data hilang |
| Auth & email | 10% | **45** | Login jalan; tanpa reset password, situs URL auth salah, email tak reliable |
| Billing & monetisasi | 10% | **78** | Logika server-side solid; tanpa payment gateway |
| Operasional (CI/test/monitoring) | 12% | **30** | Tanpa CI, tanpa test otomatis, tanpa observability/uptime |
| Kepatuhan & marketing | 8% | **35** | Landing bagus; tanpa privacy/terms (UU PDP), tanpa OG/canonical |

### Total tertimbang = **±66% production-ready**

Tiga lensa:
- **Untuk teman/testing sekarang:** ~90% siap.
- **Untuk pelanggan berbayar pertama:** ~66% siap (blocker: backup, auth email/anti-abuse, observability, migrasi, legal).
- **Untuk skala umum:** ~55% siap.

Setelah 5 item P0 beres → estimasi naik ke **~84%**.

---

## 2. Yang sudah kuat (jangan dirusak)

1. **Render 100%**: gate otomatis 51/51, dan sync FE↔BE (id, kategori, harga) nol mismatch — diuji ulang hari ini.
2. **Kontrak template** konsisten; `editor-fields.js` satu sumber aturan field; `renderDoc` single entry.
3. **RLS user-scoped** + role escalation dikunci (`profiles_update_own` lock `role = my_role()`).
4. **Semua RPC duit fail-closed** (diverifikasi body-nya):
   - `issue_document`: `uid is null → return false`; validasi kategori-template; idempotent re-issue.
   - `next_document_number`: cek login + advisory lock (race-safe).
   - `unlock_category` / `unlock_all_categories` / `request_topup`: cek login + validasi + `for update`.
   - `approve_topup` / `reject_topup`: `is_admin()` internal; `cancel_topup`: filter `user_id = auth.uid()`.
   - `get_my_billing` / `get_my_unlocks`: filter `auth.uid()`.
5. **UI admin fail-closed**: gate `is_admin()` + RLS; non-admin tidak bisa lihat data.
6. **XSS**: `esc()`/`admEsc()` konsisten di semua `innerHTML`; AI suggestion via `.value` (bukan HTML).
7. **Header produksi**: HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
8. **PWA**: SW v26 network-first (navigasi `no-store`), fallback cache aman (tidak pernah menyajikan HTML sebagai JS/CSS).
9. **Error UX**: try/catch + toast + `console.warn` di flow kritis (sync draft, nomor, billing, admin).
10. **API AI**: rate-limit per IP + kuota harian per user (DB authoritative) + validasi field path; fail-closed tanpa login.

---

## 3. Temuan baru dari audit ini (dengan bukti)

**N-1 (TINGGI, ops/data) — Tanpa backup sama sekali.**
`GET /database/backups` → `{"backups":[], "pitr_enabled":false}`. Data invoice, saldo, transaksi
user tidak punya jaring pemulihan. Ini blocker pertama untuk pelanggan nyata.

**N-2 (TINGGI, auth) — Konfigurasi auth belum produksi.**
- `site_url = http://localhost:3000` + `uri_allow_list = ""` → semua link email auth mengarah ke localhost.
- `smtp_configured = false`, `rate_limit_email_sent = 2`/jam → email auth (konfirmasi/reset) tidak reliable.
- `mailer_autoconfirm = true` + `security_captcha_enabled = false` + trial 10 kredit/akun → **abuse**:
  akun palsu tanpa verifikasi = kredit gratis tak terbatas (dokumen gratis).
- `password_min_length = 6`.
- FE **tidak punya UI "lupa password"** (tidak ada flow recovery).

**N-3 (TINGGI, observability) — Titik buta total.**
Tidak ada error tracking (FE maupun serverless), tidak ada uptime monitor, tidak ada alert.
Jika render/RPC gagal di device user, tidak ada yang tahu selain user itu sendiri.

**N-4 (SEDANG, data) — Drift migrasi repo ↔ live.**
- Live punya 6 versi yang tidak ada di repo: `20261013100000, 20261013130000, 20261013140000,
  20261015012559, 20261015045339, 20261015060005`.
- Repo punya 2 migrasi yang belum tercatat di live: `20261017000100`, `20261017000200`
  (kontennya sudah dipakai live via eksekusi manual, tapi history tidak mencatatnya).
- Konsekuensi: `supabase db push` tidak aman; DB fresh dari repo tidak bisa direproduksi dengan yakin.

**N-5 (SEDANG, proses) — Tanpa CI & test otomatis.**
Tidak ada `package.json` di repo, tidak ada `.github/`, tidak ada file test. Gate render
(`check-render-coverage.mjs`) bagus tapi manual — bisa lupa dijalankan saat commit.

**N-6 (SEDANG, legal) — Tanpa kebijakan privasi & syarat layanan.**
Tidak ada halaman privacy/terms (dibutuhkan untuk pelanggan nyata di Indonesia — UU PDP).
Data yang disimpan: identitas bisnis, nomor dokumen, saldo, email.

**N-7 (RENDAH, marketing) — Tanpa OG/Twitter card, canonical, robots, sitemap.**
Share `fakturku.vercel.app` di WhatsApp/Telegram tampil polos tanpa preview.

**N-8 (RENDAH, hygiene) — `api/gemini-assistant.js`**: komentar `// Public anon key...` dobel,
dan anon key hardcoded (secara keamanan tidak masalah karena anon key memang publik,
tapi lebih rapi dari env). `admin.html` tanpa favicon → 404 kecil di `/admin`.

**N-9 (RENDAH, hygiene) — Sisa lama**: `/admin` masih ikut precache SW; `adjust_credits`
legacy masih ada; `get_my_billing` tak dipakai FE; secret HMAC offline (`credit-ledger.js`)
hardcoded (impact lokal saja); item input belum escape `'` (rendah, atribut pakai `"`).

---

## 4. Roadmap menuju "siap pelanggan berbayar"

### P0 — blocker (urutan eksekusi disarankan)
1. **Backup DB**: aktifkan daily backup (butuh keputusan biaya Pro) atau dump terjadwal
   (pg_dump via Management API cron lokal) + **uji restore 1×**.
2. **Auth produksi**: set `site_url=https://fakturku.vercel.app` + `uri_allow_list`;
   SMTP kustom (mis. Resend/Brevo); captcha signup (Turnstile/hCaptcha);
   naikkan `password_min_length` → 8; tambah UI **lupa password**; putuskan
   email confirmation ON/OFF (kalau OFF, captcha wajib).
3. **Observability minimal**: Sentry (FE + `api/`) + uptime monitor (cek `/` dan `/api/gemini-assistant`) + alert.
4. **Baseline migrasi**: catat 2 migrasi repo ke live, ekspor 6 migrasi live ke repo, uji `db reset` lokal dari chain baru.
5. **CI minimal**: GitHub Actions → `node --check` semua JS + `check-render-coverage.mjs` + smoke import di PR/push.

### P1 — penting sebelum tumbuh
6. **Audit log `set_role`** + **MFA TOTP untuk admin** (project sudah mendukung; FE belum pakai).
7. **Halaman legal**: Kebijakan Privasi + Syarat & Ketentuan + kontak (UU PDP).
8. **OG/Twitter + canonical + sitemap + robots**.
9. **CSP bertahap** (mulai dari report-only), favicon `/admin`, rapikan komentar `api/`, putuskan `/admin` di precache SW.
10. **Keputusan payment**: gateway (Midtrans/Xendit) vs tetap transfer manual (kalau manual: tambah alur bukti bayar + notifikasi hasil approve ke user).

### P2 — polish & penguatan
11. Test runner (Vitest) + snapshot render per kategori + e2e Playwright minimal.
12. Refactor `app.js` (82 KB) & pecah CSS; hapus `adjust_credits`; `get_my_billing` konsisten; escape `'` di item input; putuskan secret HMAC offline.
13. Phase 6 (tanda tangan/foto bukti) — keputusan produk.

---

## 5. Kesimpulan

- **Fitur inti (dokumen): ~90%** — ini pembeda produk dan sudah beres: 51/51 render, sync FE↔BE nol mismatch, output & billing jalan.
- **Fullstack production-ready: ~66%** untuk pelanggan berbayar pertama.
- Pola gap-nya jelas: **bukan fitur**, tapi **operasional & kepercayaan** (backup, auth/anti-abuse/email, observability, migrasi, legal).
- Semua temuan lama B-1/B-2 (keamanan DB) sudah **beres & terverifikasi**; tidak ada celah eksploitasi yang tersisa dari hasil telusur body fungsi.

_Dibuat 2026-10-19. Audit read-only; tidak ada perubahan production._
_Bukti: Supabase Management API (SQL + auth config + backups), Playwright (prod), curl (API prod), Node (render gate + sync check)._
