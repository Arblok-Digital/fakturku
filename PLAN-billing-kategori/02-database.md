# 02 — Skema Database & RPC

> Perubahan DB untuk billing per kategori. Berlaku di Supabase project `fakturku` ref `pcydwlfyughwasyqglwq`.

---

## Tabel Baru: `document_categories`

```sql
create table public.document_categories (
  id text primary key,              -- 'finance', 'legal', 'umkm', ...
  label text not null,              -- 'Finance', 'Legal', ...
  icon text,                        -- emoji sementara
  color text,                       -- hex badge
  price_per_doc integer not null,   -- rupiah
  prefix text not null,             -- 'FIN', 'LEG', ...
  active boolean default true,
  sort_order int default 0
);
```

### Seed

```sql
insert into public.document_categories (id, label, icon, color, price_per_doc, prefix, sort_order) values
  ('finance',     'Finance',     '💰', '#16324F', 1000, 'FIN', 1),
  ('legal',       'Legal',       '⚖️', '#4A3B7A', 2000, 'LEG', 2),
  ('umkm',        'UMKM',        '🏪', '#0E7C6B',  500, 'UMK', 3),
  ('logistik',    'Logistik',    '📦', '#B45309',  500, 'LOG', 4),
  ('pajak',       'Pajak',       '🧾', '#A4291F', 1500, 'PKT', 5),
  ('proyek',      'Proyek',      '🏗️', '#2D6A4F', 1500, 'PRJ', 6),
  ('operasional', 'Operasional', '📋', '#475569',  750, 'OPS', 7);
```

---

## Tabel Baru: `packages` (Opsional)

```sql
create table public.packages (
  id text primary key,              -- 'starter', 'bisnis', 'pro'
  label text not null,
  credits integer not null,
  price integer not null,           -- rupiah
  category_scope text[],            -- null = semua kategori
  active boolean default true
);
```

### Seed (PLACEHOLDER — harga menunggu diskusi)

```sql
insert into public.packages (id, label, credits, price) values
  ('starter', 'Starter', 20,  15000),
  ('bisnis',  'Bisnis',  60,  40000),
  ('pro',     'Pro',    150,  85000);
```

---

## Perubahan Tabel `invoices`

```sql
alter table public.invoices
  add column category text references public.document_categories(id);
```

> Backfill lama: set NULL atau default `'finance'` (4 template existing semuanya finance/umkm).

---

## Perubahan Tabel `credit_transactions`

```sql
alter table public.credit_transactions
  add column category text;
```

> Untuk logika debit per-kategori + riwayat transaksi yang lebih informatif.

---

## Perubahan `profiles` (Opsional)

```sql
-- Kalau model B (weighted): simpan total debit per kategori untuk cepat
alter table public.profiles
  add column category_debits jsonb default '{}'::jsonb;
```

---

## RPC Baru

### `issue_document(p_ref text, p_category text, p_template text, p_data jsonb)`

Menerima data dokumen langsung; tidak perlu menyimpan draft terlebih dahulu.

1. Memastikan kategori cocok dengan pemetaan template di server
2. Mengunci dokumen agar retry tidak menagih dua kali
3. Menyimpan draft, memvalidasi harga aktif, memakai trial terlebih dahulu lalu saldo Rupiah
4. Mencatat transaksi dan menandai dokumen terbit dalam transaksi database yang sama
5. Menerbitkan ulang dokumen terbit yang sama tanpa debit tambahan

**Model B — Tiered (weighted):**
```
1. Ambil price_per_doc kategori dari document_categories
2. Hitung bobot = ceil(price_per_doc / base_price)  
   — base_price = harga kategori termurah (mis. 500)
3. Cek kuota user >= bobot
4. debit bobot kuota
5. tandai dokumen terbit + catat transaksi (debit_amount = bobot)
```

### `request_topup(p_package_id text)`

```
1. Cek package ada & active
2. Buat topup_requests (status = 'pending')
3. Return request_id
```

### `approve_topup(p_request_id uuid)`

```
1. Cek role user = admin
2. Set topup_requests.status = 'approved'
3. Tambah credits ke ledger_accounts.user
4. Catat credit_transactions (type = 'topup', credits = package.credits)
```

### Admin CRUD kategori

```
get_categories()                  → list semua (user)
update_category(id, price, ...)   → admin only
toggle_category_active(id)        → admin only
```

---

## Migration File

Simpan di `supabase/migrations/YYYYMMDDHHMMSS_category_billing.sql`:

```sql
-- 1. Tabel document_categories + seed
-- 2. Tabel packages + seed  
-- 3. Alter invoices + credit_transactions + kolom category
-- 4. RPC issue_document v2 (Model A)
-- 5. RPC request_topup / approve_topup (sudah ada, tambah package_id)
-- 6. RPC admin CRUD kategori
-- 7. Backfill category lama
```

> Jalankan via `supabase db push` atau `supabase migration up`.

---

## RLS

```sql
-- document_categories: read untuk semua, write hanya admin
alter table public.document_categories enable row level security;

create policy "categories readable"
  on public.document_categories for select
  using (true);

create policy "categories admin write"
  on public.document_categories for all
  using (public.my_role() = 'admin');

-- packages: sama
```

---

*Lihat juga: [03-billing](03-billing.md) — detail logic billing & model.*
