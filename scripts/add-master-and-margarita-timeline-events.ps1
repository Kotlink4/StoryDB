param(
    [int]$ProjectId = 70,
    [string]$ContainerName = "storydb-postgres",
    [string]$Database = "storydb",
    [string]$User = "postgres"
)

$ErrorActionPreference = "Stop"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlPath = Join-Path $scriptDirectory "add-master-and-margarita-timeline-events.sql"

if (-not (Test-Path -LiteralPath $sqlPath)) {
    throw "SQL file not found: $sqlPath"
}

Get-Content -LiteralPath $sqlPath -Raw -Encoding UTF8 |
    docker exec -i $ContainerName psql -U $User -d $Database -v "project_id=$ProjectId"
