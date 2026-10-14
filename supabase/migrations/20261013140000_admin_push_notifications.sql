create table if not exists public.admin_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_push_endpoint_https check (endpoint like 'https://%')
);

create index if not exists admin_push_subscriptions_user
  on public.admin_push_subscriptions (user_id);

alter table public.admin_push_subscriptions enable row level security;

create or replace function public.remove_demoted_admin_push_subscriptions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role <> 'admin' then
    delete from public.admin_push_subscriptions where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists remove_demoted_admin_push_subscriptions on public.profiles;
create trigger remove_demoted_admin_push_subscriptions
after update of role on public.profiles
for each row
when (old.role is distinct from new.role)
execute function public.remove_demoted_admin_push_subscriptions();

create table if not exists public.admin_push_events (
  topup_code text primary key references public.topup_requests(code) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_push_events
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  add column if not exists last_error text,
  add column if not exists sent_at timestamptz;

alter table public.admin_push_events enable row level security;

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

revoke all on public.admin_push_subscriptions from public, anon, authenticated;
revoke all on public.admin_push_events from public, anon, authenticated;
revoke all on function public.save_admin_push_subscription(jsonb) from public, anon;
revoke all on function public.remove_admin_push_subscription(text) from public, anon;
revoke all on function public.claim_topup_push_notification(text) from public, anon;

grant execute on function public.save_admin_push_subscription(jsonb) to authenticated;
grant execute on function public.remove_admin_push_subscription(text) to authenticated;
grant execute on function public.claim_topup_push_notification(text) to authenticated;
