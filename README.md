# FakturKu

FakturKu adalah PWA untuk membuat dokumen bisnis di browser: faktur, kwitansi, invoice digital, dan template administrasi lainnya. Aplikasi menggunakan Vanilla JavaScript ES modules, CSS, dan HTML tanpa build step.

> **Penting untuk agent:** baca `AGENTS.md` sebelum mengedit atau melakukan deploy. Jangan menganggap branch preview sebagai production.

## Sumber kebenaran

- **Repository:** `Arblok-Digital/fakturku`
- **Production branch:** `master` — hanya berubah setelah review dan persetujuan eksplisit.
- **Branch kerja/preview saat ini:** `fix/production-mobile-billing-output`
- **Deploy preview:** otomatis melalui Vercel ketika branch terkait di-push.
- **Deploy production:** hanya setelah perubahan diuji, disetujui, dan dipromosikan/di-merge sesuai alur rilis.
- **File lokal:** bukan sumber kebenaran tersendiri. Pastikan branch dan commit cocok dengan GitHub sebelum melanjutkan kerja.

## Fitur utama

- Katalog template dokumen lintas kategori bisnis.
- Editor data dokumen dan preview hasil render.
- Tab mobile **Edit**, **Preview**, dan **Contoh**.
- Tab Contoh merender data ilustrasi melalui engine template; data contoh tidak boleh menimpa draft pengguna. Aksi print/simpan/share dinonaktifkan selama mode contoh.
- Draft lokal di perangkat, penomoran, nominal terbilang, dan output dokumen.
- PWA dengan service worker/cache.
- Integrasi Supabase opsional untuk fitur akun, kuota, sinkronisasi, dan admin. Periksa konfigurasi aktual sebelum mengubah backend.

## Peta file

| Path | Tanggung jawab |
| --- | --- |
| `index.html` | Struktur aplikasi, area editor/preview, navigasi bawah |
| `css/app.css` | Gaya aplikasi, editor, preview, dan navigasi mobile |
| `css/landing.css` | Gaya landing page |
| `js/app.js` | Wiring UI, perpindahan tab, state aplikasi, mode Contoh |
| `js/templates/` | Data/definisi template dan konfigurasi field |
| `js/modules/template-engine.js` | Pemilihan dan render template |
| `js/modules/` | Modul domain seperti output, penomoran, billing, backend, dan utilitas |
| `js/landing.js` | Interaksi landing page |
| `sw.js` | Service worker dan versi cache PWA |
| `supabase/schema.sql` | Skema/RPC/RLS Supabase; jangan ubah tanpa memahami dampak backend |
| `PLAN-billing-kategori/` | Catatan riset dan rencana template; bukan kode runtime |

Nama/path di atas adalah peta orientasi, bukan izin untuk mengubah semua area. Cek isi repo terkini sebelum mengandalkan daftar ini.

## Alur kerja yang disarankan

1. Baca `AGENTS.md`, status branch, dan commit terbaru sebelum edit.
2. Kerjakan fitur pada branch kerja/feature, bukan langsung di `master`.
3. Perubahan kecil dan fokus; jangan refactor backend atau migrasi data kecuali diminta eksplisit.
4. Jalankan pemeriksaan yang tersedia (mis. syntax check, pencarian ID duplikat, cek file/path, dan smoke test browser).
5. Push ke branch preview dan tunggu deployment Vercel berstatus **Ready**.
6. Uji di perangkat yang relevan, terutama mobile: pilih kategori/template, Edit, Preview, Contoh, kembali ke Edit, serta output yang terdampak.
7. Catat perubahan, tes yang benar-benar dijalankan, hasil deployment, dan hal yang belum dites.
8. **Jangan merge ke `master`, promote ke production, menghapus branch, atau melakukan rollback tanpa persetujuan eksplisit.**

## Template dan kepatuhan

Template adalah alat bantu administrasi umum, bukan jaminan kepatuhan hukum/pajak atau pengganti formulir resmi. Lembar pajak internal bukan e-Faktur resmi. Draft hukum bersifat umum dan perlu ditinjau sesuai konteks. Jangan mengiklankan template sebagai dokumen resmi/tersertifikasi tanpa dasar yang terverifikasi.

## Asisten AI Gemini

Floating assistant menggunakan endpoint serverless `/api/gemini-assistant` dan memanggil Gemini dari server. API key tidak boleh diletakkan di frontend atau di-commit ke repository.

Untuk mengaktifkan AI pada deployment Preview:
1. Tambahkan `GEMINI_API_KEY` pada environment **Preview** Vercel saja.
2. Terapkan migration `supabase/migrations/20261015000000_gemini_daily_usage.sql` pada database Supabase yang memang ditujukan untuk environment uji. Migration ini membuat RPC kuota harian; jangan jalankan ke database production tanpa persetujuan rilis.
3. Redeploy Preview setelah API key dan migration tersedia.
4. Uji sesi login, kuota 10 pesan/hari, pesan saat kuota habis, dan gangguan provider.

Model yang digunakan adalah `gemini-3.5-flash-lite`, kandidat berorientasi throughput dan biaya rendah. Batas RPM/RPD aktual tetap mengikuti kuota project yang tampil di Google AI Studio. Kuota aplikasi FakturKu disimpan atomik per akun dan per tanggal Asia/Jakarta melalui RPC Supabase, terpisah dari kuota provider Gemini. Setiap permintaan yang lolos kuota aplikasi akan memakai satu jatah. Jika konfigurasi kuota belum tersedia, sesi tidak valid, atau provider sedang bermasalah, endpoint menampilkan pesan aman dan tidak mengirim detail teknis mentah ke pengguna. Output saran hanya dapat menargetkan path field dari editor, dan tidak diterapkan otomatis. Nilai kolom editor yang dikirim sebagai konteks AI dapat berisi data pengguna; jangan kirim data rahasia yang tidak diperlukan.

## Setup lokal

1. Clone repo atau buka working tree yang sudah ada.
2. Periksa `git status` dan `git branch --show-current` sebelum mengedit.
3. Untuk menjalankan aplikasi, gunakan local static server bila browser membatasi ES modules/service worker pada `file://`.
4. Jangan menyalin file dari folder lokal lama ke branch terbaru secara membabi buta. Bandingkan perubahan terlebih dahulu.

Tidak ada build step standar karena aplikasi memakai HTML/CSS/JavaScript statis. Fitur Supabase memerlukan konfigurasi yang sesuai; jangan pernah commit secret/service-role key ke repo.
