-- Keep the Supabase template registry aligned with the frontend renderer catalogue.
-- Idempotent data migration: preserves existing rows and only updates category mappings.
-- Required before deploying the expanded template picker, because issue_document
-- validates each template ID/category against public.document_templates.

insert into public.document_templates (id, category) values
  ('faktur-a4', 'finance'),
  ('kwitansi-a4', 'finance'),
  ('struk-ansuran', 'umkm'),
  ('invoice-digital', 'finance'),
  ('credit-note', 'finance'),
  ('debit-note', 'finance'),
  ('surat-tagihan', 'finance'),
  ('invoice-berulang', 'finance'),
  ('nota-kontan', 'umkm'),
  ('surat-penawaran', 'umkm'),
  ('surat-pesanan', 'umkm'),
  ('struk-pos', 'umkm'),
  ('daftar-harga', 'umkm'),
  ('surat-jalan', 'logistik'),
  ('bukti-terima-barang', 'logistik'),
  ('surat-retur', 'logistik'),
  ('packing-list', 'logistik'),
  ('perjanjian-kerja-sama', 'legal'),
  ('surat-kuasa', 'legal'),
  ('spk', 'legal'),
  ('loi', 'legal'),
  ('surat-pernyataan', 'legal'),
  ('memo-internal', 'operasional'),
  ('surat-perjalanan-dinas', 'operasional'),
  ('klaim-biaya', 'operasional'),
  ('purchase-order', 'operasional'),
  ('slip-gaji', 'operasional'),
  ('rab', 'proyek'),
  ('bast', 'proyek'),
  ('surat-perintah-bayar', 'proyek'),
  ('tagihan-termin', 'proyek'),
  ('berita-acara-progres', 'proyek'),
  ('lembar-data-faktur-pajak', 'pajak'),
  ('rekap-ppn-internal', 'pajak'),
  ('lembar-data-bukti-potong', 'pajak'),
  ('checklist-dokumen-pajak', 'pajak')
on conflict (id) do update
set category = excluded.category;
