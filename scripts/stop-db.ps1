<#
.SYNOPSIS
    Stops the local PostgreSQL instance used by Sweety.

.DESCRIPTION
    Companion to start-db.ps1. This only applies to the portable, non-service
    PostgreSQL instance; a normal Windows service installation is unaffected
    and should be managed through services.msc.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\stop-db.ps1
#>
param(
    [string]$PgRoot = "C:\Users\hp\pgsql",
    [string]$DataDir = "C:\Users\hp\pgsql-data",
    [int]$Port = 55432
)

$ErrorActionPreference = 'Stop'

$pgCtl = Join-Path $PgRoot 'bin\pg_ctl.exe'

if (-not (Test-Path $pgCtl)) {
    Write-Error "pg_ctl.exe not found at $pgCtl. Set -PgRoot to your PostgreSQL bin directory."
    exit 1
}

$listening = netstat -ano | Select-String ":$Port\s+.*LISTENING"

if (-not $listening) {
    Write-Host "Nothing is listening on port $Port - PostgreSQL is already stopped."
    exit 0
}

Write-Host "Stopping PostgreSQL (data directory: $DataDir) ..."
& $pgCtl -D $DataDir -m fast -w stop | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_ctl failed to stop the cluster."
    exit 1
}

Write-Host "PostgreSQL stopped." -ForegroundColor Green
