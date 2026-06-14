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

$composeFile = if ($env:STORYDB_COMPOSE_FILE) { $env:STORYDB_COMPOSE_FILE } else { 'docker-compose.prod.yml' }
if (-not (Test-Path (Join-Path $root $composeFile))) {
    $composeFile = 'docker-compose.yml'
}

$uploadsPath = if ($env:STORYDB_UPLOADS_PATH) { $env:STORYDB_UPLOADS_PATH } else { Join-Path $root 'data\uploads' }
$dataProtectionPath = if ($env:STORYDB_DATAPROTECTION_PATH) { $env:STORYDB_DATAPROTECTION_PATH } else { Join-Path $root 'data\dataprotection' }
$logsPath = if ($env:STORYDB_LOGS_PATH) { $env:STORYDB_LOGS_PATH } else { Join-Path $root 'data\logs' }

New-Item -ItemType Directory -Force -Path $uploadsPath, $dataProtectionPath, $logsPath | Out-Null

Write-Host 'Stopping old StoryDB Docker stack...'
Invoke-Compose -f $composeFile down

Write-Host 'Removing stale StoryDB containers...'
docker rm -f storydb-client storydb-api storydb-postgres 2>$null | Out-Null

Write-Host 'Stopping old host StoryDB processes...'
Stop-PortProcess -Port 5282
Stop-PortProcess -Port 50201

Write-Host 'Starting StoryDB Docker stack...'
Write-Host "Using compose file: $composeFile"
if ($composeFile -like '*prod*') {
    Invoke-Compose -f $composeFile pull
    Invoke-Compose -f $composeFile up -d
} else {
    Invoke-Compose -f $composeFile up -d --build
}

Write-Host ''
Write-Host 'StoryDB is running in Docker.'
Write-Host 'Frontend: http://localhost:50201'
Write-Host 'API:      http://localhost:5282'
Write-Host 'Postgres: localhost:5432'
Write-Host ''
Write-Host 'Logs:     docker compose logs -f'
