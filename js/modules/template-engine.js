import fakturA4 from "../templates/faktur-a4.js";
import kwitansiA4 from "../templates/kwitansi-a4.js";
import strukAnsuran from "../templates/struk-ansuran.js";
import invoiceDigital from "../templates/invoice-digital.js";
import { BUSINESS_TEMPLATES } from "../templates/business-templates.js";
import * as fmt from "./format.js";
import { totals } from "./invoice-engine.js";

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

export function renderDoc(state) {
  const tpl = getTemplate(state.template);
  const doc = document.getElementById("doc");
  doc.className = `doc doc-${tpl.output}` + (state.issued ? "" : " draft-watermark");
  doc.innerHTML = tpl.render(state, HELPERS);
  return tpl;
}

const HELPERS = {
  esc: fmt.esc,
  rupiah: fmt.rupiah,
  formatDate: fmt.formatDate,
  terbilang: fmt.terbilang,
  verifyCode: fmt.verifyCode,
  totals,
};
