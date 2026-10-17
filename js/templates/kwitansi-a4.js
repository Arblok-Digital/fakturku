export default {
  id: "kwitansi-a4",
  label: "Kwitansi / Tanda Terima (A4)",
  category: "finance",
  price_per_doc: 0,
  output: "a4",
  uses: ["receipt"],

  render(s, h) {
    const amount = Number(s.amount) || 0;
    const logo = s.logo
      ? `<img class="doc-logo" src="${h.esc(s.logo)}" alt="Logo">`
      : `<div class="doc-logo-ph">LOGO</div>`;

    return `
      <div class="doc-head">
        <div class="doc-issuer">
          ${logo}
          <div class="nm">${h.esc(s.issuer.name) || "&nbsp;"}</div>
          <div class="addr">${h.esc(s.issuer.address)}</div>
          <div class="mono">NPWP: ${h.esc(s.issuer.npwp)}</div>
          <div class="mono">Telp: ${h.esc(s.issuer.phone)}</div>
        </div>
        <div class="doc-title">
          <div class="t">Kwitansi</div>
          <div class="no">No. ${h.esc(s.number)}</div>
        </div>
      </div>
      <hr class="doc-rule">

      <p style="margin:18px 0 6px">Pada hari ini, <b>${h.formatDate(s.date)}</b>, telah kami terima uang dari:</p>
      <div style="border-bottom:1px solid var(--ink-900);padding:6px 4px;font-weight:700;font-size:14px">
        ${h.esc(s.receivedFrom) || "&nbsp;"}
      </div>

      <p style="margin:16px 0 6px">Untuk pembayaran:</p>
      <div style="border-bottom:1px solid var(--ink-900);padding:6px 4px">
        ${h.esc(s.forPayment) || "&nbsp;"}
      </div>

      <p style="margin:18px 0 6px">Sejumlah:</p>
      <div style="border:2px solid var(--navy-700);padding:12px 14px;display:flex;justify-content:space-between;align-items:baseline">
        <b style="font-size:15px">${h.rupiah(amount)}</b>
        <span class="mono" style="font-size:12px;color:var(--ink-500)">${h.esc(s.payment.method || "")}</span>
      </div>
      <div class="doc-terbilang">Terbilang: <b>${h.terbilang(amount)}</b></div>

      <table class="doc-meta" style="margin-top:14px">
        <tr><td class="k">Nomor Kwitansi</td><td>${h.esc(s.number)}</td></tr>
        <tr><td class="k">Tanggal</td><td>${h.formatDate(s.date)}</td></tr>
        ${s.payment.bank ? `<tr><td class="k">Diterima via</td><td>${h.esc(s.payment.bank)} ${h.esc(s.payment.accountNo)}</td></tr>` : ""}
      </table>

      <div class="doc-signs">
        <div class="doc-sign">
          <div class="role">Yang Menerima</div>
          <div class="space"></div>
          <div class="line-name">${h.esc(s.signatures.maker.name) || "&nbsp;"}</div>
          <div class="line-title">${h.esc(s.signatures.maker.title)}</div>
        </div>
        ${s.stamp ? `<div class="meterai">METERAI<br>10.000</div>` : ""}
        <div class="doc-sign">
          <div class="role">Yang Membayar</div>
          <div class="space"></div>
          <div class="line-name">${h.esc(s.signatures.receiver.name) || "&nbsp;"}</div>
          <div class="line-title">${h.esc(s.signatures.receiver.title)}</div>
        </div>
      </div>

      ${s.notes ? `<div class="doc-foot"><b>Catatan:</b> ${h.esc(s.notes)}</div>` : ""}
      <div class="doc-verify">Kode verifikasi: ${h.verifyCode(s.number)} · Dokumen diterbitkan oleh FakturKu</div>
    `;
  },
};
