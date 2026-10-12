# 03 — Logic Billing & Model

> 2 model billing: Model A (flat) vs Model B (tiered). Rekomendasi: Model A dulu.

---

## Alur Terbit Dokumen

```
User klik "Terbit" / "Cetak"
  │
  ├─ Sudah login?
  │   ├─ Ya → Remote mode
  │   │   ├─ GET profile (kuota)
  │   │   ├─ Cek kuota > 0
  │   │   ├─ CALL issue_document(ref, category)
  │   │   │   → debit + tandai terbit
  │   │   ├─ Update UI (kuota berkurang)
  │   │   └─ Render watermark TERBIT
  │   │
  │   └─ Tidak → Local mode (fallback)
  │       ├─ Cek localStorage kuota
  │       ├─ issueLocal(ref, category)
  │       └─ Simpan history lokal
  │
  └─ Re-print / re-share? → GRATIS (gak debit lagi)
```

---

## Model A — Flat (sederhana) ✅ Rekomendasi MVP

> 1 kuota = 1 dokumen terbit, apapun kategorinya. Harga kategori hanya **tampilan informatif**.

### Kelebihan
- Paling gampang diimplementasi
- User gak bingung — semua dokumen sama
- Frontend & backend sederhana

### Kekurangan
- Dokumen legal (mahal) gak "berbayar" lebih mahal
- Revenue kurang optimal untuk dokumen kompleks

### Implementasi

```sql
-- RPC issue_document (Model A)
create or replace function issue_document(p_ref text, p_category text)
returns jsonb
language plpgsql security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_quota int;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select credits into v_quota from ledger_accounts where user_id = v_user_id;
  
  if v_quota is null or v_quota <= 0 then
    return jsonb_build_object('ok', false, 'error', 'insufficient_quota');
  end if;

  update ledger_accounts 
    set credits = credits - 1 
    where user_id = v_user_id;

  insert into credit_transactions (user_id, type, credits, category)
    values (v_user_id, 'issue', -1, p_category);

  update invoices 
    set issued_at = now(), category = p_category
    where ref = p_ref and user_id = v_user_id;

  return jsonb_build_object('ok', true, 'remaining', v_quota - 1);
end;
$$;
```

### Frontend

```js
// js/modules/backend.js
async issueDocument(ref, category) {
  const { data, error } = await supabase.rpc('issue_document', {
    p_ref: ref,
    p_category: category
  });
  return data; // { ok, remaining, error? }
}
```

---

## Model B — Tiered (weighted)

> Tiap kategori punya bobot. Debit kuota = `ceil(price_per_doc / base_price)`.

### Kelebihan
- Fair: dokumen mahal makan lebih banyak kuota
- Revenue proporsional

### Kekurangan
- Perlu edukasi user ("kenapa kwitansi 1, kontrak 2?")
- Frontend & backend lebih kompleks
- Hitung sisa kuota bisa membingungkan

### Implementasi

```sql
-- RPC issue_document (Model B)
create or replace function issue_document(p_ref text, p_category text)
returns jsonb
language plpgsql security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_quota int;
  v_price int;
  v_base_price int;
  v_weight int;
  v_remaining int;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select credits into v_quota from ledger_accounts where user_id = v_user_id;
  select price_per_doc into v_price from document_categories where id = p_category;
  
  -- Base price = harga termurah
  select min(price_per_doc) into v_base_price from document_categories where active = true;
  
  v_weight := ceil(v_price::numeric / v_base_price::numeric);

  if v_quota is null or v_quota < v_weight then
    return jsonb_build_object('ok', false, 'error', 'insufficient_quota');
  end if;

  v_remaining := v_quota - v_weight;

  update ledger_accounts 
    set credits = v_remaining 
    where user_id = v_user_id;

  insert into credit_transactions (user_id, type, credits, category)
    values (v_user_id, 'issue', -v_weight, p_category);

  update invoices 
    set issued_at = now(), category = p_category
    where ref = p_ref and user_id = v_user_id;

  return jsonb_build_object('ok', true, 'remaining', v_remaining, 'weight', v_weight);
end;
$$;
```

### Contoh Perhitungan

| Base price | Kategori | Harga | Weight |
|---|---|---|---|
| 500 | umkm | 500 | 1 |
| 500 | finance | 1000 | 2 |
| 500 | legal | 2000 | 4 |

> User dengan 60 kuota bisa terbit 60 dokumen UMKM atau 15 dokumen Legal.

---

## Alur Top-Up

```
User klik "Top Up"
  │
  ├─ Pilih paket (Starter/Bisnis/Pro)
  │
  ├─ CALL request_topup(package_id)
  │   → buat topup_requests (pending)
  │
  ├─ User transfer manual / QRIS
  │   → screenshot bukti
  │
  └─ Admin approve
      │
      └─ CALL approve_topup(request_id)
          → tambah credits ke ledger_accounts
          → tandai approved
```

### Frontend (Remote mode)

```js
async requestTopup(packageId) {
  const { data, error } = await supabase.rpc('request_topup', {
    p_package_id: packageId
  });
  return data; // { ok, request_id }
}
```

### Frontend (Local mode — redeem kode offline)

```js
// credit-ledger.js — kode offline per akun
redeemCode(code) {
  const expected = adminCode(this.userId);
  if (code !== expected) return { ok: false, error: 'invalid_code' };
  const pkg = PACKAGES.find(p => p.id === packageId);
  this.credits += pkg.credits;
  this.save();
  return { ok: true, remaining: this.credits };
}
```

---

## Re-print & Re-share

> **GRATIS** — dokumen yang sudah terbit bisa dicetak ulang / dibagikan ulang tanpa debit lagi.

```js
// app.js — hanya debit saat PERTAMA KALI terbit
if (!state.isIssued) {
  const result = await backend.issueDocument(state.ref, state.category);
  if (!result.ok) { showError(result.error); return; }
  state.isIssued = true;
}
// Lanjut cetak / share tanpa cek kuota
```

---

## Riwayat Transaksi

| type | credits | category | Keterangan |
|---|---|---|---|
| `trial` | +10 | NULL | Bonus awal |
| `issue` | -1 | `finance` | Terbit faktur |
| `issue` | -4 | `legal` | Terbit kontrak (Model B) |
| `topup` | +60 | NULL | Top-up Bisnis |
| `cancel` | +0 | `legal` | Top-up ditolak |
| `adjust` | +5 | NULL | Bonus manual admin |

---

## Mode Fallback (Offline / Belum Login)

```js
// credit-ledger.js — localStorage
issueLocal(ref, category) {
  if (this.credits <= 0) return { ok: false };
  this.credits -= 1;
  this.history.push({
    type: 'issue',
    credits: -1,
    category,
    ref,
    date: Date.now()
  });
  this.save();
  return { ok: true, remaining: this.credits };
}
```

> Catatan: mode lokal **bisa diakali** (edit localStorage). Ini known limitation, sudah dilaporkan.

---

*Lihat juga: [02-database](02-database.md) untuk SQL lengkap, [04-ui-ux](04-ui-ux.md) untuk tampilan billing.*
