# FakturKu — Review Arsitektur & Desain (2026-10-17)

Dokumen ini merangkum hasil review arsitektur, desain UI/UX, kualitas kode, dan
developer experience FakturKu, ditambah temuan dari pekerjaan "format bisa render
100%" (commit `6011183`). Ditulis sebagai bahan diskusi dengan Claude sebelum
promosi ke production.

---

## 1. Arsitektur — rating 8/10

**Kekuatan**
- Pemisahan layer jelas & terdokumentasi (`ARCHITECTURE.md`: UI shell → controller → state/draft → render registry → templates → formatting → output → backend adapter), masing-masing dengan aturan "must not do".
- Satu pintu render: `renderDoc(state)` di `template-engine.js` adalah satu-satunya entry point; 4 template khusus + 47 business template masuk ke registry yang sama.
- Kontrak template kaya tapi backwards-compatible (`uses`, `total`, `itemMode`, `partyLabel`, `signatures`, `defaultTerms`, `payroll`, `output`, `price_per_doc` — semuanya optional dengan default).
- Dual-mode (online Supabase / offline localStorage) dengan aturan yang sama; `effectiveDocPrice()` menyatukan harga.
- Billing additive-only: RPC lama tidak disentuh, migrasi Fase 5 idempotent, RLS terdefinisi.
- Keamanan dipikirkan: audit `SECURITY_AUDIT_2026-10-16.md`, hardening commit terpisah, `format.esc` wajib untuk semua user text.
- Dokumentasi hidup: `AGENTS.md` + `ARCHITECTURE.md` §7 "start here per task".

**Kelemahan**
- `js/app.js` = 82 KB single file (god object): state, binding, tab, billing modal, admin table, example mode bercampur.
- Tidak ada test otomatis (0 file `.test.js`/`.spec.js`). Validasi hanya harness ad-hoc + Playwright manual.
- State global mutable (`state`, `sampleDraftMode`, `sampleDraftPristine`); `switchTemplate` rebuild sample berdasarkan flag → mudah salah.
- Drift DB vs repo: `supabase/migrations/` adalah catatan, bukan replayable chain; beberapa migrasi live tidak ada di repo.
- Service worker cache version (`fakturku-v25`) belum di-bump di beberapa commit → risiko stale cache saat testing.

---

## 2. Desain UI/UX — rating 7.5/10

**Kekuatan**
- Editor + Preview + Contoh tiga tab; Contoh tidak memutasi state user (invariant #5).
- Tiga output mode (A4, thermal 58 mm, layar/digital) dengan renderer terspesialisasi.
- Field gating per template (`data-when` + `applySections`) menyembunyikan field yang tidak relevan.
- Metadata template ekspresif (`itemHeaders`, `itemUnit`, `partyLabel`, `legalNote`, `disclaimer`, `defaultTerms`) → 47 dokumen bisnis berbagi renderer tanpa duplikasi.
- Billing UX lengkap: free tier, per-doc price label, category unlock rows + bundle, package list, admin panel, top-up flow.

**Kelemahan**
- `css/app.css` = 65 KB single file, tanpa scoping/modul. Aturan `[hidden]` override (`.field { display:flex }`) sempat menyebabkan bug field yang "terlihat" padahal `hidden=true` (baru diperbaiki di commit `6011183`).
- Field-level `data-when` hanya dipakai di `dueDate`; field lain (NPWP, telepon, diskon, dll.) baru digate lewat JS `fieldUsed` → dua mekanisme paralel = risiko drift (dimigitasi oleh `editor-fields.js`).
- Tidak ada bukti test di mobile width; aksesibilitas (aria, focus, keyboard) kurang diperhatikan.
- `admin.html` terpisah dengan styling sendiri → sedikit duplikasi.

---

## 3. Kualitas kode — rating 7/10

**Kekuatan**
- `format.js` pure functions (`esc`, `rupiah`, `formatDate`, `terbilang`, `verifyCode`) — testable, no side effects.
- `renderDoc` satu-satunya entry point — disiplin kuat.
- Template = data + render function; metadata deklaratif; renderer shared.
- `format.esc` wajib untuk semua user text (invariant #7).
- `blankState` + `hydrate` menjaga shape state konsisten.
- Audit tooling `tools/check-render-coverage.mjs` sekarang menjadi penjaga regresi.

**Kelemahan**
- `js/app.js` 82 KB = god object. Refactor ke modul (`state`, `bindings`, `billing-ui`, `admin-ui`, `example-mode`) akan menaikkan rating ke 8+.
- Tidak ada test. Untuk 51 template + billing + dual-mode, absennya test adalah kelemahan terbesar.
- State mutable global — sulit di-trace.
- Business renderer = string concatenation (rawan typo; bug tanda tangan & diskon ditemukan di sini).
- `renderThermal` sebelumnya 1 baris raksasa (sudah dipecah setelah fix).
- Magic strings (`"client"`, `"items"`, `"terms"`, `"due"`) tersebar; typo = bug senyap.
- No TypeScript — state shape tidak di-enforce oleh compiler.

---

## 4. Developer experience — rating 8.5/10

**Kekuatan**
- `AGENTS.md` + `ARCHITECTURE.md` contoh excellent: aturan, layer map, "start here per task", invariant, workflow.
- Branch discipline (master = production, push = deploy) + approval gates untuk DB/billing/RPC.
- Handoff format terstruktur.
- Local-first validation: `node --check`, harness, Playwright smoke; aturan "jangan klaim test yang tidak dijalankan".
- Tooling lokal yang dibuat (`check-render-coverage.mjs`, `fk-editor-map.mjs`) memperkuat DX.

**Kelemahan**
- `supabase db push` tidak aman di repo ini; agent harus tahu dari pengalaman.
- Tidak ada `package.json` / `npm test` / CI.
- SW cache bisa menyembunyikan perubahan frontend saat testing.

---

## 5. Temuan dari pekerjaan "format bisa render 100%" (commit `6011183`)

**Masalah awal (dilaporkan user):** "di struk penjualan discount gak ke render juga di struk nya" — dan pengecekan manual satu per satu melelahkan.

**Root cause (terbukti):**
- `renderThermal` (struk penjualan) hanya mencetak TOTAL, tidak ada baris Subtotal/Diskon/PPN → diskon "hilang" walau `totals()` sudah menguranginya.
- `struk-ansuran`: label "Diterima oleh" mencetak nama PEMBUAT (dobel), nama PENERIMA tidak pernah tercetak, label "Dibuat oleh" tidak ada.
- Secara umum: field yang tampil & diisi di editor tidak selalu muncul di hasil render (85 field gagal / 1 template bersih sebelum perbaikan).

**Yang diperbaiki:**
1. Alat cek otomatis `tools/check-render-coverage.mjs`: 51 template, 0 field gagal (sebelum: 85 gagal).
2. `js/modules/editor-fields.js`: satu sumber aturan field-vs-template, dipakai `app.js` + alat cek.
3. Editor: `applySections()` menyembunyikan field yang tidak dipakai template; CSS `.fsec .field[hidden]` agar `[hidden]` tidak tertimpa `display:flex`.
4. Renderer: `renderThermal` (diskon/PPN/Subtotal, qty×harga, bank/rek/A/N/metode, NPWP & telepon issuer, pelanggan + alamat + NPWP/Telp, tanda tangan 2 kolom, catatan); `renderPayroll` (tanggal, NPWP/telepon/email, referensi bank, blok pembayaran, catatan); A4 (NPWP issuer, pihak NPWP & Telp); `invoice-digital` (NPWP/email, pihak NPWP/Telp, rincian, tanda tangan); `kwitansi-a4` & `struk-ansuran` (email issuer).
5. Contoh: diskon 5% dari subtotal + PPN 11% untuk dokumen penjualan/tagihan (`TAXED_SAMPLE`) supaya keduanya terbukti tampil.

**Hasil:** audit 51/51 template bersih, 0 field gagal.

---

## 6. Kesimpulan & rekomendasi

| Aspek | Rating | Catatan |
|---|---|---|
| Arsitektur | 8/10 | Layer jelas, single render entry, dual-mode billing. `app.js` monolitik & drift DB. |
| Desain UI/UX | 7.5/10 | 3 output mode + Contoh thoughtful. CSS monolitik, a11y kurang. |
| Kualitas kode | 7/10 | Pure format, kontrak template bagus. Tidak ada test, string-concat renderer, state global. |
| Developer experience | 8.5/10 | Dokumentasi & workflow luar biasa. Tidak ada CI/test runner. |
| **Overall** | **7.8/10** | Solid untuk produk solo/kecil yang sedang tumbuh; siap scale-up setelah refactor & test. |

**Top 3 yang paling meningkatkan rating (prioritas):**
1. Pecah `js/app.js` (82 KB) menjadi modul (`state`, `bindings`, `billing-ui`, `admin-ui`, `example-mode`).
2. Tambah test runner minimal (Vitest/Jest) untuk `format.*`, `totals()`, `effectiveDocPrice()`, `blankState`/`hydrate`, dan satu snapshot render per kategori template.
3. Konsolidasikan editor field-gating sepenuhnya ke `editor-fields.js` + hapus `data-when` duplikat, dan tambahkan CSS `[hidden]` global yang benar.

**Yang sudah bagus dan jangan dirusak:** `renderDoc` single entry, kontrak template, `format.esc` wajib, billing additive-only, approval gates untuk DB/billing, dokumentasi `AGENTS.md`/`ARCHITECTURE.md`.

---

## 7. Pertanyaan terbuka untuk Claude

1. Apakah refactor `app.js` (god object 82 KB) sebaiknya dilakukan sekarang (sebelum fitur baru) atau ditunda sampai ada test?
2. Apakah `editor-fields.js` (field-vs-template) sebaiknya menjadi satu-satunya mekanisme gating (hapus `data-when` duplikat di markup), atau dipertahankan paralel?
3. Apakah NPWP/telepon pihak (client) pada dokumen non-billing (surat jalan, memo, legal) sebaiknya dicetak atau disembunyikan? Saat ini dicetak bila `partyExtras` (ber-total) — konsisten, tapi mungkin terlalu ketat.
4. Apakah `renderThermal` perlu menampilkan NPWP/telepon pihak, atau cukup issuer? (saat ini dicetak bila terisi)
5. Apakah test runner sebaiknya ditambahkan ke `package.json` + CI minimal (GitHub Actions) sekarang, atau cukup harness lokal?
6. Apakah `sw.js` cache version perlu di-bump setelah perubahan renderer/CSS ini (karena user akan cek di production)?
7. Apakah arsitektur dual-mode (online/offline) sebaiknya dipertahankan, atau offline mode (credit-ledger) bisa dihapus setelah Supabase stabil?

---

_Dokumen ini dibuat sebagai bahan diskusi dengan Claude sebelum push ke production._
_Last updated: 2026-10-17 (commit `6011183`)._
