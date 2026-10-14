# FakturKu

PWA pembuat dokumen usaha untuk finance, UMKM, logistik, proyek, operasional, legal, dan catatan pajak internal. Isi bisa diedit, dicetak A4/thermal 58 mm, atau dibagikan sebagai JPEG. Bahasa Indonesia.

## Fitur

- 36 template siap pakai di 7 kategori usaha; daftar isian dan batas penggunaan ada di `PLAN-billing-kategori/08-katalog-template.md`
- Editor form + live preview, draft tersimpan di device
- Auto terbilang, penomoran per template, watermark DRAFT → TERBIT
- Export: print (A4/thermal), JPEG (html2canvas), ringkasan teks, tombol WhatsApp
- Installable PWA (offline shell via service worker)
- Billing: 10 dokumen pertama gratis; setelah trial, saldo Rupiah dipotong sesuai kategori (re-print/re-share gratis)
- Top-up saldo: Rp15.000 / Rp40.000 / Rp85.000, konfirmasi transfer manual via WhatsApp lalu approve admin
- Backend Supabase: akun, trial/saldo server-side, sinkron dokumen, dan dashboard admin
- Panel admin responsif di `/admin`, dengan push notification opsional untuk permintaan top-up baru
- Mode lokal tanpa backend: trial terbatas berjalan offline; saldo dan top-up memerlukan Supabase

## Struktur

```
index.html        aplikasi utama (editor + preview)
admin.html        panel admin untuk verifikasi top-up dan pengelolaan saldo — akses via /admin
js/config.js      slot kunci Supabase (kosong = mode lokal)
js/app.js         wiring UI
js/modules/       engine: template, invoice, numbering, output, billing, backend
js/templates/     template dokumen (template usaha tambahan memakai field & preview bersama)
supabase/schema.sql  tabel + RPC + RLS (jalankan sekali di SQL Editor)
opendesign/       viewer desain + design system
```

## Setup Supabase (opsional)

1. Buat project baru di [supabase.com](https://supabase.com) (atau `supabase projects create`)
2. SQL Editor → paste `supabase/schema.sql` → Run
3. Authentication → Providers → Email: aktifkan (confirm email boleh OFF untuk mulai)
4. Project Settings → API → salin **Project URL** + **anon key** ke `js/config.js`
5. Terapkan migrasi berurutan di `supabase/migrations/`, lalu refresh aplikasi dan daftar akun. **User pertama otomatis jadi admin** + trial 10 dokumen

Catatan keamanan:
- Trial, harga kategori, penerbitan, top-up, dan saldo diproses RPC server-side
- `admin.html` sengaja tidak di-link dari aplikasi; buka manual `/admin`
- Admin dapat mengaktifkan notifikasi di setiap perangkat dari panel `/admin`. Di iPhone/iPad, tambahkan FakturKu ke Home Screen dan buka dari ikon sebelum mengaktifkan push.
- Nomor WhatsApp konfirmasi pembayaran disetel di `js/config.js`

## Alur top-up (mode server)

1. User pilih saldo Rp15.000 / Rp40.000 / Rp85.000 → dapat ID permintaan dan nominal transfer
2. User transfer sesuai nominal, lalu buka WhatsApp dari UI dan lampirkan bukti
3. Admin verifikasi pembayaran dan approve di `admin.html` → saldo Rupiah masuk otomatis
4. Setelah trial habis, saldo terpotong sesuai harga kategori setiap dokumen baru diterbitkan

Mode lokal tanpa Supabase hanya mendukung trial; top-up saldo tidak diproses secara lokal.

## Deploy

Statik saja — upload folder ini ke Netlify / Vercel / Cloudflare Pages / hosting apa pun. Tidak perlu build step. Service worker butuh HTTPS.

## Tech

Vanilla JS ES modules, tanpa framework & build tool. IBM Plex Sans/Mono. Supabase JS v2 via CDN (hanya dimuat saat config terisi).
