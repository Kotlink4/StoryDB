param(
    [string]$ApiBaseUrl = "http://localhost:50201/api",
    [string]$Email = "storydb-system-test@example.local",
    [string]$Password = "SystemTest-12345",
    [string]$DisplayName = "StoryDB System Tester"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Net.Http
Add-Type -AssemblyName System.Drawing

$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.UseCookies = $true
$handler.CookieContainer = [System.Net.CookieContainer]::new()
$client = [System.Net.Http.HttpClient]::new($handler)
$client.BaseAddress = [Uri]::new($ApiBaseUrl.TrimEnd("/") + "/")

function Convert-ToJsonBody($Body) {
    return [System.Net.Http.StringContent]::new(
        ($Body | ConvertTo-Json -Depth 40),
        [System.Text.Encoding]::UTF8,
        "application/json")
}

function Invoke-StoryDbJson {
    param(
        [ValidateSet("GET", "POST", "PUT", "DELETE")]
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [int[]]$ExpectedStatus = @(200, 201, 204)
    )

    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), $Path.TrimStart("/"))
    if ($null -ne $Body) {
        $request.Content = Convert-ToJsonBody $Body
    }

    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    if ($ExpectedStatus -notcontains [int]$response.StatusCode) {
        throw "HTTP $Method $Path failed with $([int]$response.StatusCode) $($response.StatusCode): $text"
    }

    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    return $text | ConvertFrom-Json
}

function Invoke-StoryDbUploadImage {
    param(
        [int]$ProjectId,
        [string]$FileName,
        [byte[]]$Bytes
    )

    $content = [System.Net.Http.MultipartFormDataContent]::new()
    $fileContent = [System.Net.Http.ByteArrayContent]::new($Bytes)
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("image/png")
    $content.Add($fileContent, "file", $FileName)

    $response = $client.PostAsync("uploads/images?projectId=$ProjectId", $content).GetAwaiter().GetResult()
    $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    if (-not $response.IsSuccessStatusCode) {
        throw "Image upload failed with $([int]$response.StatusCode) $($response.StatusCode): $text"
    }

    $result = $text | ConvertFrom-Json
    return $result.path
}

function New-TestPngBytes {
    $bitmap = [System.Drawing.Bitmap]::new(96, 96)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $stream = [System.IO.MemoryStream]::new()

    try {
        $graphics.Clear([System.Drawing.Color]::FromArgb(28, 42, 66))
        $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(191, 219, 254))
        try {
            $graphics.FillEllipse($brush, 22, 22, 52, 52)
        } finally {
            $brush.Dispose()
        }

        $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
        return $stream.ToArray()
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
        $stream.Dispose()
    }
}

function New-StoryObject {
    param(
        [int]$ProjectId,
        [string]$TypeKey,
        [string]$Name,
        [string]$Surname = $null,
        [string]$SurnameForm = $null,
        [string]$Description = $null,
        [string]$Age = $null,
        [string]$Role = $null,
        [string]$CurrentStatus = $null,
        [string]$ImagePath = $null,
        [object[]]$Attributes = @(),
        [object[]]$HierarchySelections = @(),
        [object[]]$CatalogSelections = @(),
        [int[]]$OwnedItemIds = @(),
        [int[]]$OwnerCharacterIds = @(),
        [int[]]$TerritoryPlaceIds = @(),
        [int[]]$OwnerOrganizationIds = @(),
        [int[]]$ParentObjectIds = @(),
        [object[]]$CharacterRelationships = @()
    )

    return Invoke-StoryDbJson POST "projects/$ProjectId/objects" @{
        typeKey = $TypeKey
        name = $Name
        surname = $Surname
        surnameForm = $SurnameForm
        description = $Description
        age = $Age
        role = $Role
        currentStatus = $CurrentStatus
        imagePath = $ImagePath
        attributes = $Attributes
        hierarchySelections = $HierarchySelections
        catalogSelections = $CatalogSelections
        ownedItemIds = $OwnedItemIds
        ownerCharacterIds = $OwnerCharacterIds
        territoryPlaceIds = $TerritoryPlaceIds
        ownerOrganizationIds = $OwnerOrganizationIds
        parentObjectIds = $ParentObjectIds
        characterRelationships = $CharacterRelationships
    }
}

try {
    Invoke-StoryDbJson POST "auth/register" @{
        email = $Email
        password = $Password
        displayName = $DisplayName
    } @(200, 201) | Out-Null
} catch {
    Invoke-StoryDbJson POST "auth/login" @{
        email = $Email
        password = $Password
    } @(200) | Out-Null
}

$stamp = Get-Date -Format "yyyy-MM-dd HH-mm"
$project = Invoke-StoryDbJson POST "projects" @{
    name = "StoryDB System Test - $stamp"
    coverImagePath = $null
    enabledObjectTypeKeys = @("characters", "items", "places", "organizations", "hierarchy")
    presetKeys = @()
}
$projectId = [int]$project.id

$png = New-TestPngBytes
$coverPath = Invoke-StoryDbUploadImage $projectId "system-test-cover.png" $png
$project = Invoke-StoryDbJson PUT "projects/$projectId" @{
    name = $project.name
    coverImagePath = $coverPath
    enabledObjectTypeKeys = @("characters", "items", "places", "organizations", "hierarchy")
    presetKeys = @()
}

$attributeGroup = Invoke-StoryDbJson POST "projects/$projectId/attribute-definitions/groups" @{
    typeKey = "characters"
    name = "Боевые параметры"
    iconKey = "sword"
}
$powerAttribute = Invoke-StoryDbJson POST "projects/$projectId/attribute-definitions" @{
    typeKey = "characters"
    name = "Сила"
    dataType = "number"
    groupName = $attributeGroup.name
    minValue = 0
    maxValue = 999
    unit = "pts"
    iconKey = "sword"
    options = @()
}
$rankAttribute = Invoke-StoryDbJson POST "projects/$projectId/attribute-definitions" @{
    typeKey = "characters"
    name = "Боевой ранг"
    dataType = "select"
    groupName = $attributeGroup.name
    minValue = $null
    maxValue = $null
    unit = $null
    iconKey = "badge"
    options = @("Новичок", "Ветеран", "Легенда")
}

$hierarchyGroup = Invoke-StoryDbJson POST "projects/$projectId/hierarchies/groups" @{ name = "Дворянская иерархия" }
$dukeNode = Invoke-StoryDbJson POST "projects/$projectId/hierarchies/groups/$($hierarchyGroup.id)/nodes" @{
    name = "Герцог"
    description = "Высшая региональная знать"
    parentNodeIds = @()
}
$countNode = Invoke-StoryDbJson POST "projects/$projectId/hierarchies/groups/$($hierarchyGroup.id)/nodes" @{
    name = "Граф"
    description = "Средний дворянский титул"
    parentNodeIds = @([int]$dukeNode.id)
}

$classCatalog = Invoke-StoryDbJson POST "projects/$projectId/catalogs" @{
    name = "Классификации"
    description = "Проверяет каталоги, группы, записи и поля"
    supportsHierarchy = $true
    hierarchyMode = "groups"
}
$fieldGroup = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($classCatalog.id)/field-groups" @{ name = "Параметры записи" }
$dangerField = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($classCatalog.id)/fields" @{
    name = "Уровень опасности"
    dataType = "number"
    isRequired = $true
    fieldGroupId = [int]$fieldGroup.id
    minValue = 0
    maxValue = 10
    options = $null
    referenceCatalogId = $null
}
$rarityGroup = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($classCatalog.id)/entry-groups" @{
    name = "Редкости"
    parentGroupIds = @()
}
$legendaryEntry = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($classCatalog.id)/entries" @{
    name = "Легендарный"
    description = "Редкость для предметов и событий"
    imagePath = $null
    entryGroupId = [int]$rarityGroup.id
    parentEntryIds = @()
    fieldValues = @(@{
        fieldDefinitionId = [int]$dangerField.id
        value = "9"
        referencedEntryIds = @()
    })
}

$capital = New-StoryObject $projectId "places" "Северная столица" -Description "Место для проверки территорий." -CurrentStatus "Под контролем дома" -ImagePath $coverPath
$house = New-StoryObject $projectId "organizations" "Дом Ал Кроувел" -SurnameForm "Ал Кроувел" -Description "Организация для проверки фамилий, структуры и членства." -Role "Дворянский дом" -CurrentStatus "Активен" -ImagePath $coverPath -TerritoryPlaceIds @([int]$capital.id)
$relic = New-StoryObject $projectId "items" "Клинок шести бастионов" -Description "Предмет для проверки владения и каталогов." -CurrentStatus "У Лилии" -ImagePath $coverPath -CatalogSelections @(@{
    targetType = "entry"
    catalogId = [int]$classCatalog.id
    catalogEntryGroupId = $null
    catalogEntryId = [int]$legendaryEntry.id
})
$lilia = New-StoryObject $projectId "characters" "Лилия" -Surname "Ал Кроувел" -Description "Главная героиня тестового проекта." -Age "17" -Role "Наследница" -CurrentStatus "В базовом состоянии" -ImagePath $coverPath -OwnedItemIds @([int]$relic.id) -HierarchySelections @(@{
    groupId = [int]$hierarchyGroup.id
    nodeIds = @([int]$countNode.id)
}) -CatalogSelections @(@{
    targetType = "entry"
    catalogId = [int]$classCatalog.id
    catalogEntryGroupId = $null
    catalogEntryId = [int]$legendaryEntry.id
}) -Attributes @(
    @{ name = $powerAttribute.name; value = "777" },
    @{ name = $rankAttribute.name; value = "Легенда" }
)
$ares = New-StoryObject $projectId "characters" "Арес" -Description "Второй персонаж для проверки связей." -Age "19" -Role "Союзник" -CurrentStatus "В пути" -ImagePath $coverPath

$lilia = Invoke-StoryDbJson PUT "projects/$projectId/objects/$($lilia.id)" @{
    name = $lilia.name
    surname = $lilia.surname
    surnameForm = $lilia.surnameForm
    description = $lilia.description
    age = $lilia.age
    role = $lilia.role
    currentStatus = $lilia.currentStatus
    imagePath = $lilia.imagePath
    attributes = @(
        @{ name = $powerAttribute.name; value = "777" },
        @{ name = $rankAttribute.name; value = "Легенда" }
    )
    hierarchySelections = @(@{ groupId = [int]$hierarchyGroup.id; nodeIds = @([int]$countNode.id) })
    catalogSelections = @(@{ targetType = "entry"; catalogId = [int]$classCatalog.id; catalogEntryGroupId = $null; catalogEntryId = [int]$legendaryEntry.id })
    ownedItemIds = @([int]$relic.id)
    ownerCharacterIds = @()
    territoryPlaceIds = @()
    ownerOrganizationIds = @()
    parentObjectIds = @()
    characterRelationships = @(@{
        id = $null
        sourceCharacterId = [int]$lilia.id
        targetCharacterId = [int]$ares.id
        relationType = "союз"
        strength = 80
        tension = 10
        isBidirectional = $true
        description = "Тестовая связь персонажей"
    })
}

Invoke-StoryDbJson POST "projects/$projectId/objects/$($lilia.id)/gallery" @{
    imagePath = $coverPath
    caption = "Проверка галереи объекта"
} | Out-Null

$structure = Invoke-StoryDbJson POST "projects/$projectId/structures" @{
    name = "Иерархия дома"
    description = "Структура организации для проверки системных структур"
    ownerKind = "object"
    ownerId = [int]$house.id
    layoutKind = "levels"
    nodeBindingMode = "none"
    linkedCatalogId = $null
    nodes = @(
        @{
            clientId = "head"
            parentClientId = $null
            linkedCatalogEntryId = $null
            linkedCatalogEntryGroupId = $null
            name = "Глава дома"
            description = "Высшая позиция"
            nodeType = "rank"
            color = "#93c5fd"
            iconKey = "crown"
            levelIndex = 0
            sortOrder = 0
        },
        @{
            clientId = "heir"
            parentClientId = "head"
            linkedCatalogEntryId = $null
            linkedCatalogEntryGroupId = $null
            name = "Наследник"
            description = "Позиция наследования"
            nodeType = "rank"
            color = "#c4b5fd"
            iconKey = "sparkles"
            levelIndex = 1
            sortOrder = 10
        }
    )
    edges = @(@{
        sourceClientId = "head"
        targetClientId = "heir"
        relationType = "подчинение"
        description = "Вертикальная связь"
        sortOrder = 0
    })
}
$usage = Invoke-StoryDbJson POST "projects/$projectId/structures/$($structure.id)/usages" @{
    targetKind = "object"
    targetId = [int]$house.id
    displayName = "Структура дома Ал Кроувел"
    notes = "Назначена автоматически seed-скриптом"
    isPrimary = $true
}
$heirNode = @($structure.nodes | Where-Object { $_.name -eq "Наследник" })[0]
$assignment = Invoke-StoryDbJson POST "projects/$projectId/structures/usages/$($usage.id)/assignments" @{
    structureNodeId = [int]$heirNode.id
    storyObjectId = [int]$lilia.id
    roleLabel = "Наследница"
    notes = "Проверка структурной принадлежности"
    sortOrder = 0
}

$event1 = Invoke-StoryDbJson POST "projects/$projectId/timeline/events" @{
    title = "Основание дома"
    eventType = "point"
    parentEventId = $null
    description = "Проверяет точечное событие."
    startLabel = "0"
    endLabel = $null
    startValue = 0
    endValue = $null
    category = "history"
    color = "#2563eb"
    imagePath = $coverPath
    participants = @(@{ targetType = "storyObject"; targetId = [int]$house.id; role = "организация" })
    changes = @()
}
$event2 = Invoke-StoryDbJson POST "projects/$projectId/timeline/events" @{
    title = "Испытание наследницы"
    eventType = "duration"
    parentEventId = $null
    description = "Проверяет длительное событие и временные изменения."
    startLabel = "100"
    endLabel = "150"
    startValue = 100
    endValue = 150
    category = "arc"
    color = "#16a34a"
    imagePath = $coverPath
    participants = @(
        @{ targetType = "storyObject"; targetId = [int]$lilia.id; role = "героиня" },
        @{ targetType = "storyObject"; targetId = [int]$ares.id; role = "союзник" }
    )
    changes = @(@{
        changeType = "field"
        targetType = "storyObject"
        targetId = [int]$lilia.id
        fieldKey = "currentStatus"
        fieldName = "currentStatus"
        oldValueJson = '"В базовом состоянии"'
        newValueJson = '"На испытании"'
        effectiveFromLabel = "100"
        effectiveToLabel = "150"
        effectiveFromValue = 100
        effectiveToValue = 150
        notes = "Проверка временного статуса"
    })
}
Invoke-StoryDbJson POST "projects/$projectId/timeline/links" @{
    sourceEventId = [int]$event1.id
    targetEventId = [int]$event2.id
    linkType = "causes"
    description = "Основание ведет к испытанию"
} @(200, 201) | Out-Null
Invoke-StoryDbJson POST "projects/$projectId/timeline/events/$($event2.id)/gallery" @{
    imagePath = $coverPath
    caption = "Проверка галереи события"
} | Out-Null

$objects = Invoke-StoryDbJson GET "projects/$projectId/objects?typeKey=characters"
$graph = Invoke-StoryDbJson GET "projects/$projectId/relations/graph"
$timeline = Invoke-StoryDbJson GET "projects/$projectId/timeline/events"
$assignments = Invoke-StoryDbJson GET "projects/$projectId/structures/assignments"

[pscustomobject]@{
    projectId = $projectId
    projectName = $project.name
    coverImagePath = $coverPath
    characterCount = @($objects).Count
    graphNodes = @($graph.nodes).Count
    graphEdges = @($graph.edges).Count
    timelineEvents = @($timeline).Count
    structureAssignments = @($assignments).Count
    openUrl = "http://localhost:50201/style-preview/projects/$projectId/database/characters"
} | ConvertTo-Json -Depth 8

