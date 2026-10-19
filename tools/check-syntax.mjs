// Cek sintaks semua file JS runtime (ESM) tanpa mengeksekusi kode.
// Dipakai `npm run check:syntax` dan CI.
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set(["node_modules", ".git", ".vercel", "supabase", "docs", "PLAN-billing-kategori", "opendesign"]);

function collect(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collect(full, out);
    else if (name.endsWith(".js") || name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

const files = collect(ROOT, []).filter((f) => !f.includes("vendor-"));
let failed = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    failed += 1;
    process.stderr.write(`FAIL ${relative(ROOT, file)}\n`);
    const msg = (err.stderr?.toString() || err.message || "").trim();
    if (msg) process.stderr.write(msg.split("\n").slice(0, 6).join("\n") + "\n");
  }
}

console.log(`syntax check: ${files.length - failed}/${files.length} file OK`);
if (failed > 0) process.exit(1);
