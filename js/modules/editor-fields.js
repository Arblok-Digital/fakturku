/**
 * editor-fields.js — satu sumber aturan: field editor mana yang dipakai sebuah template.
 *
 * Dipakai oleh:
 *   - js/app.js  -> menyembunyikan field yang tidak dipakai template terpilih, supaya
 *                   "yang tampil di editor" == "yang muncul di dokumen".
 *   - tools/check-render-coverage.mjs -> cek otomatis kelengkapan render semua template.
 *
 * Aturan di sini harus tetap sinkron dengan kemampuan renderer di js/templates/.
 */

const METERAI_TEMPLATES = new Set(["faktur-a4", "kwitansi-a4"]);
/* Renderer yang selalu mencetak Subtotal/Diskon/PPN (bukan lewat flag `total`). */
const ALWAYS_TOTAL = new Set(["faktur-a4", "invoice-digital"]);

/** Template yang mencetak blok total (Subtotal/Diskon/PPN/Total). */
export function printsTotals(tpl) {
  return tpl.total === true || ALWAYS_TOTAL.has(tpl.id);
}

/** Template yang mencetak area meterai. */
export function showsStamp(tpl) {
  return METERAI_TEMPLATES.has(tpl.id);
}

/** Jumlah tanda tangan yang dicetak (2 = ada "Penerima"/receiver). */
export function signatureCount(tpl) {
  return (tpl.signatures && tpl.signatures.length) || 2;
}

/** Field detail (details.*) yang benar-benar dicetak template ini. */
export function printableDetails(tpl) {
  const keys = new Set(tpl.fields || []);
  /* "Uraian" (details.description) selalu dicetak renderer A4, bukan payroll/thermal. */
  if (!tpl.payroll && tpl.output !== "thermal") keys.add("description");
  return keys;
}

/** Blok pihak (nama + alamat + NPWP + telepon) dicetak untuk dokumen berpihak & ber-total. */
export function partyExtras(tpl) {
  return (tpl.uses || []).includes("client") && printsTotals(tpl);
}

/**
 * Apakah field `bind` dipakai template ini?
 * Catatan: gating seksi (`data-when`) diperiksa terpisah oleh pemanggil.
 */
export function fieldUsed(tpl, bind) {
  if (!bind) return true;
  if (bind.indexOf("details.") === 0) return printableDetails(tpl).has(bind.slice(8));
  if (bind === "discount" || bind === "taxRate") return printsTotals(tpl);
  if (bind === "stamp") return showsStamp(tpl);
  if (bind === "dueDate") return (tpl.uses || []).includes("due");
  if (bind === "signatures.receiver.name" || bind === "signatures.receiver.title") return signatureCount(tpl) > 1;
  if (bind === "client.npwp" || bind === "client.phone") return partyExtras(tpl);
  return true;
}
