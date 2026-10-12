# 01 — Taxonomy Kategori Dokumen

> Kategori lengkap + harga placeholder + visual. Harga masih asumsi, sesuaikan setelah diskusi.

---

## 7 Kategori

| ID | Label | Icon | Deskripsi | Contoh dokumen |
|---|---|---|---|---|
| `finance` | Finance | 💰 | Transaksi uang murni | Faktur, kwitansi, nota, credit/debit note, recurring invoice |
| `legal` | Legal | ⚖️ | Berkekuatan hukum | Kontrak, surat kuasa, LOI, SPK, MoU, perjanjian kerja |
| `umkm` | UMKM | 🏪 | Ritel & usaha kecil | Nota penjualan, bon, struk, surat penawaran, price list |
| `logistik` | Logistik | 📦 | Pengiriman & gudang | Surat jalan, BTB, retur barang, packing list |
| `pajak` | Pajak | 🧾 | Perpajakan wajib | Faktur pajak, SSP, PIB/PEB, bukti potong PPh |
| `proyek` | Proyek | 🏗️ | Proyek & konstruksi | RAB, BAST, SPB, tagihan termin, berita acara |
| `operasional` | Operasional | 📋 | Internal kantor | Memo, SPD, klaim biaya, PO, slip gaji |

---

## Harga per Dokumen (PLACEHOLDER)

| Kategori | Harga/dok | Alasan sementara |
|---|---|---|
| `umkm` | Rp 500 | Paling sederhana, volume tertinggi |
| `logistik` | Rp 500 | Format ringkas, banyak penerbitan |
| `operasional` | Rp 750 | Sedang, sering dipakai internal |
| `finance` | Rp 1.000 | Dokumen standar bisnis |
| `proyek` | Rp 1.500 | Kompleks, nilai transaksi besar |
| `pajak` | Rp 1.500 | Sensitif, format ketat |
| `legal` | Rp 2.000 | Paling kompleks, butuh klausul banyak |

---

## Paket Top-Up (PLACEHOLDER)

| Paket | Isi | Harga | Harga/dok |
|---|---|---|---|
| Starter | 20 kuota campur | Rp 15.000 | Rp 750 |
| Bisnis | 60 kuota campur | Rp 40.000 | Rp 667 |
| Pro | 150 kuota campur | Rp 85.000 | Rp 567 |

> Alternatif: **kuota per-kategori** (mis. 50 finance + 20 legal). Keputusan di [07-decisions](07-decisions.md).

---

## Warna Badge (Draft)

| Kategori | Warna | Hex |
|---|---|---|
| Finance | Navy | `#16324F` |
| Legal | Ungu gelap | `#4A3B7A` |
| UMKM | Teal | `#0E7C6B` |
| Logistik | Oranye | `#B45309` |
| Pajak | Merah bata | `#A4291F` |
| Proyek | Hijau tua | `#2D6A4F` |
| Operasional | Abu biru | `#475569` |

> Simpan di kolom `color` di tabel `document_categories`, jangan hardcode CSS.

---

## Nomor Urut per Kategori (Prefix)

| Kategori | Prefix | Contoh nomor |
|---|---|---|
| Finance | `FIN` | FIN-2026-0001 |
| Legal | `LEG` | LEG-2026-0001 |
| UMKM | `UMK` | UMK-2026-0001 |
| Logistik | `LOG` | LOG-2026-0001 |
| Pajak | `PKT` | PKT-2026-0001 |
| Proyek | `PRJ` | PRJ-2026-0001 |
| Operasional | `OPS` | OPS-2026-0001 |

> Prefix ini menggantikan `FKT-` global. Penomoran tetap per akun (bukan global).

---

*Lihat juga: [02-database](02-database.md) — skema tabel `document_categories`.*
