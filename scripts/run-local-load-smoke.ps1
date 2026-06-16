param(
    [string]$BaseUrl = "http://localhost:50201",
    [int]$Objects = 30,
    [int]$Events = 40,
    [int]$Structures = 1,
    [int]$ReadPasses = 2,
    [int]$Total = 200,
    [int]$Concurrency = 20,
    [int]$MaxP95Ms = 1500,
    [int]$MaxCacheCapacityEvictions = 25,
    [switch]$KeepProject
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$smokeScript = Join-Path $repoRoot "tests/load/smoke-load.mjs"

if (-not (Test-Path $smokeScript)) {
    throw "Smoke script was not found: $smokeScript"
}

$previousValues = @{}
$keys = @(
    "STORYDB_BASE_URL",
    "STORYDB_SMOKE_CREATE_PROJECT",
    "STORYDB_SMOKE_CLEANUP_PROJECT",
    "STORYDB_SMOKE_SEED_OBJECTS",
    "STORYDB_SMOKE_SEED_EVENTS",
    "STORYDB_SMOKE_SEED_STRUCTURES",
    "STORYDB_SMOKE_READ_PASSES",
    "STORYDB_SMOKE_TOTAL",
    "STORYDB_SMOKE_CONCURRENCY",
    "STORYDB_SMOKE_MAX_FAILURE_RATE",
    "STORYDB_SMOKE_MAX_P95_MS",
    "STORYDB_SMOKE_MAX_AUDIT_DROPPED",
    "STORYDB_SMOKE_MAX_CACHE_CAPACITY_EVICTIONS",
    "STORYDB_SMOKE_MAX_EXPORT_FAILED_JOBS",
    "STORYDB_SMOKE_REQUIRE_DIAGNOSTICS"
)

foreach ($key in $keys) {
    $previousValues[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
}

try {
    $env:STORYDB_BASE_URL = $BaseUrl
    $env:STORYDB_SMOKE_CREATE_PROJECT = "1"
    $env:STORYDB_SMOKE_CLEANUP_PROJECT = if ($KeepProject) { "0" } else { "1" }
    $env:STORYDB_SMOKE_SEED_OBJECTS = [string]$Objects
    $env:STORYDB_SMOKE_SEED_EVENTS = [string]$Events
    $env:STORYDB_SMOKE_SEED_STRUCTURES = [string]$Structures
    $env:STORYDB_SMOKE_READ_PASSES = [string]$ReadPasses
    $env:STORYDB_SMOKE_TOTAL = [string]$Total
    $env:STORYDB_SMOKE_CONCURRENCY = [string]$Concurrency
    $env:STORYDB_SMOKE_MAX_FAILURE_RATE = "0"
    $env:STORYDB_SMOKE_MAX_P95_MS = [string]$MaxP95Ms
    $env:STORYDB_SMOKE_MAX_AUDIT_DROPPED = "0"
    $env:STORYDB_SMOKE_MAX_CACHE_CAPACITY_EVICTIONS = [string]$MaxCacheCapacityEvictions
    $env:STORYDB_SMOKE_MAX_EXPORT_FAILED_JOBS = "0"
    $env:STORYDB_SMOKE_REQUIRE_DIAGNOSTICS = "1"

    Write-Host "Running StoryDB smoke against $BaseUrl"
    node $smokeScript
    if ($LASTEXITCODE -ne 0) {
        throw "Smoke script failed with exit code $LASTEXITCODE"
    }
}
finally {
    foreach ($key in $keys) {
        if ($null -eq $previousValues[$key]) {
            [Environment]::SetEnvironmentVariable($key, $null, "Process")
        } else {
            [Environment]::SetEnvironmentVariable($key, $previousValues[$key], "Process")
        }
    }
}
