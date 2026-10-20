/* Landing publik FakturKu: progressive enhancement, tanpa menyentuh logic editor.
   - "Mesin dokumen": 7 kategori, dokumen di-render oleh template engine FakturKu
     (output asli, bukan mock), autoplay + bisa diambil alih lewat chip.
   - Form auth: satu node, dua tampilan (kolom kanan desktop / bottom sheet mobile).
*/
import { renderDocHtml, getTemplate } from "./modules/template-engine.js";
import { buildSampleState } from "./modules/sample-docs.js";

const root = document.querySelector("#auth-modal.landing-v2");
if (root) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = root.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    revealItems.forEach((item) => observer.observe(item));
  }

  /* ---------- kategori & template contoh (output asli aplikasi) ---------- */
  const CATEGORY_DATA = {
    finance: { title: "Invoice & tagihan", copy: "Dokumen keuangan untuk menagih pembayaran dan merapikan catatan transaksi bisnis.", tags: ["Invoice", "Kuitansi", "Bukti transaksi"], template: "faktur-a4" },
    legal: { title: "Surat & administrasi", copy: "Dokumen administratif untuk mendukung proses bisnis dan kesepakatan.", tags: ["Surat", "Pernyataan", "Administrasi"], template: "surat-pernyataan" },
    umkm: { title: "Nota & bukti transaksi", copy: "Dokumen ringkas untuk mencatat transaksi harian dengan lebih rapi.", tags: ["Nota", "Struk", "Kuitansi"], template: "struk-pos" },
    logistik: { title: "Pengiriman & serah terima", copy: "Dokumen pendukung pencatatan barang, pengiriman, dan penerimaan.", tags: ["Surat jalan", "Serah terima", "Pengiriman"], template: "surat-jalan" },
    pajak: { title: "Administrasi perpajakan", copy: "Lembar kerja internal untuk menyiapkan dan memeriksa data pajak.", tags: ["Data pajak", "Periode", "Ringkasan"], template: "lembar-data-faktur-pajak" },
    proyek: { title: "Pekerjaan & proyek", copy: "Dokumen untuk merapikan referensi pekerjaan, progres, dan kebutuhan proyek.", tags: ["Penawaran", "Progres", "Referensi"], template: "spk" },
    operasional: { title: "Dokumen operasional", copy: "Dokumen untuk membantu koordinasi, persetujuan, dan pencatatan internal.", tags: ["Permintaan", "Persetujuan", "Catatan"], template: "memo-internal" }
  };
  const categoryKeys = Object.keys(CATEGORY_DATA);

  /* ---------- section kategori (tetap seperti sebelumnya) ---------- */
  const categoryTabs = [...root.querySelectorAll("[data-category]")];
  const categoryFields = {
    title: root.querySelector("#category-preview-title"),
    copy: root.querySelector("#category-preview-copy"),
    tags: root.querySelector("#category-preview-tags"),
    brand: root.querySelector("#category-doc-brand"),
    doc: root.querySelector("#category-doc-title"),
    number: root.querySelector("#category-doc-number"),
    label: root.querySelector("#category-doc-total-label"),
    total: root.querySelector("#category-doc-total")
  };
  const renderCategory = (key) => {
    const data = CATEGORY_DATA[key];
    if (!data) return;
    categoryTabs.forEach((tab) => {
      const active = tab.dataset.category === key;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    Object.entries({ title: data.title, copy: data.copy, doc: data.title.toUpperCase() }).forEach(([field, value]) => {
      if (categoryFields[field]) categoryFields[field].textContent = value;
    });
    if (categoryFields.tags) {
      categoryFields.tags.replaceChildren(...data.tags.map((tag) => {
        const chip = document.createElement("span");
        chip.textContent = tag;
        return chip;
      }));
    }
  };
  categoryTabs.forEach((tab) => tab.addEventListener("click", () => renderCategory(tab.dataset.category)));

  /* ---------- stage: dokumen asli dari template engine ---------- */
  const stage = {
    wrap: root.querySelector(".hero-stage"),
    frame: root.querySelector("#doc-frame"),
    scale: root.querySelector("#doc-scale"),
    name: root.querySelector("#doc-stage-name"),
    note: root.querySelector("#doc-stage-note"),
    dots: root.querySelector("#doc-dots"),
    chips: [...root.querySelectorAll("[data-doc-chip]")]
  };
  const STAGE_MS = 3600;
  const FRAME_MAX_H = 470;
  let stageIndex = 0;
  let stageTimer = null;
  let stagePaused = false;
  let takeoverUntil = 0;
  const cache = new Map();

  const docHtml = (templateId) => {
    if (cache.has(templateId)) return cache.get(templateId);
    let out = null;
    try {
      const state = buildSampleState(templateId, { issued: true });
      const { tpl, html } = renderDocHtml(state);
      out = { html, output: tpl.output, label: tpl.label };
    } catch (err) {
      console.warn("render contoh dokumen gagal", err);
      out = null;
    }
    cache.set(templateId, out);
    return out;
  };

  const mountDoc = (key) => {
    const data = CATEGORY_DATA[key];
    if (!data || !stage.frame) return;
    const rendered = docHtml(data.template);
    if (!rendered) return;
    stage.frame.classList.add("is-swapping");
    window.setTimeout(() => {
      stage.scale.innerHTML = `<div class="doc doc-${rendered.output}">${rendered.html}</div>`;
      const docEl = stage.scale.querySelector(".doc");
      if (docEl) {
        const naturalW = docEl.offsetWidth || 794;
        const naturalH = docEl.offsetHeight || 1123;
        const target = stage.frame.clientWidth || 460;
        const scale = Math.min(target / naturalW, 1.2);
        stage.scale.style.setProperty("--scale", String(scale));
        stage.frame.style.height = Math.min(Math.round(naturalH * scale), FRAME_MAX_H) + "px";
      }
      stage.frame.classList.remove("is-swapping");
    }, reduceMotion ? 0 : 220);
    if (stage.name) stage.name.textContent = rendered.label || data.title;
    if (stage.note) stage.note.textContent = data.copy;
  };

  const paintStageControls = (key) => {
    stage.chips.forEach((chip) => {
      const active = chip.dataset.docChip === key;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
    if (stage.dots) {
      [...stage.dots.children].forEach((dot, i) => {
        dot.classList.toggle("is-active", i === stageIndex);
        dot.setAttribute("aria-current", i === stageIndex ? "true" : "false");
      });
    }
  };

  const showStage = (index) => {
    const key = categoryKeys[index];
    if (!key) return;
    stageIndex = index;
    mountDoc(key);
    paintStageControls(key);
  };

  const stopStage = () => {
    if (stageTimer) window.clearInterval(stageTimer);
    stageTimer = null;
  };
  const startStage = () => {
    stopStage();
    if (reduceMotion) return;
    stageTimer = window.setInterval(() => {
      if (stagePaused || document.hidden || Date.now() < takeoverUntil) return;
      if (document.body.dataset.sheet === "open") return;
      showStage((stageIndex + 1) % categoryKeys.length);
    }, STAGE_MS);
  };

  if (stage.dots) {
    categoryKeys.forEach((key, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "doc-dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Contoh dokumen " + CATEGORY_DATA[key].title);
      dot.addEventListener("click", () => {
        takeoverUntil = Date.now() + 8000;
        showStage(i);
      });
      stage.dots.appendChild(dot);
    });
  }
  stage.chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const i = categoryKeys.indexOf(chip.dataset.docChip);
      if (i < 0) return;
      takeoverUntil = Date.now() + 8000;
      showStage(i);
    });
  });
  if (stage.wrap) {
    stage.wrap.addEventListener("pointerenter", () => { stagePaused = true; });
    stage.wrap.addEventListener("pointerleave", () => { stagePaused = false; });
  }
  if (stage.frame) {
    showStage(0);
    const start = () => window.requestIdleCallback
      ? window.requestIdleCallback(startStage, { timeout: 2500 })
      : window.setTimeout(startStage, 600);
    if (reduceMotion) showStage(0);
    else start();
    /* Ukuran frame mengikuti lebar kolom (presisi). */
    window.addEventListener("resize", () => {
      const rendered = docHtml(CATEGORY_DATA[categoryKeys[stageIndex]].template);
      if (!rendered) return;
      const docEl = stage.scale.querySelector(".doc");
      if (!docEl) return;
      const naturalW = docEl.offsetWidth || 794;
      const naturalH = docEl.offsetHeight || 1123;
      const scale = Math.min((stage.frame.clientWidth || 460) / naturalW, 1.2);
      stage.scale.style.setProperty("--scale", String(scale));
      stage.frame.style.height = Math.min(Math.round(naturalH * scale), FRAME_MAX_H) + "px";
    });
  }

  /* ---------- auth: satu kartu, dua tampilan ---------- */
  const sideHost = root.querySelector("#hero-side");
  const sheetHost = root.querySelector("#auth-sheet-host");
  const backdrop = root.querySelector("#sheet-backdrop");
  const card = root.querySelector("#landing-auth-panel");
  const sheetMq = window.matchMedia("(max-width: 1023px)");
  const isSheetMode = () => sheetMq.matches;
  let lastFocus = null;

  const placeAuthCard = () => {
    if (!card) return;
    const target = isSheetMode() ? sheetHost : sideHost;
    if (target && card.parentElement !== target) target.appendChild(card);
    if (sheetHost) sheetHost.setAttribute("aria-hidden", String(isSheetMode()));
    if (!isSheetMode()) closeSheet(false);
  };

  const focusables = () => {
    if (!card) return [];
    return [...card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
  };

  function openSheet() {
    if (!card) return;
    if (!isSheetMode()) {
      sideHost?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      document.querySelector("#auth-email")?.focus({ preventScroll: true });
      return;
    }
    lastFocus = document.activeElement;
    document.body.dataset.sheet = "open";
    sheetHost?.setAttribute("aria-hidden", "false");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    window.setTimeout(() => document.querySelector("#auth-email")?.focus({ preventScroll: true }), 80);
  }

  function closeSheet(restoreFocus = true) {
    if (document.body.dataset.sheet !== "open") return;
    document.body.dataset.sheet = "closed";
    sheetHost?.setAttribute("aria-hidden", "true");
    card?.removeAttribute("aria-modal");
    if (restoreFocus && lastFocus && typeof lastFocus.focus === "function") {
      try { lastFocus.focus({ preventScroll: true }); } catch { /* abaikan */ }
    }
  }

  const openAuthWithMode = (mode) => {
    if (mode === "up") document.querySelector("#auth-tab-up")?.click();
    if (mode === "in") document.querySelector("#auth-tab-in")?.click();
    openSheet();
  };

  root.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-auth]");
    if (!trigger) return;
    event.preventDefault();
    openAuthWithMode(trigger.getAttribute("data-open-auth"));
  });

  backdrop?.addEventListener("click", () => closeSheet());
  document.addEventListener("keydown", (event) => {
    if (document.body.dataset.sheet !== "open") return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSheet();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener("fakturku:auth-open", () => openSheet());
  document.addEventListener("fakturku:auth-close", () => closeSheet());

  if (typeof sheetMq.addEventListener === "function") {
    sheetMq.addEventListener("change", placeAuthCard);
  } else if (typeof sheetMq.addListener === "function") {
    sheetMq.addListener(placeAuthCard);
  }
  placeAuthCard();

  /* ---------- sticky CTA bar ---------- */
  const ctaBar = root.querySelector("#landing-cta-bar");
  const heroCtas = root.querySelector(".hero-ctas");
  if (ctaBar && heroCtas && "IntersectionObserver" in window) {
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        document.body.dataset.cta = entry.isIntersecting ? "off" : "on";
      });
    }, { threshold: 0 });
    barObserver.observe(heroCtas);
  }

  /* ---------- misc ---------- */
  root.querySelectorAll("[data-preview-focus]").forEach((control) => {
    control.addEventListener("click", () => {
      const preview = root.querySelector("#hero-document-preview");
      preview?.classList.add("preview-focus");
      window.setTimeout(() => preview?.classList.remove("preview-focus"), 1200);
    });
  });

  const authIn = document.querySelector("#auth-tab-in");
  const authUp = document.querySelector("#auth-tab-up");
  authIn?.addEventListener("click", () => {
    authIn.setAttribute("aria-selected", "true");
    authUp?.setAttribute("aria-selected", "false");
  });
  authUp?.addEventListener("click", () => {
    authUp.setAttribute("aria-selected", "true");
    authIn?.setAttribute("aria-selected", "false");
  });
}
