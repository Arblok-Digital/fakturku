/**
 * check-render-coverage.mjs — alat cek otomatis: "apakah format bisa render 100%?"
 *
 * Tujuan: tidak perlu mengecek satu template satu per satu secara manual.
 * Alat ini meniru editor+Contoh: setiap field yang TERLIHAT (sesuai aturan di
 * js/modules/editor-fields.js) diisi nilai sentinel unik, lalu dokumen dirender
 * dan diperiksa apakah nilai itu benar-benar muncul di hasil render.
 *
 * Jalankan di root repo:  node tools/check-render-coverage.mjs
 * Exit code 1 bila ada field yang tidak muncul.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let captured = "";
globalThis.document = {
  getElementById() {
    return { className: "", set innerHTML(v) { captured = String(v); }, get innerHTML() { return captured; } };
  },
};

const te = await import(pathToFileURL(path.join(root, "js", "modules", "template-engine.js")).href);
const ie = await import(pathToFileURL(path.join(root, "js", "modules", "invoice-engine.js")).href);
const ef = await import(pathToFileURL(path.join(root, "js", "modules", "editor-fields.js")).href);
const { TEMPLATES, renderDoc } = te;
const { blankState, setPath } = ie;
const { fieldUsed, printableDetails, printsTotals } = ef;

const textSentinel = (i) => "Q" + (100 + i) + "Q";
const numSentinel = (i) => 900000 + i;
const dateSentinel = (i) => 2030 + i + "-01-01";
const digitsOnly = (s) => String(s).replace(/\D+/g, "");

/* ---------- peta field editor per seksi, dengan gate terdekat (section / field) ---------- */
function parseEditorSections() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const chunks = html.split('<div class="fsec"').slice(1);
  return chunks.map((chunk) => {
    const attrs = chunk.slice(0, chunk.indexOf(">"));
    const sectionWhen = (attrs.match(/data-when="([^"]+)"/) || [])[1] || null;
    const fields = [];
    // mini HTML-walker untuk menangkap data-when pada pembungkus field (mis. dueDate).
    const VOID = new Set(["input", "img", "br", "hr", "meta", "link", "source", "area", "base", "col", "embed", "param", "track", "wbr"]);
    const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
    const stack = [];
    let m;
    while ((m = re.exec(chunk))) {
      const closing = m[1] === "/";
      const tag = m[2].toLowerCase();
      const attrs2 = m[3];
      if (closing) {
        for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
        continue;
      }
      const bind = (attrs2.match(/data-bind="([^"]+)"/) || [])[1];
      const type = (attrs2.match(/type="([^"]+)"/) || [])[1] || (tag === "textarea" ? "textarea" : tag === "select" ? "select" : "text");
      if (bind && (tag === "input" || tag === "textarea" || tag === "select")) {
        let gate = (attrs2.match(/data-when="([^"]+)"/) || [])[1] || null;
        for (let i = stack.length - 1; i >= 0 && !gate; i--) gate = stack[i].when;
        if (!gate) gate = sectionWhen;
        const readOnly = /\breadonly\b/.test(attrs2);
        fields.push({ bind, type, gate, readOnly });
      }
      const when = (attrs2.match(/data-when="([^"]+)"/) || [])[1] || null;
      if (!VOID.has(tag)) {
        stack.push({ tag, when });
        if (/\/\s*$/.test(attrs2)) stack.pop();
      }
    }
    return { sectionWhen, fields };
  });
}

const sections = parseEditorSections();
const itemModeOf = (t) => t.itemMode || (t.hidePrices ? "qty" : "priced");

const report = [];
for (const t of TEMPLATES) {
  const uses = t.uses || [];
  const visible = [];
  for (const sec of sections) {
    if (sec.sectionWhen && !uses.includes(sec.sectionWhen)) continue;
    for (const f of sec.fields) {
      if (f.readOnly) continue;
      if (f.gate && !uses.includes(f.gate)) continue;
      if (!fieldUsed(t, f.bind)) continue;
      visible.push(f);
    }
  }

  const state = blankState(t.id, { keepNumber: "NRCOVERAGE" });
  const marks = [];
  let ti = 0, ni = 0, di = 0;
  for (const f of visible) {
    if (f.type === "checkbox") {
      setPath(state, f.bind, true);
      marks.push({ bind: f.bind, ok: (html) => html.includes("METERAI") });
      continue;
    }
    if (f.type === "number") {
      const n = numSentinel(ni++);
      setPath(state, f.bind, n);
      marks.push({ bind: f.bind, ok: (html) => digitsOnly(html).includes(String(n)) });
      continue;
    }
    if (f.type === "date") {
      const d = dateSentinel(di++);
      setPath(state, f.bind, d);
      marks.push({ bind: f.bind, ok: (html) => digitsOnly(html).includes(String(d.slice(0, 4))) });
      continue;
    }
    const token = textSentinel(ti++);
    setPath(state, f.bind, token);
    marks.push({ bind: f.bind, ok: (html) => html.includes(token) });
  }

  if (uses.includes("items")) {
    const qty = numSentinel(800), price = numSentinel(801), desc = "QITM1Q", unit = "QUNITQ";
    state.items = [{ desc, qty, price, unit }];
    const mode = itemModeOf(t);
    marks.push({ bind: "items[].desc", ok: (h) => h.includes(desc) });
    if (mode !== "qty") marks.push({ bind: "items[].unit", ok: (h) => h.includes(unit) });
    if (mode === "qty" || mode === "priced") marks.push({ bind: "items[].qty", ok: (h) => digitsOnly(h).includes(String(qty)) });
    if (mode === "pricelist" || mode === "priced") marks.push({ bind: "items[].price", ok: (h) => digitsOnly(h).includes(String(price)) });
  } else {
    state.items = [];
  }

  renderDoc(state);
  const html = captured;
  const failed = marks.filter((m) => !m.ok(html)).map((m) => m.bind);
  report.push({ t, failed, total: marks.length });
}

/* ---------- output ---------- */
const totalFail = report.reduce((n, r) => n + r.failed.length, 0);
console.log("=== Cek kelengkapan render: " + report.length + " template ===");
for (const r of report) {
  if (!r.failed.length) continue;
  console.log("\n" + r.t.id + "  [" + (r.t.uses || []).join(", ") + "]");
  console.log("  TIDAK MUNCUL (" + r.failed.length + "): " + r.failed.join(", "));
}
console.log("\n=== RINGKASAN ===");
console.log("template diperiksa : " + report.length);
console.log("field gagal        : " + totalFail);
console.log("template bersih    : " + report.filter((r) => !r.failed.length).length + " / " + report.length);
if (totalFail) {
  console.log("\nGAGAL: ada field yang tidak muncul di hasil render (lihat daftar di atas).");
  process.exit(1);
}
console.log("\nOK: semua field yang terlihat di editor muncul di hasil render.");
