export default {
  id: "struk-ansuran",
  label: "Struk Angsuran (Thermal 58mm)",
  category: "umkm",
  output: "thermal",
  uses: ["installment"],

  render(s, h) {
    const t = h.totals(s);
    const kv = (k, v) => `<div class="th-kv"><span class="k">${h.esc(k)}</span><span class="v">${v}</span></div>`;

    return `
      <div class="th-title">${h.esc(s.issuer.name) || "NAMA PERUSAHAAN"}</div>
      <div class="th-sub">${h.esc(s.issuer.address)}${s.issuer.phone ? "\nTelp: " + h.esc(s.issuer.phone) : ""}</div>
      <div class="th-rule solid"></div>
      <div class="th-title" style="font-size:11px">BUKTI PEMBAYARAN ANGSURAN</div>
      <div class="th-rule"></div>

      ${kv("No. Struk", h.esc(s.number))}
      ${kv("Tanggal", h.formatDate(s.date))}
      ${kv("No. Kontrak", h.esc(s.contractNo) || "-")}
      ${kv("Nasabah", h.esc(s.customerName) || "-")}
      ${kv("Angsuran Ke", h.esc(s.installmentNo) || "-")}
      ${s.installmentDue ? kv("Jatuh Tempo", h.formatDate(s.installmentDue)) : ""}

      <div class="th-rule"></div>
      ${kv("Pokok", h.rupiah(s.principal))}
      ${kv("Bunga", h.rupiah(s.interest))}
      ${kv("Denda", h.rupiah(s.fine))}
      <div class="th-rule"></div>

      <div class="th-total"><span>TOTAL</span><span>${h.rupiah(t.installmentTotal)}</span></div>
      <div style="font-size:9px;padding:2px 0">Terbilang: ${h.terbilang(t.installmentTotal)}</div>

      <div class="th-rule"></div>
      ${s.remaining ? kv("Sisa Tagihan", h.rupiah(s.remaining)) : ""}

      <div class="th-sign2">
        <div class="col">
          <div class="lbl">Dibuat oleh</div>
          <div class="space"></div>
          <div class="th-rule solid"></div>
          <div class="nm">${h.esc(s.signatures.maker.name) || "(...............)"}</div>
          ${s.signatures.maker.title ? `<div class="ti">${h.esc(s.signatures.maker.title)}</div>` : ""}
        </div>
        <div class="col">
          <div class="lbl">Diterima oleh</div>
          <div class="space"></div>
          <div class="th-rule solid"></div>
          <div class="nm">${h.esc(s.signatures.receiver.name) || "(...............)"}</div>
          ${s.signatures.receiver.title ? `<div class="ti">${h.esc(s.signatures.receiver.title)}</div>` : ""}
        </div>
      </div>

      <div class="th-rule"></div>
      <div class="th-foot">Simpan struk ini sebagai bukti pembayaran sah.
Kode verifikasi: ${h.verifyCode(s.number)}
${h.esc(s.notes) || ""}</div>
    `;
  },
};
