# FakturKu — restore snapshot backup.
#
# Dua mode:
#   1) DRILL (default, aman): restore snapshot ke schema scratch, verifikasi jumlah baris,
#      lalu drop schema. Dipakai untuk membuktikan snapshot benar-benar bisa dipulihkan.
#   2) LIVE (berbahaya): restore ke schema `public` (menghapus data sekarang).
#      WAJIB pakai -Confirm, idealnya saat aplikasi tidak dipakai.
#
# Contoh:
#   powershell -ExecutionPolicy Bypass -File tools\restore-fakturku.ps1 -Snapshot "$env:USERPROFILE\backups\fakturku\2026-10-20_093741"
#   powershell -ExecutionPolicy Bypass -File tools\restore-fakturku.ps1 -Snapshot "..." -KeepDrill
#   powershell -ExecutionPolicy Bypass -File tools\restore-fakturku.ps1 -Snapshot "..." -Target public -Confirm
#
# Token DB diambil dari Windows Credential Manager (CLI Supabase); token tidak pernah dicetak.

param(
  [Parameter(Mandatory = $true)][string]$Snapshot,
  [string]$Ref = "pcydwlfyughwasyqglwq",
  [string]$Target = "drill",
  [string]$DrillSchema = "fk_restore_drill",
  [switch]$Confirm,
  [switch]$KeepDrill,
  [switch]$SkipAuth
)
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FkRestoreCred {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public uint Flags; public uint Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize; public IntPtr CredentialBlob;
    public uint Persist; public uint AttributeCount; public IntPtr Attributes;
    public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, uint type, uint reservedFlag, out IntPtr credentialPtr);
  [DllImport("advapi32.dll", SetLastError=true)]
  public static extern void CredFree(IntPtr buffer);
}
"@

function Get-FkToken {
  $ptr = [IntPtr]::Zero
  if (-not [FkRestoreCred]::CredRead("Supabase CLI:supabase", 1, 0, [ref]$ptr)) {
    throw "Kredensial CLI Supabase tidak ditemukan. Jalankan: supabase login"
  }
  $c = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][FkRestoreCred+CREDENTIAL])
  $bytes = New-Object byte[] $c.CredentialBlobSize
  [System.Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $bytes, 0, $c.CredentialBlobSize)
  [FkRestoreCred]::CredFree($ptr) | Out-Null
  foreach ($enc in @([System.Text.Encoding]::UTF8, [System.Text.Encoding]::Unicode)) {
    $s = $enc.GetString($bytes).Trim()
    if ($s -match '^(eyJ|sbp_)') { return $s }
  }
  throw "Token Supabase tidak terbaca."
}

$script:Token = Get-FkToken

function Invoke-FkSql([string]$Sql) {
  $body = @{ query = $Sql } | ConvertTo-Json -Depth 5 -Compress
  return Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$Ref/database/query" -Method Post `
    -Headers @{ Authorization = "Bearer $script:Token" } `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) `
    -ContentType "application/json" -TimeoutSec 180
}

function Escape-Sql([string]$s) { return $s.Replace("'", "''") }

# ---------- validasi snapshot ----------
if ($Snapshot -eq "latest" -or $Snapshot -eq "LATEST") {
  $root = Join-Path $env:USERPROFILE "backups\fakturku"
  $newest = Get-ChildItem $root -Directory | Sort-Object Name -Descending | Select-Object -First 1
  if (-not $newest) { throw "Tidak ada snapshot di $root" }
  $Snapshot = $newest.FullName
  Write-Output ("snapshot terbaru: " + (Split-Path $Snapshot -Leaf))
}
if (-not (Test-Path $Snapshot)) { throw "Folder snapshot tidak ditemukan: $Snapshot" }
$metaPath = Join-Path $Snapshot "meta.json"
if (-not (Test-Path $metaPath)) { throw "meta.json tidak ada di snapshot (bukan snapshot FakturKu?)" }
$meta = Get-Content $metaPath -Raw | ConvertFrom-Json
Write-Output ("SNAPSHOT : " + (Split-Path $Snapshot -Leaf))
Write-Output ("dibuat   : " + $meta.created_at + " | commit: " + $meta.repo_commit)

# urutan insert (parent dulu) supaya FK aman saat restore ke public
$order = @(
  "public.document_categories",
  "public.document_templates",
  "public.packages",
  "public.billing_settings",
  "public.profiles",
  "public.ledger_accounts",
  "public.credit_transactions",
  "public.category_unlocks",
  "public.invoices",
  "public.topup_requests",
  "public.document_number_counters",
  "public.gemini_daily_usage",
  "public.admin_push_subscriptions",
  "public.admin_push_events"
)

$isLive = ($Target -eq "public")
if ($isLive -and -not $Confirm) {
  throw "Restore ke public menghapus data sekarang. Tambahkan -Confirm bila benar-benar dilakukan (jadwalkan saat aplikasi tidak dipakai)."
}

# ---------- siapkan schema target ----------
if ($isLive) {
  $schema = "public"
  Write-Output "MODE    : LIVE (data public akan DITIMPA)"
} else {
  $schema = $DrillSchema
  Write-Output ("MODE    : DRILL ke schema " + $schema)
  Invoke-FkSql ("drop schema if exists " + $schema + " cascade; create schema " + $schema + ";") | Out-Null
}

# buat tabel mirror (tanpa FK supaya drill cepat & aman)
foreach ($fq in $order) {
  $tbl = $fq -replace '^public\.', ''
  try {
    Invoke-FkSql ("create table if not exists " + $schema + "." + $tbl + " (like " + $fq + ");") | Out-Null
  } catch {
    Write-Output ("  GAGAL buat tabel " + $tbl + ": " + $_.Exception.Message)
  }
}

# ---------- restore per tabel ----------
$report = New-Object System.Collections.Generic.List[string]
$ok = $true
foreach ($fq in $order) {
  $tbl = $fq -replace '^public\.', ''
  $path = Join-Path $Snapshot ($fq + ".json")
  if (-not (Test-Path $path)) { continue }
  $json = (Get-Content $path -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($json) -or $json -eq "[]") { continue }
  try {
    if ($isLive) {
      Invoke-FkSql ("truncate table " + $schema + "." + $tbl + " cascade;") | Out-Null
    } else {
      Invoke-FkSql ("truncate table " + $schema + "." + $tbl + ";") | Out-Null
    }
    $sql = "insert into " + $schema + "." + $tbl + " select * from jsonb_populate_recordset(null::" + $fq + ", '" + (Escape-Sql $json) + "'::jsonb);"
    Invoke-FkSql $sql | Out-Null
    $cnt = Invoke-FkSql ("select count(*)::int as n from " + $schema + "." + $tbl + ";")
    $n = [int]$cnt[0].n
    $expected = $meta.tables.$fq.rows
    $flag = if ($n -eq $expected) { "OK" } else { "MISMATCH" }
    if ($n -ne $expected) { $ok = $false }
    $report.Add(("  {0,-32} {1,6} baris (snapshot {2,6}) {3}" -f $fq, $n, $expected, $flag))
  } catch {
    $ok = $false
    $report.Add(("  {0,-32} GAGAL: {1}" -f $fq, $_.Exception.Message))
  }
}

# ---------- auth.users (opsional) ----------
if (-not $SkipAuth) {
  $authPath = Join-Path $Snapshot "auth.users.json"
  if (Test-Path $authPath) {
    $json = (Get-Content $authPath -Raw).Trim()
    try {
      if ($isLive) {
        Invoke-FkSql ("truncate table auth.users cascade;") | Out-Null
      } else {
        Invoke-FkSql ("create table if not exists " + $schema + ".auth_users (like auth.users);") | Out-Null
        Invoke-FkSql ("truncate table " + $schema + ".auth_users;") | Out-Null
      }
      $dest = if ($isLive) { "auth.users" } else { $schema + ".auth_users" }
      $src = if ($isLive) { "auth.users" } else { "auth.users" }
      $sql = "insert into " + $dest + " select * from jsonb_populate_recordset(null::" + $src + ", '" + (Escape-Sql $json) + "'::jsonb);"
      Invoke-FkSql $sql | Out-Null
      $cnt = Invoke-FkSql ("select count(*)::int as n from " + $dest + ";")
      $report.Add(("  {0,-32} {1,6} baris (akun login ikut dipulihkan)" -f "auth.users", [int]$cnt[0].n))
    } catch {
      $ok = $false
      $report.Add("  auth.users                          GAGAL: " + $_.Exception.Message)
    }
  }
}

$report | ForEach-Object { Write-Output $_ }
Write-Output ("HASIL   : " + $(if ($ok) { "SEMUA TABEL COCOK" } else { "ADA TABEL YANG GAGAL/MLIMIT" }))

if (-not $isLive -and -not $KeepDrill) {
  Invoke-FkSql ("drop schema if exists " + $schema + " cascade;") | Out-Null
  Write-Output ("CLEANUP : schema " + $schema + " di-drop (restore terbukti jalan)")
} elseif (-not $isLive) {
  Write-Output ("CLEANUP : schema " + $schema + " disimpan untuk diperiksa manual")
}

if ($isLive) {
  Write-Output "PENTING : jalankan ulang migration repo yang belum tercatat (tools/align-migrations.ps1) lalu cek UI aplikasi."
}
