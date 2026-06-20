param(
    [string]$ApiBaseUrl = "http://localhost:50201/api",
    [string]$Email = "storydb-demo@example.local",
    [string]$Password = "StoryDB-Demo-12345",
    [string]$DisplayName = "StoryDB Demo Curator",
    [string]$ProjectName = "Мастер и Маргарита - демо StoryDB"
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
        ($Body | ConvertTo-Json -Depth 60),
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

function New-DemoPngBytes {
    param(
        [string]$Title,
        [string]$Subtitle,
        [string]$BackColor,
        [string]$AccentColor
    )

    $bitmap = [System.Drawing.Bitmap]::new(960, 540)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $stream = [System.IO.MemoryStream]::new()
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    try {
        $background = [System.Drawing.ColorTranslator]::FromHtml($BackColor)
        $accent = [System.Drawing.ColorTranslator]::FromHtml($AccentColor)
        $graphics.Clear($background)

        $accentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(225, $accent))
        $softBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(42, $accent))
        $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(246, 248, 252))
        $mutedBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(205, 213, 225))
        $titleFont = [System.Drawing.Font]::new("Segoe UI", 48, [System.Drawing.FontStyle]::Bold)
        $subtitleFont = [System.Drawing.Font]::new("Segoe UI", 22, [System.Drawing.FontStyle]::Regular)
        $labelFont = [System.Drawing.Font]::new("Segoe UI", 86, [System.Drawing.FontStyle]::Bold)

        try {
            $graphics.FillEllipse($softBrush, 610, -130, 440, 440)
            $graphics.FillEllipse($softBrush, -140, 290, 360, 360)
            $graphics.FillRectangle($accentBrush, 72, 90, 10, 350)
            $graphics.DrawString($Title, $titleFont, $textBrush, [System.Drawing.RectangleF]::new(108, 110, 740, 150))
            $graphics.DrawString($Subtitle, $subtitleFont, $mutedBrush, [System.Drawing.RectangleF]::new(112, 278, 700, 90))
            $graphics.DrawString("StoryDB", $subtitleFont, $mutedBrush, 112, 408)

            $letters = ($Title -split "\s+" | Where-Object { $_.Length -gt 0 } | Select-Object -First 2 | ForEach-Object { $_.Substring(0, 1).ToUpperInvariant() }) -join ""
            $graphics.DrawString($letters, $labelFont, $textBrush, 650, 330)

            $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
            return $stream.ToArray()
        } finally {
            $accentBrush.Dispose()
            $softBrush.Dispose()
            $textBrush.Dispose()
            $mutedBrush.Dispose()
            $titleFont.Dispose()
            $subtitleFont.Dispose()
            $labelFont.Dispose()
        }
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
        $stream.Dispose()
    }
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

    return ($text | ConvertFrom-Json).path
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

function Set-StoryObjectRelationships {
    param(
        [int]$ProjectId,
        [object]$Object,
        [object[]]$Relationships
    )

    $attributes = @($Object.attributes | ForEach-Object { @{ name = $_.name; value = $_.value } })
    $hierarchySelections = @($Object.hierarchySelections | ForEach-Object {
        @{ groupId = [int]$_.groupId; nodeIds = @($_.nodes | ForEach-Object { [int]$_.id }) }
    })
    $catalogSelections = @($Object.catalogSelections | ForEach-Object {
        @{
            targetType = $_.targetType
            catalogId = [int]$_.catalogId
            catalogEntryGroupId = if ($null -eq $_.catalogEntryGroupId) { $null } else { [int]$_.catalogEntryGroupId }
            catalogEntryId = if ($null -eq $_.catalogEntryId) { $null } else { [int]$_.catalogEntryId }
        }
    })
    $ownedItemIds = @($Object.ownedItems | ForEach-Object { [int]$_.id })
    $ownerCharacterIds = @($Object.owners | Where-Object { $_.typeKey -eq "characters" } | ForEach-Object { [int]$_.id })
    $territoryPlaceIds = @($Object.ownedTerritories | ForEach-Object { [int]$_.id })
    $ownerOrganizationIds = @($Object.ownerOrganizations | ForEach-Object { [int]$_.id })
    $parentObjectIds = @($Object.hierarchyParents | ForEach-Object { [int]$_.id })

    return Invoke-StoryDbJson PUT "projects/$ProjectId/objects/$($Object.id)" @{
        name = $Object.name
        surname = $Object.surname
        surnameForm = $Object.surnameForm
        description = $Object.description
        age = $Object.age
        role = $Object.role
        currentStatus = $Object.currentStatus
        imagePath = $Object.imagePath
        attributes = $attributes
        hierarchySelections = $hierarchySelections
        catalogSelections = $catalogSelections
        ownedItemIds = $ownedItemIds
        ownerCharacterIds = $ownerCharacterIds
        territoryPlaceIds = $territoryPlaceIds
        ownerOrganizationIds = $ownerOrganizationIds
        parentObjectIds = $parentObjectIds
        characterRelationships = $Relationships
    }
}

function New-TimelineEvent {
    param(
        [int]$ProjectId,
        [string]$Title,
        [string]$EventType,
        [string]$Description,
        [string]$StartLabel,
        [string]$EndLabel = $null,
        [decimal]$StartValue,
        [Nullable[decimal]]$EndValue = $null,
        [string]$Category,
        [string]$Color,
        [string]$ImagePath,
        [object[]]$Participants = @(),
        [object[]]$Changes = @()
    )

    return Invoke-StoryDbJson POST "projects/$ProjectId/timeline/events" @{
        title = $Title
        eventType = $EventType
        parentEventId = $null
        description = $Description
        startLabel = $StartLabel
        endLabel = $EndLabel
        startValue = $StartValue
        endValue = $EndValue
        category = $Category
        color = $Color
        imagePath = $ImagePath
        participants = $Participants
        changes = $Changes
    }
}

function Save-RelationGraphLayout {
    param(
        [int]$ProjectId
    )

    $graph = Invoke-StoryDbJson GET "projects/$ProjectId/relations/graph"
    $nodes = @($graph.nodes)
    if ($nodes.Count -eq 0) {
        return $null
    }

    $count = [Math]::Max(1, $nodes.Count)
    $radius = [Math]::Max(420, [Math]::Ceiling($count * 34))
    $centerX = 700
    $centerY = 520
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

    return Invoke-StoryDbJson PUT "projects/$ProjectId/relations/layout" @{
        graphKey = "relations:all"
        items = $items
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

$project = Invoke-StoryDbJson POST "projects" @{
    name = $ProjectName
    coverImagePath = $null
    enabledObjectTypeKeys = @("characters", "items", "places", "organizations", "hierarchy")
    presetKeys = @()
    templatePackIds = @()
    visibility = "publicRead"
}
$projectId = [int]$project.id

$coverPath = Invoke-StoryDbUploadImage $projectId "master-and-margarita-cover.png" (New-DemoPngBytes "Мастер и Маргарита" "Демо-проект: персонажи, связи, локации, предметы и таймлайн" "#15151f" "#eab308")
$moscowPath = Invoke-StoryDbUploadImage $projectId "patriarch-ponds.png" (New-DemoPngBytes "Москва" "Патриаршие пруды, Варьете, квартира 50 и МАССОЛИТ" "#172033" "#38bdf8")
$yershalaimPath = Invoke-StoryDbUploadImage $projectId "yershalaim.png" (New-DemoPngBytes "Ершалаим" "Линия Пилата, Иешуа, Левия Матвея и Афрания" "#2b2118" "#f59e0b")
$wolandPath = Invoke-StoryDbUploadImage $projectId "woland-retinue.png" (New-DemoPngBytes "Свита Воланда" "Мистическая сила, которая вскрывает слабости Москвы" "#16151f" "#a78bfa")
$masterPath = Invoke-StoryDbUploadImage $projectId "master-basement.png" (New-DemoPngBytes "Подвал Мастера" "Рукопись, любовь и страх перед литературной средой" "#1d241f" "#34d399")
$ballPath = Invoke-StoryDbUploadImage $projectId "satan-ball.png" (New-DemoPngBytes "Бал" "Кульминация линии Маргариты и испытание выбора" "#250f1c" "#fb7185")

$project = Invoke-StoryDbJson PUT "projects/$projectId" @{
    name = $ProjectName
    coverImagePath = $coverPath
    enabledObjectTypeKeys = @("characters", "items", "places", "organizations", "hierarchy")
    presetKeys = @()
    templatePackIds = @()
    visibility = "publicRead"
}

Invoke-StoryDbJson PUT "projects/$projectId/timeline" @{
    name = "Хронология романа"
    mode = "chapters"
} | Out-Null

$characterGroup = Invoke-StoryDbJson POST "projects/$projectId/attribute-definitions/groups" @{
    typeKey = "characters"
    name = "Роль в романе"
    iconKey = "theater"
}
$lineAttribute = Invoke-StoryDbJson POST "projects/$projectId/attribute-definitions" @{
    typeKey = "characters"
    name = "Сюжетная линия"
    dataType = "select"
    groupName = $characterGroup.name
    minValue = $null
    maxValue = $null
    unit = $null
    iconKey = "route"
    options = @("Москва", "Ершалаим", "Мастер и Маргарита", "Свита Воланда")
}
$influenceAttribute = Invoke-StoryDbJson POST "projects/$projectId/attribute-definitions" @{
    typeKey = "characters"
    name = "Влияние"
    dataType = "number"
    groupName = $characterGroup.name
    minValue = 0
    maxValue = 100
    unit = "%"
    iconKey = "activity"
    options = @()
}
$statusAttribute = Invoke-StoryDbJson POST "projects/$projectId/attribute-definitions" @{
    typeKey = "characters"
    name = "Драматическое состояние"
    dataType = "select"
    groupName = $characterGroup.name
    minValue = $null
    maxValue = $null
    unit = $null
    iconKey = "sparkles"
    options = @("Испытывает выбор", "Обнажает чужую ложь", "Ищет истину", "Несет власть", "В конфликте")
}

$itemGroup = Invoke-StoryDbJson POST "projects/$projectId/attribute-definitions/groups" @{
    typeKey = "items"
    name = "Символика"
    iconKey = "gem"
}
$symbolAttribute = Invoke-StoryDbJson POST "projects/$projectId/attribute-definitions" @{
    typeKey = "items"
    name = "Смысл"
    dataType = "text"
    groupName = $itemGroup.name
    minValue = $null
    maxValue = $null
    unit = $null
    iconKey = "book-open"
    options = @()
}

$forceHierarchy = Invoke-StoryDbJson POST "projects/$projectId/hierarchies/groups" @{ name = "Силы романа" }
$earthNode = Invoke-StoryDbJson POST "projects/$projectId/hierarchies/groups/$($forceHierarchy.id)/nodes" @{
    name = "Земной московский мир"
    description = "Бытовые, литературные и административные связи Москвы."
    parentNodeIds = @()
}
$darkNode = Invoke-StoryDbJson POST "projects/$projectId/hierarchies/groups/$($forceHierarchy.id)/nodes" @{
    name = "Мистическая сила"
    description = "Воланд и его свита: внешняя сила испытания и разоблачения."
    parentNodeIds = @()
}
$pilateNode = Invoke-StoryDbJson POST "projects/$projectId/hierarchies/groups/$($forceHierarchy.id)/nodes" @{
    name = "Ершалаимская власть"
    description = "Суд, страх власти и вопрос истины."
    parentNodeIds = @()
}
$loveNode = Invoke-StoryDbJson POST "projects/$projectId/hierarchies/groups/$($forceHierarchy.id)/nodes" @{
    name = "Линия любви и творчества"
    description = "Мастер, Маргарита и рукопись как центр личного выбора."
    parentNodeIds = @()
}

$linesCatalog = Invoke-StoryDbJson POST "projects/$projectId/catalogs" @{
    name = "Сюжетные линии"
    description = "Навигация по крупным линиям романа: Москва, Ершалаим, Мастер и Маргарита, бал."
    supportsHierarchy = $true
    hierarchyMode = "groups"
}
$lineFieldGroup = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($linesCatalog.id)/field-groups" @{ name = "Описание линии" }
$toneField = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($linesCatalog.id)/fields" @{
    name = "Тональность"
    dataType = "select"
    isRequired = $false
    fieldGroupId = [int]$lineFieldGroup.id
    minValue = $null
    maxValue = $null
    options = @("сатирическая", "трагическая", "мистическая", "лирическая", "философская")
    referenceCatalogId = $null
}
$functionField = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($linesCatalog.id)/fields" @{
    name = "Функция"
    dataType = "longText"
    isRequired = $false
    fieldGroupId = [int]$lineFieldGroup.id
    minValue = $null
    maxValue = $null
    options = @()
    referenceCatalogId = $null
}
$mainLinesGroup = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($linesCatalog.id)/entry-groups" @{
    name = "Основные линии"
    parentGroupIds = @()
}
$moscowLine = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($linesCatalog.id)/entries" @{
    name = "Москва"
    description = "Сатирический слой романа: литературная среда, театр, коммунальный быт и административный абсурд."
    imagePath = $moscowPath
    entryGroupId = [int]$mainLinesGroup.id
    parentEntryIds = @()
    fieldValues = @(
        @{ fieldDefinitionId = [int]$toneField.id; value = "сатирическая"; referencedEntryIds = @() },
        @{ fieldDefinitionId = [int]$functionField.id; value = "Показывает, как мистическое вмешательство проявляет страх, корысть и самообман."; referencedEntryIds = @() }
    )
}
$yershalaimLine = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($linesCatalog.id)/entries" @{
    name = "Ершалаим"
    description = "Философская линия о Понтии Пилате, Иешуа и выборе между властью и истиной."
    imagePath = $yershalaimPath
    entryGroupId = [int]$mainLinesGroup.id
    parentEntryIds = @()
    fieldValues = @(
        @{ fieldDefinitionId = [int]$toneField.id; value = "философская"; referencedEntryIds = @() },
        @{ fieldDefinitionId = [int]$functionField.id; value = "Создает второй план романа и связывает тему трусости с судьбой автора."; referencedEntryIds = @() }
    )
}
$loveLine = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($linesCatalog.id)/entries" @{
    name = "Мастер и Маргарита"
    description = "Линия любви, творчества, страха перед системой и возвращения рукописи."
    imagePath = $masterPath
    entryGroupId = [int]$mainLinesGroup.id
    parentEntryIds = @()
    fieldValues = @(
        @{ fieldDefinitionId = [int]$toneField.id; value = "лирическая"; referencedEntryIds = @() },
        @{ fieldDefinitionId = [int]$functionField.id; value = "Дает роману эмоциональный центр и показывает цену спасения."; referencedEntryIds = @() }
    )
}
$ballLine = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($linesCatalog.id)/entries" @{
    name = "Бал у сатаны"
    description = "Кульминационный мистический эпизод, где Маргарита проходит испытание милосердием."
    imagePath = $ballPath
    entryGroupId = [int]$mainLinesGroup.id
    parentEntryIds = @([int]$loveLine.id)
    fieldValues = @(
        @{ fieldDefinitionId = [int]$toneField.id; value = "мистическая"; referencedEntryIds = @() },
        @{ fieldDefinitionId = [int]$functionField.id; value = "Сводит личный выбор Маргариты с властью Воланда и темой прощения."; referencedEntryIds = @() }
    )
}

$themesCatalog = Invoke-StoryDbJson POST "projects/$projectId/catalogs" @{
    name = "Темы и мотивы"
    description = "Смысловые узлы, которыми можно помечать персонажей, предметы и события."
    supportsHierarchy = $true
    hierarchyMode = "entries"
}
$themeGroup = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($themesCatalog.id)/entry-groups" @{
    name = "Мотивы"
    parentGroupIds = @()
}
$truthTheme = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($themesCatalog.id)/entries" @{
    name = "Истина и власть"
    description = "Конфликт правды, страха и административной силы."
    imagePath = $yershalaimPath
    entryGroupId = [int]$themeGroup.id
    parentEntryIds = @()
    fieldValues = @()
}
$artTheme = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($themesCatalog.id)/entries" @{
    name = "Творчество и страх"
    description = "Рукопись Мастера, критика, отказ от себя и возвращение голоса."
    imagePath = $masterPath
    entryGroupId = [int]$themeGroup.id
    parentEntryIds = @()
    fieldValues = @()
}
$mercyTheme = Invoke-StoryDbJson POST "projects/$projectId/catalogs/$($themesCatalog.id)/entries" @{
    name = "Милосердие"
    description = "Выбор Маргариты и финальная возможность покоя."
    imagePath = $ballPath
    entryGroupId = [int]$themeGroup.id
    parentEntryIds = @()
    fieldValues = @()
}

$csMoscow = @{ targetType = "entry"; catalogId = [int]$linesCatalog.id; catalogEntryGroupId = $null; catalogEntryId = [int]$moscowLine.id }
$csYershalaim = @{ targetType = "entry"; catalogId = [int]$linesCatalog.id; catalogEntryGroupId = $null; catalogEntryId = [int]$yershalaimLine.id }
$csLove = @{ targetType = "entry"; catalogId = [int]$linesCatalog.id; catalogEntryGroupId = $null; catalogEntryId = [int]$loveLine.id }
$csBall = @{ targetType = "entry"; catalogId = [int]$linesCatalog.id; catalogEntryGroupId = $null; catalogEntryId = [int]$ballLine.id }
$csTruth = @{ targetType = "entry"; catalogId = [int]$themesCatalog.id; catalogEntryGroupId = $null; catalogEntryId = [int]$truthTheme.id }
$csArt = @{ targetType = "entry"; catalogId = [int]$themesCatalog.id; catalogEntryGroupId = $null; catalogEntryId = [int]$artTheme.id }
$csMercy = @{ targetType = "entry"; catalogId = [int]$themesCatalog.id; catalogEntryGroupId = $null; catalogEntryId = [int]$mercyTheme.id }

$patriarchs = New-StoryObject $projectId "places" "Патриаршие пруды" -Description "Стартовая точка московской линии: разговор Берлиоза и Ивана с Воландом." -Role "Локация завязки" -CurrentStatus "Москва, первая глава" -ImagePath $moscowPath -CatalogSelections @($csMoscow)
$flat50 = New-StoryObject $projectId "places" "Квартира N 50" -Description "Нехорошая квартира, где концентрируются исчезновения, визиты и мистические события." -Role "Мистический узел" -CurrentStatus "Занята свитой Воланда" -ImagePath $wolandPath -CatalogSelections @($csMoscow)
$variete = New-StoryObject $projectId "places" "Театр Варьете" -Description "Сцена сеанса черной магии и публичного разоблачения жадности и тщеславия." -Role "Сатирическая площадка" -CurrentStatus "После скандального представления" -ImagePath $moscowPath -CatalogSelections @($csMoscow)
$griboedov = New-StoryObject $projectId "places" "Дом Грибоедова" -Description "Литературный ресторан и символ закрытого мира московских писателей." -Role "Среда МАССОЛИТа" -CurrentStatus "Сгорел в финале московской линии" -ImagePath $moscowPath -CatalogSelections @($csMoscow)
$basement = New-StoryObject $projectId "places" "Подвальчик Мастера" -Description "Пространство романа, любви и краткого счастья Мастера и Маргариты." -Role "Интимная локация" -CurrentStatus "Связан с рукописью" -ImagePath $masterPath -CatalogSelections @($csLove, $csArt)
$yershalaim = New-StoryObject $projectId "places" "Ершалаим" -Description "Пространство романа Мастера о Понтии Пилате и Иешуа." -Role "Историко-философская линия" -CurrentStatus "Жаркий день суда" -ImagePath $yershalaimPath -CatalogSelections @($csYershalaim, $csTruth)
$palace = New-StoryObject $projectId "places" "Дворец Ирода Великого" -Description "Место допроса Иешуа и внутреннего выбора Пилата." -Role "Центр власти" -CurrentStatus "Пилат принимает решение" -ImagePath $yershalaimPath -CatalogSelections @($csYershalaim, $csTruth)
$baldMountain = New-StoryObject $projectId "places" "Лысая гора" -Description "Место казни, в котором философская линия достигает трагической точки." -Role "Кульминация Ершалаима" -CurrentStatus "Место казни" -ImagePath $yershalaimPath -CatalogSelections @($csYershalaim)

$massolit = New-StoryObject $projectId "organizations" "МАССОЛИТ" -Description "Литературная организация, где статус, доступ и бытовые привилегии важнее искусства." -Role "Литературная среда" -CurrentStatus "Разоблачена сатирой" -ImagePath $moscowPath -TerritoryPlaceIds @([int]$griboedov.id) -CatalogSelections @($csMoscow, $csArt)
$varieteOrg = New-StoryObject $projectId "organizations" "Театр Варьете" -Description "Организация, через которую московская линия показывает зрелище и массовую доверчивость." -Role "Театральная институция" -CurrentStatus "Под следствием после сеанса" -ImagePath $moscowPath -TerritoryPlaceIds @([int]$variete.id) -CatalogSelections @($csMoscow)
$retinueOrg = New-StoryObject $projectId "organizations" "Свита Воланда" -Description "Группа мистических персонажей, запускающих испытания и разоблачения." -Role "Мистическая команда" -CurrentStatus "Действует в Москве" -ImagePath $wolandPath -TerritoryPlaceIds @([int]$flat50.id) -CatalogSelections @($csMoscow, $csBall)
$yerAuthority = New-StoryObject $projectId "organizations" "Власть Ершалаима" -Description "Административная и военная сила, внутри которой Пилат сталкивается с вопросом истины." -Role "Государственная власть" -CurrentStatus "Удерживает порядок страхом" -ImagePath $yershalaimPath -TerritoryPlaceIds @([int]$palace.id) -CatalogSelections @($csYershalaim, $csTruth)

$manuscript = New-StoryObject $projectId "items" "Рукопись романа о Пилате" -Description "Главный предмет линии Мастера: текст, который уничтожают, но который возвращается." -Role "Центральный артефакт" -CurrentStatus "Возвращена Воландом" -ImagePath $masterPath -Attributes @(@{ name = $symbolAttribute.name; value = "Творчество, память и невозможность уничтожить написанное." }) -CatalogSelections @($csLove, $csArt)
$azazelloCream = New-StoryObject $projectId "items" "Крем Азазелло" -Description "Предмет перехода Маргариты из бытовой реальности в мистическую." -Role "Магический предмет" -CurrentStatus "Использован перед балом" -ImagePath $ballPath -Attributes @(@{ name = $symbolAttribute.name; value = "Свобода, риск и вход в пространство выбора." }) -CatalogSelections @($csBall, $csMercy)
$tram = New-StoryObject $projectId "items" "Трамвай на Патриарших" -Description "Деталь предсказанной гибели Берлиоза, которая связывает разговор с немедленным событием." -Role "Знак предопределения" -CurrentStatus "Событие завязки" -ImagePath $moscowPath -Attributes @(@{ name = $symbolAttribute.name; value = "Предсказание, случайность и нарушение уверенности Берлиоза." }) -CatalogSelections @($csMoscow)
$magicPoster = New-StoryObject $projectId "items" "Афиша сеанса черной магии" -Description "Предмет театральной линии, ведущий к массовой сцене разоблачения." -Role "Анонс события" -CurrentStatus "Связана с Варьете" -ImagePath $moscowPath -Attributes @(@{ name = $symbolAttribute.name; value = "Зрелище, доверчивость и соблазн легкой выгоды." }) -CatalogSelections @($csMoscow)

$master = New-StoryObject $projectId "characters" "Мастер" -Description "Писатель, создавший роман о Пилате и отказавшийся от имени после травли." -Age "около 38" -Role "Автор романа о Пилате" -CurrentStatus "Получает покой" -ImagePath $masterPath -OwnedItemIds @([int]$manuscript.id) -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$loveNode.id) }) -CatalogSelections @($csLove, $csArt) -Attributes @(@{ name = $lineAttribute.name; value = "Мастер и Маргарита" }, @{ name = $influenceAttribute.name; value = "88" }, @{ name = $statusAttribute.name; value = "Ищет истину" })
$margarita = New-StoryObject $projectId "characters" "Маргарита" -Surname "Николаевна" -Description "Героиня, которая идет на сделку с мистической силой ради спасения Мастера." -Age "около 30" -Role "Возлюбленная Мастера" -CurrentStatus "Выбирает милосердие и покой" -ImagePath $ballPath -OwnedItemIds @([int]$azazelloCream.id) -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$loveNode.id) }) -CatalogSelections @($csLove, $csBall, $csMercy) -Attributes @(@{ name = $lineAttribute.name; value = "Мастер и Маргарита" }, @{ name = $influenceAttribute.name; value = "92" }, @{ name = $statusAttribute.name; value = "Испытывает выбор" })
$woland = New-StoryObject $projectId "characters" "Воланд" -Description "Иностранный профессор и мистический судья, чье появление меняет московскую реальность." -Role "Глава свиты" -CurrentStatus "Покидает Москву после завершения испытаний" -ImagePath $wolandPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$darkNode.id) }) -CatalogSelections @($csMoscow, $csBall) -Attributes @(@{ name = $lineAttribute.name; value = "Свита Воланда" }, @{ name = $influenceAttribute.name; value = "100" }, @{ name = $statusAttribute.name; value = "Несет власть" })
$koroviev = New-StoryObject $projectId "characters" "Коровьев-Фагот" -Description "Иронический участник свиты, мастер словесной путаницы и сценического абсурда." -Role "Помощник Воланда" -CurrentStatus "Снимает маску в финале" -ImagePath $wolandPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$darkNode.id) }) -CatalogSelections @($csMoscow) -Attributes @(@{ name = $lineAttribute.name; value = "Свита Воланда" }, @{ name = $influenceAttribute.name; value = "78" }, @{ name = $statusAttribute.name; value = "Обнажает чужую ложь" })
$behemoth = New-StoryObject $projectId "characters" "Бегемот" -Description "Шутовской участник свиты, соединяющий комизм, провокацию и разрушение бытового порядка." -Role "Шут свиты" -CurrentStatus "Снимает маску в финале" -ImagePath $wolandPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$darkNode.id) }) -CatalogSelections @($csMoscow) -Attributes @(@{ name = $lineAttribute.name; value = "Свита Воланда" }, @{ name = $influenceAttribute.name; value = "76" }, @{ name = $statusAttribute.name; value = "Обнажает чужую ложь" })
$azazello = New-StoryObject $projectId "characters" "Азазелло" -Description "Жесткий исполнитель поручений Воланда, связанный с переходом Маргариты к балу." -Role "Посланник Воланда" -CurrentStatus "Ведет Маргариту к испытанию" -ImagePath $wolandPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$darkNode.id) }) -CatalogSelections @($csBall) -Attributes @(@{ name = $lineAttribute.name; value = "Свита Воланда" }, @{ name = $influenceAttribute.name; value = "82" }, @{ name = $statusAttribute.name; value = "Несет власть" })
$hella = New-StoryObject $projectId "characters" "Гелла" -Description "Участница свиты Воланда, работающая в сценах квартиры и Варьете." -Role "Помощница Воланда" -CurrentStatus "В свите" -ImagePath $wolandPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$darkNode.id) }) -CatalogSelections @($csMoscow) -Attributes @(@{ name = $lineAttribute.name; value = "Свита Воланда" }, @{ name = $influenceAttribute.name; value = "62" }, @{ name = $statusAttribute.name; value = "Обнажает чужую ложь" })
$berlioz = New-StoryObject $projectId "characters" "Михаил" -Surname "Берлиоз" -Description "Председатель МАССОЛИТа, уверенный материалист, чья гибель запускает московскую цепь событий." -Role "Председатель МАССОЛИТа" -CurrentStatus "Погибает после встречи с Воландом" -ImagePath $moscowPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$earthNode.id) }) -CatalogSelections @($csMoscow) -Attributes @(@{ name = $lineAttribute.name; value = "Москва" }, @{ name = $influenceAttribute.name; value = "68" }, @{ name = $statusAttribute.name; value = "В конфликте" })
$ivan = New-StoryObject $projectId "characters" "Иван" -Surname "Бездомный" -Description "Поэт, который проходит путь от агрессивной уверенности к поиску понимания." -Role "Поэт МАССОЛИТа" -CurrentStatus "Становится свидетелем и хранителем памяти" -ImagePath $moscowPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$earthNode.id) }) -CatalogSelections @($csMoscow, $csTruth) -Attributes @(@{ name = $lineAttribute.name; value = "Москва" }, @{ name = $influenceAttribute.name; value = "74" }, @{ name = $statusAttribute.name; value = "Ищет истину" })
$stepa = New-StoryObject $projectId "characters" "Степан" -Surname "Лиходеев" -Description "Директор Варьете, исчезновение которого показывает власть свиты над московским бытом." -Role "Директор Варьете" -CurrentStatus "Перемещен из Москвы" -ImagePath $moscowPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$earthNode.id) }) -CatalogSelections @($csMoscow) -Attributes @(@{ name = $lineAttribute.name; value = "Москва" }, @{ name = $influenceAttribute.name; value = "45" }, @{ name = $statusAttribute.name; value = "В конфликте" })
$pilate = New-StoryObject $projectId "characters" "Понтий" -Surname "Пилат" -Description "Прокуратор Иудеи, который понимает невиновность Иешуа, но выбирает власть и страх." -Role "Прокуратор" -CurrentStatus "Ожидает освобождения от вины" -ImagePath $yershalaimPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$pilateNode.id) }) -CatalogSelections @($csYershalaim, $csTruth) -Attributes @(@{ name = $lineAttribute.name; value = "Ершалаим" }, @{ name = $influenceAttribute.name; value = "96" }, @{ name = $statusAttribute.name; value = "В конфликте" })
$yeshua = New-StoryObject $projectId "characters" "Иешуа" -Surname "Га-Ноцри" -Description "Странствующий философ, чья правда становится испытанием для власти Пилата." -Role "Философ и обвиняемый" -CurrentStatus "Казнен, но остается центром истины" -ImagePath $yershalaimPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$pilateNode.id) }) -CatalogSelections @($csYershalaim, $csTruth, $csMercy) -Attributes @(@{ name = $lineAttribute.name; value = "Ершалаим" }, @{ name = $influenceAttribute.name; value = "94" }, @{ name = $statusAttribute.name; value = "Ищет истину" })
$levi = New-StoryObject $projectId "characters" "Левий" -Surname "Матвей" -Description "Ученик Иешуа, фиксирующий его слова и несущий просьбу о судьбе Мастера." -Role "Ученик Иешуа" -CurrentStatus "Посланник высшей воли" -ImagePath $yershalaimPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$pilateNode.id) }) -CatalogSelections @($csYershalaim, $csTruth) -Attributes @(@{ name = $lineAttribute.name; value = "Ершалаим" }, @{ name = $influenceAttribute.name; value = "70" }, @{ name = $statusAttribute.name; value = "Ищет истину" })
$afranius = New-StoryObject $projectId "characters" "Афраний" -Description "Начальник тайной службы Пилата, связанный с политической стороной ершалаимской линии." -Role "Глава тайной службы" -CurrentStatus "Исполняет волю власти" -ImagePath $yershalaimPath -HierarchySelections @(@{ groupId = [int]$forceHierarchy.id; nodeIds = @([int]$pilateNode.id) }) -CatalogSelections @($csYershalaim) -Attributes @(@{ name = $lineAttribute.name; value = "Ершалаим" }, @{ name = $influenceAttribute.name; value = "66" }, @{ name = $statusAttribute.name; value = "Несет власть" })
$judas = New-StoryObject $projectId "characters" "Иуда" -Surname "из Кириафа" -Description "Фигура предательства в ершалаимской линии и объект тайного возмездия." -Role "Предатель" -CurrentStatus "Убит после казни Иешуа" -ImagePath $yershalaimPath -CatalogSelections @($csYershalaim, $csTruth) -Attributes @(@{ name = $lineAttribute.name; value = "Ершалаим" }, @{ name = $influenceAttribute.name; value = "52" }, @{ name = $statusAttribute.name; value = "В конфликте" })

$master = Set-StoryObjectRelationships $projectId $master @(
    @{ id = $null; sourceCharacterId = [int]$master.id; targetCharacterId = [int]$margarita.id; relationType = "любовь"; strength = 100; tension = 12; isBidirectional = $true; description = "Главная личная связь романа: любовь становится путем к спасению и покою." },
    @{ id = $null; sourceCharacterId = [int]$master.id; targetCharacterId = [int]$pilate.id; relationType = "авторская связь"; strength = 86; tension = 40; isBidirectional = $false; description = "Пилат является героем романа Мастера и отражает его тему страха." }
)
$woland = Set-StoryObjectRelationships $projectId $woland @(
    @{ id = $null; sourceCharacterId = [int]$woland.id; targetCharacterId = [int]$margarita.id; relationType = "испытание"; strength = 82; tension = 46; isBidirectional = $false; description = "Воланд дает Маргарите возможность пройти испытание и вернуть Мастера." },
    @{ id = $null; sourceCharacterId = [int]$woland.id; targetCharacterId = [int]$berlioz.id; relationType = "предсказание"; strength = 78; tension = 88; isBidirectional = $false; description = "Встреча на Патриарших запускает московскую линию." },
    @{ id = $null; sourceCharacterId = [int]$woland.id; targetCharacterId = [int]$koroviev.id; relationType = "глава свиты"; strength = 90; tension = 10; isBidirectional = $false; description = "Коровьев действует как один из главных исполнителей Воланда." },
    @{ id = $null; sourceCharacterId = [int]$woland.id; targetCharacterId = [int]$behemoth.id; relationType = "глава свиты"; strength = 90; tension = 8; isBidirectional = $false; description = "Бегемот превращает власть свиты в комический хаос." },
    @{ id = $null; sourceCharacterId = [int]$woland.id; targetCharacterId = [int]$azazello.id; relationType = "глава свиты"; strength = 92; tension = 6; isBidirectional = $false; description = "Азазелло исполняет жесткие поручения Воланда." }
)
$pilate = Set-StoryObjectRelationships $projectId $pilate @(
    @{ id = $null; sourceCharacterId = [int]$pilate.id; targetCharacterId = [int]$yeshua.id; relationType = "суд и вина"; strength = 98; tension = 95; isBidirectional = $false; description = "Пилат понимает Иешуа, но не решается спасти его." },
    @{ id = $null; sourceCharacterId = [int]$pilate.id; targetCharacterId = [int]$afranius.id; relationType = "служебная власть"; strength = 75; tension = 22; isBidirectional = $false; description = "Афраний выполняет скрытые распоряжения прокуратора." }
)
$ivan = Set-StoryObjectRelationships $projectId $ivan @(
    @{ id = $null; sourceCharacterId = [int]$ivan.id; targetCharacterId = [int]$master.id; relationType = "ученичество"; strength = 72; tension = 18; isBidirectional = $false; description = "Встреча с Мастером меняет путь Ивана от погони к пониманию." },
    @{ id = $null; sourceCharacterId = [int]$ivan.id; targetCharacterId = [int]$berlioz.id; relationType = "коллеги"; strength = 62; tension = 30; isBidirectional = $true; description = "Иван начинает роман рядом с Берлиозом и становится свидетелем его гибели." }
)

Invoke-StoryDbJson POST "projects/$projectId/objects/$($master.id)/gallery" @{ imagePath = $masterPath; caption = "Подвальчик, рукопись и линия творчества" } | Out-Null
Invoke-StoryDbJson POST "projects/$projectId/objects/$($margarita.id)/gallery" @{ imagePath = $ballPath; caption = "Бал как испытание милосердием" } | Out-Null
Invoke-StoryDbJson POST "projects/$projectId/objects/$($woland.id)/gallery" @{ imagePath = $wolandPath; caption = "Свита Воланда в Москве" } | Out-Null
Invoke-StoryDbJson POST "projects/$projectId/objects/$($pilate.id)/gallery" @{ imagePath = $yershalaimPath; caption = "Ершалаимская линия и выбор Пилата" } | Out-Null

$retinueStructure = Invoke-StoryDbJson POST "projects/$projectId/structures" @{
    name = "Структура свиты Воланда"
    description = "Демонстрирует организационную структуру с назначенными персонажами."
    ownerKind = "object"
    ownerId = [int]$retinueOrg.id
    layoutKind = "levels"
    nodeBindingMode = "none"
    linkedCatalogId = $null
    nodes = @(
        @{ clientId = "woland"; parentClientId = $null; linkedCatalogEntryId = $null; linkedCatalogEntryGroupId = $null; name = "Воланд"; description = "Центр власти свиты"; nodeType = "leader"; color = "#a78bfa"; iconKey = "crown"; levelIndex = 0; sortOrder = 0 },
        @{ clientId = "koroviev"; parentClientId = "woland"; linkedCatalogEntryId = $null; linkedCatalogEntryGroupId = $null; name = "Коровьев-Фагот"; description = "Словесная и сценическая провокация"; nodeType = "agent"; color = "#38bdf8"; iconKey = "theater"; levelIndex = 1; sortOrder = 10 },
        @{ clientId = "azazello"; parentClientId = "woland"; linkedCatalogEntryId = $null; linkedCatalogEntryGroupId = $null; name = "Азазелло"; description = "Силовой исполнитель"; nodeType = "agent"; color = "#fb7185"; iconKey = "flame"; levelIndex = 1; sortOrder = 20 },
        @{ clientId = "behemoth"; parentClientId = "woland"; linkedCatalogEntryId = $null; linkedCatalogEntryGroupId = $null; name = "Бегемот"; description = "Комический хаос"; nodeType = "agent"; color = "#fbbf24"; iconKey = "sparkles"; levelIndex = 1; sortOrder = 30 },
        @{ clientId = "hella"; parentClientId = "woland"; linkedCatalogEntryId = $null; linkedCatalogEntryGroupId = $null; name = "Гелла"; description = "Помощница в московских сценах"; nodeType = "agent"; color = "#f472b6"; iconKey = "moon"; levelIndex = 1; sortOrder = 40 }
    )
    edges = @(
        @{ sourceClientId = "woland"; targetClientId = "koroviev"; relationType = "поручение"; description = "Коровьев ведет сатирические сцены"; sortOrder = 0 },
        @{ sourceClientId = "woland"; targetClientId = "azazello"; relationType = "поручение"; description = "Азазелло взаимодействует с Маргаритой"; sortOrder = 10 },
        @{ sourceClientId = "woland"; targetClientId = "behemoth"; relationType = "поручение"; description = "Бегемот создает комический хаос"; sortOrder = 20 },
        @{ sourceClientId = "woland"; targetClientId = "hella"; relationType = "поручение"; description = "Гелла участвует в сценах квартиры"; sortOrder = 30 }
    )
}
$retinueUsage = Invoke-StoryDbJson POST "projects/$projectId/structures/$($retinueStructure.id)/usages" @{
    targetKind = "object"
    targetId = [int]$retinueOrg.id
    displayName = "Иерархия свиты Воланда"
    notes = "Демо-структура для защиты: показывает уровни, роли и назначения."
    isPrimary = $true
}
$nodeByName = @{}
$retinueStructure.nodes | ForEach-Object { $nodeByName[$_.name] = $_ }
@(
    @{ node = "Воланд"; objectId = [int]$woland.id; role = "Глава" },
    @{ node = "Коровьев-Фагот"; objectId = [int]$koroviev.id; role = "Помощник" },
    @{ node = "Азазелло"; objectId = [int]$azazello.id; role = "Исполнитель" },
    @{ node = "Бегемот"; objectId = [int]$behemoth.id; role = "Провокатор" },
    @{ node = "Гелла"; objectId = [int]$hella.id; role = "Помощница" }
) | ForEach-Object {
    Invoke-StoryDbJson POST "projects/$projectId/structures/usages/$($retinueUsage.id)/assignments" @{
        structureNodeId = [int]$nodeByName[$_.node].id
        storyObjectId = [int]$_.objectId
        roleLabel = $_.role
        notes = "Назначено демо-скриптом"
        sortOrder = 0
    } | Out-Null
}

$e1 = New-TimelineEvent $projectId "Разговор на Патриарших" "point" "Воланд встречает Берлиоза и Ивана. Скептическая уверенность Москвы сталкивается с мистическим знанием." "Гл. 1" $null 1 $null "moscow" "#38bdf8" $moscowPath @(
    @{ targetType = "storyObject"; targetId = [int]$patriarchs.id; role = "место" },
    @{ targetType = "storyObject"; targetId = [int]$woland.id; role = "предсказывает" },
    @{ targetType = "storyObject"; targetId = [int]$berlioz.id; role = "спорит" },
    @{ targetType = "storyObject"; targetId = [int]$ivan.id; role = "свидетель" }
)
$e2 = New-TimelineEvent $projectId "Гибель Берлиоза" "point" "Предсказание Воланда немедленно сбывается, а Иван начинает погоню." "Гл. 3" $null 3 $null "moscow" "#ef4444" $moscowPath @(
    @{ targetType = "storyObject"; targetId = [int]$berlioz.id; role = "жертва" },
    @{ targetType = "storyObject"; targetId = [int]$tram.id; role = "предмет события" },
    @{ targetType = "storyObject"; targetId = [int]$ivan.id; role = "свидетель" }
)
$e3 = New-TimelineEvent $projectId "Допрос Иешуа у Пилата" "duration" "Пилат видит невиновность Иешуа, но остается внутри логики власти." "Гл. 2" "Ершалаим" 2 2.5 "yershalaim" "#f59e0b" $yershalaimPath @(
    @{ targetType = "storyObject"; targetId = [int]$pilate.id; role = "судит" },
    @{ targetType = "storyObject"; targetId = [int]$yeshua.id; role = "обвиняемый" },
    @{ targetType = "storyObject"; targetId = [int]$palace.id; role = "место" }
) @(
    @{ changeType = "field"; targetType = "storyObject"; targetId = [int]$pilate.id; fieldKey = "currentStatus"; fieldName = "currentStatus"; oldValueJson = '"Удерживает власть"'; newValueJson = '"Понимает истину, но выбирает страх"'; effectiveFromLabel = "Гл. 2"; effectiveToLabel = "Гл. 2"; effectiveFromValue = 2; effectiveToValue = 2.5; notes = "Демонстрация временного изменения состояния персонажа." }
)
$e4 = New-TimelineEvent $projectId "Иван попадает в клинику" "point" "Погоня за свитой заканчивается для Ивана изоляцией, где он позже встретит Мастера." "Гл. 6" $null 6 $null "moscow" "#22c55e" $moscowPath @(
    @{ targetType = "storyObject"; targetId = [int]$ivan.id; role = "пациент" }
)
$e5 = New-TimelineEvent $projectId "Сеанс черной магии в Варьете" "duration" "Коровьев и Бегемот превращают сцену в массовое разоблачение жадности и доверчивости." "Гл. 12" "Гл. 12" 12 12.4 "moscow" "#8b5cf6" $moscowPath @(
    @{ targetType = "storyObject"; targetId = [int]$variete.id; role = "место" },
    @{ targetType = "storyObject"; targetId = [int]$koroviev.id; role = "ведет представление" },
    @{ targetType = "storyObject"; targetId = [int]$behemoth.id; role = "участвует" },
    @{ targetType = "storyObject"; targetId = [int]$magicPoster.id; role = "предмет линии" }
)
$e6 = New-TimelineEvent $projectId "Мастер рассказывает Ивану свою историю" "duration" "В клинике появляется линия рукописи, критики и любви Мастера и Маргариты." "Гл. 13" "Гл. 13" 13 13.8 "love" "#34d399" $masterPath @(
    @{ targetType = "storyObject"; targetId = [int]$master.id; role = "рассказывает" },
    @{ targetType = "storyObject"; targetId = [int]$ivan.id; role = "слушает" },
    @{ targetType = "storyObject"; targetId = [int]$manuscript.id; role = "центр рассказа" }
)
$e7 = New-TimelineEvent $projectId "Маргарита получает крем Азазелло" "point" "Маргарита принимает приглашение, потому что видит шанс вернуть Мастера." "Гл. 19" $null 19 $null "ball" "#fb7185" $ballPath @(
    @{ targetType = "storyObject"; targetId = [int]$margarita.id; role = "принимает выбор" },
    @{ targetType = "storyObject"; targetId = [int]$azazello.id; role = "передает крем" },
    @{ targetType = "storyObject"; targetId = [int]$azazelloCream.id; role = "магический предмет" }
)
$e8 = New-TimelineEvent $projectId "Бал у сатаны" "duration" "Маргарита проходит испытание ролью королевы бала и сохраняет способность к милосердию." "Гл. 23" "Гл. 23" 23 23.9 "ball" "#e11d48" $ballPath @(
    @{ targetType = "storyObject"; targetId = [int]$margarita.id; role = "королева бала" },
    @{ targetType = "storyObject"; targetId = [int]$woland.id; role = "хозяин" },
    @{ targetType = "storyObject"; targetId = [int]$retinueOrg.id; role = "организаторы" }
)
$e9 = New-TimelineEvent $projectId "Рукопись возвращается" "point" "Воланд возвращает текст Мастера и формулирует один из смысловых центров романа: написанное нельзя уничтожить окончательно." "Гл. 24" $null 24 $null "love" "#10b981" $masterPath @(
    @{ targetType = "storyObject"; targetId = [int]$woland.id; role = "возвращает" },
    @{ targetType = "storyObject"; targetId = [int]$master.id; role = "получает" },
    @{ targetType = "storyObject"; targetId = [int]$manuscript.id; role = "возвращенная рукопись" }
) @(
    @{ changeType = "field"; targetType = "storyObject"; targetId = [int]$manuscript.id; fieldKey = "currentStatus"; fieldName = "currentStatus"; oldValueJson = '"Сожжена Мастером"'; newValueJson = '"Возвращена Воландом"'; effectiveFromLabel = "Гл. 24"; effectiveToLabel = $null; effectiveFromValue = 24; effectiveToValue = $null; notes = "Показывает изменение статуса предмета по таймлайну." }
)
$e10 = New-TimelineEvent $projectId "Казнь на Лысой горе" "duration" "Ершалаимская линия достигает трагической кульминации, а вина Пилата становится долгой." "Ершалаим" "Гл. 26" 26 26.7 "yershalaim" "#b45309" $yershalaimPath @(
    @{ targetType = "storyObject"; targetId = [int]$yeshua.id; role = "казнен" },
    @{ targetType = "storyObject"; targetId = [int]$levi.id; role = "свидетель" },
    @{ targetType = "storyObject"; targetId = [int]$baldMountain.id; role = "место" }
)
$e11 = New-TimelineEvent $projectId "Пожар в Доме Грибоедова" "point" "Московская сатирическая линия завершается разрушением символа литературного быта." "Гл. 28" $null 28 $null "moscow" "#f97316" $moscowPath @(
    @{ targetType = "storyObject"; targetId = [int]$griboedov.id; role = "место" },
    @{ targetType = "storyObject"; targetId = [int]$koroviev.id; role = "участник" },
    @{ targetType = "storyObject"; targetId = [int]$behemoth.id; role = "участник" }
)
$e12 = New-TimelineEvent $projectId "Покой Мастера и Маргариты" "duration" "Финал соединяет личную судьбу героев, решение Воланда и просьбу Левия Матвея." "Финал" "Эпилог" 32 33 "finale" "#64748b" $coverPath @(
    @{ targetType = "storyObject"; targetId = [int]$master.id; role = "получает покой" },
    @{ targetType = "storyObject"; targetId = [int]$margarita.id; role = "получает покой" },
    @{ targetType = "storyObject"; targetId = [int]$woland.id; role = "исполняет решение" },
    @{ targetType = "storyObject"; targetId = [int]$levi.id; role = "приносит просьбу" }
)

@(
    @{ source = [int]$e1.id; target = [int]$e2.id; type = "causes"; text = "Предсказание Воланда приводит к немедленному событию." },
    @{ source = [int]$e2.id; target = [int]$e4.id; type = "causes"; text = "Погоня Ивана после гибели Берлиоза приводит его в клинику." },
    @{ source = [int]$e4.id; target = [int]$e6.id; type = "causes"; text = "Клиника становится местом встречи Ивана и Мастера." },
    @{ source = [int]$e6.id; target = [int]$e7.id; type = "related"; text = "История Мастера объясняет мотив выбора Маргариты." },
    @{ source = [int]$e7.id; target = [int]$e8.id; type = "causes"; text = "Крем открывает Маргарите путь к балу." },
    @{ source = [int]$e8.id; target = [int]$e9.id; type = "causes"; text = "После бала Маргарита получает возможность просить за Мастера." },
    @{ source = [int]$e3.id; target = [int]$e10.id; type = "causes"; text = "Решение Пилата приводит к казни Иешуа." },
    @{ source = [int]$e9.id; target = [int]$e12.id; type = "causes"; text = "Возвращение рукописи ведет к финальной судьбе героев." },
    @{ source = [int]$e10.id; target = [int]$e12.id; type = "related"; text = "Ершалаимская вина перекликается с финальным освобождением." }
) | ForEach-Object {
    Invoke-StoryDbJson POST "projects/$projectId/timeline/links" @{
        sourceEventId = $_.source
        targetEventId = $_.target
        linkType = $_.type
        description = $_.text
    } @(200, 201) | Out-Null
}

Invoke-StoryDbJson POST "projects/$projectId/timeline/events/$($e8.id)/gallery" @{ imagePath = $ballPath; caption = "Бал как визуальный центр мистической линии" } | Out-Null
Invoke-StoryDbJson POST "projects/$projectId/timeline/events/$($e10.id)/gallery" @{ imagePath = $yershalaimPath; caption = "Ершалаимская кульминация" } | Out-Null
Invoke-StoryDbJson POST "projects/$projectId/timeline/events/$($e12.id)/gallery" @{ imagePath = $coverPath; caption = "Финальное соединение линий романа" } | Out-Null

try {
    Invoke-StoryDbJson POST "projects/$projectId/timeline/layout/generate" $null @(200, 201) | Out-Null
} catch {
    Write-Warning "Timeline layout generation failed, but project data was created: $($_.Exception.Message)"
}

$relationLayout = Save-RelationGraphLayout $projectId

$characters = Invoke-StoryDbJson GET "projects/$projectId/objects?typeKey=characters"
$items = Invoke-StoryDbJson GET "projects/$projectId/objects?typeKey=items"
$places = Invoke-StoryDbJson GET "projects/$projectId/objects?typeKey=places"
$organizations = Invoke-StoryDbJson GET "projects/$projectId/objects?typeKey=organizations"
$timeline = Invoke-StoryDbJson GET "projects/$projectId/timeline/events"
$links = Invoke-StoryDbJson GET "projects/$projectId/timeline/links"
$graph = Invoke-StoryDbJson GET "projects/$projectId/relations/graph"

[pscustomobject]@{
    projectId = $projectId
    projectName = $project.name
    coverImagePath = $coverPath
    characters = @($characters).Count
    items = @($items).Count
    places = @($places).Count
    organizations = @($organizations).Count
    timelineEvents = @($timeline).Count
    timelineLinks = @($links).Count
    graphNodes = @($graph.nodes).Count
    graphEdges = @($graph.edges).Count
    relationLayoutId = if ($null -eq $relationLayout) { $null } else { [int]$relationLayout.id }
    relationLayoutItems = if ($null -eq $relationLayout) { 0 } else { @($relationLayout.items).Count }
    openCharactersUrl = "http://localhost:50201/style-preview/projects/$projectId/database/characters"
    openTimelineUrl = "http://localhost:50201/style-preview/projects/$projectId/timeline"
} | ConvertTo-Json -Depth 8




