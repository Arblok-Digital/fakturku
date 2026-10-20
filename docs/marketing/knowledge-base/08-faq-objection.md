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
