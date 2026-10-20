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

---

## 6. Hari 1 — perbaikan yang langsung dikerjakan (2026-10-20, branch `feat/prod-readiness-day1-2026-10-20`)

Keputusan user: **kuota trial tetap 10** (mengurangi trial tidak menyelesaikan masalah, karena
email palsu tetap bisa masuk selama autentikasi email nonaktif). Serangan diarahkan ke
**sumber masalahnya: alamat email palsu**.

### 6.1 Guard pendaftaran (P0-2 tanpa mengubah trial)

- `supabase/migrations/20261020100000_signup_guard.sql`
  - Tabel `blocked_signup_domains` (100+ domain sekali pakai) & `signup_guard_events` (log, hash email/IP).
  - Fungsi `signup_email_risk()`: **block** domain disposable, alamat role di domain gratis
    (`info@gmail.com`), pola acak (7+ digit berurutan), email tidak valid;
    **limit** (daftar tanpa kuota trial) untuk plus-addressing & domain yang sudah banyak akun.
  - Trigger `guard_signup_insert` BEFORE INSERT di `auth.users` → pendaftaran langsung ke GoTrue
    juga diblokir (lapisan kedua).
  - `handle_new_user` diubah: akun berisiko dapat 0 trial; **user sah tetap 10**.
  - RPC `signup_guard_check(email, ip)`: batas 8 pendaftaran/IP/24 jam + 300/hari global.
- `api/signup.js` (baru): endpoint pendaftaran — validasi, cek guard, lalu mendaftarkan ke GoTrue,
  dengan pesan error ramah (bukan error database mentah). Batas 5 permintaan/menit/IP.
- FE: `backend.signUp()` memakai `/api/signup`, dengan fallback ke signup langsung bila endpoint
  tidak ada (dev lokal). `app.js` menampilkan pesan spesifik (akun tanpa kuota, email ditolak, dsb).
- **Diuji di schema scratch `fk_drill`: 17/17 kasus lulus** (11 klasifikasi email, saturasi domain,
  batas IP, IP lain tidak terpengaruh), lalu schema scratch di-drop.

### 6.2 Backup & pemulihan (P0-3)

- `tools/backup-fakturku.ps1`: tambah **log per run** (`backup-<stamp>.log`, ada di setiap output),
  **mirror offsite** (`-MirrorTo`, mis. OneDrive), dan keluar dengan exit code 1 bila gagal.
- `tools/restore-fakturku.ps1` (baru): restore snapshot → schema scratch (drill, aman) atau ke
  `public` (`-Target public -Confirm`,-mode darurat).
- `docs/RESTORE_RUNBOOK.md` (baru): cara backup, verifikasi mingguan, restore darurat, dan recovery
  kalau project Supabase hilang total.
- **Drill restore dijalankan & LOLOS**: 14 tabel + `auth.users`, jumlah baris cocok 100%, lalu schema
  scratch di-drop. Sebelumnya tidak pernah ada uji restore sama sekali.

### 6.3 Drift migrasi (P1-1)

- 3 file migrasi di-rename agar versinya sama dengan live
  (`20261015012559`, `20261015045339`, `20261015060005`).
- `supabase/migrations/20261020110000_reconcile_missing_objects.sql` (baru): rekonstruksi object live
  yang belum ada di repo — **termasuk trigger `guard_invoice_issue`** (penjaga billing) yang berarti
  kalau DB dibangun ulang dari repo, penagihan bisa dilewati, plus fitur notifikasi push admin
  (2 tabel + 3 fungsi) dan 4 fungsi inti (`adjust_balance`, `get_my_billing`,
  `guard_invoice_issue_transition`, `claim_topup_push_notification`).
- `tools/align-migrations.ps1` (baru): menjalankan migrasi repo yang belum tercatat + mencatat versi
  live-only (CLI `supabase db push` tidak bisa dipakai di mesin ini karena IPv6).
- `tools/check-schema-drift.ps1` (baru): membandingkan object live vs teks migrasi repo +
  daftar versi. **Sebelum:** 18 object hilang. **Sesudah:** 0 object hilang.

### 6.4 Legal & kepatuhan (P1-3)

- `privasi.html` + `ketentuan.html` (baru): kebijakan privasi & syarat-ketentuan yang sesuai dengan
  perilaku aplikasi sebenarnya (termasuk pernyataan bahwa template pajak/hukum **bukan** formulir
  resmi, retensi 14 hari, log 30 hari, hak pengguna, Quiet Fail).
- Ditambahkan ke `sitemap.xml` + link di footer landing.
- ⚠️ **Placeholder `EMAIL-ADMIN-FAKTURKU` harus diganti email resmi sebelum halaman ditayangkan.**

### 6.5 FE & header keamanan

- **Content-Security-Policy** ditambahkan di `vercel.json` (strict: tanpa `unsafe-inline` untuk
  script; `script-src 'self' https://cdn.jsdelivr.net`).
  - Blok inline di `admin.html` diekstrak ke `css/admin.css` + `js/admin.js` supaya CSP bisa ketat.
  - CSP diuji lokal (server dengan header sama): app & panel admin jalan, 0 pelanggaran.
- **Validasi sesi ke server saat boot** (`backend.verifySession()`): akun yang dihapus/dinonaktifkan
  langsung dikeluarkan, bukan tetap melihat workspace dari cache lokal.
- `supabase-js` di-CDN **dipin ke versi 2.117.3** (sebelumnya `@2` = selalu terbaru, bisa berubah
  sendiri di browser user).

### 6.6 Hasil verifikasi di production (setelah deploy `bf2411d`)

| Yang diuji | Hasil |
|---|---|
| Pendaftaran normal (UI) | ✅ "Pendaftaran berhasil", workspace terbuka, **trial T10** |
| Pendaftaran domain disposable (UI) | ✅ ditolak, pesan ramah: "Email dari layanan sekali pakai tidak kami terima…" |
| Pendaftaran alamat role (`support@gmail.com`) | ✅ ditolak (HTTP 400, `role_address`) |
| Pendaftaran plus-addressing | ✅ boleh daftar, `limited=true` (tanpa kuota trial) |
| Email dengan 8 digit (tahun) | ✅ **tidak** ikut diblokir (ambang disetel 9 digit setelah uji) |
| Pendaftaran di luar 5/menit/IP | ✅ HTTP 429 |
| Reset password (E2E, production) | ✅ form "Atur ulang password" → tersimpan → login password baru **200**, password lama **400** |
| API AI | ✅ GET 405, POST tanpa token 401 (tetap fail-closed) |
| Panel `/admin` | ✅ termuat, `noindex`, 0 error fungsional |
| Halaman legal | ✅ `privasi.html` & `ketentuan.html` → 200 |
| Header CSP | ✅ aktif di production |
| Drift migrasi | ✅ **TIDAK ADA DRIFT** (versi & object sinkron repo ↔ live) |
| Data live setelah semua uji | ✅ 5 user, 31 invoice, 51 template, saldo Rp87.000 — tidak berubah |
| Sisa user tes | ✅ 0 |

### 6.7 Sisa pekerjaan (tidak bisa diselesaikan tanpa kredensial user)

| Item | Yang dibutuhkan |
|---|---|
| P0-1 SMTP kustom | Akun/credential SMTP (Resend/Postmark/SES) |
| Backup offsite otomatis | Folder OneDrive/Google Drive yang bisa ditunjuk |
| Observability | Akun Sentry + URL monitor |
| Notifikasi "password diubah" | Setelah SMTP aktif |
| Email di halaman legal | Alamat email resmi FakturKu |
