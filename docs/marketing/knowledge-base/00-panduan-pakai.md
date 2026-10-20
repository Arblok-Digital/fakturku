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
