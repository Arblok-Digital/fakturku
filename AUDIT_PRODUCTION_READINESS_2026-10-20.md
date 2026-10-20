# Audit Production-Readiness FakturKu — 2026-10-20 (audit ulang, evidence-based)

Audit dilakukan terhadap **kode live** (`master @ 969eee2`, Vercel Production `https://fakturku.vercel.app`),
**database live** (Supabase `pcydwlfyughwasyqglwq`, Singapore), **CI**, **backup**, dan **backup terverifikasi**
(17 file JSON, 166 baris, semua parse OK). Semua temuan di bawah **diuji langsung** (bukan dibaca dari asumsi).

> Audit ini **tidak mengubah kode, config, atau data production**. Yang ditulis hanya
> user tes sementara (signup UI + uji AI + uji otorisasi) yang **sudah dihapus semua** (sisa user tes = 0).

---

## 1. Verdict

|_use case_ | _status_ |
|---|---|
| Demo ke teman/pelanggan awal, belum ada pembayaran | ✅ **LAYAK** |
| Terima user sungguhan yang beli (top-up manual) | ⚠️ **LAYAK dengan syarat** — SMTP + anti-abuse trial + backup offsite |
| Publik luas / iklan berbayar | ❌ **BELUM** — butuh legal page, anti-abuse, observability |

Skor sekarang **≈ 78/100** (audit 19 Okt: 66%). Peningkatannya nyata karena area auth, keamanan data,
billing, dan backup sekarang **terbukti jalan** (bukan klaim).

| Area | Skor | Catatan |
|---|---|---|
| Fitur & produk | 90 | 51 template, 7 kategori, AI, PWA, draft sync — semua jalan |
| Keamanan aplikasi | 88 | RLS+policies+trigger guard terverifikasi, 0 secret bocor |
| Autentikasi | 88 | reset password E2E lolos, min 8, isolasi user terverifikasi |
| Billing & otorisasi | 86 | charge trial/saldo benar, bypass ditolak trigger |
| Reliabilitas | 72 | backup harian jalan, CI hijau, AI fail-closed — tapi tanpa observability |
| Operasional | 60 | backup lokal saja, tanpa alert, tanpa domain sendiri |
| Kepatuhan/legal | 28 | **tidak ada** privasi/terms/DPA/retensi data |
| Kualitas kode & CI | 84 | CI gate 21+51, tapi tanpa unit/integration test |

---

## 2. Yang sudah terbukti jalan (hasil uji nyata)

### 2.1 Autentikasi
- Signup via UI production: OK → workspace terbuka, trial `T10 · Rp 0`, 0 error konsol.
- Reset password end-to-end: tautan asli → form "Atur ulang password" → simpan → **login password baru 200**,
  **password lama 400 (ditolak)**.
- `password_min_length=8` ditegakkan di server.
- `site_url` = production, allow-list = prod + localhost dev.
- Isolasi sesi: user A **tidak bisa** baca data user B (invoice: 0 baris, credit_transactions: 0 baris,
  profiles: 0 baris).

### 2.2 Otorisasi & keamanan data
- RLS: **15/15 tabel public aktif** (`relrowsecurity=true`).
- Anon (tanpa token) → **401** di invoices/profiles/credit_transactions/ledger/topup; hanya katalog
  `document_categories` yang publik (memang harus publik).
- Role escalation (`PATCH profiles set role=admin`) → **403 ditolak**.
- RPC admin (`approve_topup`, `reject_topup`, `adjust_balance`, `set_role`, `update_category`) → **ditolak**
  untuk user biasa.
- **Bypass billing ditutup trigger** `guard_invoice_issue`:
  - insert invoice `status='issued'` langsung → **400 ditolak**
  - ubah `issued → draft` → **400 ditolak**
  - hanya `issue_document()` (SECURITY DEFINER) boleh menerbitkan.
- Trigger `handle_new_user` jalan (profil + ledger + trial dibuat).
- Tidak ada `service_role`/API key bocor di repo maupun **seluruh history git** (2 JWT-like string,
  keduanya bukan service_role; hanya anon key yang memang publik).
- Header live: HSTS (preload), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.

### 2.3 Billing
- `issue_document(faktur-a4)` → trial **10 → 9**, invoice `status=issued` terbentuk, transaksi tercatat.
- `unlock_category` / `unlock_all_categories` memotong saldo (balance >= price), tidak ada jalur gratis.
- `approve_topup` admin-only, `cancel_topup` hanya miliknya sendiri.
- Nomor dokumen server-side (`next_document_number`) + advisory lock, unik per user per tahun.
- Harga live: finance Rp1.000, 5 kategori premium Rp2.500 (unlock Rp39.000).

### 2.4 AI Assistant (production)
- `POST /api/gemini-assistant` dengan token valid → **200**, 3,2 detik, balasan sungguhan.
- Kuota harian 10 → **9 → 8** (tercatat di `gemini_daily_usage`).
- Guard: GET → 405, tanpa token → 401, body > 18 KB → 413, > 20 req/menit/IP → 429, timeout 20 s,
  provider error → 503 dengan pesan ramah. Env `GEMINI_API_KEY` & VAPID (push) **terpasang**.

### 2.5 Backup (bukan sekadar skrip)
- Task Scheduler "FakturKu Backup": aktif, daily **21:30**, `StartWhenAvailable`, last result **0**.
- 3 snapshot terbaru, snapshot hari ini `2026-10-20_074429` (115,4 KB).
- Isi: 15 tabel public + `auth.users` + jejak migrasi + commit repo (`969eee2`).
- **Integritas terverifikasi**: 17/17 file JSON parse OK, 166 baris, 0 file korup.

### 2.6 SEO / GEO / AEO
- canonical, OG + Twitter card, JSON-LD (`Organization`/`WebSite`/`SoftwareApplication`), robots index/follow,
  `robots.txt` (Disallow `/admin`), `sitemap.xml`, `llms.txt`, `og-image.png` 1200×630 (200, 299,6 KB).
- `/admin` → `noindex` + favicon (404 ikon hilang).
- Mobile 390×844: tanpa horizontal overflow, semua `<img>` punya alt, `lang="id"`.

### 2.7 Pipeline
- CI GitHub Actions: hijau di master (9 s) — syntax 21/21, render coverage 51/51.
- Gate lokal: `node tools/check-syntax.mjs` → 21/21, `node tools/check-render-coverage.mjs` → 51/51.
- Tidak ada TODO/FIXME/`console.log` tersisa di runtime JS.
- Vercel Production Ready; branch preview otomatis ada.

---

## 3. Gap yang masih ada (urutan prioritas)

### P0 — blocker untuk user nyata / menjaga data

**P0-1 · Email masih lewat SMTP default Supabase (kuota ±2 email/jam, sering spam)**
- `smtp_configured=false`, `rate_limit_email_sent=2`, `mailer_autoconfirm=true`.
- Dampak: user minta "Lupa password" → email sering tidak masuk/gmail reject → user tidak bisa masuk.
- Fix: SMTP kustom (Resend/Postmark/SES, free tier 3.000/bulan) → ubah `smtp_configured` + `mailer_autoconfirm`
  tetap true (autoconfirm wajib selama signup harus instan).
- Alternatif murah sementara: sediakan tombol "Hubungi admin untuk reset manual" (admin bisa reset via dashboard).

**P0-2 · Trial 10 dokumen per akun, signup publik, tanpa captcha → bisa di-farming**
- `security_captcha_enabled=false`, `rate_limit_anonymous_users=30` (per jam/IP).
- Dampak: 30 akun/jam/IP × 10 trial = 300 dokumen gratis; dengan rotasi IP, gratis tak terbatas.
- Fix tanpa captcha (paling murah): batas trial jadi 3, + counter "akun dibuat/IP" via tabel `signup_events`
  + blokir email domain disposable, + blokir signup dari IP yang punya >1 akun.
- Rekomendasi: minimal 1 dari 3 guard di atas sebelumInvite user strangers.

**P0-3 · Backup hanya di disk laptop, tanpa offsite & tanpa uji restore**
- Snapshot ada di `C:\Users\ARBLOK\backups\fakturku` (lokal, tanpa enkripsi, berisi hash password + email user).
- Tidak ada `restore-fakturku.ps1`, tidak ada runbook, tidak pernah diuji restore.
- Dampak: laptop hilang/rusak → data hilang; `backups:[]` & PITR off di Supabase free plan.
- Fix: (1) salin snapshot tiap pagi ke OneDrive/Google Drive (bisa lewat Task Scheduler), (2) tulis
  `tools/restore-fakturku.ps1` + `docs/RESTORE_RUNBOOK.md`, (3) uji 1× restore ke schema scratch.

### P1 — risiko nyata, tidak memblokir launch terbatas

**P1-1 · Drift migrasi repo ↔ live (risiko DR)**
- Live punya 8 versi: 3 migration **tidak ada di repo** (`20261013100000 topup_package_validation`,
  `20261013130000 category_wallet_billing`, `20261013140000 admin_push_notifications`), dan 3 pasang ID beda
  (mis. `gemini_daily_usage` live `20261015045339` vs repo `20261015000000`).
- Repo punya 2 versi yang **tidak tercatat di live**: `20261017000100`, `20261017000200`.
- Dampak: DB hilang & dibangun ulang dari repo → schema tidak sama (hilang validasi paket topup, wallet
  kategori, notifikasi push). `supabase db push` dari repo juga berisiko bentrok.
- Fix: dump 3 migrasi live yang hilang ke repo (dari `supabase_migrations.schema_migrations` + definisi live),
  samakan penamaan versi, catat 2 migrasi repo sebagai applied.

**P1-2 · Tidak ada observability**
- Tidak ada error monitoring (Sentry), tidak ada uptime monitor, tidak ada alerting kalau backup gagal
  (hanya "Last Result" Task Scheduler, tanpa log file per run).
- Dampak: error production tidak diketahui sampai user melapor.

**P1-3 · Tidak ada halaman privasi / terms / kebijakan data**
- Tidak ada `privasi.html`/`terms.html`; `sitemap.xml` juga belum memuat halaman legal.
- Dampak: PDP Law No. 27/2022 + UU PDP — aplikasi yang memproses email, nama, dan isi dokumen user
  umumnya wajib punya privacy notice (tujuan, data yang dikumpulkan, hak akses/hapus, retensi).

**P1-4 · FE tidak memvalidasi sesi ke server saat boot**
- `boot()` memakai `getSession()` (lokal). Akun yang **dihapus/dinonaktifkan** tetap melihat shell workspace
  (data kosong). Data aman: PostgREST menolak token user terhapus (`403 user_not_found`) — sudah diuji.
- Fix kecil: validasi `getUser()` saat boot → kalau 403, `signOut()` + tampilkan modal login.

**P1-5 · Top-up 100% manual**
- Tidak ada payment gateway; admin harus approve satu per satu (push notifikasi jalan, `admin_push_events` = sent).
- Dampak: friction & ketergantungan pada ketersediaan admin; user harus transfer manual + kirim bukti.

### P2 — polish / hardening
1. **Tidak ada CSP header** (tambah di `vercel.json`, watch `connect-src` ke Supabase + Google API).
2. **Domain `fakturku.vercel.app`** — pakai domain sendiri untuk SEO & kepercayaan.
3. **MFA TOTP aktif di server tapi tidak didukung FE** (`mfa_totp_enroll_enabled=true`). Kalau user somehow
  enroll TOTP, login berikutnya butuh OTP sehingga dia terkunci (FE tidak menangani challenge). Fix: implement challenge
   di FE **atau** set enroll=false sampai siap.
4. **Notifikasi "password diubah" dimatikan** (`mailer_notifications_password_changed_enabled=false`) —
   hidupkan setelah SMTP ready.
5. **Trial 10 terlalu besar** dibanding harga Rp1.000/dokumen (1 akun = Rp10.000 gratis).
6. **Kuota AI terpakai sebelum panggilan provider** — jawaban gagal tetap memakan jatah harian.
7. **Rate limit AI per IP in-memory per instance Vercel** (perkiraan; kuota harian DB yang jadi penjaga utama).
8. **`afterprint` menandai dokumen terbit walau print dibatalkan** → trial terpakai tanpa output; pertimbangkan
   tombol "Terbitkan" eksplisit.
9. **Backup tidak menulis log file** per run (cuma console) → sulit investigasi kegagalan lama.
10. **Tidak ada automated unit/integration test** (hanya syntax + render coverage) — logika billing/auth
    Idealnya punya test.
11. **CI belum ada** dependabot/security scan; `supabase/.gitignore` & `supabase/config.toml` masih untracked.
12. **Trial/abuse monitoring**: tidak ada dashboard "akun baru per hari".

---

## 4. Rekomendasi urutan kerja

| Urutan | Item | Waktu | Efek |
|---|---|---|---|
| 1 | SMTP kustom (P0-1) | 30 mnt + kredensial | user bisa reset & email masuk |
| 2 | Anti-abuse trial ringan (P0-2) | 1–2 jam | hentikan farming dokumen gratis |
| 3 | Offsite backup + restore script + 1× drill (P0-3) | 2–3 jam | data tidak hilang, restore terbukti |
| 4 | Sinkronkan migrasi repo ↔ live (P1-1) | 1–2 jam | DB bisa dibangun ulang dari repo |
| 5 | Halaman privasi/terms + sitemap (P1-3) | 1–2 jam | patuh UU PDP, siap share ke market |
| 6 | Uptime monitor + log backup (P1-2) | 1 jam | tahu kalau prod/backup mati |
| 7 | Validasi sesi boot (P1-4), CSP, MFA enroll off (P2) | 30 mnt | rapikan |

Sudah "cukup" setelah item 1–3: layak dipakai user sungguhan (pembayaran top-up manual + admin on-top).

---

## 5. Jejak audit (bukti bisa direproduksi)

- `tools/check-syntax.mjs` → 21/21 · `tools/check-render-coverage.mjs` → 51/51
- `schtasks /Query /TN "FakturKu Backup"` → Ready, daily 21:30, last result 0
- Snapshot `2026-10-20_074429` → 17 file, 166 baris, parse OK
- Uji authz (2 ronde) & uji AI (2×) → user tes dibuat & dihapus, sisa 0
- Uji reset password (2×: lokal & production) → tautan asli dari GoTrue Admin API
- Header & metadata live dicek via `curl`/`Invoke-WebRequest`
- Screenshot mobile tersimpan di `C:\Users\ARBLOK\audit-landing-mobile.png`

**Production berubah: TIDAK.** Tidak ada commit, push, merge, atau perubahan config/DB production
selama audit ini.
