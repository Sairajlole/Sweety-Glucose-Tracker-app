<#
.SYNOPSIS
    Starts the local PostgreSQL instance used by Sweety.

.DESCRIPTION
    Sweety was developed against a portable PostgreSQL 16 build that runs
    without administrator rights and without installing a Windows service.
    This script starts that instance and reports whether it is accepting
    connections.

    If you installed PostgreSQL normally (as a Windows service), you do not
    need this script - the service starts itself. Point DATABASE_URL at your
    own instance instead.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\start-db.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\start-db.ps1 -Port 5432 -DataDir "C:\pgdata"
#>
param(
    [string]$PgRoot = "C:\Users\hp\pgsql",
    [string]$DataDir = "C:\Users\hp\pgsql-data",
    [int]$Port = 55432
)

$ErrorActionPreference = 'Stop'

$pgCtl = Join-Path $PgRoot 'bin\pg_ctl.exe'
$psql = Join-Path $PgRoot 'bin\psql.exe'

if (-not (Test-Path $pgCtl)) {
    Write-Error "pg_ctl.exe not found at $pgCtl. Set -PgRoot to your PostgreSQL bin directory."
    exit 1
}

if (-not (Test-Path (Join-Path $DataDir 'PG_VERSION'))) {
    Write-Error "No PostgreSQL cluster found at $DataDir. See README.md > Database setup for the initialisation steps."
    exit 1
}

$listening = netstat -ano | Select-String ":$Port\s+.*LISTENING"

if ($listening) {
    Write-Host "PostgreSQL is already running on port $Port." -ForegroundColor Green
} else {
    Write-Host "Starting PostgreSQL from $DataDir ..."
    & $pgCtl -D $DataDir -l (Join-Path $DataDir 'server.log') -w start | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "pg_ctl failed to start the cluster. Check $DataDir\server.log"
        exit 1
    }
    Start-Sleep -Seconds 1
    Write-Host "PostgreSQL started on port $Port." -ForegroundColor Green
}

$env:PGPASSWORD = if ($env:PGPASSWORD) { $env:PGPASSWORD } else { 'postgres' }
$databases = & $psql -h 127.0.0.1 -p $Port -U postgres -tAc "SELECT datname FROM pg_database WHERE datname LIKE 'sweety%' ORDER BY 1" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Databases: $($databases -join ', ')"

    $hasDb = netstat -ano | Select-String ":$Port\s+.*LISTENING"
    if (-not ($databases -match 'sweety_db')) {
        Write-Host "sweety_db is missing. Create it with:" -ForegroundColor Yellow
        Write-Host "  createdb -h 127.0.0.1 -p $Port -U postgres sweety_db"
    }
} else {
    Write-Warning "Could not list databases: $databases"
}
