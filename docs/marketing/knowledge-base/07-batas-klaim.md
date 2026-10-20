# 07 — Batas Klaim, Legal & Checklist Pre-publish

> Bagian ini yang paling sering dilanggar oleh LLM. **Baca dulu sebelum mem-publish naskah iklan.**

## 1. Klaim yang WAJIB benar (angka yang tidak boleh berubah)

| Klaim | Nilai | Sumber |
|---|---|---|
| Jumlah template | 51 | katalog aplikasi |
| Jumlah kategori | 7 | Finance, Legal, UMKM, Logistik, Pajak, Proyek, Operasional |
| Kuota akun baru | 10 dokumen | ledger trial default |
| Kuota AI | 10 pesan/hari | limit aplikasi |
| Harga UMKM & Logistik | Rp500/dokumen | billing_settings |
| Harga Finance | Rp1.000/dokumen | billing_settings |
| Harga Legal/Pajak/Proyek/Operasional | Rp2.500/dokumen | billing_settings |
| Buka 1 kategori premium | Rp39.000 | billing_settings |
| Buka semua kategori premium | Rp129.000 | billing_settings |
| Top-up | diproses manual oleh admin | alur aplikasi |
| Halaman legal | /privasi.html dan /ketentuan.html | situs |

> Kalau nanti harga/kuota berubah, **update file ini dulu**, baru buat naskah iklan baru.

## 2. Klaim yang DILARANG

| Jangan tulis | Alasan |
|---|---|
| “e-Faktur”, “formulir resmi”, “resmi dari pemerintah” | FakturKu bukan layanan pajak resmi |
| “Menjamin kepatuhan pajak” | dokumen/tools hanya alat bantu |
| “Kirim invoice otomatis / terjadwal” | fitur ini belum ada |
| “Gratis selamanya / tanpa batas” | kuota 10 dokumen, danach berbayar |
| “Ribuan pengguna”, “paling banyak dipakai” | belum ada data sah |
| “Support 24/7” | belum ada tim CS 24/7 |
| “Dijamin benar / dijamin comply” | pengguna yang bertanggung jawab atas isi |
| “Cetak struk di semua printer” | tergantung perangkat & driver |
| “Bisa di Android & iPhone” tanpa catatan | bisa, tapi lewat browser/PWA — sebut “bisa dipasang ke layar utama” |
| “Top-up instan” | manual oleh admin |
| Membandingkan dengan produk kompetitor bernama | alasan hukum dan tidak adil |

## 3. Testimoni & social proof

- **Belum boleh** menulis “ribuan pengguna”, “rating 4,9”, “dipakai 5.000 toko”, dsb.
- Testimoni **hanya boleh** kalau ada izin tertulis dari orang yang benar-benar memakai, dan angkanya
  bisa dipertanggungjawabkan.
- Boleh menulis bentuk non-kuantitatif: “Dibuat untuk usaha kecil yang butuh dokumen cepat.”
- Jika nanti sudah ada testimoni asli, simpan di file terpisah (`09-testimoni.md`) sebagai sumber sendiri.

## 4. Klaim keamanan (boleh, dengan kalimat yang benar)

**Boleh:**
- “Data tiap user terpisah di level database.” (benar: RLS per pengguna)
- “Admin hanya melihat data akun, saldo, dan permintaan top-up; isi dokumen tidak dibuka admin.”
- “Password disimpan dalam bentuk hash oleh penyedia autentikasi.” (benar)
- “HTTPS di seluruh halaman.”

**Jangan:**
- “Data 100% aman” / “anti-hack” / “terenkripsi end-to-end” (belum diujiKlaim).
- “Server located in Indonesia” (server Supabase berada di Singapore — kalau disebut lokasi, sebut jujur).

## 5. Penargetan & privasi iklan

- Jangan kirim data pengguna ke jaringan iklan tanpa persetujuan.
- Jangan menulis “Kami akan menghubungi Anda” tanpa izin.
- Halaman kebijakan privasi & syarat-ketentuan harus bisa diakses dari iklan (sudah ada, URL stabil).

## 6. Checklist sebelum tayang (10 poin)

- [ ] Semua angka (51, 7, 10, Rp500/1.000/2.500, Rp39.000, Rp129.000) cocok dengan `01-fakta-produk.md`.
- [ ] Tidak ada kata terlarang di tabel bagian 2.
- [ ] Tidak ada janji fitur yang belum ada (kirim otomatis, e-Faktur, 24/7).
- [ ] Ada 1 CTA tunggal dan jelas.
- [ ] Tidak menyebut kompetitor.
- [ ] Hook ≤ 3 detik / headline ≤ 40 karakter (Meta) atau sesuai batas tiap platform.
- [ ] Link menuju `https://fakturku.vercel.app/` (atau ke section yang relevan), bukan ke halaman lama.
- [ ] Visual tidak lebih dari ±8 kata besar + 1 CTA.
- [ ] Angka versi/harga terbaru sudah dicek ke sumber.
- [ ] UntukFtpublikasi yang menyebut “gratis”, yang dimaksud hanya kuota awal 10 dokumen.

## 7. Contoh headline yang sudah aman (referensi tone)

- “Bukan Cuma Faktur. 51 Template Dokumen.”
- “Surat Perjalanan Dinas? Formatnya Sudah Ada.”
- “Struk 58 mm. Rapi. Langsung dari HP.”
- “SPK sampai BAST, Formatnya Sudah Diseragamkan.”
- “10 Dokumen Gratis. Tanpa Kartu Kredit.”
- “Pratinjau Dulu, Baru Kirim. Nggak Ada Salah Kirim Lagi.”
