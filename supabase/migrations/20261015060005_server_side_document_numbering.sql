create table if not exists public.document_number_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null references public.document_categories(id),
  doc_year integer not null,
  last_seq integer not null default 0 check (last_seq >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, category, doc_year)
);

alter table public.document_number_counters enable row level security;
revoke all on public.document_number_counters from anon, authenticated;

create or replace function public.next_document_number(p_category text)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  uid uuid := auth.uid();
  v_prefix text;
  v_year integer := extract(year from now() at time zone 'Asia/Jakarta')::integer;
  v_max integer := 0;
  v_next integer;
begin
  if uid is null then
    raise exception 'login diperlukan untuk membuat nomor dokumen';
  end if;

  select prefix into v_prefix
  from public.document_categories
  where id = p_category and active = true;

  if v_prefix is null or btrim(v_prefix) = '' then
    raise exception 'kategori dokumen tidak aktif atau tidak valid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_category || ':' || v_year::text, 0));

  select coalesce(max((regexp_match(number, '-([0-9]+)$'))[1]::integer), 0)
    into v_max
  from public.invoices
  where user_id = uid
    and number ~ ('^' || v_prefix || '-' || v_year::text || '-[0-9]+$');

  insert into public.document_number_counters(user_id, category, doc_year, last_seq, updated_at)
  values (uid, p_category, v_year, v_max + 1, now())
  on conflict (user_id, category, doc_year)
  do update set
    last_seq = greatest(public.document_number_counters.last_seq, v_max) + 1,
    updated_at = now()
  returning last_seq into v_next;

  return v_prefix || '-' || v_year::text || '-' || lpad(v_next::text, 3, '0');
end;
$function$;

revoke all on function public.next_document_number(text) from public;
grant execute on function public.next_document_number(text) to authenticated;
