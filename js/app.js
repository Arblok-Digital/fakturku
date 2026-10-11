import { TEMPLATES, getTemplate, renderDoc } from "./modules/template-engine.js";
import {
  blankState, getPath, setPath, totals, saveCurrent, loadCurrent,
  listDrafts, saveDraft, deleteDraft, getDraft, PREFIX,
} from "./modules/invoice-engine.js";
import { terbilang, rupiah, formatDate, esc } from "./modules/format.js";
import { nextNumber } from "./modules/numbering.js";
import { printDoc, shareImage, copySummary, openWhatsApp } from "./modules/output.js";
import * as ledger from "./modules/credit-ledger.js";
import * as backend from "./modules/backend.js";

let state = loadCurrent() || blankState("faktur-a4");
let renderTimer = null;

/* remote billing cache (Supabase) */
const remote = { session: null, credits: null, history: [], pending: null };

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
  applySections(tpl);
  syncBoundInputs();
  $("#out-hint").textContent =
    `${tpl.label} Â· ${state.issued ? "TERBIT" : "DRAFT"}`;
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
  if (backend.isRemote() && remote.credits === null) {
    el.textContent = "Kuota: —";
    el.classList.remove("empty");
    return;
  }
  const n = currentCredits();
  el.textContent = n > 0 ? `Kuota: ${n}` : "Kuota habis";
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
    <tr>
      <td><input type="text" data-idx="${i}" data-f="desc" value="${(it.desc || "").replace(/"/g, "&quot;")}" placeholder="Uraian"></td>
      <td><input class="num" type="number" min="0" data-idx="${i}" data-f="qty" value="${Number(it.qty) || 0}"></td>
      <td><input class="num" type="number" min="0" data-idx="${i}" data-f="price" value="${Number(it.price) || 0}"></td>
      <td><input class="num" type="text" readonly tabindex="-1" value="${rupiah((Number(it.qty) || 0) * (Number(it.price) || 0))}"></td>
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
  row.children[3].value = rupiah((Number(state.items[i].qty) || 0) * (Number(state.items[i].price) || 0));
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

/* ---------- template select ---------- */
const sel = $("#tpl-select");
sel.innerHTML = TEMPLATES.map((t) => `<option value="${t.id}">${t.label}</option>`).join("");
sel.value = state.template;

sel.addEventListener("change", () => {
  const newId = sel.value;
  if (!state.numbers) state.numbers = {};
  state.numbers[state.template] = state.number;
  state.template = newId;
  if (state.numbers[newId]) {
    state.number = state.numbers[newId];
  } else {
    state.number = nextNumber(PREFIX[newId]);
    state.numbers[newId] = state.number;
  }
  render(); saveCurrent(state);
});

/* ---------- drafts ---------- */
const secDrafts = $("#sec-drafts");
$("#sec-drafts h3").insertAdjacentHTML("afterend", `
  <div class="field" style="flex-direction:row;gap:6px">
    <input id="draft-name" type="text" placeholder="Nama draft (mis. Faktur Pak Budi)" style="flex:1">
    <button class="btn" type="button" id="btn-save-draft">Simpan</button>
  </div>`);

function renderDrafts() {
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
      sel.value = state.template;
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
$("#btn-new").addEventListener("click", () => {
  if (!confirm("Buat dokumen baru? Dokumen sekarang tetap tersimpan sebagai draft terakhir.")) return;
  saveCurrent(state);
  state = blankState(state.template);
  sel.value = state.template;
  renderItems(); render();
  saveCurrent(state);
  toast("Dokumen baru dibuat");
});

/* ---------- output & billing ---------- */
async function markIssued() {
  if (state.issued) return true;
  if (backend.isRemote()) {
    if (!remote.session) { openAuth(); return false; }
    let ok = false;
    try { ok = await backend.tryDebit(state.number); }
    catch { toast("Server tidak terhubung — coba lagi."); return false; }
    if (!ok) { openTopUp(); return false; }
    await refreshRemoteBilling();
    state.issued = true;
    saveCurrent(state);
    backend.saveInvoice(state).catch(() => {});
    render();
    return true;
  }
  if (!ledger.tryDebit(state.number)) { openTopUp(); return false; }
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

$("#btn-image").addEventListener("click", async () => {
  if (!(await markIssued())) return;
  try {
    toast("Menyiapkan gambarâ€¦");
    const res = await shareImage(docEl, `fakturku-${safeName(state.number)}.jpg`);
    if (res === "shared") toast("Gambar dibagikan");
    else if (res === "downloaded") toast("JPEG diunduh â€” lampir ke chat WA/Telegram");
  } catch {
    toast("Gagal membuat gambar. Coba tombol Print.");
  }
});

$("#btn-wa").addEventListener("click", async () => {
  if (!(await markIssued())) return;
  openWhatsApp(buildSummary());
  try {
    const res = await shareImage(docEl, `fakturku-${safeName(state.number)}.jpg`);
    if (res === "shared") return;
    if (res === "cancelled") return;
    toast("JPEG diunduh â€” lampir ke chat WhatsApp tadi");
  } catch {
    toast("WhatsApp terbuka â€” salin rincian via tombol Salin");
  }
});

$("#btn-copy").addEventListener("click", async () => {
  await copySummary(buildSummary());
  toast("Rincian disalin ke clipboard");
});

/* ---------- top-up modal ---------- */
const modal = $("#topup-modal");

function showPackages() {
  $("#pkg-list").innerHTML = ledger.PACKAGES.map((p, i) =>
    `<button class="pkg" type="button" data-pkg="${i}">
       <span class="c">${p.credits} dokumen</span>
       <span class="p">${rupiah(p.price)}</span>
     </button>`).join("");
  $("#topup-packages").hidden = false;
  $("#topup-pending").hidden = true;
}

function showPending(rec) {
  $("#req-id").textContent = rec.id;
  $("#req-price").textContent = rupiah(rec.price);
  $("#req-credits").textContent = `${rec.credits} dokumen`;
  $("#req-contact").textContent = ledger.CONTACT;
  const rm = backend.isRemote();
  $("#topup-local").hidden = rm;
  $("#btn-cancel-topup").hidden = !rm;
  $("#req-wait").hidden = !rm;
  if (rm) {
    $("#req-wait").textContent =
      rec.status === "approved" ? "Disetujui — kuota sudah masuk. Muat ulang kalau belum terlihat."
      : rec.status === "rejected" ? "Permintaan ditolak admin. Pilih paket lain."
      : "Menunggu persetujuan admin — kuota masuk otomatis setelah di-approve. Transfer sesuai nominal dulu ya.";
  }
  $("#topup-packages").hidden = true;
  $("#topup-pending").hidden = false;
}

function renderBillingHistory(list) {
  const hist = (list || ledger.requestHistory()).slice().reverse().slice(0, 20);
  $("#hist-list").innerHTML = hist.length
    ? hist.map((h) => {
        const plus = h.amount > 0;
        const label = h.ref === "TRIAL" ? "Trial gratis"
          : plus ? "Top-up masuk" : "Ekspor dokumen";
        const d = new Date(h.at);
        const when = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) + " " +
          d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        return `<div class="hist-row">
          <span class="lbl">${label}${h.ref && h.ref !== "TRIAL" ? `<span class="sub">${esc(h.ref)} · ${when}</span>` : `<span class="sub">${when}</span>`}</span>
          <span class="amt ${plus ? "plus" : "minus"}">${plus ? "+" : ""}${h.amount}</span>
          <span class="sisa">${h.sisa != null ? "sisa " + h.sisa : ""}</span>
        </div>`;
      }).join("")
    : `<div class="hist-empty">Belum ada transaksi.</div>`;
}

async function openTopUp() {
  if (backend.isRemote()) await refreshRemoteBilling();
  const n = currentCredits();
  $("#q-n").textContent = n;
  $("#q-status").classList.toggle("empty", n <= 0);
  $("#topup-contact").textContent = ledger.CONTACT;
  renderBillingHistory(backend.isRemote() ? remote.history : ledger.requestHistory());
  const pending = backend.isRemote()
    ? (remote.pending && remote.pending.status === "pending" ? remote.pending : null)
    : ledger.pendingRequest();
  if (pending) showPending(pending);
  else showPackages();
  $("#btn-other-pkg").hidden = backend.isRemote();
  modal.hidden = false;
}

$("#pkg-list").addEventListener("click", async (e) => {
  const i = e.target.dataset && e.target.dataset.pkg;
  if (i == null) return;
  const pkg = ledger.PACKAGES[Number(i)];
  if (backend.isRemote()) {
    try {
      const rec = await backend.createTopup(pkg);
      remote.pending = rec;
      showPending(rec);
      toast("Permintaan top-up dibuat — transfer sesuai nominal, tunggu approve admin.");
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

function openAuth() { authModal.hidden = false; }
function closeAuth() { authModal.hidden = true; }

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
    const [c, h, p] = await Promise.all([
      backend.creditsLeft(), backend.history(), backend.pendingTopup(),
    ]);
    remote.credits = c;
    remote.history = h;
    remote.pending = p;
  } catch (e) {
    console.warn("billing refresh gagal", e);
  }
  updateKuota();
}

async function handleSession(session) {
  const uid = session?.user?.id ?? null;
  if (uid === lastUid) return;
  lastUid = uid;
  remote.session = session;
  const btn = $("#btn-auth");
  if (session) {
    btn.hidden = false;
    btn.textContent = (session.user.email || "akun").split("@")[0];
    closeAuth();
    await refreshRemoteBilling();
    toast("Terhubung sebagai " + (session.user.email || ""));
  } else {
    btn.textContent = "Masuk";
    remote.credits = null;
    remote.history = [];
    remote.pending = null;
    updateKuota();
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
renderItems();
render();

if (backend.isRemote()) {
  backend.init()
    .then(() => {
      backend.onAuthChange((s) => { handleSession(s); });
      return backend.getSession();
    })
    .then((s) => { if (s) handleSession(s); })
    .catch((e) => console.warn("backend init gagal", e));
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

