# 03 — Billing & Pembayaran

## Model

- Setiap akun mendapat **10 dokumen trial gratis**. Satu dokumen terbit mengurangi jatah trial sebanyak satu, tanpa membedakan kategori.
- Setelah trial habis, saldo Rupiah dipotong sebesar harga kategori dokumen. Harga ditetapkan dan dipotong di Supabase, bukan dipercaya dari browser.
- Paket isi saldo saat ini bernilai sesuai nominal pembayaran; tidak ada bonus saldo tersembunyi.
- Cetak/bagikan ulang dokumen yang sama gratis. Penerbitan dikunci di server agar satu dokumen tidak menagih berulang.
- Dokumen yang sudah terbit tidak dapat dikembalikan ke status draft.

## Harga per dokumen

| Kategori | Biaya terbit |
|---|---:|
| Finance | Rp1.000 |
| UMKM | Rp500 |
| Legal | Rp2.000 |
| Logistik | Rp500 |
| Pajak | Rp1.500 |
| Proyek | Rp1.500 |
| Operasional | Rp750 |

Harga diambil server-side dari `document_categories`. Template ID dipetakan ke kategorinya pada tabel `document_templates`; kategori yang dikirim oleh browser harus cocok dengan pemetaan itu.

## Paket isi saldo

| Paket | Transfer | Saldo masuk |
|---|---:|---:|
| Starter | Rp15.000 | Rp15.000 |
| Bisnis | Rp40.000 | Rp40.000 |
| Pro | Rp85.000 | Rp85.000 |

Nominal paket mengikuti harga yang sudah ada di konfigurasi paket. Paket dan harga otoritatif berasal dari Supabase `packages`.

## Alur penerbitan

1. Pengguna menekan Print, Bagikan JPEG, atau WhatsApp.
2. Jika jatah gratis masih ada, konfirmasi menyebut jatah trial yang akan dipakai dan saldo tidak dipotong.
3. Setelah trial habis, konfirmasi menunjukkan biaya kategori dan saldo sesudah transaksi.
4. Frontend mengirim data dokumen ke RPC `issue_document(ref, category, template, data)`. RPC menyimpan atau memperbarui draft, memvalidasi template dan harga, memotong trial/saldo, lalu menandai dokumen terbit dalam satu transaksi.
5. Server memakai trial terlebih dahulu. Jika trial habis, server memotong saldo Rupiah sesuai harga kategori.
6. Ekspor ulang dokumen yang sudah terbit tidak memotong trial atau saldo.

## Alur top-up manual via WhatsApp

1. Pengguna memilih paket dan sistem membuat permintaan `pending` dengan ID unik.
2. UI menampilkan nominal transfer, saldo yang akan masuk, nomor WhatsApp **+62 895-0805-3795**, dan format pesan berisi nama, email akun, ID permintaan, nominal transfer, serta saldo masuk.
3. Tombol konfirmasi membuka WhatsApp dengan pesan tersebut. Pengguna mengirim bukti transfer di chat.
4. Admin memeriksa bukti lalu menyetujui permintaan di panel admin. RPC `approve_topup` menambahkan saldo berdasarkan nilai yang tersimpan di server.
5. Satu akun hanya boleh memiliki satu permintaan top-up pending. Pembayaran tidak otomatis dikonfirmasi; jangan menyetujui sebelum bukti cocok.

Format pesan:

```text
KONFIRMASI TOP-UP FAKTURKU
Nama: [nama akun]
Email akun: [email akun]
ID permintaan: [FKT-XXXXXX]
Nominal transfer: [Rp ...]
Saldo yang diminta: [Rp ...]
Bukti transfer: saya lampirkan di chat ini.
```

Admin transfer/review manual dipakai untuk tahap awal. Payment gateway dapat ditambahkan kemudian tanpa mengubah model saldo; alur gateway perlu membuat top-up dan mengkreditkan saldo hanya dari webhook yang diverifikasi server.

## Database dan transaksi

- `ledger_accounts.trial_credits`: sisa trial.
- `ledger_accounts.balance`: saldo Rupiah.
- `topup_requests.balance_amount`: saldo yang akan ditambahkan setelah admin menyetujui.
- `credit_transactions`: mencatat perubahan trial dan saldo secara terpisah.
- RPC penting: `get_my_billing`, `issue_document`, `request_topup`, `approve_topup`, `adjust_balance`.
- Migrasi implementasi: `supabase/migrations/20261013130000_category_wallet_billing.sql`.

Migrasi ini menginisialisasi akun yang sudah ada ke 10 trial dan saldo Rp0 sesuai keputusan bahwa belum ada saldo pengguna nyata. Terapkan hanya setelah memastikan asumsi tersebut tetap benar; jalankan migrasi melalui Supabase, bukan hanya menyimpan file di repo.

## Mode offline

Tanpa koneksi akun/Supabase, aplikasi hanya bisa memakai trial lokal. Saldo Rupiah dan persetujuan top-up tetap memerlukan server; localStorage bukan sumber saldo yang otoritatif.

---

Lihat juga: [02-database](02-database.md) dan [04-ui-ux](04-ui-ux.md).
