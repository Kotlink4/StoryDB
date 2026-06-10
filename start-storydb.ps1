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

function Invoke-Compose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

    $dockerComposeWorks = $false
    try {
        docker compose version *> $null
        $dockerComposeWorks = $LASTEXITCODE -eq 0
    } catch {
        $dockerComposeWorks = $false
    }

    if ($dockerComposeWorks) {
        docker compose @Arguments
        return
    }

    $legacyCompose = Get-Command docker-compose -ErrorAction SilentlyContinue
    if ($legacyCompose -ne $null) {
        docker-compose @Arguments
        return
    }

    throw 'Docker Compose was not found. Install Docker Desktop or the docker compose plugin.'
}

Set-Location $root

Write-Host 'Stopping old StoryDB Docker stack...'
Invoke-Compose down

Write-Host 'Stopping old host StoryDB processes...'
Stop-PortProcess -Port 5282
Stop-PortProcess -Port 50201

Write-Host 'Starting StoryDB Docker stack...'
Invoke-Compose up -d --build

Write-Host ''
Write-Host 'StoryDB is running in Docker.'
Write-Host 'Frontend: http://localhost:50201'
Write-Host 'API:      http://localhost:5282'
Write-Host 'Postgres: localhost:5432'
Write-Host ''
Write-Host 'Logs:     docker compose logs -f'
