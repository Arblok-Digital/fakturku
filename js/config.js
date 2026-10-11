/* ============================================================
   KONFIGURASI BACKEND SUPABASE
   1. Buat project gratis di https://supabase.com
   2. SQL Editor → jalankan supabase/schema.sql
   3. Isi 2 baris di bawah (Project Settings → API)
   Kosongkan lagi untuk kembali ke mode lokal (offline).
   ============================================================ */
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

export const isRemote = () =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith("http"));
