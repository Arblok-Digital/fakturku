-- Daily quota for the FakturKu Gemini assistant.
-- Apply only to the intended database environment; this migration is not auto-applied by Vercel.
create table if not exists public.gemini_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  message_count integer not null default 0 check (message_count >= 0 and message_count <= 10),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.gemini_daily_usage enable row level security;
-- No direct table policies: users can only consume quota through the constrained RPC.

create or replace function public.consume_gemini_daily_quota()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_count integer;
  v_reset_at timestamptz := ((date_trunc('day', now() at time zone 'Asia/Jakarta') + interval '1 day') at time zone 'Asia/Jakarta');
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  insert into public.gemini_daily_usage (user_id, usage_date, message_count, updated_at)
  values (v_user_id, v_today, 1, now())
  on conflict (user_id, usage_date) do update
    set message_count = public.gemini_daily_usage.message_count + 1,
        updated_at = now()
    where public.gemini_daily_usage.message_count < 10
  returning message_count into v_count;

  if v_count is null then
    select message_count into v_count
    from public.gemini_daily_usage
    where user_id = v_user_id and usage_date = v_today;

    return jsonb_build_object(
      'allowed', false,
      'limit', 10,
      'used', coalesce(v_count, 10),
      'remaining', 0,
      'reset_at', v_reset_at
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'limit', 10,
    'used', v_count,
    'remaining', greatest(0, 10 - v_count),
    'reset_at', v_reset_at
  );
end;
$$;

revoke all on table public.gemini_daily_usage from anon, authenticated;
revoke all on function public.consume_gemini_daily_quota() from public, anon;
grant execute on function public.consume_gemini_daily_quota() to authenticated;
