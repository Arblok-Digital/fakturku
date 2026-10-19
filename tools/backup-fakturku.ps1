# FakturKu — backup logis harian (tanpa perlu plan Pro / pg_dump).
# Mengambil snapshot JSON semua tabel public + auth.users via Supabase Management API.
# Token dibaca dari Windows Credential Manager (CLI Supabase); token TIDAK pernah dicetak.
#
# Pakai:
#   powershell -ExecutionPolicy Bypass -File tools\backup-fakturku.ps1
#   powershell -ExecutionPolicy Bypass -File tools\backup-fakturku.ps1 -OutRoot "D:\backup\fakturku" -Keep 30
#
# Catatan keamanan: folder backup berisi data pengguna (email, dokumen, saldo) dan
# hash password auth.users. Simpan di perangkat tepercaya; jangan commit ke repo.

param(
  [string]$OutRoot = "$env:USERPROFILE\backups\fakturku",
  [int]$Keep = 14,
  [string]$Ref = "pcydwlfyughwasyqglwq"
)

$ErrorActionPreference = "Stop"
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FkBackupCred {
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
  if (-not [FkBackupCred]::CredRead("Supabase CLI:supabase", 1, 0, [ref]$ptr)) {
    throw "Kredensial CLI Supabase tidak ditemukan. Jalankan: supabase login"
  }
  $c = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][FkBackupCred+CREDENTIAL])
  $bytes = New-Object byte[] $c.CredentialBlobSize
  [System.Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $bytes, 0, $c.CredentialBlobSize)
  [FkBackupCred]::CredFree($ptr) | Out-Null
  foreach ($enc in @([System.Text.Encoding]::UTF8, [System.Text.Encoding]::Unicode)) {
    $s = $enc.GetString($bytes).Trim()
    if ($s -match '^(eyJ|sbp_)') { return $s }
  }
  throw "Token Supabase tidak terbaca."
}

function Invoke-FkSql([string]$Sql) {
  $body = @{ query = $Sql } | ConvertTo-Json -Depth 5 -Compress
  $uri = "https://api.supabase.com/v1/projects/$Ref/database/query"
  return Invoke-RestMethod -Uri $uri -Method Post `
    -Headers @{ Authorization = "Bearer $script:Token" } `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) `
    -ContentType "application/json" -TimeoutSec 180
}

$script:Token = Get-FkToken

$targets = @(
  @{ schema = "public"; table = "profiles" },
  @{ schema = "public"; table = "ledger_accounts" },
  @{ schema = "public"; table = "credit_transactions" },
  @{ schema = "public"; table = "invoices" },
  @{ schema = "public"; table = "topup_requests" },
  @{ schema = "public"; table = "document_categories" },
  @{ schema = "public"; table = "document_templates" },
  @{ schema = "public"; table = "packages" },
  @{ schema = "public"; table = "category_unlocks" },
  @{ schema = "public"; table = "billing_settings" },
  @{ schema = "public"; table = "document_number_counters" },
  @{ schema = "public"; table = "gemini_daily_usage" },
  @{ schema = "public"; table = "admin_push_events" },
  @{ schema = "public"; table = "admin_push_subscriptions" },
  @{ schema = "auth";   table = "users" }
)

$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$dir = Join-Path $OutRoot $stamp
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$utf8 = New-Object System.Text.UTF8Encoding($false)
$summary = [ordered]@{}
$totalBytes = 0

foreach ($t in $targets) {
  $fq = "$($t.schema).$($t.table)"
  $sql = "SELECT coalesce(json_agg(x), '[]'::json)::text AS data, count(*)::int AS n FROM $fq x;"
  $res = Invoke-FkSql $sql
  $data = $res[0].data
  $n = [int]$res[0].n
  $path = Join-Path $dir ($fq + ".json")
  [System.IO.File]::WriteAllText($path, $data, $utf8)
  $size = (Get-Item $path).Length
  $totalBytes += $size
  $summary[$fq] = [ordered]@{ rows = $n; bytes = $size }
}

# jejak versi migrasi + commit repo (untuk referensi pemulihan)
try {
  $mig = Invoke-FkSql "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"
  [System.IO.File]::WriteAllText(
    (Join-Path $dir "_migrations.json"),
    (ConvertTo-Json @($mig) -Depth 5),
    $utf8
  )
} catch { }

$commit = "unknown"
try {
  Push-Location (Join-Path $PSScriptRoot "..")
  $commit = (git rev-parse --short HEAD 2>$null)
  Pop-Location
} catch { }

$meta = [ordered]@{
  created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
  project_ref = $Ref
  repo_commit = "$commit"
  keep = $Keep
  tables = $summary
  total_bytes = $totalBytes
}
[System.IO.File]::WriteAllText(
  (Join-Path $dir "meta.json"),
  (ConvertTo-Json $meta -Depth 6),
  $utf8
)

# rotasi: sisakan $Keep snapshot terbaru
$snapshots = Get-ChildItem $OutRoot -Directory | Sort-Object Name -Descending
if ($snapshots.Count -gt $Keep) {
  $snapshots | Select-Object -Skip $Keep | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force
  }
}

Write-Output ("BACKUP OK -> " + $dir)
Write-Output ("tabel: " + $targets.Count + " | total: " + [math]::Round($totalBytes / 1KB, 1) + " KB | snapshot disimpan: " + [math]::Min($snapshots.Count, $Keep))
