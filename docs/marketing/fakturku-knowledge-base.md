# FakturKu — Knowledge Base (versi gabungan)

Materi sumber untuk generate naskah iklan FakturKu. Gunakan hanya fakta di bawah; jangan mengarang
angka, fitur, atau nama pengguna. Jangan menulis klaim resmi/otomatis/pajak. Selalu tutup dengan 1 CTA.

---

# FakturKu — Knowledge Base untuk Generate Iklan

Folder ini adalah **sumber materi** untuk membuat copy iklan FakturKu.
Struktur sengaja dipecah per topik: di NotebookLM/Claude/LLM, **satu file = satu sumber**,
supaya jawaban LLM bisa menyertakan sitasi per topik dan tidak mencampur facts.

## Isi folder

| File | Isi | Gunanya saat generate |
|---|---|---|
| `00-panduan-pakai.md` | Cara pakai, aturan main, output yang diminta | Instructions untuk LLM |
| `01-fakta-produk.md` | Fakta produk: angka, fitur, harga, batasan | Wajib jadi acuan harga/fitur |
| `02-katalog-template.md` | 51 template + kegunaannya | Bahan headline spesifik ("surat perjalanan dinas") |
| `03-audien-dan-masalah.md` | Persona, masalah, momen beli, keberatan | Menentukan untuk siapa & sudut mana |
| `04-posisi-dan-pesan.md` | Positioning, H1 final, value prop, 10 angle pesan | Inti-what-to-say |
| `05-bahasa-dan-nada.md` | Nada bicara, kosakata, larangan | Menjaga hasil tetap "FakturKu" |
| `06-angle-iklan.md` | Pustaka angle + playbook per platform | Format &(headline/hook/CTA) siap pakai |
| `07-batas-klaim.md` | Batas klaim, legal, checklist pre-publish | Mencegah klaim berlebihan |
| `08-faq-objection.md` | FAQ + jawaban singkat | Untuk FAQ landing, reply kolom, CS |

## Cara pakai (NotebookLM)

1. Unggah **semua file** ini ke satu notebook.
2. Tambahkan instruksi berikut saat meminta copy (tempel ke "Custom instructions"):
   > Gunakan hanya fakta dari sumber. Jangan mengarang harga, fitur, jumlah template, atau
   > nama pengguna. Jangan menulis klaim bahwa template pajak/hukum bersifat resmi atau
   > menjamin kepatuhan. Jangan menulis "gratis" untuk fitur berbayar. Jawab dalam Bahasa
   > Indonesia, gaya Percakapan, maksimal 3 alternatif per permintaan, sertakan brief brief
   > singkat (untuk siapa, angle apa, platform apa).
3. Minta per **angle × persona × platform** (lihat `06-angle-iklan.md`).
4. Setelah jadi, cek hasilnya against `07-batas-klaim.md` sebelum tayang.

## Aturan main untuk LLM

1. **Fakta > (\[x] rhetorik)**. Harga, jumlah template, kuota: ambil dari `01-fakta-produk.md`.
2. **Spesifik menang**. "Buat surat perjalanan dinas" lebih kuat daripada "buat dokumen".
3. **Jangan janjikan otomatis** yang tidak otomatis (lihat batasan di `01`).
4. **Jangan komparasi dengan produk kompetitor bernama**.
5. **Format per platform** mengikuti `06-angle-iklan.md` (batas karakter).
6. Setiap copy wajib punya **1 ide utama** (bukan 3 sekaligus) + 1 CTA.

## Fakta paling sering dipakai (ringkas)

- 51 template dokumen, 7 kategori.
- 10 dokumen gratis untuk akun baru (kuota awal, bukan langganan).
- Harga per dokumen: Rp500 (UMKM, Logistik), Rp1.000 (Finance), Rp2.500 (Legal, Pajak, Proyek, Operasional).
- Buka 1 kategori premium: Rp39.000. Buka semua kategori: Rp129.000.
- Output: cetak A4 / Save as PDF, struk thermal 58 mm, simpan sebagai gambar, kirim WhatsApp/Telegram.
- Asisten AI: 10 pesan per hari, tersedia di dalam workspace.
- Top-up diproses manual oleh admin (bukan pembayaran instan).

---

# 01 — Fakta Produk FakturKu

> Sumber kebenaran untuk semua angka & klaim. Kalau tidak tertulis di file ini, **jangan diklaim** di iklan.

## 1. Faktor definisi

FakturKu adalah **aplikasi web (PWA) berbahasa Indonesia untuk membuat dokumen bisnis**: faktur, kwitansi,
invoice digital, struk, surat penawaran, purchase order, dan dokumen administrasi lain. Pengguna memilih format
siap pakai, mengisi data, melihat pratinjau, lalu mencetak atau membagikannya.

**FakturKu bukan:**
- aplikasi pajak resmi / bukan e-Faktur / bukan formulir bersertifikat
- layanan notar, LEGAL, atau konsultan hukum
- sistem penagihan otomatis (tidak mengirim invoice ke pelanggan secara otomatis)
- aplikasi kasir/POS lengkap dengan stok & pelanggan (ada template struk, bukan sistem kasir)
- paket Microsoft Word/Excel (tidak ada akses ke file .docx/.xlsx)

## 2. Angka utama

| Fakta | Nilai |
|---|---|
| Jumlah template | **51** |
| Jumlah kategori | **7** (Finance, Legal, UMKM, Logistik, Pajak, Proyek, Operasional) |
| Kuota dokumen gratis untuk akun baru | **10 dokumen** (sekali, bukan langganan) |
| Kuota Asisten AI | **10 pesan per hari per akun** |
| Harga dokumen tier gratis (Finance, UMKM, Logistik) | **Rp500–Rp1.000 per dokumen** |
| Harga dokumen kategori premium (Legal, Pajak, Proyek, Operasional) | **Rp2.500 per dokumen** |
| Buka 1 kategori premium | **Rp39.000** (sekali) |
| Buka semua kategori premium | **Rp129.000** (sekali) |
| Platform | Web (bisa dipasang ke layar utama HP, PWA) |
| Bahasa | Indonesia |

## 3. Kategori & harga

| Kategori | Harga/dokumen | Buka kategori | Isi template |
|---|---|---|---|
| Finance | Rp1.000 | gratis | 10 |
| UMKM | Rp500 | gratis | 9 |
| Logistik | Rp500 | gratis | 6 |
| Legal | Rp2.500 | Rp39.000 | 8 |
| Pajak | Rp2.500 | Rp39.000 | 5 |
| Proyek | Rp2.500 | Rp39.000 | 8 |
| Operasional | Rp2.500 | Rp39.000 | 5 |

## 4. Fitur (dan batasnya)

1. **51 template siap pakai** — setiap template punya kolom yang sudah ditentukan, bisa diedit semua.
2. **Pratinjau langsung** — hasil terlihat sebelum dicetak, persis seperti yang akan keluar.
3. **Cetak A4 / Save as PDF** — lewat dialog print browser atau printer biasa.
4. **Cetak struk thermal 58 mm** — untuk struk kasir dan struk angsuran. *Hasil cetak bergantung pada
   layout dokumen, browser, driver, dan dukungan printer thermal pengguna.*
5. **Simpan sebagai gambar** — untuk dikirim ke chat.
6. **Bagikan ke WhatsApp / Telegram** — dari perangkat sendiri. *Pilihan berbagi bisa berbeda antara
   Android, iPhone, dan desktop; pengguna disarankan periksa pratinjau dulu.*
7. **Nomor dokumen otomatis** — format `KATEGORI-TAHUN-URUT`, unik per pengguna per tahun, otomatis.
8. **Hitung total otomatis** — subtotal, diskon, pajak, dan total; nominal dalam bentuk-terbilang (bahasa).
9. **Simpan draft & sinkron antar perangkat** — draft tersimpan di akun (bukan hanya di HP).
10. **Contoh terisi (tab Contoh)** — lihat dokumen dengan data contoh tanpa merusak dokumen milik sendiri.
11. **Asisten AI** — tanya dengan bahasa sehari-hari untuk memahami kolom, merapikan catatan, dan menyusun
    draf awal sesuai jenis dokumen. Saran **tidak pernah diterapkan otomatis**; selalu periksa lagi hasilnya.
12. **PWA** — bisa dipasang ke layar utama; ringan, jalan di HP.

## 5. Alur pakai (ringkas, untuk copy)

Pilih kategori → pilih template → isi detail → lihat pratinjau → cetak / simpan / bagikan.
Tiga langkah yang disederhanakan di landing: **Pilih kategori · Isi detail · Cetak atau bagikan**.

## 6. Model bisnis & cara bayar (fakta, jangan disembunyikan)

- Dashboard gratis: 10 dokumen (kuota awal), dokumen tier gratis, dan semua fitur editor.
- Dokumen berbayar dibeli per dokumen (Rp500–Rp2.500) memakai saldo; atau buka kategori premium sekali bayar.
- **Top-up saldo diproses manual oleh admin** (transfer → konfirmasi admin → saldo masuk). Tidak ada
  pembayaran instan/otomatis di dalam aplikasi. Ini batasan nyata — jangan ditulis seolah otomatis.
- Tidak ada biaya langganan bulanan yang dipPromise; yang ada adalah pembelian kuota/kategori.

## 7. Batasan yang wajib dihormati saat menulis iklan

- **Tidak mengirim dokumen otomatis** (tidak ada invoice scheduler).
- **Template pajak/hukum = alat bantu administratif**, bukan formulir resmi dan bukan jaminan kepatuhan.
- **Top-up manual** — pengguna baru akan menunggu konfirmasi admin (bukan instan).
- **Kuota AI 10 pesan/hari** — jangan menjanjikan asisten tanpa batas.
- **Struk thermal bergantung perangkat** — jangan menjanjikan "cetak struk mulus di semua printer".
- Tidak ada fitur stok, kasir lengkap, penagihan otomatis, akuntansi, atau pajak resmi.

---

# 02 — Katalog 51 Template FakturKu

> Bahan headline & body iklan yang **spesifik**: nameof template + kegunaannya, bukan generic "dokumen bisnis".
> Keterangan singkat = cara template itu dipakai (bukan klaim).

## Finance (10 template) — harga Rp1.000/dokumen, tanpa perlu buka kategori

| Template | Untuk apa |
|---|---|
| Faktur Penjualan (A4) | Faktur penjualan standar ke pelanggan, format A4 |
| Invoice Digital (Share WA/TG) | Invoice untuk dikirim langsung ke chat WhatsApp/Telegram |
| Kwitansi / Tanda Terima (A4) | Bukti pembayaran diterima |
| Nota Kredit / Credit Note | Koreksi tagihan yang sebelumnya terlalu besar |
| Nota Debit / Debit Note | Koreksi tagihan yang sebelumnya terlalu kecil |
| Surat Tagihan | Permintaan pembayaran atas transaksi yang disepakati |
| Invoice Periodik (Format) | Format tagihan berkala (format saja, tidak mengirim otomatis) |
| Bukti Kas Masuk/Keluar | Bukti penerimaan/pengeluaran kas beserta nominal |
| Proforma Invoice | Rancangan tagihan sebelum transaksi final |
| Kartu Piutang | Rekap tagihan yang belum lunas per pelanggan |

## UMKM (9 template) — Rp500/dokumen, tanpa perlu buka kategori

| Template | Untuk apa |
|---|---|
| Struk POS (58 mm) | Struk ringkas transaksi kasir untuk printer thermal |
| Struk Angsuran (Thermal 58mm) | Struk pembayaran angsuran (pinjol/kredit) |
| Nota Kontan | Bukti transaksi penjualan tunai |
| Surat Penawaran Harga | Penawaran harga produk/jasa ke calon pelanggan |
| Surat Pesanan | Catatan pesanan barang/jasa dari pelanggan |
| Daftar Harga / Price List | Daftar produk/jasa beserta harga satuan |
| Nota Servis | Catatan servis, tindakan perbaikan, sparepart (bengkel/jasa perbaikan) |
| Rekap Penjualan Harian | Rekap omzet harian + kas masuk/keluar |
| Nota Timbang | Catatan timbangan hasil bumi: berat, harga/kg, potongan |

## Logistik (6 template) — Rp500/dokumen, tanpa perlu buka kategori

| Template | Untuk apa |
|---|---|
| Surat Jalan | Dokumen pendamping pengiriman barang (bukan bukti pembayaran) |
| Bukti Terima Barang | Catatan jumlah & kondisi barang yang diterima |
| Surat Retur Barang | Dokumen pengembalian barang + alasan |
| Packing List | Daftar isi kemasan untuk pemeriksaan pengiriman |
| Manifest Pengiriman Harian | Daftar kiriman harian kurir: penerima, resi/COD, jumlah paket |
| Berita Acara Selisih Barang | Catatan selisih/kerusakan barang saat bongkar + tindak lanjut |

## Legal (8 template) — Rp2.500/dokumen, buka kategori Rp39.000

| Template | Untuk apa |
|---|---|
| Perjanjian Kerja Sama | Kerangka administrasi kerja sama untuk ditinjau para pihak |
| Perjanjian Borongan Kerja | Kerangka perjanjian kerja borongan (nilai, termin, jangka wajib disesuaikan) |
| Perjanjian Sewa | Kerangka perjanjian sewa alat/kendaraan/tempat |
| Surat Kuasa | Kerangka surat kuasa untuk diisi sesuai kewenangan |
| Surat Pernyataan | Pernyataan tertulis yang harus sesuai fakta & tujuan |
| Surat Pengakuan Utang | Kerangka pengakuan utang + jadwal pembayaran |
| Memorandum of Understanding (MoU) | Kerangka MoU; daya ikat wajib ditinjau sebelum ditandatangani |
| Letter of Intent (LOI) | Pernyataan minat awal; daya ikat bergantung isi & konteks |

## Proyek (8 template) — Rp2.500/dokumen, buka kategori Rp39.000

| Template | Untuk apa |
|---|---|
| Surat Perintah Kerja (SPK) | Ringkasan penugasan, lingkup, jadwal, nilai pekerjaan |
| Rencana Anggaran Biaya (RAB) | Estimasi biaya proyek (sesuaikan lingkup & harga aktual) |
| Berita Acara Serah Terima (BAST) | Catatan penyerahan hasil pekerjaan/barang + kondisi penerimaan |
| Tagihan Termin Proyek | Tagihan progres proyek (verifikasi kontrak, progres, DP, retensi dulu) |
| Berita Acara Progres | Catatan hasil pemeriksaan & progres pekerjaan |
| Laporan Harian Proyek | Catatan lapangan: pekerjaan, tenaga kerja, cuaca, kendala, material |
| Surat Perintah Bayar | Administrasi internal mengajukan/memproses pembayaran |
| Rekap Upah Harian | Rekap upah tukang/pekerja harian per periode |

## Pajak (5 template) — Rp2.500/dokumen, buka kategori Rp39.000

| Template | Untuk apa |
|---|---|
| Lembar Data Faktur Pajak (Internal) | **Lembar kerja internal** untuk menyiapkan data perpajakan |
| Rekap PPN Internal | Rekap data untuk pemeriksaan internal sebelum pelaporan |
| Lembar Data Bukti Potong PPh | Lembar kerja merapikan data saat menyiapkan bukti potong |
| Checklist Dokumen Pajak | Checklist kelengkapan berkas internal |
| Rekap Omzet & PPh Final UMKM | Rekap omzet bulanan UMKM untuk persiapan PPh final |

> ⚠️ Semua template Pajak bersifat **internal/alat bantu**. Bukan formulir resmi, bukan e-Faktur,
> dan tidak menggantikan pemeriksaan wajib pajak.

## Operasional (5 template) — Rp2.500/dokumen, buka kategori Rp39.000

| Template | Untuk apa |
|---|---|
| Memo Internal | Komunikasi singkat untuk kebutuhan internal organisasi |
| Surat Perjalanan Dinas | Penugasan perjalanan dinas (sesuaikan kebijakan organisasi) |
| Form Klaim Biaya | Rekap penggantian biaya + rincian & bukti pendukung |
| Purchase Order (PO) | Pesanan pembelian ke pemasok (bukan bukti barang diterima) |
| Slip Gaji | Ringkasan gaji internal (jaga kerahasiaan dokumen) |

## Cara memakai katalog ini untuk naskah iklan

- **Pakai nama template apa adanya** ketika menyasar kebutuhan spesifik:
  "Bikin surat perjalanan dinas tanpa mikir formatnya."
- **Jangan sebut semua 51** di satu iklan; sebut 1–3 yang paling nyambung dengan audiens.
- **Angka "51 template" boleh muncul** sebagai klaim katalog (fakta), bukan sebagai "terlengkap".
- Untuk kategori premium, sebut mechanism-nya (sekali bayar Rp39.000) — jangan menyebut "Rp2.500 per dokumen"
  tanpa menjelaskan bahwa kategorinya harus dibuka dulu.

---

# 03 — Audiens, Masalah, dan Momen Beli

## 1. Persona utama

### A. Pedagang & pemilik UMKM (WhatsApp-first)
- **Kondisi:** transaksi harian, 부분 besar via WhatsApp, tanpa kasir yang lengkap.
- **Yang dibutuhkan:** nota/faktur/struk cepat, tidak ribet, bisa langsung kirim ke pelanggan.
- **Kendala sekarang:** bikin dari nol tiap transaksi; file bertebaran; salah nominal/tanggal.
- **Kata kunci yang dipikir:** "template struk", "cara bikin struk tanpa aplikasi kasir", "nota penjualan sederhana".
- **Nilai FakturKu buat dia:** struk POS 58 mm + nota kontan + faktur A4, semua gratis (Rp500/dokumen).

### B. Freelance & jasa kreatif/konsultan
- **Kondisi:** tawaran datang via chat, proyek episodic, butuh dokumen resmi untuk klien.
- **Yang diminta:** surat penawaran harga, invoice, kuitansi, kontrak sederhana.
- **Kendala:** bikin penawaran dari nol tiap proyek; tidak ada format yang rapi dan konsisten.
- **Nilai:** Surat Penawaran Harga + Invoice Periodik + Faktur A4, draft AI untuk klausul pembayaran.

### C. Admin operasional & tim proyek
- **Kondisi:** banyak dokumen harian (SPK, BAST, harian lapangan, klaim biaya, PO).
- **Yang diminta:** format yang seragam, cepat diisi, benar nomornya.
- **Kendala:** file WORD berbeda tiap orang; nomor & tanggal berantakan; bidang wajib different.
- **Nilai:** 8 template Proyek + 5 Operasional dengan kolom yang sudah ditentukan.

### D. Staf administrasi & finance
- **Kondisi:** dokumen masuk dari berbagai unit, perlu segera keluar dengan format baku.
- **Yang diminta:** surat, rekap, checklist, bukti kas.
- **Nilai:** Surat Pernyataan, Rekap Penjualan Harian, Bukti Kas Masuk/Keluar, Checklist Dokumen Pajak.

## 2. Masalah yang sering muncul (bisa jadi angle iklan)

1. "Dokumen diminta mendadak, file-nya entah di mana."
2. "Template berbeda-beda di chat, folder, atau laptop kantor."
3. "Nomor, tanggal, nama pelanggan, dan nominal harus dicek lagi."
4. "Dokumen harus bisa ditunjukkan, dicetak, atau dikirim saat dibutuhkan."
5. "Format tiap dokumen beda-beda, tiap orang bikin sendiri."
6. "Sudah pakai Word, tapi isian dan formatting-nya makan waktu lama."
7. "Harus minta orang design/bikin dokumen, lama."

## 3. Momen beli (trigger)

- Pelanggan/klien minta faktur atau nota **pada saat itu juga**.
- Akhir bulan: rekap penjualan, pajak, laporan.
- Proyek baru mulai: perlu SPK/RAB/penawaran.
--exp shipping: butuh surat jalan & bukti terima.
- Konten/media sosial & testimonial: butuh slip gaji, surat pernyataan, form klaim.

## 4. Keberatan & cara menjawab ( truthful )

| Keberatan | Jawaban |
|---|---|
| "Mahal?" | 10 dokumen gratis. Setelah itu Rp500–Rp2.500 per dokumen, dan kategori premium bisa dibuka sekali Rp39.000. Jauh lebih murah daripada waktu bikin dokumen manual. |
| "Ini aplikasi resmi pajak?" | Bukan. Ini alat bantu administratif untuk menyiapkan dokumen; pelaporan tetap ke kantor pajak masing-masing. |
| "Data saya aman?" | Data tiap user terisolasi di level database; admin hanya melihat data akun, saldo, dan permintaan top-up. Dokumenmu tidak dibuka admin kecuali kamu minta. |
| "Bisa cetak struk?" | Bisa, lewat printer thermal 58 mm. Hasilnya bergantung perangkat & driver printer, jadi periksa pratinjau dulu. |
| "Bisa diedit?" | Bisa. Semua kolom template bisa diubah, dan ada pratinjau sebelum dicetak. |
| "Harus online terus?" | Draft tersimpan di akun, jadi tetap sinkron; tampilan ringan di HP. |
| "Bisa kirim invoice otomatis?" | Belum. FakturKu menyiapkan dokumennya; pengiriman tetap kamu lakukan dari WhatsApp/Telegram. |
| "Top-up-nya lama?" | Saldo masuk setelah admin konfirmasi, jadi bukan instan. |
| "Ada struk & kasir?" | Ada template struk POS untuk dicetak; FakturKu bukan aplikasi kasir lengkap dengan stok. |
| "Bisa di-android/iphone?" | Bisa, lewat browser; aplikasinya bisa dipasang ke layar utama (PWA). |

## 5. Bukan target kita

- User yang butuh akuntansi/COA lengkap, Payroll, atau kasir dengan stok.
- Kantor yang butuh e-Faktur resmi yang terintegrasi dari server.
- User yang organizer-nya ingin, "', "Bisa generate thousands of docs per hour otomatis" (tool ini untuk manusia, bukan batch).

---

# 04 — Positioning & Pesan

## 1. Positioning statement (internal, untuk konsistensi antar materi)

> Untuk **pengusaha, freelance, dan tim operasional di Indonesia** yang butuh dokumen bisnis
> setiap hari, **FakturKu** adalah **aplikasi dokumen siap pakai dengan 51 template lintas kategori**
> — karena **format, kolom, nomor, dan total sudah disiapkan**, jadi pengguna cukup **isi, lihat
> pratinjau, cetak/bagikan** — bukan menyusun dokumen dari nol.

## 2. H1 final (dipakai di landing & iklan)

**H1 utama (dipakai live di landing & hero iklan):**
```
Semua Urusan Dokumen Bisnis, Beres di Satu Tempat.
```
**Sub-headline:**
```
Nggak perlu lagi bongkar folder nyari format lama. Dari bikin invoice, struk, sampai surat
perjanjian, semua ada 51 template-nya. Bingung nulis keterangannya? Ada Asisten AI yang siap bantu buatin.
```

**H1 alternatif (kalau perlu variasi):**
- `Setiap urusan butuh dokumen. Semuanya sudah jadi template.`
- `Dari invoice sampai purchase order. Semua formatnya sudah ada.`
- `51 format dokumen. 1 akun. 0 menit bikin dari nol.`

**Eyebrow:** `51 TEMPLATE · 7 KATEGORI`

**CTA utama:** `Buat akun gratis` · **CTA sekunder:** `Lihat contoh dokumen`

## 3. Value proposition (6, pakai yang cocok dengan angle)

1. **Format sudah jadi** — kolom, nomor, dan total sudah disiapkan untuk 51 jenis dokumen.
2. **Bisa dipratinjau** — lihat hasilnya persis seperti yang akan dicetak, sebelum dikirim.
3. **Satu format, banyak output** — A4, Save as PDF, struk thermal 58 mm, gambar, WhatsApp/Telegram.
4. **Nomor & tanggal otomatis** — tidak perlu mikir urutannya, nomor unik per pengguna.
5. **Mulai gratis, tanpa kartu kredit** — 10 dokumen gratis untuk akun baru.
6. **Ada“Asisten AI”** — tanya kolom yang bingung, draf awal untuk klausul; hasilnya tetap kamu yang periksa.

## 4. Diferensiasi (boleh ditulis, tapi jangan arrogant)

- **vs Word/Excel manual**: tidak ada file bertebaran, tidak ada format yang beda-beda, nomor & total otomatis.
- **vs aplikasi faktur “murni”**: FakturKu bukan hanya faktur — 7 kategori, 51 template, termasuk proyek, legal, pajak, operasional.
- **vs download template gratis**: template gratis biasanya PDF kosong yang harus diedit manual; di sini kamu isi field yang sudah jelas, hasilnya langsung siap cetak & kirim.
- **vs menyewa desainer/admin**: template siap; biaya jauh lebih murah.

> Hindari menyebut nama kompetitor. Bandingkan dengan **cara lama** (manual/Word), bukan dengan produk lain.

## 5. 10 angle pesan (sumber untuk generate iklan)

1. **“Semua urusan beres di satu tempat”** — breadth: 51 template, 7 kategori. *(angle utama, sesuai H1)*
2. **“Dokumen diminta mendadak”** — urgency: dari nol → siap kirim dalam hitungan menit.
3. **“File invoice_final_fix2.docx”** — chaos file: everything in one workspace.
4. **“Bikin struk 58 mm”** — UMKM/retail: struk thermal siap cetak.
5. **“Surat penawaran & kontrak”** — freelance/professional: klausul & nomor urut.
6. **“SPK sampai BAST”** — tim proyek: satu paket dokumen lapangan.
7. **“Rekap harian tanpa Excel”** — admin: rekap omzet & kas dari HP.
8. **“Lembar pajak, bukan e-Faktur”** — disclaimer sebagai force: tools bantu, bukan formalitas.
9. **“10 dokumen gratis, tanpa kartu kredit”** — acquisition.
10. **“Pratinjau dulu, baru kirim”** — quality/control: no more typos in front of customers.

## 6. Tagline options

- `Dokumen rapi. Urusan beres.` *(sudah dipakai di landing — tetap boleh)*
- `51 template. Semua urusan beres.`
- `Format sudah jadi. Tinggal isi.`
- `Dari nol ke siap kirim.`

## 7. Bentuk naskah yang harus dihindari

- Klaim hasil yang belum ada (mis. “kirim invoice otomatis”, “cetak struk di semua printer”).
- Klaim “gratis” untuk dokumen berbayar.
- Menjelekkan produk lain atau menyebut kompetitor.
- Janji hasil bisnis (“naik omzet 2x”) — tidak ada data pendukung.
- Menyebut jumlah pengguna/pembayaran yang belum ada buktinya.

---

# 05 — Bahasa, Nada, dan Kosakata

## 1. Nada bicara

**FakturKu bicara seperti rekan kerja yang sudah paham urusan**: tenang, to the point, tahu urusan bisnis,
tidak sok sibuk, tidak berlebihan. Bahasa Indonesia sehari-hari, bukan bahasa korporat.

| Karakter | Ya | Tidak |
|---|---|---|
| Hangat & ramah | "Bikin struk tanpa ribet." | "Solusi terpadu revolusioner." |
| Ringkas | "Isi, cek, kirim." | Paragraf panjang tanpa inti. |
| Baku & jujur | "Belum kirim otomatis; kamu kirim sendiri." | "Kirim invoice otomatis ke pelanggan!" |
| Menghargai waktu | "Tanpa bikin dari nol." | "Bikin hemat berjam-jam!" (tanpa bukti) |
| Memakai angka nyata | "10 dokumen gratis." | "Puluhan fitur lengkap." |

## 2. Kosakata yang dipakai (konsisten)

| Pakai | Hindari |
|---|---|
| dokumen, template, format | file, dokumen (kcampur) |
| pratinjau | preview (boleh sekali), draft cepat |
| cetak / simpan / bagikan | print/scan (yang tidakKaren ada fiturnya) |
| thermal 58 mm | struk mini, struk kasir (kalau memang struk) |
| kuota dokumen | token, kredit (kalau tidak perlu) |
| saldo / top-up | saldo (konsisten) |
| workspace, ruang kerja | dashboard (bisa, tapi jangan berlebihan) |
| akun baru, gratis | free, free forever |

## 3. Aturan penulisan naskah iklan

1. **Satu ide per naskah.** Kalau ada 2 ide, buat 2 naskah.
2. **Kalimat pendek.** 5–12 kata per kalimat. Jangan kalimat majemuk bertele-tele.
3. **Mulai dari masalah atau dari hasil?** Untuk Meta/TikTok: dari masalah. Untuk Google Search: dari
   kebutuhan ("template surat perjalanan dinas").
4. **AngkaGa format Indonesia**: `Rp39.000`, `Rp2.500`, `10 dokumen`, `51 template`, `7 kategori`.
5. **Jangan pakai all-caps** untuk penekanan; pakai satu kata yang di-bold.
6. **CTA berupa aksi**, bukan fitur: "Buat akun gratis", "Lihat contohnya", "Coba 1 dokumen".
7. **Hindari tanda seru bertubi-tubi** ("Cepat!! Praktis!!").
8. **Tjangan memakai istilah teknis** (PWA, RLS, PDF/A) — cukup "cetak A4 atau Save as PDF".

## 4. Contoh rewrite (sebelum → sesudah)

| Sebelum (buruk) | Sesudah (FakturKu) |
|---|---|
| "Solusi dokumen terpadu untuk seluruh kebutuhan bisnis Anda!" | "Faktur, kuitansi, surat, PO. Semua formatnya sudah jadi." |
| "Gratis selamanya!" | "10 dokumen gratis untuk akun baru." |
| "Kirim invoice otomatis ke pelanggan Anda" | "Invoice siap kirim ke WhatsApp. Kamu yang tekan kirim." |
| "Aplikasi pajak resmi @" | "Lembar bantu data pajak. Pelaporan tetap ke kantor pajak." |
| "TERSEDIA 51+ TEMPLATE!!! (WOW)" | "51 template, 7 kategori." |
| "Mudah digunakan, cepat, praktis, efisien" | "Pilih format, isi, cetak. Selesai." |

## 5. Kalimat yang boleh dipakai (dalam bahasa FakturKu)

- “Semua urusan, satu tempat.”
- “Formatnya sudah ada. Tinggal isi.”
- “Pratinjau dulu, baru kirim.”
- “Nomor sama tanggal, tidak perlu mikir.”
- “Cetak A4 atau struk thermal. Pilih sesuai perangkat.”
- “Bikin surat perjalanan dinas tanpa mikir formatnya.”
- “10 dokumen gratis, tanpa kartu kredit.”
- “Semua formatnya dalam satu tempat, bukan 40 file di chat.”
- “Yang cek ulang tetap kamu. Selalu.”
- “Kirim lewat WhatsApp dari HP sendiri.”

## 6. Kalimat yang TIDAK boleh muncul

- “Resmi”, “resmi dari”, “terakreditasi”, “disahkan pemerintah”, “e-Faktur”.
- “Pajak otomatis”, “laporan ke DJP otomatis”.
- “Gratis selamanya”, “tanpa batas”, “unlimited”.
- “Paling lengkap/terbaik/#1 di Indonesia”.
- “Ribuan pengguna”, “jutaan dokumen dibuat” (tidak ada data sah).
- “Otomatis kirim ke pelanggan”, “terjadwal otomatis”.
- “DijaminAccepted” / “dijamin comply”.
- “Support 24/7” (belum ada tim CS 24/7).

---

# 06 — Pustaka Angle & Playbook Platform

## 1. Format per platform

### Meta Ads (Facebook / Instagram) — Feed
- **Headline (primary text, 125 char)**: 1 kalimat, masalah → nilai.
- **Headline (maksimal 40 char)**: "Semua Urusan Dokumen Bisnis."
- **Deskripsi**: 1 kalimat + CTA.
- **CTA button**: `Daftar` / `Selengkapnya` / `Kirim Pesan`.
- **Kreasi**: 1:1 (1080×1080) atau 4:5 (1080×1350) — **4:5 lebih tinggi engagement**.
  Isi visual: mockup dokumen (WA/IG) + 1 kalimat besar + 1 CTA. Jangan penuh teks.
- **Reels / Story**: 9:16, 15 detik, 3 scene: masalah → proses → hasil. Hook 3 detik pertama.

### TikTok (9:16, ≤60 detik)
Format: **masalah (0–3 dtk) → demo cepat (3–20 dtk) → CTA (20–30 dtk)**.
Teks di layar, suara tetap, subtitle besar. Hook wajib di detik pertama.

### Google Search (text)
- Judul: kata kunci + benefit. Contoh: "Template Surat Perjalanan Dinas | FakturKu".
- Deskripsi: 2 kalimat + harga/quota.
- Kata kunci yang masuk akal: *template surat*, *bikin struk*, *template invoice*, *template purchase order*,
  *template surat STATEMENT*, *bikin faktur gratis*, *template SPK*, *template BAST*, *struktur surat*.

### WhatsApp blast / broadcast
- Copy pendek (2–4 baris), 1 CTA, 1 link. Hook: "{nama}, invoice bulan ini sudah bisa disiapin 5 menit."

### Banner (display)
- 1 headline + 1 subheadline + 1 CTA + 1 logo. Teks besar, kontras.

## 2. Pustaka hook (3 detik pertama)

1. “File invoice-nya lagi di mana?”
2. “Sama seperti\: 'Mas, invoice-nya bisa dikirim sekarang?' — ‘Sebentar ya, saya cari dulu.’”
3. “Bukan cuma faktur. 51 template dokumen.”
4. “Surat perjalanan dinas? Formatnya sudah ada.”
5. “Struk 58 mm, rapi, tanpa install apa-apa.”
6. “Bikin SPK dan BAST tanpa ngetik ulang.”
7. “Rekap penjualan hari ini, dari HP.”
8. “51 format. 7 kategori. 1 akun.”

## 3. Pustaka headline

- `Bukan Cuma Faktur.`
- `51 Template. 1 Akun.`
- `Formatnya Sudah Jadi.`
- `Pratinjau Dulu, Baru Kirim.`
- `Nomor Otomatis.`
- `Cetak A4 atau Struk 58 mm.`
- `10 Dokumen Gratis.`
- `Bikin Surat Tanpa Format.`
- `Semua Dokumenmu dalam 1 Workspace.`

## 4. Pustaka sub-headline

- `Faktur, kuitansi, struk, surat, PO, SPK, surat jalan, lembar pajak.`
- `Isi, lihat pratinjau, cetak, kirim WhatsApp.`
- `Pilih format → isi data → cetak. Selesai.`
- `Tanpa bikin file dari nol.`
- `Gratis 10 dokumen. Tanpa kartu kredit.`
- `Berhenti menebak format dokumen.`

## 5. Pustaka CTA

`Buat akun gratis` · `Lihat contoh dokumen` · `Coba 1 dokumen gratis` · `Buat surat sekarang` ·
`Buka FakturKu` · `Lihat semua 51 template`

## 6. Angle × persona (siap dipakai)

| Angle | Untuk siapa | Inti naskah (contoh) |
|---|---|---|
| Dokumen mendadak | semua orang | “Pelanggan minta faktur sekarang? Formatnya sudah ada. Isi 2 menit, kirim.” |
| Bukan cuma faktur | freelancer/professional | “Butuh surat penawaran hari ini? 51 template buat semua urusan, bukan cuma faktur.” |
| Struk thermal | UMKM retail | “Struk 58 mm, rapi, langsung dari HP. Ganti Word, bukan bikin struk manual.” |
| File berantakan | admin/staf | “Berhenti nyari invoice_final_fix2 di chat. Semua dokumenmu di satu tempat.” |
| Proyek | tim proyek | “SPK, RAB, BAST, termin — formatnya sudah diseragamkan.” |
| Rekap harian | admin keuangan | “Rekap omzet & kas hari ini, langsung dari HP.” |
| Pajak | ?) | “Lembar data pajak & rekap PPN, siap kamu isi. Bukan e-Faktur, tapi jauh lebih cepat.” |
| Asisten AI | semua orang | “Bingung kolom apa yang perlu diisi? Tanya saja, drafting dibantu.” |
| Gratis | semua orang | “10 dokumen gratis. Nggak ada kartu kredit, nggak ada langganan bulanan.” |
| Pratinjau | pengguna yang skeptis | “Cek dulu pratinjau. Baru cetak. Nggak ada salah kirim lagi.” |

## 7. Rekomendasi targeting (hypothesis, harus diuji)

- **Wilayah**: kota tier-1/2 di Indonesia (cukup tulis kriteria, jangan menyebut nama vendor).
- **Usia**: 22–45.
- **Interest/keyword**: UMKM, toko online, Shopee/Tokopedia seller, freelance, EVENTorganizer, admin,
  akuntan, kontraktor, K3, ALIGNBY — uji per Interest.
- **Perilaku**: orang yang baru register di seller platform, yang aktif di grup bisnis/UKM.
- **Retargeting**: orang yang membuka landing tapi belum daftar (pakai pixel, kalau ada).

## 8. Ritel pengujian yang masuk akal

Mulai 3 variasi (bukan 8): **1) “Bukan Cuma Faktur” (breadth), 2) “Dokumen mendadak” (urgency),
3) “Struk 58 mm” (spesifik UMKM)**. Format sama, hanya hook & visual berbeda. Lihat mana yang performs
terbaik, baru perbanyak variasi dari angle yang menang.

---

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

---

# 08 — FAQ & Objection Handling

> Dipakai untuk: section FAQ di landing, balasan kolom komentar, script chat/WhatsApp, dan naskah iklan
> yang butuh menutup keberatan.

## 1. FAQ produk (jawaban singkat, siap tempel)

**1. FakturKu itu apa?**
Aplikasi dokumen bisnis: 51 template (faktur, kuitansi, struk, surat, PO, SPK, dan lainnya) yang tinggal diisi,
dilihat pratinjau, lalu dicetak atau dikirim.

**2. Apakah FakturKu aplikasi pajak?**
Bukan. FakturKu alat bantu administratif. Template pajak di dalamnya bersifat internal untuk menyiapkan data;
pelaporan tetap ke kantor pajak masing-masing.

**3. Harganya berapa?**
10 dokumen gratis untuk akun baru. Setelah itu Rp500 (UMKM/Logistik), Rp1.000 (Finance), Rp2.500
(Legal/Pajak/Proyek/Operasional) per dokumen. Kategori premium bisa dibuka sekali Rp39.000, atau semua
kategori Rp129.000.

**4. Beli dokumennya gimana?**
Isi saldo dulu lewat top-up, lalu saldo diproses manual oleh admin. Setelah saldo masuk, dokumen langsung
dipotong otomatis dari kuota/saldo.

**5. Top-up-nya instan?**
Belum. Sudah transfer, saldo masuk setelah admin konfirmasi.

**6. Bisa cetak struk?**
Bisa, format thermal 58 mm. Hasil akhir bergantung printer thermal, driver, dan browser yang dipakai —
periksa pratinjau dulu sebelum mencetak.

**7. Bisa print A4?**
Bisa, lewat dialog print browser, termasuk “Save as PDF”.

**8. Bisa kirim ke pelanggan?**
Bisa, dari perangkat sendiri lewat WhatsApp atau Telegram, atau simpan sebagai gambar lalu kirim. Pengiriman
dilakukan oleh kamu, tidak otomatis.

**9. Nomornya otomatis?**
Iya. Format otomatis per kategori dan tahun, unik per pengguna. Tidak perlu mikir urutan.

**10. Dataku aman?**
Dokumen tiap pengguna dipisahkan di level database, bukan hanya di tampilan. Admin melihat data akun, saldo,
dan permintaan top-up — isi dokumen tidak dibuka kecuali kamu minta bantuan.

**11. Bisa dipakai di HP?**
Bisa, langsung dari browser; aplikasinya bisa dipasang ke layar utama (PWA). Draft tersimpan di akun, jadi
lanjut dari perangkat lain.

**12. Ada fitur apa saja?**
Ada: pratinjau, hitung total otomatis, nominal terpilih, draft & sinkron antar perangkat, tab contoh terisi,
dan Asisten AI (10 pesan per hari) untuk bantu menjelaskan kolom dan menyusun draf awal.

**13. Bisa edit semua?**
Bisa. Semua kolom template bisa diubah, dan ada pratinjau sebelum dicetak.

**14.__, هل butuh install?**
Tidak. Cukup buka di browser. Tidak ada biaya langganan bulanan.

**15. Bantu generate invoice otomatis?**
Belum ada. FakturKu menyiapkan dokumennya, pengiriman tetap kamu lakukan.

## 2. Objection handling — versi sangat pendek (buat reply cepat)

| Objection | Balasan 1 kalimat |
|---|---|
| “Mahal” | 10 dokumen gratis dulu; setelah itu Rp500–Rp2.500 per dokumen, jauh lebih murah dari bikin dari nol tiap kali. |
| “Ini resmi?” | Ini aplikasi dokumen, bukan layanan pajak resmi. Untuk pajak, FakturKu cuma bantu siapkan datanya. |
| “Data aman?” | Data tiap orang terpisah di level database; admin pun tidak bisa membuka isi dokumenmu. |
| “Bisa struk?” | Bisa 58 mm; hasilnya tergantung printer dan driver, jadi cek pratinjau dulu. |
| “Nanti mahal?” | Nggak ada langganan bulanan. Top-up saldo saja, dan diproses manual oleh admin. |
| “Bisa kirim otomatis?” | Belum. Kamu tekan kirim sendiri dari WhatsApp — jadi tetap kamu pegang kendali. |
| “Saya belum punya PayLater” | 10 dokumen gratis tanpa kartu kredit, jadi bisa dicoba dulu. |

## 3. Kalimat penutup yang aman

- “Kalau mau lihat hasilnya, buka fakturku.vercel.app — 10 dokumen gratis, tanpa kartu kredit.”
- “Coba satu dokumen dulu. Kalau formatnya kurang cocok, tinggal bilang.”

## 4. Hal yang TIDAK boleh dijawab

- Janji “nanti saya kirim invoice ke pelanggan” (belum otomatis).
- Menjelaskan detail internal (nama server,atabase, provider, harga API).
- Memberi diskon di luar sistem.
- Mengganti topik ke produk lain yang belum ada.

---

# 10 — Brief Video Ads FakturKu

> Supaya LLM bisa menulis naskah + storyboard video iklan yang **siap produksi**.
> Aturan fakta tetap mengikuti `01-fakta-produk.md` dan `07-batas-klaim.md`.

## 1. Format & spesifikasi

| Platform | Rasio | Ukuran | Durasi ideal | Catatan |
|---|---|---|---|---|
| TikTok / Reels / Shorts | 9:16 | 1080×1920 | 15–30 detik | Hook wajib di 3 detik pertama |
| Meta Ads (feed) | 4:5 / 1:1 | 1080×1350 | 10–15 detik | Direct Mail / in-stream pendek |
| WhatsApp Status | 9:16 | 720×1280 | 15 detik | 1 ide, 1 CTA |
| YouTube Shorts | 9:16 | 1080×1920 | 20–40 detik | boleh lebih panjang & edukatif |

Wajib: **subtitle menyala** (80% orang menonton tanpa suara) + **teks besar di frame**.

## 2. Struktur yang dipakai (pilih salah satu)

### A. Problem → Solusi (15 detik)
| Waktu | Visual | Teks layar | VO |
|---|---|---|---|
| 0–3 dtk | Chat masuk: "Mas, invoice-nya bisa dikirim sekarang?" | "Invoice-nya lagi di mana?" | "Invoice-nya lagi di mana?" |
| 3–7 dtk | Meja kerja kacau: file `invoice_final_fix2.docx` | "File berserakan. Format beda-beda." | "File berserakan. Format tiap orang beda-beda." |
| 7–12 dtk | Demo cepat: pilih kategori → pilih template → isi | "51 template. Tinggal isi." | "FakturKu: 51 template dokumen. Tinggal isi." |
| 12–15 dtk | Hasil jadi & tombol "Kirim WhatsApp" | "Buat akun gratis · 10 dokumen free" | "Buat akun gratis. sepuluh dokumen gratis." |

### B. Product demo (30 detik)
| Waktu | Visual | Teks layar | VO |
|---|---|---|---|
| 0–3 dtk | Hasil akhir dokumen (close-up) | "Semua urusan, satu tempat." | "Semua urusan dokumen bisnis beres di satu tempat." |
| 3–8 dtk | Buka kategori → 7 kategori terlihat | "7 kategori" | "Tujuh kategori dokumen." |
| 8–14 dtk | Ganti template: Faktur → Surat Penawaran → SPK | "51 template" | "Lima puluh satu template." |
| 14–20 dtk | Isi field, total terhitung otomatis | "Total & nomor otomatis" | "Nomor dan total terisi otomatis." |
| 20–25 dtk | Preview lalu cetak struk 58 mm | "A4 atau struk 58 mm" | "Cetak A4, atau struk thermal 58 milimeter." |
| 25–28 dtk | Bagikan ke WhatsApp | "Kirim WhatsApp" | "Kirim dari WhatsApp." |
| 28–30 dtk | End card | "fakturku.vercel.app · 10 dokumen gratis" | "Sepuluh dokumen gratis. tanpa kartu kredit." |

### C. Satu dokumen spesifik (12 detik)
Pakai kalau menyasar satu kebutuhan: mis. "Surat Perjalanan Dinas".
`0–2 dtk teks: "Surat perjalanan dinas?"` → `2–8 dtk demo isi template Surat Perjalanan Dinas` →
`8–12 dtk end card + CTA`.

### D. Contoh pemakaian (20 detik)
Satu persona, satu hari: "Tiap pagi bikin struk 30 transaksi" → jadi 1 template + 1 klik.

## 3. Aturan penulisan naskah

1. **Panjang VO**: 2,5 kata/detik. 15 detik ≈ 35–40 kata. 30 detik ≈ 70–75 kata.
2. **Maksimal 1 ide per video.** Jangan sebut 5 template sekaligus.
3. **Teks layar: 2–5 kata per frame**, maksimal 2 baris, besar & kontras.
4. **Hook harus berdiri sendiri** — kalimat yang memicu penasaran, bukan "Halo, kami menyediakan…".
5. Kalimat pendek. Avoid: "solusi terpadu", "innovatif", "efisiensi".
6. **Jangan pakai klaim terlarang** (lihat `07-batas-klaim.md`).
7. Jika menyebut harga, sebut juga konteksnya (mis. "10 dokumen gratis" — bukan "gratis").
8. **End card selalu**: nama + URL + 1 CTA.

## 4. Syarat wajib (isi minimal tiap video)

- Nama produk terlihat: **FakturKu**.
- URL: **fakturku.vercel.app**.
- Minimal 1 angka kunci: **51 template** atau **7 kategori** atau **10 dokumen gratis**.
- 1 CTA tunggal: `Buat akun gratis`.

## 5. Syuting / rekam produk (paling penting)

Kekuatan FakturKu = **produknya terlihat nyata**. Rekam layar aplikasi (bukan mock), urutan:
1. Landing → pilih kategori.
2. Ganti-ganti template (bukti "51 template", bukan cuma 1).
3. Isi form → lihat total terhitung sendiri.
4. Pratinjau → alihkan ke struk 58 mm.
5. Bagikan ke WhatsApp.
6. Tutup dengan end card.

Aturan rekaman:
- Pakai **data contoh** (tab Contoh / mode contoh) — jangan tampilkan data pelanggan nyata.
- Resolusi 1080×1920 (9:16),Appsclip pendek, transisi simple (tidak ada efek norak).
- Device frame HP untuk Meta Feed (4:5).
- Pastikan **angka nominal di layar** terlihat jelas (baca dari jauh).

## 6. Audio

- Musik: royalty-free / AI-generated, mood ringan & korporat ringan (bukan epik sinematik).
- **Jangan pakai lagu bertema "cara cepat kaya"** — ironis untuk produk kantor.
- VO: suara tenang & jelas, sedikit lebih lambat dari nada bicara biasa.
- Jika tanpa VO: pastikan subtitle memuat semua informasi penting.

## 7. Variasi yang perlu dites (minimal 3)

| Variasi | Hook | Durasi |
|---|---|---|
| V1 | "Invoice-nya lagi di mana?" (urgency) | 15 dtk |
| V2 | "Semua urusan dokumen, satu tempat." (breadth) | 15 dtk |
| V3 | "Struk 58 mm, rapi, dari HP." (spesifik UMKM) | 12 dtk |
| V4 | "Surat perjalanan dinas? Formatnya sudah ada." (spesifikasi) | 12 dtk |

Ubah **satu variabel saja** per tes (hook atau durasi), supaya hasilnya bisa dibaca.

## 8. Contoh naskah siap baca (referensi tone)

### Naskah 1 — 15 detik, urgency
**VO:** “Chat masuk. Pelanggan mau invoice sekarang. File-nya lagi di mana?
Di FakturKu, pilih formatnya, isi datanya, cek pratinjau, kirim. Lima puluh satu template,
sepuluh dokumen gratis. Buat akun gratis di fakturku dot app.”
**Teks layar:** “Invoice-nya lagi di mana?” → “51 template” → “10 dokumen gratis” → “fakturku.vercel.app”

### Naskah 2 — 15 detik, breadth
**VO:** “Banyak yang mengira FakturKu cuma buat faktur. Padahal di dalamnya ada tujuh kategori:
UMKM, logistik, proyek, pajak, operasional, dan legal. Lima puluh satu template dokumen bisnis.
Isi, cetak, kirim WhatsApp. Gratis sepuluh dokumen.”
**Teks layar:** “Semua urusan, satu tempat.” → “7 kategori · 51 template” → “10 dokumen gratis”

### Naskah 3 — 12 detik, UMKM/thermal
**VO:** “Struk 58 milimeter, rapi, langsung dari HP. Ganti bikin struk manual satu-satu.
Format struk POS sudah siap di FakturKu.”
**Teks layar:** “Struk 58 mm” → “Siap pakai” → “fakturku.vercel.app”

## 9. Checklist sebelum tayang (video)

- [ ] Hook terlihat & terbaca dalam 3 detik.
- [ ] Durasi sesuai platform.
- [ ] Subtitle menyala & sinkron.
- [ ] Tidak ada klaim terlarang (`07-batas-klaim.md`).
- [ ] Angka sesuai (51 / 7 / 10 / Rp500–Rp2.500 / Rp39.000 / Rp129.000).
- [ ] Tidak ada data pelanggan nyata di layar.
- [ ] End card ada: FakturKu + fakturku.vercel.app + 1 CTA.
- [ ] Musik & aset punya hak penggunaan.
- [ ] End card minimal 1,5 detik sebelum habis.

---

# 99 — Ringkasan 1 Halaman (Papan Tempel Cepat)

> Versi padat dari seluruh knowledge base. Pakai ini kalau mau nulis naskah manual atau
> paste ke LLM yang tidak bisa menerima banyak file.

## PRODUK
FakturKu = aplikasi web (PWA) untuk membuat dokumen bisnis Indonesia. 51 template, 7 kategori.
Alur: pilih kategori → pilih template → isi → pratinjau → cetak/simpan/bagikan.

## ANGKA (WAJIB AKURAT)
- 51 template · 7 kategori
- 10 dokumen gratis (akun baru, sekali) · AI 10 pesan/hari
- UMKM & Logistik Rp500/dokumen · Finance Rp1.000 · Legal/Pajak/Proyek/Operasional Rp2.500
- Buka 1 kategori premium Rp39.000 · semua kategori Rp129.000
- Top-up diproses manual oleh admin (bukan instan)

## OUTPUT
Cetak A4 / Save as PDF · struk thermal 58 mm · simpan sebagai gambar · kirim WhatsApp/Telegram
(hasil thermal bergantung printer & driver).

## YANG BISA DIKLAIM
Format sudah jadi · pratinjau sebelum kirim · nomor & total otomatis · draft sinkron antar
perangkat · 10 dokumen gratis tanpa kartu kredit · data tiap user terpisah di level database ·
template pajak = alat bantu internal, bukan e-Faktur.

## YANG TIDAK BOLEH DIKLAIM
e-Faktur/resmi · kirim otomatis · gratis selamanya · thousands of users · rating · 24/7 ·
dijamin patuh · struk mulus di semua printer · top-up instan · sebut kompetitor.

## AUDIENS
1. Pedagang/pemilik UMKM (struk, nota, faktur cepat)
2. Freelance & jasa (penawaran, invoice, kuitansi)
3. Tim proyek & operasional (SPK, RAB, BAST, harian, PO, klaim)
4. Staf administrasi/keuangan (surat, rekap, kas, checklist)

## MASALAH YANG SERING MUNCUL
Dokumen mendadak · file berserakan di chat · format beda-beda antar orang · salah nominal/tanggal ·
takut salah kirim ke pelanggan.

## HEADLINE
Semua Urusan Dokumen Bisnis, Beres di Satu Tempat. · 51 Template. 1 Akun. · Formatnya Sudah Jadi. · Pratinjau Dulu, Baru Kirim.
Nomor Otomatis. · Cetak A4 atau Struk 58 mm. · 10 Dokumen Gratis. · Bikin Surat Tanpa Format.

## SUB-HEADLINE
Nggak perlu lagi bongkar folder nyari format lama. Dari bikin invoice, struk, sampai surat
perjanjian, semua ada 51 template-nya. Bingung nulis keterangannya? Ada Asisten AI yang siap bantu buatin.

## CTA
Buat akun gratis · Lihat contoh dokumen · Coba 1 dokumen gratis · Lihat semua 51 template

## 10 ANGLE
1. Bukan cuma faktur (breadth) · 2. Dokumen diminta mendadak (urgency) · 3. File berantakan (chaos)
4. Struk 58 mm (UMKM) · 5. Surat & klausul (freelance) · 6. SPK–BAST (proyek) · 7. Rekap harian
8. Lembar pajak (bukan e-Faktur) · 9. Gratis 10 dokumen (acquisition) · 10. Pratinjau dulu (kualitas).

## FORMATS
Meta feed: primary 125 char + headline ≤40 char + deskripsi + CTA · Reels/TikTok 9:16 hook 3 dtk
· Google Search: "template X | FakturKu" · WhatsApp: 2–4 baris + 1 link.

## CONTOH KALIMAT
- “Semua urusan, satu tempat.”
- “Formatnya sudah ada. Tinggal isi.”
- “Pratinjau dulu, baru kirim.”
- “Nomor sama tanggal, tidak perlu mikir.”
- “Yang cek ulang tetap kamu. Selalu.”
