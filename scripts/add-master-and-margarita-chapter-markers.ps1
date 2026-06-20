param(
    [int]$ProjectId = 70
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding

$scriptPath = Join-Path $PSScriptRoot "add-master-and-margarita-chapter-markers.sql"
if (-not (Test-Path $scriptPath)) {
    throw "SQL script was not found: $scriptPath"
}

$sql = Get-Content $scriptPath -Raw -Encoding UTF8
$setProject = "set client_encoding to 'UTF8'; select set_config('storydb.project_id', '$ProjectId', false);"

($setProject + [Environment]::NewLine + $sql) | docker exec -i storydb-postgres psql -U postgres -d storydb
