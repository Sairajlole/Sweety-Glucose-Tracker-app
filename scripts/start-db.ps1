<#
.SYNOPSIS
    Starts the local PostgreSQL instance used by Sweety.

.DESCRIPTION
    Sweety was developed against a portable PostgreSQL 16 build that runs
    without administrator rights and without installing a Windows service.
    This script starts that instance and waits until it accepts connections.

    If you installed PostgreSQL normally (as a Windows service), you do not
    need this script - the service starts itself. Point DATABASE_URL at your
    own instance instead.

    Note: on a machine with limited free memory, PostgreSQL can take 30-60
    seconds to finish crash recovery and start accepting connections. This
    script waits up to 60 seconds rather than failing early.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\start-db.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\start-db.ps1 -Port 5432 -DataDir "C:\pgdata"
#>
param(
    [string]$PgRoot = "C:\Users\hp\pgsql",
    [string]$DataDir = "C:\Users\hp\pgsql-data",
    [int]$Port = 55432,
    [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = 'Stop'

$pgCtl = Join-Path $PgRoot 'bin\pg_ctl.exe'
$pgIsReady = Join-Path $PgRoot 'bin\pg_isready.exe'
$psql = Join-Path $PgRoot 'bin\psql.exe'

if (-not (Test-Path $pgCtl)) {
    Write-Error "pg_ctl.exe not found at $pgCtl. Set -PgRoot to your PostgreSQL bin directory."
    exit 1
}

if (-not (Test-Path (Join-Path $DataDir 'PG_VERSION'))) {
    Write-Error "No PostgreSQL cluster found at $DataDir. See README.md > Database setup for the initialisation steps."
    exit 1
}

$probe = & $pgIsReady -h 127.0.0.1 -p $Port 2>&1
if ($probe -match 'accepting connections') {
    Write-Host "PostgreSQL is already running on port $Port." -ForegroundColor Green
} else {
    Write-Host "Starting PostgreSQL from $DataDir ..."

    # pg_ctl is launched detached with its output redirected to files. Running
    # it through a pipeline makes this script hang, because the postmaster
    # inherits the console handle and keeps the pipe open after pg_ctl exits.
    $ctlOut = Join-Path $DataDir 'pg_ctl.out'
    Start-Process -FilePath $pgCtl `
        -ArgumentList @('-D', $DataDir, '-l', (Join-Path $DataDir 'server.log'), '-w', 'start') `
        -RedirectStandardOutput $ctlOut `
        -RedirectStandardError "$ctlOut.err" `
        -WindowStyle Hidden | Out-Null

    $ready = $false
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 2
        $probe = & $pgIsReady -h 127.0.0.1 -p $Port 2>&1
        if ($probe -match 'accepting connections') {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        Write-Error "PostgreSQL did not accept connections within $TimeoutSeconds seconds. Check $DataDir\server.log"
        exit 1
    }

    Write-Host "PostgreSQL started on port $Port." -ForegroundColor Green
}

$env:PGPASSWORD = if ($env:PGPASSWORD) { $env:PGPASSWORD } else { 'postgres' }
$databases = & $psql -h 127.0.0.1 -p $Port -U postgres -tAc "SELECT datname FROM pg_database WHERE datname LIKE 'sweety%' ORDER BY 1" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Databases: $($databases -join ', ')"
    if (-not ($databases -match 'sweety_db')) {
        Write-Host "sweety_db is missing. Create it with:" -ForegroundColor Yellow
        Write-Host "  createdb -h 127.0.0.1 -p $Port -U postgres sweety_db"
    }
} else {
    Write-Warning "Could not list databases: $databases"
}
