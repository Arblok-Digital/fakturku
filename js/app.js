import { TEMPLATES, getTemplate, renderDoc, getCategory } from "./modules/template-engine.js";
import {
  blankState, getPath, setPath, totals, saveCurrent, loadCurrent,
  listDrafts, saveDraft, deleteDraft, getDraft, PREFIX,
} from "./modules/invoice-engine.js";
import { terbilang, rupiah, formatDate, esc } from "./modules/format.js";
import { nextNumber, getPrefix, nextNumberByCategory } from "./modules/numbering.js";
import { printDoc, downloadImage, openWhatsApp } from "./modules/output.js";
import * as ledger from "./modules/credit-ledger.js";
import * as backend from "./modules/backend.js";

const storedState = loadCurrent();
const hasStoredState = Boolean(storedState);
let state = storedState || blankState("faktur-a4");
let sampleDraftMode = false;
let sampleDraftPristine = false;
let renderTimer = null;

/* remote billing cache (Supabase) */
const remote = { session: null, credits: null, trialCredits: null, balance: null, history: [], pending: null, packages: [] };

/* category cache */
let categoriesCache = [];

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

function currentCredits() {
  if (backend.isRemote()) return remote.credits ?? 0;
  return ledger.creditsLeft();
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
  const n = currentCredits();
  el.textContent = n > 0 ? `Kuota: ${n}` : "Kuota habis";
  el.title = `Sisa kuota lokal: ${n}`;
  el.classList.toggle("empty", n <= 0);
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => { render(); saveCurrent(state); scheduleCloudSync(); }, 120);
}

let syncTimer = null;
function scheduleCloudSync() {
  if (!backend.isRemote() || !remote.session) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { backend.saveInvoice(state).catch(() => {}); }, 1200);
}

function applySections(tpl) {
  document.querySelectorAll("[data-when]").forEach((el) => {
    el.hidden = !tpl.uses.includes(el.dataset.when);
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
  if (!state.items.length) state.items.push({ desc: "", qty: 1, price: 0 });
  renderItems();
  scheduleRender();
});

$("#btn-add-item").addEventListener("click", () => {
  state.items.push({ desc: "", qty: 1, price: 0 });
  renderItems();
  scheduleRender();
  const rows = $("#items-body").querySelectorAll("input[data-f='desc']");
  rows[rows.length - 1].focus();
});

/* ---------- compact template picker ---------- */
let activeFilter = "all";

function renderTemplatePicker() {
  const filterEl = $("#tpl-filter");
  const gridEl = $("#tpl-grid");
  const cats = categoriesCache.length ? categoriesCache : [
    { id: "finance", label: "Finance", icon: "💰" },
    { id: "legal", label: "Legal", icon: "⚖️" },
    { id: "umkm", label: "UMKM", icon: "🏪" },
    { id: "logistik", label: "Logistik", icon: "📦" },
    { id: "pajak", label: "Pajak", icon: "🧾" },
    { id: "proyek", label: "Proyek", icon: "🏗️" },
    { id: "operasional", label: "Operasional", icon: "📋" },
  ];
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
    const meta = categoriesCache.find((c) => c.id === (t.category || "finance"));
    const price = meta?.price_per_doc || 1000;
    return `<option value="${esc(t.id)}" ${state.template === t.id ? "selected" : ""}>${esc(t.label)} · ${rupiah(price)}/dok</option>`;
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

  // Saat memakai data contoh, bangun ulang sampel sesuai format yang dipilih.
  // Field khusus kuitansi, struk, dan dokumen bisnis ikut disesuaikan.
  if (sampleDraftMode && sampleDraftPristine) {
    state = buildExampleState(false);
    state.category = getCategory(newId);
  }

  renderTemplatePicker();
  renderItems();
  render();
  saveCurrent(state);
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
  toast("Dokumen kosong siap diisi");
});
$("#btn-new-fab").addEventListener("click", newDoc);

/* ---------- output & billing ---------- */
async function markIssued() {
  if (state.issued) return true;
  const category = state.category || getCategory(state.template);
  if (backend.isRemote()) {
    if (!remote.session) { openAuth(); return false; }
    let ok = false;
    try { ok = await backend.tryDebit(state.number, category, state.template, state); }
    catch { toast("Server tidak terhubung — coba lagi."); return false; }
    if (!ok) { openTopUp(); return false; }
    await refreshRemoteBilling();
    state.issued = true;
    saveCurrent(state);
    backend.saveInvoice(state).catch(() => {});
    render();
    return true;
  }
  if (!ledger.tryDebit(state.number, category)) { openTopUp(); return false; }
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
    : ledger.PACKAGES.map((p, i) => ({ ...p, id: String(i), label: `${p.credits} dokumen`, balance_amount: p.price }));
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
  $("#hist-list").innerHTML = hist.length
    ? hist.map((h) => {
        const monetary = h.reason === "topup" || h.reason === "issue";
        const plus = h.amount > 0;
        const label = h.ref === "TRIAL" || h.reason === "trial" ? "Trial gratis"
          : h.reason === "topup" ? "Top-up saldo"
          : h.reason === "issue" ? "Biaya dokumen"
          : plus ? "Saldo masuk" : "Ekspor dokumen";
        const amountLabel = monetary ? rupiah(Math.abs(h.amount)) : `${Math.abs(h.amount)} dokumen`;
        const d = new Date(h.at);
        const when = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) + " " +
          d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        const catMeta = h.category ? categoriesCache.find((c) => c.id === h.category) : null;
        const catBadge = catMeta
          ? `<span class="cat-badge-mini" style="background:${catMeta.color}22;color:${catMeta.color}">${catMeta.icon} ${esc(catMeta.label)}</span>`
          : "";
        return `<div class="hist-row">
          <span class="lbl">${label}${catBadge}${h.ref && h.ref !== "TRIAL" ? `<span class="sub">${esc(h.ref)} · ${when}</span>` : `<span class="sub">${when}</span>`}</span>
          <span class="amt ${plus ? "plus" : "minus"}">${plus ? "+" : ""}${amountLabel}</span>
          <span class="sisa">${h.sisa != null ? (monetary ? "saldo " + rupiah(h.sisa) : "sisa " + h.sisa) : ""}</span>
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
  ).join("");
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
  const n = currentCredits();
  if (backend.isRemote()) {
    $("#q-status").innerHTML = `Trial tersisa: <b id="q-n">${Number(remote.trialCredits) || 0}</b> · Saldo: <b>${rupiah(Number(remote.balance) || 0)}</b>`;
    $("#q-status").classList.toggle("empty", (Number(remote.trialCredits) || 0) <= 0 && (Number(remote.balance) || 0) <= 0);
  } else {
    $("#q-n").textContent = n;
    $("#q-status").classList.toggle("empty", n <= 0);
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
    : ledger.PACKAGES[Number(key)];
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
    toast("Top-up masuk — sisa kuota: " + ledger.creditsLeft());
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

function setAuthMode(mode) {
  authMode = mode;
  $("#auth-tab-in").classList.toggle("on", mode === "in");
  $("#auth-tab-up").classList.toggle("on", mode === "up");
  $("#auth-name-field").hidden = mode !== "up";
  $("#auth-title").textContent = mode === "in" ? "Masuk FakturKu" : "Daftar FakturKu";
  $("#auth-go").textContent = mode === "in" ? "Masuk" : "Daftar";
  const err = $("#auth-err");
  err.hidden = true;
  err.classList.remove("ok");
}

$("#auth-tab-in").addEventListener("click", () => setAuthMode("in"));
$("#auth-tab-up").addEventListener("click", () => setAuthMode("up"));

async function authSubmit() {
  const email = $("#auth-email").value.trim();
  const pass = $("#auth-pass").value;
  const name = $("#auth-name").value.trim();
  const err = $("#auth-err");
  err.hidden = true;
  err.classList.remove("ok");
  if (!email || !pass) { err.textContent = "Email & password wajib diisi."; err.hidden = false; return; }
  if (authMode === "up" && pass.length < 6) { err.textContent = "Password minimal 6 karakter."; err.hidden = false; return; }
  const go = $("#auth-go");
  const wasMode = authMode;
  go.disabled = true;
  go.textContent = "Memproses…";
  try {
    if (wasMode === "in") {
      await backend.signIn(email, pass);
    } else {
      await backend.signUp(email, pass, name);
      setAuthMode("in");
      err.textContent = "Pendaftaran OK. Kalau diminta konfirmasi email, buka link di email dulu, lalu masuk.";
      err.hidden = false;
      err.classList.add("ok");
    }
  } catch (e) {
    err.textContent = e?.message || "Gagal — coba lagi.";
    err.hidden = false;
  } finally {
    go.disabled = false;
    go.textContent = authMode === "in" ? "Masuk" : "Daftar";
  }
}
$("#auth-go").addEventListener("click", authSubmit);
$("#auth-email").addEventListener("keydown", (e) => { if (e.key === "Enter") authSubmit(); });
$("#auth-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") authSubmit(); });

async function refreshRemoteBilling() {
  try {
    const [billing, h, p] = await Promise.all([
      backend.billingState(), backend.history(), backend.pendingTopup(),
    ]);
    remote.credits = billing.credits;
    remote.trialCredits = billing.trialCredits;
    remote.balance = billing.balance;
    remote.history = h;
    remote.pending = p;
  } catch (e) {
    console.warn("billing refresh gagal", e);
    toast("Saldo belum tersinkron. Coba muat ulang.");
  }
  updateKuota();
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
   Panel ini murni UI. Wewenang sebenarnya dijaga server: semua RPC
   approve/reject memakai is_admin() di database. Di sini kita hanya
   memunculkan/menyembunyikan panel berdasarkan role sesi aktif. */
const adminModal = $("#admin-modal");
let adminAllowed = false;

function admEsc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function admWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })
    + " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function renderAdminRequests(rows) {
  $("#adm-list").innerHTML = rows.map((r) => {
    const who = r.profiles?.full_name || r.profiles?.role || String(r.user_id || "").slice(0, 8);
    const status = String(r.status || "");
    const canAct = status === "pending";
    return `<div class="admin-req">
      <div class="admin-req-top">
        <span class="admin-req-code">${admEsc(r.code)}</span>
        <span class="admin-chip ${admEsc(status)}">${admEsc(status || "—")}</span>
      </div>
      <div class="admin-req-line"><span>${admEsc(who)}</span><span>${Number(r.credits) || 0} dok &middot; Rp ${Number(r.price || 0).toLocaleString("id-ID")}</span></div>
      <div class="admin-req-line muted"><span>${admEsc(admWhen(r.created_at))}</span></div>
      ${canAct ? `<div class="admin-req-actions">
        <button class="btn primary" type="button" data-approve="${admEsc(r.code)}">Approve</button>
        <button class="btn" type="button" data-reject="${admEsc(r.code)}">Tolak</button>
      </div>` : ""}
    </div>`;
  }).join("");
  $("#adm-empty").hidden = rows.length > 0;
}

async function loadAdminPanel() {
  if (!adminAllowed) return;
  try {
    const [stats, reqs] = await Promise.all([backend.adminStats(), backend.adminPending()]);
    $("#adm-st-users").textContent = stats.users;
    $("#adm-st-invoices").textContent = stats.invoices;
    $("#adm-st-pending").textContent = stats.pending;
    renderAdminRequests(reqs);
    $("#adm-meta").textContent = "Diperbarui " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const count = reqs.filter((r) => r.status === "pending").length;
    const badge = $("#admin-count");
    badge.textContent = count;
    badge.hidden = count === 0;
  } catch (e) {
    console.warn("panel admin gagal dimuat", e);
    toast("Panel admin gagal dimuat.");
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
    adminModal.hidden = true;
    $("#adm-list").innerHTML = "";
    $("#admin-count").hidden = true;
  } else {
    await loadAdminPanel();
  }
}

$("#btn-admin").addEventListener("click", () => {
  if (!adminAllowed) return;
  adminModal.hidden = false;
  loadAdminPanel();
});
$("#adm-close").addEventListener("click", () => { adminModal.hidden = true; });
$("#adm-refresh").addEventListener("click", loadAdminPanel);
adminModal.addEventListener("click", (e) => { if (e.target === adminModal) adminModal.hidden = true; });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !adminModal.hidden) adminModal.hidden = true;
});

$("#adm-list").addEventListener("click", async (e) => {
  const approve = e.target.dataset?.approve;
  const reject = e.target.dataset?.reject;
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

/* ---------- mobile tabs + filled template example ---------- */
$("#tab-edit").addEventListener("click", () => switchTab("edit"));
$("#tab-preview").addEventListener("click", () => switchTab("preview"));
$("#tab-example").addEventListener("click", () => switchTab("example"));
$("#tab-example-desktop").addEventListener("click", () => switchTab($("#workspace").dataset.tab === "preview" && $("#example-banner").hidden === false ? "preview" : "example"));

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
    name: "PT Nusantara Karya (Contoh)",
    address: "Jl. HZ Mustofa No. 88, Tasikmalaya",
    npwp: "00.000.000.0-000.000",
    phone: "(0265) 000000",
    email: "admin@example.test"
  };
  sample.client = {
    name: "CV Mitra Sejahtera (Contoh)",
    address: "Jl. Contoh Usaha No. 12, Tasikmalaya",
    npwp: "00.000.000.0-000.000",
    phone: "(0265) 111111"
  };
  sample.items = [
    { desc: "Jasa / barang contoh", qty: 2, price: 750000 },
    { desc: "Biaya pendukung (contoh)", qty: 1, price: 250000 }
  ];
  sample.discount = 0;
  sample.taxRate = 0;
  sample.payment = {
    bank: "Bank Contoh",
    accountNo: "0000000000",
    accountName: "PT Nusantara Karya (Contoh)",
    method: "Transfer bank (contoh)"
  };
  sample.terms = "Contoh syarat: ruang lingkup dan jadwal mengikuti kesepakatan tertulis para pihak. Ganti klausul ini sesuai kebutuhan.";
  sample.signatures = {
    maker: { name: "Andi Pratama (Contoh)", title: "Administrasi" },
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
    employee: "Siti Rahma (Contoh)",
    employeeId: "KARYAWAN-CONTOH-001",
    position: "Staf Administrasi",
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
    requestedBy: "Andi Pratama (Contoh)",
    approvedBy: "Budi Santoso (Contoh)",
    deliveryDate: plusDays(3),
    supplier: "PT Pemasok Contoh",
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
    "faktur-a4": { items: [{ desc: "Jasa pengembangan sistem (contoh)", qty: 1, price: 2500000 }, { desc: "Pemeliharaan bulan berjalan (contoh)", qty: 1, price: 500000 }] },
    "invoice-digital": { items: [{ desc: "Paket layanan digital (contoh)", qty: 1, price: 1250000 }, { desc: "Dukungan teknis (contoh)", qty: 2, price: 250000 }] },
    "kwitansi-a4": { items: [{ desc: "Pembayaran jasa tahap pertama (contoh)", qty: 1, price: 1750000 }], details: { subject: "Bukti penerimaan pembayaran", description: "Pembayaran jasa tahap pertama (contoh)" } },
    "struk-ansuran": { items: [{ desc: "Pembayaran angsuran ke-3 (contoh)", qty: 1, price: 575000 }], details: { subject: "Bukti pembayaran angsuran", description: "Simulasi pembayaran angsuran kendaraan" } },
    "credit-note": { items: [{ desc: "Koreksi jumlah barang pada invoice (contoh)", qty: 1, price: 250000 }], details: { subject: "Koreksi tagihan", reason: "Penyesuaian jumlah barang (contoh)", description: "Pengurangan nilai tagihan sebelumnya (simulasi)" } },
    "debit-note": { items: [{ desc: "Biaya tambahan sesuai kesepakatan (contoh)", qty: 1, price: 300000 }], details: { subject: "Penyesuaian nilai tagihan", reason: "Biaya tambahan terverifikasi (contoh)", description: "Penambahan nilai tagihan sebelumnya (simulasi)" } },
    "surat-tagihan": { items: [{ desc: "Pekerjaan sesuai pesanan (contoh)", qty: 1, price: 3200000 }], details: { subject: "Permohonan penyelesaian pembayaran", period: "Oktober 2026", paymentTerms: "Mohon dibayar dalam 14 hari (contoh)" } },
    "invoice-berulang": { items: [{ desc: "Layanan berlangganan bulanan (contoh)", qty: 1, price: 450000 }], details: { period: "Oktober 2026", paymentTerms: "Pembayaran untuk periode berjalan (contoh)" } },
    "nota-kontan": { items: [{ desc: "Kopi arabika 250 g (contoh)", qty: 2, price: 65000 }, { desc: "Gula aren 500 g (contoh)", qty: 1, price: 28000 }] },
    "surat-penawaran": { items: [{ desc: "Paket desain identitas usaha (contoh)", qty: 1, price: 1800000 }, { desc: "Paket materi promosi (contoh)", qty: 1, price: 900000 }], details: { subject: "Penawaran layanan kreatif", validity: plusDays(30), paymentTerms: "DP 50%, pelunasan setelah pekerjaan selesai (contoh)" } },
    "surat-pesanan": { items: [{ desc: "Kertas A4 80 gsm (contoh)", qty: 10, price: 55000 }, { desc: "Tinta printer (contoh)", qty: 4, price: 85000 }], details: { reference: "PO-CONTOH-001", deliveryDate: plusDays(3), paymentTerms: "Pembayaran sesuai kesepakatan (contoh)" } },
    "struk-pos": { items: [{ desc: "Kopi susu", qty: 2, price: 18000 }, { desc: "Roti bakar", qty: 1, price: 22000 }], client: { name: "Pelanggan Umum (Contoh)", address: "Pembelian langsung", npwp: "", phone: "" }, payment: { bank: "", accountNo: "", accountName: "", method: "QRIS (contoh)" } },
    "daftar-harga": { items: [{ desc: "Jasa konsultasi per jam (contoh)", qty: 1, price: 150000 }, { desc: "Paket dukungan bulanan (contoh)", qty: 1, price: 750000 }], details: { subject: "Daftar harga layanan", period: "Oktober 2026", validity: plusDays(30) } },
    "surat-jalan": { items: [{ desc: "Perangkat komputer (contoh)", qty: 3, price: 0 }, { desc: "Kabel jaringan (contoh)", qty: 10, price: 0 }], details: { reference: "SJ-CONTOH-001", origin: "Gudang Tasikmalaya", destination: "Kantor pelanggan, Tasikmalaya", driver: "Dedi (Contoh)", vehicle: "Mobil boks (contoh)", condition: "Barang dikemas dengan baik (contoh)", unit: "unit", deliveryDate: plusDays(1) } },
    "bukti-terima-barang": { items: [{ desc: "Perangkat komputer (contoh)", qty: 3, price: 0 }, { desc: "Kabel jaringan (contoh)", qty: 10, price: 0 }], details: { reference: "BTB-CONTOH-001", condition: "Baik, kemasan utuh (contoh)", inspection: "Jumlah dan kondisi diperiksa (contoh)", location: "Gudang penerima, Tasikmalaya", unit: "unit" } },
    "surat-retur": { items: [{ desc: "Monitor rusak saat diterima (contoh)", qty: 1, price: 0 }], details: { reference: "RETUR-CONTOH-001", returnReason: "Layar tidak menyala saat pemeriksaan (contoh)", condition: "Menunggu penggantian pemasok (contoh)", origin: "Gudang penerima", destination: "Gudang pemasok" } },
    "packing-list": { items: [{ desc: "Perangkat komputer", qty: 3, price: 0 }, { desc: "Kabel jaringan", qty: 10, price: 0 }], details: { reference: "PL-CONTOH-001", packing: "3 karton + 1 paket kabel", origin: "Gudang Tasikmalaya", destination: "Kantor pelanggan", vehicle: "Ekspedisi (contoh)", unit: "unit" } },
    "perjanjian-kerja-sama": { items: [], details: { reference: "PKS-CONTOH-001", subject: "Kerja sama penyediaan layanan", contractDate: dateValue(today), scope: "Penyediaan layanan dan dukungan sesuai ruang lingkup tertulis (contoh)", effectiveDate: dateValue(today), endDate: plusDays(365), location: "Tasikmalaya" }, terms: "Contoh kerangka: ruang lingkup, hak, kewajiban, masa berlaku, dan penyelesaian perselisihan perlu ditinjau serta disepakati para pihak sebelum ditandatangani." },
    "surat-kuasa": { items: [], details: { reference: "SK-CONTOH-001", subject: "Kuasa pengambilan dokumen", recipientRole: "Penerima kuasa (contoh)", scope: "Mengambil dokumen administrasi yang disebutkan secara spesifik (contoh)", effectiveDate: dateValue(today), endDate: plusDays(7), witness: "Saksi (contoh)" }, terms: "Contoh kerangka surat kuasa. Isi identitas dan batas kewenangan secara akurat serta periksa persyaratan penerima dokumen." },
    "spk": { items: [{ desc: "Pekerjaan instalasi dan konfigurasi (contoh)", qty: 1, price: 6500000 }], details: { reference: "SPK-CONTOH-001", contractRef: "KONTRAK-CONTOH-001", scope: "Instalasi, pengujian, dan serah terima pekerjaan (contoh)", location: "Tasikmalaya", effectiveDate: dateValue(today), endDate: plusDays(14), paymentTerms: "Pembayaran berdasarkan progres yang disetujui (contoh)" } },
    "loi": { items: [], details: { reference: "LOI-CONTOH-001", subject: "Minat kerja sama layanan digital", scope: "Penjajakan ruang lingkup, jadwal, dan estimasi biaya (contoh)", effectiveDate: dateValue(today), endDate: plusDays(30), location: "Tasikmalaya" }, terms: "Contoh pernyataan minat awal; bukan pengganti kontrak final. Tinjau konsekuensi dan ketentuan yang disepakati sebelum digunakan." },
    "surat-pernyataan": { items: [], details: { reference: "SP-CONTOH-001", subject: "Pernyataan penerimaan barang", reason: "Keperluan administrasi (contoh)", location: "Tasikmalaya" }, terms: "Saya menyatakan bahwa informasi yang dicantumkan akan diisi sesuai keadaan sebenarnya. Teks ini hanya contoh dan perlu disesuaikan dengan fakta." },
    "memo-internal": { items: [], details: { subject: "Jadwal pemeliharaan sistem", authority: "Operasional", description: "Pemeliharaan dijadwalkan di luar jam layanan. Koordinasikan dampak dan jadwal dengan tim terkait (contoh).", requestedBy: "Koordinator Operasional (Contoh)" } },
    "surat-perjalanan-dinas": { items: [], details: { employee: "Siti Rahma (Contoh)", employeeId: "KARYAWAN-CONTOH-001", position: "Staf Administrasi", department: "Operasional", location: "Bandung", period: "20–21 Oktober 2026 (contoh)", reason: "Koordinasi pekerjaan dan serah terima dokumen (contoh)", budget: 750000 } },
    "klaim-biaya": { items: [{ desc: "Transportasi lokal (contoh)", qty: 1, price: 125000 }, { desc: "Konsumsi rapat (contoh)", qty: 1, price: 85000 }], details: { employee: "Siti Rahma (Contoh)", employeeId: "KARYAWAN-CONTOH-001", department: "Operasional", period: "Oktober 2026", reason: "Pengeluaran tugas dinas (contoh)", approvedBy: "Manajer Operasional (Contoh)" } },
    "purchase-order": { items: [{ desc: "Kertas A4 80 gsm (contoh)", qty: 10, price: 55000 }, { desc: "Tinta printer (contoh)", qty: 4, price: 85000 }], details: { reference: "PO-CONTOH-001", supplier: "PT Pemasok Contoh", requestedBy: "Andi Pratama (Contoh)", approvedBy: "Budi Santoso (Contoh)", deliveryDate: plusDays(5), location: "Gudang Tasikmalaya", paymentTerms: "Pembayaran sesuai invoice dan penerimaan (contoh)", budget: 900000 } },
    "slip-gaji": { items: [], details: { employee: "Siti Rahma (Contoh)", employeeId: "KARYAWAN-CONTOH-001", position: "Staf Administrasi", department: "Operasional", period: "Oktober 2026", baseSalary: 4500000, allowances: 500000, deductions: 100000, netPay: 4900000, bankRef: "TRX-GAJI-CONTOH-001" } },
    "rab": { items: [{ desc: "Material pekerjaan (contoh)", qty: 1, price: 3500000 }, { desc: "Tenaga kerja (contoh)", qty: 1, price: 2000000 }, { desc: "Transportasi dan alat (contoh)", qty: 1, price: 500000 }], details: { project: "Renovasi ruang kerja (Contoh)", location: "Tasikmalaya", contractRef: "RAB-CONTOH-001", contractValue: 6000000, description: "Estimasi awal untuk perencanaan; bukan penawaran final." } },
    "bast": { items: [{ desc: "Instalasi jaringan lokal (contoh)", qty: 1, price: 0 }, { desc: "Pengujian koneksi (contoh)", qty: 1, price: 0 }], details: { project: "Instalasi jaringan kantor (Contoh)", contractRef: "BAST-CONTOH-001", location: "Tasikmalaya", inspection: "Pengujian dasar selesai (contoh)", condition: "Diterima dengan catatan pemeriksaan (contoh)", effectiveDate: dateValue(today) } },
    "surat-perintah-bayar": { items: [{ desc: "Termin pekerjaan tahap 2 (contoh)", qty: 1, price: 2500000 }], details: { project: "Instalasi jaringan kantor (Contoh)", contractRef: "SPB-CONTOH-001", milestone: "Termin 2", progress: 50, contractValue: 10000000, previousPaid: 2500000, retention: 500000, paymentTerms: "Pembayaran setelah verifikasi dokumen pendukung (contoh)" } },
    "tagihan-termin": { items: [{ desc: "Pekerjaan sesuai progres tahap 2 (contoh)", qty: 1, price: 2500000 }], details: { project: "Instalasi jaringan kantor (Contoh)", contractRef: "TAG-TERM-CONTOH-001", milestone: "Termin 2", progress: 50, contractValue: 10000000, previousPaid: 2500000, retention: 500000, invoicePeriod: "Oktober 2026", paymentTerms: "Verifikasi progres dan kontrak sebelum pembayaran (contoh)" } },
    "berita-acara-progres": { items: [{ desc: "Pemasangan perangkat (contoh)", qty: 1, price: 0 }, { desc: "Pengujian dan dokumentasi (contoh)", qty: 1, price: 0 }], details: { project: "Instalasi jaringan kantor (Contoh)", contractRef: "BAP-CONTOH-001", milestone: "Termin 2", progress: 50, location: "Tasikmalaya", inspection: "Progres diperiksa bersama (contoh)", description: "Catatan pemeriksaan lapangan; validasi dengan kondisi sebenarnya." } },
    "lembar-data-faktur-pajak": { items: [{ desc: "Jasa layanan sebelum pajak (contoh)", qty: 1, price: 2500000 }], details: { taxId: "00.000.000.0-000.000", taxPeriod: "Oktober 2026 (simulasi)", taxType: "PPN — contoh internal", taxBase: 2500000, taxAmount: 275000, reference: "PAJAK-CONTOH-001", description: "Data simulasi internal; bukan faktur pajak resmi." } },
    "rekap-ppn-internal": { items: [{ desc: "Penjualan kena pajak (contoh)", qty: 1, price: 2500000 }, { desc: "Koreksi transaksi (contoh)", qty: 1, price: 0 }], details: { taxPeriod: "Oktober 2026 (simulasi)", taxType: "Rekap PPN internal", taxBase: 2500000, taxAmount: 275000, taxId: "00.000.000.0-000.000", description: "Rekap simulasi untuk pemeriksaan internal." } },
    "lembar-data-bukti-potong": { items: [], details: { taxId: "00.000.000.0-000.000", taxPeriod: "Oktober 2026 (simulasi)", taxType: "PPh — contoh internal", taxBase: 2500000, taxAmount: 50000, description: "Data simulasi internal; bukan bukti potong resmi." } },
    "checklist-dokumen-pajak": { items: [], details: { taxPeriod: "Oktober 2026 (simulasi)", taxType: "Pemeriksaan kelengkapan dokumen", authority: "Administrasi Keuangan", description: "Checklist simulasi: identitas, bukti transaksi, dokumen pendukung, dan hasil rekonsiliasi.", status: "Perlu verifikasi sebelum final (contoh)" } }
  };
  const profile = sampleProfiles[sample.template];
  if (profile) {
    if (profile.items) sample.items = profile.items;
    if (profile.client) sample.client = { ...sample.client, ...profile.client };
    if (profile.payment) sample.payment = { ...sample.payment, ...profile.payment };
    if (profile.details) Object.assign(sample.details, profile.details);
    if (profile.terms) sample.terms = profile.terms;
  }

  if (sample.template === "kwitansi-a4") {
    sample.receivedFrom = "CV Mitra Sejahtera (Contoh)";
    sample.forPayment = "Pembayaran jasa tahap pertama (contoh)";
    sample.amount = 1750000;
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
    backend.onAuthChange((s) => { handleSession(s); });
    try {
      const s = await backend.getSession();
      if (s) handleSession(s);
    } catch (e) {
      console.warn("backend init gagal", e);
    }
  }
}
boot();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
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

