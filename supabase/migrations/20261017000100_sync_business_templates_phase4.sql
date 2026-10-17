-- FakturKu — Fase 4 (data-only, idempotent) — SUDAH DITERAPKAN ke DB live 2026-10-17.
-- Sinkron katalog template bisnis: FE (js/templates/business-documents.js) <-> DB.
-- Aman dijalankan ulang: hanya menyentuh tabel document_templates (id, category),
-- tidak ada FK dari tabel invoices, tidak ada perubahan skema/RPC.
-- Catatan: repo ini tidak memakai `supabase db push` (migrasi repo tertinggal dari live).

begin;

-- 1) D6: SPK pindah dari kategori legal ke proyek (prefix dokumen LEG -> PRJ).
update document_templates
   set category = 'proyek'
 where id = 'spk'
   and category <> 'proyek';

-- 2) Hapus katalog mati/duplikat (tidak dipakai FE; tidak ada invoice tersimpan yang memakainya).
delete from document_templates
 where id in (
   'letter-of-intent', 'rab-proyek', 'bast-proyek', 'retur-barang', 'invoice-berkala',
   'berita-acara-pekerjaan', 'lembar-data-setoran-pajak', 'lembar-kerja-bukti-potong'
 );

-- 3) Template baru Fase 4 (mou sudah ada -> ikut di-upsert agar kategori selaras).
insert into document_templates (id, category) values
  ('nota-servis',           'umkm'),
  ('rekap-upah-harian',     'proyek'),
  ('bukti-kas',             'finance'),
  ('proforma-invoice',      'finance'),
  ('perjanjian-borongan',   'legal'),
  ('perjanjian-sewa',       'legal'),
  ('manifest-pengiriman',   'logistik'),
  ('berita-acara-selisih',  'logistik'),
  ('laporan-harian-proyek', 'proyek'),
  ('surat-pengakuan-utang', 'legal'),
  ('rekap-penjualan-harian','umkm'),
  ('kartu-piutang',         'finance'),
  ('nota-timbang',          'umkm'),
  ('rekap-omzet-pph-final', 'pajak'),
  ('mou',                   'legal')
on conflict (id) do update set category = excluded.category;

commit;
