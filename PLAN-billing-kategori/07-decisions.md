# 07 — Open Questions (Menunggu Diskusi)

> Pertanyaan yang butuh keputusan sebelum eksekusi. Rekomendasi sementara disediakan.

---

## 1. Model Billing: Flat atau Tiered?

| Opsi | Deskripsi | Rekomendasi |
|---|---|---|
| **A — Flat** | 1 kuota = 1 dokumen, semua kategori sama | ✅ **Rekomendasi MVP** |
| **B — Tiered** | Tiap kategori punya bobot, dokumen mahal makan lebih banyak kuota | Setelah A stabil |

**Pertanyaan lanjutan:**
- Kalau Tiered: bobot berapa per kategori? (1/2/4? atau proporsional harga?)
- Perlu edukasi user gak soal bobot?

---

## 2. Harga Final per Kategori

| Kategori | Placeholder | Final? |
|---|---|---|
| `umkm` | Rp 500 | ⬜ |
| `logistik` | Rp 500 | ⬜ |
| `operasional` | Rp 750 | ⬜ |
| `finance` | Rp 1.000 | ⬜ |
| `proyek` | Rp 1.500 | ⬜ |
| `pajak` | Rp 1.500 | ⬜ |
| `legal` | Rp 2.000 | ⬜ |

---

## 3. Struktur Paket Top-Up

| Opsi | Deskripsi | Rekomendasi |
|---|---|---|
| **Campuran** | Semua kategori, kuota flat | ✅ **Rekomendasi** |
| **Per-kategori** | Paket spesifik (mis. 50 finance + 20 legal) | Setelah Model B |

**Pertanyaan lanjutan:**
- Harga paket final?
  - Starter: 20 kuota / Rp15.000?
  - Bisnis: 60 kuota / Rp40.000?
  - Pro: 150 kuota / Rp85.000?
- Perlu paket trial extension?

---

## 4. Nomor Dokumen

| Opsi | Deskripsi | Rekomendasi |
|---|---|---|
| **Per kategori** | `FIN-2026-0001`, `LEG-2026-0001` | ✅ **Rekomendasi** |
| **Global** | `FKT-2026-0001` semua kategori | Lebih sederhana |

**Pertanyaan lanjutan:**
- Backward compatibility: nomor lama (`FKT-XXXXXX`) tetap valid?
- Prefix apa yang mau dipakai per kategori?

---

## 5. Kategori Aktif dari Awal

| Opsi | Deskripsi | Rekomendasi |
|---|---|---|
| **Semua 7** | Finance, Legal, UMKM, Logistik, Pajak, Proyek, Operasional | ⬜ Tergantung template ready |
| **Sebagian** | Finance + UMKM dulu (template sudah ada), sisanya menyusul | ✅ **Rekomendasi** |

**Pertanyaan lanjutan:**
- Kategori mana yang prioritas launch?
- Non-aktif kategori = gak muncul di picker, tapi harga tetap di DB?

---

## 6. Warna Badge per Kategori

| Draft | Hex | Final? |
|---|---|---|
| Finance — Navy | `#16324F` | ⬜ |
| Legal — Ungu gelap | `#4A3B7A` | ⬜ |
| UMKM — Teal | `#0E7C6B` | ⬜ |
| Logistik — Oranye | `#B45309` | ⬜ |
| Pajak — Merah bata | `#A4291F` | ⬜ |
| Proyek — Hijau tua | `#2D6A4F` | ⬜ |
| Operasional — Abu biru | `#475569` | ⬜ |

**Pertanyaan lanjutan:**
- Simpan di DB (`document_categories.color`) atau hardcode CSS?
- Perlu dark mode variant?

---

## 7. Kebijakan Re-print

| Opsi | Deskripsi | Rekomendasi |
|---|---|---|
| **Gratis** | Dokumen terbit bisa cetak ulang / share ulang tanpa debit | ✅ **Sudah dipakai** |
| **Debit lagi** | Setiap cetak = debit | ❌ Tidak user-friendly |

**Pertanyaan:**
- Edit dokumen terbit → debit lagi? (saat ini: tidak, edit = draft baru)

---

## 8. Admin CRUD Kategori

| Opsi | Deskripsi | Rekomendasi |
|---|---|---|
| **Full CRUD** | Admin bisa tambah/hapus/edit kategori | ⚠️ Hati-hati (hapus = data orphan) |
| **Edit harga only** | Admin cuma bisa edit harga + toggle active | ✅ **Rekomendasi** |

**Pertanyaan:**
- Perlu admin bisa tambah kategori custom?
- Kalau hapus kategori: dokumen existing gimana?

---

## 9. Scope Pajak

> Faktur pajak punya format ketat (e-Faktur DJP). Perlu compliance check.

| Opsi | Deskripsi | Rekomendasi |
|---|---|---|
| **Kerangka dasar** | Template kosong, user isi manual | ✅ Rekomendasi |
| **Compliance penuh** | Format sesuai e-Faktur DJP | Butuh validasi pajak |

**Pertanyaan:**
- Siapa yang review compliance template pajak?
- Perlu disclaimer hukum?

---

## 10. Timeline & Prioritas

| Milestone | Target | Status |
|---|---|---|
| Fase 1 — Fondasi | ? | ⬜ |
| Fase 2 — Billing | ? | ⬜ |
| Fase 3 — UI/UX | ? | ⬜ |
| Fase 4 — Admin | ? | ⬜ |
| Launch MVP kategori | ? | ⬜ |
| Template baru batch 1 | ? | ⬜ |

**Pertanyaan:**
- Deadline target launch?
- Siapa yang handle template baru? (agent lain?)

---

## Cara Update Setelah Diskusi

1. Edit file terkait (`01-taxonomy.md` untuk harga, `03-billing.md` untuk model, dll)
2. Update checkbox di `06-implementation.md`
3. Commit + push
4. Bilang ke agent: "harga final udah di `01-taxonomy.md`, model A, eksekusi Fase 1"

---

*File ini hidup — update setiap kali ada keputusan baru dari diskusi.*
