/* ============================================================
   KONFIGURASI BACKEND SUPABASE — project "fakturku" (live)
   Ref: pcydwlfyughwasyqglwq · Singapore
   DB password: lihat .env.local (file lokal, tidak di-commit)
   ============================================================ */
export const SUPABASE_URL = "https://pcydwlfyughwasyqglwq.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeWR3bGZ5dWdod2FzeXFnbHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjA3NTIsImV4cCI6MjEwNzI5Njc1Mn0.OdCmJBVCtC0t824Py-uKqA5GHcJF4pdvbNvGCv4n2oE";

export const isRemote = () =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith("http"));
