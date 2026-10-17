# FakturKu — Audit Mendalam FE & BE (2026-10-17)

Audit menyeluruh terhadap frontend (FE) dan backend Supabase (BE), dilakukan setelah
DeepSeek menyinkronkan FE↔BE. Tujuan: verifikasi konsistensi, keamanan, dan
operational readiness. Audit dilakukan via Supabase CLI (linked ke project
`pcydwlfyughwasyqglwq`) + Management API + analisis statis codebase.

**Status akhir:** FE↔BE sinkron (51/51 template, 7/7 kategori, 0 price mismatch,
semua RPC signature cocok). Ditemukan beberapa isu keamanan (grants terlalu luas,
RLS off pada `billing_settings`) dan operasional (0 test, no observability, DB
drift) yang perlu ditindaklanjuti.

---

## 1. Ringkasan eksekutif

| Area | Hasil | Catatan |
|---|---|---|
| FE↔BE template sync | ✅ 51/51 | 0 FE-only, 0 DB-only, 0 category mismatch, 0 price mismatch |
| FE↔BE category sync | ✅ 7/7 | prices + unlock_price + prefix cocok |
| FE↔BE billing sync | ✅ cocok | packages (starter/bisnis/pro), UNLOCK_ALL_PRICE=129000 = billing_settings |
| RPC signature sync | ✅ semua cocok | issue_document, next_document_number, unlock_*, get_categories, dll. |
| Billing logic (issue_document) | ✅ | charge order: unlocked → free → trial → balance; re-issue gratis |
| RLS | ⚠️ sebagian | `billing_settings` RLS OFF + full grants anon |
| Function grants | ⚠️ terlalu luas | adjust_balance/set_role/update_category/is_admin/my_role/handle_new_user granted EXECUTE ke anon/authenticated/PUBLIC (meski internal is_admin() check) |
| Observability | ❌ tidak ada | 0 error tracking, 0 telemetry runtime |
| Automated tests | ❌ 0 file | hanya harness ad-hoc + Playwright manual |
| DB drift | ⚠️ | migrasi repo = catatan, bukan replayable chain; file untracked di supabase/ |

---

## 2. Frontend (FE) audit

### 2.1 Struktur & modul
- 8 modul di `js/modules/` (invoice-engine, template-engine, format, numbering, output, backend, credit-ledger, editor-fields) + 4 template khusus + 1 file business (47 template) + `app.js` (82 KB, god object).
- `renderDoc()` adalah satu-satunya entry point render ✓.
- `format.esc` wajib untuk semua user text (invariant #7) ✓ — verifikasi innerHTML assignments: semua pakai `esc()`/`admEsc()`/manual escape.

### 2.2 Template system
- 51 template (4 khusus + 47 business), semua masuk registry `TEMPLATES`.
- Kontrak template (uses, total, itemMode, partyLabel, signatures, defaultTerms, payroll, output, price_per_doc) backwards-compatible ✓.
- `effectiveDocPrice()` (FE) == `coalesce(t.price_per_doc, c.price_per_doc)` (BE) ✓, termasuk unlocked category → 0.
- `check-render-coverage.mjs` (tools/): 51/51 template bersih, 0 field gagal setelah commit `6011183`.

### 2.3 Billing FE
- `backend.js`: billingState() reads `ledger_accounts` via RLS (user-scoped) ✓.
- tryDebit() remote: panggil `issue_document` dengan p_ref/p_category/p_template/p_data; price dihitung server-side (FE arg `price` diabaikan untuk remote — benar, server = source of truth).
- getCategories/getMyUnlocks/unlockCategory/unlockAllCategories: RPC signature cocok.
- LOCAL_CATEGORIES (backend.js) == DB get_categories() (7/7, prices + unlock_price + prefix) ✓.
- credit-ledger.js: PACKAGES (starter/bisnis/pro) == DB packages ✓; UNLOCK_ALL_PRICE = 129000 == billing_settings ✓.

### 2.4 Keamanan FE
- Tidak ada secret hardcoded (anon key public by design, GEMINI_API_KEY dari env) ✓.
- Tidak ada `console.log/debug/info` di production code (satu-satunya di vendor html2canvas) ✓.
- XSS: semua innerHTML assignment memakai esc/admEsc/manual escape ✓.
- `config.js` anon key adalah public client value (dilindungi RLS) ✓ — sesuai dokumentasi.

### 2.5 Temuan FE
- **F-1 (high):** `js/app.js` 82 KB god object (state, binding, billing modal, admin table, example mode). Sulit diuji & di-refactor.
- **F-2 (high):** 0 automated test. Validasi hanya harness ad-hoc + Playwright manual.
- **F-3 (medium):** State global mutable (`state`, `sampleDraftMode`, `sampleDraftPristine`); `switchTemplate` rebuild sample berdasarkan flag → mudah salah (sudah kena sekali saat testing).
- **F-4 (medium):** `css/app.css` 65 KB single file; aturan `[hidden]` override (`.field { display:flex }`) sempat menyebabkan bug field "terlihat" padahal `hidden=true` (baru diperbaiki).
- **F-5 (low):** Magic strings (`"client"`, `"items"`, `"terms"`, `"due"`) tersebar; typo = bug senyap. Sebagian dikonsolidasi ke `editor-fields.js`.
- **F-6 (low):** Tidak ada TypeScript; state shape hanya di-enforce oleh `blankState`.

---

## 3. Backend (BE / Supabase) audit

### 3.1 Schema & tabel (14 tabel)
`admin_push_events`, `admin_push_subscriptions`, `billing_settings`, `category_unlocks`, `credit_transactions`, `document_categories`, `document_number_counters`, `document_templates`, `gemini_daily_usage`, `invoices`, `ledger_accounts`, `packages`, `profiles`, `topup_requests`.

### 3.2 RPC (24 function)
Semua RPC yang dipanggil FE ada di DB dengan signature cocok (approve_topup, cancel_topup, get_categories, get_my_unlocks, get_packages, is_admin, issue_document, next_document_number, reject_topup, request_topup, unlock_all_categories, unlock_category, adjust_balance, set_role). RPC yang tidak dipanggil FE (adjust_credits, claim_topup_push_notification, consume_gemini_daily_quota, get_my_billing, guard_invoice_issue_transition, handle_new_user, my_role, remove/save_admin_push_subscription, update_category) adalah admin/system/trigger — wajar.

### 3.3 Billing logic (issue_document)
- Validasi input (ref, category, template, data) ✓.
- Validasi kategori template (kategori template harus cocok dengan p_category) ✓ — mencegah spoofing.
- Idempotent re-issue (status='issued' → return true) ✓.
- Harga efektif: `coalesce(t.price_per_doc, c.price_per_doc)` + c.active ✓ — cocok dengan FE `effectiveDocPrice()`.
- Charge order: unlocked → free template → trial_credits → balance; insufficient → return false ✓ — cocok dengan FE tryDebit (offline).
- `perform set_config('fakturku.issue_document', 'on', true)` untuk trigger guard ✓.
- Status update atomic dengan billing ✓.

### 3.4 Numbering (next_document_number)
- Advisory lock per user+category+year (race-safe) ✓.
- Prefix dari document_categories (active) ✓.
- Max seq dari existing invoices + counter table dengan `greatest()` (anti-regression) ✓.
- Format `PREFIX-YYYY-NNN` ✓.

### 3.5 Auth & user creation (handle_new_user)
- First user → admin, sisanya pic (advisory lock untuk race safety) ✓.
- Buat profile + ledger_account (trial_credits=10, balance=0) + credit_transaction (trial grant) ✓.

### 3.6 Unlock (unlock_category, unlock_all_categories)
- unlock_category: cek valid, cek saldo, insert category_unlocks, catat transaksi ✓.
- unlock_all_categories: baca harga dari billing_settings, cek sisa kategori yang belum dibuka, insert bundle (price_paid=0, source='bundle'), catat transaksi ✓.
- get_my_unlocks: return array kategori yang sudah dibuka ✓.

### 3.7 RLS (Row Level Security)
- 15 policy, mayoritas user-scoped (`user_id = auth.uid() OR is_admin()`).
- `profiles_update_own`: `with_check: (id = auth.uid()) AND (role = my_role())` → mencegah role escalation ✓.
- `invoices`: user CRUD own, admin SELECT all ✓.
- `document_categories`, `document_templates`, `packages`: public SELECT, admin write ✓.

### 3.8 Temuan BE (keamanan)

**B-1 (HIGH): `billing_settings` RLS disabled + full grants ke anon/authenticated.**
- RLS off → tidak ada filter. Grants: anon & authenticated punya INSERT/UPDATE/DELETE/TRUNCATE/SELECT.
- Siapa pun dengan anon key bisa membaca/mengubah/menghapus `all_categories_price` (129000). Meski FE tidak akses langsung (via RPC), direct REST call bisa.
- **Fix (butuh approval):** enable RLS + policy SELECT untuk authenticated (read-only), revoke write dari anon/authenticated, tulis hanya via service_role/admin RPC.

**B-2 (HIGH): grants EXECUTE terlalu luas pada fungsi sensitif.**
- `adjust_balance`, `set_role`, `update_category`, `is_admin`, `my_role`, `handle_new_user` granted EXECUTE ke `anon`, `authenticated`, `PUBLIC`.
- Fungsi-fungsi ini punya internal `is_admin()` check (defense in depth) → non-admin dapat error "hanya admin". Tapi grants tetap terlalu luas (best practice: revoke dari anon/public).
- `handle_new_user` adalah trigger function (seharusnya tidak callable langsung) → revoke dari anon/authenticated/PUBLIC.
- **Fix (butuh approval):** `revoke execute on function ... from public, anon; grant execute ... to authenticated;` + audit log untuk `set_role`.

**B-3 (MEDIUM): tidak ada audit log untuk `set_role`.**
- Perubahan role tidak tercatat. Untuk SaaS billing, ini gap compliance.
- **Fix:** tambah tabel `role_audit_log` + trigger/insert di `set_role`.

**B-4 (MEDIUM): `billing_settings` tidak ada di RLS policy list (0 policy).**
- Konsisten dengan B-1 (RLS off). Fix bersama B-1.

**B-5 (MEDIUM): `admin_push_events`, `admin_push_subscriptions`, `document_number_counters`, `gemini_daily_usage` tidak punya policy RLS.**
- Mungkin diakses hanya via SECURITY DEFINER (bypass RLS) — perlu verifikasi. `document_number_counters` diakses via `next_document_number` (DEFINER) ✓. `gemini_daily_usage` via `consume_gemini_daily_quota` (DEFINER) ✓. Admin push via admin RPCs (DEFINER) ✓.
- **Verifikasi:** pastikan tidak ada direct REST access (anon) ke tabel-tabel ini. Jika ada, tambah RLS + revoke.

**B-6 (LOW): `unlock_all_categories` insert `category_unlocks` dengan `price_paid=0, source='bundle'`.**
- Design choice: harga bundle dicatat di `credit_transactions` (balance_delta=-129000), bukan di per-category. Konsisten tapi perlu dokumentasi agar tidak membingungkan (audit report). Tidak bug.

**B-7 (LOW): `get_my_billing` RPC ada tapi FE tidak pakai (FE baca `ledger_accounts` langsung via RLS).**
- Inkonistensi minor. Bisa dibersihkan (FE pakai RPC untuk consistency) tapi tidak bug.

**B-8 (INFO): `adjust_credits` (legacy) masih ada tapi FE pakai `adjust_balance`.**
- Fungsi lama, tidak dipanggil FE. Bisa di-drop di migrasi berikutnya (setelah verifikasi tidak ada pemanggil). Low priority.

### 3.9 Operasional BE
- **DB drift:** `supabase/migrations/` adalah catatan, bukan replayable chain. Beberapa migrasi live (category_wallet_billing, topup_package_validation, admin_push_notifications) tidak ada di repo. Fresh DB dari repo tidak bisa di-spin-up dengan yakin.
- **File untracked:** `supabase/.gitignore`, `supabase/config.toml`, `supabase/.temp/` — lokal dev artifacts, tidak di-commit (benar, tapi perlu dokumentasi).
- **Tidak ada observability:** tidak ada error tracking/telemetry runtime. Jika `renderDoc` atau RPC gagal di browser user, tidak ada yang tahu.

---

## 4. Konsistensi FE↔BE (verifikasi)

| Item | FE | BE | Status |
|---|---|---|---|
| Template count | 51 | 51 | ✅ |
| Template ids | 51 | 51 | ✅ 0 mismatch |
| Category (per template) | — | — | ✅ 0 mismatch |
| price_per_doc (per template) | — | — | ✅ 0 mismatch |
| Category count | 7 | 7 | ✅ |
| Category prices | finance=1000, legal=2500, umkm=500, logistik=500, pajak=2500, proyek=2500, operasional=2500 | sama | ✅ |
| Category unlock_price | tier-C=39000, lainnya null | sama | ✅ |
| Category prefix | FIN/LEG/UMK/LOG/PKT/PRJ/OPS | sama | ✅ |
| Packages | starter 15000, bisnis 40000, pro 85000 | sama | ✅ |
| UNLOCK_ALL_PRICE | 129000 | billing_settings.all_categories_price=129000 | ✅ |
| effectiveDocPrice (FE) | unlocked→0, price_per_doc ?? category price | coalesce(t.price_per_doc, c.price_per_doc) + unlocked check | ✅ |
| issue_document charge order | — | unlocked→free→trial→balance | ✅ (cocok FE tryDebit) |
| next_document_number | p_category | p_category text | ✅ |
| unlock_category | p_category | p_category text | ✅ |
| unlock_all_categories | (no params) | (no params) | ✅ |
| get_categories | — | returns id,label,prefix,price_per_doc,unlock_price,active,sort_order | ✅ |
| get_my_unlocks | — | returns text[] | ✅ (FE handles array) |
| handle_new_user | — | trial_credits=10, balance=0 | ✅ (cocok FE credit-ledger trial 10) |

**Kesimpulan: FE dan BE sinkron.** DeepSeek sync-nya solid. Tidak ada mismatch fungsional.

---

## 5. Kesimpulan audit

### Yang sudah baik (jangan dirusak)
- FE↔BE template/category/price/billing sync (51/51, 7/7, 0 mismatch).
- Billing logic (issue_document) sound & cocok dengan FE.
- Numbering race-safe (advisory lock + counter table).
- handle_new_user race-safe (advisory lock first-admin).
- RLS policies user-scoped dengan role escalation protection.
- format.esc wajib, renderDoc single entry, kontrak template backwards-compatible.

### Yang perlu ditindak (prioritas)
**P0 (keamanan — butuh approval):**
1. Enable RLS pada `billing_settings` + revoke write dari anon/authenticated.
2. Revoke EXECUTE `adjust_balance`, `set_role`, `update_category`, `is_admin`, `my_role`, `handle_new_user` dari `public`/`anon` (grant hanya `authenticated`/`service_role`).
3. Tambah audit log untuk `set_role`.

**P1 (operasional):**
4. Tambah CI minimal (package.json + GitHub Actions: check-render-coverage + import smoke).
5. Bump SW cache v26 (sudah dilakukan di commit e889a1b).
6. Runbook migrasi DB + test "fresh DB from migrations".
7. Observability: error tracking (Sentry) + telemetry render gagal.

**P2 (hygiene):**
8. Bersihkan `adjust_credits` (legacy, tidak dipakai FE).
9. FE pakai `get_my_billing` RPC (konsistensi) alih-alih baca `ledger_accounts` langsung.
10. Refactor `app.js` god object (82 KB) + split CSS.
11. Tambah test runner (Vitest/Jest) + snapshot render per kategori.

### Rekomendasi akhir
FE dan BE **sinkron dan fungsional**. Tidak ada mismatch yang memblokir produksi. Yang tersisa adalah **hardening keamanan (B-1, B-2) dan operational readiness (CI, runbook, observability)** — semuanya butuh approval eksplisit sebelum eksekusi (sesuai AGENTS.md §8).

Untuk produksi dengan user nyata (bukan hanya teman testing): selesaikan P0 (keamanan) terlebih dahulu. P1/P2 bisa menyusul.

---

_Dokumen ini adalah hasil audit mendalam FE & BE. Dibuat 2026-10-17._
_Audit DB dilakukan via Supabase CLI linked (project pcydwlfyughwasyqglwq) + Management API._
_Tidak ada secret yang dicetak; token diambil dari Credential Manager._