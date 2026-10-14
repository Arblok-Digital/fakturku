# 06 — Fase Implementasi & Checklist

> 5 fase implementasi billing per kategori.
> **Status: Fase 1–3 SELESAI.** Sisa: Fase 4 (admin CRUD) + Fase 5 (template baru).

---

## Fase 1 — Fondasi DB & Template ✅ SELESAI

### Database
- [x] Buat file migration `supabase/migrations/20261012080000_category_billing.sql`
- [x] Tabel `document_categories` + seed 7 kategori + harga placeholder
- [x] Tabel `packages` + seed 3 paket (Starter/Bisnis/Pro)
- [x] Alter `invoices` → tambah kolom `category`
- [x] Alter `credit_transactions` → tambah kolom `category`
- [x] RLS: read semua, write admin only
- [x] Jalankan migration → verifikasi di Supabase Studio

### Template Existing
- [x] Update `js/templates/faktur-a4.js` → `category: "finance"`
- [x] Update `js/templates/kwitansi-a4.js` → `category: "finance"`
- [x] Update `js/templates/struk-ansuran.js` → `category: "umkm"`
- [x] Update `js/templates/invoice-digital.js` → `category: "finance"`

### Template Engine
- [x] Update `js/modules/template-engine.js` → `getCategory()` + `CATEGORY_MAP`
- [x] Update `js/modules/numbering.js` → `CATEGORY_PREFIX` + `nextNumberByCategory()`

### Verification
- [x] Migration sukses (push ke Supabase OK)
- [x] `document_categories` → 7 baris terseed
- [x] `packages` → 3 baris terseed
- [x] REST API test: kategori + packages terbaca

---

## Fase 2 — Billing Logic ✅ SELESAI

### Backend (RPC)
- [x] RPC `issue_document(p_ref, p_category)` — Model A (flat), v2
- [x] RPC `get_categories()` — list semua kategori + harga
- [x] RPC `get_packages()` — list paket top-up
- [x] RPC `update_category(id, price, active, color)` — admin only
- [x] Deploy ke Supabase (`supabase db push`)

### Frontend
- [x] `js/modules/backend.js` → `tryDebit(ref, category)` + `getCategories()` + `getPackages()`
- [x] `js/modules/credit-ledger.js` → `tryDebit(ref, category)` simpan category di history
- [x] `js/app.js` → pass category ke `tryDebit` di `markIssued()`
- [x] `js/app.js` → riwayat tampilkan badge kategori

### Panel Billing
- [x] Daftar harga kategori di modal billing (`#cat-prices`)
- [x] Riwayat transaksi tampilkan badge kategori (`cat-badge-mini`)

### Verification
- [x] Headless browser: picker render 4 card dengan kategori & harga benar
- [x] Filter buttons: 8 kategori tampil

---

## Fase 3 — UI/UX Kategori ✅ SELESAI

### Template Picker
- [x] Redesign `#tpl-select` → `#tpl-picker` (filter + grid)
- [x] Filter chip row per kategori + fade-out edge mask
- [x] Card grid: dot warna, nama, ikon, harga
- [x] CSS responsive (2 kolom mobile, 3 kolom desktop)
- [x] `--card-accent` + `--card-ring` custom properties per kategori

### Badge Kategori
- [x] Badge di card picker (dot + meta line)
- [x] Badge di riwayat transaksi (`cat-badge-mini`)
- [x] Warna dari DB (`document_categories.color`)

### Editor
- [x] Preview bar tampilkan: `Template · 💰 Finance · DRAFT`
- [x] Nomor dokumen pakai prefix kategori (`FIN-2026-001`)

### Polish (native-feel)
- [x] Filter chips: `cubic-bezier(0.4,0,0.2,1)`, `scale(0.96)` active, `focus-visible` ring
- [x] Cards: hover lift + shadow, `scale(0.97)` press, accent top-border
- [x] Modal: backdrop `blur(4px)`, sheet-up animation, segmented auth tabs
- [x] Buttons: hover border, focus ring, primary shadow, FAB layered shadow
- [x] Inputs: 1.5px border, focus ring, hover state
- [x] Bottom nav: active indicator bar animation
- [x] Editor: custom thin scrollbar
- [x] Toast: layered shadow + entry animation

---

## Fase 4 — Admin Dashboard 🔴 BELUM

- [ ] CRUD kategori di `admin.html`
- [ ] Edit harga per kategori (via `update_category` RPC)
- [ ] Toggle active/inactive
- [ ] Edit warna badge
- [ ] Deploy ke Vercel

### Verification
- [ ] Admin bisa edit harga → user lihat harga baru
- [ ] Toggle inactive → kategori hilang dari picker

---

## Fase 5 — Template Baru 🟡 IMPLEMENTED DI PREVIEW

- [x] Tambahkan katalog 32 template baru lintas tujuh kategori melalui `js/templates/business-documents.js`
- [x] Integrasikan seluruh template ke `js/modules/template-engine.js`
- [x] Tambahkan field dokumen bersyarat di editor; kategori dan template tetap menggunakan dropdown
- [x] Tambahkan struktur `details` ke state dokumen dengan backward compatibility draft lama
- [x] Refresh cache PWA dan masukkan modul template baru ke shell cache
- [x] Catat kebutuhan dokumen, sumber riset, dan batasan compliance di `08-template-research.md`

### Kategori yang sudah memiliki template

| Kategori | Template baru |
|---|---:|
| Finance | 4 |
| UMKM | 5 |
| Logistik | 4 |
| Legal | 5 |
| Operasional | 5 |
| Proyek | 5 |
| Pajak (lembar kerja internal) | 4 |
| **Total** | **32** |

> Status implementasi di branch preview, belum production. Perlu QA visual dan uji tiap template di perangkat sebelum merge. Template legal/pajak adalah kerangka kerja yang perlu diperiksa; bukan jaminan legalitas atau formulir resmi DJP.

---

## Fase 6 — Model B Tiered 🔴 OPSIONAL

> Hanya jika Model A sudah stabil + diskusi final setuju Model B.

- [ ] Update RPC `issue_document` → weighted debit
- [ ] Hitung bobot = `ceil(price_per_doc / base_price)`
- [ ] Frontend tampilkan bobot per kategori
- [ ] Edukasi user ("kenapa kontrak 4 kuota?")
- [ ] Test edge case: kuota kurang dari bobot

---

## Estimasi Sisa

| Fase | Estimasi | Status |
|---|---|---|
| Fase 1 — Fondasi | 1–2 hari | ✅ selesai |
| Fase 2 — Billing | 1 hari | ✅ selesai |
| Fase 3 — UI/UX | 1 hari | ✅ selesai |
| Fase 4 — Admin | 0.5 hari | 🔴 belum |
| Fase 5 — Templates | berkelanjutan | 🟡 implemented di preview; QA perangkat menunggu |
| Fase 6 — Model B | 1 hari | 🔴 opsional |

---

## File Changed (Fase 1–3)

```
supabase/migrations/20261012080000_category_billing.sql  (baru)
js/templates/faktur-a4.js                                (+category)
js/templates/kwitansi-a4.js                              (+category)
js/templates/struk-ansuran.js                            (+category)
js/templates/invoice-digital.js                          (+category)
js/modules/template-engine.js                            (+getCategory, CATEGORY_MAP)
js/modules/numbering.js                                  (+CATEGORY_PREFIX, nextNumberByCategory)
js/modules/invoice-engine.js                             (+category di blankState)
js/modules/backend.js                                    (+getCategories, getPackages, tryDebit w/ category)
js/modules/credit-ledger.js                              (+category di tryDebit history)
js/app.js                                                (picker grid, category billing, boot async)
css/app.css                                              (picker, badges, modal, buttons, inputs, polish)
index.html                                               (tpl-picker, cat-prices)
sw.js                                                    (cache v11)
PLAN-billing-kategori/                                   (8 file plan)
```

---

## Known Limitations (belum dipecah)

- Harga kategori masih placeholder — menunggu diskusi tim
- Admin CRUD kategori belum ada di dashboard
- Template baru belum ada (Fase 5)
- Model B (weighted) belum diimplementasi
- Nomor lama (`FKT-XXXXXX`) tetap valid, nomor baru pakai prefix kategori

---

*Diperbarui: 2026-10-12 — Fase 1–3 selesai, tinggal Fase 4–6.*
