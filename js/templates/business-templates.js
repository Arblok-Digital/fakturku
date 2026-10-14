function makeTemplate(config) {
  return {
    ...config,
    uses: ["custom", ...(config.uses || [])],
    render(state, helpers) {
      const custom = state.custom?.[config.id] || {};
      const fields = config.fields
        .map((field) => ({ ...field, value: custom[field.id] }))
        .filter((field) => field.value !== "" && field.value != null)
        .map((field) => {
          const value = field.type === "money"
              ? helpers.rupiah(Number(field.value) || 0)
              : field.type === "date"
                ? helpers.esc(helpers.formatDate(field.value))
                : field.type === "datetime-local"
                  ? helpers.esc(new Date(field.value).toLocaleString("id-ID"))
                : helpers.esc(field.value);
          return config.fieldsAsSections
            ? `<section class="business-notes"><div class="doc-lbl">${helpers.esc(field.label)}</div><div class="business-field-value">${value}</div></section>`
            : `<tr><td class="k">${helpers.esc(field.label)}</td><td>${value}</td></tr>`;
        })
        .join("");
      const client = state.client?.name || state.client?.address
        ? `<section class="business-parties">
            <div class="doc-lbl">Penerima</div>
            <b>${helpers.esc(state.client.name || "—")}</b>
            ${state.client.address ? `<div class="addr">${helpers.esc(state.client.address)}</div>` : ""}
          </section>`
        : "";
      const itemRows = (state.items || [])
        .filter((item) => item.desc || Number(item.qty) || Number(item.price))
        .map((item, i) => {
          if (config.output === "thermal") return `<tr>
              <td>${helpers.esc(item.desc || "Item")} × ${Number(item.qty) || 0}</td>
              <td class="r">${helpers.rupiah((Number(item.qty) || 0) * (Number(item.price) || 0))}</td>
            </tr>`;
          if (config.itemsMode === "quantity") return `<tr>
              <td>${i + 1}</td><td>${helpers.esc(item.desc || "—")}</td>
              <td class="r">${Number(item.qty) || 0}</td>
            </tr>`;
          if (config.itemsMode === "price-list") return `<tr>
              <td>${i + 1}</td><td>${helpers.esc(item.desc || "—")}</td>
              <td class="r">${Number(item.qty) || 0}</td>
              <td class="r">${helpers.rupiah(Number(item.price) || 0)}</td>
            </tr>`;
          return `<tr>
              <td>${i + 1}</td>
              <td>${helpers.esc(item.desc || "—")}</td>
              <td class="r">${Number(item.qty) || 0}</td>
              <td class="r">${helpers.rupiah((Number(item.qty) || 0) * (Number(item.price) || 0))}</td>
            </tr>`;
        })
        .join("");
      const items = config.uses?.includes("items") ? `
        <table class="doc-table business-items">
          <thead><tr>${config.output === "thermal"
            ? '<th>Rincian</th><th class="r">Nilai</th>'
            : config.itemsMode === "quantity"
              ? "<th>No</th><th>Uraian</th><th class=\"r\">Qty</th>"
              : config.itemsMode === "price-list"
                ? "<th>No</th><th>Uraian</th><th class=\"r\">Qty</th><th class=\"r\">Harga</th>"
                : "<th>No</th><th>Uraian</th><th class=\"r\">Qty</th><th class=\"r\">Jumlah</th>"}</tr></thead>
          <tbody>${itemRows || `<tr><td colspan="${config.output === "thermal" ? 2 : config.itemsMode === "quantity" ? 3 : 4}">Belum ada rincian.</td></tr>`}</tbody>
        </table>` : "";
      const payment = (config.uses?.includes("payment") && (state.payment?.bank || state.payment?.accountNo || state.payment?.accountName || state.payment?.method)) ? `
        <section class="business-notes"><div class="doc-lbl">Informasi pembayaran</div><div class="business-field-value">${[
          state.payment.bank ? `Bank: ${state.payment.bank}` : "",
          state.payment.accountNo ? `No. Rekening: ${state.payment.accountNo}` : "",
          state.payment.accountName ? `Atas Nama: ${state.payment.accountName}` : "",
          state.payment.method ? `Metode: ${state.payment.method}` : "",
        ].filter(Boolean).map((line) => helpers.esc(line)).join("\n")}</div></section>` : "";
      const extraTotal = config.extraTotalField ? Number(custom[config.extraTotalField]) || 0 : 0;
      const total = helpers.totals(state).total + extraTotal;
      const totals = config.uses?.includes("items") && config.showTotal !== false
        ? `<div class="business-total"><span>${helpers.esc(config.totalLabel || "Total")}</span><b>${helpers.rupiah(total)}</b></div>`
        : "";
      const notes = state.notes
        ? `<section class="business-notes"><div class="doc-lbl">Catatan</div><div>${helpers.esc(state.notes)}</div></section>`
        : "";
      const terms = state.terms
        ? `<section class="business-notes"><div class="doc-lbl">Syarat dan ketentuan</div><div>${helpers.esc(state.terms)}</div></section>`
        : "";
      const signatures = config.signature
        ? `<div class="business-signatures">
            <div>${helpers.esc(config.signLabels?.[0] || "Dibuat oleh")}<span></span>
              ${helpers.esc(state.signatures?.maker?.name || "Nama")}<br>
              ${helpers.esc(state.signatures?.maker?.title || "Tanda tangan")}
            </div>
            <div>${helpers.esc(config.signLabels?.[1] || "Disetujui oleh")}<span></span>
              ${helpers.esc(state.signatures?.receiver?.name || "Nama")}<br>
              ${helpers.esc(state.signatures?.receiver?.title || "Tanda tangan")}
            </div>
          </div>`
        : "";
      const notice = config.notice
        ? `<p class="business-notice">${helpers.esc(config.notice)}</p>`
        : "";
      const metadata = [
        ["Nomor", state.number],
        ["Tanggal", helpers.formatDate(state.date)],
        state.dueDate ? ["Jatuh tempo", helpers.formatDate(state.dueDate)] : null,
      ].filter(Boolean).map(([label, value]) =>
        `<tr><td class="k">${label}</td><td>${helpers.esc(value)}</td></tr>`
      ).join("");

      return `
        <header class="business-doc-head">
          <div class="doc-issuer">
            ${state.logo ? `<img class="doc-logo" src="${helpers.esc(state.logo)}" alt="Logo">` : ""}
            <div class="nm">${helpers.esc(state.issuer.name || "NAMA USAHA")}</div>
            ${state.issuer.address ? `<div class="addr">${helpers.esc(state.issuer.address)}</div>` : ""}
            ${state.issuer.phone ? `<div>${helpers.esc(state.issuer.phone)}</div>` : ""}
          </div>
          <div class="doc-title">
            <div class="t">${helpers.esc(config.documentTitle)}</div>
            <table class="doc-meta">${metadata}</table>
          </div>
        </header>
        <hr class="doc-rule">
        ${notice}
        ${client}
        ${fields ? config.fieldsAsSections ? fields : `<table class="business-fields">${fields}</table>` : ""}
        ${items}
        ${totals}
        ${payment}
        ${notes}
        ${terms}
        ${signatures}
        <footer class="business-footer">Dibuat dengan FakturKu</footer>
      `;
    },
  };
}

export const BUSINESS_TEMPLATES = [
  makeTemplate({
    id: "credit-note",
    label: "Nota Kredit",
    category: "finance",
    output: "a4",
    documentTitle: "Nota Kredit",
    uses: ["client", "items", "sign"],
    signature: true,
    fields: [
      { id: "originalInvoice", label: "Nomor faktur asal", type: "text" },
      { id: "reason", label: "Alasan koreksi / retur", type: "textarea" },
      { id: "creditAmount", label: "Nilai pengurang (Rp)", type: "money" },
    ],
  }),
  makeTemplate({
    id: "debit-note",
    label: "Nota Debit",
    category: "finance",
    output: "a4",
    documentTitle: "Nota Debit",
    uses: ["client", "items", "sign"],
    signature: true,
    fields: [
      { id: "originalInvoice", label: "Nomor faktur asal", type: "text" },
      { id: "reason", label: "Alasan penambahan / koreksi", type: "textarea" },
      { id: "additionalAmount", label: "Nilai tambahan (Rp)", type: "money" },
    ],
  }),
  makeTemplate({
    id: "surat-tagihan",
    label: "Surat Tagihan",
    category: "finance",
    output: "a4",
    documentTitle: "Surat Tagihan",
    uses: ["client", "payment", "sign"],
    signature: true,
    fields: [
      { id: "invoiceRef", label: "Nomor faktur / tagihan", type: "text" },
      { id: "dueOn", label: "Jatuh tempo", type: "date" },
      { id: "remainingAmount", label: "Sisa tagihan (Rp)", type: "money" },
      { id: "contact", label: "Kontak untuk pembayaran", type: "text" },
      { id: "message", label: "Pesan tagihan", type: "textarea" },
    ],
  }),
  makeTemplate({
    id: "invoice-berkala",
    label: "Invoice Berkala",
    category: "finance",
    output: "a4",
    documentTitle: "Invoice Berkala",
    uses: ["client", "due", "items", "payment", "terms"],
    fields: [
      { id: "period", label: "Periode tagihan", type: "text", placeholder: "Contoh: Januari 2026" },
      { id: "serviceName", label: "Layanan / paket", type: "text" },
    ],
    notice: "Template untuk tagihan rutin. Pengiriman dan penjadwalan otomatis belum tersedia.",
  }),
  makeTemplate({
    id: "nota-kontan",
    label: "Nota Kontan",
    category: "umkm",
    output: "a4",
    documentTitle: "Nota Kontan",
    uses: ["client", "items", "payment", "sign"],
    signature: true,
    signLabels: ["Penjual", "Pembeli"],
    fields: [
      { id: "paymentMethod", label: "Cara bayar", type: "text", placeholder: "Tunai / transfer / QRIS" },
    ],
  }),
  makeTemplate({
    id: "surat-penawaran",
    label: "Penawaran Harga",
    category: "umkm",
    output: "a4",
    documentTitle: "Penawaran Harga",
    uses: ["client", "due", "items", "terms", "sign"],
    signature: true,
    signLabels: ["Pemberi penawaran", "Penerima"],
    fields: [
      { id: "validUntil", label: "Berlaku sampai", type: "date" },
      { id: "offerMessage", label: "Pesan penawaran", type: "textarea" },
    ],
  }),
  makeTemplate({
    id: "surat-pesanan",
    label: "Formulir Pesanan",
    category: "umkm",
    output: "a4",
    documentTitle: "Formulir Pesanan",
    uses: ["client", "items", "payment", "sign"],
    signature: true,
    signLabels: ["Penerima pesanan", "Pemesan"],
    fields: [
      { id: "orderRef", label: "Nomor pesanan pelanggan", type: "text" },
      { id: "deliveryAddress", label: "Alamat pengiriman", type: "textarea" },
      { id: "neededOn", label: "Tanggal dibutuhkan", type: "date" },
    ],
  }),
  makeTemplate({
    id: "struk-pos",
    label: "Struk Penjualan (Thermal)",
    category: "umkm",
    output: "thermal",
    documentTitle: "Struk Penjualan",
    uses: ["items", "sign"],
    fields: [
      { id: "cashier", label: "Nama kasir", type: "text" },
      { id: "paymentMethod", label: "Cara bayar", type: "text" },
      { id: "amountPaid", label: "Dibayar (Rp)", type: "money" },
      { id: "change", label: "Kembalian (Rp)", type: "money" },
    ],
    signature: false,
  }),
  makeTemplate({
    id: "daftar-harga",
    label: "Daftar Harga",
    category: "umkm",
    output: "a4",
    documentTitle: "Daftar Harga",
    uses: ["items", "sign"],
    itemsMode: "price-list",
    showTotal: false,
    fields: [
      { id: "validFrom", label: "Berlaku mulai", type: "date" },
      { id: "priceNote", label: "Catatan harga", type: "textarea" },
    ],
  }),
  makeTemplate({
    id: "surat-jalan",
    label: "Surat Jalan",
    category: "logistik",
    output: "a4",
    documentTitle: "Surat Jalan",
    uses: ["client", "items", "sign"],
    itemsMode: "quantity",
    showTotal: false,
    signature: true,
    signLabels: ["Pengirim", "Penerima"],
    fields: [
      { id: "orderRef", label: "Nomor pesanan / referensi", type: "text" },
      { id: "destination", label: "Alamat tujuan", type: "textarea" },
      { id: "vehicle", label: "Kendaraan / nomor polisi", type: "text" },
      { id: "driver", label: "Nama pengemudi", type: "text" },
      { id: "deliveryTime", label: "Waktu pengiriman", type: "datetime-local" },
    ],
  }),
  makeTemplate({
    id: "bukti-terima-barang",
    label: "Bukti Terima Barang",
    category: "logistik",
    output: "a4",
    documentTitle: "Bukti Terima Barang",
    uses: ["client", "items", "sign"],
    itemsMode: "quantity",
    showTotal: false,
    signature: true,
    signLabels: ["Diserahkan oleh", "Diterima oleh"],
    fields: [
      { id: "reference", label: "Nomor surat jalan / pesanan", type: "text" },
      { id: "receivedAt", label: "Tanggal diterima", type: "date" },
      { id: "condition", label: "Kondisi barang", type: "textarea" },
      { id: "shortages", label: "Barang kurang / rusak", type: "textarea" },
    ],
  }),
  makeTemplate({
    id: "retur-barang",
    label: "Formulir Retur Barang",
    category: "logistik",
    output: "a4",
    documentTitle: "Formulir Retur Barang",
    uses: ["client", "items", "sign"],
    itemsMode: "quantity",
    showTotal: false,
    signature: true,
    signLabels: ["Pihak menyerahkan", "Pihak menerima"],
    fields: [
      { id: "transactionRef", label: "Nomor transaksi asal", type: "text" },
      { id: "returnReason", label: "Alasan retur", type: "textarea" },
      { id: "itemCondition", label: "Kondisi barang", type: "text" },
      { id: "resolution", label: "Keputusan / tindak lanjut", type: "textarea" },
    ],
  }),
  makeTemplate({
    id: "packing-list",
    label: "Daftar Kemasan",
    category: "logistik",
    output: "a4",
    documentTitle: "Daftar Kemasan",
    uses: ["client", "items", "sign"],
    itemsMode: "quantity",
    showTotal: false,
    signature: true,
    signLabels: ["Dikemas oleh", "Diperiksa oleh"],
    fields: [
      { id: "shipmentRef", label: "Nomor kiriman", type: "text" },
      { id: "packageCount", label: "Jumlah paket", type: "number" },
      { id: "packageContents", label: "Isi tiap paket", type: "textarea" },
      { id: "weight", label: "Berat total (kg)", type: "number" },
      { id: "dimensions", label: "Ukuran paket", type: "text" },
    ],
  }),
  makeTemplate({
    id: "rab-proyek",
    label: "Rencana Anggaran Biaya (RAB)",
    category: "proyek",
    output: "a4",
    documentTitle: "Rencana Anggaran Biaya",
    uses: ["client", "items", "sign"],
    signature: true,
    signLabels: ["Disusun oleh", "Diperiksa oleh"],
    extraTotalField: "otherCosts",
    fields: [
      { id: "projectName", label: "Nama pekerjaan", type: "text" },
      { id: "location", label: "Lokasi pekerjaan", type: "text" },
      { id: "otherCosts", label: "Biaya lain-lain (Rp)", type: "money" },
    ],
    notice: "RAB ini adalah perkiraan biaya. Periksa volume, harga, pajak, dan syarat proyek sebelum disetujui.",
  }),
  makeTemplate({
    id: "bast-proyek",
    label: "Berita Acara Serah Terima Pekerjaan",
    category: "proyek",
    output: "a4",
    documentTitle: "Berita Acara Serah Terima Pekerjaan",
    uses: ["client", "sign"],
    fieldsAsSections: true,
    signature: true,
    signLabels: ["Pihak yang menyerahkan", "Pihak yang menerima"],
    fields: [
      { id: "contractRef", label: "Nomor kontrak / pekerjaan", type: "text" },
      { id: "workName", label: "Nama pekerjaan", type: "text" },
      { id: "location", label: "Lokasi pekerjaan", type: "text" },
      { id: "result", label: "Hasil yang diserahkan", type: "textarea" },
      { id: "condition", label: "Kondisi / catatan", type: "textarea" },
      { id: "handoverDate", label: "Tanggal serah terima", type: "date" },
    ],
    notice: "Sesuaikan isi dengan kontrak dan kondisi pekerjaan. Tinjau sebelum ditandatangani.",
  }),
  makeTemplate({
    id: "surat-perintah-bayar",
    label: "Surat Perintah Bayar",
    category: "proyek",
    output: "a4",
    documentTitle: "Surat Perintah Bayar",
    uses: ["client", "payment", "sign"],
    signature: true,
    signLabels: ["Dibuat oleh", "Disetujui oleh"],
    fields: [
      { id: "projectRef", label: "Nomor proyek / kontrak", type: "text" },
      { id: "paymentBasis", label: "Dasar pembayaran", type: "textarea" },
      { id: "stage", label: "Termin / tahap", type: "text" },
      { id: "progress", label: "Progres pekerjaan (%)", type: "number" },
      { id: "amount", label: "Nilai pembayaran (Rp)", type: "money" },
    ],
    notice: "Pastikan pembayaran sesuai kontrak dan telah mendapat persetujuan yang diperlukan.",
  }),
  makeTemplate({
    id: "tagihan-termin",
    label: "Tagihan Termin",
    category: "proyek",
    output: "a4",
    documentTitle: "Tagihan Termin",
    uses: ["client", "due", "items", "payment", "sign"],
    signature: true,
    totalLabel: "Nilai termin",
    fields: [
      { id: "contractRef", label: "Nomor kontrak", type: "text" },
      { id: "stage", label: "Tahap / termin ke-", type: "text" },
      { id: "progress", label: "Progres pekerjaan (%)", type: "number" },
      { id: "previousPayments", label: "Pembayaran sebelumnya (Rp)", type: "money" },
      { id: "remaining", label: "Sisa tagihan (Rp)", type: "money" },
    ],
  }),
  makeTemplate({
    id: "berita-acara-pekerjaan",
    label: "Berita Acara Pekerjaan",
    category: "proyek",
    output: "a4",
    documentTitle: "Berita Acara Pekerjaan",
    uses: ["client", "sign"],
    fieldsAsSections: true,
    signature: true,
    signLabels: ["Perwakilan pelaksana", "Perwakilan pemberi kerja"],
    fields: [
      { id: "workRef", label: "Nomor pekerjaan", type: "text" },
      { id: "location", label: "Lokasi", type: "text" },
      { id: "workDate", label: "Tanggal pekerjaan", type: "date" },
      { id: "progress", label: "Hasil / progres pekerjaan", type: "textarea" },
      { id: "attendees", label: "Pihak yang hadir", type: "textarea" },
      { id: "issues", label: "Kendala / catatan", type: "textarea" },
      { id: "followUp", label: "Tindak lanjut", type: "textarea" },
    ],
  }),
  makeTemplate({
    id: "memo-internal",
    label: "Memo Internal",
    category: "operasional",
    output: "a4",
    documentTitle: "Memo Internal",
    uses: ["sign"],
    fieldsAsSections: true,
    signature: true,
    signLabels: ["Dibuat oleh", "Diketahui oleh"],
    fields: [
      { id: "recipient", label: "Kepada", type: "text" },
      { id: "sender", label: "Dari", type: "text" },
      { id: "subject", label: "Subjek", type: "text" },
      { id: "message", label: "Isi memo", type: "textarea" },
      { id: "reference", label: "Lampiran / referensi", type: "text" },
    ],
  }),
  makeTemplate({
    id: "surat-perjalanan-dinas",
    label: "Surat Perjalanan Dinas",
    category: "operasional",
    output: "a4",
    documentTitle: "Surat Perjalanan Dinas",
    uses: ["sign"],
    signature: true,
    signLabels: ["Petugas", "Pemberi tugas"],
    fields: [
      { id: "employee", label: "Nama / jabatan petugas", type: "text" },
      { id: "destination", label: "Tujuan perjalanan", type: "text" },
      { id: "purpose", label: "Keperluan", type: "textarea" },
      { id: "departure", label: "Tanggal berangkat", type: "date" },
      { id: "returnDate", label: "Tanggal pulang", type: "date" },
      { id: "transport", label: "Transportasi / biaya", type: "textarea" },
    ],
  }),
  makeTemplate({
    id: "klaim-biaya",
    label: "Klaim Biaya",
    category: "operasional",
    output: "a4",
    documentTitle: "Klaim Biaya",
    uses: ["items", "sign"],
    signature: true,
    signLabels: ["Pengaju", "Pemeriksa"],
    fields: [
      { id: "claimant", label: "Nama pengaju", type: "text" },
      { id: "claimDate", label: "Tanggal klaim", type: "date" },
      { id: "purpose", label: "Tujuan biaya", type: "textarea" },
      { id: "evidence", label: "Bukti / referensi", type: "text" },
    ],
  }),
  makeTemplate({
    id: "purchase-order",
    label: "Pesanan Pembelian (PO)",
    category: "operasional",
    output: "a4",
    documentTitle: "Pesanan Pembelian",
    uses: ["client", "due", "items", "terms", "sign"],
    signature: true,
    signLabels: ["Dipesan oleh", "Disetujui oleh"],
    fields: [
      { id: "supplier", label: "Nama pemasok", type: "text" },
      { id: "deliveryAddress", label: "Alamat pengiriman", type: "textarea" },
      { id: "neededOn", label: "Tanggal dibutuhkan", type: "date" },
    ],
    notice: "PO ini adalah dokumen pemesanan internal. Pastikan isi dan persetujuan sesuai proses usaha.",
  }),
  makeTemplate({
    id: "slip-gaji",
    label: "Slip Gaji",
    category: "operasional",
    output: "a4",
    documentTitle: "Slip Gaji",
    uses: ["sign"],
    fieldsAsSections: true,
    signature: true,
    signLabels: ["Dibuat oleh", "Diterima oleh"],
    fields: [
      { id: "employee", label: "Nama karyawan", type: "text" },
      { id: "employeeId", label: "ID / jabatan", type: "text" },
      { id: "period", label: "Periode gaji", type: "text" },
      { id: "earnings", label: "Rincian pendapatan", type: "textarea" },
      { id: "deductions", label: "Rincian potongan", type: "textarea" },
      { id: "netPay", label: "Gaji bersih (Rp)", type: "money" },
      { id: "paidOn", label: "Tanggal pembayaran", type: "date" },
    ],
    notice: "Informasi gaji bersifat pribadi. Bagikan hanya kepada karyawan dan pihak yang berwenang.",
  }),
  makeTemplate({
    id: "perjanjian-kerja-sama",
    label: "Perjanjian Kerja Sama",
    category: "legal",
    output: "a4",
    documentTitle: "Perjanjian Kerja Sama",
    uses: ["client", "sign"],
    fieldsAsSections: true,
    signature: true,
    signLabels: ["Pihak pertama", "Pihak kedua"],
    fields: [
      { id: "partyOne", label: "Identitas pihak pertama", type: "textarea" },
      { id: "partyTwo", label: "Identitas pihak kedua", type: "textarea" },
      { id: "scope", label: "Tujuan dan ruang lingkup", type: "textarea" },
      { id: "obligations", label: "Hak dan kewajiban", type: "textarea" },
      { id: "payment", label: "Nilai dan cara pembayaran", type: "textarea" },
      { id: "term", label: "Masa berlaku dan pengakhiran", type: "textarea" },
      { id: "dispute", label: "Penyelesaian perselisihan", type: "textarea" },
    ],
    notice: "Contoh umum, bukan nasihat hukum. Sesuaikan dengan para pihak dan minta tinjauan hukum sebelum ditandatangani.",
  }),
  makeTemplate({
    id: "surat-kuasa",
    label: "Surat Kuasa",
    category: "legal",
    output: "a4",
    documentTitle: "Surat Kuasa",
    uses: ["sign"],
    fieldsAsSections: true,
    signature: true,
    signLabels: ["Pemberi kuasa", "Penerima kuasa"],
    fields: [
      { id: "grantor", label: "Identitas pemberi kuasa", type: "textarea" },
      { id: "recipient", label: "Identitas penerima kuasa", type: "textarea" },
      { id: "authority", label: "Hal yang dikuasakan", type: "textarea" },
      { id: "limits", label: "Batas kuasa", type: "textarea" },
      { id: "validUntil", label: "Berlaku sampai", type: "date" },
      { id: "place", label: "Tempat pembuatan", type: "text" },
    ],
    notice: "Contoh umum, bukan nasihat hukum. Periksa persyaratan khusus dan identitas para pihak sebelum digunakan.",
  }),
  makeTemplate({
    id: "spk",
    label: "Surat Perintah Kerja",
    category: "legal",
    output: "a4",
    documentTitle: "Surat Perintah Kerja",
    uses: ["client", "items", "sign"],
    signature: true,
    signLabels: ["Pemberi kerja", "Pelaksana"],
    fields: [
      { id: "scope", label: "Lingkup pekerjaan", type: "textarea" },
      { id: "deliverables", label: "Hasil pekerjaan", type: "textarea" },
      { id: "schedule", label: "Jadwal pekerjaan", type: "textarea" },
      { id: "paymentTerms", label: "Nilai / cara pembayaran", type: "textarea" },
    ],
    notice: "Contoh umum, bukan nasihat hukum. Sesuaikan dengan kontrak dan tinjau sebelum disetujui.",
  }),
  makeTemplate({
    id: "letter-of-intent",
    label: "Surat Pernyataan Minat",
    category: "legal",
    output: "a4",
    documentTitle: "Surat Pernyataan Minat",
    uses: ["client", "sign"],
    fieldsAsSections: true,
    signature: true,
    signLabels: ["Pihak yang menyatakan minat", "Penerima"],
    fields: [
      { id: "parties", label: "Para pihak", type: "textarea" },
      { id: "purpose", label: "Tujuan minat", type: "textarea" },
      { id: "scope", label: "Ruang lingkup awal", type: "textarea" },
      { id: "validUntil", label: "Berlaku sampai", type: "date" },
      { id: "conditions", label: "Syarat lanjutan", type: "textarea" },
    ],
    notice: "Pernyataan minat ini bukan pengganti perjanjian final. Minta tinjauan hukum sebelum dijadikan komitmen.",
  }),
  makeTemplate({
    id: "surat-pernyataan",
    label: "Surat Pernyataan",
    category: "legal",
    output: "a4",
    documentTitle: "Surat Pernyataan",
    uses: ["sign"],
    fieldsAsSections: true,
    signature: true,
    signLabels: ["Yang membuat pernyataan", "Saksi / penerima"],
    fields: [
      { id: "declarant", label: "Identitas pembuat pernyataan", type: "textarea" },
      { id: "statement", label: "Isi pernyataan", type: "textarea" },
      { id: "purpose", label: "Tujuan / penerima", type: "text" },
      { id: "place", label: "Tempat pembuatan", type: "text" },
    ],
    notice: "Contoh umum, bukan nasihat hukum. Pastikan isi sesuai keadaan dan persyaratan penerima.",
  }),
  makeTemplate({
    id: "mou",
    label: "Nota Kesepahaman (MoU)",
    category: "legal",
    output: "a4",
    documentTitle: "Nota Kesepahaman",
    uses: ["client", "sign"],
    fieldsAsSections: true,
    signature: true,
    signLabels: ["Pihak pertama", "Pihak kedua"],
    fields: [
      { id: "parties", label: "Identitas para pihak", type: "textarea" },
      { id: "purpose", label: "Maksud dan ruang kerja sama", type: "textarea" },
      { id: "roles", label: "Peran masing-masing pihak", type: "textarea" },
      { id: "term", label: "Jangka waktu", type: "text" },
      { id: "confidentiality", label: "Kerahasiaan (opsional)", type: "textarea" },
      { id: "nextSteps", label: "Langkah lanjutan", type: "textarea" },
    ],
    notice: "Contoh umum, bukan nasihat hukum. Tinjau dampak dan kekuatan setiap klausul sebelum ditandatangani.",
  }),
  makeTemplate({
    id: "lembar-data-faktur-pajak",
    label: "Lembar Data Faktur Pajak",
    category: "pajak",
    output: "a4",
    documentTitle: "Lembar Data Faktur Pajak",
    uses: ["client", "items"],
    fieldsAsSections: true,
    fields: [
      { id: "sellerTaxId", label: "NPWP penjual", type: "text" },
      { id: "buyerTaxId", label: "NPWP pembeli", type: "text" },
      { id: "transactionRef", label: "Referensi transaksi", type: "text" },
      { id: "taxBase", label: "Dasar pengenaan (Rp)", type: "money" },
      { id: "taxAmount", label: "Komponen pajak (Rp)", type: "money" },
      { id: "reviewNote", label: "Catatan pemeriksaan internal", type: "textarea" },
    ],
    notice: "Lembar bantu internal, bukan Faktur Pajak resmi dan tidak dapat digunakan untuk pelaporan DJP.",
  }),
  makeTemplate({
    id: "lembar-data-setoran-pajak",
    label: "Catatan Setoran Pajak",
    category: "pajak",
    output: "a4",
    documentTitle: "Catatan Setoran Pajak",
    fieldsAsSections: true,
    fields: [
      { id: "taxType", label: "Jenis pajak", type: "text" },
      { id: "taxPeriod", label: "Masa / tahun pajak", type: "text" },
      { id: "amount", label: "Nominal (Rp)", type: "money" },
      { id: "paymentDate", label: "Tanggal rencana / pembayaran", type: "date" },
      { id: "paymentRef", label: "Referensi pembayaran resmi", type: "text" },
      { id: "note", label: "Catatan", type: "textarea" },
    ],
    notice: "Catatan internal saja, bukan bukti bayar pajak. Simpan bukti resmi dari kanal pembayaran yang berlaku.",
  }),
  makeTemplate({
    id: "lembar-kerja-bukti-potong",
    label: "Lembar Kerja Bukti Potong",
    category: "pajak",
    output: "a4",
    documentTitle: "Lembar Kerja Bukti Potong",
    uses: ["client"],
    fieldsAsSections: true,
    fields: [
      { id: "withholder", label: "Pemberi penghasilan", type: "text" },
      { id: "recipient", label: "Penerima penghasilan", type: "text" },
      { id: "incomeType", label: "Jenis penghasilan", type: "text" },
      { id: "taxPeriod", label: "Masa pajak", type: "text" },
      { id: "taxBase", label: "Dasar penghitungan (Rp)", type: "money" },
      { id: "withheld", label: "Perkiraan potongan (Rp)", type: "money" },
      { id: "officialRef", label: "Referensi bukti resmi", type: "text" },
    ],
    notice: "Lembar kerja internal, bukan Bukti Potong resmi. Verifikasi perhitungan dan terbitkan bukti melalui kanal DJP.",
  }),
];
