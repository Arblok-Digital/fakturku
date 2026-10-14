import { TEMPLATES, getTemplate, renderDoc, getCategory } from "./modules/template-engine.js";
import {
  blankState, getPath, setPath, totals, saveCurrent, loadCurrent,
  listDrafts, saveDraft, deleteDraft, getDraft, PREFIX,
} from "./modules/invoice-engine.js";
import { terbilang, rupiah, formatDate, esc } from "./modules/format.js";
import { nextNumber, getPrefix, nextNumberByCategory, peekNumberByCategory } from "./modules/numbering.js";
import { printDoc, saveImage, openWhatsApp } from "./modules/output.js";
import * as ledger from "./modules/credit-ledger.js";
import * as backend from "./modules/backend.js";

let state = loadCurrent() || blankState("faktur-a4");
let renderTimer = null;

/* remote billing cache (Supabase) */
const remote = { session: null, trialCredits: null, balance: null, history: [], pending: null };

/* category cache */
let categoriesCache = [];
let authMode = "up";
let lastUid = null;
let sessionHandled = false;
let customFormTemplate = null;

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
  if (customFormTemplate !== tpl.id) {
    renderCustomFields(tpl);
    customFormTemplate = tpl.id;
  }
  applySections(tpl);
  syncBoundInputs();
  const cat = state.category || getCategory(state.template);
  const catMeta = categoriesCache.find((c) => c.id === cat);
  const catLabel = catMeta ? `${catMeta.icon} ${catMeta.label}` : cat;
  $("#out-hint").textContent =
    `${tpl.label} · ${catLabel} · ${state.issued ? "Terbit · ekspor ulang gratis" : "Draft"}`;
  const terb = $("#terbilang-preview");
  if (terb) terb.textContent = terbilang(Number(state.amount) || 0);
  updateKuota();
  fitPreview();
}

function updateKuota() {
  const el = $("#kuota");
  const billing = backend.isRemote()
    ? { trialCredits: remote.trialCredits, balance: remote.balance }
    : ledger.billingState();
  if (billing.trialCredits === null || billing.balance === null) {
    el.textContent = "Saldo: memuat…";
    el.classList.remove("empty");
    return;
  }
  el.textContent = billing.trialCredits > 0
    ? `Gratis: ${billing.trialCredits}`
    : `Saldo: ${rupiah(billing.balance)}`;
  el.title = `Dokumen gratis tersisa: ${billing.trialCredits} · Saldo: ${rupiah(billing.balance)}`;
  el.classList.toggle("empty", billing.trialCredits <= 0 && billing.balance <= 0);
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => { render(); saveCurrent(state); scheduleCloudSync(); }, 120);
}

let syncTimer = null;
let lastSyncWarnAt = 0;
function scheduleCloudSync() {
  if (!backend.isRemote() || !remote.session) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    backend.saveInvoice(state).catch((e) => {
      console.warn("cloud sync gagal (tersimpan lokal)", e);
      // Visible sync-failed status (throttled to avoid toast spam on every keystroke).
      const now = Date.now();
      if (now - lastSyncWarnAt > 15000) {
        lastSyncWarnAt = now;
        toast("Sinkron cloud gagal — tersimpan lokal, akan dicoba lagi.");
      }
    });
  }, 1200);
}

function applySections(tpl) {
  document.querySelectorAll("[data-when]").forEach((el) => {
    if (el.dataset.when === "sign") {
      // Template klasik selalu butuh tanda tangan; business-template ikut flag signature.
      el.hidden = tpl.signature === false;
      return;
    }
    el.hidden = !tpl.uses.includes(el.dataset.when);
  });
}

function renderCustomFields(tpl) {
  const fields = tpl.fields || [];
  $("#custom-fields-title").textContent = tpl.formTitle || "Detail Dokumen";
  $("#custom-fields").innerHTML = fields.map((field) => {
    const id = `f-custom-${tpl.id}-${field.id}`;
    const bind = `custom.${tpl.id}.${field.id}`;
    const placeholder = field.placeholder ? ` placeholder="${esc(field.placeholder)}"` : "";
    const inputType = field.type === "date" || field.type === "datetime-local"
      ? field.type
      : field.type === "money" || field.type === "number" ? "number" : "text";
    const input = field.type === "textarea"
      ? `<textarea id="${id}" rows="3" data-bind="${bind}"${placeholder}></textarea>`
      : `<input id="${id}" type="${inputType}"
          ${field.type === "money" ? 'min="0" step="1" inputmode="numeric"' : field.type === "number" ? 'min="0" step="any"' : ""} data-bind="${bind}"${placeholder}>`;
    return `<div class="field"><label for="${id}">${esc(field.label)}</label>${input}</div>`;
  }).join("");
}

/* ---------- accordion sections ---------- */
function initAccordion() {
  editor.querySelectorAll(".fsec-header").forEach((header) => {
    header.addEventListener("click", () => {
      const fsec = header.closest(".fsec");
      const isOpen = fsec.hasAttribute("open");
      fsec.toggleAttribute("open", !isOpen);
    });
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
  const el = e.target;
  if (el.dataset.bind) {
    let v;
    if (el.type === "checkbox") v = el.checked;
    else if (el.type === "number") {
      v = el.value === "" ? (el.closest("#custom-fields") ? "" : 0) : Number(el.value);
    }
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
    <tr>
      <td><input type="text" data-idx="${i}" data-f="desc" value="${esc(it.desc || "")}" placeholder="Uraian barang/jasa" aria-label="Uraian baris ${i + 1}"></td>
      <td><input class="num" type="number" min="0" data-idx="${i}" data-f="qty" value="${Number(it.qty) || 0}" aria-label="Qty baris ${i + 1}"></td>
      <td><input class="num" type="number" min="0" data-idx="${i}" data-f="price" value="${Number(it.price) || 0}" aria-label="Harga satuan baris ${i + 1}"></td>
      <td><input class="num is-total" type="text" readonly tabindex="-1" data-total="${i}" value="${rupiah((Number(it.qty) || 0) * (Number(it.price) || 0))}" aria-label="Jumlah baris ${i + 1} (otomatis)"></td>
      <td><button class="del" type="button" data-del="${i}" title="Hapus">&times;</button></td>
    </tr>`).join("");
  const t = totals(state);
  $("#items-sum").textContent = "Subtotal: " + rupiah(t.subtotal);
}

$("#items-body").addEventListener("input", (e) => {
  const el = e.target;
  if (!el.dataset.f) return;
  const i = Number(el.dataset.idx);
  state.items[i][el.dataset.f] = el.type === "number" ? (el.value === "" ? 0 : Number(el.value)) : el.value;
  const row = el.closest("tr");
  const totalEl = row && row.querySelector("[data-total]");
  if (totalEl) totalEl.value = rupiah((Number(state.items[i].qty) || 0) * (Number(state.items[i].price) || 0));
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

/* ---------- template picker ---------- */
let activeFilter = null;

function renderTemplatePicker() {
  const template = getTemplate(state.template);
  const category = template.category || getCategory(template.id);
  const meta = categoriesCache.find((c) => c.id === category);
  const icon = $("#tpl-current-icon");
  icon.textContent = meta?.icon || "📄";
  icon.style.setProperty("--category-color", meta?.color || "#16324F");
  $("#tpl-current-name").textContent = template.label;
  $("#tpl-current-meta").textContent = meta?.label || category;
  $("#btn-open-tpl-picker").setAttribute(
    "aria-label",
    `Ubah template dokumen. ${template.label}, kategori ${meta?.label || category}.`
  );
}

function switchTemplate(newId) {
  if (!state.numbers) state.numbers = {};
  state.numbers[state.template] = state.number;
  state.template = newId;
  state.category = getCategory(newId);
  if (state.numbers[newId]) {
    state.number = state.numbers[newId];
  } else {
    // Preview/template-switch must NOT consume a number: peek only.
    // A number is reserved (counter increment) solely via nextNumberByCategory()
    // at actual issue time (see markIssued / newDoc paths).
    state.number = peekNumberByCategory(state.category);
    state.numbers[newId] = state.number;
  }
  renderTemplatePicker();
  render();
  saveCurrent(state);
}

/* ---------- drafts (sheet) ---------- */

/* ---------- new doc ---------- */
function newDoc() {
  if (!confirm("Buat dokumen baru? Dokumen sekarang tetap tersimpan sebagai draft terakhir.")) return;
  saveCurrent(state);
  state = blankState(state.template);
  renderTemplatePicker();
  renderItems(); render();
  saveCurrent(state);
  toast("Dokumen baru dibuat");
}


/* ---------- output & billing ---------- */
async function markIssued() {
  if (state.issued) return true;
  const category = state.category || getCategory(state.template);
  if (backend.isRemote()) {
    if (!remote.session) { openAuthSheet(); return false; }
    if (remote.trialCredits === null || remote.balance === null) {
      await refreshRemoteBilling();
      if (remote.trialCredits === null || remote.balance === null) {
        toast("Saldo belum berhasil dimuat — coba lagi.");
        return false;
      }
    }
    const categoryPrice = Number(categoriesCache.find((c) => c.id === category)?.price_per_doc) || 0;
    if (remote.trialCredits <= 0 && (categoryPrice <= 0 || remote.balance < categoryPrice)) {
      openBillingSheet();
      return false;
    }
    const priceText = remote.trialCredits > 0
      ? `Dokumen ini memakai 1 dari ${remote.trialCredits} dokumen gratis yang tersisa. Saldo tidak dipotong.`
      : `Biaya terbit ${rupiah(categoryPrice)}. Saldo setelah terbit: ${rupiah(remote.balance - categoryPrice)}.`;
    if (!confirm(`${priceText}\n\nTerbitkan sekarang? Jika proses cetak atau berbagi dibatalkan/gagal, biaya tetap berlaku. Terbit ulang dokumen yang sama gratis.`)) return false;
    let ok = false;
    try { ok = await backend.tryDebit(state.number, category, state); }
    catch (e) {
      console.warn("penerbitan ditolak", e);
      toast(e?.message || "Gagal menerbitkan dokumen — coba lagi.");
      return false;
    }
    if (!ok) { openBillingSheet(); return false; }
    await refreshRemoteBilling();
    state.issued = true;
    saveCurrent(state);
    render();
    return true;
  }
  const trialCredits = ledger.creditsLeft();
  if (trialCredits <= 0) { openBillingSheet(); return false; }
  if (!confirm(`Dokumen ini memakai 1 dari ${trialCredits} dokumen gratis yang tersisa.\n\nTerbitkan sekarang? Jika proses cetak atau berbagi dibatalkan/gagal, jatah trial tetap terpakai.`)) return false;
  if (!ledger.tryDebit(state.number, category)) { openBillingSheet(); return false; }
  state.issued = true;
  saveCurrent(state);
  render();
  return true;
}

// NOTE: quota is debited ONLY by explicit user action via markIssued()
// (Print / Image / WA buttons). afterprint must NOT auto-debit: browsers fire
// it after both successful prints AND cancelled dialogs, so debiting here
// would consume quota on cancel and double-debit on re-print.
window.addEventListener("afterprint", () => {
  saveCurrent(state);
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
    `${state.issuer.name || "—"} — ${getTemplate(state.template).label}`,
    `No: ${state.number}`,
    `Tanggal: ${formatDate(state.date)}`,
  ];
  if (state.client.name) lines.push(`Kepada: ${state.client.name}`);
  if (state.receivedFrom) lines.push(`Terima dari: ${state.receivedFrom}`);
  if (state.forPayment) lines.push(`Untuk: ${state.forPayment}`);
  if (state.contractNo) lines.push(`Kontrak: ${state.contractNo} (angsuran ke-${state.installmentNo})`);
  state.items.filter((i) => i.desc).forEach((i) =>
    lines.push(`• ${i.desc} x${i.qty} = ${rupiah((Number(i.qty) || 0) * (Number(i.price) || 0))}`));
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

$("#btn-image").addEventListener("click", async () => {
  const hint = $("#out-hint");
  if (!(await markIssued())) return;
  try {
    toast("Menyiapkan gambar…");
    if (hint) hint.textContent = "Menyiapkan JPEG…";
    await saveImage(docEl, `fakturku-${safeName(state.number)}.jpg`);
    toast("JPEG tersimpan — lampirkan ke chat WA/Telegram");
    if (hint) hint.textContent = "JPEG tersimpan.";
  } catch {
    toast("Gagal membuat gambar. Coba tombol Print.");
    if (hint) hint.textContent = "Gagal membuat JPEG.";
  }
});

$("#btn-wa").addEventListener("click", async () => {
  // Buka WA dulu dalam handler klik agar tidak diblokir popup-blocker,
  // lalu pastikan kuota diterbitkan.
  const text = buildSummary();
  openWhatsApp(text);
  if (!(await markIssued())) return;
  toast("WhatsApp terbuka — JPEG bisa disimpan via tombol Simpan JPEG");
});

/* ---------- billing & auth ---------- */
async function refreshRemoteBilling() {
  const prevBalance = remote.balance;
  try {
    const [billing, h, p] = await Promise.all([
      backend.billingState(), backend.history(), backend.pendingTopup(),
    ]);
    remote.trialCredits = billing.trialCredits;
    remote.balance = billing.balance;
    remote.history = h;
    remote.pending = p;
    if (prevBalance != null && billing.balance > prevBalance) {
      toast(`Top-up masuk: saldo ${rupiah(prevBalance)} → ${rupiah(billing.balance)}`);
    }
  } catch (e) {
    console.warn("billing refresh gagal", e);
    toast("Saldo gagal dimuat — coba lagi.");
  }
  updateKuota();
}

// Polling ringan: kejar top-up yang di-approve admin di sesi lain.
setInterval(() => {
  if (backend.isRemote() && remote.session && !document.hidden) refreshRemoteBilling();
}, 20000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && backend.isRemote() && remote.session) refreshRemoteBilling();
});

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
    closeAuthSheet();
    await refreshRemoteBilling();
    toast("Terhubung sebagai " + email);
  } else {
    $("#auth-avatar").textContent = "?";
    btn.title = "Masuk";
    remote.trialCredits = null;
    remote.balance = null;
    remote.history = [];
    remote.pending = null;
    updateKuota();
    openAuthSheet();
  }
}

/* ---------- bottom sheets ---------- */
const tplSheet = $("#tpl-sheet");
const billingSheet = $("#billing-sheet");
const authSheet = $("#auth-sheet");
const draftsSheet = $("#drafts-sheet");

function closeAllSheets() {
  [tplSheet, billingSheet, authSheet, draftsSheet].forEach(s => s.hidden = true);
}

function openSheet(sheet) {
  closeAllSheets();
  sheet.hidden = false;
}

// Template Picker Sheet
$("#btn-open-tpl-picker").addEventListener("click", () => {
  activeFilter = getCategory(state.template);
  renderTemplatePickerSheet();
  openSheet(tplSheet);
});

$("#tpl-sheet-category").addEventListener("change", (e) => {
  activeFilter = e.target.value;
  renderTemplatePickerSheet();
});

function renderTemplatePickerSheet() {
  const categoryEl = $("#tpl-sheet-category");
  const resultsEl = $("#tpl-sheet-results");
  const gridEl = $("#tpl-sheet-grid");
  const fallbackCategories = [
    { id: "finance", label: "Finance", icon: "💰" },
    { id: "legal", label: "Legal", icon: "⚖️" },
    { id: "umkm", label: "UMKM", icon: "🏪" },
    { id: "logistik", label: "Logistik", icon: "📦" },
    { id: "pajak", label: "Pajak", icon: "🧾" },
    { id: "proyek", label: "Proyek", icon: "🏗️" },
    { id: "operasional", label: "Operasional", icon: "📋" },
  ];
  const sourceCategories = categoriesCache.length ? categoriesCache : fallbackCategories;
  const categories = sourceCategories
    .filter((c) => c.active !== false)
    .map((category) => ({
      ...category,
      templateCount: TEMPLATES.filter((t) => (t.category || "finance") === category.id).length,
    }));

  if (!categories.some((c) => c.id === activeFilter)) {
    activeFilter = categories.find((c) => c.id === getCategory(state.template))?.id
      || categories[0]?.id
      || getCategory(state.template);
  }
  categoryEl.innerHTML = categories.map((c) =>
    `<option value="${esc(c.id)}">${c.icon ? c.icon + " " : ""}${esc(c.label)} · ${c.templateCount ? `${c.templateCount} format` : "belum ada template"}</option>`
  ).join("");
  categoryEl.value = activeFilter;

  const visible = TEMPLATES.filter((t) => (t.category || "finance") === activeFilter);
  resultsEl.textContent = `Format dokumen · ${visible.length} tersedia`;
  if (!visible.length) {
    gridEl.innerHTML = `<div class="tpl-empty" role="status">
      <span class="tpl-empty-icon" aria-hidden="true">✦</span>
      <span class="tpl-empty-title">Belum ada template di kategori ini</span>
      <span class="tpl-empty-copy">Kategori tetap tersedia. Template dokumennya akan ditambahkan bertahap.</span>
    </div>`;
    return;
  }
  gridEl.innerHTML = visible.map((t) => {
    const cat = t.category || "finance";
    const meta = categoriesCache.find((c) => c.id === cat);
    const color = meta?.color || "#16324F";
    const price = meta?.price_per_doc ?? 1000;
    const isActive = state.template === t.id;
    const format = t.output === "thermal" ? "Thermal 58 mm" : t.output === "screen" ? "Digital" : "Kertas A4";
    return `<button class="sheet-tpl-card ${isActive ? "active" : ""}" type="button"
      data-tpl="${t.id}"
      style="--card-accent:${color};--card-ring:${color}22">
      <span class="tpl-cat-dot" style="background:${color}"></span>
      <span class="tpl-name">${esc(t.label)}</span>
      <span class="tpl-meta">${format} · ${rupiah(price)}/dok</span>
    </button>`;
  }).join("");
}

$("#tpl-sheet-grid").addEventListener("click", (e) => {
  const card = e.target.closest("[data-tpl]");
  if (!card) return;
  const newId = card.dataset.tpl;
  tplSheet.hidden = true;
  if (newId !== state.template) switchTemplate(newId);
});

$("#tpl-sheet-close").addEventListener("click", () => { tplSheet.hidden = true; });

// Billing Sheet
async function openBillingSheet() {
  openSheet(billingSheet);
  if (backend.isRemote()) await refreshRemoteBilling();
  if (!categoriesCache.length) {
    try { categoriesCache = await backend.getCategories(); }
    catch (e) { console.warn("load categories gagal, pakai daftar lokal", e); }
  }
  renderCatPricesSheet();
  renderBillingSheetValues();
  showPackagesSheet();
  const pending = backend.isRemote() ? remote.pending : ledger.pendingRequest();
  if (pending && (pending.status === "pending" || backend.isRemote())) showPendingSheet(pending);
  else billingSheet.querySelector('[data-tab="sisa"]').click();
  $("#btn-other-pkg").hidden = backend.isRemote();
}

function renderBillingSheetValues() {
  const billing = backend.isRemote()
    ? { trialCredits: remote.trialCredits, balance: remote.balance }
    : ledger.billingState();
  $("#q-trial").textContent = billing.trialCredits ?? "—";
  $("#q-balance").textContent = billing.balance == null ? "—" : rupiah(billing.balance);
  $("#q-status").classList.toggle("empty", billing.trialCredits === 0 && billing.balance === 0);
  $("#billing-contact").textContent = ledger.CONTACT;
  renderBillingHistorySheet(backend.isRemote() ? remote.history : ledger.requestHistory());
}

/* Package list: remote source of truth when online, local fallback otherwise.
   packagesCache always holds the array currently rendered, so the click
   handler resolves the same item the user tapped. */
let packagesCache = ledger.PACKAGES;
function showPackagesSheet() {
  const renderPkgs = (pkgs) => {
    packagesCache = pkgs && pkgs.length ? pkgs : ledger.PACKAGES;
    $("#pkg-list").innerHTML = packagesCache.map((p, i) =>
      `<button class="pkg" type="button" data-pkg="${i}">
         <span class="c">Saldo ${rupiah(p.balance)}</span>
         <span class="p">Bayar ${rupiah(p.price)}</span>
       </button>`).join("");
  };
  if (backend.isRemote()) {
    // Render offline fallback immediately, then upgrade to server list.
    renderPkgs(ledger.PACKAGES);
    backend.getPackages()
      .then(renderPkgs)
      .catch((e) => { console.warn("load packages gagal, pakai daftar lokal", e); });
    return;
  }
  renderPkgs(ledger.PACKAGES);
}

function showPendingSheet(rec) {
  $("#req-id").textContent = rec.id;
  $("#req-price").textContent = rupiah(rec.price);
  $("#req-balance").textContent = rupiah(rec.balance);
  $("#req-contact").textContent = ledger.CONTACT;
  const rm = backend.isRemote();
  const isPending = rec.status === "pending";
  $("#topup-instructions").hidden = !isPending;
  $("#btn-cancel-topup").hidden = !rm || !isPending;
  $("#btn-other-pkg").hidden = rm;
  $("#req-wait").hidden = !rm;
  if (rm) {
    $("#req-wait").textContent =
      rec.status === "approved" ? "Pembayaran disetujui — saldo sudah ditambahkan ke akunmu."
      : rec.status === "rejected" ? "Permintaan ditolak admin. Buat permintaan top-up baru jika ingin mencoba lagi."
      : "Menunggu konfirmasi admin. Saldo akan masuk setelah pembayaran diperiksa.";
  }
  const name = remote.session?.user?.user_metadata?.full_name || remote.session?.user?.email || "Nama akun";
  const email = remote.session?.user?.email || "-";
  const message = [
    "KONFIRMASI TOP-UP FAKTURKU",
    `Nama: ${name}`,
    `Email akun: ${email}`,
    `ID permintaan: ${rec.id}`,
    `Nominal transfer: ${rupiah(rec.price)}`,
    `Saldo yang diminta: ${rupiah(rec.balance)}`,
    "Bukti transfer: saya lampirkan di chat ini.",
  ].join("\n");
  $("#payment-message-preview").textContent = message;
  $("#btn-contact-wa").onclick = () => openWhatsApp(message, ledger.PAYMENT_WHATSAPP);
  $("#panel-pending").hidden = false;
  $("#panel-paket").hidden = true;
  $("#panel-sisa").hidden = true;
  $("#panel-riwayat").hidden = true;
}

function renderBillingHistorySheet(list) {
  const hist = (list || ledger.requestHistory()).slice().reverse().slice(0, 20);
  $("#billing-hist-list").innerHTML = hist.length
    ? hist.map((h) => {
        const hasWallet = Number.isFinite(h.balanceDelta);
        const trialDelta = hasWallet ? h.trialDelta : h.amount;
        const balanceDelta = hasWallet ? h.balanceDelta : 0;
        const label = h.reason === "trial" || h.ref === "TRIAL" ? "Trial gratis"
          : h.reason === "trial_issue" ? "Dokumen gratis terbit"
          : h.reason === "topup" ? "Top-up saldo"
          : h.reason === "issue" ? "Biaya terbit"
          : trialDelta > 0 ? "Trial gratis"
          : balanceDelta > 0 ? "Top-up saldo"
          : balanceDelta < 0 ? "Biaya terbit"
          : "Transaksi";
        const amountText = balanceDelta
          ? `${balanceDelta > 0 ? "+" : ""}${rupiah(balanceDelta)}`
          : trialDelta ? `${trialDelta > 0 ? "+" : ""}${trialDelta} dok. gratis`
          : `${h.legacyAmount > 0 ? "+" : ""}${h.legacyAmount || 0} dok.`;
        const d = new Date(h.at);
        const when = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) + " " +
          d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        const catMeta = h.category ? categoriesCache.find((c) => c.id === h.category) : null;
        const catBadge = catMeta
          ? `<span class="cat-badge-mini" style="background:${catMeta.color}22;color:${catMeta.color}">${catMeta.icon} ${esc(catMeta.label)}</span>`
          : "";
        return `<div class="hist-row">
          <span class="lbl">${label}${catBadge}${h.ref && h.ref !== "TRIAL" ? `<span class="sub">${esc(h.ref)} · ${when}</span>` : `<span class="sub">${when}</span>`}</span>
          <span class="amt ${balanceDelta > 0 || trialDelta > 0 ? "plus" : "minus"}">${amountText}</span>
          <span class="sisa">${hasWallet
            ? `gratis ${h.trialAfter} · saldo ${rupiah(h.balanceAfter)}`
            : h.sisa != null ? "sisa " + h.sisa : ""}</span>
        </div>`;
      }).join("")
    : `<div class="hist-empty">Belum ada transaksi.</div>`;
}

function renderCatPricesSheet() {
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

// Billing sheet tab switching
billingSheet.querySelectorAll(".sheet-tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    billingSheet.querySelectorAll(".sheet-tabs button").forEach(b => {
      const selected = b.dataset.tab === tab;
      b.classList.toggle("on", selected);
      b.setAttribute("aria-selected", String(selected));
    });
    billingSheet.querySelectorAll(".sheet-panel").forEach(p => p.hidden = p.id !== "panel-" + tab);
  });
});

$("#btn-buy-pkg").addEventListener("click", () => {
  billingSheet.querySelector('[data-tab="paket"]').click();
});

$("#pkg-list").addEventListener("click", async (e) => {
  const i = e.target.closest("[data-pkg]")?.dataset.pkg;
  if (i == null) return;
  const pkg = packagesCache[Number(i)];
  if (!pkg) return;
  if (backend.isRemote()) {
    try {
      if (!remote.session) { openAuthSheet(); return; }
      const rec = await backend.createTopup(pkg);
      remote.pending = rec;
      await refreshRemoteBilling();
      remote.pending = rec.status ? rec : remote.pending;
      renderBillingSheetValues();
      showPendingSheet(rec);
      try {
        const notification = await backend.notifyAdminTopup(rec.id);
        toast(notification.delivered > 0
          ? "Permintaan tersimpan. Admin sudah diberi notifikasi; konfirmasi juga lewat WhatsApp."
          : "Permintaan tersimpan. Notifikasi HP admin belum aktif; lanjutkan konfirmasi lewat WhatsApp.");
      } catch (notificationError) {
        console.warn("notifikasi top-up admin gagal", notificationError);
        toast("Permintaan tersimpan, tetapi notifikasi admin gagal. Lanjutkan konfirmasi lewat WhatsApp.");
      }
    } catch (err) {
      toast("Gagal membuat permintaan: " + (err?.message || "server"));
    }
    return;
  }
  toast("Top-up saldo perlu koneksi akun online.");
});

$("#btn-other-pkg").addEventListener("click", () => {
  ledger.cancelPending();
  showPackagesSheet();
});

$("#btn-cancel-topup").addEventListener("click", async () => {
  if (remote.pending?.id) {
    try { await backend.cancelTopup(remote.pending.id); } catch { /* noop */ }
  }
  remote.pending = null;
  await refreshRemoteBilling();
  renderBillingSheetValues();
  showPackagesSheet();
  billingSheet.querySelector('[data-tab="paket"]').click();
  toast("Permintaan dibatalkan");
});

$("#billing-sheet-close").addEventListener("click", () => { billingSheet.hidden = true; });

// Auth Sheet
function openAuthSheet() { openSheet(authSheet); }
function closeAuthSheet() { authSheet.hidden = true; }

$("#auth-tab-in").addEventListener("click", () => setAuthModeSheet("in"));
$("#auth-tab-up").addEventListener("click", () => setAuthModeSheet("up"));

function setAuthModeSheet(mode) {
  authMode = mode;
  $("#auth-tab-in").classList.toggle("on", mode === "in");
  $("#auth-tab-up").classList.toggle("on", mode === "up");
  $("#auth-tab-in").setAttribute("aria-selected", String(mode === "in"));
  $("#auth-tab-up").setAttribute("aria-selected", String(mode === "up"));
  $("#auth-name-field").hidden = mode !== "up";
  $("#auth-sheet-title").textContent = mode === "in" ? "Masuk ke FakturKu" : "Buat akun gratis";
  $("#auth-intro").textContent = mode === "in"
    ? "Masuk untuk membuka dokumen dan kuota yang tersimpan di akunmu."
    : "Daftar untuk menyimpan dokumen dan kuota di akunmu.";
  $("#auth-pass").autocomplete = mode === "in" ? "current-password" : "new-password";
  $("#auth-go").textContent = mode === "in" ? "Masuk" : "Buat akun gratis";
  const err = $("#auth-err");
  err.hidden = true;
  err.classList.remove("ok");
}

async function authSubmitSheet() {
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
      setAuthModeSheet("in");
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
$("#auth-go").addEventListener("click", authSubmitSheet);
$("#auth-email").addEventListener("keydown", (e) => { if (e.key === "Enter") authSubmitSheet(); });
$("#auth-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") authSubmitSheet(); });
$("#auth-name").addEventListener("keydown", (e) => { if (e.key === "Enter") authSubmitSheet(); });
$("#auth-guest").addEventListener("click", () => { authSheet.hidden = true; });

// Drafts Sheet
function openDraftsSheet() {
  renderDraftsSheet();
  openSheet(draftsSheet);
}

function renderDraftsSheet() {
  const all = listDrafts();
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

$("#btn-save-draft").addEventListener("click", () => {
  const name = ($("#draft-name").value || "").trim() || state.number;
  try {
    saveDraft(state, name);
    $("#draft-name").value = "";
    renderDraftsSheet();
    toast("Draft tersimpan: " + name);
  } catch {
    toast("Gagal simpan — penyimpanan device penuh. Hapus draft lama.");
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
      draftsSheet.hidden = true;
    }
  } else if (rm) {
    deleteDraft(rm);
    renderDraftsSheet();
  }
});

$("#drafts-sheet-close").addEventListener("click", () => { draftsSheet.hidden = true; });

// Sheet close on backdrop click
[tplSheet, billingSheet, authSheet, draftsSheet].forEach(sheet => {
  sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.hidden = true; });
});

// Keyboard close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllSheets();
});

// Connect header buttons to sheets
$("#kuota").addEventListener("click", openBillingSheet);
$("#btn-drafts").addEventListener("click", openDraftsSheet);
$("#btn-auth").addEventListener("click", async () => {
  if (remote.session) {
    if (!confirm("Keluar dari akun " + (remote.session.user.email || "") + "?")) return;
    await backend.signOut();
  } else {
    openAuthSheet();
  }
});

/* ---------- mobile tabs ---------- */
$("#tab-edit").addEventListener("click", () => switchTab("edit"));
$("#tab-preview").addEventListener("click", () => switchTab("preview"));
function switchTab(tab) {
  $("#workspace").dataset.tab = tab;
  $("#tab-edit").classList.toggle("on", tab === "edit");
  $("#tab-preview").classList.toggle("on", tab === "preview");
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

  renderTemplatePicker();
  renderItems();
  render();
  initAccordion();

  if (backend.isRemote()) {
    backend.onAuthChange((s) => { handleSession(s); });
    try {
      const s = await backend.getSession();
      await handleSession(s);
    } catch (e) {
      console.warn("backend init gagal", e);
    }
  }
}
boot();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
