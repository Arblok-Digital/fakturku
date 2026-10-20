import fakturA4 from "../templates/faktur-a4.js";
import kwitansiA4 from "../templates/kwitansi-a4.js";
import strukAnsuran from "../templates/struk-ansuran.js";
import invoiceDigital from "../templates/invoice-digital.js";
import { BUSINESS_TEMPLATES } from "../templates/business-documents.js";

export const TEMPLATES = [fakturA4, kwitansiA4, strukAnsuran, invoiceDigital, ...BUSINESS_TEMPLATES];

/* kategori default per template (fallback kalau template gak punya field category) */
export const CATEGORY_MAP = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t.category || "finance"])
);

export function getCategory(templateId) {
  return CATEGORY_MAP[templateId] || "finance";
}

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

/* Harga efektif satu dokumen (Rp), sama dengan perhitungan server `issue_document`:
   kategori yang sudah dibuka = gratis · harga template (0 = gratis) · kalau tidak, harga kategori. */
export function effectiveDocPrice(templateId, categories, unlockedCategories) {
  const tpl = getTemplate(templateId);
  const cat = tpl.category || "finance";
  if ((unlockedCategories || []).includes(cat)) return 0;
  if (tpl.price_per_doc != null) return Number(tpl.price_per_doc) || 0;
  const meta = (categories || []).find((c) => c.id === cat);
  return Number(meta?.price_per_doc) || 0;
}

/* Label harga untuk picker: "Gratis" / "Rp2.500/dok". */
export function priceLabel(price) {
  const n = Number(price) || 0;
  if (n <= 0) return "Gratis";
  return "Rp" + n.toLocaleString("id-ID") + "/dok";
}

export function renderDoc(state) {
  const tpl = getTemplate(state.template);
  const doc = document.getElementById("doc");
  doc.className = `doc doc-${tpl.output}`;
  doc.innerHTML = tpl.render(state, HELPERS);
  return tpl;
}

/* Render dokumen tanpa menyentuh elemen #doc milik editor.
   Dipakai landing page supaya contoh di sana = output asli aplikasi. */
export function renderDocHtml(state) {
  const tpl = getTemplate(state.template);
  return { tpl, html: tpl.render(state, HELPERS) };
}

import * as fmt from "./format.js";
import { totals } from "./invoice-engine.js";

const HELPERS = {
  esc: fmt.esc,
  rupiah: fmt.rupiah,
  formatDate: fmt.formatDate,
  terbilang: fmt.terbilang,
  verifyCode: fmt.verifyCode,
  totals,
};
