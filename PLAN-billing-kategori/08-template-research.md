# FakturKu — Riset Kebutuhan Template Dokumen

Tanggal: 14 Oktober 2026  
Branch: `fix/production-mobile-billing-output`

## Temuan utama

Riset pada halaman produk dan panduan bisnis menunjukkan bahwa kebutuhan dokumen tidak berhenti pada invoice dan kwitansi. Siklus bisnis juga membutuhkan dokumen pemesanan, penerimaan/pengiriman barang, koreksi tagihan, dokumen kerja internal, dokumen proyek, serta lembar kerja pajak.

Referensi yang ditinjau:
- Mekari Jurnal — [Invoice online](https://mekari.com/produk/jurnal/invoice/): invoice, proforma invoice, pembayaran, penagihan.
- Mekari Jurnal — [Purchase Order](https://mekari.com/blog/purchase-order/): PO berbeda dari invoice; PO mencatat pesanan sebelum pengiriman.
- Mekari Jurnal — [Alur invoicing pembelian](https://www.jurnal.id/id/fitur/invoice-faktur/): purchase request, PO, penerimaan barang, purchase invoice, retur.
- Mekari Sign — [Procurement](https://mekarisign.com/id/solusi/procurement/): perjanjian vendor, PO, inventaris dan penerimaan barang.
- Niagawan — [Delivery Order](https://niagawan.com/id/delivery-order/): surat jalan berfokus pada item, jumlah, dan tujuan pengiriman; harga tidak selalu diperlukan.
- Canva — [Contoh invoice](https://www.canva.com/id_id/faktur/contoh/) dan [contoh kwitansi](https://www.canva.com/id_id/contoh/s/kwitansi/): kebutuhan format dokumen yang bisa diedit, dicetak, dan dibagikan.

Referensi digunakan untuk memetakan jenis dokumen dan komponen umum, bukan menyalin desain atau klausul.

## Katalog saat ini

Empat template awal dipertahankan: Faktur Penjualan A4, Kwitansi A4, Struk Angsuran, dan Invoice Digital. Katalog tambahan mencakup 32 template:

| Kategori | Template tambahan |
|---|---|
| Finance | Nota Kredit, Nota Debit, Surat Tagihan, Invoice Berulang |
| UMKM | Nota Kontan, Surat Penawaran Harga, Surat Pesanan, Struk POS 58 mm, Daftar Harga |
| Logistik | Surat Jalan, Bukti Terima Barang, Surat Retur, Packing List |
| Legal | Perjanjian Kerja Sama, Surat Kuasa, SPK, Letter of Intent, Surat Pernyataan |
| Operasional | Memo Internal, Surat Perjalanan Dinas, Klaim Biaya, Purchase Order, Slip Gaji |
| Proyek | RAB, BAST, Surat Perintah Bayar, Tagihan Termin Proyek, Berita Acara Progres |
| Pajak | Lembar Data Faktur Pajak, Rekap PPN Internal, Lembar Data Bukti Potong PPh, Checklist Dokumen Pajak |

Total katalog: 36 template dalam tujuh kategori.

## Prinsip implementasi

- Template memiliki ID, label, kategori, tujuan, dan struktur output yang sesuai.
- Editor menyediakan detail kontekstual (mis. detail logistik, perjanjian, proyek, karyawan, pengadaan, dan pajak) hanya saat relevan.
- Surat Jalan, Bukti Terima Barang, dan Packing List tidak menampilkan harga.
- Struk POS memiliki output thermal 58 mm.
- Dokumen legal adalah kerangka administrasi dan perlu ditinjau sebelum ditandatangani.
- Dokumen pajak adalah lembar kerja internal, bukan e-Faktur atau formulir resmi DJP dan tidak menggantikan sistem perpajakan resmi.
- Perubahan dilakukan pada frontend dan cache PWA; tidak ada perubahan skema/backend billing.

## Batasan yang harus transparan

Template bukan pengganti sistem inventory, approval, payroll, manajemen proyek, atau pelaporan pajak. Editor menyediakan field umum yang bisa dipakai ulang; kebutuhan khusus tiap perusahaan mungkin memerlukan field tambahan di iterasi berikutnya. Slip gaji mengandung data pribadi dan harus dibagikan terbatas.

## Checklist QA

- [x] Katalog berisi 36 template (4 lama + 32 tambahan) dengan ID/kategori unik; picker memakai katalog tersebut.
- [x] Audit statis HTML: tidak ada ID elemen yang duplikat.
- [x] Audit statis: semua field khusus template punya input yang tampil pada bagian editor yang sesuai.
- [x] Harga disembunyikan pada Surat Jalan, Bukti Terima Barang, dan Packing List.
- [ ] Nilai, total, tanggal, dan nomor dokumen benar.
- [ ] Cetak A4 dan thermal POS terbaca di ponsel.
- [ ] Save as dan Share WhatsApp tetap bekerja.
- [x] Template pajak memiliki disclaimer dokumen internal/non-resmi.
- [x] Service worker v14 memasukkan modul katalog.
- [ ] User memeriksa preview dari HP sebelum merge ke production.


## Catatan validasi format & contoh terisi (15 Oktober 2026)

Referensi tambahan untuk meninjau struktur dokumen:
- Mekari Jurnal — [Komponen Purchase Order](https://www.jurnal.id/id/blog/contoh-template-surat-purchase-order/): identitas pihak, nomor/tanggal, rincian barang, kuantitas, harga/pajak, syarat, dan otorisasi.
- Mekari Jurnal — [Komponen Surat Jalan](https://www.jurnal.id/id/blog/contoh-cara-membuat-surat-jalan-barang/): identitas pengirim/penerima, referensi, daftar barang, pengiriman, dan tanda terima.
- Direktorat Jenderal Pajak — [Faktur Pajak](https://www.pajak.go.id/id/peraturan/faktur-pajak): e-Faktur mengikuti sistem yang disediakan/ditentukan DJP dan memiliki elemen formal yang diatur.
- Mekari Sign — [Dokumen procurement dan penerimaan barang](https://mekarisign.com/id/solusi/procurement/): referensi untuk PO, perjanjian vendor, dan penerimaan barang.

### Status format
Katalog ini adalah format administrasi umum yang bisa disesuaikan, bukan sertifikasi bahwa setiap dokumen memenuhi seluruh kebijakan internal, hukum sektoral, atau aturan pajak. Lembar pajak FakturKu secara eksplisit berstatus internal/non-resmi. Dokumen legal perlu ditinjau pihak berwenang sebelum ditandatangani.

### Fitur Contoh
- Tab **Contoh** pada navigasi bawah menampilkan template terpilih dengan data ilustrasi yang sudah terisi.
- Mode contoh tidak mengganti state/draft pengguna.
- Print, Save as, dan Share via WhatsApp dinonaktifkan selama mode contoh agar data ilustrasi tidak terpakai sebagai dokumen nyata.
- Kembali ke Edit atau Preview mengembalikan dokumen pengguna.
- Data contoh memakai nama, referensi, nomor, dan kontak ilustratif; ganti semua nilai sebelum penggunaan nyata.
