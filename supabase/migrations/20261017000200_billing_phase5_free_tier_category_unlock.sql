-- ============================================================
-- FakturKu — Fase 5 "Penyelarasan billing" — SUDAH DITERAPKAN ke DB live 2026-10-17.
-- Mengikuti rekomendasi review §3.2 + keputusan D1-D5 (Ardi: ikut Claude dulu).
-- Isi: tier gratis, harga efektif per dokumen (template ?? kategori),
--       buka-per-kategori sekali bayar, paket semua kategori.
-- Idempotent: aman dijalankan ulang.
-- Catatan: repo ini TIDAK memakai `supabase db push` (migrasi repo tertinggal dari live).
-- Catatan: `get_categories` di-drop lalu dibuat ulang karena return type-nya berubah
--          (+ unlock_price). Dijalankan dalam satu transaksi agar tidak ada celah.
-- ============================================================

begin;

-- ---------- 1. Harga per template ----------
-- NULL = ikut harga kategori · 0 = gratis (tier A)
alter table public.document_templates
  add column if not exists price_per_doc integer;

comment on column public.document_templates.price_per_doc is
  'Harga per dokumen (Rp). NULL = ikut document_categories.price_per_doc. 0 = gratis.';

-- ---------- 2. Harga buka kategori ----------
-- NULL = kategori ini tidak bisa dibuka sekali bayar
alter table public.document_categories
  add column if not exists unlock_price integer;

comment on column public.document_categories.unlock_price is
  'Harga sekali bayar untuk membuka seluruh dokumen kategori ini (Rp). NULL = tidak bisa dibuka.';

-- ---------- 3. Pengaturan billing ----------
create table if not exists public.billing_settings (
  key        text primary key,
  value      integer not null,
  updated_at timestamptz not null default now()
);

insert into public.billing_settings (key, value)
values ('all_categories_price', 129000)
on conflict (key) do nothing;

-- ---------- 4. Seed harga ----------
-- Tier A — gratis dasar (D1)
update public.document_templates
   set price_per_doc = 0
 where id in ('nota-kontan', 'kwitansi-a4', 'struk-pos', 'invoice-digital');

update public.document_templates
   set price_per_doc = null
 where id not in ('nota-kontan', 'kwitansi-a4', 'struk-pos', 'invoice-digital');

-- Tier B — standar (per dokumen, harga kategori)
update public.document_categories set price_per_doc = 1000 where id = 'finance';
update public.document_categories set price_per_doc = 500  where id = 'umkm';
update public.document_categories set price_per_doc = 500  where id = 'logistik';

-- Tier C — premium (proyek, legal, pajak, operasional)
update public.document_categories set price_per_doc = 2500
 where id in ('proyek', 'legal', 'pajak', 'operasional');

-- Buka kategori: hanya tier C (D2 — hybrid)
update public.document_categories set unlock_price = 39000
 where id in ('proyek', 'legal', 'pajak', 'operasional');
update public.document_categories set unlock_price = null
 where id not in ('proyek', 'legal', 'pajak', 'operasional');

-- ---------- 5. Tabel buka-kategori ----------
create table if not exists public.category_unlocks (
  user_id     uuid not null references auth.users(id) on delete cascade,
  category    text not null references public.document_categories(id) on delete cascade,
  price_paid  integer not null default 0,
  source      text not null default 'balance',
  unlocked_at timestamptz not null default now(),
  primary key (user_id, category)
);

create index if not exists category_unlocks_user_idx on public.category_unlocks (user_id);

alter table public.category_unlocks enable row level security;

drop policy if exists cu_select on public.category_unlocks;
create policy cu_select on public.category_unlocks
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists cu_admin_write on public.category_unlocks;
create policy cu_admin_write on public.category_unlocks
  for all using (public.is_admin());

-- ---------- 6. get_categories: tambah unlock_price ----------
drop function if exists public.get_categories();
create function public.get_categories()
 returns table(id text, label text, icon text, color text, price_per_doc integer,
               unlock_price integer, prefix text, active boolean, sort_order integer)
 language sql stable security definer
as $function$
  select id, label, icon, color, price_per_doc, unlock_price, prefix, active, sort_order
  from public.document_categories
  where active = true
  order by sort_order;
$function$;

-- ---------- 7. get_my_unlocks ----------
create or replace function public.get_my_unlocks()
 returns text[]
 language sql stable security definer
as $function$
  select coalesce(array_agg(category order by category), '{}'::text[])
  from public.category_unlocks
  where user_id = auth.uid();
$function$;

-- ---------- 8. issue_document: harga efektif + gratis/terbuka tanpa potong ----------
create or replace function public.issue_document(p_ref text, p_category text, p_template text, p_data jsonb)
 returns boolean
 language plpgsql security definer
as $function$
declare
  uid uuid := auth.uid();
  v_status text;
  v_existing_template text;
  v_category text;
  v_price integer;
  v_trial integer;
  v_balance integer;
  v_unlocked boolean;
begin
  if uid is null then return false; end if;
  if p_ref is null or btrim(p_ref) = '' or p_template is null
     or p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'data dokumen tidak valid';
  end if;

  select category into v_category
  from public.document_templates
  where id = p_template;
  if v_category is null or p_category is distinct from v_category then
    raise exception 'kategori template tidak valid';
  end if;

  select status, template
  into v_status, v_existing_template
  from public.invoices
  where user_id = uid and number = p_ref
  for update;
  if found and v_existing_template <> p_template then
    raise exception 'nomor dokumen sudah dipakai untuk template lain';
  end if;
  if found and v_status = 'issued' then
    return true;
  end if;

  if not found then
    insert into public.invoices
      (user_id, template, number, status, category, verify_code, data)
    values
      (uid, p_template, p_ref, 'draft', v_category, coalesce(p_data ->> 'verify', ''),
       jsonb_set(p_data, '{issued}', 'false'::jsonb, true))
    on conflict (user_id, number) do nothing;

    select status, template
    into v_status, v_existing_template
    from public.invoices
    where user_id = uid and number = p_ref
    for update;
    if not found then raise exception 'dokumen gagal disimpan'; end if;
    if v_existing_template <> p_template then
      raise exception 'nomor dokumen sudah dipakai untuk template lain';
    end if;
    if v_status = 'issued' then
      return true;
    end if;
  end if;

  update public.invoices
  set template = p_template,
      category = v_category,
      verify_code = coalesce(p_data ->> 'verify', ''),
      data = jsonb_set(p_data, '{issued}', 'false'::jsonb, true),
      updated_at = now()
  where user_id = uid and number = p_ref;

  -- harga efektif: harga template kalau ada, kalau tidak harga kategori
  select coalesce(t.price_per_doc, c.price_per_doc)
    into v_price
  from public.document_templates t
  join public.document_categories c on c.id = t.category
  where t.id = p_template and c.active = true;
  if not found then raise exception 'kategori tidak aktif'; end if;

  select trial_credits, balance into v_trial, v_balance
  from public.ledger_accounts
  where user_id = uid
  for update;
  if not found then return false; end if;

  v_unlocked := exists (
    select 1 from public.category_unlocks
    where user_id = uid and category = v_category
  );

  if coalesce(v_price, 0) <= 0 or v_unlocked then
    -- gratis (tier A) atau kategori sudah dibuka: tanpa potong saldo/trial
    insert into public.credit_transactions
      (user_id, delta, reason, ref, credits_after, category, balance_delta, balance_after)
    values (uid, 0,
            case when v_unlocked then 'unlock_issue' else 'free_issue' end,
            p_ref, 0, v_category, 0, v_balance);
  elsif v_trial > 0 then
    update public.ledger_accounts
    set trial_credits = trial_credits - 1, updated_at = now()
    where user_id = uid
    returning trial_credits into v_trial;

    insert into public.credit_transactions
      (user_id, delta, reason, ref, credits_after, category, trial_delta, trial_after)
    values (uid, 0, 'trial_issue', p_ref, 0, v_category, -1, v_trial);
  else
    if v_balance < v_price then return false; end if;

    update public.ledger_accounts
    set balance = balance - v_price, updated_at = now()
    where user_id = uid
    returning balance into v_balance;

    insert into public.credit_transactions
      (user_id, delta, reason, ref, credits_after, category, balance_delta, balance_after)
    values (uid, 0, 'issue', p_ref, 0, v_category, -v_price, v_balance);
  end if;

  perform set_config('fakturku.issue_document', 'on', true);
  update public.invoices
  set status = 'issued', category = v_category,
      data = jsonb_set(coalesce(data, '{}'::jsonb), '{issued}', 'true'::jsonb),
      updated_at = now()
  where user_id = uid and number = p_ref;
  return true;
end;
$function$;

-- ---------- 9. Buka satu kategori ----------
create or replace function public.unlock_category(p_category text)
 returns jsonb
 language plpgsql security definer
as $function$
declare
  uid uuid := auth.uid();
  v_price integer;
  v_balance integer;
begin
  if uid is null then raise exception 'belum login'; end if;

  select unlock_price into v_price
  from public.document_categories
  where id = p_category and active = true;
  if not found then raise exception 'kategori tidak valid'; end if;
  if v_price is null or v_price <= 0 then
    raise exception 'kategori ini tidak perlu dibuka';
  end if;

  select balance into v_balance
  from public.ledger_accounts
  where user_id = uid
  for update;
  if not found then raise exception 'akun saldo tidak ditemukan'; end if;

  if exists (select 1 from public.category_unlocks
             where user_id = uid and category = p_category) then
    return jsonb_build_object('ok', true, 'already', true, 'balance', v_balance);
  end if;

  if v_balance < v_price then
    return jsonb_build_object('ok', false, 'reason', 'insufficient',
                              'price', v_price, 'balance', v_balance);
  end if;

  update public.ledger_accounts
  set balance = balance - v_price, updated_at = now()
  where user_id = uid
  returning balance into v_balance;

  insert into public.category_unlocks (user_id, category, price_paid, source)
  values (uid, p_category, v_price, 'balance')
  on conflict do nothing;

  insert into public.credit_transactions
    (user_id, delta, reason, ref, credits_after, category, balance_delta, balance_after)
  values (uid, 0, 'unlock_category', p_category, 0, p_category, -v_price, v_balance);

  return jsonb_build_object('ok', true, 'price', v_price, 'balance', v_balance);
end;
$function$;

-- ---------- 10. Buka semua kategori sekali bayar ----------
create or replace function public.unlock_all_categories()
 returns jsonb
 language plpgsql security definer
as $function$
declare
  uid uuid := auth.uid();
  v_price integer;
  v_balance integer;
  v_left integer;
begin
  if uid is null then raise exception 'belum login'; end if;

  select value into v_price
  from public.billing_settings
  where key = 'all_categories_price';
  if v_price is null or v_price <= 0 then
    raise exception 'harga paket semua kategori belum diatur';
  end if;

  select count(*) into v_left
  from public.document_categories c
  where c.active = true and c.unlock_price is not null and c.unlock_price > 0
    and not exists (select 1 from public.category_unlocks u
                    where u.user_id = uid and u.category = c.id);

  if v_left = 0 then
    select balance into v_balance from public.ledger_accounts where user_id = uid;
    return jsonb_build_object('ok', true, 'already', true, 'balance', coalesce(v_balance, 0));
  end if;

  select balance into v_balance
  from public.ledger_accounts
  where user_id = uid
  for update;
  if not found then raise exception 'akun saldo tidak ditemukan'; end if;

  if v_balance < v_price then
    return jsonb_build_object('ok', false, 'reason', 'insufficient',
                              'price', v_price, 'balance', v_balance);
  end if;

  update public.ledger_accounts
  set balance = balance - v_price, updated_at = now()
  where user_id = uid
  returning balance into v_balance;

  insert into public.category_unlocks (user_id, category, price_paid, source)
  select uid, c.id, 0, 'bundle'
  from public.document_categories c
  where c.active = true and c.unlock_price is not null and c.unlock_price > 0
  on conflict do nothing;

  insert into public.credit_transactions
    (user_id, delta, reason, ref, credits_after, balance_delta, balance_after)
  values (uid, 0, 'unlock_all', 'all_categories', 0, -v_price, v_balance);

  return jsonb_build_object('ok', true, 'price', v_price, 'balance', v_balance);
end;
$function$;

-- ---------- 11. Hak akses (mengikuti pola live yang sudah ada) ----------
do $$
begin
  execute 'grant execute on function public.get_categories() to anon, authenticated, service_role';
  execute 'grant execute on function public.get_my_unlocks() to anon, authenticated, service_role';
  execute 'grant execute on function public.unlock_category(text) to anon, authenticated, service_role';
  execute 'grant execute on function public.unlock_all_categories() to anon, authenticated, service_role';
  execute 'grant execute on function public.issue_document(text, text, text, jsonb) to anon, authenticated, service_role';
end $$;

commit;
