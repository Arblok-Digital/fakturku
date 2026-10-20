# Runbook Pemulihan Data FakturKu

Ringkas: apa yang dicadangkan, di mana, cara memverifikasi, dan cara memulihkan
kalau database production bermasalah.

> Status 2026-10-20: **sudah diuji.** Drill restore dijalankan dan LOLOS
> (14 tabel + `auth.users`, jumlah baris cocok 100%).

---

## 1. Apa yang dicadangkan

`tools/backup-fakturku.ps1` mengambil snapshot JSON (bukan `pg_dump`, supaya jalan
di plan free & tanpa IPv6):

| Isi | Keterangan |
|---|---|
| 14 tabel `public` | profiles, ledger_accounts, credit_transactions, invoices, topup_requests, document_categories, document_templates, packages, category_unlocks, billing_settings, document_number_counters, gemini_daily_usage, admin_push_subscriptions, admin_push_events |
| `auth.users` | akun + hash password (login lama tetap bisa dipakai setelah restore) |
| `_migrations.json` | versi migrasi yang tercatat di DB saat snapshot diambil |
| `meta.json` | waktu, project ref, commit repo, jumlah baris per tabel |

Lokasi default: `%USERPROFILE%\backups\fakturku\<timestamp>\`
Retensi: 14 snapshot terbaru (rotasi otomatis).

**PENTING:** folder ini berisi data pengguna + hash password. Jangan di-commit,
jangan dikirim ke tempat publik. Idealnya salin offsite (OneDrive/Google Drive/USB).

---

## 2. Cara backup

```powershell
# manual
powershell -ExecutionPolicy Bypass -File tools\backup-fakturku.ps1

# dengan mirror offsite (OneDrive)
powershell -ExecutionPolicy Bypass -File tools\backup-fakturku.ps1 -MirrorTo "$env:OneDrive\Backup\fakturku"
```

Otomatis: Task Scheduler **"FakturKu Backup"** → harian 21:30, `StartWhenAvailable`.
Cek status:

```powershell
schtasks /Query /TN "FakturKu Backup" /FO LIST /V
```

Setiap run menulis `backup-<timestamp>.log` di folder backup. Kalau `Last Result`
bukan 0, buka log tersebut untuk melihat tabel mana yang gagal.

---

## 3. Verifikasi backup (WAJIB, mingguan)

```powershell
# 1. cek snapshot terbaru parse & jumlah baris
$snap = (Get-ChildItem "$env:USERPROFILE\backups\fakturku" -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName
Get-ChildItem $snap -Filter *.json | ForEach-Object { "$($_.Name) -> $((Get-Content $_.FullName -Raw | ConvertFrom-Json).Count) baris" }

# 2. DRILL restore ke schema scratch (aman, data live tidak tersentuh)
powershell -ExecutionPolicy Bypass -File tools\restore-fakturku.ps1 -Snapshot latest
```

Hasil drill yang diharapkan:

```
  public.document_categories            7 baris (snapshot      7) OK
  ...
  auth.users                            5 baris (akun login ikut dipulihkan)
HASIL   : SEMUA TABEL COCOK
CLEANUP : schema fk_restore_drill di-drop (restore terbukti jalan)
```

---

## 4. Restore ke production (darurat)

Hanya kalau database production benar-benar rusak/hilang.

1. **Backup kondisi sekarang** (biar bisa rollback):
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\backup-fakturku.ps1
   ```
2. Pastikan app tidak dipakai (hentikan deploy / beri pengumuman singkat).
3. Jalankan restore ke `public`:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\restore-fakturku.ps1 -Snapshot "<folder snapshot>" -Target public -Confirm
   ```
   Perintah ini **MENIMPA** data `public` (TRUNCATE + insert) dan `auth.users`.
4. Sinkronkan versi migrasi:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\align-migrations.ps1 -Apply
   ```
5. Verifikasi:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\check-schema-drift.ps1   # harus: TIDAK ADA DRIFT
   ```
   Cek juga: login user lama, buka dokumen, jumlah template 51, saldo & kuota benar.
6. Kalau ada yang gagal: ulangi langkah 1-3 dengan snapshot yang lebih baru.

> Catatan: `auth.users` dipulihkan beserta hash password, jadi password lama user
> tetap berlaku. Yang **tidak** ikut: `auth.identities`, sesi, dan refresh token
> (user perlu login ulang). Notifikasi push admin juga perlu diaktifkan ulang.

---

## 5. Kalau proyek Supabase hilang total

Repo + snapshot adalah sumber kebenaran. Urutan langkah:

1. Buat project baru, catat `project_ref` baru.
2. Terapkan migrasi repo dari awal:
   ```powershell
   # ubah -Ref di script ke project baru
   powershell -ExecutionPolicy Bypass -File tools\align-migrations.ps1 -Ref <ref-baru> -Apply
   ```
   (Script menjalankan file migrasi repo berurutan; repo sudah lengkap —
   termasuk trigger pengaman billing dan fitur push admin.)
3. Restore snapshot ke project baru:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\restore-fakturku.ps1 -Ref <ref-baru> -Snapshot <folder> -Target public -Confirm
   ```
4. Update `SUPABASE_URL` & `SUPABASE_ANON_KEY` di `js/config.js` + `api/*.js`,
   lalu deploy ulang.

> Karena itu file migrasi repo harus selalu **lengkap** — cek dengan
> `tools/check-schema-drift.ps1` sebelum melakukan recovery.
