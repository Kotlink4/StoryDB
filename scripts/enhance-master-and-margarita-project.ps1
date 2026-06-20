param(
    [int]$ProjectId = 70,
    [switch]$SkipCommonsImages
)

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot

$objectCountSql = "select count(*) from ""Objects"" where ""ProjectId"" = $ProjectId;"
$objectCountText = ($objectCountSql | docker exec -i storydb-postgres psql -U postgres -d storydb -t -A).Trim()
$objectCount = [int]$objectCountText

if ($objectCount -lt 80) {
    & (Join-Path $scriptRoot "extend-master-and-margarita-objects.ps1") -ProjectId $ProjectId
}

$relationshipCountSql = "select count(*) from ""CharacterRelationships"" r join ""Objects"" o on o.""Id"" = r.""SourceCharacterId"" where o.""ProjectId"" = $ProjectId;"
$relationshipCountText = ($relationshipCountSql | docker exec -i storydb-postgres psql -U postgres -d storydb -t -A).Trim()
$relationshipCount = [int]$relationshipCountText

if ($relationshipCount -lt 40) {
    & (Join-Path $scriptRoot "extend-master-and-margarita-character-relations.ps1") -ProjectId $ProjectId
}

& (Join-Path $scriptRoot "add-master-and-margarita-object-relations.ps1") -ProjectId $ProjectId
& (Join-Path $scriptRoot "add-master-and-margarita-timeline-events.ps1") -ProjectId $ProjectId
& (Join-Path $scriptRoot "add-master-and-margarita-chapter-markers.ps1") -ProjectId $ProjectId

if (-not $SkipCommonsImages) {
    & (Join-Path $scriptRoot "add-master-and-margarita-commons-images.ps1") -ProjectId $ProjectId
}

$sql = @"
update "Projects"
set "Visibility" = 'publicEdit',
    "UpdatedAt" = now() at time zone 'utc'
where "Id" = $ProjectId;

select
    p."Id",
    p."Name",
    p."Visibility",
    (select count(*) from "Objects" where "ProjectId" = p."Id") as objects,
    (select count(*) from "CharacterRelationships" r join "Objects" o on o."Id" = r."SourceCharacterId" where o."ProjectId" = p."Id") as character_relations,
    (select count(*) from "ObjectRelations" r join "Objects" o on o."Id" = r."SourceObjectId" where o."ProjectId" = p."Id") as object_relations,
    (select count(*) from "TimelineEvents" where "ProjectId" = p."Id") as timeline_events,
    (select count(*) from "TimelineEventLinks" l join "TimelineEvents" e on e."Id" = l."SourceEventId" where e."ProjectId" = p."Id") as timeline_links
from "Projects" p
where p."Id" = $ProjectId;
"@

$sql | docker exec -i storydb-postgres psql -U postgres -d storydb
