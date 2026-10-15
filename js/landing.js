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


  const heroVariants = [...root.querySelectorAll("[data-hero-variant]")];
  const heroSwitches = [...root.querySelectorAll("[data-hero-preview]")];
  const heroNotes = {
    invoice: ["Total otomatis dihitung", "Contoh preview invoice"],
    receipt: ["Bukti pembayaran", "Contoh preview kuitansi"],
    thermal: ["Format struk ringkas", "Hasil cetak bergantung perangkat"]
  };
  heroSwitches.forEach((button) => {
    button.addEventListener("click", () => {
      const selected = button.dataset.heroPreview;
      heroSwitches.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      heroVariants.forEach((item) => {
        const active = item.dataset.heroVariant === selected;
        item.hidden = !active;
        item.classList.toggle("is-active", active);
      });
      const note = heroNotes[selected] || heroNotes.invoice;
      const title = root.querySelector("#hero-note-title");
      const sub = root.querySelector("#hero-note-sub");
      if (title) title.textContent = note[0];
      if (sub) sub.textContent = note[1];
    });
  });

  const categoryData = {
    finance: {title:"Invoice & tagihan",copy:"Dokumen keuangan untuk menagih pembayaran dan merapikan catatan transaksi bisnis.",tags:["Invoice","Kuitansi","Bukti transaksi"],brand:"FAKTURKU · FINANCE",doc:"INVOICE",number:"INV-2026-0108",label:"TOTAL TAGIHAN",total:"Rp 3.750.000"},
    legal: {title:"Surat & administrasi",copy:"Contoh kebutuhan dokumen administratif untuk mendukung proses bisnis dan kesepakatan.",tags:["Surat","Pernyataan","Administrasi"],brand:"FAKTURKU · LEGAL",doc:"SURAT PERNYATAAN",number:"ADM-2026-0021",label:"STATUS DOKUMEN",total:"Siap diperiksa"},
    umkm: {title:"Nota & bukti transaksi",copy:"Contoh dokumen ringkas untuk membantu usaha mencatat transaksi harian dengan lebih rapi.",tags:["Nota","Kuitansi","Struk"],brand:"FAKTURKU · UMKM",doc:"NOTA PENJUALAN",number:"NT-2026-0032",label:"TOTAL TRANSAKSI",total:"Rp 125.000"},
    logistik: {title:"Pengiriman & serah terima",copy:"Contoh dokumen pendukung pencatatan barang, pengiriman, dan penerimaan.",tags:["Surat jalan","Serah terima","Pengiriman"],brand:"FAKTURKU · LOGISTIK",doc:"SURAT JALAN",number:"SJ-2026-0014",label:"STATUS PENGIRIMAN",total:"Dalam proses"},
    pajak: {title:"Administrasi perpajakan",copy:"Contoh lembar kerja dan informasi pendukung untuk administrasi pajak bisnis.",tags:["Data pajak","Periode","Ringkasan"],brand:"FAKTURKU · PAJAK",doc:"RINGKASAN PAJAK",number:"TX-2026-0010",label:"NILAI PAJAK",total:"Rp 375.000"},
    proyek: {title:"Pekerjaan & proyek",copy:"Contoh dokumen untuk merapikan referensi pekerjaan, progres, dan kebutuhan proyek.",tags:["Penawaran","Progres","Referensi"],brand:"FAKTURKU · PROYEK",doc:"RINGKASAN PROYEK",number:"PR-2026-0007",label:"STATUS PROYEK",total:"Berjalan"},
    operasional: {title:"Dokumen operasional",copy:"Contoh dokumen untuk membantu koordinasi, persetujuan, dan pencatatan proses internal.",tags:["Permintaan","Persetujuan","Catatan"],brand:"FAKTURKU · OPERASIONAL",doc:"FORM OPERASIONAL",number:"OP-2026-0015",label:"STATUS",total:"Menunggu tinjauan"}
  };
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

  root.querySelectorAll("[data-open-auth]").forEach((control) => {
    control.addEventListener("click", () => {
      const mode = control.getAttribute("data-open-auth");
      if (mode === "up") document.querySelector("#auth-tab-up")?.click();
      if (mode === "in") document.querySelector("#auth-tab-in")?.click();
      window.setTimeout(() => {
        const panel = document.querySelector("#landing-auth-panel");
        panel?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        document.querySelector("#auth-email")?.focus({ preventScroll: true });
      }, 0);
    });
  });
})();
