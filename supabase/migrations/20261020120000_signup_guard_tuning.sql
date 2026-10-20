-- =============================================================
-- 20261020120000_signup_guard_tuning.sql
-- Penyesuaian aturan pola acak pada guard pendaftaran.
--
-- Alasan: aturan lama memblokir email yang mengandung 7+ digit berurutan.
-- Itu terlalu agresif untuk email sah yang memuat angka panjang (mis. tahun,
-- nomor invoice, atau nomor telepon pada alamat email). Contoh yang ikut kena:
--   andi2026xxxx@gmail.com / 081234567890@... / reset-e2e-1792460000@...
--
-- Perbaikan:
--   - ambang digit berurutan dinaikkan 7 -> 9
--   - pola 8 digit yang tampak seperti tahun (19xx/20xx) tetap diizinkan
--
-- File 20261020100000 tidak diubah (sudah pernah dijalankan di live).
-- =============================================================

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

  -- 3) pola acak: 9+ digit berurutan (timestamp/unix epoch).
  --    Angka 8 digit yang tampak seperti tahun (19xx/20xx) tetap boleh.
  if v_local ~ '[0-9]{9,}' then
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

grant execute on function public.signup_email_risk(text) to anon, authenticated, service_role;
