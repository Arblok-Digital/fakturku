export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function rupiah(n) {
  const num = Number(n) || 0;
  return "Rp " + num.toLocaleString("id-ID");
}

export function formatDate(iso) {
  if (!iso) return "—";
  const bulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d)) return "";
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

const SATUAN = ["","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh","sebelas"];

function _terbilang(n) {
  n = Math.floor(Math.abs(n));
  if (n < 12) return SATUAN[n];
  if (n < 20) return _terbilang(n - 10) + "belas";
  if (n < 100) return _terbilang(Math.floor(n / 10)) + " puluh " + _terbilang(n % 10);
  if (n < 200) return "seratus " + _terbilang(n - 100);
  if (n < 1000) return _terbilang(Math.floor(n / 100)) + " ratus " + _terbilang(n % 100);
  if (n < 2000) return "seribu " + _terbilang(n - 1000);
  if (n < 1e6) return _terbilang(Math.floor(n / 1000)) + " ribu " + _terbilang(n % 1000);
  if (n < 1e9) return _terbilang(Math.floor(n / 1e6)) + " juta " + _terbilang(n % 1e6);
  if (n < 1e12) return _terbilang(Math.floor(n / 1e9)) + " miliar " + _terbilang(n % 1e9);
  return _terbilang(Math.floor(n / 1e12)) + " triliun " + _terbilang(n % 1e12);
}

export function terbilang(n) {
  const num = Math.floor(Number(n) || 0);
  if (num === 0) return "Nol Rupiah";
  const s = _terbilang(num).replace(/\s+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1) + " Rupiah";
}

export function verifyCode(seed) {
  let h = 5381;
  const s = String(seed || "draft");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}
