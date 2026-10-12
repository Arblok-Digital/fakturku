# 04 — UI/UX Kategori

> Perubahan UI: badge kategori, template picker grouped, panel billing, editor form.

---

## Template Picker (Redesign)

### Saat Ini
- `#tpl-select` = dropdown `<select>` biasa
- Flat list, gak ada grouping

### Target
- Grouped per kategori (accordion / segmented control)
- Filter: `Semua | Finance | Legal | UMKM | Logistik | ...`
- Card grid per template (nama, ikon kategori, harga)

### Struktur HTML

```html
<!-- index.html — sec-doc -->
<div id="tpl-picker">
  <div class="tpl-filter">
    <button class="active" data-cat="all">Semua</button>
    <button data-cat="finance">Finance</button>
    <button data-cat="umkm">UMKM</button>
    <button data-cat="legal">Legal</button>
    <!-- ... -->
  </div>
  <div class="tpl-grid" id="tpl-grid">
    <!-- cards render by JS -->
  </div>
</div>
```

### Card Template

```html
<button class="tpl-card" data-tpl="faktur-a4" data-cat="finance">
  <span class="tpl-cat-badge finance">💰</span>
  <span class="tpl-name">Faktur A4</span>
  <span class="tpl-price">Rp1.000/dok</span>
</button>
```

### CSS

```css
.tpl-filter {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.tpl-filter button {
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid #d1d5db;
  background: white;
  font-size: 13px;
  white-space: nowrap;
}

.tpl-filter button.active {
  background: #16324F;
  color: white;
  border-color: #16324F;
}

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.tpl-card {
  min-height: 80px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.tpl-card.active {
  border-color: #16324F;
  background: #f0f4f8;
}
```

---

## Badge Kategori

### Lokasi
1. **Header editor** — di samping nama template
2. **Card template picker** — ikon + warna
3. **Panel billing** — di riwayat transaksi

### Struktur HTML

```html
<div class="cat-badge finance">
  <span class="cat-icon">💰</span>
  <span class="cat-label">Finance</span>
</div>
```

### CSS

```css
.cat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.cat-badge.finance     { background: #e0e7ef; color: #16324F; }
.cat-badge.legal       { background: #e8e4f0; color: #4A3B7A; }
.cat-badge.umkm        { background: #d8f0eb; color: #0E7C6B; }
.cat-badge.logistik    { background: #fef0e0; color: #B45309; }
.cat-badge.pajak       { background: #fde8e8; color: #A4291F; }
.cat-badge.proyek      { background: #e0f2e9; color: #2D6A4F; }
.cat-badge.operasional { background: #f0f2f5; color: #475569; }
```

> Warna diambil dari `document_categories.color` — jangan hardcode di CSS long-term.

---

## Editor Form

### Header (sekarang)

```html
<div class="editor-header">
  <h2 id="out-hint">Faktur A4</h2>
  <span class="doc-ref" id="doc-ref">FKT-XXXXXX</span>
</div>
```

### Header (target)

```html
<div class="editor-header">
  <div class="editor-title">
    <h2 id="out-hint">Faktur A4</h2>
    <div class="cat-badge finance" id="cat-badge">
      <span>💰</span> Finance · Rp1.000/dok
    </div>
  </div>
  <span class="doc-ref" id="doc-ref">FIN-2026-0001</span>
</div>
```

---

## Panel Billing

### Badge Kuota (sudah ada)

```html
<button id="chip-quota">
  <svg>...</svg>
  <span id="quota-text">10</span>
</button>
```

### Tambah Info Harga Kategori

Saat user buka modal billing / pilih template:

```html
<div class="billing-info">
  <h3>Harga per Dokumen</h3>
  <ul class="price-list">
    <li><span>💰 Finance</span><span>Rp1.000</span></li>
    <li><span>⚖️ Legal</span><span>Rp2.000</span></li>
    <li><span>🏪 UMKM</span><span>Rp500</span></li>
    <!-- ... -->
  </ul>
</div>
```

### Riwayat Transaksi (dengan kategori)

```html
<div class="history-item">
  <div class="history-info">
    <span class="history-type">Terbit</span>
    <span class="cat-badge finance">💰 Finance</span>
    <span class="history-ref">FIN-2026-0001</span>
  </div>
  <span class="history-amount">-1</span>
</div>
```

---

## Nomor Dokumen

### Saat Ini
- Format: `FKT-XXXXXX` (global, semua template)
- Penomoran per template

### Target
- Format: `{PREFIX}-{TAHUN}-{URUT}` per kategori
- Contoh: `FIN-2026-0001`, `LEG-2026-0001`

```js
// js/modules/numbering.js
async generateRef(category) {
  const prefix = getPrefix(category); // 'FIN', 'LEG', ...
  const year = new Date().getFullYear();
  const seq = await getNextSeq(category, year);
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}
```

---

## Nomor Urut (Backward Compatibility)

> Nomor lama (`FKT-XXXXXX`) tetap valid. Nomor baru pakai prefix kategori.

---

## Bottom Sheet Modal

Sudah ada (`.sheet-handle`). Tambah sheet baru untuk:
- **Harga kategori** — saat user klik "ⓘ" di badge harga
- **Filter kategori** — mobile-friendly (bottom sheet bukan dropdown)

---

## Accessibility

- Badge kategori: `aria-label="Kategori: Finance"`
- Filter: `role="tablist"` + `role="tab"`
- Card template: `aria-pressed="true/false"`
- Touch target minimal 44px (sudah di CSS mobile)

---

*Lihat juga: [05-templates](05-templates.md) untuk mapping template → kategori.*
