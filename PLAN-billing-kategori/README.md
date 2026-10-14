# FakturKu — Billing per Kategori Dokumen

> **Status:** DRAFT — angka menunggu diskusi tim  
> **Modul terkait:**  
> [01-taxonomy](01-taxonomy.md) · [02-database](02-database.md) · [03-billing](03-billing.md) · [04-ui-ux](04-ui-ux.md) · [05-templates](05-templates.md) · [06-implementation](06-implementation.md) · [07-decisions](07-decisions.md)

---

## Ikhtisar

Billing FakturKu berubah dari **flat** (1 kuota = 1 dokumen) menjadi **per-kategori** — tiap jenis dokumen punya bobot harga sendiri. Dokumen legal (kontrak, surat kuasa) lebih mahal dari struk ritel.

---

## Struktur Dokumen

| File | Isi |
|---|---|
| `01-taxonomy.md` | 7 kategori, harga placeholder, icon, warna badge |
| `02-database.md` | Skema tabel baru, perubahan kolom, RPC, migration SQL |
| `03-billing.md` | Model A (flat) vs Model B (tiered), logic debit, topup |
| `04-ui-ux.md` | Template picker, badge kategori, editor form, panel billing |
| `05-templates.md` | Mapping template existing → kategori + roadmap template baru |
| `06-implementation.md` | 5 fase implementasi + checklist |
| `07-decisions.md` | Open questions yang nunggu keputusan diskusi |
| `08-template-catalog.md` | Katalog template hasil riset, referensi, dan batasan compliance |

---

## Modul Existing (FakturKu MVP)

```
js/app.js                    — Wiring utama (auth, billing, editor, share)
js/config.js                 — SUPABASE_URL + anon key
js/modules/
  ├── backend.js             — API Supabase (auth, ledger, admin)
  ├── credit-ledger.js       — PACKAGES, CONTACT, history lokal
  ├── invoice-engine.js      — State editor (isi data → render)
  ├── template-engine.js     — Pilih template → render preview
  └── numbering.js           — Penomoran per template (FKT-XXXXXX)
js/templates/                — 4 template existing + katalog 32 template lintas kategori
css/app.css                  — Gaya native (appbar, bottomnav, sheet, grid)
index.html                   — Shell: appbar, sec-doc, bottomnav, FAB, modals
admin.html                   — Dashboard admin (mode SERVER / LOKAL)
supabase/schema.sql          — DB schema live
supabase/migrations/         — Migrasi bertahap
vercel.json                  — Rewrite /admin → admin.html
```

---

## Alur Data Singkat

```
User pilih template (filter kategori)
  → Editor form isi data
  → Invoice-engine build state
  → Template-engine render preview (PDF/thermal)
  → Cetak / Share / Terbit
  → Backend: issue_document(p_ref, p_category)
      → cek harga kategori
      → cek kuota user
      → debit 1 (Model A) atau weighted (Model B)
      → tandai dokumen TERBIT
```

---

## Status Saat Ini

| Komponen | Status |
|---|---|
| 4 template MVP | ✅ selesai |
| Backend Supabase (flat billing) | ✅ live |
| UI native (appbar/bottomnav/sheet) | ✅ selesai |
| Deploy Vercel | ✅ live |
| **Billing per kategori (Fase 1–3)** | ✅ selesai |
| DB schema kategori | ✅ live (7 kategori + 3 paket) |
| Template picker grouped | ✅ selesai |
| Admin CRUD kategori (Fase 4) | 🔴 belum |
| Template lintas 7 kategori | 🟡 32 template baru diimplementasikan di preview |
| Model B tiered (Fase 6) | 🔴 opsional |

---

*Update file ini setiap kali ada perubahan besar. Sub-file diedit sesuai topik.*
