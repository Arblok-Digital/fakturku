const labels = {
  subject:"Perihal", reference:"Referensi dokumen", description:"Uraian / keterangan", period:"Periode", location:"Lokasi", validity:"Berlaku sampai", paymentTerms:"Syarat pembayaran", reason:"Alasan / dasar", status:"Status / hasil pemeriksaan",
  origin:"Lokasi asal", destination:"Tujuan pengiriman", driver:"Pengantar / pengemudi", vehicle:"Kendaraan / ekspedisi", condition:"Kondisi barang / hasil", quantity:"Jumlah / volume", unit:"Satuan",
  contractRef:"Nomor kontrak / SPK", scope:"Lingkup pekerjaan / kuasa", effectiveDate:"Mulai berlaku", endDate:"Akhir berlaku", authority:"Pihak / instansi terkait", witness:"Saksi",
  project:"Nama proyek", progress:"Progres (%)", contractValue:"Nilai kontrak (Rp)", previousPaid:"Pembayaran sebelumnya (Rp)", retention:"Retensi / potongan (Rp)", milestone:"Termin / tahap", inspection:"Hasil pemeriksaan",
  employee:"Nama karyawan", employeeId:"ID / NIK karyawan", position:"Jabatan", department:"Departemen", baseSalary:"Gaji pokok (Rp)", allowances:"Tunjangan (Rp)", deductions:"Potongan (Rp)", netPay:"Gaji bersih (Rp)",
  taxPeriod:"Masa pajak", taxType:"Jenis pajak", taxBase:"Dasar pengenaan (Rp)", taxAmount:"Nilai pajak (Rp)", taxId:"NPWP / identitas pajak",
  requestedBy:"Diminta oleh", approvedBy:"Disetujui oleh", deliveryDate:"Tanggal dibutuhkan / dikirim", supplier:"Pemasok", budget:"Anggaran (Rp)", recipientRole:"Jabatan penerima",
  returnReason:"Alasan retur", packing:"Jumlah kemasan", invoiceRef:"Nomor invoice terkait", contractDate:"Tanggal kontrak", invoicePeriod:"Periode penagihan", bankRef:"Referensi pembayaran"
};
const moneyFields = ["contractValue","previousPaid","retention","baseSalary","allowances","deductions","netPay","taxBase","taxAmount","budget"];
const definitions = [
{id:"credit-note",label:"Nota Kredit / Credit Note",category:"finance",title:"NOTA KREDIT",uses:["client","items","payment","business-core"],fields:["reference","reason","description"],total:true,partyLabel:"Ditujukan Kepada",signatures:["Hormat Kami","Penerima"],intro:"Dokumen koreksi untuk mengurangi nilai tagihan sebelumnya."},
{id:"debit-note",label:"Nota Debit / Debit Note",category:"finance",title:"NOTA DEBIT",uses:["client","items","payment","business-core"],fields:["reference","reason","description"],total:true,partyLabel:"Ditujukan Kepada",signatures:["Hormat Kami","Penerima"],intro:"Dokumen koreksi untuk menambah nilai tagihan sebelumnya."},
{id:"surat-tagihan",label:"Surat Tagihan",category:"finance",title:"SURAT TAGIHAN",uses:["client","items","payment","due","business-core"],fields:["reference","subject","period","paymentTerms"],total:true,partyLabel:"Kepada",signatures:["Hormat Kami","Penerima"],intro:"Permintaan pembayaran atas transaksi atau pekerjaan yang disepakati."},
{id:"invoice-berulang",label:"Invoice Periodik (Format)",category:"finance",title:"INVOICE PERIODIK",uses:["client","items","payment","due","business-core"],fields:["period","reference","paymentTerms"],total:true,partyLabel:"Kepada",signatures:["Hormat Kami","Penerima"],intro:"Format tagihan berkala; tidak menjadwalkan atau mengirim invoice otomatis."},
{id:"nota-kontan",label:"Nota Kontan",category:"umkm",title:"NOTA KONTAN",uses:["client","items","payment"],total:true,partyLabel:"Kepada",signatures:["Hormat Kami","Penerima"],intro:"Bukti transaksi penjualan tunai."},
{id:"surat-penawaran",label:"Surat Penawaran Harga",category:"umkm",title:"SURAT PENAWARAN HARGA",uses:["client","items","terms","business-core"],fields:["subject","validity","paymentTerms","description"],total:true,partyLabel:"Kepada",signatures:["Hormat Kami","Penerima"],intro:"Penawaran harga produk atau jasa kepada calon pelanggan."},
{id:"surat-pesanan",label:"Surat Pesanan",category:"umkm",title:"SURAT PESANAN",uses:["client","items","terms","business-core"],fields:["reference","deliveryDate","paymentTerms","description"],total:true,partyLabel:"Kepada Pemasok",signatures:["Pemesan","Penyetuju"],intro:"Catatan pesanan barang atau jasa dari pelanggan."},
{id:"struk-pos",label:"Struk POS (58 mm)",category:"umkm",title:"STRUK PENJUALAN",output:"thermal",uses:["client","items","payment"],total:true,intro:"Struk ringkas transaksi kasir untuk cetak thermal."},
{id:"daftar-harga",label:"Daftar Harga / Price List",category:"umkm",title:"DAFTAR HARGA",uses:["items","business-core"],fields:["subject","period","validity","description"],total:false,itemMode:"pricelist",signatures:["Hormat Kami","Penerima"],intro:"Daftar produk atau jasa beserta harga satuan."},
{id:"surat-jalan",label:"Surat Jalan",category:"logistik",title:"SURAT JALAN",hidePrices:true,uses:["client","items","business-logistics","business-core"],fields:["reference","invoiceRef","origin","destination","driver","vehicle","deliveryDate","condition","unit"],total:false,partyLabel:"Penerima",signatures:["Pengirim","Penerima"],intro:"Dokumen pendamping pengiriman barang; bukan bukti pembayaran."},
{id:"bukti-terima-barang",label:"Bukti Terima Barang",category:"logistik",title:"BUKTI PENERIMAAN BARANG",hidePrices:true,uses:["client","items","business-logistics","business-core"],fields:["reference","invoiceRef","condition","inspection","location","unit"],total:false,partyLabel:"Pihak Penyerah",signatures:["Petugas Gudang","Penerima"],intro:"Catatan jumlah dan kondisi barang yang diterima."},
{id:"surat-retur",label:"Surat Retur Barang",category:"logistik",title:"SURAT RETUR BARANG",uses:["client","items","business-logistics","business-core"],fields:["reference","invoiceRef","returnReason","condition","origin","destination"],total:false,itemMode:"qty",partyLabel:"Penerima Retur",signatures:["Pengirim","Penerima"],intro:"Dokumen pengembalian barang dan alasan retur."},
{id:"packing-list",label:"Packing List",category:"logistik",title:"PACKING LIST",hidePrices:true,uses:["client","items","business-logistics","business-core"],fields:["reference","packing","origin","destination","vehicle","unit","description"],total:false,partyLabel:"Penerima",signatures:["Pengirim","Penerima"],intro:"Daftar isi kemasan untuk pemeriksaan pengiriman."},
{id:"perjanjian-kerja-sama",label:"Perjanjian Kerja Sama",category:"legal",title:"PERJANJIAN KERJA SAMA",uses:["client","terms","business-contract","business-core"],fields:["reference","contractDate","scope","effectiveDate","endDate","location"],signatures:["Pihak Pertama","Pihak Kedua"],legalNote:true,partyLabel:"Pihak Kedua",intro:"Kerangka administrasi kerja sama yang perlu ditinjau para pihak."},
{id:"surat-kuasa",label:"Surat Kuasa",category:"legal",title:"SURAT KUASA",uses:["client","terms","business-contract","business-core"],fields:["reference","recipientRole","scope","effectiveDate","endDate","location","witness"],signatures:["Pemberi Kuasa","Penerima Kuasa"],legalNote:true,partyLabel:"Penerima Kuasa",intro:"Kerangka surat kuasa untuk diisi sesuai kebutuhan dan kewenangan."},
{id:"spk",label:"Surat Perintah Kerja (SPK)",category:"legal",title:"SURAT PERINTAH KERJA",uses:["client","items","terms","business-contract","business-core"],fields:["reference","contractRef","scope","location","effectiveDate","endDate","paymentTerms"],total:true,signatures:["Pemberi Kerja","Pelaksana"],legalNote:true,partyLabel:"Pelaksana",intro:"Ringkasan penugasan, lingkup, jadwal, dan nilai pekerjaan."},
{id:"loi",label:"Letter of Intent (LOI)",category:"legal",title:"LETTER OF INTENT",uses:["client","terms","business-contract","business-core"],fields:["reference","subject","scope","effectiveDate","endDate","location"],signatures:["Pihak Pertama","Pihak Kedua"],legalNote:true,partyLabel:"Pihak Kedua",intro:"Pernyataan minat awal; daya ikat bergantung isi dan konteks kesepakatan."},
{id:"surat-pernyataan",label:"Surat Pernyataan",category:"legal",title:"SURAT PERNYATAAN",uses:["client","terms","business-core"],fields:["reference","subject","reason","location"],signatures:["Yang Membuat Pernyataan"],legalNote:true,partyLabel:"Ditujukan Kepada",intro:"Pernyataan tertulis yang harus sesuai fakta dan tujuan pengguna."},
{id:"memo-internal",label:"Memo Internal",category:"operasional",title:"MEMO INTERNAL",uses:["business-core"],fields:["subject","authority","description","requestedBy"],signatures:["Pembuat Memo","Penerima"],intro:"Komunikasi singkat untuk kebutuhan internal organisasi."},
{id:"surat-perjalanan-dinas",label:"Surat Perjalanan Dinas",category:"operasional",title:"SURAT PERJALANAN DINAS",uses:["business-core","business-hr"],fields:["employee","employeeId","position","department","location","period","reason","budget"],signatures:["Pejabat Pemberi Tugas","Pegawai"],intro:"Penugasan perjalanan dinas; sesuaikan dengan kebijakan organisasi."},
{id:"klaim-biaya",label:"Form Klaim Biaya",category:"operasional",title:"FORM KLAIM BIAYA",uses:["business-core","business-hr","items"],fields:["employee","employeeId","department","period","reason","approvedBy"],total:true,signatures:["Pemohon","Penyetuju"],intro:"Rekap penggantian biaya dengan rincian dan bukti pendukung."},
{id:"purchase-order",label:"Purchase Order (PO)",category:"operasional",title:"PURCHASE ORDER",uses:["client","items","payment","terms","business-purchase","business-core"],fields:["reference","supplier","requestedBy","approvedBy","deliveryDate","location","paymentTerms","budget"],total:true,signatures:["Pemesan","Penyetuju"],partyLabel:"Pemasok",intro:"Pesanan pembelian kepada pemasok; bukan bukti barang telah diterima."},
{id:"slip-gaji",label:"Slip Gaji",category:"operasional",title:"SLIP GAJI",uses:["business-hr","payment","business-core"],fields:["employee","employeeId","position","department","period","baseSalary","allowances","deductions","netPay","bankRef"],payroll:true,intro:"Ringkasan gaji internal; jaga kerahasiaan dokumen."},
{id:"rab",label:"Rencana Anggaran Biaya (RAB)",category:"proyek",title:"RENCANA ANGGARAN BIAYA",uses:["client","items","business-project","business-core"],fields:["project","location","contractRef","contractValue","description"],total:true,partyLabel:"Kepada",signatures:["Penyusun","Penyetuju"],intro:"Estimasi biaya proyek; sesuaikan dengan lingkup dan harga aktual."},
{id:"bast",label:"Berita Acara Serah Terima (BAST)",category:"proyek",title:"BERITA ACARA SERAH TERIMA",uses:["client","items","business-project","business-core"],fields:["project","contractRef","location","inspection","condition","effectiveDate"],total:false,itemMode:"qty",signatures:["Pihak Menyerahkan","Pihak Menerima"],partyLabel:"Pihak Penerima",intro:"Catatan penyerahan hasil pekerjaan atau barang beserta kondisi penerimaan."},
{id:"surat-perintah-bayar",label:"Surat Perintah Bayar",category:"proyek",title:"SURAT PERINTAH BAYAR",uses:["client","items","payment","business-project","business-core"],fields:["project","contractRef","milestone","progress","contractValue","previousPaid","retention","paymentTerms"],total:true,signatures:["Pemohon Pembayaran","Pejabat Berwenang"],partyLabel:"Kepada",intro:"Dokumen administrasi internal untuk mengajukan atau memproses pembayaran."},
{id:"tagihan-termin",label:"Tagihan Termin Proyek",category:"proyek",title:"TAGIHAN TERMIN PROYEK",uses:["client","items","payment","due","business-project","business-core"],fields:["project","contractRef","milestone","progress","contractValue","previousPaid","retention","invoicePeriod","paymentTerms"],total:true,partyLabel:"Kepada",signatures:["Hormat Kami","Penerima"],intro:"Tagihan progres proyek; verifikasi kontrak, progres, DP, dan retensi sebelum terbit."},
{id:"berita-acara-progres",label:"Berita Acara Progres",category:"proyek",title:"BERITA ACARA PROGRES PEKERJAAN",uses:["client","items","business-project","business-core"],fields:["project","contractRef","milestone","progress","location","inspection","description"],total:false,itemMode:"qty",signatures:["Pelaksana","Pemeriksa / Klien"],partyLabel:"Kepada",intro:"Catatan hasil pemeriksaan dan progres pekerjaan."},
{id:"lembar-data-faktur-pajak",label:"Lembar Data Faktur Pajak (Internal)",category:"pajak",title:"LEMBAR DATA FAKTUR PAJAK",uses:["client","items","business-tax","business-core"],fields:["taxId","taxPeriod","taxType","taxBase","taxAmount","reference","description"],total:true,partyLabel:"Kepada",signatures:["Penyusun","Pemeriksa"],disclaimer:"Dokumen kerja internal. Bukan e-Faktur resmi dan tidak dikirim ke DJP.",intro:"Lembar persiapan data transaksi perpajakan."},
{id:"rekap-ppn-internal",label:"Rekap PPN Internal",category:"pajak",title:"REKAP PPN INTERNAL",uses:["items","business-tax","business-core"],fields:["taxPeriod","taxType","taxBase","taxAmount","taxId","description"],total:true,signatures:["Penyusun","Pemeriksa"],disclaimer:"Rekap internal, bukan SPT atau pengganti pelaporan resmi.",intro:"Rekap data untuk pemeriksaan internal sebelum pelaporan."},
{id:"lembar-data-bukti-potong",label:"Lembar Data Bukti Potong PPh",category:"pajak",title:"LEMBAR DATA BUKTI POTONG PPh",uses:["client","business-tax","business-core"],fields:["taxId","taxPeriod","taxType","taxBase","taxAmount","description"],total:false,partyLabel:"Kepada",signatures:["Penyusun","Pemeriksa"],disclaimer:"Bukan formulir bukti potong resmi. Gunakan sistem/formulir DJP yang berlaku.",intro:"Lembar kerja untuk merapikan data saat menyiapkan bukti potong."},
{id:"checklist-dokumen-pajak",label:"Checklist Dokumen Pajak",category:"pajak",title:"CHECKLIST DOKUMEN PAJAK",uses:["business-tax","business-core"],fields:["taxPeriod","taxType","authority","description","status"],total:false,signatures:["Penyusun","Pemeriksa"],disclaimer:"Checklist internal; bukan bukti pembayaran atau pelaporan pajak.",intro:"Checklist kelengkapan berkas internal."}
];
function val(s,key,h) {
  var v = s.details && s.details[key];
  if (v === undefined || v === null || v === "") return "";
  if (moneyFields.indexOf(key) >= 0) return h.rupiah(v);
  if (["effectiveDate","endDate","deliveryDate","contractDate","validity"].indexOf(key) >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) return h.formatDate(v);
  if (key === "progress") return h.esc(String(v)) + "%";
  return h.esc(String(v));
}
function renderRows(s,t,h) {
  return (t.fields || []).map(function(key) {
    if (key === "description") return "";
    var v = val(s,key,h);
    if (!v) return "";
    return '<tr><td class="k">' + h.esc(labels[key] || key) + '</td><td>' + v + '</td></tr>';
  }).join("");
}
/* Mode kolom tabel item (F4):
   - "priced"    : No | Uraian | Qty | Harga | Jumlah  (default dokumen berharga)
   - "qty"       : No | Uraian | Qty                  (dokumen fisik/logistik, tanpa harga)
   - "pricelist" : No | Uraian | Harga                (daftar harga, tanpa qty/jumlah)
   Tentukan lewat `itemMode` di definisi template; `hidePrices` lama tetap didukung. */
function itemModeOf(t) {
  return t.itemMode || (t.hidePrices ? "qty" : "priced");
}
function itemColCount(mode) { return mode === "pricelist" ? 3 : mode === "qty" ? 3 : 5; }
function itemRows(s,h,t) {
  var mode = itemModeOf(t);
  return (s.items || []).filter(function(it){return it.desc || it.qty || it.price;}).map(function(it,i) {
    var qty = Number(it.qty) || 0;
    var row = '<td class="mono">' + (i+1) + '</td><td>' + h.esc(it.desc || "") + '</td>';
    if (mode === "qty") row += '<td class="r mono">' + qty + '</td>';
    else if (mode === "pricelist") row += '<td class="r mono">' + h.rupiah(it.price) + '</td>';
    else row += '<td class="r mono">' + qty + '</td><td class="r mono">' + h.rupiah(it.price) + '</td><td class="r mono">' + h.rupiah(qty * (Number(it.price) || 0)) + '</td>';
    return '<tr>' + row + '</tr>';
  }).join("");
}
function signatureBlock(s,t,h) {
  var labels = t.signatures || ["Dibuat oleh","Diperiksa / Diterima"];
  return '<div class="doc-signs">' + labels.map(function(label,i) {
    var person = i === 0 ? s.signatures.maker : s.signatures.receiver;
    return '<div class="doc-sign"><div class="role">' + h.esc(label) + '</div><div class="space"></div><div class="line-name">' + h.esc(person && person.name || "") + '</div><div class="line-title">' + h.esc(person && person.title || "") + '</div></div>';
  }).join("") + '</div>';
}
function renderThermal(s,t,h) {
  var rows = (s.items || []).filter(function(it){return it.desc || it.qty || it.price;}).map(function(it){
    return '<div class="th-kv"><span class="k">' + h.esc(it.desc || "") + ' ×' + (Number(it.qty)||0) + '</span><span class="v">' + h.rupiah((Number(it.qty)||0)*(Number(it.price)||0)) + '</span></div>';
  }).join("");
  var total = h.totals(s).total;
  return '<div class="th-title">' + h.esc(s.issuer.name || "NAMA USAHA") + '</div><div class="th-sub">' + h.esc(s.issuer.address || "") + '</div><div class="th-rule solid"></div><div class="th-title">' + h.esc(t.title) + '</div><div class="th-kv"><span>No.</span><span>' + h.esc(s.number) + '</span></div><div class="th-kv"><span>Tanggal</span><span>' + h.formatDate(s.date) + '</span></div>' + (s.client.name ? '<div class="th-kv"><span>Pelanggan</span><span>' + h.esc(s.client.name) + '</span></div>' : '') + '<div class="th-rule"></div>' + rows + '<div class="th-rule solid"></div><div class="th-total"><span>TOTAL</span><span>' + h.rupiah(total) + '</span></div>' + (s.payment.method ? '<div class="th-kv"><span>Metode</span><span>' + h.esc(s.payment.method) + '</span></div>' : '') + '<div class="th-rule"></div><div class="th-foot">Terima kasih telah berbelanja.</div>';
}
function renderPayroll(s,t,h) {
  var d=s.details || {}, base=Number(d.baseSalary)||0, allowance=Number(d.allowances)||0, deduction=Number(d.deductions)||0;
  var net=d.netPay !== "" && d.netPay != null ? Number(d.netPay) : base+allowance-deduction;
  return '<div class="doc-head"><div class="doc-issuer"><div class="nm">' + h.esc(s.issuer.name || "") + '</div><div class="addr">' + h.esc(s.issuer.address || "") + '</div></div><div class="doc-title"><div class="t">' + h.esc(t.title) + '</div><div class="no">No. ' + h.esc(s.number) + '</div></div></div><hr class="doc-rule"><table class="doc-meta"><tr><td class="k">Karyawan</td><td>' + h.esc(d.employee || "") + '</td></tr><tr><td class="k">ID / NIK</td><td>' + h.esc(d.employeeId || "") + '</td></tr><tr><td class="k">Jabatan</td><td>' + h.esc(d.position || "") + '</td></tr><tr><td class="k">Departemen</td><td>' + h.esc(d.department || "") + '</td></tr><tr><td class="k">Periode</td><td>' + h.esc(d.period || "") + '</td></tr></table><table class="doc-table"><thead><tr><th>Komponen</th><th class="r">Jumlah</th></tr></thead><tbody><tr><td>Gaji pokok</td><td class="r">' + h.rupiah(base) + '</td></tr><tr><td>Tunjangan</td><td class="r">' + h.rupiah(allowance) + '</td></tr><tr><td>Potongan</td><td class="r">(' + h.rupiah(deduction) + ')</td></tr></tbody></table><div class="doc-totals"><table><tr class="grand"><td>Gaji Bersih</td><td class="r">' + h.rupiah(net) + '</td></tr></table></div><div class="doc-foot">Dokumen internal. Bagikan hanya kepada pihak yang berwenang.</div>' + signatureBlock(s,t,h) + '<div class="doc-verify">Kode verifikasi: ' + h.verifyCode(s.number) + ' · FakturKu</div>';
}
function renderDocument(s,h,t) {
  if (t.payroll) return renderPayroll(s,t,h);
  if (t.output === "thermal") return renderThermal(s,t,h);
  var total=h.totals(s), logo=s.logo ? '<img class="doc-logo" src="' + h.esc(s.logo) + '" alt="Logo">' : '';
  var issuer='<div class="doc-issuer">' + logo + '<div class="nm">' + h.esc(s.issuer.name || '') + '</div><div class="addr">' + h.esc(s.issuer.address || '') + '</div><div class="mono">' + h.esc(s.issuer.phone || '') + (s.issuer.email ? ' · ' + h.esc(s.issuer.email) : '') + '</div></div>';
  var client=t.uses.indexOf("client")>=0 ? '<div><div class="doc-lbl">' + h.esc(t.partyLabel || 'Kepada / Pihak Terkait') + '</div><b>' + h.esc(s.client.name || '') + '</b><div class="addr">' + h.esc(s.client.address || '') + '</div></div>' : '';
  /* F1: label "Kategori" internal tidak lagi dicetak. Blok pihak hanya muncul bila template punya pihak terkait. */
  var parties=client ? '<div class="doc-parties">' + client + '</div>' : '';
  var meta=renderRows(s,t,h), details=meta ? '<table class="doc-meta" style="margin:14px 0">' + meta + '</table>' : '';
  var mode=itemModeOf(t), rows=itemRows(s,h,t), itemTable=t.uses.indexOf("items")>=0 ? '<table class="doc-table"><thead><tr><th style="width:7%">No</th><th>Uraian</th>' + (mode === "pricelist" ? '<th class="r" style="width:22%">Harga</th>' : mode === "qty" ? '<th class="r" style="width:10%">Qty</th>' : '<th class="r" style="width:10%">Qty</th><th class="r" style="width:18%">Harga</th><th class="r" style="width:20%">Jumlah</th>') + '</tr></thead><tbody>' + (rows || '<tr><td colspan="' + itemColCount(mode) + '">Belum ada rincian</td></tr>') + '</tbody></table>' : '';
  var totalLabel = t.id === "credit-note" ? "Nilai Kredit" : t.id === "debit-note" ? "Nilai Debit" : t.payroll ? "Gaji Bersih" : "Total";
  var totals=t.uses.indexOf("items")>=0 && t.total ? '<div class="doc-totals"><table><tr><td>Subtotal</td><td class="r">' + h.rupiah(total.subtotal) + '</td></tr>' + (total.discount ? '<tr><td>Diskon</td><td class="r">(' + h.rupiah(total.discount) + ')</td></tr>' : '') + (total.tax ? '<tr><td>PPN ' + (Number(s.taxRate)||0) + '%</td><td class="r">' + h.rupiah(total.tax) + '</td></tr>' : '') + '<tr class="grand"><td>' + totalLabel + '</td><td class="r">' + h.rupiah(total.total) + '</td></tr></table></div><div class="doc-terbilang">Terbilang: <b>' + h.terbilang(total.total) + '</b></div>' : '';
  var payment=t.uses.indexOf("payment")>=0 && (s.payment.bank || s.payment.accountNo || s.payment.method) ? '<div class="doc-pay"><div class="doc-lbl">Informasi Pembayaran</div>' + (s.payment.bank ? 'Bank: <b>' + h.esc(s.payment.bank) + '</b><br>' : '') + (s.payment.accountNo ? 'No. Rekening: <b>' + h.esc(s.payment.accountNo) + '</b><br>' : '') + (s.payment.accountName ? 'Atas Nama: ' + h.esc(s.payment.accountName) + '<br>' : '') + (s.payment.method ? 'Metode: ' + h.esc(s.payment.method) : '') + '</div>' : '';
  /* F2: deskripsi katalog (t.intro) tetap tersimpan untuk teks bantu UI, tapi tidak dicetak sebagai isi dokumen. */
  var intro='';
  var description=s.details && s.details.description ? '<div class="doc-foot"><b>Uraian:</b> ' + h.esc(s.details.description) + '</div>' : '';
  var terms=s.terms ? '<div class="doc-foot"><b>Syarat / klausul:</b><div style="white-space:pre-wrap;margin-top:5px">' + h.esc(s.terms) + '</div></div>' : '';
  var notes=s.notes ? '<div class="doc-foot"><b>Catatan:</b> ' + h.esc(s.notes) + '</div>' : '';
  var disclaimer=t.disclaimer ? '<div class="doc-foot"><b>Catatan penting:</b> ' + h.esc(t.disclaimer) + '</div>' : '';
  var legal=t.legalNote ? '<div class="doc-foot"><b>Catatan:</b> Format ini kerangka administrasi, bukan nasihat hukum atau jaminan keabsahan. Periksa isi dan persyaratan yang berlaku sebelum ditandatangani.</div>' : '';
  return '<div class="doc-head">' + issuer + '<div class="doc-title"><div class="t">' + h.esc(t.title) + '</div><div class="no">No. ' + h.esc(s.number) + '</div><div class="no">Tanggal: ' + h.formatDate(s.date) + '</div>' + (s.dueDate && t.uses.indexOf("due")>=0 ? '<div class="no">Jatuh tempo: ' + h.formatDate(s.dueDate) + '</div>' : '') + '</div></div><hr class="doc-rule">' + parties + intro + details + itemTable + totals + payment + description + terms + notes + disclaimer + legal + signatureBlock(s,t,h) + '<div class="doc-verify">Kode verifikasi: ' + h.verifyCode(s.number) + ' · Dokumen disusun dengan FakturKu</div>';
}
export const BUSINESS_TEMPLATES=definitions.map(function(definition) {
  return Object.assign({},definition,{output:definition.output || "a4",render:function(state,helpers){return renderDocument(state,helpers,this);}});
});
