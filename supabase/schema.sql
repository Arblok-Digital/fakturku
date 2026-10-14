-- ============================================================
-- FakturKu — Supabase Schema
-- Jalankan sekali di SQL Editor Supabase.
-- User pertama yang daftar otomatis jadi admin.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- tabel ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text default '',
  email text default '',
  role text not null default 'pic' check (role in ('pic', 'admin', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  reason text not null default '',
  ref text default '',
  credits_after integer,
  created_at timestamptz not null default now()
);

create table if not exists public.topup_requests (
  code text primary key check (code ~ '^FKT-[A-Z0-9]{6}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  credits integer not null,
  price integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template text not null default '',
  number text not null default '',
  status text not null default 'draft' check (status in ('draft', 'issued')),
  verify_code text default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);

create index if not exists ct_user_created on public.credit_transactions (user_id, created_at desc);
create index if not exists tu_status on public.topup_requests (status, created_at desc);
create index if not exists inv_user on public.invoices (user_id, updated_at desc);

-- Guard: MAKSIMAL satu admin. Tanpa ini, dua signup paralel bisa
-- sama-sama melihat profiles kosong dan dua-duanya jadi admin
-- (race di handle_new_user). Index ini backstop yang race-proof:
-- pelanggar kedua gagal dengan unique violation.
-- Catatan owner: promosi admin kedua via set_role juga akan ditolak
-- selama index ini ada — DROP INDEX one_admin_only bila butuh
-- multi-admin. Jika DB existing sudah terlanjur punya >1 admin,
-- bereskan dulu (demote duplikat) sebelum create index ini sukses.
create unique index if not exists one_admin_only
  on public.profiles (role) where (role = 'admin');

-- ---------- helper (security definer, hindari recursi RLS) ----------

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- trigger: profile + trial 10 credits saat signup ----------
-- user pertama otomatis admin

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  is_first boolean;
begin
  -- Serialisasi klaim "user pertama": tanpa lock, dua signup paralel
  -- sama-sama melihat profiles kosong dan dua-duanya jadi admin.
  -- Lock dilepas otomatis saat transaksi commit/rollback.
  perform pg_advisory_xact_lock(hashtext('fakturku:first-admin'));
  select not exists (select 1 from public.profiles) into is_first;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    case when is_first then 'admin' else 'pic' end
  );

  insert into public.ledger_accounts (user_id, credits)
  values (new.id, 10);

  insert into public.credit_transactions (user_id, delta, reason, ref, credits_after)
  values (new.id, 10, 'trial', 'TRIAL', 10);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------

alter table public.profiles enable row level security;
alter table public.ledger_accounts enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.topup_requests enable row level security;
alter table public.invoices enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update
  using (public.is_admin());

drop policy if exists ledger_select on public.ledger_accounts;
create policy ledger_select on public.ledger_accounts for select
  using (user_id = auth.uid() or public.is_admin());
-- TIDAK ada insert/update dari client: hanya lewat RPC definer

drop policy if exists ct_select on public.credit_transactions;
create policy ct_select on public.credit_transactions for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists tu_insert on public.topup_requests;
-- TIDAK ada insert dari client: request_topup (RPC definer) yang membuat baris,
-- supaya credits/price tidak bisa diubah sendiri oleh user.

drop policy if exists tu_select on public.topup_requests;
create policy tu_select on public.topup_requests for select
  using (user_id = auth.uid() or public.is_admin());

-- TIDAK ada update/delete client atas topup: approve/reject via RPC

drop policy if exists inv_all on public.invoices;
create policy inv_all on public.invoices for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists inv_admin_select on public.invoices;
create policy inv_admin_select on public.invoices for select
  using (public.is_admin());

-- ---------- RPC: ekspor (debit 1 kuota) ----------

create or replace function public.issue_document(p_ref text)
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

  insert into public.credit_transactions (user_id, delta, reason, ref, credits_after)
  values (uid, -1, 'ekspor', coalesce(p_ref, ''), c - 1);

  return true;
end;
$$;

-- ---------- RPC: top-up ----------

create or replace function public.request_topup(p_credits integer, p_price integer)
returns text language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  new_code text;
begin
  if uid is null then
    raise exception 'belum login';
  end if;
  if p_credits is null or p_credits < 1 or p_price is null or p_price < 0 then
    raise exception 'paket tidak valid';
  end if;

  loop
    new_code := 'FKT-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.topup_requests where code = new_code);
  end loop;

  insert into public.topup_requests (code, user_id, credits, price)
  values (new_code, uid, p_credits, p_price);

  return new_code;
end;
$$;

create or replace function public.cancel_topup(p_code text)
returns boolean language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
begin
  delete from public.topup_requests
  where code = p_code and user_id = uid and status = 'pending';
  return found;
end;
$$;

create or replace function public.approve_topup(p_code text)
returns boolean language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  req_credits integer;
  c integer;
begin
  if not public.is_admin() then
    raise exception 'hanya admin';
  end if;

  select credits into req_credits
  from public.topup_requests
  where code = p_code and status = 'pending'
  for update;

  if req_credits is null then
    return false;
  end if;

  update public.topup_requests
  set status = 'approved', decided_at = now(), decided_by = uid
  where code = p_code;

  update public.ledger_accounts
  set credits = credits + req_credits, updated_at = now()
  where user_id = (select user_id from public.topup_requests where code = p_code)
  returning credits into c;

  insert into public.credit_transactions (user_id, delta, reason, ref, credits_after)
  select user_id, req_credits, 'topup', p_code, c
  from public.topup_requests where code = p_code;

  return true;
end;
$$;

create or replace function public.reject_topup(p_code text)
returns boolean language plpgsql security definer as $$
begin
  if not public.is_admin() then
    raise exception 'hanya admin';
  end if;

  update public.topup_requests
  set status = 'rejected', decided_at = now(), decided_by = auth.uid()
  where code = p_code and status = 'pending';

  return found;
end;
$$;

-- ---------- RPC: admin management ----------

create or replace function public.set_role(p_user_id uuid, p_role text)
returns boolean language plpgsql security definer as $$
begin
  if not public.is_admin() then
    raise exception 'hanya admin';
  end if;
  if p_role not in ('pic', 'admin', 'viewer') then
    raise exception 'role tidak valid';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  return found;
end;
$$;

create or replace function public.adjust_credits(p_user_id uuid, p_delta integer, p_note text default '')
returns boolean language plpgsql security definer as $$
declare
  c integer;
begin
  if not public.is_admin() then
    raise exception 'hanya admin';
  end if;

  update public.ledger_accounts
  set credits = greatest(0, credits + p_delta), updated_at = now()
  where user_id = p_user_id
  returning credits into c;

  if c is null then
    return false;
  end if;

  insert into public.credit_transactions (user_id, delta, reason, ref, credits_after)
  values (p_user_id, p_delta, 'manual: ' || coalesce(p_note, ''), 'ADMIN', c);

  return true;
end;
$$;

-- ---------- grant ----------

grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_role() to authenticated;
grant execute on function public.issue_document(text) to authenticated;
grant execute on function public.request_topup(integer, integer) to authenticated;
grant execute on function public.cancel_topup(text) to authenticated;
grant execute on function public.approve_topup(text) to authenticated;
grant execute on function public.reject_topup(text) to authenticated;
grant execute on function public.set_role(uuid, text) to authenticated;
grant execute on function public.adjust_credits(uuid, integer, text) to authenticated;
