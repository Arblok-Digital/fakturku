/* Data contoh dokumen FakturKu (dipakai editor tab "Contoh" dan landing page).
   Dipisah dari app.js supaya contoh di landing = output asli aplikasi, bukan mock. */
import { blankState } from "./invoice-engine.js";
import { getCategory, getTemplate } from "./template-engine.js";
import { printsTotals } from "./editor-fields.js";

/* Dokumen penjualan/tagihan yang contohnya memakai diskon + PPN. */
const TAXED_SAMPLE = new Set([
  "faktur-a4", "invoice-digital", "nota-kontan", "struk-pos", "surat-penawaran", "surat-pesanan",
  "purchase-order", "proforma-invoice", "credit-note", "debit-note", "surat-tagihan",
  "invoice-berulang", "tagihan-termin", "nota-servis",
]);

export function buildSampleState(templateId, options = {}) {
  const { issued = true, category = null } = options;
  const today = new Date();
  const dateValue = (d) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const plusDays = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return dateValue(d);
  };
  const sample = blankState(templateId, {
    keepNumber: "CONTOH/" + String(templateId || "DOC").toUpperCase() + "/001"
  });
  sample.category = category || getCategory(templateId);
  sample.date = dateValue(today);
  sample.dueDate = plusDays(14);
  sample.issued = issued;
  sample.notes = "Contoh data fiktif — sesuaikan seluruh isi sebelum digunakan.";
  sample.issuer = {
    name: "UD Sumber Jaya (Contoh)",
    address: "Jl. Raya Cihideung No. 45, Tasikmalaya",
    npwp: "00.000.000.0-000.000",
    phone: "(0265) 222333",
    email: "admin@example.test"
  };
  sample.client = {
    name: "Toko Barokah (Contoh)",
    address: "Jl. Pasar Wetan No. 7, Tasikmalaya",
    npwp: "00.000.000.0-000.000",
    phone: "(0265) 444555"
  };
  sample.items = [
    { desc: "Semen 50 kg (contoh)", qty: 5, price: 62000, unit: "sak" },
    { desc: "Pasir beton (contoh)", qty: 2, price: 250000, unit: "m³" }
  ];
  sample.discount = 0;
  sample.taxRate = 0;
  sample.payment = {
    bank: "Bank Contoh",
    accountNo: "0000000000",
    accountName: "UD Sumber Jaya (Contoh)",
    method: "Transfer bank (contoh)"
  };
  // F7 lanjutan: klausul contoh diambil dari definisi template (defaultTerms) supaya dokumen
  // contoh tidak kosong dan tidak memakai teks generik yang sama untuk semua format.
  const termsTpl = getTemplate(templateId) || {};
  sample.terms = (termsTpl.uses || []).indexOf("terms") >= 0
    ? (termsTpl.defaultTerms || "Contoh syarat & ketentuan: sesuaikan dengan kesepakatan para pihak.")
    : "";
  sample.signatures = {
    maker: { name: "Dedi Kurnia (Contoh)", title: "Pemilik Usaha" },
    receiver: { name: "Budi Santoso (Contoh)", title: "Penerima / Penanggung Jawab" }
  };
  Object.assign(sample.details, {
    subject: "Pengadaan / pekerjaan contoh",
    reference: "REF-CONTOH-001",
    description: "Contoh uraian untuk membantu memahami bagian dokumen yang perlu diisi.",
    period: "Oktober 2026",
    location: "Tasikmalaya",
    validity: plusDays(30),
    paymentTerms: "Pembayaran maksimal 14 hari setelah dokumen diterima",
    reason: "Contoh kebutuhan operasional",
    status: "Diperiksa — contoh",
    authority: "Bagian Operasional",
    origin: "Gudang Tasikmalaya",
    destination: "Lokasi penerima, Tasikmalaya",
    driver: "Dedi (Contoh)",
    vehicle: "Mobil boks — contoh",
    condition: "Baik; contoh data",
    quantity: 3,
    unit: "paket",
    contractRef: "SPK-CONTOH-001",
    scope: "Penyediaan barang dan jasa sesuai daftar",
    effectiveDate: dateValue(today),
    endDate: plusDays(30),
    authority: "Bagian Operasional",
    witness: "Saksi (Contoh)",
    project: "Peningkatan Fasilitas Kantor (Contoh)",
    progress: 50,
    contractValue: 10000000,
    previousPaid: 2500000,
    retention: 500000,
    milestone: "Termin 2 — contoh",
    inspection: "Sesuai pemeriksaan contoh",
    employee: "Asep Saepudin (Contoh)",
    employeeId: "KARYAWAN-CONTOH-001",
    position: "Tukang",
    department: "Operasional",
    baseSalary: 4500000,
    allowances: 500000,
    deductions: 100000,
    netPay: 4900000,
    taxPeriod: "Oktober 2026 (contoh)",
    taxType: "Data simulasi — verifikasi aturan berlaku",
    taxBase: 2500000,
    taxAmount: 275000,
    taxId: "00.000.000.0-000.000",
    requestedBy: "Dedi Kurnia (Contoh)",
    approvedBy: "Budi Santoso (Contoh)",
    deliveryDate: plusDays(3),
    supplier: "CV Material Jaya",
    budget: 2500000,
    recipientRole: "Penerima Kuasa (Contoh)",
    returnReason: "Barang tidak sesuai pesanan (contoh)",
    packing: "3 karton",
    invoiceRef: "INV-CONTOH-001",
    contractDate: dateValue(today),
    invoicePeriod: "Oktober 2026",
    bankRef: "TRX-CONTOH-001"
  });

  // Profil sampel per format: contoh uraian dan detail mengikuti tujuan dokumen,
  // bukan memakai satu isi faktur generik untuk seluruh kategori.
  const sampleProfiles = {
    "faktur-a4": { items: [{ desc: "Semen 50 kg (contoh)", qty: 10, price: 62000, unit: "sak" }, { desc: "Pasir beton (contoh)", qty: 2, price: 250000, unit: "m³" }] },
    "invoice-digital": { items: [{ desc: "Servis & isi freon AC 1 PK (contoh)", qty: 1, price: 350000, unit: "unit" }, { desc: "Ganti kapasitor (contoh)", qty: 1, price: 120000, unit: "unit" }] },
    "kwitansi-a4": { items: [{ desc: "Pembayaran borongan pasang keramik (contoh)", qty: 1, price: 900000 }], details: { subject: "Bukti penerimaan pembayaran", description: "Pembayaran borongan pasang keramik (contoh)" } },
    "struk-ansuran": { items: [{ desc: "Pembayaran angsuran ke-3 (contoh)", qty: 1, price: 575000 }], details: { subject: "Bukti pembayaran angsuran", description: "Simulasi pembayaran angsuran kendaraan" } },
    "credit-note": { items: [{ desc: "Koreksi jumlah barang pada invoice (contoh)", qty: 1, price: 250000 }], details: { subject: "Koreksi tagihan", reason: "Penyesuaian jumlah barang (contoh)", description: "Pengurangan nilai tagihan sebelumnya (simulasi)" } },
    "debit-note": { items: [{ desc: "Biaya tambahan sesuai kesepakatan (contoh)", qty: 1, price: 300000 }], details: { subject: "Penyesuaian nilai tagihan", reason: "Biaya tambahan terverifikasi (contoh)", description: "Penambahan nilai tagihan sebelumnya (simulasi)" } },
    "surat-tagihan": { items: [{ desc: "Pekerjaan sesuai pesanan (contoh)", qty: 1, price: 3200000 }], details: { subject: "Permohonan penyelesaian pembayaran", period: "Oktober 2026", paymentTerms: "Mohon dibayar dalam 14 hari (contoh)" } },
    "invoice-berulang": { items: [{ desc: "Layanan berlangganan bulanan (contoh)", qty: 1, price: 450000 }], details: { period: "Oktober 2026", paymentTerms: "Pembayaran untuk periode berjalan (contoh)" } },
    "nota-kontan": { items: [{ desc: "Beras 5 kg (contoh)", qty: 1, price: 68000, unit: "karung" }, { desc: "Minyak goreng 2 L (contoh)", qty: 2, price: 36000, unit: "pouch" }] },
    "surat-penawaran": { items: [{ desc: "Borongan pasang keramik 6 m² (contoh)", qty: 1, price: 900000, unit: "borongan" }, { desc: "Material pendukung (contoh)", qty: 1, price: 450000, unit: "paket" }], details: { subject: "Penawaran jasa pasang & material", validity: plusDays(30), paymentTerms: "DP 50%, pelunasan setelah pekerjaan selesai (contoh)" } },
    "surat-pesanan": { items: [{ desc: "Besi beton 10 mm (contoh)", qty: 20, price: 62000, unit: "batang" }, { desc: "Semen 50 kg (contoh)", qty: 30, price: 62000, unit: "sak" }], details: { reference: "PO-CONTOH-001", deliveryDate: plusDays(3), paymentTerms: "Pembayaran sesuai kesepakatan (contoh)" } },
    "struk-pos": { items: [{ desc: "Es teh manis", qty: 2, price: 5000 }, { desc: "Gorengan", qty: 3, price: 1000 }], client: { name: "Pelanggan Umum (Contoh)", address: "Pembelian langsung", npwp: "", phone: "" }, payment: { bank: "", accountNo: "", accountName: "", method: "Tunai (contoh)" } },
    "daftar-harga": { items: [{ desc: "Servis ringan (contoh)", qty: 1, price: 50000, unit: "unit" }, { desc: "Ganti oli + filter (contoh)", qty: 1, price: 150000, unit: "unit" }, { desc: "Tambal ban (contoh)", qty: 1, price: 25000, unit: "unit" }], details: { subject: "Daftar harga bengkel", period: "Oktober 2026", validity: plusDays(30) } },
    "surat-jalan": { items: [{ desc: "Semen 50 kg (contoh)", qty: 40, price: 0, unit: "sak" }, { desc: "Besi beton 10 mm (contoh)", qty: 20, price: 0, unit: "batang" }], details: { reference: "SJ-CONTOH-001", origin: "Gudang UD Sumber Jaya", destination: "Proyek rumah Pak Hendra, Tasikmalaya", driver: "Asep (Contoh)", vehicle: "Pick-up (contoh)", condition: "Barang dikemas dengan baik (contoh)", unit: "sak", deliveryDate: plusDays(1) } },
    "bukti-terima-barang": { items: [{ desc: "Semen 50 kg (contoh)", qty: 40, price: 0, unit: "sak" }, { desc: "Besi beton 10 mm (contoh)", qty: 20, price: 0, unit: "batang" }], details: { reference: "BTB-CONTOH-001", condition: "Baik, kemasan utuh (contoh)", inspection: "Jumlah dan kondisi dihitung ulang (contoh)", location: "Lokasi proyek, Tasikmalaya", unit: "sak" } },
    "surat-retur": { items: [{ desc: "Semen mengeras saat diterima (contoh)", qty: 5, price: 0, unit: "sak" }], details: { reference: "RETUR-CONTOH-001", returnReason: "Semen sudah mengeras saat pemeriksaan (contoh)", condition: "Menunggu penggantian dari toko (contoh)", origin: "Lokasi proyek", destination: "Toko pengirim material" } },
    "packing-list": { items: [{ desc: "Semen 50 kg", qty: 40, price: 0, unit: "sak" }, { desc: "Besi beton 10 mm", qty: 20, price: 0, unit: "batang" }], details: { reference: "PL-CONTOH-001", packing: "40 sak + 20 batang (contoh)", origin: "Gudang UD Sumber Jaya", destination: "Lokasi proyek", vehicle: "Pick-up (contoh)", unit: "sak" } },
    "perjanjian-kerja-sama": { items: [], details: { reference: "PKS-CONTOH-001", subject: "Kerja sama penyediaan layanan", contractDate: dateValue(today), scope: "Penyediaan layanan dan dukungan sesuai ruang lingkup tertulis (contoh)", effectiveDate: dateValue(today), endDate: plusDays(365), location: "Tasikmalaya" } },
    "surat-kuasa": { items: [], details: { reference: "SK-CONTOH-001", subject: "Kuasa pengambilan dokumen", recipientRole: "Penerima kuasa (contoh)", scope: "Mengambil dokumen administrasi yang disebutkan secara spesifik (contoh)", effectiveDate: dateValue(today), endDate: plusDays(7), witness: "Saksi (contoh)" } },
    "spk": { items: [{ desc: "Borongan pasang rangka & atap (contoh)", qty: 1, price: 6500000, unit: "borongan" }], details: { reference: "SPK-CONTOH-001", contractRef: "KONTRAK-CONTOH-001", scope: "Pekerjaan rangka, atap, dan serah terima (contoh)", location: "Tasikmalaya", effectiveDate: dateValue(today), endDate: plusDays(14), paymentTerms: "Pembayaran berdasarkan progres yang disetujui (contoh)" } },
    "loi": { items: [], details: { reference: "LOI-CONTOH-001", subject: "Minat kerja sama suplai material", scope: "Penjajakan ruang lingkup, jadwal, dan estimasi biaya material (contoh)", effectiveDate: dateValue(today), endDate: plusDays(30), location: "Tasikmalaya" } },
    "surat-pernyataan": { items: [], details: { reference: "SP-CONTOH-001", subject: "Pernyataan penerimaan barang", reason: "Keperluan administrasi (contoh)", location: "Tasikmalaya" } },
    "memo-internal": { items: [], details: { subject: "Jadwal pengiriman material", authority: "Operasional", description: "Pengiriman material dijadwalkan ulang ke esok pagi. Koordinasikan dengan pengemudi dan penerima (contoh).", requestedBy: "Koordinator Gudang (Contoh)" } },
    "surat-perjalanan-dinas": { items: [], details: { employee: "Asep Saepudin (Contoh)", employeeId: "KARYAWAN-CONTOH-001", position: "Tukang", department: "Produksi", location: "Bandung", period: "20–21 Oktober 2026 (contoh)", reason: "Pengerjaan proyek di luar kota (contoh)", budget: 750000 } },
    "klaim-biaya": { items: [{ desc: "Bensin & tol (contoh)", qty: 1, price: 125000 }, { desc: "Makan di jalan (contoh)", qty: 1, price: 85000 }], details: { employee: "Asep Saepudin (Contoh)", employeeId: "KARYAWAN-CONTOH-001", department: "Produksi", period: "Oktober 2026", reason: "Transport dan konsumsi tugas luar (contoh)", approvedBy: "Dedi Kurnia (Contoh)" } },
    "purchase-order": { items: [{ desc: "Semen 50 kg (contoh)", qty: 30, price: 62000, unit: "sak" }, { desc: "Besi beton 10 mm (contoh)", qty: 20, price: 62000, unit: "batang" }], details: { reference: "PO-CONTOH-001", supplier: "CV Material Jaya", requestedBy: "Dedi Kurnia (Contoh)", approvedBy: "Budi Santoso (Contoh)", deliveryDate: plusDays(5), location: "Gudang UD Sumber Jaya", paymentTerms: "Pembayaran sesuai invoice dan penerimaan (contoh)", budget: 3100000 } },
    "slip-gaji": { items: [], details: { employee: "Asep Saepudin (Contoh)", employeeId: "KARYAWAN-CONTOH-001", position: "Tukang", department: "Produksi", period: "Oktober 2026", baseSalary: 3000000, allowances: 300000, deductions: 50000, netPay: 3250000, bankRef: "TRX-GAJI-CONTOH-001" } },
    "rab": { items: [{ desc: "Material bangunan (contoh)", qty: 1, price: 3500000, unit: "paket" }, { desc: "Upah tukang (contoh)", qty: 1, price: 2000000, unit: "borongan" }, { desc: "Transportasi dan alat (contoh)", qty: 1, price: 500000, unit: "paket" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", location: "Tasikmalaya", contractRef: "RAB-CONTOH-001", contractValue: 6000000, description: "Estimasi awal untuk perencanaan; bukan penawaran final." } },
    "bast": { items: [{ desc: "Pekerjaan pasang keramik (contoh)", qty: 1, price: 0, unit: "borongan" }, { desc: "Pembersihan area kerja (contoh)", qty: 1, price: 0, unit: "paket" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", contractRef: "BAST-CONTOH-001", location: "Tasikmalaya", inspection: "Pekerjaan diperiksa bersama klien (contoh)", condition: "Diterima dengan catatan pemeriksaan (contoh)", effectiveDate: dateValue(today) } },
    "surat-perintah-bayar": { items: [{ desc: "Termin pekerjaan tahap 2 (contoh)", qty: 1, price: 2500000, unit: "termin" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", contractRef: "SPB-CONTOH-001", milestone: "Termin 2", progress: 50, contractValue: 10000000, previousPaid: 2500000, retention: 500000, paymentTerms: "Pembayaran setelah verifikasi dokumen pendukung (contoh)" } },
    "tagihan-termin": { items: [{ desc: "Pekerjaan sesuai progres tahap 2 (contoh)", qty: 1, price: 2500000, unit: "termin" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", contractRef: "TAG-TERM-CONTOH-001", milestone: "Termin 2", progress: 50, contractValue: 10000000, previousPaid: 2500000, retention: 500000, invoicePeriod: "Oktober 2026", paymentTerms: "Verifikasi progres dan kontrak sebelum pembayaran (contoh)" } },
    "berita-acara-progres": { items: [{ desc: "Pemasangan rangka atap (contoh)", qty: 1, price: 0, unit: "borongan" }, { desc: "Pengecatan tahap 1 (contoh)", qty: 1, price: 0, unit: "paket" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", contractRef: "BAP-CONTOH-001", milestone: "Termin 2", progress: 50, location: "Tasikmalaya", inspection: "Progres diperiksa bersama klien (contoh)", description: "Catatan pemeriksaan lapangan; validasi dengan kondisi sebenarnya." } },
    "lembar-data-faktur-pajak": { items: [{ desc: "Jasa layanan sebelum pajak (contoh)", qty: 1, price: 2500000 }], details: { taxId: "00.000.000.0-000.000", taxPeriod: "Oktober 2026 (simulasi)", taxType: "PPN — contoh internal", taxBase: 2500000, taxAmount: 275000, reference: "PAJAK-CONTOH-001", description: "Data simulasi internal; bukan faktur pajak resmi." } },
    "rekap-ppn-internal": { items: [{ desc: "Penjualan kena pajak (contoh)", qty: 1, price: 2500000 }, { desc: "Koreksi transaksi (contoh)", qty: 1, price: 0 }], details: { taxPeriod: "Oktober 2026 (simulasi)", taxType: "Rekap PPN internal", taxBase: 2500000, taxAmount: 275000, taxId: "00.000.000.0-000.000", description: "Rekap simulasi untuk pemeriksaan internal." } },
    "lembar-data-bukti-potong": { items: [], details: { taxId: "00.000.000.0-000.000", taxPeriod: "Oktober 2026 (simulasi)", taxType: "PPh — contoh internal", taxBase: 2500000, taxAmount: 50000, description: "Data simulasi internal; bukan bukti potong resmi." } },
    "checklist-dokumen-pajak": { items: [], details: { taxPeriod: "Oktober 2026 (simulasi)", taxType: "Pemeriksaan kelengkapan dokumen", authority: "Administrasi Keuangan", description: "Checklist simulasi: identitas, bukti transaksi, dokumen pendukung, dan hasil rekonsiliasi.", status: "Perlu verifikasi sebelum final (contoh)" } },
    /* Fase 4 — contoh lapangan untuk template baru */
    "nota-servis": { items: [{ desc: "Jasa servis & pembersihan (contoh)", qty: 1, price: 150000, unit: "unit" }, { desc: "Sparepart: kapasitor (contoh)", qty: 1, price: 85000, unit: "pcs" }], details: { reference: "SVC-CONTOH-001", complaint: "AC kurang dingin dan berbunyi (contoh)", action: "Pembersihan, isi freon, ganti kapasitor (contoh)", warranty: "Garansi 30 hari untuk jasa (contoh)", status: "Selesai diuji (contoh)" } },
    "rekap-upah-harian": { items: [{ desc: "Asep (contoh)", qty: 6, price: 120000, unit: "hari" }, { desc: "Ujang (contoh)", qty: 5, price: 120000, unit: "hari" }, { desc: "Dadan (contoh)", qty: 4, price: 130000, unit: "hari" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", period: "Minggu ke-2 Oktober 2026", location: "Tasikmalaya", approvedBy: "Dedi Kurnia (Contoh)" } },
    "bukti-kas": { items: [{ desc: "Penerimaan pembayaran material (contoh)", qty: 1, price: 1250000, unit: "transaksi" }], details: { reference: "BK-CONTOH-001", cashKind: "Kas masuk", party: "Toko Barokah (Contoh)", description: "Pembayaran sebagian tagihan material (contoh)." } },
    "proforma-invoice": { items: [{ desc: "Borongan pasang keramik 6 m² (contoh)", qty: 1, price: 900000, unit: "borongan" }, { desc: "Material pendukung (contoh)", qty: 1, price: 450000, unit: "paket" }], details: { reference: "PROF-CONTOH-001", subject: "Rancangan tagihan pekerjaan", validity: plusDays(14), paymentTerms: "DP 50% sebelum kerja (contoh)", description: "Nilai masih dapat berubah setelah pengukuran final." } },
    "perjanjian-borongan": { items: [{ desc: "Borongan pasang rangka & atap (contoh)", qty: 1, price: 12000000, unit: "borongan" }], details: { reference: "PB-CONTOH-001", contractRef: "KONTRAK-CONTOH-002", scope: "Rangka, atap, dan finishing (contoh)", location: "Tasikmalaya", contractValue: 12000000, effectiveDate: dateValue(today), endDate: plusDays(30), paymentTerms: "DP 30%, termin 40%, pelunasan 30% (contoh)" } },
    "perjanjian-sewa": { items: [], details: { reference: "PS-CONTOH-001", rentObject: "Mesin molen 1 unit (contoh)", period: "1 bulan (contoh)", effectiveDate: dateValue(today), endDate: plusDays(30), deposit: 1000000, paymentTerms: "Sewa dibayar di muka (contoh)", location: "Tasikmalaya" } },
    "manifest-pengiriman": { items: [{ desc: "Toko Barokah — Jl. Pasar Wetan No. 7 (contoh)", qty: 12, price: 0, unit: "RESI-CONTOH-001" }, { desc: "Warung Bu Iis — Cihideung (contoh)", qty: 8, price: 450000, unit: "RESI-CONTOH-002" }], details: { reference: "MF-CONTOH-001", period: "17 Oktober 2026", driver: "Asep (Contoh)", vehicle: "Pick-up (contoh)", origin: "Gudang UD Sumber Jaya", description: "Total 20 koli; resi kedua ditagih COD di tempat (contoh)." } },
    "berita-acara-selisih": { items: [{ desc: "Semen 50 kg pecah kemasan (contoh)", qty: 3, price: 0, unit: "sak" }, { desc: "Besi beton kurang hitung (contoh)", qty: 2, price: 0, unit: "batang" }], details: { reference: "BAS-CONTOH-001", invoiceRef: "SJ-CONTOH-001", discrepancy: "3 sak rusak, 2 batang kurang (contoh)", condition: "Kemasan pecah saat bongkar (contoh)", inspection: "Dihitung ulang bersama pengemudi (contoh)", followUp: "Diajukan klaim penggantian ke pengirim (contoh)" } },
    "laporan-harian-proyek": { items: [{ desc: "Semen masuk (contoh)", qty: 20, price: 0, unit: "sak" }, { desc: "Pekerjaan plester dinding (contoh)", qty: 25, price: 0, unit: "m²" }], details: { project: "Renovasi rumah Pak Hendra (Contoh)", location: "Tasikmalaya", period: "17 Oktober 2026", weather: "Cerah berawan (contoh)", workforce: "4 tukang, 2 kenek (contoh)", constraint: "Material besi belum datang (contoh)", description: "Pekerjaan berjalan sesuai rencana (contoh)." } },
    "surat-pengakuan-utang": { items: [{ desc: "Sisa utang material (contoh)", qty: 1, price: 4500000, unit: "tagihan" }], details: { reference: "SPU-CONTOH-001", contractRef: "PO-CONTOH-001", effectiveDate: dateValue(today), endDate: plusDays(60), paymentTerms: "Diangsur 3× tiap 20 hari (contoh)", description: "Utang disepakati tanpa paksaan (contoh)." } },
    "rekap-penjualan-harian": { items: [{ desc: "Omzet bersih hari ini (contoh)", qty: 1, price: 1300000, unit: "hari" }], details: { period: "17 Oktober 2026", cashKind: "Rekap kas harian", description: "Penjualan tunai 1.650.000 dikurangi kas keluar 350.000 (contoh).", approvedBy: "Dedi Kurnia (Contoh)" } },
    "kartu-piutang": { items: [{ desc: "Toko Barokah (contoh)", qty: 1, price: 1250000, unit: "INV-CONTOH-001" }, { desc: "Warung Bu Iis (contoh)", qty: 1, price: 640000, unit: "INV-CONTOH-002" }], details: { period: "Per 17 Oktober 2026", description: "Daftar tagihan yang belum lunas (contoh)." } },
    "nota-timbang": { items: [{ desc: "Gabah kering (contoh)", qty: 850, price: 6200, unit: "kg" }, { desc: "Jagung pipil (contoh)", qty: 320, price: 4800, unit: "kg" }], details: { reference: "NT-CONTOH-001", period: "17 Oktober 2026", description: "Potongan kadar air dibahas terpisah (contoh)." } },
    "rekap-omzet-pph-final": { items: [{ desc: "Omzet penjualan bulan berjalan (contoh)", qty: 1, price: 48500000, unit: "bulan" }], details: { taxPeriod: "Oktober 2026 (simulasi)", taxType: "PPh final UMKM — verifikasi tarif resmi", taxBase: 48500000, taxAmount: 242500, description: "Simulasi internal; tarif wajib diverifikasi ke sumber resmi." } },
    "mou": { items: [], details: { reference: "MOU-CONTOH-001", subject: "Minat kerja sama suplai material", scope: "Penjajakan ruang lingkup, harga, dan jadwal suplai (contoh)", effectiveDate: dateValue(today), endDate: plusDays(90), location: "Tasikmalaya" } }
  };
  const profile = sampleProfiles[sample.template];
  if (profile) {
    if (profile.items) sample.items = profile.items;
    if (profile.client) sample.client = { ...sample.client, ...profile.client };
    if (profile.payment) sample.payment = { ...sample.payment, ...profile.payment };
    if (profile.details) Object.assign(sample.details, profile.details);
  }

  if (sample.template === "kwitansi-a4") {
    sample.receivedFrom = "Toko Barokah (Contoh)";
    sample.forPayment = "Pembayaran borongan pasang keramik (contoh)";
    sample.amount = 900000;
  }
  if (sample.template === "struk-ansuran") {
    sample.contractNo = "KRD-CONTOH-001";
    sample.installmentNo = 3;
    sample.customerName = "Budi Santoso (Contoh)";
    sample.principal = 500000;
    sample.interest = 75000;
    sample.fine = 0;
    sample.installmentDue = plusDays(7);
    sample.remaining = 2500000;
  }

  /* Blok total: contoh diskon + PPN untuk dokumen penjualan/tagihan supaya keduanya
     benar-benar terbukti tampil di hasil render (sebelumnya selalu 0, sehingga
     diskon "hilang" saat dicek). Diskon 5% dari subtotal + PPN 11%. */
  const totalsTpl = getTemplate(sample.template) || {};
  if (printsTotals(totalsTpl) && TAXED_SAMPLE.has(sample.template)) {
    const subtotal = (sample.items || []).reduce((n, it) => n + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
    if (subtotal > 0) sample.discount = Math.round(subtotal * 0.05);
    sample.taxRate = 11;
  }
  return sample;
}

