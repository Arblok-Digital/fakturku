-- =============================================================
-- 20261020110000_reconcile_missing_objects.sql
-- Rekonsiliasi: objects yang ADA di database live tapi BELUM ada di repo.
--
-- Audit 2026-10-20 menemukan 18 object live yang tidak tercakup migrasi repo:
--   - fitur notifikasi push admin (2 tabel + 3 fungsi)  -> live 20261013140000
--   - fungsi inti: adjust_balance, get_my_billing, guard_invoice_issue_transition
--   - trigger pengaman billing `guard_invoice_issue` (paling kritis!)
--
-- Dampak sebelum file ini: kalau database dibangun ulang dari repo (mis. restore
-- ke project baru), penagihan bisa dilewati (status='issued' tanpa potong kredit)
-- dan fitur notifikasi admin hilang.
--
-- Semua statement idempotent: aman dijalankan di DB yang sudah ada.
-- =============================================================

-- ---------- tabel notifikasi push admin ----------
create table if not exists public.admin_push_events (
  topup_code text primary key,
  status     text not null default 'pending',
  last_error text,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_push_subscriptions (
  endpoint    text primary key,
  user_id     uuid,
  subscription jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists admin_push_subscriptions_user on public.admin_push_subscriptions (user_id);

alter table public.admin_push_events enable row level security;
alter table public.admin_push_subscriptions enable row level security;

-- ---------- fungsi inti yang belum ada di repo ----------
create or replace function public.get_my_billing()
returns table(trial_credits integer, balance integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select l.trial_credits, l.balance
  from public.ledger_accounts l
  where l.user_id = auth.uid();
$$;

create or replace function public.adjust_balance(p_user_id uuid, p_delta integer, p_note text default ''::text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

-- ---------- pengaman transisi invoice (anti bypass billing) ----------
create or replace function public.guard_invoice_issue_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
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

-- ---------- fungsi notifikasi push admin ----------
create or replace function public.save_admin_push_subscription(p_subscription jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  v_endpoint text;
begin
  if uid is null or not public.is_admin() then
    raise exception 'hanya admin dapat mengatur notifikasi';
  end if;

  v_endpoint := p_subscription ->> 'endpoint';
  if v_endpoint is null or v_endpoint !~ '^https://'
     or length(v_endpoint) > 2048
     or coalesce(length(p_subscription #>> '{keys,p256dh}'), 0) < 40
     or coalesce(length(p_subscription #>> '{keys,auth}'), 0) < 20 then
    raise exception 'data langganan notifikasi tidak valid';
  end if;

  insert into public.admin_push_subscriptions (endpoint, user_id, subscription)
  values (v_endpoint, uid, p_subscription)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        subscription = excluded.subscription,
        updated_at = now();
  return true;
end;
$$;

create or replace function public.remove_admin_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not public.is_admin() then
    raise exception 'hanya admin dapat mengatur notifikasi';
  end if;
  delete from public.admin_push_subscriptions
  where endpoint = p_endpoint and user_id = uid;
  return found;
end;
$$;

create or replace function public.claim_topup_push_notification(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  req record;
begin
  if uid is null then raise exception 'belum login'; end if;

  select code, price, balance_amount into req
  from public.topup_requests
  where code = p_code and user_id = uid and status = 'pending';
  if not found then raise exception 'permintaan top-up tidak ditemukan'; end if;

  insert into public.admin_push_events (topup_code)
  values (p_code)
  on conflict (topup_code) do nothing;
  if not found then
    update public.admin_push_events
    set status = 'pending', last_error = null, created_at = now()
    where topup_code = p_code
      and (status = 'failed' or (status = 'pending' and created_at < now() - interval '2 minutes'));
    if not found then return null; end if;
  end if;

  return jsonb_build_object(
    'code', req.code,
    'price', req.price,
    'balance_amount', req.balance_amount
  );
end;
$$;

-- ---------- hak akses (sama dengan kondisi live) ----------
revoke all on function public.get_my_billing() from public;
grant execute on function public.get_my_billing() to anon, authenticated, service_role;

revoke all on function public.adjust_balance(uuid, integer, text) from public, anon;
grant execute on function public.adjust_balance(uuid, integer, text) to authenticated, service_role;

revoke all on function public.guard_invoice_issue_transition() from public, anon, authenticated;

revoke all on function public.save_admin_push_subscription(jsonb) from public, anon;
grant execute on function public.save_admin_push_subscription(jsonb) to authenticated, service_role;

revoke all on function public.remove_admin_push_subscription(text) from public, anon;
grant execute on function public.remove_admin_push_subscription(text) to authenticated, service_role;

revoke all on function public.claim_topup_push_notification(text) from public, anon;
grant execute on function public.claim_topup_push_notification(text) to authenticated, service_role;

revoke all on public.admin_push_events from anon;
revoke all on public.admin_push_subscriptions from anon;
grant select, insert, update, delete on public.admin_push_events to authenticated, service_role;
grant select, insert, update, delete on public.admin_push_subscriptions to authenticated, service_role;
