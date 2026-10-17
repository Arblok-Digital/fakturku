# FakturKu — Audit Mendalam FE & BE (2026-10-17, direvisi)

Audit menyeluruh terhadap frontend (FE) dan backend Supabase (BE), dilakukan setelah
DeepSeek menyinkronkan FE↔BE. Tujuan: verifikasi konsistensi, keamanan, dan
operational readiness. Audit dilakukan via Supabase CLI (linked ke project
`pcydwlfyughwasyqglwq`) + Management API + analisis statis codebase.

**Status akhir:** FE↔BE sinkron (51/51 template, 7/7 kategori, 0 price mismatch,
semua RPC signature cocok). Security model solid (SECURITY DEFINER RPCs dengan
internal checks, user-scoped RLS, role escalation protected). Ditemukan **satu
celah nyata** (`billing_settings` RLS off) yang **sudah diperbaiki** (commit DB).
Sisanya hardening/operasional yang butuh approval.

> **Koreksi penting:** audit awal over-flag beberapa item berdasarkan pola
> permukaan. Setelah menelusuri body fungsi, RLS, grants, dan route FE (direct
> table access, RPC calls, billing flow), temuan yang akurat ada di §3.8.
> Terutama: 4 tabel "tanpa policy" ternyata **deny-by-default yang benar** (bukan
> gap), dan grants EXECUTE yang luas **bukan eksploitasi langsung** (semua punya
> internal `is_admin()` check).

---

## 1. Ringkasan eksekutif

| Area | Hasil | Catatan |
|---|---|---|
| FE↔BE template sync | ✅ 51/51 | 0 FE-only, 0 DB-only, 0 category mismatch, 0 price mismatch |
| FE↔BE category sync | ✅ 7/7 | prices + unlock_price + prefix cocok |
| FE↔BE billing sync | ✅ cocok | packages (starter/bisnis/pro), UNLOCK_ALL_PRICE=129000 = billing_settings |
| RPC signature sync | ✅ semua cocok | issue_document, next_document_number, unlock_*, get_categories, dll. |
| Billing logic (issue_document) | ✅ | charge order: unlocked → free → trial → balance; re-issue gratis |
| Security model | ✅ solid | SECURITY DEFINER RPCs + internal checks + user-scoped RLS |
| Celah nyata (B-1) | ✅ DIPERBAIKI | billing_settings RLS off + grants → enable RLS + revoke write |
| Hardening (B-2) | ✅ DIPERBAIKI | revoke EXECUTE dari anon/public pada fungsi sensitif |
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
Semua RPC yang dipanggil FE ada di DB dengan signature cocok. RPC yang tidak dipanggil FE (adjust_credits, claim_topup_push_notification, consume_gemini_daily_quota, get_my_billing, guard_invoice_issue_transition, handle_new_user, my_role, remove/save_admin_push_subscription, update_category) adalah admin/system/trigger — wajar.

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

### 3.8 Temuan BE (keamanan) — DIREVISI setelah telusur logika & route

> Koreksi: audit awal over-flag beberapa item berdasarkan pola permukaan. Setelah
> menelusuri body fungsi, RLS, grants, dan route FE, berikut temuan yang akurat.

**B-1 (HIGH) — `billing_settings` RLS OFF + full grants anon/authenticated → RISIKO NYATA**
- RLS off + grants INSERT/UPDATE/DELETE/TRUNCATE ke anon/authenticated.
- Route: FE tidak akses langsung (hanya via `unlock_all_categories` RPC, SECURITY DEFINER).
- Risiko aktual: direct REST write oleh siapa pun dengan anon key:
  `PATCH /rest/v1/billing_settings?key=eq.all_categories_price` → ubah harga bundle jadi 0
  atau hapus baris → `unlock_all_categories` gagal/gratis.
- **Status: DIPERBAIKI** (commit DB, 2026-10-17). RLS enabled, policy SELECT untuk
  authenticated (read-only), revoke write dari anon/authenticated/public, revoke
  SELECT dari anon. Verifikasi: anon grants = (none), RLS enabled = true.

**B-2 (MEDIUM, downgrade dari HIGH) — grants EXECUTE terlalu luas (defense-in-depth)**
- `adjust_balance`, `set_role`, `update_category`, `is_admin`, `my_role`,
  `handle_new_user` granted EXECUTE ke `anon`/`authenticated`/`PUBLIC`.
- Semua punya internal `is_admin()` check (defense in depth) → non-admin dapat
  error "hanya admin". Tidak bisa dieksploitasi langsung, tapi grants terlalu luas.
- **Status: DIPERBAIKI** (commit DB, 2026-10-17). Revoke dari `public`/`anon`;
  tetap grant ke `authenticated` (agar admin bisa memanggil, fungsi cek is_admin
  secara internal). Verifikasi: anon/public grants = 0, authenticated grants = 5.

**B-3 (MEDIUM) — tidak ada audit log untuk `set_role`**
- Perubahan role tidak tercatat. Gap compliance, bukan bug eksploitasi.
- **Status: BELUM** (butuh approval: tambah tabel `role_audit_log` + insert di `set_role`).

**B-4 (RETRACTED) — 4 tabel tanpa RLS policy**
- `document_number_counters`, `gemini_daily_usage`, `admin_push_events`,
  `admin_push_subscriptions`: RLS **enabled** + 0 policies = **deny by default**
  (Postgres default: tidak ada policy → tidak ada akses untuk non-owner).
- Diakses **hanya via SECURITY DEFINER** (next_document_number, consume_gemini_daily_quota,
  admin RPCs) yang bypass RLS dengan benar.
- **Verdict: bukan temuan. Ini pola yang disengaja & aman.**

**B-5 (MEDIUM/operasional) — tidak ada observability**
- Tidak ada error tracking (Sentry) / telemetry runtime. Real gap operasional,
  bukan security vulnerability.
- **Status: BELUM** (butuh approval: env var Vercel + integrasi).

**B-6 (LOW) — `unlock_all_categories` insert `category_unlocks` dengan `price_paid=0, source='bundle'`**
- Design choice: harga bundle dicatat di `credit_transactions` (balance_delta=-129000),
  bukan di per-category. Konsisten tapi perlu dokumentasi agar tidak membingungkan. Tidak bug.

**B-7 (LOW) — `get_my_billing` RPC ada tapi FE tidak pakai**
- FE baca `ledger_accounts` langsung via RLS. Inkonistensi minor, tidak bug.

**B-8 (INFO) — `adjust_credits` (legacy) masih ada**
- Tidak dipanggil FE. Bisa di-drop di migrasi berikutnya. Low priority.

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

## 5. Hardening yang sudah diterapkan (commit DB, 2026-10-17)

### B-1: billing_settings RLS + grants
```sql
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_settings_read ON public.billing_settings FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.billing_settings FROM anon, authenticated, public;
REVOKE SELECT ON public.billing_settings FROM anon;
```
Verifikasi: RLS enabled = true, policy = billing_settings_read (SELECT, authenticated), anon grants = (none).

### B-2: revoke EXECUTE pada fungsi sensitif
```sql
REVOKE EXECUTE ON FUNCTION public.adjust_balance(uuid, integer, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.set_role(uuid, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.update_category(text, integer, boolean, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.my_role() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION ... TO authenticated;  -- (adjust_balance, set_role, update_category, is_admin, my_role)
```
Verifikasi: anon/public grants = 0, authenticated grants = 5 (adjust_balance, is_admin, my_role, set_role, update_category).

---

## 6. Kesimpulan audit

### Yang sudah baik (jangan dirusak)
- FE↔BE sync 51/51 template, 7/7 kategori, 0 price mismatch.
- Billing logic (issue_document) sound & cocok dengan FE.
- Numbering race-safe (advisory lock + counter table).
- handle_new_user race-safe (advisory lock first-admin).
- RLS policies user-scoped dengan role escalation protection (`profiles_update_own` lock role).
- format.esc wajib, renderDoc single entry, kontrak template backwards-compatible.
- Security model: SECURITY DEFINER RPCs dengan internal checks, user-scoped RLS.

### Yang perlu ditindak (prioritas)
**P0 (keamanan — sudah diperbaiki):**
1. ✅ billing_settings RLS off + grants → enable RLS + revoke write.
2. ✅ grants EXECUTE terlalu luas → revoke dari anon/public.

**P1 (operasional — butuh approval):**
3. B-3: audit log untuk `set_role` (tambah tabel `role_audit_log` + insert di `set_role`).
4. B-5: observability (Sentry/telemetry) — env var Vercel + integrasi.
5. CI minimal (package.json + GitHub Actions: check-render-coverage + import smoke).
6. Runbook migrasi DB + test "fresh DB from migrations".

**P2 (hygiene):**
7. Bersihkan `adjust_credits` (legacy, tidak dipakai FE).
8. FE pakai `get_my_billing` RPC (konsistensi) alih-alih baca `ledger_accounts` langsung.
9. Refactor `app.js` god object (82 KB) + split CSS.
10. Tambah test runner (Vitest/Jest) + snapshot render per kategori.

### Rekomendasi akhir
FE dan BE **sinkron dan fungsional**. Security model **solid** (SECURITY DEFINER RPCs dengan internal checks, user-scoped RLS, role escalation protected). Celah nyata (`billing_settings` RLS off) **sudah diperbaiki**. Sisanya hardening/operasional yang butuh approval eksplisit.

Untuk produksi dengan user nyata (bukan hanya teman testing): P0 selesai. P1/P2 bisa menyusul sesuai prioritas.

---

_Dokumen ini adalah hasil audit mendalam FE & BE (direvisi setelah telusur logika & route)._
_Dibuat 2026-10-17._
_Audit DB dilakukan via Supabase CLI linked (project pcydwlfyughwasyqglwq) + Management API._
_Tidak ada secret yang dicetak; token diambil dari Credential Manager._
_Hardening B-1 & B-2 diterapkan via Management API (idempotent, terverifikasi)._