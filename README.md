# FakturKu

PWA generator faktur / kwitansi / struk angsuran untuk PIC lapangan & finance. Editable, print A4 & thermal 58mm, share JPEG ke WhatsApp/Telegram. Bahasa Indonesia.

## Fitur

- 4 template: Faktur A4, Kwitansi A4, Struk Angsuran (thermal 58mm), Invoice Digital
- Editor form + live preview, draft tersimpan di device
- Auto terbilang, penomoran per template, watermark DRAFT → TERBIT
- Export: print (A4/thermal), JPEG (html2canvas), ringkasan teks, tombol WhatsApp
- Installable PWA (offline shell via service worker)
- Billing: trial 10 dokumen, bayar per dokumen terbit (re-print/re-share gratis)
- Top-up paket: 5 / 12 / 30 dokumen — approve admin
- Backend Supabase (opsional): login akun, kuota server-side, sinkron dokumen, dashboard admin realtime
- Mode lokal tanpa backend: semua fitur jalan offline via localStorage

## Struktur

```
index.html        aplikasi utama (editor + preview)
admin.html        panel admin (dashboard server / tool kode lokal)
js/config.js      slot kunci Supabase (kosong = mode lokal)
js/app.js         wiring UI
js/modules/       engine: template, invoice, numbering, output, billing, backend
js/templates/     4 template dokumen
supabase/schema.sql  tabel + RPC + RLS (jalankan sekali di SQL Editor)
opendesign/       viewer desain + design system
```

## Setup Supabase (opsional)

1. Buat project baru di [supabase.com](https://supabase.com) (atau `supabase projects create`)
2. SQL Editor → paste `supabase/schema.sql` → Run
3. Authentication → Providers → Email: aktifkan (confirm email boleh OFF untuk mulai)
4. Project Settings → API → salin **Project URL** + **anon key** ke `js/config.js`
5. Refresh aplikasi → daftar akun. **User pertama otomatis jadi admin** + trial 10 kuota

Catatan keamanan:
- Kuota & top-up diproses RPC `SECURITY DEFINER` di server — user tidak bisa edit saldo sendiri (RLS ketat)
- `admin.html` sengaja tidak di-link dari aplikasi; buka manual `/admin.html`
- Ganti `CONTACT` di `js/modules/credit-ledger.js` (nomor WA admin) sebelum rilis

## Alur top-up (mode server)

1. User pilih paket → dapat ID `FKT-XXXXXX` + nominal transfer
2. User transfer, kirim bukti ke admin
3. Admin approve di `admin.html` → kuota masuk otomatis (tanpa kode)
4. User muat ulang / buka lagi panel kuota

Mode lokal (config kosong): admin bikin kode 6 digit offline, user redeem manual — enforcement lokal saja, bukan server-side.

## Deploy

Statik saja — upload folder ini ke Netlify / Vercel / Cloudflare Pages / hosting apa pun. Tidak perlu build step. Service worker butuh HTTPS.

## Tech

Vanilla JS ES modules, tanpa framework & build tool. IBM Plex Sans/Mono. Supabase JS v2 via CDN (hanya dimuat saat config terisi).
