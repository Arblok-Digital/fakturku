import { TEMPLATES, getTemplate, renderDoc, getCategory, effectiveDocPrice, priceLabel } from "./modules/template-engine.js";
import {
  blankState, getPath, setPath, totals, saveCurrent, loadCurrent,
  listDrafts, saveDraft, deleteDraft, getDraft, PREFIX,
} from "./modules/invoice-engine.js";
import { terbilang, rupiah, formatDate, esc } from "./modules/format.js";
import { nextNumber, getPrefix, nextNumberByCategory } from "./modules/numbering.js";
import { printDoc, downloadImage, openWhatsApp } from "./modules/output.js";
import { fieldUsed, printsTotals } from "./modules/editor-fields.js";
import * as ledger from "./modules/credit-ledger.js";
import * as backend from "./modules/backend.js";

/* Deteksi tautan recovery HARUS dilakukan sebelum supabase-js memproses URL hash.
   Event PASSWORD_RECOVERY bisa terlewat bila listener dipasang setelah client init. */
const bootHash = String(location.hash || "");
const bootRecovery = /(?:^|[#&])type=recovery(?:&|$)/.test(bootHash);
const bootAuthError = (() => {
  const m = bootHash.match(/(?:^|[#&])error_description=([^&]*)/);
  if (!m) return "";
  try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch { return ""; }
})();
let recoveryPending = bootRecovery;

const storedState = loadCurrent();
const hasStoredState = Boolean(storedState);
let state = storedState || blankState("faktur-a4");
let sampleDraftMode = false;
let sampleDraftPristine = false;
let renderTimer = null;
let numberReservationPromise = Promise.resolve(true);
let numberReservationFor = null;


/* remote billing cache (Supabase) */
const remote = { session: null, credits: null, trialCredits: null, balance: null, history: [], pending: null, packages: [] };

/* category cache */
let categoriesCache = [];
/* kategori yang sudah dibuka user (sekali bayar) — harga dokumen di kategori ini jadi Gratis */
let unlockedCategories = [];

const $ = (sel) => document.querySelector(sel);
const editor = $("#editor");
const docEl = $("#doc");

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

/* ---------- render ---------- */
function render() {
  const tpl = renderDoc(state);
  const sampleBanner = $("#sample-editor-banner");
  if (sampleBanner) sampleBanner.hidden = !sampleDraftMode;
  /* Penanda draft dipindah ke luar dokumen: banner di atas preview.
     Dokumen tetap bersih supaya tidak ada tulisan menimpa isi (dan aman
     kalau nanti ada fitur tangkap layar / share gambar). */
  const draftBanner = $("#draft-banner");
  if (draftBanner) draftBanner.hidden = state.issued || sampleDraftMode;
  applySections(tpl);
  syncBoundInputs();
  const cat = state.category || getCategory(state.template);
  const catMeta = categoriesCache.find((c) => c.id === cat);
  const catLabel = catMeta ? `${catMeta.icon} ${catMeta.label}` : cat;
  $("#out-hint").textContent =
    `${tpl.label} · ${catLabel} · ${state.issued ? "TERBIT" : "DRAFT"}`;
  const terb = $("#terbilang-preview");
  if (terb) terb.textContent = terbilang(Number(state.amount) || 0);
  updateKuota();
  fitPreview();
}

function updateKuota() {
  const el = $("#kuota");
  if (backend.isRemote() && remote.trialCredits === null) {
    el.textContent = "T— · Saldo —";
    el.title = "Saldo dan kuota belum tersinkron";
    el.classList.remove("empty");
    return;
  }
  if (backend.isRemote()) {
    const trial = Number(remote.trialCredits) || 0;
    const balance = Number(remote.balance) || 0;
    el.textContent = `T${trial} · ${rupiah(balance)}`;
    el.title = `Trial tersisa: ${trial} dokumen. Saldo: ${rupiah(balance)}`;
    el.classList.toggle("empty", trial <= 0 && balance <= 0);
    return;
  }
  const b = ledger.billingState();
  el.textContent = `T${b.trialCredits} · ${rupiah(b.balance)}`;
  el.title = `Trial tersisa: ${b.trialCredits} dokumen. Saldo: ${rupiah(b.balance)}`;
  el.classList.toggle("empty", b.trialCredits <= 0 && b.balance <= 0);
}

function reserveServerNumberForCurrentState() {
  if (!backend.isRemote() || !remote.session) return Promise.resolve(true);
  const targetState = state;
  const targetTemplate = state.template;
  const targetCategory = state.category || getCategory(state.template);
  numberReservationFor = targetState;
  const task = backend.nextDocumentNumber(targetCategory).then((number) => {
    if (state === targetState && state.template === targetTemplate && !state.issued) {
      state.number = number;
      state.numbers = state.numbers || {};
      state.numbers[targetTemplate] = number;
      state._serverNumberRequired = false;
      render();
      saveCurrent(state);
    }
    return true;
  }).catch((err) => {
    console.warn("reservasi nomor dokumen gagal", err);
    toast("Nomor dokumen belum berhasil dibuat di server. Coba lagi.");
    return false;
  });
  numberReservationPromise = task;
  return task;
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => { render(); saveCurrent(state); scheduleCloudSync(); }, 120);
}

let syncTimer = null;
function scheduleCloudSync() {
  if (!backend.isRemote() || !remote.session || state.issued || state._serverNumberRequired) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    backend.saveInvoice(state).catch((err) => {
      console.warn("sinkronisasi draft ke cloud gagal", err);
      toast("Draft belum tersinkron ke cloud. Periksa koneksi.");
    });
  }, 1200);
}

function applySections(tpl) {
  document.querySelectorAll("[data-when]").forEach((el) => {
    el.hidden = !(tpl.uses || []).includes(el.dataset.when);
  });
  /* Hanya tampilkan field yang benar-benar dipakai template terpilih, supaya apa yang
     terlihat/diisi di editor selalu muncul di dokumen (lihat js/modules/editor-fields.js). */
  editor.querySelectorAll("[data-bind]").forEach((el) => {
    const wrap = el.closest(".field") || el.closest(".check") || el;
    const gate = wrap.dataset.when;
    wrap.hidden = gate ? !(tpl.uses || []).includes(gate) : !fieldUsed(tpl, el.dataset.bind);
  });
}

function syncBoundInputs() {
  editor.querySelectorAll("[data-bind]").forEach((el) => {
    const v = getPath(state, el.dataset.bind);
    if (el.type === "checkbox") el.checked = !!v;
    else if (document.activeElement !== el) el.value = v ?? "";
  });
}

/* ---------- bindings ---------- */
editor.addEventListener("input", (e) => {
  if (sampleDraftMode) sampleDraftPristine = false;
  const el = e.target;
  if (el.dataset.bind) {
    let v;
    if (el.type === "checkbox") v = el.checked;
    else if (el.type === "number") v = el.value === "" ? 0 : Number(el.value);
    else v = el.value;
    setPath(state, el.dataset.bind, v);
    scheduleRender();
  }
});

$("#f-logo").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 400 * 1024) { toast("Logo maksimal 400KB"); return; }
  const fr = new FileReader();
  fr.onload = () => { state.logo = fr.result; scheduleRender(); };
  fr.readAsDataURL(file);
});

/* ---------- items table ---------- */
function renderItems() {
  const body = $("#items-body");
  body.innerHTML = state.items.map((it, i) => `
    <article class="item-card" data-item-card="${i}">
      <div class="item-card-head">
        <span class="item-card-title">Transaksi ${i + 1}</span>
        <button class="del" type="button" data-del="${i}" aria-label="Hapus transaksi ${i + 1}" title="Hapus transaksi">&times;</button>
      </div>
      <div class="field item-desc-field">
        <label for="item-desc-${i}">Uraian transaksi</label>
        <input id="item-desc-${i}" type="text" data-idx="${i}" data-f="desc" value="${(it.desc || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}" placeholder="Contoh: Jasa desain, pembelian barang">
      </div>
      <div class="item-card-grid">
        <div class="field">
          <label for="item-qty-${i}">Qty</label>
          <input id="item-qty-${i}" class="num" type="number" min="0" data-idx="${i}" data-f="qty" value="${Number(it.qty) || 0}">
        </div>
        <div class="field">
          <label for="item-unit-${i}">Satuan</label>
          <input id="item-unit-${i}" type="text" data-idx="${i}" data-f="unit" value="${esc(it.unit || "")}" placeholder="pcs, kg, hari">
        </div>
        <div class="field">
          <label for="item-price-${i}">Harga satuan (Rp)</label>
          <input id="item-price-${i}" class="num" type="number" min="0" data-idx="${i}" data-f="price" value="${Number(it.price) || 0}">
        </div>
      </div>
      <div class="item-line-total">
        <span>Jumlah transaksi</span>
        <strong>${rupiah((Number(it.qty) || 0) * (Number(it.price) || 0))}</strong>
      </div>
    </article>`).join("");
  const t = totals(state);
  $("#items-sum").textContent = "Subtotal: " + rupiah(t.subtotal);
}

$("#items-body").addEventListener("input", (e) => {
  if (sampleDraftMode) sampleDraftPristine = false;
  const el = e.target;
  if (!el.dataset.f) return;
  const i = Number(el.dataset.idx);
  state.items[i][el.dataset.f] = el.type === "number" ? (el.value === "" ? 0 : Number(el.value)) : el.value;
  const row = el.closest(".item-card");
  row.querySelector(".item-line-total strong").textContent = rupiah((Number(state.items[i].qty) || 0) * (Number(state.items[i].price) || 0));
  $("#items-sum").textContent = "Subtotal: " + rupiah(totals(state).subtotal);
  scheduleRender();
});

$("#items-body").addEventListener("click", (e) => {
  const del = e.target.dataset && e.target.dataset.del;
  if (del == null) return;
  state.items.splice(Number(del), 1);
  if (!state.items.length) state.items.push({ desc: "", qty: 1, price: 0, unit: "" });
  renderItems();
  scheduleRender();
});

$("#btn-add-item").addEventListener("click", () => {
  state.items.push({ desc: "", qty: 1, price: 0, unit: "" });
  renderItems();
  scheduleRender();
  const rows = $("#items-body").querySelectorAll("input[data-f='desc']");
  rows[rows.length - 1].focus();
});

/* ---------- compact template picker ---------- */
let activeFilter = "all";

/* F10: urutan tampil kategori di picker (display-only, tidak mengubah data/DB).
   DB (get_categories) tetap sumber kebenaran; ini hanya prioritas tampil,
   menaruh kebutuhan UMKM/logistik/proyek lebih dulu. */
const CATEGORY_DISPLAY_ORDER = ["umkm", "logistik", "proyek", "finance", "legal", "operasional", "pajak"];
function orderCategoriesForDisplay(list) {
  return list.slice().sort((a, b) => {
    const ia = CATEGORY_DISPLAY_ORDER.indexOf(a.id);
    const ib = CATEGORY_DISPLAY_ORDER.indexOf(b.id);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
}

function renderTemplatePicker() {
  const filterEl = $("#tpl-filter");
  const gridEl = $("#tpl-grid");
  const cats = orderCategoriesForDisplay(categoriesCache.length ? categoriesCache : [
    { id: "finance", label: "Finance", icon: "💰" },
    { id: "legal", label: "Legal", icon: "⚖️" },
    { id: "umkm", label: "UMKM", icon: "🏪" },
    { id: "logistik", label: "Logistik", icon: "📦" },
    { id: "pajak", label: "Pajak", icon: "🧾" },
    { id: "proyek", label: "Proyek", icon: "🏗️" },
    { id: "operasional", label: "Operasional", icon: "📋" },
  ]);
  const filterCats = [{ id: "all", label: "Semua kategori", icon: "" }, ...cats.filter((c) => c.active !== false)];
  if (!filterCats.some((c) => c.id === activeFilter)) activeFilter = "all";
  filterEl.innerHTML = filterCats.map((c) =>
    `<option value="${esc(c.id)}" ${activeFilter === c.id ? "selected" : ""}>${esc((c.icon ? c.icon + " " : "") + c.label)}</option>`
  ).join("");

  let visible = TEMPLATES.filter((t) => {
    const cat = t.category || "finance";
    return activeFilter === "all" || cat === activeFilter;
  });
  gridEl.innerHTML = visible.length ? visible.map((t) => {
    const price = effectiveDocPrice(t.id, categoriesCache, unlockedCategories);
    return `<option value="${esc(t.id)}" ${state.template === t.id ? "selected" : ""}>${esc(t.label)} — ${priceLabel(price)}</option>`;
  }).join("") : `<option value="" selected disabled>Format belum tersedia di kategori ini</option>`;
  if (visible.some((t) => t.id === state.template)) gridEl.value = state.template;
}

$("#tpl-filter").addEventListener("change", (e) => {
  activeFilter = e.target.value || "all";
  const visible = TEMPLATES.filter((t) => activeFilter === "all" || (t.category || "finance") === activeFilter);
  if (visible.length && !visible.some((t) => t.id === state.template)) {
    switchTemplate(visible[0].id);
    return;
  }
  // Keep the chosen category visible even when its template has not been implemented yet.
  renderTemplatePicker();
});

$("#tpl-grid").addEventListener("change", (e) => {
  const newId = e.target.value;
  if (newId && newId !== state.template) switchTemplate(newId);
});

function switchTemplate(newId) {
  if (!state.numbers) state.numbers = {};
  state.numbers[state.template] = state.number;
  state.template = newId;
  state.category = getCategory(newId);
  if (state.numbers[newId]) {
    state.number = state.numbers[newId];
  } else {
    state.number = nextNumberByCategory(state.category);
    state.numbers[newId] = state.number;
  }

  // F7 (Fase 3): klausul bawaan template legal hanya diisi bila pengguna belum menulis apa pun.
  // Teks bawaan adalah contoh yang wajib ditinjau pengguna; bukan nasihat hukum.
  if (!state.terms) {
    const tplDef = getTemplate(newId);
    if (tplDef && tplDef.defaultTerms) state.terms = tplDef.defaultTerms;
  }

  // Saat memakai data contoh, bangun ulang sampel sesuai format yang dipilih.
  // Field khusus kuitansi, struk, dan dokumen bisnis ikut disesuaikan.
  if (sampleDraftMode && sampleDraftPristine) {
    state = buildExampleState(false);
    state.category = getCategory(newId);
  }

  if (backend.isRemote() && !state.issued) {
    state._serverNumberRequired = true;
  }
  renderTemplatePicker();
  renderItems();
  render();
  saveCurrent(state);
  if (backend.isRemote() && remote.session && state._serverNumberRequired) {
    reserveServerNumberForCurrentState();
  }
}

/* ---------- drafts ---------- */
const secDrafts = $("#sec-drafts");
$("#sec-drafts h3").insertAdjacentHTML("afterend", `
  <div class="field" style="flex-direction:row;gap:6px">
    <input id="draft-name" type="text" placeholder="Nama draft (mis. Faktur Pak Budi)" style="flex:1">
    <button class="btn" type="button" id="btn-save-draft">Simpan</button>
  </div>`);

function renderDrafts() {
  const all = listDrafts();
  const badge = $("#drafts-count");
  if (badge) {
    badge.textContent = all.length || "";
    badge.hidden = all.length === 0;
  }
  $("#draft-list").innerHTML = all.length
    ? all.map((d) => `
      <div class="draft-row">
        <span class="nm">${esc(d.name)}</span>
        <span class="mono">${formatDate(d.at.slice(0, 10))}</span>
        <button type="button" data-load="${d.id}">Muat</button>
        <button type="button" class="rm" data-rm="${d.id}">Hapus</button>
      </div>`).join("")
    : `<div class="hint-line">Belum ada draft tersimpan.</div>`;
}

$("#btn-drafts").addEventListener("click", () => {
  secDrafts.hidden = !secDrafts.hidden;
  if (!secDrafts.hidden) { renderDrafts(); editor.scrollTop = 0; }
});

$("#btn-save-draft").addEventListener("click", () => {
  const name = ($("#draft-name").value || "").trim() || state.number;
  try {
    saveDraft(state, name);
    $("#draft-name").value = "";
    renderDrafts();
    toast("Draft tersimpan: " + name);
  } catch {
    toast("Gagal simpan â€” penyimpanan device penuh. Hapus draft lama.");
  }
});

$("#draft-list").addEventListener("click", (e) => {
  const ld = e.target.dataset && e.target.dataset.load;
  const rm = e.target.dataset && e.target.dataset.rm;
  if (ld) {
    const rec = getDraft(ld);
    if (rec) {
      state = rec.data;
      state.category = state.category || getCategory(state.template);
      renderTemplatePicker();
      renderItems(); render();
      saveCurrent(state);
      toast("Draft dimuat: " + rec.name);
    }
  } else if (rm) {
    deleteDraft(rm);
    renderDrafts();
  }
});

/* ---------- new doc ---------- */
function newDoc() {
  if (!confirm("Buat dokumen baru? Dokumen sekarang tetap tersimpan sebagai draft terakhir.")) return;
  saveCurrent(state);
  sampleDraftMode = false;
  sampleDraftPristine = false;
  state = blankState(state.template);
  renderTemplatePicker();
  renderItems(); render();
  saveCurrent(state);
  if (backend.isRemote()) {
    state._serverNumberRequired = true;
    if (remote.session) reserveServerNumberForCurrentState();
  }
  toast("Dokumen baru dibuat");
}
$("#btn-new").addEventListener("click", newDoc);
$("#btn-fill-sample").addEventListener("click", () => {
  state = buildExampleState(false);
  sampleDraftMode = true;
  sampleDraftPristine = true;
  renderTemplatePicker();
  renderItems();
  render();
  saveCurrent(state);
  toast("Data contoh untuk " + getTemplate(state.template).label + " sudah dimuat");
});
$("#btn-clear-sample").addEventListener("click", () => {
  if (!confirm("Kosongkan semua data contoh dan mulai dokumen dari nol?")) return;
  sampleDraftMode = false;
  sampleDraftPristine = false;
  state = blankState(state.template);
  renderTemplatePicker();
  renderItems();
  render();
  saveCurrent(state);
  if (backend.isRemote()) {
    state._serverNumberRequired = true;
    if (remote.session) reserveServerNumberForCurrentState();
  }
  toast("Dokumen kosong siap diisi");
});
$("#btn-new-fab").addEventListener("click", newDoc);

/* ---------- output & billing ---------- */
async function markIssued() {
  if (state.issued) return true;
  const category = state.category || getCategory(state.template);
  if (backend.isRemote()) {
    if (!remote.session) { openAuth(); return false; }
    if (state._serverNumberRequired) {
      let reserved = numberReservationFor === state
        ? await numberReservationPromise
        : false;
      if (!reserved || state._serverNumberRequired) {
        reserved = await reserveServerNumberForCurrentState();
      }
      if (!reserved || state._serverNumberRequired) return false;
    }
    let ok = false;
    const docPrice = effectiveDocPrice(state.template, categoriesCache, unlockedCategories);
    try { ok = await backend.tryDebit(state.number, category, state.template, state, docPrice); }
    catch { toast("Server tidak terhubung - coba lagi."); return false; }
    if (!ok) { openTopUp(); return false; }
    await refreshRemoteBilling();
    state.issued = true;
    saveCurrent(state);
    backend.saveInvoice(state).catch(() => {});
    render();
    return true;
  }
  const localPrice = effectiveDocPrice(state.template, categoriesCache, unlockedCategories);
  if (!ledger.tryDebit(state.number, category, localPrice)) { openTopUp(); return false; }
  state.issued = true;
  saveCurrent(state);
  render();
  return true;
}

window.addEventListener("afterprint", () => {
  if (state.issued) return;
  markIssued();
});

/* fit preview on small screens (print resets this via CSS) */
function fitPreview() {
  const stage = $("#stage");
  if (window.innerWidth > 900) {
    docEl.style.transform = "";
    docEl.style.marginBottom = "";
    return;
  }
  const cs = getComputedStyle(stage);
  const avail = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const scale = Math.min(1, avail / docEl.offsetWidth);
  if (scale < 0.999) {
    docEl.style.transformOrigin = "top left";
    docEl.style.transform = `scale(${scale})`;
    docEl.style.marginBottom = `${-(1 - scale) * docEl.offsetHeight}px`;
  } else {
    docEl.style.transform = "";
    docEl.style.marginBottom = "";
  }
}
window.addEventListener("resize", fitPreview);

function buildSummary() {
  const t = totals(state);
  const lines = [
    `${state.issuer.name || "â€”"} â€” ${getTemplate(state.template).label}`,
    `No: ${state.number}`,
    `Tanggal: ${formatDate(state.date)}`,
  ];
  if (state.client.name) lines.push(`Kepada: ${state.client.name}`);
  if (state.receivedFrom) lines.push(`Terima dari: ${state.receivedFrom}`);
  if (state.forPayment) lines.push(`Untuk: ${state.forPayment}`);
  if (state.contractNo) lines.push(`Kontrak: ${state.contractNo} (angsuran ke-${state.installmentNo})`);
  state.items.filter((i) => i.desc).forEach((i) =>
    lines.push(`â€¢ ${i.desc} x${i.qty} = ${rupiah((Number(i.qty) || 0) * (Number(i.price) || 0))}`));
  if (state.template === "struk-ansuran") lines.push(`Total: ${rupiah(t.installmentTotal)}`);
  else lines.push(`Total: ${rupiah(t.total)}`);
  if (state.amount) lines.push(`Jumlah: ${rupiah(state.amount)}`);
  return lines.join("\n");
}

$("#btn-print").addEventListener("click", async () => {
  if (!(await markIssued())) return;
  const tpl = getTemplate(state.template);
  printDoc(tpl.output === "thermal" ? "thermal" : "a4");
});

const safeName = (n) => String(n || "dokumen").replace(/[^\w-]+/g, "_");

$("#btn-save-as").addEventListener("click", async () => {
  if (!(await markIssued())) return;
  try {
    toast("Menyiapkan file JPEG…");
    await downloadImage(docEl, `fakturku-${safeName(state.number)}.jpg`);
    toast("Dokumen disimpan sebagai JPEG");
  } catch {
    toast("Gagal menyimpan file. Coba Print.");
  }
});

$("#btn-wa").addEventListener("click", async () => {
  if (!(await markIssued())) return;
  openWhatsApp(buildSummary());
  toast("WhatsApp dibuka dengan rincian dokumen. Lampirkan file jika diperlukan.");
});

/* ---------- top-up modal ---------- */
const modal = $("#topup-modal");

function showPackages() {
  const packages = backend.isRemote()
    ? remote.packages
    : ledger.PACKAGES.map((p) => ({ ...p, credits: 0 }));
  $("#pkg-list").innerHTML = (packages || []).map((p) =>
    `<button class="pkg" type="button" data-pkg="${esc(p.id)}">
       <span class="c">${esc(p.label || (p.credits + " dokumen"))}</span>
       <span class="p">${rupiah(p.balance_amount ?? p.price)}</span>
     </button>`).join("");
  if (!packages?.length) $("#pkg-list").innerHTML = '<p class="modal-sub">Paket belum tersedia. Coba lagi sebentar.</p>';
  $("#topup-packages").hidden = false;
  $("#topup-pending").hidden = true;
}

function showPending(rec) {
  $("#req-id").textContent = rec.id;
  $("#req-price").textContent = rupiah(rec.price);
  $("#req-credits").textContent = rupiah(rec.balance_amount ?? rec.price ?? 0);
  $("#req-contact").innerHTML = `<span style="display:inline-flex;align-items:center;gap:9px;flex-wrap:wrap"><svg role="img" aria-label="DANA" viewBox="0 0 64 36" width="52" height="30" xmlns="http://www.w3.org/2000/svg" style="display:block;flex:none"><rect width="64" height="36" rx="8" fill="#118EEA"/><text x="32" y="23" font-family="Arial,sans-serif" font-size="15" font-weight="700" text-anchor="middle" fill="#fff">DANA</text></svg><strong style="font-size:14px;letter-spacing:.02em">${esc(ledger.CONTACT)}</strong></span>`;
  const rm = backend.isRemote();
  $("#topup-local").hidden = rm;
  const status = rm ? (rec.status || "pending") : "pending";
  $("#btn-cancel-topup").hidden = !rm || status === "approved";
  $("#btn-cancel-topup").textContent = status === "rejected" ? "Pilih paket lain" : "Batalkan Permintaan";
  $("#req-wait").hidden = !rm;
  if (rm) {
    $("#req-wait").textContent =
      status === "approved" ? "Pembayaran disetujui admin. Cek saldo di bagian atas; jika belum berubah, buka ulang panel sebentar lagi."
      : status === "rejected" ? "Permintaan top-up ditolak admin. Kamu bisa memilih paket lain untuk membuat permintaan baru."
      : "Menunggu persetujuan admin — saldo diproses setelah disetujui. Transfer sesuai nominal dulu ya.";
  }
  $("#topup-packages").hidden = true;
  $("#topup-pending").hidden = false;
}

function renderBillingHistory(list) {
  const hist = (list || ledger.requestHistory()).slice().reverse().slice(0, 20);
  const MONETARY = ["topup", "issue", "unlock_category", "unlock_all"];
  $("#hist-list").innerHTML = hist.length
    ? hist.map((h) => {
        const monetary = MONETARY.includes(h.reason);
        const free = h.reason === "free_issue" || h.reason === "unlock_issue";
        const plus = h.amount > 0;
        const label = h.ref === "TRIAL" || h.reason === "trial" ? "Trial gratis"
          : h.reason === "topup" ? "Top-up saldo"
          : free ? "Dokumen gratis"
          : h.reason === "unlock_category" ? "Buka kategori"
          : h.reason === "unlock_all" ? "Buka semua kategori"
          : h.reason === "issue" ? "Biaya dokumen"
          : plus ? "Saldo masuk" : "Ekspor dokumen";
        const amountLabel = free ? "Gratis"
          : monetary ? rupiah(Math.abs(h.amount))
          : `${Math.abs(h.amount)} dokumen`;
        const d = new Date(h.at);
        const when = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) + " " +
          d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        const catMeta = h.category ? categoriesCache.find((c) => c.id === h.category) : null;
        const catBadge = catMeta
          ? `<span class="cat-badge-mini" style="background:${catMeta.color}22;color:${catMeta.color}">${catMeta.icon} ${esc(catMeta.label)}</span>`
          : "";
        return `<div class="hist-row">
          <span class="lbl">${label}${catBadge}${h.ref && h.ref !== "TRIAL" ? `<span class="sub">${esc(h.ref)} · ${when}</span>` : `<span class="sub">${when}</span>`}</span>
          <span class="amt ${plus ? "plus" : free ? "" : "minus"}">${plus ? "+" : ""}${amountLabel}</span>
          <span class="sisa">${free || h.sisa == null ? "" : (monetary ? "saldo " + rupiah(h.sisa) : "sisa " + h.sisa)}</span>
        </div>`;
      }).join("")
    : `<div class="hist-empty">Belum ada transaksi.</div>`;
}

function renderCatPrices() {
  const list = $("#cat-price-list");
  if (!list) return;
  if (!categoriesCache.length) {
    list.innerHTML = `<div class="hint-line">Memuat harga kategori…</div>`;
    return;
  }
  list.innerHTML = categoriesCache.filter((c) => c.active !== false).map((c) =>
    `<div class="cat-price-row">
      <span class="cat-badge" style="background:${c.color}22;color:${c.color}">${c.icon} ${esc(c.label)}</span>
      <span class="cat-price mono">${rupiah(c.price_per_doc)}/dok</span>
    </div>`
  ).join("") + `<div class="hint-line">Nota kontan, kwitansi, struk POS, dan invoice digital selalu <b>Gratis</b>.</div>`;
}

/* Buka kategori sekali bayar — harga dari DB (get_categories.unlock_price). */
function renderCatUnlocks() {
  const wrap = $("#cat-unlocks");
  const list = $("#cat-unlock-list");
  if (!wrap || !list) return;
  const unlockable = categoriesCache.filter((c) => c.active !== false && Number(c.unlock_price) > 0);
  if (!unlockable.length) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const remaining = unlockable.filter((c) => !unlockedCategories.includes(c.id));
  const rows = unlockable.map((c) => {
    const open = unlockedCategories.includes(c.id);
    return `<div class="cat-price-row">
      <span class="cat-badge" style="background:${c.color}22;color:${c.color}">${c.icon} ${esc(c.label)}</span>
      ${open
        ? `<span class="cat-price mono">Terbuka · Gratis</span>`
        : `<button class="btn" type="button" data-unlock="${esc(c.id)}">Buka · ${rupiah(c.unlock_price)}</button>`}
    </div>`;
  }).join("");
  const bundle = remaining.length > 1
    ? `<button class="btn" type="button" data-unlock-all="1">Buka semua kategori · ${rupiah(ledger.UNLOCK_ALL_PRICE)}</button>`
    : "";
  list.innerHTML = rows + bundle;
}

async function openTopUp() {
  if (backend.isRemote()) {
    await refreshRemoteBilling();
    try { remote.packages = await backend.getPackages(true); }
    catch (e) { console.warn("paket top-up gagal dimuat", e); remote.packages = []; }
  }
  /* load categories (cache) */
  if (!categoriesCache.length) {
    try { categoriesCache = await backend.getCategories(); } catch { /* ignore */ }
  }
  renderCatPrices();
  try { unlockedCategories = await backend.getMyUnlocks(); } catch { /* pakai cache */ }
  renderCatUnlocks();
  if (backend.isRemote()) {
    $("#q-status").innerHTML = `Trial tersisa: <b id="q-n">${Number(remote.trialCredits) || 0}</b> · Saldo: <b>${rupiah(Number(remote.balance) || 0)}</b>`;
    $("#q-status").classList.toggle("empty", (Number(remote.trialCredits) || 0) <= 0 && (Number(remote.balance) || 0) <= 0);
  } else {
    const b = ledger.billingState();
    $("#q-status").innerHTML = `Trial tersisa: <b id="q-n">${b.trialCredits}</b> · Saldo: <b>${rupiah(b.balance)}</b>`;
    $("#q-status").classList.toggle("empty", b.trialCredits <= 0 && b.balance <= 0);
  }
  $("#topup-contact").innerHTML = `<span class="topup-transfer-instruction"><strong>Transfer untuk top-up</strong><span>Pilih paket di atas, lalu transfer sesuai nominalnya ke e-wallet berikut. Saldo diproses setelah admin memverifikasi pembayaran.</span></span><span class="topup-wallet-row"><span class="topup-wallet-icon" role="img" aria-label="Ikon e-wallet"><svg viewBox="0 0 72 28" width="72" height="28" aria-hidden="true" focusable="false"><rect x="1" y="1" width="70" height="26" rx="13" fill="#118EEA"/><text x="36" y="18.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing=".3" fill="#fff">DANA</text></svg></span><span class="topup-wallet-number mono">${ledger.CONTACT}</span></span><span class="topup-transfer-note">Setelah transfer, simpan bukti pembayaran. ID permintaan dan langkah konfirmasi akan muncul setelah paket dipilih.</span>`;
  renderBillingHistory(backend.isRemote() ? remote.history : ledger.requestHistory());
  // Tampilkan status terbaru apa pun (pending/approved/rejected) agar keputusan admin terlihat oleh user.
  const pending = backend.isRemote() ? remote.pending : ledger.pendingRequest();
  if (pending) showPending(pending);
  else showPackages();
  $("#btn-other-pkg").hidden = backend.isRemote();
  modal.hidden = false;
}

$("#pkg-list").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-pkg]");
  const key = btn?.dataset.pkg;
  if (key == null) return;
  const pkg = backend.isRemote()
    ? remote.packages.find((p) => p.id === key)
    : ledger.PACKAGES.find((p) => p.id === key);
  if (!pkg) { toast("Paket tidak ditemukan. Muat ulang panel top-up."); return; }
  if (backend.isRemote()) {
    try {
      const rec = await backend.createTopup(pkg);
      remote.pending = rec;
      showPending(rec);
      toast("Permintaan top-up dibuat — transfer sesuai nominal, tunggu persetujuan admin.");
    } catch (err) {
      toast("Gagal membuat permintaan: " + (err?.message || "server"));
    }
    return;
  }
  showPending(ledger.requestTopUp(pkg));
});

$("#btn-other-pkg").addEventListener("click", () => {
  ledger.cancelPending();
  showPackages();
});

$("#btn-cancel-topup").addEventListener("click", async () => {
  if (remote.pending?.status === "rejected") {
    showPackages();
    return;
  }
  if (remote.pending?.id) {
    try { await backend.cancelTopup(remote.pending.id); } catch { /* noop */ }
  }
  remote.pending = null;
  showPackages();
  toast("Permintaan dibatalkan");
});

$("#btn-redeem").addEventListener("click", () => {
  const ok = ledger.redeem($("#topup-code").value);
  if (ok) {
    $("#topup-code").value = "";
    openTopUp();
    updateKuota();
    toast("Top-up masuk — saldo sekarang " + rupiah(ledger.billingState().balance));
  } else {
    toast("Kode salah, atau belum ada permintaan top-up");
  }
});

$("#topup-code").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#btn-redeem").click();
});

$("#topup-close").addEventListener("click", () => { modal.hidden = true; });
modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) modal.hidden = true; });

/* buka kategori sekali bayar (saldo Rupiah) */
$("#cat-unlock-list").addEventListener("click", async (e) => {
  const one = e.target.closest("[data-unlock]");
  const all = e.target.closest("[data-unlock-all]");
  if (!one && !all) return;
  const cat = one ? one.dataset.unlock : "";
  const meta = cat ? categoriesCache.find((c) => c.id === cat) : null;
  if (cat && !meta) return;
  const price = cat ? Number(meta.unlock_price) || 0 : ledger.UNLOCK_ALL_PRICE;
  const nama = cat ? meta.label : "semua kategori";
  if (!confirm(`Buka ${nama} seharga ${rupiah(price)}? Saldo langsung dipotong dan berlaku seterusnya.`)) return;
  try {
    const res = cat
      ? await backend.unlockCategory(cat, price)
      : await backend.unlockAllCategories(categoriesCache, ledger.UNLOCK_ALL_PRICE);
    if (res && res.ok) {
      toast(res.already ? `Kategori ${nama} sudah terbuka` : `Kategori ${nama} terbuka — dokumennya Gratis selamanya`);
      await refreshRemoteBilling();
      await openTopUp();
    } else if (res?.reason === "insufficient") {
      toast(`Saldo kurang. Butuh ${rupiah(res.price || price)} — saldo kamu ${rupiah(res.balance || 0)}.`);
    } else {
      toast("Gagal membuka kategori. Coba lagi.");
    }
  } catch (err) {
    toast("Gagal membuka kategori: " + (err?.message || "server"));
  }
});
$("#kuota").addEventListener("click", openTopUp);
$("#kuota").setAttribute("role", "button");
$("#kuota").setAttribute("tabindex", "0");
$("#kuota").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTopUp(); }
});

/* ---------- auth (Supabase) ---------- */
const authModal = $("#auth-modal");
let authMode = "in";
let lastUid = null;
let sessionHandled = false;

function openAuth() {
  authModal.hidden = false;
  $("#workspace").hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function closeAuth() {
  authModal.hidden = true;
  $("#workspace").hidden = false;
}

/* Tampilkan form password baru untuk sesi recovery. */
function openRecovery() {
  recoveryPending = true;
  openAuth();
  setAuthMode("recover");
  $("#auth-pass").value = "";
  $("#auth-pass").focus();
}

function showAuthError(message) {
  const err = $("#auth-err");
  err.textContent = message;
  err.hidden = false;
  err.classList.remove("ok");
}

function setAuthMode(mode) {
  authMode = mode;
  const copy = {
    in: { title: "Masuk FakturKu", go: "Masuk", placeholder: "Minimal 8 karakter", autocomplete: "current-password", sub: "Masuk ke akun untuk melanjutkan." },
    up: { title: "Daftar FakturKu", go: "Daftar", placeholder: "Minimal 8 karakter", autocomplete: "new-password", sub: "Buat akun baru untuk mulai membuat dokumen." },
    req: { title: "Lupa password?", go: "Kirim tautan", placeholder: "Minimal 8 karakter", autocomplete: "current-password", sub: "Masukkan email akun; kami kirim tautan untuk mengatur ulang password." },
    recover: { title: "Atur ulang password", go: "Simpan password", placeholder: "Password baru (min. 8)", autocomplete: "new-password", sub: "Buat password baru untuk akunmu." },
  }[mode] || { title: "Masuk FakturKu", go: "Masuk", placeholder: "Minimal 8 karakter", autocomplete: "current-password", sub: "Masuk ke akun untuk melanjutkan." };

  $("#auth-tab-in").classList.toggle("on", mode === "in");
  $("#auth-tab-up").classList.toggle("on", mode === "up");
  $("#auth-name-field").hidden = mode !== "up";
  $("#auth-email-field").hidden = mode === "recover";
  $("#auth-pass-field").hidden = mode === "req";
  authModal.querySelector(".auth-tabs").hidden = mode === "req" || mode === "recover";
  $("#auth-forgot").hidden = mode !== "in";
  $("#auth-back").hidden = mode !== "req";
  const pass = $("#auth-pass");
  pass.setAttribute("autocomplete", copy.autocomplete);
  pass.placeholder = copy.placeholder;
  $("#auth-title").textContent = copy.title;
  $("#auth-sub").textContent = copy.sub;
  $("#auth-go").textContent = copy.go;
  const err = $("#auth-err");
  err.hidden = true;
  err.classList.remove("ok");
}

$("#auth-tab-in").addEventListener("click", () => setAuthMode("in"));
$("#auth-tab-up").addEventListener("click", () => setAuthMode("up"));
$("#auth-forgot").addEventListener("click", () => setAuthMode("req"));
$("#auth-back").addEventListener("click", () => setAuthMode("in"));

async function authSubmit() {
  const email = $("#auth-email").value.trim();
  const pass = $("#auth-pass").value;
  const name = $("#auth-name").value.trim();
  const err = $("#auth-err");
  err.hidden = true;
  err.classList.remove("ok");
  const go = $("#auth-go");
  const wasMode = authMode;
  const labels = { in: "Masuk", up: "Daftar", req: "Kirim tautan", recover: "Simpan password" };

  if (wasMode === "req") {
    if (!email) { err.textContent = "Isi email akunmu dulu."; err.hidden = false; return; }
    go.disabled = true;
    go.textContent = "Mengirim.";
    try {
      await backend.requestPasswordReset(email);
      err.textContent = "Kalau email terdaftar, tautan reset sudah dikirim. Cek inbox/spam, lalu buka tautannya di perangkat ini.";
      err.hidden = false;
      err.classList.add("ok");
    } catch (e) {
      const msg = Number(e?.status) === 429
        ? "Terlalu banyak permintaan email. Tunggu beberapa menit, lalu coba lagi."
        : (e?.message || "Gagal mengirim tautan. Coba lagi.");
      err.textContent = msg;
      err.hidden = false;
    } finally {
      go.disabled = false;
      go.textContent = labels[wasMode];
    }
    return;
  }

  if ((wasMode !== "recover" && !email) || !pass) {
    err.textContent = wasMode === "recover" ? "Isi password baru dulu." : "Email & password wajib diisi.";
    err.hidden = false;
    return;
  }
  if ((wasMode === "up" || wasMode === "recover") && pass.length < 8) {
    err.textContent = "Password minimal 8 karakter.";
    err.hidden = false;
    return;
  }

  go.disabled = true;
  go.textContent = "Memproses…";
  try {
    if (wasMode === "in") {
      await backend.signIn(email, pass);
    } else if (wasMode === "up") {
      await backend.signUp(email, pass, name);
      setAuthMode("in");
      err.textContent = "Pendaftaran berhasil. Silakan masuk.";
      err.hidden = false;
      err.classList.add("ok");
    } else if (wasMode === "recover") {
      await backend.updatePassword(pass);
      recoveryPending = false;
      try { history.replaceState(null, "", location.pathname + location.search); } catch { /* abaikan */ }
      const session = await backend.getSession();
      if (session) handleSession(session);
      setAuthMode("in");
      toast("Password diperbarui. Kamu sudah masuk.");
    }
  } catch (e) {
    err.textContent = e?.message || "Gagal — coba lagi.";
    err.hidden = false;
  } finally {
    go.disabled = false;
    go.textContent = labels[authMode] || "Masuk";
  }
}
$("#auth-go").addEventListener("click", authSubmit);
$("#auth-email").addEventListener("keydown", (e) => { if (e.key === "Enter") authSubmit(); });
$("#auth-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") authSubmit(); });

async function refreshRemoteBilling() {
  try {
    const [billing, h, p, u] = await Promise.all([
      backend.billingState(), backend.history(), backend.pendingTopup(), backend.getMyUnlocks(),
    ]);
    remote.credits = billing.credits;
    remote.trialCredits = billing.trialCredits;
    remote.balance = billing.balance;
    remote.history = h;
    remote.pending = p;
    unlockedCategories = Array.isArray(u) ? u : [];
  } catch (e) {
    console.warn("billing refresh gagal", e);
    toast("Saldo belum tersinkron. Coba muat ulang.");
  }
  updateKuota();
  renderTemplatePicker();
}

async function handleSession(session) {
  const uid = session?.user?.id ?? null;
  if (sessionHandled && uid === lastUid) return;
  sessionHandled = true;
  lastUid = uid;
  remote.session = session;
  const btn = $("#btn-auth");
  if (session) {
    btn.hidden = false;
    const email = session.user.email || "";
    $("#auth-avatar").textContent = (email[0] || "?").toUpperCase();
    btn.title = email;
    closeAuth();
    await refreshRemoteBilling();
    toast("Terhubung sebagai " + email);
    refreshAdminAccess();
  } else {
    $("#auth-avatar").textContent = "?";
    btn.title = "Masuk";
    remote.credits = null;
    remote.trialCredits = null;
    remote.balance = null;
    remote.history = [];
    remote.pending = null;
    updateKuota();
    refreshAdminAccess();
    openAuth();
  }
}

$("#btn-auth").addEventListener("click", async () => {
  if (remote.session) {
    if (!confirm("Keluar dari akun " + (remote.session.user.email || "") + "?")) return;
    await backend.signOut();
  } else {
    openAuth();
  }
});

/* ---------- panel admin (hanya role admin) ----------
   Isi panel ini setara admin.html, tapi menyatu di dalam app supaya satu
   link login. Panel murni UI: wewenang sebenarnya dijaga server — approve,
   reject, set_role, dan adjust_balance semuanya memakai is_admin() di database.
   Di sini kita hanya menyembunyikan/menampilkan panel dan memanggil RPC. */
const adminModal = $("#admin-modal");
let adminAllowed = false;
let adminBusy = false;

function admEsc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function admWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
    + " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function admWho(profiles, id) {
  return profiles?.full_name || profiles?.role || String(id || "").slice(0, 8) || "—";
}

function renderAdminTopups(rows) {
  $("#adm-tu-body").innerHTML = rows.map((r) => {
    const canAct = r.status === "pending";
    return `<tr>
      <td data-label="Waktu">${admEsc(admWhen(r.created_at))}</td>
      <td data-label="User">${admEsc(admWho(r.profiles, r.user_id))}</td>
      <td class="mono" data-label="Saldo masuk">Rp ${Number(r.balance_amount ?? r.price ?? 0).toLocaleString("id-ID")}</td>
      <td class="mono" data-label="Harga">Rp ${Number(r.price || 0).toLocaleString("id-ID")}</td>
      <td class="mono" data-label="ID">${admEsc(r.code)}</td>
      <td data-label="Status"><span class="admin-chip ${admEsc(String(r.status || ""))}">${admEsc(r.status || "—")}</span></td>
      <td data-label="">${canAct ? `<span class="admin-rowactions">
        <button class="admin-act ok" type="button" data-appr="${admEsc(r.code)}">Approve</button>
        <button class="admin-act no" type="button" data-rej="${admEsc(r.code)}">Tolak</button>
      </span>` : ""}</td>
    </tr>`;
  }).join("");
  $("#adm-tu-empty").hidden = rows.length > 0;
}

function renderAdminUsers(rows) {
  $("#adm-us-body").innerHTML = rows.map((u) => `<tr>
      <td data-label="Nama">${admEsc(u.name)}</td>
      <td class="mono" data-label="Email">${admEsc(u.email)}</td>
      <td data-label="Role"><select class="mini" data-role="${admEsc(u.id)}" aria-label="Role ${admEsc(u.email)}">
        ${["pic", "admin", "viewer"].map((r) => `<option value="${r}"${u.role === r ? " selected" : ""}>${r}</option>`).join("")}
      </select></td>
      <td class="mono" data-label="Saldo">Rp ${Number(u.balance || 0).toLocaleString("id-ID")}<br><span class="muted">trial ${Number(u.trialCredits || 0)} dok</span></td>
      <td data-label="Adjust saldo (Rp)"><span class="admin-cred">
        <input type="number" data-adj="${admEsc(u.id)}" value="10000" step="1000" aria-label="Jumlah adjust saldo untuk ${admEsc(u.email)}">
        <button class="admin-act" type="button" data-adjgo="${admEsc(u.id)}">Kirim</button>
      </span></td>
    </tr>`).join("");
  $("#adm-us-empty").hidden = rows.length > 0;
}

function renderAdminTx(rows) {
  const MONETARY = ["topup", "issue", "unlock_category", "unlock_all"];
  $("#adm-tx-body").innerHTML = rows.map((t) => {
    const monetary = MONETARY.includes(t.reason);
    const amount = monetary ? Number(t.balance_delta) || 0 : Number(t.trial_delta) || Number(t.delta) || 0;
    const sisa = monetary ? t.balance_after : (t.trial_after ?? t.credits_after);
    const label = monetary ? cashRp(Math.abs(amount)) : Math.abs(amount) + " dok";
    const sisaLabel = sisa == null ? "—" : (monetary ? cashRp(sisa) : sisa + " dok");
    return `<tr>
      <td data-label="Waktu">${admEsc(admWhen(t.created_at))}</td>
      <td data-label="User">${admEsc(admWho(t.profiles, t.user_id))}</td>
      <td class="mono ${amount >= 0 ? "plus" : "minus"}" data-label="Jumlah">${amount > 0 ? "+" : "-"}${label} <span class="muted">${admEsc(t.reason || "")}</span></td>
      <td class="mono" data-label="Ref">${admEsc(t.ref || "")}</td>
      <td class="mono" data-label="Sisa saldo">${admEsc(sisaLabel)}</td>
    </tr>`;
  }).join("");
  $("#adm-tx-empty").hidden = rows.length > 0;
}

/* ---------- keuangan / cashflow ----------
   Pemasukan berasal dari topup_requests.price pada baris berstatus "approved".
   Semua agregasi dihitung di klien dari cache cashData, jadi ganti periode /
   tahun tidak menambah query. Pengeluaran belum dilacak (butuh tabel baru). */
const CASH_TTL_MS = 120000;
const CASH_LIMIT = 2000;
let cashData = null;
let cashFetchedAt = 0;
let cashRange = "month";
let cashMonth = "";
let cashYear = new Date().getFullYear();

const cashRp = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function cashWindow() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const startOf = (yy, mm) => new Date(yy, mm, 1, 0, 0, 0, 0);
  const endOf = (yy, mm) => new Date(yy, mm + 1, 0, 23, 59, 59, 999);
  switch (cashRange) {
    case "today": return { start: new Date(y, m, now.getDate()), end: now };
    case "7d": return { start: new Date(y, m, now.getDate() - 6), end: now };
    case "lastmonth": return { start: startOf(y, m - 1), end: endOf(y, m - 1) };
    case "year": return { start: startOf(y, 0), end: now };
    case "all": return { start: null, end: now };
    case "custom": {
      const p = /^(\d{4})-(\d{2})$/.exec(cashMonth);
      if (!p) return { start: startOf(y, m), end: now };
      const yy = Number(p[1]);
      const mm = Number(p[2]) - 1;
      return { start: startOf(yy, mm), end: endOf(yy, mm) };
    }
    case "month":
    default: return { start: startOf(y, m), end: now };
  }
}

function cashSumBetween(start, end) {
  const lo = start ? start.getTime() : -Infinity;
  const hi = end ? end.getTime() : Infinity;
  return (cashData || []).reduce((s, r) => {
    if (r.status !== "approved") return s;
    const t = new Date(r.created_at).getTime();
    return (!Number.isNaN(t) && t >= lo && t <= hi) ? s + (Number(r.price) || 0) : s;
  }, 0);
}

function cashAggregate() {
  const w = cashWindow();
  const lo = w.start ? w.start.getTime() : -Infinity;
  const hi = w.end ? w.end.getTime() : Infinity;
  const approved = (cashData || []).filter((r) => {
    if (r.status !== "approved") return false;
    const t = new Date(r.created_at).getTime();
    return !Number.isNaN(t) && t >= lo && t <= hi;
  });
  const pending = (cashData || []).filter((r) => r.status === "pending");
  const revenue = approved.reduce((s, r) => s + (Number(r.price) || 0), 0);
  return {
    count: approved.length,
    revenue,
    credits: approved.reduce((s, r) => s + (Number(r.balance_amount) || 0), 0),
    avg: approved.length ? Math.round(revenue / approved.length) : 0,
    pendingCount: pending.length,
    pendingSum: pending.reduce((s, r) => s + (Number(r.price) || 0), 0),
  };
}

function cashMonthsOf(year) {
  const out = [];
  for (let i = 0; i < 12; i++) {
    const lo = new Date(year, i, 1).getTime();
    const hi = new Date(year, i + 1, 1).getTime();
    const rows = (cashData || []).filter((r) => {
      if (r.status !== "approved") return false;
      const t = new Date(r.created_at).getTime();
      return !Number.isNaN(t) && t >= lo && t < hi;
    });
    out.push({
      label: new Date(year, i, 1).toLocaleDateString("id-ID", { month: "short" }),
      count: rows.length,
      revenue: rows.reduce((s, r) => s + (Number(r.price) || 0), 0),
    });
  }
  return out;
}

function renderCashflow() {
  const agg = cashAggregate();
  $("#adm-cash-revenue").textContent = cashRp(agg.revenue);
  $("#adm-cash-count").textContent = agg.count;
  $("#adm-cash-avg").textContent = agg.avg ? cashRp(agg.avg) : "—";
  $("#adm-cash-credits").textContent = cashRp(agg.credits);
  $("#adm-cash-pending").textContent = cashRp(agg.pendingSum);
  $("#adm-cash-pending").parentElement.title = agg.pendingCount + " permintaan menunggu";

  const now = new Date();
  $("#adm-st-revenue").textContent = cashRp(cashSumBetween(new Date(now.getFullYear(), now.getMonth(), 1), now));

  const months = cashMonthsOf(cashYear);
  const max = Math.max(1, ...months.map((x) => x.revenue));
  const yearTotal = months.reduce((s, x) => s + x.revenue, 0);
  const yearCount = months.reduce((s, x) => s + x.count, 0);
  $("#adm-cash-year").textContent = cashYear;
  $("#adm-cash-yearsum").textContent = cashRp(yearTotal) + " · " + yearCount + " trx";
  $("#adm-cash-months").innerHTML = months.map((x) => `
    <div class="cash-mrow">
      <span class="cash-mlabel">${admEsc(x.label)}</span>
      <span class="cash-mval">${x.revenue ? admEsc(cashRp(x.revenue)) : "—"}</span>
      <span class="cash-mcount">${x.count ? x.count + "&times;" : ""}</span>
      <span class="cash-mbar"><i style="width:${Math.round((x.revenue / max) * 100)}%"></i></span>
    </div>`).join("");

  $("#adm-cash-note").innerHTML = (cashData || []).length >= CASH_LIMIT
    ? "Dibatasi " + CASH_LIMIT + " baris terbaru &mdash; periode lama mungkin belum lengkap."
    : "Pemasukan dihitung dari top-up berstatus <b>approved</b>. Pengeluaran belum dilacak.";
}

async function loadCashflow(force = false) {
  if (!adminAllowed) return;
  if (!force && cashData && Date.now() - cashFetchedAt < CASH_TTL_MS) {
    renderCashflow();
    return;
  }
  try {
    cashData = await backend.topupLedger(CASH_LIMIT);
    cashFetchedAt = Date.now();
    renderCashflow();
  } catch (e) {
    console.warn("cashflow gagal dimuat", e);
  }
}

/* ---------- auto-refresh panel admin ---------- */
const ADMIN_POLL_MS = 30000;
let adminPoll = null;

/* Jangan sentuh tabel saat user sedang mengetik/memilih, supaya nilai yang
   sedang diisi (mis. jumlah adjust) tidak tertimpa. */
function adminTyping() {
  const el = document.activeElement;
  return !!el && adminModal.contains(el) && (el.tagName === "INPUT" || el.tagName === "SELECT");
}

function snapshotAdjust() {
  const out = {};
  document.querySelectorAll("#adm-us-body input[data-adj]").forEach((i) => { out[i.dataset.adj] = i.value; });
  return out;
}

function restoreAdjust(snap) {
  document.querySelectorAll("#adm-us-body input[data-adj]").forEach((i) => {
    if (snap[i.dataset.adj] != null) i.value = snap[i.dataset.adj];
  });
}

function startAdminPoll() {
  if (adminPoll) return;
  adminPoll = setInterval(async () => {
    if (!adminAllowed || !backend.isRemote() || !remote.session || document.hidden) return;
    if (!adminModal.hidden) {
      if (!adminTyping()) await loadAdminPanel();
      return;
    }
    try {
      const n = await backend.adminPendingCount();
      const badge = $("#admin-count");
      badge.textContent = n;
      badge.hidden = n === 0;
    } catch { /* diamkan, coba lagi di tick berikutnya */ }
  }, ADMIN_POLL_MS);
}

function stopAdminPoll() {
  if (adminPoll) { clearInterval(adminPoll); adminPoll = null; }
}

async function loadAdminPanel() {
  if (!adminAllowed || adminBusy) return;
  adminBusy = true;
  const keepAdjust = snapshotAdjust();
  try {
    const [stats, reqs, users, txs] = await Promise.all([
      backend.adminStats(), backend.adminPending(), backend.adminUsers(), backend.adminTransactions(),
    ]);
    $("#adm-st-users").textContent = stats.users;
    $("#adm-st-invoices").textContent = stats.invoices;
    $("#adm-st-pending").textContent = stats.pending;
    renderAdminTopups(reqs);
    renderAdminUsers(users);
    restoreAdjust(keepAdjust);
    renderAdminTx(txs);
    $("#adm-updated").textContent = " · Diperbarui "
      + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      + " · otomatis " + Math.round(ADMIN_POLL_MS / 1000) + "d";
    const count = reqs.filter((r) => r.status === "pending").length;
    const badge = $("#admin-count");
    badge.textContent = count;
    badge.hidden = count === 0;
    await loadCashflow();
  } catch (e) {
    console.warn("panel admin gagal dimuat", e);
    toast("Panel admin gagal dimuat: " + (e?.message || "coba lagi."));
  } finally {
    adminBusy = false;
  }
}

async function refreshAdminAccess() {
  const btn = $("#btn-admin");
  let ok = false;
  if (backend.isRemote() && remote.session) {
    try { ok = await backend.isAdminUser(); } catch { ok = false; }
  }
  adminAllowed = ok;
  btn.hidden = !ok;
  if (!ok) {
    stopAdminPoll();
    adminModal.hidden = true;
    $("#admin-count").hidden = true;
    cashData = null;
    cashFetchedAt = 0;
    $("#adm-tu-body").innerHTML = "";
    $("#adm-us-body").innerHTML = "";
    $("#adm-tx-body").innerHTML = "";
  } else {
    $("#adm-who").textContent = remote.session?.user?.email || "admin";
    startAdminPoll();
    await loadAdminPanel();
  }
}

$("#btn-admin").addEventListener("click", () => {
  if (!adminAllowed) return;
  adminModal.hidden = false;
  loadAdminPanel();
});
$("#adm-close").addEventListener("click", () => { adminModal.hidden = true; });
$("#adm-refresh").addEventListener("click", () => { loadAdminPanel(); });
$("#adm-logout").addEventListener("click", async () => {
  if (!confirm("Keluar dari akun " + (remote.session?.user?.email || "") + "?")) return;
  adminModal.hidden = true;
  await backend.signOut();
});
adminModal.addEventListener("click", (e) => { if (e.target === adminModal) adminModal.hidden = true; });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !adminModal.hidden) adminModal.hidden = true;
});

/* keuangan: pilih rentang, bulan tertentu, dan tahun yang discreening */
adminModal.addEventListener("click", (e) => {
  const range = e.target.dataset?.range;
  if (!range) return;
  cashRange = range;
  document.querySelectorAll("#admin-modal .cash-btn").forEach((b) => {
    b.classList.toggle("on", b.dataset.range === range);
  });
  renderCashflow();
});
$("#adm-cash-month").addEventListener("change", (e) => {
  cashMonth = e.target.value || "";
  if (!cashMonth) return;
  cashRange = "custom";
  document.querySelectorAll("#admin-modal .cash-btn").forEach((b) => b.classList.remove("on"));
  cashYear = Number(cashMonth.slice(0, 4)) || cashYear;
  renderCashflow();
});
$("#adm-cash-prev").addEventListener("click", () => { cashYear -= 1; renderCashflow(); });
$("#adm-cash-next").addEventListener("click", () => { cashYear += 1; renderCashflow(); });

/* approve / tolak */
$("#adm-tu-body").addEventListener("click", async (e) => {
  const approve = e.target.dataset?.appr;
  const reject = e.target.dataset?.rej;
  if ((!approve && !reject) || !adminAllowed) return;
  try {
    if (approve) {
      if (!confirm("Approve " + approve + "? Kuota user bertambah otomatis.")) return;
      await backend.approveTopup(approve);
      toast("Top-up " + approve + " di-approve.");
    } else {
      if (!confirm("Tolak permintaan " + reject + "?")) return;
      await backend.rejectTopup(reject);
      toast("Permintaan " + reject + " ditolak.");
    }
    await loadAdminPanel();
  } catch (err) {
    toast("Gagal: " + (err?.message || "coba lagi."));
  }
});

/* ubah role */
$("#adm-us-body").addEventListener("change", async (e) => {
  const id = e.target.dataset?.role;
  if (!id || !adminAllowed) return;
  const role = e.target.value;
  try {
    await backend.setRole(id, role);
    toast("Role diubah ke " + role + ".");
  } catch (err) {
    toast("Gagal set role: " + (err?.message || "coba lagi."));
  }
  await loadAdminPanel();
});

/* adjust kuota manual */
$("#adm-us-body").addEventListener("click", async (e) => {
  const id = e.target.dataset?.adjgo;
  if (!id || !adminAllowed) return;
  const inp = $(`#adm-us-body input[data-adj="${id}"]`);
  const delta = Number(inp?.value) || 0;
  if (!delta) { toast("Isi jumlah adjust dulu."); return; }
  if (!confirm("Adjust kuota " + (delta > 0 ? "+" : "") + delta + " untuk user ini?")) return;
  try {
    await backend.adjustBalance(id, delta, "manual admin");
    toast("Kuota disesuaikan " + (delta > 0 ? "+" : "") + delta + ".");
    await loadAdminPanel();
  } catch (err) {
    toast("Gagal adjust: " + (err?.message || "coba lagi."));
  }
});

/* ---------- mobile tabs + filled template example ---------- */
$("#tab-edit").addEventListener("click", () => switchTab("edit"));
$("#tab-preview").addEventListener("click", () => switchTab("preview"));
$("#tab-example").addEventListener("click", () => switchTab("example"));
$("#tab-example-desktop").addEventListener("click", () => switchTab($("#workspace").dataset.tab === "preview" && $("#example-banner").hidden === false ? "preview" : "example"));

/* Dokumen penjualan/tagihan yang contohnya memakai diskon + PPN. */
const TAXED_SAMPLE = new Set([
  "faktur-a4", "invoice-digital", "nota-kontan", "struk-pos", "surat-penawaran", "surat-pesanan",
  "purchase-order", "proforma-invoice", "credit-note", "debit-note", "surat-tagihan",
  "invoice-berulang", "tagihan-termin", "nota-servis",
]);

function buildExampleState(issued = true) {
  const today = new Date();
  const dateValue = (d) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const plusDays = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return dateValue(d);
  };
  const sample = blankState(state.template, {
    keepNumber: "CONTOH/" + String(state.template || "DOC").toUpperCase() + "/001"
  });
  sample.category = state.category || getCategory(state.template);
  sample.date = dateValue(today);
  sample.dueDate = plusDays(14);
  sample.issued = issued;
  sample.notes = "Contoh data fiktif — sesuaikan seluruh isi sebelum digunakan.";
  sample.issuer = {
    name: "UD Sumber Jaya (Contoh)",
    address: "Jl. Raya Cihideung No. 45, Tasikmalaya",
    npwp: "00.000.000.0-000.000",
    phone: "(0265) 222333",
    email: "admin@example.test"
  };
  sample.client = {
    name: "Toko Barokah (Contoh)",
    address: "Jl. Pasar Wetan No. 7, Tasikmalaya",
    npwp: "00.000.000.0-000.000",
    phone: "(0265) 444555"
  };
  sample.items = [
    { desc: "Semen 50 kg (contoh)", qty: 5, price: 62000, unit: "sak" },
    { desc: "Pasir beton (contoh)", qty: 2, price: 250000, unit: "m³" }
  ];
  sample.discount = 0;
  sample.taxRate = 0;
  sample.payment = {
    bank: "Bank Contoh",
    accountNo: "0000000000",
    accountName: "UD Sumber Jaya (Contoh)",
    method: "Transfer bank (contoh)"
  };
  // F7 lanjutan: klausul contoh diambil dari definisi template (defaultTerms) supaya dokumen
  // contoh tidak kosong dan tidak memakai teks generik yang sama untuk semua format.
  const termsTpl = getTemplate(state.template) || {};
  sample.terms = (termsTpl.uses || []).indexOf("terms") >= 0
    ? (termsTpl.defaultTerms || "Contoh syarat & ketentuan: sesuaikan dengan kesepakatan para pihak.")
    : "";
  sample.signatures = {
    maker: { name: "Dedi Kurnia (Contoh)", title: "Pemilik Usaha" },
    receiver: { name: "Budi Santoso (Contoh)", title: "Penerima / Penanggung Jawab" }
  };
  Object.assign(sample.details, {
    subject: "Pengadaan / pekerjaan contoh",
    reference: "REF-CONTOH-001",
    description: "Contoh uraian untuk membantu memahami bagian dokumen yang perlu diisi.",
    period: "Oktober 2026",
    location: "Tasikmalaya",
    validity: plusDays(30),
    paymentTerms: "Pembayaran maksimal 14 hari setelah dokumen diterima",
    reason: "Contoh kebutuhan operasional",
    status: "Diperiksa — contoh",
    authority: "Bagian Operasional",
    origin: "Gudang Tasikmalaya",
    destination: "Lokasi penerima, Tasikmalaya",
    driver: "Dedi (Contoh)",
    vehicle: "Mobil boks — contoh",
    condition: "Baik; contoh data",
    quantity: 3,
    unit: "paket",
    contractRef: "SPK-CONTOH-001",
    scope: "Penyediaan barang dan jasa sesuai daftar",
    effectiveDate: dateValue(today),
    endDate: plusDays(30),
    authority: "Bagian Operasional",
    witness: "Saksi (Contoh)",
    project: "Peningkatan Fasilitas Kantor (Contoh)",
    progress: 50,
    contractValue: 10000000,
    previousPaid: 2500000,
    retention: 500000,
    milestone: "Termin 2 — contoh",
    inspection: "Sesuai pemeriksaan contoh",
    employee: "Asep Saepudin (Contoh)",
    employeeId: "KARYAWAN-CONTOH-001",
    position: "Tukang",
    department: "Operasional",
    baseSalary: 4500000,
    allowances: 500000,
    deductions: 100000,
    netPay: 4900000,
    taxPeriod: "Oktober 2026 (contoh)",
    taxType: "Data simulasi — verifikasi aturan berlaku",
    taxBase: 2500000,
    taxAmount: 275000,
    taxId: "00.000.000.0-000.000",
    requestedBy: "Dedi Kurnia (Contoh)",
    approvedBy: "Budi Santoso (Contoh)",
    deliveryDate: plusDays(3),
    supplier: "CV Material Jaya",
    budget: 2500000,
    recipientRole: "Penerima Kuasa (Contoh)",
    returnReason: "Barang tidak sesuai pesanan (contoh)",
    packing: "3 karton",
    invoiceRef: "INV-CONTOH-001",
    contractDate: dateValue(today),
    invoicePeriod: "Oktober 2026",
    bankRef: "TRX-CONTOH-001"
  });

  // Profil sampel per format: contoh uraian dan detail mengikuti tujuan dokumen,
  // bukan memakai satu isi faktur generik untuk seluruh kategori.
  const sampleProfiles = {
    "faktur-a4": { items: [{ desc: "Semen 50 kg (contoh)", qty: 10, price: 62000, unit: "sak" }, { desc: "Pasir beton (contoh)", qty: 2, price: 250000, unit: "m³" }] },
    "invoice-digital": { items: [{ desc: "Servis & isi freon AC 1 PK (contoh)", qty: 1, price: 350000, unit: "unit" }, { desc: "Ganti kapasitor (contoh)", qty: 1, price: 120000, unit: "unit" }] },
    "kwitansi-a4": { items: [{ desc: "Pembayaran borongan pasang keramik (contoh)", qty: 1, price: 900000 }], details: { subject: "Bukti penerimaan pembayaran", description: "Pembayaran borongan pasang keramik (contoh)" } },
    "struk-ansuran": { items: [{ desc: "Pembayaran angsuran ke-3 (contoh)", qty: 1, price: 575000 }], details: { subject: "Bukti pembayaran angsuran", description: "Simulasi pembayaran angsuran kendaraan" } },
    "credit-note": { items: [{ desc: "Koreksi jumlah barang pada invoice (contoh)", qty: 1, price: 250000 }], details: { subject: "Koreksi tagihan", reason: "Penyesuaian jumlah barang (contoh)", description: "Pengurangan nilai tagihan sebelumnya (simulasi)" } },
    "debit-note": { items: [{ desc: "Biaya tambahan sesuai kesepakatan (contoh)", qty: 1, price: 300000 }], details: { subject: "Penyesuaian nilai tagihan", reason: "Biaya tambahan terverifikasi (contoh)", description: "Penambahan nilai tagihan sebelumnya (simulasi)" } },
    "surat-tagihan": { items: [{ desc: "Pekerjaan sesuai pesanan (contoh)", qty: 1, price: 3200000 }], details: { subject: "Permohonan penyelesaian pembayaran", period: "Oktober 2026", paymentTerms: "Mohon dibayar dalam 14 hari (contoh)" } },
    "invoice-berulang": { items: [{ desc: "Layanan berlangganan bulanan (contoh)", qty: 1, price: 450000 }], details: { period: "Oktober 2026", paymentTerms: "Pembayaran untuk periode berjalan (contoh)" } },
    "nota-kontan": { items: [{ desc: "Beras 5 kg (contoh)", qty: 1, price: 68000, unit: "karung" }, { desc: "Minyak goreng 2 L (contoh)", qty: 2, price: 36000, unit: "pouch" }] },
    "surat-penawaran": { items: [{ desc: "Borongan pasang keramik 6 m² (contoh)", qty: 1, price: 900000, unit: "borongan" }, { desc: "Material pendukung (contoh)", qty: 1, price: 450000, unit: "paket" }], details: { subject: "Penawaran jasa pasang & material", validity: plusDays(30), paymentTerms: "DP 50%, pelunasan setelah pekerjaan selesai (contoh)" } },
    "surat-pesanan": { items: [{ desc: "Besi beton 10 mm (contoh)", qty: 20, price: 62000, unit: "batang" }, { desc: "Semen 50 kg (contoh)", qty: 30, price: 62000, unit: "sak" }], details: { reference: "PO-CONTOH-001", deliveryDate: plusDays(3), paymentTerms: "Pembayaran sesuai kesepakatan (contoh)" } },
    "struk-pos": { items: [{ desc: "Es teh manis", qty: 2, price: 5000 }, { desc: "Gorengan", qty: 3, price: 1000 }], client: { name: "Pelanggan Umum (Contoh)", address: "Pembelian langsung", npwp: "", phone: "" }, payment: { bank: "", accountNo: "", accountName: "", method: "Tunai (contoh)" } },
    "daftar-harga": { items: [{ desc: "Servis ringan (contoh)", qty: 1, price: 50000, unit: "unit" }, { desc: "Ganti oli + filter (contoh)", qty: 1, price: 150000, unit: "unit" }, { desc: "Tambal ban (contoh)", qty: 1, price: 25000, unit: "unit" }], details: { subject: "Daftar harga bengkel", period: "Oktober 2026", validity: plusDays(30) } },
    "surat-jalan": { items: [{ desc: "Semen 50 kg (contoh)", qty: 40, price: 0, unit: "sak" }, { desc: "Besi beton 10 mm (contoh)", qty: 20, price: 0, unit: "batang" }], details: { reference: "SJ-CONTOH-001", origin: "Gudang UD Sumber Jaya", destination: "Proyek rumah Pak Hendra, Tasikmalaya", driver: "Asep (Contoh)", vehicle: "Pick-up (contoh)", condition: "Barang dikemas dengan baik (contoh)", unit: "sak", deliveryDate: plusDays(1) } },
    "bukti-terima-barang": { items: [{ desc: "Semen 50 kg (contoh)", qty: 40, price: 0, unit: "sak" }, { desc: "Besi beton 10 mm (contoh)", qty: 20, price: 0, unit: "batang" }], details: { reference: "BTB-CONTOH-001", condition: "Baik, kemasan utuh (contoh)", inspection: "Jumlah dan kondisi dihitung ulang (contoh)", location: "Lokasi proyek, Tasikmalaya", unit: "sak" } },
    "surat-retur": { items: [{ desc: "Semen mengeras saat diterima (contoh)", qty: 5, price: 0, unit: "sak" }], details: { reference: "RETUR-CONTOH-001", returnReason: "Semen sudah mengeras saat pemeriksaan (contoh)", condition: "Menunggu penggantian dari toko (contoh)", origin: "Lokasi proyek", destination: "Toko pengirim material" } },
    "packing-list": { items: [{ desc: "Semen 50 kg", qty: 40, price: 0, unit: "sak" }, { desc: "Besi beton 10 mm", qty: 20, price: 0, unit: "batang" }], details: { reference: "PL-CONTOH-001", packing: "40 sak + 20 batang (contoh)", origin: "Gudang UD Sumber Jaya", destination: "Lokasi proyek", vehicle: "Pick-up (contoh)", unit: "sak" } },
    "perjanjian-kerja-sama": { items: [], details: { reference: "PKS-CONTOH-001", subject: "Kerja sama penyediaan layanan", contractDate: dateValue(today), scope: "Penyediaan layanan dan dukungan sesuai ruang lingkup tertulis (contoh)", effectiveDate: dateValue(today), endDate: plusDays(365), location: "Tasikmalaya" } },
    "surat-kuasa": { items: [], details: { reference: "SK-CONTOH-001", subject: "Kuasa pengambilan dokumen", recipientRole: "Penerima kuasa (contoh)", scope: "Mengambil dokumen administrasi yang disebutkan secara spesifik (contoh)", effectiveDate: dateValue(today), endDate: plusDays(7), witness: "Saksi (contoh)" } },
    "spk": { items: [{ desc: "Borongan pasang rangka & atap (contoh)", qty: 1, price: 6500000, unit: "borongan" }], details: { reference: "SPK-CONTOH-001", contractRef: "KONTRAK-CONTOH-001", scope: "Pekerjaan rangka, atap, dan serah terima (contoh)", location: "Tasikmalaya", effectiveDate: dateValue(today), endDate: plusDays(14), paymentTerms: "Pembayaran berdasarkan progres yang disetujui (contoh)" } },
    "loi": { items: [], details: { reference: "LOI-CONTOH-001", subject: "Minat kerja sama suplai material", scope: "Penjajakan ruang lingkup, jadwal, dan estimasi biaya material (contoh)", effectiveDate: dateValue(today), endDate: plusDays(30), location: "Tasikmalaya" } },
    "surat-pernyataan": { items: [], details: { reference: "SP-CONTOH-001", subject: "Pernyataan penerimaan barang", reason: "Keperluan administrasi (contoh)", location: "Tasikmalaya" } },
    "memo-internal": { items: [], details: { subject: "Jadwal pengiriman material", authority: "Operasional", description: "Pengiriman material dijadwalkan ulang ke esok pagi. Koordinasikan dengan pengemudi dan penerima (contoh).", requestedBy: "Koordinator Gudang (Contoh)" } },
    "surat-perjalanan-dinas": { items: [], details: { employee: "Asep Saepudin (Contoh)", employeeId: "KARYAWAN-CONTOH-001", position: "Tukang", department: "Produksi", location: "Bandung", period: "20–21 Oktober 2026 (contoh)", reason: "Pengerjaan proyek di luar kota (contoh)", budget: 750000 } },
    "klaim-biaya": { items: [{ desc: "Bensin & tol (contoh)", qty: 1, price: 125000 }, { desc: "Makan di jalan (contoh)", qty: 1, price: 85000 }], details: { employee: "Asep Saepudin (Contoh)", employeeId: "KARYAWAN-CONTOH-001", department: "Produksi", period: "Oktober 2026", reason: "Transport dan konsumsi tugas luar (contoh)", approvedBy: "Dedi Kurnia (Contoh)" } },
    "purchase-order": { items: [{ desc: "Semen 50 kg (contoh)", qty: 30, price: 62000, unit: "sak" }, { desc: "Besi beton 10 mm (contoh)", qty: 20, price: 62000, unit: "batang" }], details: { reference: "PO-CONTOH-001", supplier: "CV Material Jaya", requestedBy: "Dedi Kurnia (Contoh)", approvedBy: "Budi Santoso (Contoh)", deliveryDate: plusDays(5), location: "Gudang UD Sumber Jaya", paymentTerms: "Pembayaran sesuai invoice dan penerimaan (contoh)", budget: 3100000 } },
    "slip-gaji": { items: [], details: { employee: "Asep Saepudin (Contoh)", employeeId: "KARYAWAN-CONTOH-001", position: "Tukang", department: "Produksi", period: "Oktober 2026", baseSalary: 3000000, allowances: 300000, deductions: 50000, netPay: 3250000, bankRef: "TRX-GAJI-CONTOH-001" } },
    "rab": { items: [{ desc: "Material bangunan (contoh)", qty: 1, price: 3500000, unit: "paket" }, { desc: "Upah tukang (contoh)", qty: 1, price: 2000000, unit: "borongan" }, { desc: "Transportasi dan alat (contoh)", qty: 1, price: 500000, unit: "paket" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", location: "Tasikmalaya", contractRef: "RAB-CONTOH-001", contractValue: 6000000, description: "Estimasi awal untuk perencanaan; bukan penawaran final." } },
    "bast": { items: [{ desc: "Pekerjaan pasang keramik (contoh)", qty: 1, price: 0, unit: "borongan" }, { desc: "Pembersihan area kerja (contoh)", qty: 1, price: 0, unit: "paket" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", contractRef: "BAST-CONTOH-001", location: "Tasikmalaya", inspection: "Pekerjaan diperiksa bersama klien (contoh)", condition: "Diterima dengan catatan pemeriksaan (contoh)", effectiveDate: dateValue(today) } },
    "surat-perintah-bayar": { items: [{ desc: "Termin pekerjaan tahap 2 (contoh)", qty: 1, price: 2500000, unit: "termin" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", contractRef: "SPB-CONTOH-001", milestone: "Termin 2", progress: 50, contractValue: 10000000, previousPaid: 2500000, retention: 500000, paymentTerms: "Pembayaran setelah verifikasi dokumen pendukung (contoh)" } },
    "tagihan-termin": { items: [{ desc: "Pekerjaan sesuai progres tahap 2 (contoh)", qty: 1, price: 2500000, unit: "termin" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", contractRef: "TAG-TERM-CONTOH-001", milestone: "Termin 2", progress: 50, contractValue: 10000000, previousPaid: 2500000, retention: 500000, invoicePeriod: "Oktober 2026", paymentTerms: "Verifikasi progres dan kontrak sebelum pembayaran (contoh)" } },
    "berita-acara-progres": { items: [{ desc: "Pemasangan rangka atap (contoh)", qty: 1, price: 0, unit: "borongan" }, { desc: "Pengecatan tahap 1 (contoh)", qty: 1, price: 0, unit: "paket" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", contractRef: "BAP-CONTOH-001", milestone: "Termin 2", progress: 50, location: "Tasikmalaya", inspection: "Progres diperiksa bersama klien (contoh)", description: "Catatan pemeriksaan lapangan; validasi dengan kondisi sebenarnya." } },
    "lembar-data-faktur-pajak": { items: [{ desc: "Jasa layanan sebelum pajak (contoh)", qty: 1, price: 2500000 }], details: { taxId: "00.000.000.0-000.000", taxPeriod: "Oktober 2026 (simulasi)", taxType: "PPN — contoh internal", taxBase: 2500000, taxAmount: 275000, reference: "PAJAK-CONTOH-001", description: "Data simulasi internal; bukan faktur pajak resmi." } },
    "rekap-ppn-internal": { items: [{ desc: "Penjualan kena pajak (contoh)", qty: 1, price: 2500000 }, { desc: "Koreksi transaksi (contoh)", qty: 1, price: 0 }], details: { taxPeriod: "Oktober 2026 (simulasi)", taxType: "Rekap PPN internal", taxBase: 2500000, taxAmount: 275000, taxId: "00.000.000.0-000.000", description: "Rekap simulasi untuk pemeriksaan internal." } },
    "lembar-data-bukti-potong": { items: [], details: { taxId: "00.000.000.0-000.000", taxPeriod: "Oktober 2026 (simulasi)", taxType: "PPh — contoh internal", taxBase: 2500000, taxAmount: 50000, description: "Data simulasi internal; bukan bukti potong resmi." } },
    "checklist-dokumen-pajak": { items: [], details: { taxPeriod: "Oktober 2026 (simulasi)", taxType: "Pemeriksaan kelengkapan dokumen", authority: "Administrasi Keuangan", description: "Checklist simulasi: identitas, bukti transaksi, dokumen pendukung, dan hasil rekonsiliasi.", status: "Perlu verifikasi sebelum final (contoh)" } },
    /* Fase 4 — contoh lapangan untuk template baru */
    "nota-servis": { items: [{ desc: "Jasa servis & pembersihan (contoh)", qty: 1, price: 150000, unit: "unit" }, { desc: "Sparepart: kapasitor (contoh)", qty: 1, price: 85000, unit: "pcs" }], details: { reference: "SVC-CONTOH-001", complaint: "AC kurang dingin dan berbunyi (contoh)", action: "Pembersihan, isi freon, ganti kapasitor (contoh)", warranty: "Garansi 30 hari untuk jasa (contoh)", status: "Selesai diuji (contoh)" } },
    "rekap-upah-harian": { items: [{ desc: "Asep (contoh)", qty: 6, price: 120000, unit: "hari" }, { desc: "Ujang (contoh)", qty: 5, price: 120000, unit: "hari" }, { desc: "Dadan (contoh)", qty: 4, price: 130000, unit: "hari" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", period: "Minggu ke-2 Oktober 2026", location: "Tasikmalaya", approvedBy: "Dedi Kurnia (Contoh)" } },
    "bukti-kas": { items: [{ desc: "Penerimaan pembayaran material (contoh)", qty: 1, price: 1250000, unit: "transaksi" }], details: { reference: "BK-CONTOH-001", cashKind: "Kas masuk", party: "Toko Barokah (Contoh)", description: "Pembayaran sebagian tagihan material (contoh)." } },
    "proforma-invoice": { items: [{ desc: "Borongan pasang keramik 6 m² (contoh)", qty: 1, price: 900000, unit: "borongan" }, { desc: "Material pendukung (contoh)", qty: 1, price: 450000, unit: "paket" }], details: { reference: "PROF-CONTOH-001", subject: "Rancangan tagihan pekerjaan", validity: plusDays(14), paymentTerms: "DP 50% sebelum kerja (contoh)", description: "Nilai masih dapat berubah setelah pengukuran final." } },
    "perjanjian-borongan": { items: [{ desc: "Borongan pasang rangka & atap (contoh)", qty: 1, price: 12000000, unit: "borongan" }], details: { reference: "PB-CONTOH-001", contractRef: "KONTRAK-CONTOH-002", scope: "Rangka, atap, dan finishing (contoh)", location: "Tasikmalaya", contractValue: 12000000, effectiveDate: dateValue(today), endDate: plusDays(30), paymentTerms: "DP 30%, termin 40%, pelunasan 30% (contoh)" } },
    "perjanjian-sewa": { items: [], details: { reference: "PS-CONTOH-001", rentObject: "Mesin molen 1 unit (contoh)", period: "1 bulan (contoh)", effectiveDate: dateValue(today), endDate: plusDays(30), deposit: 1000000, paymentTerms: "Sewa dibayar di muka (contoh)", location: "Tasikmalaya" } },
    "manifest-pengiriman": { items: [{ desc: "Toko Barokah — Jl. Pasar Wetan No. 7 (contoh)", qty: 12, price: 0, unit: "RESI-CONTOH-001" }, { desc: "Warung Bu Iis — Cihideung (contoh)", qty: 8, price: 450000, unit: "RESI-CONTOH-002" }], details: { reference: "MF-CONTOH-001", period: "17 Oktober 2026", driver: "Asep (Contoh)", vehicle: "Pick-up (contoh)", origin: "Gudang UD Sumber Jaya", description: "Total 20 koli; resi kedua ditagih COD di tempat (contoh)." } },
    "berita-acara-selisih": { items: [{ desc: "Semen 50 kg pecah kemasan (contoh)", qty: 3, price: 0, unit: "sak" }, { desc: "Besi beton kurang hitung (contoh)", qty: 2, price: 0, unit: "batang" }], details: { reference: "BAS-CONTOH-001", invoiceRef: "SJ-CONTOH-001", discrepancy: "3 sak rusak, 2 batang kurang (contoh)", condition: "Kemasan pecah saat bongkar (contoh)", inspection: "Dihitung ulang bersama pengemudi (contoh)", followUp: "Diajukan klaim penggantian ke pengirim (contoh)" } },
    "laporan-harian-proyek": { items: [{ desc: "Semen masuk (contoh)", qty: 20, price: 0, unit: "sak" }, { desc: "Pekerjaan plester dinding (contoh)", qty: 25, price: 0, unit: "m²" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", location: "Tasikmalaya", period: "17 Oktober 2026", weather: "Cerah berawan (contoh)", workforce: "4 tukang, 2 kenek (contoh)", constraint: "Material besi belum datang (contoh)", description: "Pekerjaan berjalan sesuai rencana (contoh)." } },
    "surat-pengakuan-utang": { items: [{ desc: "Sisa utang material (contoh)", qty: 1, price: 4500000, unit: "tagihan" }], details: { reference: "SPU-CONTOH-001", contractRef: "PO-CONTOH-001", effectiveDate: dateValue(today), endDate: plusDays(60), paymentTerms: "Diangsur 3× tiap 20 hari (contoh)", description: "Utang disepakati tanpa paksaan (contoh)." } },
    "rekap-penjualan-harian": { items: [{ desc: "Omzet bersih hari ini (contoh)", qty: 1, price: 1300000, unit: "hari" }], details: { period: "17 Oktober 2026", cashKind: "Rekap kas harian", description: "Penjualan tunai 1.650.000 dikurangi kas keluar 350.000 (contoh).", approvedBy: "Dedi Kurnia (Contoh)" } },
    "kartu-piutang": { items: [{ desc: "Toko Barokah (contoh)", qty: 1, price: 1250000, unit: "INV-CONTOH-001" }, { desc: "Warung Bu Iis (contoh)", qty: 1, price: 640000, unit: "INV-CONTOH-002" }], details: { period: "Per 17 Oktober 2026", description: "Daftar tagihan yang belum lunas (contoh)." } },
    "nota-timbang": { items: [{ desc: "Gabah kering (contoh)", qty: 850, price: 6200, unit: "kg" }, { desc: "Jagung pipil (contoh)", qty: 320, price: 4800, unit: "kg" }], details: { reference: "NT-CONTOH-001", period: "17 Oktober 2026", description: "Potongan kadar air dibahas terpisah (contoh)." } },
    "rekap-omzet-pph-final": { items: [{ desc: "Omzet penjualan bulan berjalan (contoh)", qty: 1, price: 48500000, unit: "bulan" }], details: { taxPeriod: "Oktober 2026 (simulasi)", taxType: "PPh final UMKM — verifikasi tarif resmi", taxBase: 48500000, taxAmount: 242500, description: "Simulasi internal; tarif wajib diverifikasi ke sumber resmi." } },
    "mou": { items: [], details: { reference: "MOU-CONTOH-001", subject: "Minat kerja sama suplai material", scope: "Penjajakan ruang lingkup, harga, dan jadwal suplai (contoh)", effectiveDate: dateValue(today), endDate: plusDays(90), location: "Tasikmalaya" } }
  };
  const profile = sampleProfiles[sample.template];
  if (profile) {
    if (profile.items) sample.items = profile.items;
    if (profile.client) sample.client = { ...sample.client, ...profile.client };
    if (profile.payment) sample.payment = { ...sample.payment, ...profile.payment };
    if (profile.details) Object.assign(sample.details, profile.details);
  }

  if (sample.template === "kwitansi-a4") {
    sample.receivedFrom = "Toko Barokah (Contoh)";
    sample.forPayment = "Pembayaran borongan pasang keramik (contoh)";
    sample.amount = 900000;
  }
  if (sample.template === "struk-ansuran") {
    sample.contractNo = "KRD-CONTOH-001";
    sample.installmentNo = 3;
    sample.customerName = "Budi Santoso (Contoh)";
    sample.principal = 500000;
    sample.interest = 75000;
    sample.fine = 0;
    sample.installmentDue = plusDays(7);
    sample.remaining = 2500000;
  }

  /* Blok total: contoh diskon + PPN untuk dokumen penjualan/tagihan supaya keduanya
     benar-benar terbukti tampil di hasil render (sebelumnya selalu 0, sehingga
     diskon "hilang" saat dicek). Diskon 5% dari subtotal + PPN 11%. */
  const totalsTpl = getTemplate(sample.template) || {};
  if (printsTotals(totalsTpl) && TAXED_SAMPLE.has(sample.template)) {
    const subtotal = (sample.items || []).reduce((n, it) => n + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
    if (subtotal > 0) sample.discount = Math.round(subtotal * 0.05);
    sample.taxRate = 11;
  }
  return sample;
}

function renderExample() {
  const sample = buildExampleState(true);
  const tpl = renderDoc(sample);
  $("#out-hint").textContent = "CONTOH DATA FIKTIF · " + tpl.label + " · " + (tpl.category || "finance");
  $("#example-banner").hidden = false;
  ["#btn-print", "#btn-save-as", "#btn-wa"].forEach((sel) => { $(sel).disabled = true; });
  requestAnimationFrame(fitPreview);
}

function switchTab(tab) {
  const exampleMode = tab === "example";
  $("#workspace").dataset.tab = tab === "edit" ? "edit" : "preview";
  $("#tab-edit").classList.toggle("on", tab === "edit");
  $("#tab-preview").classList.toggle("on", tab === "preview");
  $("#tab-example").classList.toggle("on", exampleMode);
  const desktopExampleButton = $("#tab-example-desktop");
  desktopExampleButton.classList.toggle("primary", exampleMode);
  desktopExampleButton.setAttribute("aria-pressed", String(exampleMode));
  desktopExampleButton.textContent = exampleMode ? "Tutup Contoh" : "Lihat Contoh";

  if (exampleMode) {
    renderExample();
    return;
  }

  $("#example-banner").hidden = true;
  ["#btn-print", "#btn-save-as", "#btn-wa"].forEach((sel) => { $(sel).disabled = false; });
  render();
  if (tab === "preview") requestAnimationFrame(fitPreview);
}

/* ---------- boot ---------- */
async function boot() {
  /* load categories */
  try {
    if (backend.isRemote()) await backend.init();
    categoriesCache = await backend.getCategories();
  } catch (e) {
    console.warn("load categories gagal", e);
  }

  /* pastikan state.category terisi */
  if (!state.category) state.category = getCategory(state.template);
  // First-time workspace opens with realistic, editable sample data instead of a blank document.
  if (!hasStoredState) {
    state = buildExampleState(false);
    sampleDraftMode = true;
    sampleDraftPristine = true;
  }

  // Public landing/auth is the entry point; never expose the editor before session resolution.
  $("#workspace").hidden = backend.isRemote();
  $("#auth-modal").hidden = false;

  renderTemplatePicker();
  renderItems();
  render();

  if (backend.isRemote()) {
    backend.onAuthChange((s, event) => {
      /* Tautan reset password membuka app dengan sesi recovery: tampilkan form password baru. */
      if (event === "PASSWORD_RECOVERY") {
        openRecovery();
        return;
      }
      /* Jangan buka workspace saat sesi recovery belum diganti password baru. */
      if (recoveryPending) return;
      handleSession(s);
    });
    try {
      const s = await backend.getSession();
      if (bootRecovery) {
        /* Hash recovery bisa saja sudah diproses sebelum listener terpasang. */
        openRecovery();
      } else if (s) {
        handleSession(s);
        if (bootAuthError) toast("Tautan reset tidak valid atau sudah kedaluwarsa.");
      } else if (bootAuthError) {
        openAuth();
        setAuthMode("req");
        showAuthError("Tautan reset tidak valid atau sudah kedaluwarsa. " + bootAuthError);
      }
    } catch (e) {
      console.warn("backend init gagal", e);
    }
  }
}
boot();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
    .then((registration) => registration.update())
    .catch(() => {});
}

/* Keep the balance chip fresh after admin approves a top-up. */
if (backend.isRemote()) {
  const syncBilling = () => {
    if (remote.session && !document.hidden) refreshRemoteBilling();
  };
  window.setInterval(syncBilling, 20000);
  window.addEventListener("focus", syncBilling);
  document.addEventListener("visibilitychange", syncBilling);
}

