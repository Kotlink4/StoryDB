$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot

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

Write-Host 'Stopping StoryDB Docker stack...'
Write-Host "Using compose file: $composeFile"
Invoke-Compose -f $composeFile down

Write-Host 'StoryDB is stopped. PostgreSQL and uploads volumes were kept.'
