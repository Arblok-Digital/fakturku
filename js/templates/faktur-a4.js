export default {
  id: "faktur-a4",
  label: "Faktur Penjualan (A4)",
  category: "finance",
  output: "a4",
  uses: ["due", "client", "items", "payment", "terms"],

  render(s, h) {
    const t = h.totals(s);
    const logo = s.logo
      ? `<img class="doc-logo" src="${h.esc(s.logo)}" alt="Logo">`
      : `<div class="doc-logo-ph">LOGO</div>`;
    // F5: kolom Satuan hanya muncul bila minimal satu baris memakai satuan.
    const withUnit = s.items.some((it) => it.unit);
    const rows = s.items
      .filter((it) => it.desc || it.qty || it.price)
      .map((it, i) => {
        const amt = (Number(it.qty) || 0) * (Number(it.price) || 0);
        return `<tr>
          <td class="mono">${i + 1}</td>
          <td>${h.esc(it.desc)}</td>
          ${withUnit ? `<td>${h.esc(it.unit || "")}</td>` : ""}
          <td class="r mono">${Number(it.qty) || 0}</td>
          <td class="r mono">${h.rupiah(it.price)}</td>
          <td class="r mono">${h.rupiah(amt)}</td>
        </tr>`;
      })
      .join("");

    const payment = (s.payment.bank || s.payment.accountNo || s.payment.method)
      ? `<div class="doc-pay">
          <div class="doc-lbl">Informasi Pembayaran</div>
          ${s.payment.bank ? `Bank: <b class="mono">${h.esc(s.payment.bank)}</b>` : ""}
          ${s.payment.accountNo ? `<br>No. Rekening: <b class="mono">${h.esc(s.payment.accountNo)}</b>` : ""}
          ${s.payment.accountName ? `<br>Atas Nama: <b>${h.esc(s.payment.accountName)}</b>` : ""}
          ${s.payment.method ? `<br>Metode: ${h.esc(s.payment.method)}` : ""}
        </div>`
      : "";

    return `
      <div class="doc-head">
        <div class="doc-issuer">
          ${logo}
          <div class="nm">${h.esc(s.issuer.name) || "&nbsp;"}</div>
          <div class="addr">${h.esc(s.issuer.address)}</div>
          <div class="mono">NPWP: ${h.esc(s.issuer.npwp)}</div>
          <div class="mono">Telp: ${h.esc(s.issuer.phone)}${s.issuer.email ? " · " + h.esc(s.issuer.email) : ""}</div>
        </div>
        <div class="doc-title">
          <div class="t">Faktur</div>
          <div class="no">No. ${h.esc(s.number)}</div>
          <div class="no">Tanggal: ${h.formatDate(s.date)}</div>
          ${s.dueDate ? `<div class="no">Jatuh Tempo: ${h.formatDate(s.dueDate)}</div>` : ""}
        </div>
      </div>
      <hr class="doc-rule">

      <div class="doc-parties">
        <div>
          <div class="doc-lbl">Ditagihkan Kepada</div>
          <div><b>${h.esc(s.client.name) || "&nbsp;"}</b></div>
          <div class="addr">${h.esc(s.client.address)}</div>
          <div class="mono">NPWP: ${h.esc(s.client.npwp)}</div>
          <div class="mono">Telp: ${h.esc(s.client.phone)}</div>
        </div>
        <div style="text-align:right">
          <table class="doc-meta" style="margin-left:auto">
            <tr><td class="k">Subtotal</td><td class="r">${h.rupiah(t.subtotal)}</td></tr>
            <tr><td class="k">Diskon</td><td class="r">(${h.rupiah(t.discount)})</td></tr>
            <tr><td class="k">PPN ${Number(s.taxRate) || 0}%</td><td class="r">${h.rupiah(t.tax)}</td></tr>
          </table>
        </div>
      </div>

      <table class="doc-table">
        <thead>
          <tr><th style="width:8%">No</th><th>Uraian</th>${withUnit ? '<th style="width:10%">Satuan</th>' : ""}<th class="r" style="width:12%">Qty</th><th class="r" style="width:20%">Harga</th><th class="r" style="width:22%">Jumlah</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="${withUnit ? 6 : 5}" style="text-align:center;color:var(--ink-300)">Belum ada rincian</td></tr>`}</tbody>
      </table>

      <div class="doc-totals">
        <table>
          <tr><td>Subtotal</td><td class="r">${h.rupiah(t.subtotal)}</td></tr>
          <tr><td>Diskon</td><td class="r">(${h.rupiah(t.discount)})</td></tr>
          <tr><td>PPN ${Number(s.taxRate) || 0}%</td><td class="r">${h.rupiah(t.tax)}</td></tr>
          <tr class="grand"><td>Total Tagihan</td><td class="r">${h.rupiah(t.total)}</td></tr>
        </table>
      </div>

      <div class="doc-terbilang">Terbilang: <b>${h.terbilang(t.total)}</b></div>
      ${payment}

      <div class="doc-signs">
        <div class="doc-sign">
          <div class="role">Dibuat oleh</div>
          <div class="space"></div>
          <div class="line-name">${h.esc(s.signatures.maker.name) || "&nbsp;"}</div>
          <div class="line-title">${h.esc(s.signatures.maker.title)}</div>
        </div>
        ${s.stamp ? `<div class="meterai">METERAI<br>10.000</div>` : ""}
        <div class="doc-sign">
          <div class="role">Diterima oleh</div>
          <div class="space"></div>
          <div class="line-name">${h.esc(s.signatures.receiver.name) || "&nbsp;"}</div>
          <div class="line-title">${h.esc(s.signatures.receiver.title)}</div>
        </div>
      </div>

      ${s.notes ? `<div class="doc-foot"><b>Catatan:</b> ${h.esc(s.notes)}</div>` : ""}
      ${s.terms ? `<div class="doc-foot">${h.esc(s.terms)}</div>` : ""}
      <div class="doc-verify">Kode verifikasi: ${h.verifyCode(s.number)} · Dokumen diterbitkan oleh FakturKu</div>
    `;
  },
};
