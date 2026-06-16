param(
    [string]$OutputDirectory = "tmp/storydb-image-export",
    [string]$ApiImage = "kotlink2/storydb-api:latest",
    [string]$ClientImage = "kotlink2/storydb-client:latest",
    [switch]$SkipSave
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$resolvedOutputDirectory = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) $OutputDirectory
New-Item -ItemType Directory -Force -Path $resolvedOutputDirectory | Out-Null

$images = @(
    @{ Name = "api"; Ref = $ApiImage; File = "storydb-api-latest.tar" },
    @{ Name = "client"; Ref = $ClientImage; File = "storydb-client-latest.tar" }
)

$manifest = [ordered]@{
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    images = @()
}

foreach ($image in $images) {
    $imageId = docker image inspect $image.Ref --format "{{.Id}}"
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($imageId)) {
        throw "Docker image was not found: $($image.Ref)"
    }

    $targetPath = Join-Path $resolvedOutputDirectory $image.File
    if (-not $SkipSave) {
        docker save $image.Ref -o $targetPath
        if ($LASTEXITCODE -ne 0) {
            throw "docker save failed for $($image.Ref)"
        }
    }

    $entry = [ordered]@{
        name = $image.Name
        image = $image.Ref
        id = $imageId.Trim()
        file = $image.File
    }

    if (Test-Path $targetPath) {
        $hash = Get-FileHash -Algorithm SHA256 -Path $targetPath
        $entry.sha256 = $hash.Hash.ToLowerInvariant()
        $entry.bytes = (Get-Item $targetPath).Length
    }

    $manifest.images += $entry
}

$manifestPath = Join-Path $resolvedOutputDirectory "storydb-images-manifest.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -Path $manifestPath

Write-Host "Image export manifest: $manifestPath"
Write-Host ""
Write-Host "Transfer commands:"
Write-Host "scp `"$($resolvedOutputDirectory)\storydb-api-latest.tar`" root@157.22.185.96:/root/storydb/"
Write-Host "scp `"$($resolvedOutputDirectory)\storydb-client-latest.tar`" root@157.22.185.96:/root/storydb/"
Write-Host "scp `"$($resolvedOutputDirectory)\storydb-images-manifest.json`" root@157.22.185.96:/root/storydb/"
if ($SkipSave) {
    Write-Host "SkipSave was used; tar files were not created."
}
