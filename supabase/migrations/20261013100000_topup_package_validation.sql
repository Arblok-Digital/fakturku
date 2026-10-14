-- ============================================================
-- FakturKu — Top-up package validation (server-side)
-- Jalankan setelah schema.sql + category_billing migration.
--
-- Menutup lubang: client lama memanggil
--   request_topup(p_credits, p_price) dengan angka SESUKANYA
-- (mis. 1000 dokumen Rp 0). Sekarang client hanya mengirim
-- package_id; credits/price diambil dari tabel packages di server
-- dan paket nonaktif / tidak dikenal ditolak.
-- ============================================================

-- Hapus varian lama yang percaya angka kiriman client.
-- (Grant atas signature ini ikut hilang bersama function.)
drop function if exists public.request_topup(integer, integer);

create or replace function public.request_topup(p_package_id text)
returns text language plpgsql security definer as $$
declare
  uid uuid := auth.uid();
  v_credits integer;
  v_price integer;
  new_code text;
begin
  if uid is null then
    raise exception 'belum login';
  end if;
  if p_package_id is null or btrim(p_package_id) = '' then
    raise exception 'paket tidak valid';
  end if;

  -- credits/price OTORITATIF dari server, bukan dari client.
  select credits, price into v_credits, v_price
  from public.packages
  where id = p_package_id and coalesce(active, true) = true;

  if v_credits is null then
    raise exception 'paket tidak valid';
  end if;

  loop
    new_code := 'FKT-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.topup_requests where code = new_code);
  end loop;

  insert into public.topup_requests (code, user_id, credits, price)
  values (new_code, uid, v_credits, v_price);

  return new_code;
end;
$$;

grant execute on function public.request_topup(text) to authenticated;
