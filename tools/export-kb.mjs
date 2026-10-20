// Gabungkan knowledge base jadi satu file (untuk paste ke LLM yang hanya menerima teks).
// Pakai: node tools/export-kb.mjs > fakturku-kb.md
import fs from "node:fs";
import path from "node:path";

const dir = "docs/marketing/knowledge-base";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();

const parts = [
  "# FakturKu — Knowledge Base (versi gabungan)",
  "",
  "Materi sumber untuk generate naskah iklan FakturKu. Gunakan hanya fakta di bawah; jangan mengarang",
  "angka, fitur, atau nama pengguna. Jangan menulis klaim resmi/otomatis/pajak. Selalu tutup dengan 1 CTA.",
  "",
];

for (const f of files) {
  const body = fs.readFileSync(path.join(dir, f), "utf8").trim();
  parts.push("---", "", body, "");
}

const out = parts.join("\n");
const target = path.join("docs", "marketing", "fakturku-knowledge-base.md");
fs.writeFileSync(target, out, "utf8");
console.log(`digabung: ${files.length} file -> ${target} (${out.length} karakter)`);
