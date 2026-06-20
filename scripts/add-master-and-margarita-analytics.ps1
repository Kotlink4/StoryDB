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
    try {
        if ($null -eq $Body) {
            return Invoke-RestMethod -Method $Method -Uri $uri -WebSession $session
        }

        $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 60))
        return Invoke-RestMethod -Method $Method -Uri $uri -WebSession $session -ContentType "application/json; charset=utf-8" -Body $jsonBytes
    } catch {
        $errorText = $null
        if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            try {
                $errorText = $reader.ReadToEnd()
            } finally {
                $reader.Dispose()
            }
        }
        throw "HTTP $Method $Path failed: $($_.Exception.Message) $errorText"
    }
}

function Get-OrCreateAttributeGroup {
    param(
        [string]$TypeKey,
        [string]$Name,
        [string]$IconKey
    )

    $groups = @(Invoke-StoryDb GET "projects/$ProjectId/attribute-definitions/groups?typeKey=$TypeKey")
    $existing = @($groups | Where-Object { $_.name -eq $Name })[0]
    if ($null -ne $existing) {
        return $existing
    }

    return Invoke-StoryDb POST "projects/$ProjectId/attribute-definitions/groups" @{
        typeKey = $TypeKey
        name = $Name
        iconKey = $IconKey
    }
}

function Get-OrCreateAttributeDefinition {
    param(
        [string]$TypeKey,
        [string]$GroupName,
        [string]$Name,
        [string]$DataType,
        [object[]]$Options = @(),
        [Nullable[double]]$MinValue = $null,
        [Nullable[double]]$MaxValue = $null,
        [string]$Unit = $null,
        [string]$IconKey = $null
    )

    $definitions = @(Invoke-StoryDb GET "projects/$ProjectId/attribute-definitions?typeKey=$TypeKey")
    $existing = @($definitions | Where-Object { $_.name -eq $Name })[0]
    if ($null -ne $existing) {
        return $existing
    }

    return Invoke-StoryDb POST "projects/$ProjectId/attribute-definitions" @{
        typeKey = $TypeKey
        name = $Name
        dataType = $DataType
        groupName = $GroupName
        minValue = $MinValue
        maxValue = $MaxValue
        unit = $Unit
        iconKey = $IconKey
        options = $Options
    }
}

function Merge-Attributes {
    param(
        [object]$Object,
        [hashtable]$ValuesByName
    )

    $merged = @{}
    foreach ($attribute in @($Object.attributes)) {
        $merged[$attribute.name] = $attribute.value
    }
    foreach ($key in $ValuesByName.Keys) {
        $merged[$key] = $ValuesByName[$key]
    }

    $attributes = @()
    foreach ($key in $merged.Keys) {
        $attributes += @{ name = $key; value = $merged[$key] }
    }
    return $attributes
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

function Convert-Relationships {
    param([object]$Object)
    return @($Object.outgoingCharacterRelationships | ForEach-Object {
        @{
            id = [int]$_.id
            sourceCharacterId = [int]$Object.id
            targetCharacterId = [int]$_.character.id
            relationType = $_.relationType
            strength = [int]$_.strength
            tension = [int]$_.tension
            isBidirectional = [bool]$_.isBidirectional
            description = $_.description
        }
    })
}

function Update-ObjectAttributes {
    param(
        [object]$Object,
        [hashtable]$ValuesByName
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
        attributes = @(Merge-Attributes $Object $ValuesByName)
        hierarchySelections = @(Convert-HierarchySelections $Object)
        catalogSelections = @(Convert-CatalogSelections $Object)
        ownedItemIds = @($Object.ownedItems | ForEach-Object { [int]$_.id })
        ownerCharacterIds = @($Object.owners | Where-Object { $_.typeKey -eq "characters" } | ForEach-Object { [int]$_.id })
        territoryPlaceIds = @($Object.ownedTerritories | ForEach-Object { [int]$_.id })
        ownerOrganizationIds = @($Object.ownerOrganizations | ForEach-Object { [int]$_.id })
        parentObjectIds = @($Object.hierarchyParents | ForEach-Object { [int]$_.id })
        characterRelationships = @(Convert-Relationships $Object)
    }

    Invoke-StoryDb PUT "projects/$ProjectId/objects/$($Object.id)" $payload | Out-Null
}

function Get-Line {
    param([object]$Object)
    $text = "$($Object.name) $($Object.surname) $($Object.description) $($Object.role) $($Object.currentStatus)"
    if ($text -match "Пилат|Иешуа|Ершалаим|Иудеи|Каифа|Крысобой|Иуда|Афраний|Левий|Банга|Кедрон|Гефсиман|Лысая") { return "Ершалаим" }
    if ($text -match "Воланд|Коровьев|Бегемот|Азазелло|Гелла|Абадонна|бал|сатаны|мистич") { return "Мистический слой" }
    if ($text -match "Мастер|Маргарит|рукопис|Латунский|Могарыч|подвал|особняк") { return "Линия Мастера и Маргариты" }
    return "Москва"
}

function Get-CharacterValues {
    param([object]$Object)

    $line = Get-Line $Object
    $text = "$($Object.name) $($Object.surname) $($Object.description) $($Object.role)"
    $function = "Свидетель"
    if ($text -match "Воланд|Пилат|Каифа|Стравинский") { $function = "Носитель власти" }
    elseif ($text -match "Мастер|Маргарита|Иешуа|Иван") { $function = "Центральный герой" }
    elseif ($text -match "Коровьев|Бегемот|Азазелло|Гелла|Низа|Афраний|Левий") { $function = "Посредник" }
    elseif ($text -match "Берлиоз|Фрида|Бенгальский|Иуда|Дисмас|Гестас|Соков") { $function = "Жертва" }
    elseif ($text -match "Римский|Варенуха|Никанор|Степан|Прохор|Семплеяров|Поплавский|Арчибальд|Рюхин") { $function = "Сатирическая маска" }

    $conflict = "Самообман"
    if ($text -match "Пилат|Каифа|Афраний|Крысобой") { $conflict = "Власть" }
    elseif ($text -match "Мастер|Латунский|Могарыч|Рюхин") { $conflict = "Творчество" }
    elseif ($text -match "Маргарита|Фрида|Иешуа|Левий") { $conflict = "Милосердие" }
    elseif ($text -match "Иуда|Могарыч|Майгель") { $conflict = "Предательство" }
    elseif ($text -match "Воланд|Коровьев|Бегемот|Азазелло|Гелла|Абадонна") { $conflict = "Воздаяние" }

    $arc = "Остается в мире романа"
    if ($text -match "Мастер|Маргарита") { $arc = "Получает покой" }
    elseif ($text -match "Берлиоз|Иуда|Майгель|Иешуа|Дисмас|Гестас") { $arc = "Погибает" }
    elseif ($text -match "Воланд|Коровьев|Бегемот|Азазелло|Гелла|Абадонна") { $arc = "Покидает Москву" }
    elseif ($text -match "Иван|Пилат|Фрида") { $arc = "Освобождается или меняется" }
    elseif ($text -match "Латунский|Могарыч|Никанор|Бенгальский|Прохор|Семплеяров") { $arc = "Наказан сатирически" }

    return @{
        "Литературная функция" = $function
        "Ключевой конфликт" = $conflict
        "Финальная траектория" = $arc
        "Повествовательный слой" = $line
    }
}

function Get-ItemValues {
    param([object]$Object)
    $text = "$($Object.name) $($Object.description) $($Object.role)"
    $symbolType = "Бытовой знак"
    if ($text -match "Крем|Глобус|Трость|подкова|Метла|магич") { $symbolType = "Магический артефакт" }
    elseif ($text -match "Рукопись|Записка|Папка|Телеграмма|Билет") { $symbolType = "Текст или документ" }
    elseif ($text -match "Деньги|Валюта") { $symbolType = "Деньги и соблазн" }
    $magic = if ($symbolType -eq "Магический артефакт") { "90" } elseif ($symbolType -eq "Текст или документ") { "35" } else { "20" }
    return @{
        "Тип символа" = $symbolType
        "Степень магичности" = $magic
    }
}

function Get-PlaceValues {
    param([object]$Object)
    $text = "$($Object.name) $($Object.description) $($Object.role)"
    $function = "Социальная сцена"
    if ($text -match "Патриаршие|завязк") { $function = "Завязка" }
    elseif ($text -match "Варьете|Грибоедов|Торгсин|комиссия|Садовая|квартира") { $function = "Разоблачение быта" }
    elseif ($text -match "Клиника|подвал|особняк") { $function = "Убежище" }
    elseif ($text -match "бал|Воробьевы") { $function = "Переход" }
    elseif ($text -match "Ершалаим|Дворец|Лысая|Кедрон|Гефсиман") { $function = "Пространство власти и суда" }
    return @{ "Функция пространства" = $function }
}

function Get-OrganizationValues {
    param([object]$Object)
    $text = "$($Object.name) $($Object.description) $($Object.role)"
    $pressure = "Бюрократия"
    if ($text -match "МАССОЛИТ|Грибоедов|литератур") { $pressure = "Литературная среда" }
    elseif ($text -match "Варьете|Зрелищ") { $pressure = "Зрелище" }
    elseif ($text -match "Римская|Синедрион|Иудеи|Власть") { $pressure = "Политическая власть" }
    elseif ($text -match "Следствен") { $pressure = "Расследование" }
    elseif ($text -match "Свита") { $pressure = "Мистическое воздействие" }
    $satire = if ($pressure -in @("Бюрократия", "Литературная среда", "Зрелище", "Расследование")) { "85" } else { "35" }
    return @{
        "Тип институционального давления" = $pressure
        "Уровень сатиры" = $satire
    }
}

Invoke-StoryDb POST "auth/login" @{
    email = $Email
    password = $Password
} | Out-Null

$characterGroup = Get-OrCreateAttributeGroup "characters" "Литературный анализ" "book-open"
Get-OrCreateAttributeDefinition "characters" $characterGroup.name "Литературная функция" "select" @("Центральный герой", "Свидетель", "Посредник", "Носитель власти", "Жертва", "Сатирическая маска") $null $null $null "theater" | Out-Null
Get-OrCreateAttributeDefinition "characters" $characterGroup.name "Ключевой конфликт" "select" @("Власть", "Творчество", "Милосердие", "Предательство", "Воздаяние", "Самообман") $null $null $null "scale" | Out-Null
Get-OrCreateAttributeDefinition "characters" $characterGroup.name "Финальная траектория" "select" @("Получает покой", "Погибает", "Покидает Москву", "Освобождается или меняется", "Наказан сатирически", "Остается в мире романа") $null $null $null "route" | Out-Null
Get-OrCreateAttributeDefinition "characters" $characterGroup.name "Повествовательный слой" "select" @("Москва", "Ершалаим", "Линия Мастера и Маргариты", "Мистический слой") $null $null $null "layers" | Out-Null

$itemGroup = Get-OrCreateAttributeGroup "items" "Предметный анализ" "gem"
Get-OrCreateAttributeDefinition "items" $itemGroup.name "Тип символа" "select" @("Магический артефакт", "Текст или документ", "Деньги и соблазн", "Бытовой знак") $null $null $null "sparkles" | Out-Null
Get-OrCreateAttributeDefinition "items" $itemGroup.name "Степень магичности" "number" @() 0 100 "%" "wand" | Out-Null

$placeGroup = Get-OrCreateAttributeGroup "places" "Пространственный анализ" "map"
Get-OrCreateAttributeDefinition "places" $placeGroup.name "Функция пространства" "select" @("Завязка", "Разоблачение быта", "Убежище", "Переход", "Пространство власти и суда", "Социальная сцена") $null $null $null "map-pin" | Out-Null

$organizationGroup = Get-OrCreateAttributeGroup "organizations" "Институциональный анализ" "building"
Get-OrCreateAttributeDefinition "organizations" $organizationGroup.name "Тип институционального давления" "select" @("Бюрократия", "Литературная среда", "Зрелище", "Политическая власть", "Расследование", "Мистическое воздействие") $null $null $null "landmark" | Out-Null
Get-OrCreateAttributeDefinition "organizations" $organizationGroup.name "Уровень сатиры" "number" @() 0 100 "%" "activity" | Out-Null

$updated = @{
    characters = 0
    items = 0
    places = 0
    organizations = 0
}

foreach ($typeKey in @("characters", "items", "places", "organizations")) {
    $objects = Invoke-StoryDb GET "projects/$ProjectId/objects?typeKey=$typeKey"
    foreach ($objectSummary in ($objects | ForEach-Object { $_ })) {
        $object = Invoke-StoryDb GET "projects/$ProjectId/objects/$($objectSummary.id)"
        $values = switch ($typeKey) {
            "characters" { Get-CharacterValues $object }
            "items" { Get-ItemValues $object }
            "places" { Get-PlaceValues $object }
            "organizations" { Get-OrganizationValues $object }
        }
        Update-ObjectAttributes $object $values
        $updated[$typeKey]++
    }
}

$definitions = @{}
foreach ($typeKey in @("characters", "items", "places", "organizations")) {
    $definitions[$typeKey] = @((Invoke-StoryDb GET "projects/$ProjectId/attribute-definitions?typeKey=$typeKey")).Count
}

$restoreScript = Join-Path $PSScriptRoot "restore-master-and-margarita-relations.ps1"
if (Test-Path $restoreScript) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $restoreScript -ProjectId $ProjectId -ApiBaseUrl $ApiBaseUrl -Email $Email -Password $Password | Out-Null
}

[pscustomobject]@{
    projectId = $ProjectId
    updated = $updated
    attributeDefinitions = $definitions
    openUrl = "http://localhost:50201/style-preview/projects/$ProjectId/database/characters"
} | ConvertTo-Json -Depth 8





