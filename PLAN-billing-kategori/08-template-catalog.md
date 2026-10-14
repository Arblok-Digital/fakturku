# FakturKu — Katalog Template Lintas Kategori

Status: **implemented in preview branch** `fix/production-mobile-billing-output`. Semua template baru memakai renderer bersama dan field editor bersyarat; dokumen yang berisiko regulasi ditandai sebagai lembar kerja internal, bukan formulir resmi.

## Riset struktur dokumen

- Finance: identitas penerbit/penerima, nomor/tanggal, referensi invoice asal untuk koreksi, rincian nilai, jatuh tempo, dan informasi pembayaran.
- UMKM: nota tunai, penawaran dengan masa berlaku/syarat pembayaran, pesanan, struk thermal, dan daftar harga.
- Logistik: referensi PO/invoice, asal-tujuan, barang/kuantitas, pengantar/kendaraan, kondisi, serta penerimaan/retur.
- Legal: para pihak, referensi kontrak, lingkup, masa berlaku, klausul yang bisa diedit, dan area tanda tangan. Ini kerangka administrasi, bukan nasihat hukum.
- Operasional: memo, perjalanan dinas, klaim biaya, PO, dan slip gaji dengan penanda kerahasiaan.
- Proyek: RAB, BAST, perintah bayar, tagihan termin, serta berita acara progres. Tagihan termin memisahkan nilai kontrak, progres, pembayaran sebelumnya, dan retensi.
- Pajak: lembar data faktur pajak internal, rekap PPN internal, lembar persiapan data bukti potong, dan checklist dokumen pajak. **Tidak satu pun mengklaim sebagai e-Faktur, SPT, SSP, atau bukti potong resmi.**

## Template yang tersedia

### Finance
- Faktur Penjualan (A4) — existing
- Kwitansi / Tanda Terima (A4) — existing
- Invoice Digital — existing
- Nota Kredit / Credit Note
- Nota Debit / Debit Note
- Surat Tagihan
- Invoice Berulang (format saja; bukan scheduler otomatis)

### UMKM
- Struk Angsuran — existing
- Nota Kontan
- Surat Penawaran Harga
- Surat Pesanan
- Struk POS (58 mm)
- Daftar Harga / Price List

### Logistik
- Surat Jalan
- Bukti Terima Barang
- Surat Retur Barang
- Packing List

### Legal
- Perjanjian Kerja Sama
- Surat Kuasa
- Surat Perintah Kerja (SPK)
- Letter of Intent (LOI)
- Surat Pernyataan

### Operasional
- Memo Internal
- Surat Perjalanan Dinas
- Form Klaim Biaya
- Purchase Order (PO)
- Slip Gaji

### Proyek
- Rencana Anggaran Biaya (RAB)
- Berita Acara Serah Terima (BAST)
- Surat Perintah Bayar
- Tagihan Termin Proyek
- Berita Acara Progres Pekerjaan

### Pajak
- Lembar Data Faktur Pajak (Internal)
- Rekap PPN Internal
- Lembar Data Bukti Potong PPh
- Checklist Dokumen Pajak

## Batasan yang harus dipertahankan

1. Template tidak otomatis memverifikasi legalitas, kepatuhan pajak, atau keabsahan tanda tangan.
2. Pajak: gunakan aplikasi/sistem dan formulir resmi DJP untuk proses formal; FakturKu hanya membantu menata data internal.
3. Invoice Berulang tidak menjadwalkan penerbitan, tidak mengirim otomatis, dan tidak melakukan penagihan otomatis.
4. Purchase Order adalah pesanan, bukan bukti barang sudah diterima.
5. Surat Jalan adalah dokumen pengiriman, bukan bukti pembayaran.
6. Harga kategori/kuota tetap mengikuti billing yang sudah ada; implementasi ini tidak mengubah backend billing atau skema database.
7. Editor mempertahankan kategori dan template dropdown; Print, Save as, dan Share WhatsApp tidak dipindahkan.

## Referensi riset

- Mekari Jurnal — invoice: https://mekari.com/produk/jurnal/invoice/
- Canva — template invoice: https://www.canva.com/id_id/faktur/
- Niagawan — nota kredit/debit: https://niagawan.com/id/nota-kredit-debit/
- TemplateSurat.id — surat jalan: https://templatesurat.id/template/surat-pengiriman-barang
- TemplateSurat.id — penawaran harga: https://templatesurat.id/template/surat-penawaran-harga
- Equiperp — invoice/tagihan proyek: https://www.equiperp.com/blog/contoh-invoice-tagihan-proyek/
- Confileo — BAST pekerjaan: https://confileo.com/id/contoh-surat/berita-acara-serah-terima-pekerjaan/
- DJP — Faktur Pajak: https://pajak.go.id/index.php/id/peraturan/faktur-pajak
- DJP — panduan pelaporan e-Faktur: https://pajak.go.id/panduan-layanan-pajak/konten/pelaporan/2025/orang-pribadi/e-faktur/pelaporan-e-faktur
