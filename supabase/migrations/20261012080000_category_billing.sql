-- ============================================================
-- FakturKu — Category Billing Migration
-- Jalankan setelah schema.sql
-- ============================================================

-- ---------- tabel baru: document_categories ----------

create table if not exists public.document_categories (
  id text primary key,
  label text not null,
  icon text default '',
  color text default '#16324F',
  price_per_doc integer not null default 1000,
  prefix text not null,
  active boolean default true,
  sort_order int default 0
);

-- seed 7 kategori (harga placeholder — sesuaikan setelah diskusi)
insert into public.document_categories (id, label, icon, color, price_per_doc, prefix, sort_order) values
  ('finance',     'Finance',     '💰', '#16324F', 1000, 'FIN', 1),
  ('legal',       'Legal',       '⚖️', '#4A3B7A', 2000, 'LEG', 2),
  ('umkm',        'UMKM',        '🏪', '#0E7C6B',  500, 'UMK', 3),
  ('logistik',    'Logistik',    '📦', '#B45309',  500, 'LOG', 4),
  ('pajak',       'Pajak',       '🧾', '#A4291F', 1500, 'PKT', 5),
  ('proyek',      'Proyek',      '🏗️', '#2D6A4F', 1500, 'PRJ', 6),
  ('operasional', 'Operasional', '📋', '#475569',  750, 'OPS', 7)
on conflict (id) do nothing;

-- ---------- tabel baru: packages ----------

create table if not exists public.packages (
  id text primary key,
  label text not null,
  credits integer not null,
  price integer not null,
  category_scope text[],
  active boolean default true
);

insert into public.packages (id, label, credits, price) values
  ('starter', 'Starter', 20,  15000),
  ('bisnis',  'Bisnis',  60,  40000),
  ('pro',     'Pro',    150,  85000)
on conflict (id) do nothing;

-- ---------- alter invoices ----------

alter table public.invoices
  add column if not exists category text references public.document_categories(id);

-- ---------- alter credit_transactions ----------

alter table public.credit_transactions
  add column if not exists category text;

-- ---------- RLS ----------

alter table public.document_categories enable row level security;
alter table public.packages enable row level security;

drop policy if exists cat_select on public.document_categories;
create policy cat_select on public.document_categories for select
  using (true);

drop policy if exists cat_admin_write on public.document_categories;
create policy cat_admin_write on public.document_categories for all
  using (public.is_admin());

drop policy if exists pkg_select on public.packages;
create policy pkg_select on public.packages for select
  using (true);

drop policy if exists pkg_admin_write on public.packages;
create policy pkg_admin_write on public.packages for all
  using (public.is_admin());

-- ---------- RPC: get_categories ----------

create or replace function public.get_categories()
returns table (
  id text,
  label text,
  icon text,
  color text,
  price_per_doc integer,
  prefix text,
  active boolean,
  sort_order int
)
language sql security definer stable as $$
  select id, label, icon, color, price_per_doc, prefix, active, sort_order
  from public.document_categories
  where active = true
  order by sort_order;
$$;

-- ---------- RPC: get_packages ----------

create or replace function public.get_packages()
returns table (
  id text,
  label text,
  credits integer,
  price integer
)
language sql security definer stable as $$
  select id, label, credits, price
  from public.packages
  where active = true
  order by price;
$$;

-- ---------- RPC: issue_document v2 (Model A — flat) ----------

drop function if exists public.issue_document(text);

create or replace function public.issue_document(p_ref text, p_category text default null)
returns boolean language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  c integer;
begin
  if uid is null then return false; end if;

  select credits into c
  from public.ledger_accounts
  where user_id = uid
  for update;

  if c is null or c <= 0 then
    return false;
  end if;

  update public.ledger_accounts
  set credits = credits - 1, updated_at = now()
  where user_id = uid;

  insert into public.credit_transactions (user_id, delta, reason, ref, credits_after, category)
  values (uid, -1, 'ekspor', coalesce(p_ref, ''), c - 1, p_category);

  -- tandai kategori di invoices
  if p_category is not null then
    update public.invoices
    set category = p_category
    where number = p_ref and user_id = uid;
  end if;

  return true;
end;
$$;

-- ---------- RPC: admin update_category ----------

create or replace function public.update_category(
  p_id text,
  p_price integer default null,
  p_active boolean default null,
  p_color text default null
)
returns boolean language plpgsql security definer as $$
begin
  if not public.is_admin() then
    raise exception 'hanya admin';
  end if;

  update public.document_categories
  set
    price_per_doc = coalesce(p_price, price_per_doc),
    active = coalesce(p_active, active),
    color = coalesce(p_color, color)
  where id = p_id;

  return found;
end;
$$;

-- ---------- grant ----------

grant execute on function public.get_categories() to authenticated;
grant execute on function public.get_packages() to authenticated;
grant execute on function public.issue_document(text, text) to authenticated;
grant execute on function public.update_category(text, integer, boolean, text) to authenticated;

-- ---------- backfill kategori untuk invoices lama ----------

update public.invoices
set category = case
  when template like '%kwitansi%' then 'finance'
  when template like '%struk%' then 'umkm'
  else 'finance'
end
where category is null;
