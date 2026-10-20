# FakturKu — sinkronkan migrasi repo dengan database live.
#
# Latar: CLI `supabase db push` tidak bisa dipakai dari mesin ini (IPv6), jadi
# migrasi dijalankan lewat Supabase Management API + dicatat manual di
# supabase_migrations.schema_migrations.
#
# Pakai:
#   powershell -ExecutionPolicy Bypass -File tools\align-migrations.ps1            # dry-run (report saja)
#   powershell -ExecutionPolicy Bypass -File tools\align-migrations.ps1 -Apply    # jalankan
#
# Yang dilakukan:
#   1. File migrasi repo yang versinya belum tercatat di live -> SQL dijalankan, lalu dicatat.
#   2. Versi yang hanya ada di live (efeknya sudah tercakup file repo) -> dicatat saja (metadata).
#
# JALankan BACKUP (tools\backup-fakturku.ps1) SEBELUM -Apply.

param(
  [string]$Ref = "pcydwlfyughwasyqglwq",
  [switch]$Apply
)
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FkAlignCred {
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
  if (-not [FkAlignCred]::CredRead("Supabase CLI:supabase", 1, 0, [ref]$ptr)) { throw "Kredensial CLI Supabase tidak ditemukan." }
  $c = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][FkAlignCred+CREDENTIAL])
  $bytes = New-Object byte[] $c.CredentialBlobSize
  [System.Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $bytes, 0, $c.CredentialBlobSize)
  [FkAlignCred]::CredFree($ptr) | Out-Null
  foreach ($enc in @([System.Text.Encoding]::UTF8, [System.Text.Encoding]::Unicode)) {
    $s = $enc.GetString($bytes).Trim()
    if ($s -match '^(eyJ|sbp_)') { return $s }
  }
  throw "Token Supabase tidak terbaca."
}

$tok = Get-FkToken
function Run-Sql([string]$q) {
  $body = @{ query = $q } | ConvertTo-Json -Depth 5 -Compress
  return Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$Ref/database/query" -Method Post `
    -Headers @{ Authorization = "Bearer $tok" } `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) `
    -ContentType "application/json" -TimeoutSec 300
}

# versi live-only: efeknya sudah tercakup file repo (dicek lewat objek live)
$bookkeepingOnly = @("20261013100000", "20261013130000", "20261013140000", "20261017000100", "20261017000200")

$repoDir = Join-Path (Split-Path $PSScriptRoot -Parent) "supabase\migrations"
$files = Get-ChildItem $repoDir -Filter *.sql | Sort-Object Name
$liveRows = Run-Sql "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"
$liveVersions = @($liveRows | ForEach-Object { [string]$_.version })

Write-Output "=== RENCANA PENYELARASAN ==="
foreach ($f in $files) {
  $v = $f.BaseName.Substring(0, 14)
  $name = $f.BaseName.Substring(15)
  if ($liveVersions -contains $v) {
    Write-Output ("  [selesai]  " + $v + " " + $name)
  } elseif ($bookkeepingOnly -contains $v) {
    Write-Output ("  [catat]    " + $v + " " + $name + "  (efek sudah ada di live)")
  } else {
    Write-Output ("  [JALANKAN] " + $v + " " + $name)
  }
}
foreach ($v in $liveVersions) {
  if (-not ($files | Where-Object { $_.BaseName.Substring(0, 14) -eq $v })) {
    Write-Output ("  [catat]    " + $v + " (hanya di live; efeknya tercakup file repo)")
  }
}

if (-not $Apply) {
  Write-Output ""
  Write-Output "DRY-RUN. Jalankan ulang dengan -Apply untuk eksekusi (backup dulu!)."
  exit 0
}

Write-Output ""
Write-Output "=== EKSEKUSI ==="

# 1) catat versi live-only + repo-only yang efeknya sudah ada
foreach ($v in $bookkeepingOnly) {
  $already = $liveVersions -contains $v
  if ($already) { continue }
  try {
    Run-Sql ("insert into supabase_migrations.schema_migrations (version, name) select '" + $v + "', '" + $v + "' where not exists (select 1 from supabase_migrations.schema_migrations where version = '" + $v + "');") | Out-Null
    Write-Output ("  dicatat: " + $v)
  } catch {
    Write-Output ("  GAGAL catat " + $v + ": " + $_.Exception.Message)
  }
}

# 2) jalankan file migrasi yang belum ada di live
foreach ($f in $files) {
  $v = $f.BaseName.Substring(0, 14)
  if ($liveVersions -contains $v) { continue }
  $sql = Get-Content $f.FullName -Raw
  Write-Output ("  menjalankan " + $f.Name + " ...")
  try {
    Run-Sql $sql | Out-Null
    Run-Sql ("insert into supabase_migrations.schema_migrations (version, name) values ('" + $v + "', '" + $f.BaseName.Substring(15) + "') on conflict do nothing;") | Out-Null
    Write-Output ("    OK " + $v)
  } catch {
    Write-Output ("    GAGAL " + $v + ": " + $_.Exception.Message)
    if ($_.ErrorDetails.Message) { Write-Output ("    detail: " + $_.ErrorDetails.Message) }
    exit 1
  }
}

Write-Output ""
$final = Run-Sql "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"
Write-Output ("versi live sekarang: " + (($final | ForEach-Object { $_.version }) -join ", "))
Write-Output "SELESAI. Jalankan tools\check-schema-drift.ps1 untuk verifikasi."
