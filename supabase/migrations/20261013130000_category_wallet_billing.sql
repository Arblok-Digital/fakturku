-- Category-priced billing with 10 free trial documents and a Rupiah wallet.
-- Existing test balances were reset with owner approval before billing launch.

create table if not exists public.document_templates (
  id text primary key,
  category text not null references public.document_categories(id)
);

insert into public.document_templates (id, category) values
  ('faktur-a4', 'finance'),
  ('kwitansi-a4', 'finance'),
  ('struk-ansuran', 'umkm'),
  ('invoice-digital', 'finance'),
  ('credit-note', 'finance'),
  ('debit-note', 'finance'),
  ('surat-tagihan', 'finance'),
  ('invoice-berkala', 'finance'),
  ('nota-kontan', 'umkm'),
  ('surat-penawaran', 'umkm'),
  ('surat-pesanan', 'umkm'),
  ('struk-pos', 'umkm'),
  ('daftar-harga', 'umkm'),
  ('surat-jalan', 'logistik'),
  ('bukti-terima-barang', 'logistik'),
  ('retur-barang', 'logistik'),
  ('packing-list', 'logistik'),
  ('rab-proyek', 'proyek'),
  ('bast-proyek', 'proyek'),
  ('surat-perintah-bayar', 'proyek'),
  ('tagihan-termin', 'proyek'),
  ('berita-acara-pekerjaan', 'proyek'),
  ('memo-internal', 'operasional'),
  ('surat-perjalanan-dinas', 'operasional'),
  ('klaim-biaya', 'operasional'),
  ('purchase-order', 'operasional'),
  ('slip-gaji', 'operasional'),
  ('perjanjian-kerja-sama', 'legal'),
  ('surat-kuasa', 'legal'),
  ('spk', 'legal'),
  ('letter-of-intent', 'legal'),
  ('surat-pernyataan', 'legal'),
  ('mou', 'legal'),
  ('lembar-data-faktur-pajak', 'pajak'),
  ('lembar-data-setoran-pajak', 'pajak'),
  ('lembar-kerja-bukti-potong', 'pajak')
on conflict (id) do update set category = excluded.category;

alter table public.document_templates enable row level security;
drop policy if exists document_templates_read on public.document_templates;
create policy document_templates_read on public.document_templates for select using (true);

alter table public.ledger_accounts
  add column if not exists trial_credits integer not null default 10 check (trial_credits >= 0),
  add column if not exists balance integer not null default 0 check (balance >= 0);

alter table public.credit_transactions
  add column if not exists trial_delta integer not null default 0,
  add column if not exists trial_after integer,
  add column if not exists balance_delta integer not null default 0,
  add column if not exists balance_after integer;

alter table public.topup_requests
  add column if not exists balance_amount integer not null default 0 check (balance_amount >= 0);

alter table public.packages
  add column if not exists balance_amount integer not null default 0 check (balance_amount >= 0);

update public.packages set balance_amount = price;

-- Reconcile every pre-launch/test account to the agreed trial-only starting state.
update public.ledger_accounts
set credits = 0, trial_credits = 10, balance = 0, updated_at = now();
update public.topup_requests
set balance_amount = price
where balance_amount = 0 and price > 0;

update public.document_categories set price_per_doc = case id
  when 'finance' then 1000
  when 'legal' then 2000
  when 'umkm' then 500
  when 'logistik' then 500
  when 'pajak' then 1500
  when 'proyek' then 1500
  when 'operasional' then 750
  else price_per_doc
end;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  is_first boolean;
begin
  perform pg_advisory_xact_lock(hashtext('fakturku:first-admin'));
  select not exists (select 1 from public.profiles) into is_first;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    case when is_first then 'admin' else 'pic' end
  );

  insert into public.ledger_accounts (user_id, credits, trial_credits, balance)
  values (new.id, 0, 10, 0);

  insert into public.credit_transactions
    (user_id, delta, reason, ref, credits_after, trial_delta, trial_after, balance_delta, balance_after)
  values (new.id, 0, 'trial', 'TRIAL', 0, 10, 10, 0, 0);

  return new;
end;
$$;

create or replace function public.get_my_billing()
returns table (trial_credits integer, balance integer)
language sql security definer stable as $$
  select l.trial_credits, l.balance
  from public.ledger_accounts l
  where l.user_id = auth.uid();
$$;

drop function if exists public.get_packages();
create or replace function public.get_packages()
returns table (id text, label text, balance_amount integer, price integer)
language sql security definer stable as $$
  select p.id, p.label, p.balance_amount, p.price
  from public.packages p
  where coalesce(p.active, true) = true
  order by p.price;
$$;

drop function if exists public.request_topup(text);
create or replace function public.guard_invoice_issue_transition()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'issued' then
      raise exception 'dokumen hanya dapat diterbitkan melalui alur billing';
    end if;
  elsif old.status = 'issued' and new.status <> 'issued' then
    raise exception 'dokumen terbit tidak dapat dikembalikan menjadi draft';
  elsif new.status = 'issued' and old.status is distinct from new.status then
    if coalesce(current_setting('fakturku.issue_document', true), '') <> 'on' then
      raise exception 'dokumen hanya dapat diterbitkan melalui alur billing';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_invoice_issue on public.invoices;
create trigger guard_invoice_issue
before insert or update on public.invoices
for each row execute function public.guard_invoice_issue_transition();

create or replace function public.request_topup(p_package_id text)
returns text language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  v_balance integer;
  v_price integer;
  new_code text;
begin
  if uid is null then raise exception 'belum login'; end if;
  perform 1 from public.ledger_accounts where user_id = uid for update;
  if not found then raise exception 'akun saldo tidak ditemukan'; end if;
  if exists (
    select 1 from public.topup_requests
    where user_id = uid and status = 'pending'
  ) then
    raise exception 'masih ada permintaan top-up yang menunggu konfirmasi';
  end if;

  select balance_amount, price into v_balance, v_price
  from public.packages
  where id = p_package_id and coalesce(active, true) = true;
  if v_balance is null or v_balance <= 0 or v_price <= 0 then
    raise exception 'paket tidak valid';
  end if;
  if v_balance <> v_price then
    raise exception 'saldo top-up harus sama dengan nominal pembayaran';
  end if;

  loop
    new_code := 'FKT-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.topup_requests where code = new_code);
  end loop;

  insert into public.topup_requests (code, user_id, credits, balance_amount, price)
  values (new_code, uid, 0, v_balance, v_price);
  return new_code;
end;
$$;

create or replace function public.approve_topup(p_code text)
returns boolean language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  req record;
  v_balance integer;
begin
  if not public.is_admin() then raise exception 'hanya admin'; end if;

  select user_id, balance_amount into req
  from public.topup_requests
  where code = p_code and status = 'pending'
  for update;
  if not found then return false; end if;

  update public.topup_requests
  set status = 'approved', decided_at = now(), decided_by = uid
  where code = p_code;

  update public.ledger_accounts
  set balance = balance + req.balance_amount, updated_at = now()
  where user_id = req.user_id
  returning balance into v_balance;
  if not found then raise exception 'akun saldo tidak ditemukan'; end if;

  insert into public.credit_transactions
    (user_id, delta, reason, ref, credits_after, balance_delta, balance_after)
  values (req.user_id, 0, 'topup', p_code, 0, req.balance_amount, v_balance);
  return true;
end;
$$;

drop function if exists public.issue_document(text, text);
drop function if exists public.issue_document(text);
create or replace function public.issue_document(
  p_ref text,
  p_category text,
  p_template text,
  p_data jsonb
)
returns boolean language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  v_status text;
  v_existing_template text;
  v_category text;
  v_price integer;
  v_trial integer;
  v_balance integer;
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

  select price_per_doc into v_price
  from public.document_categories
  where id = v_category and active = true;
  if v_price is null or v_price <= 0 then raise exception 'kategori tidak aktif'; end if;

  select trial_credits, balance into v_trial, v_balance
  from public.ledger_accounts
  where user_id = uid
  for update;
  if not found then return false; end if;

  if v_trial > 0 then
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
$$;

create or replace function public.adjust_balance(p_user_id uuid, p_delta integer, p_note text default '')
returns boolean language plpgsql security definer as $$
declare
  v_balance integer;
begin
  if not public.is_admin() then raise exception 'hanya admin'; end if;
  if p_delta = 0 then raise exception 'perubahan saldo tidak boleh nol'; end if;

  update public.ledger_accounts
  set balance = balance + p_delta, updated_at = now()
  where user_id = p_user_id and balance + p_delta >= 0
  returning balance into v_balance;
  if not found then raise exception 'akun tidak ditemukan atau saldo tidak cukup'; end if;

  insert into public.credit_transactions
    (user_id, delta, reason, ref, credits_after, balance_delta, balance_after)
  values (p_user_id, 0, 'manual: ' || coalesce(p_note, ''), 'ADMIN', 0, p_delta, v_balance);
  return true;
end;
$$;

grant execute on function public.get_my_billing() to authenticated;
grant execute on function public.get_packages() to authenticated;
grant execute on function public.request_topup(text) to authenticated;
grant execute on function public.approve_topup(text) to authenticated;
grant execute on function public.issue_document(text, text, text, jsonb) to authenticated;
grant execute on function public.adjust_balance(uuid, integer, text) to authenticated;
revoke all on function public.adjust_credits(uuid, integer, text) from public, anon, authenticated;
