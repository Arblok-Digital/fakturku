# Production Hardening — 2026-10-19

Tindak lanjut audit fullstack (lihat `AUDIT_FULLSTACK_PRODUCTION_READY_2026-10-19.md`).
Fokus batch ini: item P0 yang bisa dieksekusi tanpa akun pihak ketiga baru.

> Status deploy: **belum di-push**. Perubahan kode ada di branch
> `feat/prod-hardening-2026-10-19` (lokal) untuk direview dulu.
> Perubahan **konfigurasi Supabase Auth** sudah diterapkan ke project live
> (site_url + redirect allow-list + min password 8) — dampaknya hanya pada email
> auth & validasi password baru, tidak mengubah data.

---

## 1. Backup database (P0 #1)

- `tools/backup-fakturku.ps1`: snapshot JSON semua tabel `public` + `auth.users`
  via Supabase Management API (tanpa perlu plan Pro / pg_dump / password DB).
- Lokasi default: `%USERPROFILE%\backups\fakturku\<timestamp>\` (di luar repo).
- Retensi default 14 snapshot; `-Keep N` untuk mengubah.
- Backup pertama sudah dijalankan: **15 tabel, 113,6 KB** (31 invoice, 4 user) —
  isi diverifikasi cocok dengan DB.
- Catatan: folder backup memuat data pribadi + hash password auth. Simpan di
  perangkat tepercaya; jangan commit. Untuk produksi serius, tetap disarankan
  daily backup Pro/PITR + simpan salinan di storage terpisah.
- Jadwal: jalankan harian (lihat §6).

## 2. CI minimal (P0 #5)

- `package.json` (ESM, scripts `check`, `check:syntax`, `check:render`).
- `tools/check-syntax.mjs`: `node --check` untuk semua file JS runtime (21 file).
- `.github/workflows/ci.yml`: jalan di setiap push/PR → syntax + render coverage.
- Hasil lokal: **syntax 21/21 OK, render 51/51 bersih**.

## 3. Auth produksi (P0 #2, sebagian)

Konfigurasi project (via Management API):
- `site_url`: `http://localhost:3000` → **`https://fakturku.vercel.app`**
- `uri_allow_list`: kosong → `https://fakturku.vercel.app/**,http://localhost:5501/**,http://127.0.0.1:5501/**`
- `password_min_length`: 6 → **8**

Frontend:
- Alur **Lupa password** (mode `req`): kirim tautan reset via Supabase.
- Mode **recover** (saat tautan dibuka): form password baru + simpan.
- Validasi daftar/reset minimal 8 karakter (selaras server).
- Perbaikan bug lama: field auth memakai `.field { display:flex }` sehingga atribut
  `[hidden]` tidak bekerja — field Nama ikut tampil saat login. Ditambahkan aturan
  `.auth-card .field[hidden]` / `.auth-card .auth-tabs[hidden]`.
- `backend.js`: `requestPasswordReset()`, `updatePassword()`, event `PASSWORD_RECOVERY`
  diteruskan ke `onAuthChange`.

Belum (butuh akun/secret dari pemilik):
- SMTP kustom (mis. Resend/Brevo) → email reset/konfirmasi reliable.
- Captcha signup (Turnstile/hCaptcha) + keputusan email confirmation ON.
  Saat ini `mailer_autoconfirm = true`, `security_captcha_enabled = false` —
  masih rawan akun palsu memanen kredit trial.

## 4. Metadata SEO / GEO / AEO (P1 #8)

`index.html`:
- `description` diperbarui, `canonical`, `robots`.
- Open Graph lengkap (`og:type/site_name/locale/url/title/description/image` +
  dimensi & alt) dan Twitter `summary_large_image`.
- JSON-LD `@graph`: `Organization`, `WebSite`, `SoftwareApplication` (fitur + offer
  gratis). Tanpa rating/klaim palsu.
- `og-image.png` 1200×630 (dibuat dari layout brand, 300 KB).

File crawl:
- `robots.txt` (`Disallow: /admin`, sitemap)
- `sitemap.xml`
- `llms.txt` (fakta produk untuk crawler AI)
- `admin.html`: `noindex, nofollow` + favicon (menghilangkan 404 `/favicon.ico`).
- `api/gemini-assistant.js`: komentar dobel dibersihkan.

Saran lanjutan GEO/AEO (belum dikerjakan): tambah section FAQ yang terlihat + JSON-LD
`FAQPage`, halaman kebijakan privasi/syarat, dan konten per kategori dokumen agar
muncul di jawaban mesin pencari/AI.

## 5. Verifikasi yang dijalankan

- `npm run check`: syntax 21/21, render 51/51.
- Playwright lokal (`http://127.0.0.1:5501`, viewport 390×844):
  - landing + auth modal tampil, 0 error konsol;
  - mode "Lupa password?" menyembunyikan Nama/Password/tab, judul & tombol benar;
  - submit email uji → `POST /auth/v1/recover?redirect_to=http://127.0.0.1:5501/` → 200;
  - daftar dengan password 6 karakter → ditolak "Password minimal 8 karakter."
    tanpa request ke server;
  - mode Masuk/Daftar/Kembali konsisten.
- `robots.txt`, `sitemap.xml`, `llms.txt`, `og-image.png` → HTTP 200.
- JSON-LD ter-parse di browser (`Organization`, `WebSite`, `SoftwareApplication`).
- Catatan: alur *recover* dengan tautan asli belum diuji end-to-end (butuh inbox);
  jalur kode sudah direview, UI mode `recover` sudah terpasang.

### 5.1 E2E reset password (2026-10-19, setelah perbaikan)

Akar masalah: event `PASSWORD_RECOVERY` bisa terlewat karena supabase-js memproses
URL hash saat client dibuat, sebelum listener dipasang. Perbaikan: hash recovery
dideteksi di awal modul (`bootRecovery`) dan form recovery ditampilkan setelah
`getSession()`; sesi recovery tidak boleh membuka workspace sebelum password diganti.

Uji nyata memakai user tes sementara (dibuat & dihapus via Admin API):
1. Buat user tes (`email_confirm=true`) → trigger `handle_new_user` jalan.
2. `admin/generate_link` tipe `recovery` dengan `redirect_to` lokal → buka tautan di Playwright.
3. App menampilkan **"Atur ulang password"** (workspace tetap tersembunyi) ✔
4. Isi password baru → tersimpan, workspace terbuka, hash URL dibersihkan ✔
5. `POST /auth/v1/token?grant_type=password` dengan password baru → **200**, user id cocok ✔
6. Login dengan password lama → **400** (ditolak) ✔
7. User tes dihapus; sisa baris `reset-e2e-%` di `auth.users` = **0** ✔

Tambahan: pesan ramah untuk tautan kedaluwarsa (`error_description` di hash) dan
rate limit email (429).

## 6. Menjadwalkan backup harian (Windows)

```powershell
schtasks /Create /SC DAILY /ST 21:30 /TN "FakturKu Backup" ^
  /TR "powershell -ExecutionPolicy Bypass -File \"C:\Users\ARBLOK\Documents\fakturku\tools\backup-fakturku.ps1\""
```

Cek: `schtasks /Query /TN "FakturKu Backup"`, jalankan manual: `schtasks /Run /TN "FakturKu Backup"`.

## 7. Langkah berikutnya

1. Review branch lokal + preview (push branch → Vercel Preview).
2. Set SMTP kustom + captcha; lalu putuskan email confirmation.
3. Observability: Sentry + uptime monitor.
4. Uji restore dari snapshot (scratch schema) — perlu persetujuan karena menulis ke DB.
5. Baseline migrasi repo ↔ live.
6. Setelah lolos review: merge/push ke `master` (production) **dengan persetujuan eksplisit**.

---

## 8. Rilis lanjutan - 2026-10-21 (`master` @ `d08a373`)

Redesign landing page (mobile-first) resmi rilis ke production setelah review user:

| Area | Perubahan |
|---|---|
| Hero | Teks full-width di atas (pill, H1 baru, deskripsi, chip kategori, CTA, checklist), kartu di bawah |
| H1 | "Semua Urusan Dokumen Bisnis, Beres di Satu Tempat." (baris 2 lime) |
| Sub-headline | "Nggak perlu lagi bongkar folder nyari format lama. ... Ada Asisten AI yang siap bantu buatin." |
| Kartu | `.hero-cards` = grid 2 kolom (>=1024px) dengan `align-items: stretch`; kartu Login `height:100%` + flex column |
| Contoh dokumen | Output asli FakturKu (bukan mock) via `js/modules/sample-docs.js` + `renderDocHtml()` |
| Editor | `buildExampleState()` delegasi ke modul baru; tab "Contoh" tetap render + draft utuh |
| SW | cache `fakturku-v29` |

Verifikasi live `https://fakturku.vercel.app`: H1 2 baris (desktop) / 3 baris (mobile), kartu 686px
kiri = kanan, signup trial T10 berhasil (user tes dihapus, live user tetap 5), `/privasi.html` dan
`/ketentuan.html` 200, CSP strict + HSTS aktif, 0 error konsol.

Catatan: tidak ada perubahan backend, schema, auth, atau data di rilis ini.
