param(
    [string]$Server = "root@157.22.185.96",
    [string]$RemoteDir = "/root/storydb",
    [string]$PublicBaseUrl = "http://157.22.185.96:50201",
    [string]$Email = "storydb-demo@example.local",
    [string]$Password = "StoryDB-Demo-12345",
    [switch]$SeedDemoProject,
    [int]$ProjectId = 0,
    [switch]$SkipImageExport
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$exportDir = Join-Path $repoRoot "tmp/storydb-image-export"

function Invoke-Checked {
    param([string]$FilePath, [string[]]$Arguments)

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE"
    }
}

function Invoke-Remote {
    param([string]$Command)

    Invoke-Checked "ssh" @($Server, $Command)
}

function Copy-ToServer {
    param([string]$Source, [string]$Target)

    Invoke-Checked "scp" @($Source, "${Server}:$Target")
}

function Invoke-RemoteSqlFile {
    param(
        [string]$SqlPath,
        [int]$TargetProjectId,
        [switch]$UseProjectSetting
    )

    $sql = Get-Content -LiteralPath $SqlPath -Raw -Encoding UTF8
    if ($UseProjectSetting) {
        $sql = "set client_encoding to 'UTF8'; select set_config('storydb.project_id', '$TargetProjectId', false);" +
            [Environment]::NewLine +
            $sql
    }

    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        Set-Content -LiteralPath $tempFile -Value $sql -Encoding UTF8
        Get-Content -LiteralPath $tempFile -Raw -Encoding UTF8 |
            ssh $Server "docker exec -i storydb-postgres psql -U postgres -d storydb -v project_id=$TargetProjectId"
        if ($LASTEXITCODE -ne 0) {
            throw "Remote SQL failed: $SqlPath"
        }
    } finally {
        Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
    }
}

if (-not $SkipImageExport) {
    docker tag storydb-api:latest kotlink2/storydb-api:latest
    docker tag storydb-client:latest kotlink2/storydb-client:latest
    & (Join-Path $PSScriptRoot "export-storydb-images.ps1")
}

Invoke-Remote "mkdir -p $RemoteDir/scripts"
Copy-ToServer (Join-Path $exportDir "storydb-api-latest.tar") "$RemoteDir/"
Copy-ToServer (Join-Path $exportDir "storydb-client-latest.tar") "$RemoteDir/"
Copy-ToServer (Join-Path $exportDir "storydb-images-manifest.json") "$RemoteDir/"
Copy-ToServer (Join-Path $repoRoot "docker-compose.prod.yml") "$RemoteDir/docker-compose.prod.yml"
Copy-ToServer (Join-Path $repoRoot ".env") "$RemoteDir/.env"
Copy-ToServer (Join-Path $repoRoot "scripts/run-production-smoke.sh") "$RemoteDir/scripts/run-production-smoke.sh"

Invoke-Remote "cd $RemoteDir && docker load -i storydb-api-latest.tar && docker load -i storydb-client-latest.tar && docker compose -f docker-compose.prod.yml up -d --no-deps api client"

if ($SeedDemoProject) {
    $seedOutput = & (Join-Path $PSScriptRoot "seed-master-and-margarita-project.ps1") `
        -ApiBaseUrl "$($PublicBaseUrl.TrimEnd('/'))/api" `
        -Email $Email `
        -Password $Password
    $seedJson = $seedOutput | Select-Object -Last 1 | ConvertFrom-Json
    $ProjectId = [int]$seedJson.projectId
}

if ($ProjectId -gt 0) {
    & (Join-Path $PSScriptRoot "extend-master-and-margarita-objects.ps1") -ProjectId $ProjectId -ApiBaseUrl "$($PublicBaseUrl.TrimEnd('/'))/api" -Email $Email -Password $Password
    & (Join-Path $PSScriptRoot "extend-master-and-margarita-character-relations.ps1") -ProjectId $ProjectId -ApiBaseUrl "$($PublicBaseUrl.TrimEnd('/'))/api" -Email $Email -Password $Password

    Invoke-RemoteSqlFile (Join-Path $PSScriptRoot "add-master-and-margarita-object-relations.sql") $ProjectId
    Invoke-RemoteSqlFile (Join-Path $PSScriptRoot "add-master-and-margarita-timeline-events.sql") $ProjectId -UseProjectSetting
    Invoke-RemoteSqlFile (Join-Path $PSScriptRoot "add-master-and-margarita-chapter-markers.sql") $ProjectId -UseProjectSetting

    $visibilitySql = "update ""Projects"" set ""Visibility"" = 'publicEdit', ""UpdatedAt"" = now() at time zone 'utc' where ""Id"" = $ProjectId;"
    $visibilitySql | ssh $Server "docker exec -i storydb-postgres psql -U postgres -d storydb"
}

Invoke-Remote "cd $RemoteDir && bash scripts/run-production-smoke.sh || (docker compose -f docker-compose.prod.yml ps && docker logs storydb-api --tail=120 && exit 1)"

[pscustomobject]@{
    server = $Server
    publicBaseUrl = $PublicBaseUrl
    projectId = if ($ProjectId -gt 0) { $ProjectId } else { $null }
    projectUrl = if ($ProjectId -gt 0) { "$($PublicBaseUrl.TrimEnd('/'))/style-preview/projects/$ProjectId/database/characters" } else { $null }
} | ConvertTo-Json -Depth 4
