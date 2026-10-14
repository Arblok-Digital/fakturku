# Katalog Template Dokumen FakturKu

> **Tujuan:** satu daftar acuan untuk kebutuhan dokumen per kategori, status
> implementasi, field, dan batas penggunaan template. Katalog ini adalah
> kebutuhan produk, bukan pendapat hukum, pajak, atau standar akuntansi.
>
> **Status:** semua 36 template dari tujuh kategori sudah masuk aplikasi.
> Dokumen Legal dan Pajak adalah template umum/lembar bantu, bukan nasihat
> hukum atau dokumen resmi. Validasi spesialis tetap diperlukan.

## Prinsip produk

1. Orang memilih berdasarkan nama dokumen yang mereka kenal, bukan istilah
   teknis. Nama pendek dipakai di picker; kepanjangan dijelaskan di formulir.
2. Template menyiapkan susunan halaman dan isian. Pengguna tetap mengisi,
   memeriksa, dan bertanggung jawab atas isi dokumennya.
3. Field yang tidak wajib di suatu usaha boleh dikosongkan. Contoh, nilai
   pajak bukan angka bawaan yang diasumsikan benar.
4. Dokumen hukum harus disesuaikan para pihak dan ditinjau sebelum
   ditandatangani. Template tidak menjamin sah, lengkap, atau sesuai keadaan.
5. Template pajak FakturKu bukan dokumen yang diterbitkan DJP dan tidak
   menggantikan Coretax, e-Faktur, e-Bupot, atau bukti bayar resmi.
6. Dokumen operasional yang menyimpan data sensitif (khususnya slip gaji)
   harus dibagikan hanya ke penerima yang berhak.
7. Jangan menjanjikan otomasi yang belum ada: “Invoice berkala” adalah
   dokumen yang dapat disalin untuk penagihan rutin, bukan pengiriman otomatis.

## Cakupan template

**36 template dalam katalog:** 4 template awal dan 32 tambahan lintas
kategori. Template memakai formulir edit dan preview, serta mengikuti alur
nomor/tanggal, draft, print/share, dan kategori billing yang sama.

Kolom di bawah menyebut field khusus. Identitas penerbit, nomor dokumen,
tanggal, catatan, draft, dan preview merupakan bagian bersama editor jika
sesuai kebutuhan template.

## Finance — transaksi dan penagihan

| ID | Nama di aplikasi | Status | Isian utama |
|---|---|---|---|
| `faktur-a4` | Faktur Penjualan | Aktif | Penerima, jatuh tempo, rincian barang/jasa, jumlah, diskon/pajak opsional, rekening/metode bayar |
| `kwitansi-a4` | Kwitansi | Aktif | Terima dari, jumlah, untuk pembayaran, tanggal, penerima uang |
| `invoice-digital` | Invoice Digital | Aktif | Penerima, jatuh tempo, rincian, total, cara bayar |
| `credit-note` | Nota Kredit | Aktif | Referensi faktur asal, alasan koreksi/retur, barang/jasa, nilai pengurang, persetujuan |
| `debit-note` | Nota Debit | Aktif | Referensi faktur asal, alasan tambahan/koreksi, rincian, nilai tambahan |
| `surat-tagihan` | Surat Tagihan | Aktif | Penerima, referensi tagihan, tanggal jatuh tempo, sisa tagihan, cara bayar, kontak |
| `invoice-berkala` | Invoice Berkala | Aktif | Periode tagihan, penerima, item/tagihan, termin/jatuh tempo, cara bayar; tidak ada penjadwalan otomatis |

## UMKM — jual beli sehari-hari

| ID | Nama di aplikasi | Status | Isian utama |
|---|---|---|---|
| `struk-ansuran` | Struk Angsuran | Aktif | Nomor kontrak, nasabah, angsuran ke-, pokok, bunga/denda, sisa tagihan |
| `nota-kontan` | Nota Kontan | Aktif | Pembeli, barang/jasa, jumlah, harga, diskon opsional, cara bayar |
| `surat-penawaran` | Penawaran Harga | Aktif | Calon pembeli, masa berlaku, rincian barang/jasa, harga, syarat, cara menerima penawaran |
| `surat-pesanan` | Formulir Pesanan | Aktif | Pemesan, alamat kirim, barang/jasa, jumlah, tanggal dibutuhkan, cara bayar |
| `struk-pos` | Struk Penjualan | Aktif | Barang, jumlah, harga, diskon/pajak opsional, dibayar, kembalian, kasir |
| `daftar-harga` | Daftar Harga | Aktif | Nama produk/jasa, satuan, harga, varian, tanggal berlaku, kontak |

## Logistik — kirim, terima, dan retur barang

| ID | Nama di aplikasi | Status | Isian utama |
|---|---|---|---|
| `surat-jalan` | Surat Jalan | Aktif | Nomor pesanan/referensi, pengirim, penerima, alamat tujuan, daftar barang, kendaraan/pengemudi, waktu kirim, tanda terima |
| `bukti-terima-barang` | Bukti Terima Barang | Aktif | Referensi surat jalan/pesanan, daftar barang diterima, jumlah/kondisi, catatan kurang/rusak, penerima dan waktu |
| `retur-barang` | Formulir Retur Barang | Aktif | Referensi transaksi, barang/jumlah, alasan, kondisi, keputusan penggantian/pengembalian dana |
| `packing-list` | Daftar Kemasan | Aktif | Referensi kiriman, jumlah paket, isi per paket, berat/dimensi opsional, penanda paket |

## Legal — dokumen kesepakatan dan kuasa

| ID | Nama di aplikasi | Status | Isian utama |
|---|---|---|---|
| `perjanjian-kerja-sama` | Perjanjian Kerja Sama | Aktif | Identitas para pihak, tujuan/ruang lingkup, hak-kewajiban, nilai/cara bayar, masa berlaku, pengakhiran, penyelesaian sengketa |
| `surat-kuasa` | Surat Kuasa | Aktif | Pemberi/penerima kuasa, identitas, tindakan yang dikuasakan, batas/masa berlaku, tanggal, tanda tangan |
| `spk` | Surat Perintah Kerja | Aktif | Pemberi/pelaksana, lingkup kerja, hasil, jadwal, nilai/cara bayar, serah terima |
| `letter-of-intent` | Surat Pernyataan Minat | Aktif | Para pihak, tujuan minat, ruang lingkup awal, masa berlaku, syarat lanjutan; bukan pengganti perjanjian final |
| `surat-pernyataan` | Surat Pernyataan | Aktif | Identitas pembuat, isi pernyataan, tujuan/penerima, tempat/tanggal, tanda tangan |
| `mou` | Nota Kesepahaman (MoU) | Aktif | Para pihak, maksud/ruang kerja sama, peran, jangka waktu, kerahasiaan opsional, langkah lanjutan |

## Pajak — lembar bantu pencatatan, bukan formulir resmi

| ID | Nama di aplikasi | Status | Isian utama |
|---|---|---|---|
| `lembar-data-faktur-pajak` | Lembar Data Faktur Pajak | Aktif | Data penjual/pembeli, referensi transaksi, barang/jasa, dasar dan komponen pajak untuk pemeriksaan internal |
| `lembar-data-setoran-pajak` | Catatan Setoran Pajak | Aktif | Jenis/masa pajak, nominal, tanggal rencana/bayar, referensi pembayaran, catatan |
| `lembar-kerja-bukti-potong` | Lembar Kerja Bukti Potong | Aktif | Pemberi/penerima penghasilan, jenis/masa, dasar penghitungan, potongan, referensi bukti resmi |

> **Penting:** jangan beri ketiga template pajak di atas judul “Faktur Pajak
> Resmi”, nomor resmi, logo DJP, atau klaim siap lapor. Dokumen resmi dibuat
> melalui kanal dan ketentuan DJP yang berlaku.

## Proyek — anggaran, kemajuan, dan serah terima

| ID | Nama di aplikasi | Status | Isian utama |
|---|---|---|---|
| `rab-proyek` | Rencana Anggaran Biaya (RAB) | Aktif | Nama/lokasi pekerjaan, item/volume/satuan/harga, biaya lain opsional, subtotal/total, pembuat/pemeriksa |
| `bast-proyek` | Berita Acara Serah Terima Pekerjaan | Aktif | Referensi kontrak/pekerjaan, pihak menyerahkan/menerima, hasil, kondisi/catatan, tanggal, tanda tangan |
| `surat-perintah-bayar` | Surat Perintah Bayar | Aktif | Penerima, dasar pembayaran, termin/progres, nilai, rekening, pemeriksa/persetujuan |
| `tagihan-termin` | Tagihan Termin | Aktif | Referensi kontrak, periode/tahap, progres, nilai termin, pembayaran sebelumnya, sisa, jatuh tempo |
| `berita-acara-pekerjaan` | Berita Acara Pekerjaan | Aktif | Referensi pekerjaan, lokasi, tanggal, hasil/progres, pihak hadir, kendala/catatan, tindak lanjut |

## Operasional — dokumen internal usaha

| ID | Nama di aplikasi | Status | Isian utama |
|---|---|---|---|
| `memo-internal` | Memo Internal | Aktif | Kepada, dari, tanggal, subjek, isi, lampiran/referensi |
| `surat-perjalanan-dinas` | Surat Perjalanan Dinas | Aktif | Nama/petugas, tujuan, keperluan, tanggal pergi/pulang, transport/biaya, pemberi tugas |
| `klaim-biaya` | Klaim Biaya | Aktif | Pengaju, tanggal, rincian biaya, jumlah, tujuan, bukti/referensi, pemeriksa |
| `purchase-order` | Pesanan Pembelian (PO) | Aktif | Pemasok, alamat kirim, barang/jasa, jumlah, harga, tanggal dibutuhkan, syarat bayar/persetujuan |
| `slip-gaji` | Slip Gaji | Aktif | Karyawan, periode, komponen pendapatan, potongan, total bersih, tanggal bayar |

## Prioritas implementasi

Tahapan berdasarkan penggunaan umum, bisa diluncurkan per gelombang tanpa
menunggu semua katalog:

1. **Transaksi dan jual beli:** Finance tambahan + UMKM tambahan.
2. **Alur barang dan kerja lapangan:** Logistik + dokumen proyek.
3. **Administrasi internal:** Operasional.
4. **Dokumen bersyarat/berisiko tinggi:** Legal dan lembar bantu pajak.

Prioritas bukan klaim bahwa semua industri memakai dokumen yang sama. Tim
produk perlu menguji nama, contoh, dan field dengan pengguna sasaran.

## Sumber pemeriksaan dan batas riset

- [DJP — Coretax DJP](https://pajak.go.id/id/reformdjp/coretax): rujukan agar
  lembar pajak FakturKu tidak diposisikan sebagai pengganti layanan DJP.
- [JDIH Kementerian Keuangan](https://jdih.kemenkeu.go.id/): periksa aturan
  pajak terbaru sebelum merancang format, label, atau alur pajak resmi.
- [JDIH LKPP](https://jdih.lkpp.go.id/): rujukan dokumen dan aturan pengadaan
  pemerintah; PO internal FakturKu bukan dokumen pengadaan pemerintah.
- [JDIH Kementerian PUPR](https://jdih.pu.go.id/): rujukan ketentuan pekerjaan
  konstruksi; RAB/BAST generik di sini bukan format kontrak pemerintah.
- [Database Peraturan BPK](https://peraturan.bpk.go.id/): periksa naskah hukum
  yang berlaku dan perubahan terakhir sebelum template legal dipublikasikan.

Inventory produk ini menggabungkan template yang sudah ada, daftar roadmap
sebelumnya, dan kebutuhan umum alur usaha (jual/beli, kirim/terima, persetujuan,
tagihan, serta administrasi). Ia bukan survei statistik industri. Semua contoh
legal/pajak perlu validasi spesialis dan pengguna sebelum disebut resmi.

## Checklist integrasi

- [x] Setiap ID unik dan masuk satu kategori yang benar.
- [x] Kategori yang tampil memiliki jumlah dan nama template yang cocok dengan
      template aktif di aplikasi.
- [x] Setiap template memiliki field edit yang sesuai tabel dan preview yang
      cocok dengan format dokumennya.
- [x] Nilai angka kosong tidak menjadi angka/tarif pajak yang diasumsikan benar.
- [x] Dokumen lama/draft lama tetap dapat dibuka tanpa kehilangan field.
- [ ] Harga kategori, pemotongan kuota, print/share mengikuti aturan yang sama.
- [x] Template pajak dan legal menampilkan batas penggunaan dengan jelas.
- [ ] Layar kecil, cetak A4/thermal, dan template picker telah diuji.
