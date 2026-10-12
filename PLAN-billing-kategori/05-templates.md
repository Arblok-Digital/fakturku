# 05 — Mapping Template & Roadmap

> Template existing → kategori, plus roadmap template baru per kategori.

---

## Template Existing (MVP)

| File | Nama | Kategori | Harga/dok | Prefix nomor |
|---|---|---|---|---|
| `faktur-a4.js` | Faktur A4 | `finance` | Rp1.000 | `FIN` |
| `kwitansi-a4.js` | Kwitansi A4 | `finance` | Rp1.000 | `FIN` |
| `struk-ansuran.js` | Struk Angsuran | `umkm` | Rp500 | `UMK` |
| `invoice-digital.js` | Invoice Digital | `finance` | Rp1.000 | `FIN` |

> Semua template existing harus di-update: tambah field `category` di export.

---

## Field `category` di Setiap Template

```js
// js/templates/faktur-a4.js
export default {
  id: 'faktur-a4',
  name: 'Faktur A4',
  category: 'finance',  // ← TAMBAH INI
  width: 'A4',
  render(state) { ... }
};
```

```js
// js/modules/template-engine.js
async loadTemplate(id) {
  const mod = await import(`../templates/${id}.js`);
  const tpl = mod.default;
  state.category = tpl.category;  // ← SET CATEGORY
  state.price = await backend.getPrice(tpl.category);
}
```

---

## Roadmap Template Baru

### Prioritas 1 — Finance (sebagian sudah ada)

| Template | Kategori | Deskripsi | Status |
|---|---|---|---|
| Faktur A4 | `finance` | ✅ sudah | `faktur-a4.js` |
| Kwitansi A4 | `finance` | ✅ sudah | `kwitansi-a4.js` |
| Invoice Digital | `finance` | ✅ sudah | `invoice-digital.js` |
| Credit Note | `finance` | Pengurangan tagihan (retur) | 🔴 |
| Debit Note | `finance` | Penambahan tagihan (koreksi) | 🔴 |
| Surat Tagihan | `finance` | Reminder pembayaran | 🔴 |
| Recurring Invoice | `finance` | Tagihan berulang bulanan | 🔴 |

### Prioritas 1 — UMKM (sebagian sudah ada)

| Template | Kategori | Deskripsi | Status |
|---|---|---|---|
| Struk Angsuran | `umkm` | ✅ sudah | `struk-ansuran.js` |
| Nota Kontan | `umkm` | Bukti jual beli tunai (2 rangkap) | 🔴 |
| Surat Penawaran | `umkm` | Quotation / penawaran harga | 🔴 |
| Surat Pesanan | `umkm` | Order form | 🔴 |
| Struk POS | `umkm` | Thermal receipt POS | 🔴 |
| Price List | `umkm` | Daftar harga produk | 🔴 |

### Prioritas 2 — Logistik

| Template | Kategori | Deskripsi | Status |
|---|---|---|---|
| Surat Jalan | `logistik` | Delivery order | 🔴 |
| Bukti Terima Barang | `logistik` | BTB / goods receipt | 🔴 |
| Surat Retur | `logistik` | Pengembalian barang | 🔴 |
| Packing List | `logistik` | Daftar isi kemasan | 🔴 |

### Prioritas 2 — Legal

| Template | Kategori | Deskripsi | Status |
|---|---|---|---|
| Surat Perjanjian | `legal` | Kontrak kerja sama | 🔴 |
| Surat Kuasa | `legal` | Wakil / penarikan dokumen | 🔴 |
| SPK | `legal` | Surat Perintah Kerja | 🔴 |
| LOI | `legal` | Letter of Intent | 🔴 |
| Surat Pernyataan | `legal` | Pernyataan resmi | 🔴 |

### Prioritas 3 — Operasional

| Template | Kategori | Deskripsi | Status |
|---|---|---|---|
| Memo | `operasional` | Nota dinas internal | 🔴 |
| SPD | `operasional` | Surat Perjalanan Dinas | 🔴 |
| Klaim Biaya | `operasional` | Reimbursement form | 🔴 |
| Purchase Order | `operasional` | Permintaan pembelian | 🔴 |
| Slip Gaji | `operasional` | Slip pembayaran karyawan | 🔴 |

### Prioritas 4 — Proyek

| Template | Kategori | Deskripsi | Status |
|---|---|---|---|
| RAB | `proyek` | Rencana Anggaran Biaya | 🔴 |
| BAST | `proyek` | Berita Acara Serah Terima | 🔴 |
| SPB | `proyek` | Surat Perintah Bayar | 🔴 |
| Tagihan Termin | `proyek` | Progress billing | 🔴 |
| Berita Acara | `proyek` | Penerimaan / kerusakan | 🔴 |

### Prioritas 4 — Pajak

| Template | Kategori | Deskripsi | Status |
|---|---|---|---|
| Faktur Pajak | `pajak` | Komponen dasar e-Faktur | 🔴 |
| SSP | `pajak` | Surat Setoran Pajak | 🔴 |
| Bukti Potong PPh | `pajak` | Form 1771, 21, 23, 26 | 🔴 |

---

## Struktur File Template Baru

```
js/templates/
├── finance/
│   ├── faktur-a4.js
│   ├── kwitansi-a4.js
│   ├── invoice-digital.js
│   ├── credit-note.js          (baru)
│   ├── debit-note.js           (baru)
│   ├── surat-tagihan.js        (baru)
│   └── recurring-invoice.js    (baru)
├── umkm/
│   ├── struk-ansuran.js
│   ├── nota-kontan.js          (baru)
│   ├── surat-penawaran.js      (baru)
│   ├── surat-pesanan.js        (baru)
│   ├── struk-pos.js            (baru)
│   └── price-list.js           (baru)
├── logistik/
│   ├── surat-jalan.js          (baru)
│   ├── btb.js                  (baru)
│   ├── surat-retur.js          (baru)
│   └── packing-list.js         (baru)
├── legal/
│   ├── surat-perjanjian.js     (baru)
│   ├── surat-kuasa.js          (baru)
│   ├── spk.js                  (baru)
│   ├── loi.js                  (baru)
│   └── surat-pernyataan.js     (baru)
├── operasional/
│   ├── memo.js                 (baru)
│   ├── spd.js                  (baru)
│   ├── klaim-biaya.js          (baru)
│   ├── po.js                   (baru)
│   └── slip-gaji.js            (baru)
├── proyek/
│   ├── rab.js                  (baru)
│   ├── bast.js                 (baru)
│   ├── spb.js                  (baru)
│   ├── tagihan-termin.js       (baru)
│   └── berita-acara.js         (baru)
└── pajak/
    ├── faktur-pajak.js         (baru)
    ├── ssp.js                  (baru)
    └── bukti-potong-pph.js     (baru)
```

---

## Catatan Template Pajak

> Faktur pajak punya format ketat (e-Faktur DJP). Pastikan compliance sebelum rilis.
> Template pajak sebaiknya hanya menyediakan **kerangka dasar** — user isi manual.

---

*Lihat juga: [06-implementation](06-implementation.md) untuk fase implementasi.*
