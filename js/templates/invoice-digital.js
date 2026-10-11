export default {
  id: "invoice-digital",
  label: "Invoice Digital (Share WA/TG)",
  output: "screen",
  uses: ["due", "client", "items", "payment"],

  render(s, h) {
    const t = h.totals(s);
    const kv = (k, v) => `<div class="d-kv"><span class="k">${h.esc(k)}</span><span class="v">${v}</span></div>`;
    const items = s.items
      .filter((it) => it.desc || it.qty || it.price)
      .map((it) => kv(it.desc || "—", h.rupiah((Number(it.qty) || 0) * (Number(it.price) || 0))))
      .join("");

    return `
      <div class="d-head">
        <div class="t">Invoice</div>
        <div class="nm">${h.esc(s.issuer.name) || "&nbsp;"}</div>
        <div class="sub">${h.esc(s.issuer.address)}${s.issuer.phone ? "\n" + h.esc(s.issuer.phone) : ""}</div>
      </div>

      <div class="d-parties">
        <div>
          <div class="doc-lbl">Kepada</div>
          <div><b>${h.esc(s.client.name) || "&nbsp;"}</b></div>
          <div class="addr" style="font-size:11px;color:var(--ink-500)">${h.esc(s.client.address)}</div>
        </div>
        <div>
          <div class="doc-lbl">Detail</div>
          ${kv("No.", h.esc(s.number))}
          ${kv("Tanggal", h.formatDate(s.date))}
          ${s.dueDate ? kv("Jatuh Tempo", h.formatDate(s.dueDate)) : ""}
        </div>
      </div>

      ${items ? `<div class="doc-lbl">Rincian</div>${items}` : ""}
      ${Number(s.taxRate) ? kv(`PPN ${s.taxRate}%`, h.rupiah(t.tax)) : ""}
      ${Number(s.discount) ? kv("Diskon", "(" + h.rupiah(t.discount) + ")") : ""}

      <div class="d-total">
        <span class="lbl">Total Tagihan</span>
        <span class="val">${h.rupiah(t.total)}</span>
      </div>
      <div class="doc-terbilang">Terbilang: <b>${h.terbilang(t.total)}</b></div>

      ${(s.payment.bank || s.payment.accountNo) ? `
        <div class="doc-lbl" style="margin-top:12px">Cara Bayar</div>
        ${s.payment.bank ? kv("Bank", h.esc(s.payment.bank)) : ""}
        ${s.payment.accountNo ? kv("No. Rekening", h.esc(s.payment.accountNo)) : ""}
        ${s.payment.accountName ? kv("Atas Nama", h.esc(s.payment.accountName)) : ""}
        ${s.payment.method ? kv("Metode", h.esc(s.payment.method)) : ""}
      ` : ""}

      ${s.notes ? `<div class="doc-foot">${h.esc(s.notes)}</div>` : ""}
      <div class="doc-verify">Kode verifikasi: ${h.verifyCode(s.number)} · FakturKu</div>
    `;
  },
};
