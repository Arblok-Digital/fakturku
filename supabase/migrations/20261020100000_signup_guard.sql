-- =============================================================
-- 20261020100000_signup_guard.sql
-- Guard pendaftaran FakturKu.
--
-- TUJUAN (tanpa mengubah kuota trial = 10 untuk user sah):
--   1. Menolak email palsu / sekali pakai (disposable, temp mail, alamat role, pola acak).
--   2. Membatasi akun per domain (bulk fake account) -> daftar boleh, tapi TANPA kuota trial.
--   3. Membatasi jumlah pendaftaran per IP (dijalankan di api/signup.js lewat RPC).
--   4. Mencatat percobaan pendaftaran (audit + dasar rate limit).
--
-- CATATAN KEAMANAN:
--   - Semua fungsi memakai SECURITY DEFINER + search_path terkunci.
--   - Data yang disimpan: hash (md5) email & IP, bukan nilai mentah.
--   - Kuota trial user sah tetap 10; hanya akun berisiko yang nol.
-- =============================================================

-- ---------- tabel ----------
create table if not exists public.blocked_signup_domains (
  domain       text primary key,
  reason       text not null default 'disposable',
  created_at   timestamptz not null default now()
);

create table if not exists public.signup_guard_events (
  id            bigint generated always as identity primary key,
  email_domain  text,
  email_hash    text,
  ip_hash       text,
  allowed       boolean not null default false,
  reason        text,
  created_at    timestamptz not null default now()
);

create index if not exists signup_guard_events_created_at_idx on public.signup_guard_events (created_at desc);
create index if not exists signup_guard_events_domain_idx on public.signup_guard_events (email_domain);
create index if not exists signup_guard_events_ip_idx on public.signup_guard_events (ip_hash);

-- ---------- seed daftar domain sekali pakai ----------
insert into public.blocked_signup_domains (domain, reason) values
  ('mailinator.com','disposable'),('mailinator2.com','disposable'),('maildrop.cc','disposable'),
  ('guerrillamail.com','disposable'),('guerrillamail.net','disposable'),('guerrillamail.org','disposable'),
  ('guerrillamail.biz','disposable'),('guerrillamail.de','disposable'),('sharklasers.com','disposable'),
  ('grr.la','disposable'),('spamgourmet.com','disposable'),('spam4.me','disposable'),
  ('spamherelots.com','disposable'),('10minutemail.com','disposable'),('10minutemail.net','disposable'),
  ('10minutemail.org','disposable'),('tempmail.com','disposable'),('tempmail.net','disposable'),
  ('tempmail.org','disposable'),('temp-mail.org','disposable'),('temp-mail.io','disposable'),
  ('temp-mail.cc','disposable'),('tmpmail.net','disposable'),('tmpmail.org','disposable'),
  ('tmails.net','disposable'),('tmail.ws','disposable'),('tmailor.com','disposable'),
  ('throwawaymail.com','disposable'),('throwawaymail.de','disposable'),('yopmail.com','disposable'),
  ('yopmail.fr','disposable'),('yopmail.net','disposable'),('cool.fr.nf','disposable'),
  ('jetable.org','disposable'),('jetable.net','disposable'),('mytemp.email','disposable'),
  ('mohmal.com','disposable'),('emailondeck.com','disposable'),('getonemail.com','disposable'),
  ('getnada.com','disposable'),('fakeinbox.com','disposable'),('fakeinformation.com','disposable'),
  ('tempinbox.com','disposable'),('mintemail.com','disposable'),('mytrashmail.com','disposable'),
  ('trashmail.com','disposable'),('trashmail.net','disposable'),('trashmail.de','disposable'),
  ('trashmail.me','disposable'),('dispostable.com','disposable'),('spambog.com','disposable'),
  ('spambog.ru','disposable'),('mailcatch.com','disposable'),('inboxkitten.com','disposable'),
  ('emailfake.com','disposable'),('mailpoof.com','disposable'),('burner.kiwi','disposable'),
  ('burnermail.io','disposable'),('mailnesia.com','disposable'),('moakt.com','disposable'),
  ('mailsac.com','disposable'),('einrot.com','disposable'),('mail-temporaire.fr','disposable'),
  ('jetable.fr','disposable'),('nowmymail.com','disposable'),('mail-temp.com','disposable'),
  ('tmpmail.net','disposable'),('mailgen.pro','disposable'),('tempr.email','disposable'),
  ('discard.email','disposable'),('discardmail.com','disposable'),('spambox.us','disposable'),
  ('spambox.info','disposable'),('anonbox.net','disposable'),('anonymbox.com','disposable'),
  ('amilegit.com','disposable'),('mailhazard.com','disposable'),('mintemail.net','disposable'),
  ('spamfree24.org','disposable'),('spamfree24.de','disposable'),('spamfree24.uk','disposable'),
  ('notmailinator.com','disposable'),('reallymymail.com','disposable'),('safe-mail.net','disposable'),
  ('veryrealemail.com','disposable'),('linshiyouxiang.net','disposable'),('mail.cn','disposable'),
  ('mail.tl','disposable'),('mail.gd','disposable'),('emailnator.com','disposable'),
  ('guerrillamail.info','disposable'),('guerrillamailblock.com','disposable'),
  ('emailfake.com','disposable'),('fakemail.net','disposable'),('fakemailgenerator.com','disposable'),
  ('generator.email','disposable'),('emailias.com','disposable'),('dropmail.me','disposable'),
  ('mail-tester.com','disposable'),('wegwerfmail.de','disposable'),('wegwerfmail.net','disposable'),
  ('nospam.ze.tc','disposable'),('nomail.pw','disposable'),('mohmal.in','disposable')
on conflict (domain) do nothing;

-- ---------- klasifikasi risiko email ----------
-- action: 'allow' | 'limit' (boleh daftar, tanpa kuota trial) | 'block' (ditolak)
create or replace function public.signup_email_risk(p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_local  text;
  v_domain text;
  v_free   boolean := false;
  v_saturation integer;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('action', 'block', 'reason', 'invalid_email');
  end if;

  v_local  := split_part(v_email, '@', 1);
  v_domain := split_part(v_email, '@', 2);

  if v_local = '' or v_domain = '' or v_domain !~ '\.' then
    return jsonb_build_object('action', 'block', 'reason', 'invalid_email');
  end if;

  v_free := v_domain in (
    'gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','msn.com',
    'yahoo.com','yahoo.co.id','yahoo.co.uk','proton.me','protonmail.com','icloud.com',
    'me.com','mac.com','aol.com','gmx.com','gmx.de','zoho.com','yandex.com','mail.ru','qq.com'
  );

  -- 1) domain sekali pakai / temporary
  if exists (select 1 from public.blocked_signup_domains d where d.domain = v_domain) then
    return jsonb_build_object('action', 'block', 'reason', 'domain_blocked');
  end if;

  -- 2) alamat role di domain gratIS (info@gmail.com, support@outlook.com, ...)
  if v_free and v_local in (
    'admin','administrator','info','support','noreply','no-reply','no_reply','webmaster',
    'postmaster','abuse','contact','sales','helpdesk','billing','office','mail','email',
    'test','testing','tester','user','username','signup','register','account','demo','temp'
  ) then
    return jsonb_build_object('action', 'block', 'reason', 'role_address');
  end if;

  -- 3) pola acak: 7+ digit berurutan (mis. andi1234567@...)
  if v_local ~ '[0-9]{7,}' then
    return jsonb_build_object('action', 'block', 'reason', 'random_pattern');
  end if;

  -- 4) plus-addressing di domain gratis -> boleh daftar, tanpa kuota trial
  if position('+' in v_local) > 0 and v_free then
    return jsonb_build_object('action', 'limit', 'reason', 'plus_addressing');
  end if;

  -- 5) domain sudah banyak akun (bulk fake account) -> boleh daftar, tanpa kuota trial
  select count(*) into v_saturation
  from public.profiles p
  where lower(split_part(coalesce(p.email, ''), '@', 2)) = v_domain;

  if v_saturation >= 20 then
    return jsonb_build_object('action', 'limit', 'reason', 'domain_saturation');
  end if;

  return jsonb_build_object('action', 'allow', 'reason', 'ok');
end;
$$;

-- ---------- guard BEFORE INSERT di auth.users ----------
-- Lapisan server-side: menolak pendaftaran langsung ke GoTrue (di luar api/signup.js).
create or replace function public.guard_signup_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_risk jsonb;
begin
  v_risk := public.signup_email_risk(new.email);
  if v_risk ->> 'action' = 'block' then
    raise exception 'signup_not_allowed:%', v_risk ->> 'reason' using errcode = 'check_violation';
  end if;
  if v_risk ->> 'action' = 'limit' then
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('fakturku_risk', v_risk ->> 'reason');
  end if;
  return new;
end;
$$;

drop trigger if exists guard_signup_insert on auth.users;
create trigger guard_signup_insert
  before insert on auth.users
  for each row execute function public.guard_signup_insert();

-- ---------- kuota trial: 0 untuk akun berisiko (bukan mengubah 10 untuk user sah) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_first boolean;
  v_risk   text := coalesce(new.raw_app_meta_data ->> 'fakturku_risk', '');
  v_trial  integer := 10;
begin
  perform pg_advisory_xact_lock(hashtext('fakturku:first-admin'));
  select not exists (select 1 from public.profiles) into is_first;

  if v_risk <> '' then
    v_trial := 0;
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    case when is_first and v_risk = '' then 'admin' else 'pic' end
  );

  insert into public.ledger_accounts (user_id, credits, trial_credits, balance)
  values (new.id, 0, v_trial, 0);

  insert into public.credit_transactions
    (user_id, delta, reason, ref, credits_after, trial_delta, trial_after, balance_delta, balance_after)
  values (
    new.id, 0,
    case when v_trial > 0 then 'trial' else 'trial_blocked' end,
    'TRIAL', 0, v_trial, v_trial, 0, 0
  );

  return new;
end;
$$;

-- ---------- RPC untuk api/signup.js (cek IP + log percobaan) ----------
create or replace function public.signup_guard_check(p_email text, p_ip text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_risk      jsonb;
  v_ip_count  integer := 0;
  v_total     integer := 0;
  v_ip_hash   text := null;
  v_domain    text;
  v_email_hash text;
begin
  v_domain := lower(split_part(btrim(coalesce(p_email, '')), '@', 2));
  v_email_hash := md5(lower(btrim(coalesce(p_email, ''))));
  if p_ip is not null and btrim(p_ip) <> '' then
    v_ip_hash := md5(btrim(p_ip));
  end if;

  v_risk := public.signup_email_risk(p_email);

  if v_risk ->> 'action' = 'block' then
    insert into public.signup_guard_events (email_domain, email_hash, ip_hash, allowed, reason)
    values (v_domain, v_email_hash, v_ip_hash, false, v_risk ->> 'reason');
    return jsonb_build_object('allowed', false, 'reason', v_risk ->> 'reason', 'action', 'block');
  end if;

  -- batas per IP: 8 pendaftaran berhasil per 24 jam
  if v_ip_hash is not null then
    select count(*) into v_ip_count
    from public.signup_guard_events
    where ip_hash = v_ip_hash and allowed and created_at > now() - interval '24 hours';
    if v_ip_count >= 8 then
      insert into public.signup_guard_events (email_domain, email_hash, ip_hash, allowed, reason)
      values (v_domain, v_email_hash, v_ip_hash, false, 'ip_rate_limited');
      return jsonb_build_object('allowed', false, 'reason', 'ip_rate_limited', 'action', 'block');
    end if;
  end if;

  -- batas global: 300 pendaftaran per 24 jam
  select count(*) into v_total
  from public.signup_guard_events
  where allowed and created_at > now() - interval '24 hours';
  if v_total >= 300 then
    insert into public.signup_guard_events (email_domain, email_hash, ip_hash, allowed, reason)
    values (v_domain, v_email_hash, v_ip_hash, false, 'global_rate_limited');
    return jsonb_build_object('allowed', false, 'reason', 'global_rate_limited', 'action', 'block');
  end if;

  insert into public.signup_guard_events (email_domain, email_hash, ip_hash, allowed, reason)
  values (v_domain, v_email_hash, v_ip_hash, true, v_risk ->> 'reason');

  -- bersihkan log lama sesekali (retensi 30 hari)
  if random() < 0.03 then
    delete from public.signup_guard_events where created_at < now() - interval '30 days';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', v_risk ->> 'reason',
    'action', v_risk ->> 'action'
  );
end;
$$;

grant execute on function public.signup_email_risk(text) to anon, authenticated, service_role;
grant execute on function public.signup_guard_check(text, text) to anon, authenticated, service_role;

-- RPC hanya чита (log) -> RLS: hanya service_role yang boleh baca langsung.
alter table public.signup_guard_events enable row level security;
drop policy if exists signup_guard_events_read on public.signup_guard_events;
create policy signup_guard_events_read on public.signup_guard_events
  for select to authenticated
  using (public.is_admin());

alter table public.blocked_signup_domains enable row level security;
drop policy if exists blocked_signup_domains_read on public.blocked_signup_domains;
create policy blocked_signup_domains_read on public.blocked_signup_domains
  for select to authenticated
  using (public.is_admin());

revoke all on public.signup_guard_events from anon;
revoke all on public.blocked_signup_domains from anon;
grant select on public.signup_guard_events to authenticated;
grant select on public.blocked_signup_domains to authenticated;
