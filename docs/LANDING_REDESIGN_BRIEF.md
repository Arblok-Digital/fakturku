# Brief — Redesign Landing Page FakturKu (mobile-first, 3 detik)

Status: **RILIS PRODUCTION (2026-10-21)** - `master` @ `d08a373` - Branch feature: `feat/landing-redesign-2026-10-20` - Owner: Arblok Digital

### Status implementasi per tahap

| Tahap | Status | Catatan |
|---|---|---|
| 1. Hero split + copy | Selesai - **live** | Hero full-width: teks (pill, H1, deskripsi, chip kategori, CTA, checklist) di atas, kartu di bawahnya. >=1024px: kartu 2 kolom (Document Preview kiri, Login kanan, rata atas). H1 final: "Semua Urusan Dokumen Bisnis, Beres di Satu Tempat." |
| 2. Auth bottom sheet | Selesai - **live** | Satu node `.auth-card` dipindah via JS (desktop ke kolom kanan, mobile ke sheet). Scroll lock, ESC, backdrop, focus trap, `aria-modal`. |
| 3. Animasi mesin dokumen | Selesai - **live** | 7 kategori autoplay 3,6 dtk, chip bisa diambil alih (jeda 8 dtk), jeda saat tab tak terlihat / sheet terbuka, `prefers-reduced-motion` ke frame pertama statis. |
| 3b. Contoh dokumen = output asli | Selesai - **live** | Data contoh dipindah ke `js/modules/sample-docs.js` (sumber sama untuk editor & landing). `renderDocHtml()` merender tanpa menyentuh DOM editor. 7 kategori memakai template asli (Faktur A4, Surat Pernyataan, Struk POS 58 mm, Surat Jalan, Lembar Pajak, SPK, Memo). |
| 3c. Presisi layout hero | Selesai - **live** | Teks hero full width, kartu dibungkus `.hero-cards` (grid 2 kolom, `align-items: stretch`), kartu Login `height:100%` + flex column supaya tinggi sama dengan kartu dokumen. |
| 4. Galeri 51 template | Belum | Section kategori lama masih ada; galeri belum dibuat. |
| 5. Menu akun/panduan | Belum | Avatar masih = tombol Keluar. |
| 6. Polish + Lighthouse | Belum | Belum diukur. |

**Keputusan teknis saat implementasi:**
- `overflow` landing diubah dari `clip` ke `overflow-x: clip` agar bottom sheet `position: fixed` tidak terpotong.
- Item grid hero diberi `min-width: 0`; tanpa itu chips `scroll-x` memaksa kolom melebar dan teks terpotong di mobile.
- `openAuth()` (buka landing) dipisah dari `promptAuth()` (buka form). Kalau digabung, form ikut terbuka sendiri saat boot karena `handleSession(null)`.
- Pesan error GoTrue yang menutupi trigger database ("Database error saving new user") diganti kalimat yang bisa dibaca user.
- Contoh dokumen di landing bukan mock: `buildSampleState()` dipindah dari `app.js` ke `js/modules/sample-docs.js`, tab "Contoh" di editor memakai fungsi yang sama (regresi: render + TOTAL + draft utuh saat pindah tab).
- `renderDocHtml(state)` ditambahkan di `template-engine.js` supaya landing bisa render dokumen tanpa menabrak elemen `#doc` milik editor.
- Cache service worker naik ke `fakturku-v29` karena shell (`index.html`, `css/landing.css`, `js/landing.js`) berubah.

### Verifikasi rilis production (2026-10-21, `master` @ `d08a373`)

| Cek | Hasil |
|---|---|
| Deploy Vercel Production | Ready, `https://fakturku.vercel.app` |
| CI | hijau (syntax 25/25, render 51/51) |
| Hero 1280px | H1 2 baris, lead 2 baris, kartu 686px (kiri = kanan) |
| Hero 390px | H1 3 baris, kartu 1 kolom, form di bottom sheet, tanpa overflow |
| Dokumen di card | render output asli (class `doc doc-a4`, data contoh FakturKu) |
| Signup production | berhasil, trial **T10**, workspace kebuka (user tes dihapus, live user tetap 5) |
| Halaman legal | `/privasi.html` 200, `/ketentuan.html` 200 |
| Header keamanan | CSP strict, HSTS, `X-Frame-Options: DENY` |
| Service worker | `fakturku-v29`, `/sw.js` 200 |

---

## 1. Keputusan yang sudah dikunci

| # | Keputusan | Status |
|---|---|---|
| 1 | Bentuk form di mobile: **sticky bottom CTA + form jadi bottom sheet** (bukan inline) | ✅ disetujui |
| 2 | Kolom kiri/visual: **autoplay**, selama tidak memberatkan | ✅ disetujui |
| 3 | Konten dalam app: **Panduan + Akun + Legal** (bukan deskripsi produk) | ✅ disetujui |
| 4 | Trial tetap **10** untuk user sah (keputusan 19 Okt, tidak diubah) | ✅ mengikat |
| 5 | Deskripsi produk **tetap di landing**; yang pindah ke app adalah panduan/akun | ✅ kesimpulan dari review |

## 2. Masalah yang harus diselesaikan (dasar keputusan)

1. **Pesan produk salah sejak awal.** Visual hero sekarang hanya menampilkan 3 varian dokumen
   yang semuanya keuangan (invoice / kuitansi / struk). Pengunjung menyimpulkan
   "ini aplikasi faktur" — persis kebalikan dari tujuan FakturKu.
2. **Form ada di bawah fold.** Tombol auth ada di `#landing-auth-panel` (section paling bawah),
   sedangkan `#auth-modal` (shell landing) adalah satu-satunya layar auth. Di mobile, form
   baru terlihat setelah melewati seluruh section.
3. **Waktu 3 detik habis buat scroll**, bukan buatunderstand produk.
4. **Tidak ada halaman akun/panduan di dalam app.** Avatar di header (`#btn-auth`) sekarang
   berfungsi sebagai tombol "Keluar" (dengan confirm) — satu salah tap = logout.

## 3. Prinsip desain

1. **LCP = teks.** Elemen paling besar di layar pertama harus H1/sub-headline, bukan gambar.
2. **Detail tidak dibuang, hanya dipindah.** Tidak ada konten landing yang dihapus; yang
   dipindah ke dalam app adalah hal yang **hanya berguna setelah orang masuk**.
3. **Satu node form.** Auth card dipindah secara DOM (bukan diduplikasi) → tidak ada id kembar,
   logika auth (`setAuthMode`, `authSubmit`, `showAuthError`) tetap dipakai apa adanya.
4. **Gerak murah.** Hanya `transform` + `opacity`, tanpa layout thrash, tanpa video.
   `prefers-reduced-motion` dihormati.
5. **Editor tidak boleh tersentuh.** Tab Edit/Preview/Contoh, logika draft, dan 51 template
   tidak boleh berubah sebagai efek samping.
6. **Jujur soal produk.** Visual memakai data dokumen yang benar-benar ada di FakturKu,
   bukan mock yang mengada-ada.

## 4. Struktur halaman

### 4.1 Mobile (< 768 px) — urutan layer

```
┌─ HERO (tinggi ≈ 78dvh, minimal 560px) ────────────────┐
│ eyebrow: 51 TEMPLATE · 7 KATEGORI                      │
│ H1 (2 baris)                                            │
│ sub (1 baris)                                           │
│ [chips: Faktur|Kuitansi|Invoice|Struk|PO|Surat|Nilai]  │ ← scroll-x
│ ┌──────────── visual: kartu dokumen ───────────────┐   │
│ │  (autoplay, 7 kategori, teks/CSS saja)           │   │
│ └───────────────────────────────────────────────────┘   │
│ [Buat akun gratis]  [Lihat contoh dokumen]             │
└──────────────────────────────────────────────────────────┘
┌─ STICKY BAR (fixed bottom, hanya di landing) ─────────┐
│ [Buat akun gratis — full width]                        │
└──────────────────────────────────────────────────────────┘
  Galeri 51 template (2 kolom, lazy)
  Kenapa FakturKu / 3 langkah
  Bagian AI (ringkas)
  Output & CTA
  Footer + tautan legal
```

- **Tidak ada form di dalam flow scroll** — form hanya di sheet.
- Sticky bar muncul setelah hero lewat (agar tidak menutupi CTA utama saat masih di atas).
- Sticky bar **hanya ada di landing**; saat workspace tampil, bar ikut hilang.

### 4.2 Desktop (≥ 1024 px) — split ala FB

```
┌───────────────────────────────┬─────────────────────────┐
│ eyebrow · H1 · sub            │  ┌───────────────────┐  │
│ chips 7 kategori              │  │ Masuk │ Daftar    │  │
│ ┌───────────────────────────┐ │  │ Nama              │  │
│ │  visual: kartu dokumen    │ │  │ Email             │  │
│ │  (autoplay 7 kategori)     │ │  │ Password          │  │
│ └───────────────────────────┘ │  │ [Buat akun]       │  │
│ "Lihat 51 template →"         │  │ ✓ 10 dokumen free │  │
│                               │  │ [Lihat contoh]    │  │
└───────────────────────────────┴─────────────────────────┘
        section yang sama dengan mobile (di bawah)
```

- Kolom kiri 55%, kolom kanan 45%.
- Auth card = node yang sama, di desktop tampil statis di kolom kanan.

## 5. Komponen & file yang diubah

| File | Perubahan | Risiko |
|---|---|---|
| `index.html` | Hero dirombak; auth card **dipindah** ke dalam hero (desktop) / tetap satu node untuk sheet (mobile); sticky bar; section galeri 51 template | Sedang — struktur hero, bukan editor |
| `css/landing.css` | Grid split, tokens, animasi keyframes, style sheet mobile, sticky bar, galeri | Rendah |
| `js/landing.js` | Autoplay + pause + reduced-motion; sheet open/close; chips untuk memorabilia visual; galeri | Sedang — hanya file landing |
| `js/app.js` | `openAuthSheet()` / `closeAuthSheet()`; `data-open-auth` membuka sheet (ganti `scrollIntoView`); saat login sukses sheet ikut tertutup | Sedang — menyentuh auth, harus regression test |
| `js/modules/backend.js` | Tidak berubah (API signup sudah ada) | — |
| `js/templates/*`, `template-engine.js` | **Tidak boleh berubah** | — |
| `sw.js` | Bump `CACHE` v27 → v28 (aset berubah) | Rendah |
| `sitemap.xml`, `robots.txt`, `manifest.webmanifest` | Tidak berubah (halaman baru? tidak — landing tetap `/`) | — |
| `admin.html`, `js/admin.js` | Tidak berubah | — |

### 5.1 Mekanisme form: satu node, dua presentasi

- **DOM**: `.auth-card` (dengan `#auth-email`, `#auth-pass`, `#auth-name`, `#auth-tab-in`,
  `#auth-tab-up`, `#auth-go`, `#auth-err`, `#auth-forgot`, `#auth-back`) dipindah ke dalam
  wrapper `.auth-host` di hero. **Tidak ada duplikasi id.**
- **Desktop (≥1024)**: `.auth-card` `position: static` di kolom kanan, selalu terlihat.
- **Mobile (<1024)**: `.auth-card` `position: fixed; inset: auto 0 0 0;` +
  `transform: translateY(105%)`; saat sheet terbuka `transform: none` + `transition: transform .28s`.
  Backdrop = elemen terpisah (`.sheet-backdrop`) dengan `opacity` + `visibility`.
- **State**: `document.body.dataset.sheet = "open" | "closed"` (satu sumber kebenaran untuk CSS + JS).
- **A11y**: `role="dialog"`, `aria-modal="true"`, focus moved ke `#auth-email` saat dibuka,
  `Escape` menutup, klik backdrop menutup, scroll body dikunci saat terbuka, focus dikembalikan
  ke pemicu saat ditutup.
- **Semua mode form tetap jalan di sheet**: `in`, `up`, `req` (lupa password), `recover`.
  Pesan error guard (email disposable, rate limit, akun tanpa kuota) tampil di `#auth-err`
  seperti sekarang — **dengan tinggi area error yang reserved** supaya tidak ada layout shift.

## 6. Motion spec — "mesin dokumen"

Sumber data: `categoryData` di `js/landing.js` (sudah ada 7 kategori lengkap dengan judul,
nomor, label, total, dan tag) → **tidak perlu bikin konten baru**.

| Aspek | Spesifikasi |
|---|---|
| Isi | 7 slide: Finance, Legal, UMKM, Logistik, Pajak, Proyek, Operasional |
| Durasi slide | 3.6 dtk per kategori, rotasi terus |
| Transisi | crossfade + slide vertikal 8px, 320ms, `cubic-bezier(.22,.61,.36,1)` |
| AnimasiProperties | hanya `transform` & `opacity` |
| Chip | kategori aktif menyala; chip bisa diklik → ambil alih animasi (pause autoplay 8 dtk) |
| Progress | 7 titik progress di bawah kartu |
| Start | setelah LCP + 400ms (`requestIdleCallback`, fallback `setTimeout`) |
| Pause otomatis | `document.hidden`, hover/fokus kartu, dan saat sheet terbuka |
| Reduced motion | tanpa animasi; tampil frame pertama (Finance) + chip tetap bisa diklik |
| Beban | target < 3ms/frame; tanpa `filter`/`box-shadow` animat, tanpa video |
| Ukuran kartu | max 320px (mobile) / 380px (desktop); ruangnya di-reserve agar CLS = 0 |

Konten tiap slide (dari `categoryData`): judul dokumen, nomor, label total, nilai, dan 3 tag.
Contoh alur yang dilihat pengunjung: **Invoice → Surat Pernyataan → Nota Penjualan → Surat Jalan
→ Ringkasan Pajak → Ringkasan Proyek → Form Operasional** → jelas ini bukan cuma faktur.

## 7. Copy final (siap pakai, tinggal approve)

**Hero (mobile & desktop sama)**
- eyebrow: `51 TEMPLATE · 7 KATEGORI`
- H1 (final, dipakai live 21 Okt 2026): `Semua Urusan Dokumen Bisnis, Beres di Satu Tempat.`
  - struktur: baris 1 putih, baris 2 lime (`<span>`)
- sub: `Nggak perlu lagi bongkar folder nyari format lama. Dari bikin invoice, struk, sampai surat perjanjian, semua ada 51 template-nya. Bingung nulis keterangannya? Ada Asisten AI yang siap bantu buatin.`
- CTA utama: `Buat akun gratis` · CTA sekunder: `Lihat contoh dokumen`
- link: `Lihat semua 51 template →`

**Catatan copy:** H1 sudah tidak menyebut "faktur" — pakai framing "semua urusan dokumen bisnis, beres di satu tempat".
Pesan "bukan cuma faktur" tetap dibawa oleh **chip kategori + galeri 51 template + sub-headline**
(yang menyebut 51 template & Asisten AI). H1 alternatif tetap disimpan di
`docs/marketing/knowledge-base/04-posisi-dan-pesan.md` untuk variasi iklan.

**Di dalam/atas form**
- trust line: `Gratis 10 dokumen pertama · tanpa kartu kredit · bisa dihapus kapan saja`
- auth card: tab `Masuk` / `Daftar`; toggle `Lupa password?`; `Kembali masuk`
- di bawah form: `Dengan mendaftar kamu setuju pada Syarat & Ketentuan dan Kebijakan Privasi.`

**Galeri (bawah fold)**
- judul: `51 template, 7 kategori. Semua bisa diedit.`
- tiap kartu: badge kategori + nama template + 1 baris kegunaan + tombol `Lihat`

## 8. Konten yang dipindah ke dalam app (menu akun)

Pemuatan: **avatar di header (`#btn-auth`) → bottom sheet** (mobile) / dropdown (desktop).
Avatar **berhenti** jadi tombol logout langsung.

Isi menu:
1. `Akun & saldo` — email, sisa kuota, saldo, status langganan/paket
2. `Panduan pakai` — cara isi per template, tips cetak & thermal, cara share
3. `Riwayat top-up` — daftar permintaan + status
4. `Ganti password` (memakai alur `req` → `recover` yang sudah ada)
5. `Kebijakan privasi` / `Syarat & Ketentuan` (link ke halaman legal)
6. `Keluar` (dengan confirm, seperti sekarang)

Bottom nav **tidak** ditambah tab ke-4 (tetap Edit / Preview / Contoh) supaya logika tab &
draft tidak tersentuh. Kalau perlu discoverability "panduan", tambah ikon `?` di header.

## 9. Accept criteria (harus lolos sebelum production)

**Performa (mobile, throttled 4G, Lighthouse)**
- LCP ≤ 2.0 dtk dan elemen LCP = teks H1
- CLS ≤ 0.05 (ruang visual & area error di-reserve)
- Performance ≥ 90, SEO & PWA tidak turun
- Bundle JS landing tidak naik > 5 KB (animasi pakai CSS, bukan library)

**Fungsional**
- 390×844 & 360×640: tanpa horizontal scroll; H1 + sub + chips + CTA utama terlihat tanpa scroll
- Sticky bar muncul setelah hero, hilang saat masuk workspace, tidak menutupi nav editor
- Sheet: buka dari sticky bar & hero CTA, tutup via Escape / backdrop / tombol; scroll body terkunci
- Semua mode form jalan di sheet: Masuk, Daftar, Lupa password, Atur ulang password
- Pesan guard (email disposable / role / rate limit / 429) tampil di `#auth-err` dengan rapi
- Setelah daftar/masuk: workspace terbuka, draft aman, saldo & kuota benar
- Galeri 51 template: semua 51 tampil, klik → preview

**Regresi (tidak boleh rusak)**
- Editor: Edit → Preview → Contoh → Edit, draft user tidak berubah (sudah ada gate render 51/51)
- `check-syntax` 23/23, `check-render` 51/51, tidak ada id duplikat
- Reset password end-to-end tetap lolos (tautan asli → set password → login)
- Psignup guard: 6 skenario (normal/disposable/role/plus/korporat/pola acak) tetap sesuai
- `/admin` tetap normal, 0 error konsol
- Halaman legal tetap 200, `sitemap.xml` & `llms.txt` masihsinkron

## 10. Rencana implementasi (tiap tahap bisa direview terpisah)

| Tahap | Isi | Output review |
|---|---|---|
| 1 | Hero baru: struktur, copy, chips, grid split + mobile | Preview: layout & copy |
| 2 | Auth card pindah → sheet mobile / kolom kanan desktop (+ a11y) | Preview: alur daftar & masuk |
| 3 | Animasi "mesin dokumen" + autoplay + reduced motion | Preview: gerak & bobot |
| 4 | Galeri 51 template + section bawah dirapikan | Preview: scroll & SEO |
| 5 | Menu akun/panduan di dalam app (avatar + ikon `?`) | Preview: alur dalam app |
| 6 | Polish + Lighthouse + regression penuh + push production | Report + checklist |

Tiap tahap: cek lokal di 390px & desktop, cek konsol 0 error, update gate, commit di branch,
kirim URL Preview.

## 11. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Memindahkan auth card-HTML merusak mode form | Node dipindah, bukan ditulis ulang; `setAuthMode`/`authSubmit`/`showAuthError` tidak diubah; regression test 4 mode |
| `.auth-card .field[hidden]` (fix lama) ikut hilang | CSS-nya scoped ke `.auth-card` → tetap berlaku di sheet; dicek di test |
| Animasi bikin lambat di 3G | CSS-only, start setelah LCP, pause saat hidden; ukur Lighthouse sebelum/sesudah |
| CLS karena area error auth | `#auth-err` height minimal reserved di sheet |
| Sticky bar menutupi nav editor | Bar hanya render saat landing tampil (`#auth-modal` visible) |
| Auth guard_msg kepanjangan bikin sheet tinggi | Bungkus pesan di max 3 baris + scroll internal |
| Cookie/privasi: tidak ada tracking baru | Tidak ada analytics/iklan yang ditambahkan |
| Dokumen di galeri berat (51 render) | Kartu text-first, render thumbnail hanya saat terlihat (IntersectionObserver) |

## 12. Di luar scope brief ini

- Ganti palet/brand system menyeluruh
- Multi-bahasa
- Halaman blog/SEO content (bisa menyusul; galeri template adalah fondasinya)
- Payment gateway & top-up otomatis
- Notifikasi email (butuh SMTP)
