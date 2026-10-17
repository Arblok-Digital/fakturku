import { nextNumber, getPrefix } from "./numbering.js";
import { getCategory } from "./template-engine.js";

const CURRENT = "fakturku:current";
const DRAFTS = "fakturku:drafts";

/* prefix lama (per template) — tetap dipakai untuk backward compat */
export const PREFIX = {
  "faktur-a4": "INV",
  "kwitansi-a4": "KW",
  "struk-ansuran": "STR",
  "invoice-digital": "DIG",
};

export function blankState(templateId, opts = {}) {
  const now = new Date();
  const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  const tpl = templateId || "faktur-a4";
  const cat = getCategory(tpl);
  return {
    template: tpl,
    category: cat,
    number: opts.keepNumber !== undefined ? opts.keepNumber : nextNumber(getPrefix(cat)),
    date: today,
    dueDate: "",
    notes: "",
    terms: "",
    details: {
      subject: "", reference: "", description: "", period: "", location: "", validity: "", paymentTerms: "", reason: "", status: "",
      origin: "", destination: "", driver: "", vehicle: "", condition: "", quantity: "", unit: "",
      contractRef: "", scope: "", effectiveDate: "", endDate: "", authority: "", witness: "",
      project: "", progress: "", contractValue: "", previousPaid: "", retention: "", milestone: "", inspection: "",
      employee: "", employeeId: "", position: "", department: "", baseSalary: "", allowances: "", deductions: "", netPay: "",
      taxPeriod: "", taxType: "", taxBase: "", taxAmount: "", taxId: "",
      requestedBy: "", approvedBy: "", deliveryDate: "", supplier: "", budget: "", recipientRole: "",
      returnReason: "", packing: "", invoiceRef: "", contractDate: "", invoicePeriod: "", bankRef: ""
    },

    logo: "",
    issuer: { name: "", address: "", npwp: "", phone: "", email: "" },
    client: { name: "", address: "", npwp: "", phone: "" },
    items: [{ desc: "", qty: 1, price: 0, unit: "" }],
    discount: 0,
    taxRate: 0,
    amount: 0,
    receivedFrom: "",
    forPayment: "",
    contractNo: "",
    installmentNo: "",
    customerName: "",
    principal: 0,
    interest: 0,
    fine: 0,
    installmentDue: "",
    remaining: 0,
    payment: { bank: "", accountNo: "", accountName: "", method: "" },
    signatures: {
      maker: { name: "", title: "" },
      receiver: { name: "", title: "" },
    },
    stamp: false,
    numbers: {},
    issued: false,
    savedAt: "",
  };
}

export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

export function totals(state) {
  const subtotal = (state.items || []).reduce(
    (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const discount = Number(state.discount) || 0;
  const base = Math.max(0, subtotal - discount);
  const tax = base * ((Number(state.taxRate) || 0) / 100);
  const total = base + tax;
  const installmentTotal =
    (Number(state.principal) || 0) + (Number(state.interest) || 0) + (Number(state.fine) || 0);
  return { subtotal, discount, tax, total, installmentTotal };
}

export function hydrate(raw) {
  if (!raw || typeof raw !== "object") return null;
  const d = blankState(raw.template || "faktur-a4", { keepNumber: raw.number || "" });
  const out = { ...d, ...raw };
  out.issuer = { ...d.issuer, ...(raw.issuer || {}) };
  out.client = { ...d.client, ...(raw.client || {}) };
  out.payment = { ...d.payment, ...(raw.payment || {}) };
  out.details = { ...d.details, ...(raw.details || {}) };
  out.signatures = {
    maker: { ...d.signatures.maker, ...((raw.signatures || {}).maker || {}) },
    receiver: { ...d.signatures.receiver, ...((raw.signatures || {}).receiver || {}) },
  };
  if (!Array.isArray(raw.items) || !raw.items.length) out.items = d.items;
  // F5: satuan per item opsional. Draft lama (tanpa `unit`) tetap valid — normalisasi di sini.
  out.items = (out.items || []).map((it) => ({ desc: "", qty: 1, price: 0, unit: "", ...it }));
  if (!out.template) out.template = d.template;
  return out;
}

export function saveCurrent(state) {
  state.savedAt = new Date().toISOString();
  try { localStorage.setItem(CURRENT, JSON.stringify(state)); }
  catch (e) { console.warn("autosave gagal (kuota penuh?)", e); }
}

export function loadCurrent() {
  try {
    const raw = localStorage.getItem(CURRENT);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return hydrate(s);
  } catch { return null; }
}

export function listDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFTS)) || []; }
  catch { return []; }
}

export function saveDraft(state, name) {
  const all = listDrafts();
  const rec = { id: "d" + Date.now(), name, data: JSON.parse(JSON.stringify(state)), at: new Date().toISOString() };
  all.unshift(rec);
  try { localStorage.setItem(DRAFTS, JSON.stringify(all.slice(0, 50))); }
  catch (e) { console.warn("simpan draft gagal", e); throw e; }
  return rec;
}

export function deleteDraft(id) {
  const all = listDrafts().filter((d) => d.id !== id);
  try { localStorage.setItem(DRAFTS, JSON.stringify(all)); }
  catch (e) { console.warn("hapus draft gagal", e); }
}

export function getDraft(id) {
  const rec = listDrafts().find((d) => d.id === id);
  if (!rec) return null;
  const data = hydrate(rec.data);
  return data ? { ...rec, data } : null;
}
