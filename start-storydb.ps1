$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$apiLog = Join-Path $root 'api-dev-5282.log'
$apiErrorLog = Join-Path $root 'api-dev-5282.err.log'
$clientLog = Join-Path $root 'client-dev-50201.log'
$clientErrorLog = Join-Path $root 'client-dev-50201.err.log'

function Stop-PortProcess {
    param([int]$Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        Where-Object { $_.State -eq 'Listen' } |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($processId in $connections) {
        if ($processId -gt 0) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

Set-Location $root

Write-Host 'Stopping old StoryDB app processes...'
Stop-PortProcess -Port 5282
Stop-PortProcess -Port 50201

Write-Host 'Starting PostgreSQL container...'
docker compose up -d

Write-Host 'Waiting for PostgreSQL healthcheck...'
$deadline = (Get-Date).AddSeconds(60)
do {
    $health = docker inspect --format='{{.State.Health.Status}}' storydb-postgres 2>$null
    if ($health -eq 'healthy') {
        break
    }

    Start-Sleep -Seconds 2
} while ((Get-Date) -lt $deadline)

if ($health -ne 'healthy') {
    throw 'PostgreSQL container did not become healthy in 60 seconds.'
}

Write-Host 'Starting StoryDB API on http://localhost:5282 ...'
Start-Process `
    -FilePath 'dotnet' `
    -ArgumentList @('run', '--project', 'StoryDB.Api', '--launch-profile', 'http') `
    -WorkingDirectory $root `
    -RedirectStandardOutput $apiLog `
    -RedirectStandardError $apiErrorLog `
    -WindowStyle Hidden

Write-Host 'Starting StoryDB frontend on http://127.0.0.1:50201 ...'
Start-Process `
    -FilePath 'npm.cmd' `
    -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1') `
    -WorkingDirectory (Join-Path $root 'storydb.client') `
    -RedirectStandardOutput $clientLog `
    -RedirectStandardError $clientErrorLog `
    -WindowStyle Hidden

Write-Host ''
Write-Host 'StoryDB is starting.'
Write-Host 'Frontend: http://127.0.0.1:50201'
Write-Host 'API:      http://localhost:5282'
Write-Host "API log:  $apiLog"
Write-Host "UI log:   $clientLog"
