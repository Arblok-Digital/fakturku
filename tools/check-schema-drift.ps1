# FakturKu — cek drift antara migrasi repo dan database live.
#
# Dua cek:
#   1) Versi migrasi: file repo vs supabase_migrations.schema_migrations di live.
#   2) Objects: setiap tabel/kolom/fungsi/policy/trigger live harus ada di teks migrasi repo.
#
# Pakai:
#   powershell -ExecutionPolicy Bypass -File tools\check-schema-drift.ps1
#
# Exit code 0 = tidak ada drift, 1 = ada drift (bisa dipakai sebagai gate).

param(
  [string]$Ref = "pcydwlfyughwasyqglwq"
)
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class FkDriftCred {
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
  if (-not [FkDriftCred]::CredRead("Supabase CLI:supabase", 1, 0, [ref]$ptr)) { throw "Kredensial CLI Supabase tidak ditemukan." }
  $c = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][FkDriftCred+CREDENTIAL])
  $bytes = New-Object byte[] $c.CredentialBlobSize
  [System.Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $bytes, 0, $c.CredentialBlobSize)
  [FkDriftCred]::CredFree($ptr) | Out-Null
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
    -ContentType "application/json" -TimeoutSec 180
}

$repoDir = Join-Path (Split-Path $PSScriptRoot -Parent) "supabase\migrations"
$repoFiles = Get-ChildItem $repoDir -Filter *.sql | Sort-Object Name
$repoVersions = @()
foreach ($f in $repoFiles) { $repoVersions += $f.BaseName.Substring(0, 14) }

# Versi yang hanya tercatat di live, tapi efeknya sudah tercakup file repo
# (dicatat saat penyelarasan 2026-10-20). Efeknya diverifikasi lewat cek objek di bawah.
$coveredByRepo = @{
  "20261013100000" = "20261012080000_category_billing.sql, 20261017000100_sync_business_templates_phase4.sql"
  "20261013130000" = "20261017000200_billing_phase5_free_tier_category_unlock.sql"
  "20261013140000" = "20261020110000_reconcile_missing_objects.sql"
}

$liveRows = Run-Sql "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"
$liveVersions = @($liveRows | ForEach-Object { [string]$_.version })

$onlyRepo  = $repoVersions  | Where-Object { $liveVersions -notcontains $_ }
$onlyLive  = $liveVersions  | Where-Object { $repoVersions -notcontains $_ }
$uncovered = $onlyLive | Where-Object { -not $coveredByRepo.ContainsKey($_) }

Write-Output "=== VERSI MIGRASI ==="
Write-Output ("repo : " + ($repoVersions -join ", "))
Write-Output ("live : " + ($liveVersions -join ", "))
if ($onlyRepo) { Write-Output ("HANYA DI REPO (belum jalan di live): " + ($onlyRepo -join ", ")) }
if ($onlyLive) {
  Write-Output ("HANYA DI LIVE: " + ($onlyLive -join ", "))
  foreach ($v in $onlyLive) {
    if ($coveredByRepo.ContainsKey($v)) {
      Write-Output ("  -> " + $v + " efeknya tercakup: " + $coveredByRepo[$v])
    } else {
      Write-Output ("  -> " + $v + " BELUM TERCakup file repo (perlu migrasi rekonsiliasi)")
    }
  }
}

Write-Output ""
Write-Output "=== OBJECTS LIVE YANG BELUM ADA DI MIGRASI REPO ==="
$sql = @"
select 'table' as kind, c.relname as name, '' as detail from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'
union all
select 'function', p.proname, '' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
union all
select 'policy', tablename, policyname from pg_policies where schemaname='public'
union all
select 'trigger', c.relname, t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal
union all
select 'column', table_name, column_name from information_schema.columns where table_schema='public'
order by 1,2;
"@
$objs = Run-Sql $sql
$repoText = (Get-Content $repoFiles.FullName -Raw) -join "`n"
$missing = @()
foreach ($o in $objs) {
  if ($repoText -notmatch [regex]::Escape([string]$o.name)) { $missing += $o }
}
if ($missing.Count -eq 0) {
  Write-Output "  semua object live sudah tercakup migrasi repo"
} else {
  $missing | ForEach-Object { Write-Output ("  " + $_.kind + " " + $_.name + " " + $_.detail) }
}

$drift = ($missing.Count -gt 0) -or ($onlyRepo.Count -gt 0) -or ($uncovered.Count -gt 0)
Write-Output ""
if ($drift) {
  Write-Output "HASIL: DRIFT DITEMUKAN"
  exit 1
} else {
  Write-Output "HASIL: TIDAK ADA DRIFT"
  exit 0
}
