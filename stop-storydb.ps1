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

Write-Host 'Stopping StoryDB Docker stack...'
Invoke-Compose down

Write-Host 'StoryDB is stopped. PostgreSQL and uploads volumes were kept.'
