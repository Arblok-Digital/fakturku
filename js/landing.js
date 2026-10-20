/* Progressive enhancement for the public landing. No editor logic is changed. */
(() => {
  const root = document.querySelector("#auth-modal.landing-v2");
  if (!root) return;

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

  const categoryData = {
    finance: {title:"Invoice & tagihan",copy:"Dokumen keuangan untuk menagih pembayaran dan merapikan catatan transaksi bisnis.",tags:["Invoice","Kuitansi","Bukti transaksi"],brand:"FAKTURKU · FINANCE",doc:"INVOICE",number:"INV-2026-0108",label:"TOTAL TAGIHAN",total:"Rp 3.750.000"},
    legal: {title:"Surat & administrasi",copy:"Contoh kebutuhan dokumen administratif untuk mendukung proses bisnis dan kesepakatan.",tags:["Surat","Pernyataan","Administrasi"],brand:"FAKTURKU · LEGAL",doc:"SURAT PERNYATAAN",number:"ADM-2026-0021",label:"STATUS DOKUMEN",total:"Siap diperiksa"},
    umkm: {title:"Nota & bukti transaksi",copy:"Contoh dokumen ringkas untuk membantu usaha mencatat transaksi harian dengan lebih rapi.",tags:["Nota","Kuitansi","Struk"],brand:"FAKTURKU · UMKM",doc:"NOTA PENJUALAN",number:"NT-2026-0032",label:"TOTAL TRANSAKSI",total:"Rp 125.000"},
    logistik: {title:"Pengiriman & serah terima",copy:"Contoh dokumen pendukung pencatatan barang, pengiriman, dan penerimaan.",tags:["Surat jalan","Serah terima","Pengiriman"],brand:"FAKTURKU · LOGISTIK",doc:"SURAT JALAN",number:"SJ-2026-0014",label:"STATUS PENGIRIMAN",total:"Dalam proses"},
    pajak: {title:"Administrasi perpajakan",copy:"Contoh lembar kerja dan informasi pendukung untuk administrasi pajak bisnis.",tags:["Data pajak","Periode","Ringkasan"],brand:"FAKTURKU · PAJAK",doc:"RINGKASAN PAJAK",number:"TX-2026-0010",label:"NILAI PAJAK",total:"Rp 375.000"},
    proyek: {title:"Pekerjaan & proyek",copy:"Contoh dokumen untuk merapikan referensi pekerjaan, progres, dan kebutuhan proyek.",tags:["Penawaran","Progres","Referensi"],brand:"FAKTURKU · PROYEK",doc:"RINGKASAN PROYEK",number:"PR-2026-0007",label:"STATUS PROYEK",total:"Berjalan"},
    operasional: {title:"Dokumen operasional",copy:"Contoh dokumen untuk membantu koordinasi, persetujuan, dan pencatatan proses internal.",tags:["Permintaan","Persetujuan","Catatan"],brand:"FAKTURKU · OPERASIONAL",doc:"FORM OPERASIONAL",number:"OP-2026-0015",label:"STATUS",total:"Menunggu tinjauan"}
  };
  const categoryKeys = Object.keys(categoryData);

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
    const data = categoryData[key];
    if (!data) return;
    categoryTabs.forEach((tab) => {
      const active = tab.dataset.category === key;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    Object.entries({title:data.title,copy:data.copy,brand:data.brand,doc:data.doc,number:data.number,label:data.label,total:data.total}).forEach(([field,value]) => {
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

  /* ---------- stage dokumen di hero (7 kategori, autoplay) ---------- */
  const stage = {
    wrap: root.querySelector(".hero-stage"),
    card: root.querySelector("#doc-card"),
    brand: root.querySelector("#doc-card-brand"),
    title: root.querySelector("#doc-card-title"),
    number: root.querySelector("#doc-card-number"),
    copy: root.querySelector("#doc-card-copy"),
    totalLabel: root.querySelector("#doc-card-total-label"),
    total: root.querySelector("#doc-card-total"),
    tags: root.querySelector("#doc-card-tags"),
    dots: root.querySelector("#doc-dots"),
    chips: [...root.querySelectorAll("[data-doc-chip]")]
  };
  const STAGE_MS = 3600;
  let stageIndex = 0;
  let stageTimer = null;
  let stagePaused = false;
  let takeoverUntil = 0;

  const fillStage = (data) => {
    if (!stage.card) return;
    stage.brand.textContent = data.brand;
    stage.title.textContent = data.doc;
    stage.number.textContent = data.number;
    stage.copy.textContent = data.copy;
    stage.totalLabel.textContent = data.label;
    stage.total.textContent = data.total;
    stage.tags.replaceChildren(...data.tags.map((tag) => {
      const chip = document.createElement("span");
      chip.textContent = tag;
      return chip;
    }));
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

  const showStage = (index, animate = true) => {
    const key = categoryKeys[index];
    const data = categoryData[key];
    if (!data) return;
    stageIndex = index;
    const apply = () => {
      fillStage(data);
      stage.card?.classList.remove("is-swapping");
    };
    if (animate && !reduceMotion && stage.card) {
      stage.card.classList.add("is-swapping");
      window.setTimeout(apply, 240);
    } else {
      apply();
    }
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
      dot.setAttribute("aria-label", "Contoh dokumen " + categoryData[key].title);
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
  if (stage.card) {
    fillStage(categoryData[categoryKeys[0]]);
    paintStageControls(categoryKeys[0]);
    const start = () => window.requestIdleCallback
      ? window.requestIdleCallback(startStage, { timeout: 2500 })
      : window.setTimeout(startStage, 600);
    if (reduceMotion) showStage(0, false);
    else start();
  }

  /* ---------- auth: satu kartu, dua tampilan (kolom kanan / bottom sheet) ---------- */
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
})();
