param(
    [int]$ProjectId = 70,
    [string]$ApiBaseUrl = "http://localhost:50201/api",
    [string]$Email = "storydb-demo@example.local",
    [string]$Password = "StoryDB-Demo-12345"
)

$ErrorActionPreference = "Stop"

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$base = $ApiBaseUrl.TrimEnd("/")

function Invoke-StoryDb {
    param(
        [ValidateSet("GET", "POST", "PUT")]
        [string]$Method,
        [string]$Path,
        [object]$Body = $null
    )

    $uri = "$base/$($Path.TrimStart('/'))"
    if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $uri -WebSession $session
    }

    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 60))
    return Invoke-RestMethod -Method $Method -Uri $uri -WebSession $session -ContentType "application/json; charset=utf-8" -Body $jsonBytes
}

function Convert-HierarchySelections {
    param([object]$Object)
    return @($Object.hierarchySelections | ForEach-Object {
        @{ groupId = [int]$_.groupId; nodeIds = @($_.nodes | ForEach-Object { [int]$_.id }) }
    })
}

function Convert-CatalogSelections {
    param([object]$Object)
    return @($Object.catalogSelections | ForEach-Object {
        @{
            targetType = $_.targetType
            catalogId = [int]$_.catalogId
            catalogEntryGroupId = if ($null -eq $_.catalogEntryGroupId) { $null } else { [int]$_.catalogEntryGroupId }
            catalogEntryId = if ($null -eq $_.catalogEntryId) { $null } else { [int]$_.catalogEntryId }
        }
    })
}

function Convert-Attributes {
    param([object]$Object)
    return @($Object.attributes | ForEach-Object {
        @{ name = $_.name; value = $_.value }
    })
}

function Update-CharacterRelationships {
    param(
        [object]$Object,
        [object[]]$Relationships
    )

    $payload = @{
        name = $Object.name
        surname = $Object.surname
        surnameForm = $Object.surnameForm
        description = $Object.description
        age = $Object.age
        role = $Object.role
        currentStatus = $Object.currentStatus
        imagePath = $Object.imagePath
        attributes = @(Convert-Attributes $Object)
        hierarchySelections = @(Convert-HierarchySelections $Object)
        catalogSelections = @(Convert-CatalogSelections $Object)
        ownedItemIds = @($Object.ownedItems | ForEach-Object { [int]$_.id })
        ownerCharacterIds = @($Object.owners | Where-Object { $_.typeKey -eq "characters" } | ForEach-Object { [int]$_.id })
        territoryPlaceIds = @($Object.ownedTerritories | ForEach-Object { [int]$_.id })
        ownerOrganizationIds = @($Object.ownerOrganizations | ForEach-Object { [int]$_.id })
        parentObjectIds = @($Object.hierarchyParents | ForEach-Object { [int]$_.id })
        characterRelationships = $Relationships
    }

    Invoke-StoryDb PUT "projects/$ProjectId/objects/$($Object.id)" $payload | Out-Null
}

function Update-ObjectLinks {
    param(
        [object]$Object,
        [int[]]$OwnedItemIds = @(),
        [int[]]$TerritoryPlaceIds = @(),
        [int[]]$OwnerOrganizationIds = @(),
        [int[]]$ParentObjectIds = @()
    )

    $payload = @{
        name = $Object.name
        surname = $Object.surname
        surnameForm = $Object.surnameForm
        description = $Object.description
        age = $Object.age
        role = $Object.role
        currentStatus = $Object.currentStatus
        imagePath = $Object.imagePath
        attributes = @(Convert-Attributes $Object)
        hierarchySelections = @(Convert-HierarchySelections $Object)
        catalogSelections = @(Convert-CatalogSelections $Object)
        ownedItemIds = $OwnedItemIds
        ownerCharacterIds = @($Object.owners | Where-Object { $_.typeKey -eq "characters" } | ForEach-Object { [int]$_.id })
        territoryPlaceIds = $TerritoryPlaceIds
        ownerOrganizationIds = $OwnerOrganizationIds
        parentObjectIds = $ParentObjectIds
        characterRelationships = @()
    }

    Invoke-StoryDb PUT "projects/$ProjectId/objects/$($Object.id)" $payload | Out-Null
}

function Save-RelationGraphLayout {
    $graph = Invoke-StoryDb GET "projects/$ProjectId/relations/graph"
    $nodes = @($graph.nodes)
    $count = [Math]::Max(1, $nodes.Count)
    $radius = [Math]::Max(420, [Math]::Ceiling($count * 34))
    $centerX = 900
    $centerY = 720
    $items = @()

    for ($index = 0; $index -lt $nodes.Count; $index++) {
        $angle = (2 * [Math]::PI * $index) / $count
        $items += @{
            storyObjectId = [int]$nodes[$index].id
            x = [decimal]($centerX + $radius * [Math]::Cos($angle))
            y = [decimal]($centerY + $radius * [Math]::Sin($angle))
            width = 180
            height = 92
            isPinned = $false
        }
    }

    Invoke-StoryDb PUT "projects/$ProjectId/relations/layout" @{
        graphKey = "relations:all"
        items = $items
    } | Out-Null

    return $graph
}

Invoke-StoryDb POST "auth/login" @{
    email = $Email
    password = $Password
} | Out-Null

$characters = @(Invoke-StoryDb GET "projects/$ProjectId/objects?typeKey=characters" | ForEach-Object { $_ })
$items = @(Invoke-StoryDb GET "projects/$ProjectId/objects?typeKey=items" | ForEach-Object { $_ })
$places = @(Invoke-StoryDb GET "projects/$ProjectId/objects?typeKey=places" | ForEach-Object { $_ })
$organizations = @(Invoke-StoryDb GET "projects/$ProjectId/objects?typeKey=organizations" | ForEach-Object { $_ })
$byFullName = @{}
foreach ($character in $characters) {
    $fullName = (($character.name, $character.surname | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join " ")
    $byFullName[$fullName] = $character
    $byFullName[$character.name] = $character
}
$byItem = @{}
foreach ($item in $items) { $byItem[$item.name] = $item }
$byPlace = @{}
foreach ($place in $places) { $byPlace[$place.name] = $place }
$byOrganization = @{}
foreach ($organization in $organizations) { $byOrganization[$organization.name] = $organization }

function Rel {
    param(
        [object]$Source,
        [object]$Target,
        [string]$Type,
        [int]$Strength,
        [int]$Tension,
        [bool]$Bidirectional,
        [string]$Description
    )

    return @{
        id = $null
        sourceCharacterId = [int]$Source.id
        targetCharacterId = [int]$Target.id
        relationType = $Type
        strength = $Strength
        tension = $Tension
        isBidirectional = $Bidirectional
        description = $Description
    }
}

$master = Invoke-StoryDb GET "projects/$ProjectId/objects/$($byFullName['Мастер'].id)"
$woland = Invoke-StoryDb GET "projects/$ProjectId/objects/$($byFullName['Воланд'].id)"
$pilate = Invoke-StoryDb GET "projects/$ProjectId/objects/$($byFullName['Понтий Пилат'].id)"
$ivan = Invoke-StoryDb GET "projects/$ProjectId/objects/$($byFullName['Иван Бездомный'].id)"

Update-CharacterRelationships $master @(
    (Rel $master $byFullName["Маргарита Николаевна"] "любовь" 100 12 $true "Главная личная связь романа: любовь становится путем к спасению и покою."),
    (Rel $master $byFullName["Понтий Пилат"] "авторская связь" 86 40 $false "Пилат является героем романа Мастера и отражает его тему страха.")
)

Update-CharacterRelationships $woland @(
    (Rel $woland $byFullName["Маргарита Николаевна"] "испытание" 82 46 $false "Воланд дает Маргарите возможность пройти испытание и вернуть Мастера."),
    (Rel $woland $byFullName["Михаил Берлиоз"] "предсказание" 78 88 $false "Встреча на Патриарших запускает московскую линию."),
    (Rel $woland $byFullName["Коровьев-Фагот"] "глава свиты" 90 10 $false "Коровьев действует как один из главных исполнителей Воланда."),
    (Rel $woland $byFullName["Бегемот"] "глава свиты" 90 8 $false "Бегемот превращает власть свиты в комический хаос."),
    (Rel $woland $byFullName["Азазелло"] "глава свиты" 92 6 $false "Азазелло исполняет жесткие поручения Воланда.")
)

Update-CharacterRelationships $pilate @(
    (Rel $pilate $byFullName["Иешуа Га-Ноцри"] "суд и вина" 98 95 $false "Пилат понимает Иешуа, но не решается спасти его."),
    (Rel $pilate $byFullName["Афраний"] "служебная власть" 75 22 $false "Афраний выполняет скрытые распоряжения прокуратора.")
)

Update-CharacterRelationships $ivan @(
    (Rel $ivan $byFullName["Мастер"] "ученичество" 72 18 $false "Встреча с Мастером меняет путь Ивана от погони к пониманию."),
    (Rel $ivan $byFullName["Михаил Берлиоз"] "коллеги" 62 30 $true "Иван начинает роман рядом с Берлиозом и становится свидетелем его гибели.")
)

$master = Invoke-StoryDb GET "projects/$ProjectId/objects/$($byFullName['Мастер'].id)"
Update-ObjectLinks $master -OwnedItemIds @([int]$byItem["Рукопись романа о Пилате"].id)
$master = Invoke-StoryDb GET "projects/$ProjectId/objects/$($byFullName['Мастер'].id)"
Update-CharacterRelationships $master @(
    (Rel $master $byFullName["Маргарита Николаевна"] "любовь" 100 12 $true "Главная личная связь романа: любовь становится путем к спасению и покою."),
    (Rel $master $byFullName["Понтий Пилат"] "авторская связь" 86 40 $false "Пилат является героем романа Мастера и отражает его тему страха.")
)

$massolit = Invoke-StoryDb GET "projects/$ProjectId/objects/$($byOrganization['МАССОЛИТ'].id)"
Update-ObjectLinks $massolit -TerritoryPlaceIds @([int]$byPlace["Дом Грибоедова"].id)

$variete = Invoke-StoryDb GET "projects/$ProjectId/objects/$($byOrganization['Театр Варьете'].id)"
Update-ObjectLinks $variete -TerritoryPlaceIds @([int]$byPlace["Театр Варьете"].id)

$retinue = Invoke-StoryDb GET "projects/$ProjectId/objects/$($byOrganization['Свита Воланда'].id)"
Update-ObjectLinks $retinue -TerritoryPlaceIds @([int]$byPlace["Квартира N 50"].id)

$yershalaimAuthority = Invoke-StoryDb GET "projects/$ProjectId/objects/$($byOrganization['Власть Ершалаима'].id)"
Update-ObjectLinks $yershalaimAuthority -TerritoryPlaceIds @([int]$byPlace["Дворец Ирода Великого"].id)

$graph = Save-RelationGraphLayout

[pscustomobject]@{
    projectId = $ProjectId
    graphNodes = @($graph.nodes).Count
    graphEdges = @($graph.edges).Count
} | ConvertTo-Json


