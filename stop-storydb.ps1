$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot

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

Write-Host 'Stopping StoryDB API and frontend...'
Stop-PortProcess -Port 5282
Stop-PortProcess -Port 50201

Write-Host 'Stopping Docker containers...'
docker compose down

Write-Host 'StoryDB is stopped. PostgreSQL data volume was kept.'
