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

function Convert-ExistingRelationships {
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

function New-Relation {
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

function Update-CharacterRelationships {
    param(
        [object]$Object,
        [object[]]$NewRelationships
    )

    $existing = @(Convert-ExistingRelationships $Object)
    $byKey = @{}
    foreach ($relationship in $existing) {
        $byKey["$($relationship.targetCharacterId):$($relationship.relationType)"] = $relationship
    }
    foreach ($relationship in $NewRelationships) {
        $byKey["$($relationship.targetCharacterId):$($relationship.relationType)"] = $relationship
    }

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
        characterRelationships = @($byKey.Values)
    }

    Invoke-StoryDb PUT "projects/$ProjectId/objects/$($Object.id)" $payload | Out-Null
}

function Save-RelationGraphLayout {
    $graph = Invoke-StoryDb GET "projects/$ProjectId/relations/graph"
    $nodes = @($graph.nodes)
    $count = [Math]::Max(1, $nodes.Count)
    $radius = [Math]::Max(520, [Math]::Ceiling($count * 38))
    $centerX = 1100
    $centerY = 860
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
$byName = @{}
foreach ($character in $characters) {
    $fullName = (($character.name, $character.surname | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join " ")
    $byName[$fullName] = $character
    $byName[$character.name] = $character
}

function C([string]$Name) {
    if (-not $byName.ContainsKey($Name)) {
        throw "Character '$Name' was not found in project $ProjectId."
    }

    return Invoke-StoryDb GET "projects/$ProjectId/objects/$($byName[$Name].id)"
}

$updates = @(
    @{
        source = "Маргарита Николаевна"
        relations = @(
            @{ target = "Мастер"; type = "любовь"; strength = 100; tension = 12; bidirectional = $true; description = "Главная личная связь романа: любовь становится путем к спасению и покою." },
            @{ target = "Азазелло"; type = "посредник"; strength = 78; tension = 35; bidirectional = $false; description = "Азазелло выводит Маргариту из бытового мира к балу и встрече с Воландом." },
            @{ target = "Фрида"; type = "милосердие"; strength = 70; tension = 18; bidirectional = $false; description = "Маргарита просит за Фриду, выбирая сострадание вместо личной выгоды." },
            @{ target = "Наташа"; type = "хозяйка и доверенная"; strength = 58; tension = 15; bidirectional = $true; description = "Наташа становится спутницей Маргариты в мистической ночи." },
            @{ target = "Николай Иванович"; type = "комическое превращение"; strength = 45; tension = 28; bidirectional = $false; description = "Николай Иванович вовлечен в последствия превращения Маргариты." },
            @{ target = "Латунский"; type = "месть за Мастера"; strength = 74; tension = 82; bidirectional = $false; description = "Маргарита громит квартиру критика, связывая любовь с возмездием литературной среде." }
        )
    },
    @{
        source = "Мастер"
        relations = @(
            @{ target = "Маргарита Николаевна"; type = "любовь"; strength = 100; tension = 12; bidirectional = $true; description = "Главная личная связь романа: любовь становится путем к спасению и покою." },
            @{ target = "Понтий Пилат"; type = "авторская связь"; strength = 86; tension = 40; bidirectional = $false; description = "Пилат является героем романа Мастера и отражает его тему страха." },
            @{ target = "Иешуа Га-Ноцри"; type = "герой рукописи"; strength = 80; tension = 20; bidirectional = $false; description = "Иешуа является смысловым центром романа Мастера о Пилате." },
            @{ target = "Латунский"; type = "критическая травля"; strength = 62; tension = 88; bidirectional = $false; description = "Критика Латунского входит в травмирующую литературную среду Мастера." },
            @{ target = "Алоизий Могарыч"; type = "донос"; strength = 58; tension = 90; bidirectional = $false; description = "Алоизий Могарыч связан с потерей жилья и преследованием Мастера." }
        )
    },
    @{
        source = "Воланд"
        relations = @(
            @{ target = "Маргарита Николаевна"; type = "испытание"; strength = 82; tension = 46; bidirectional = $false; description = "Воланд дает Маргарите возможность пройти испытание и вернуть Мастера." },
            @{ target = "Михаил Берлиоз"; type = "предсказание"; strength = 78; tension = 88; bidirectional = $false; description = "Встреча на Патриарших запускает московскую линию." },
            @{ target = "Коровьев-Фагот"; type = "глава свиты"; strength = 90; tension = 10; bidirectional = $false; description = "Коровьев действует как один из главных исполнителей Воланда." },
            @{ target = "Бегемот"; type = "глава свиты"; strength = 90; tension = 8; bidirectional = $false; description = "Бегемот превращает власть свиты в комический хаос." },
            @{ target = "Азазелло"; type = "глава свиты"; strength = 92; tension = 6; bidirectional = $false; description = "Азазелло исполняет жесткие поручения Воланда." },
            @{ target = "Мастер"; type = "возвращение рукописи"; strength = 86; tension = 20; bidirectional = $false; description = "Воланд возвращает Мастеру рукопись и участвует в его финальной судьбе." },
            @{ target = "Левий Матвей"; type = "переговоры о покое"; strength = 72; tension = 35; bidirectional = $false; description = "Левий Матвей передает Воланду просьбу о покое для Мастера." },
            @{ target = "Гелла"; type = "глава свиты"; strength = 76; tension = 8; bidirectional = $false; description = "Гелла действует внутри московской части свиты Воланда." },
            @{ target = "Абадонна"; type = "мистический круг"; strength = 70; tension = 22; bidirectional = $false; description = "Абадонна входит в страшный церемониальный круг Воланда." },
            @{ target = "Барон Майгель"; type = "суд на балу"; strength = 65; tension = 95; bidirectional = $false; description = "Судьба Майгеля показывает опасность наблюдения и двойной игры." },
            @{ target = "Степан Лиходеев"; type = "мистическое устранение"; strength = 64; tension = 70; bidirectional = $false; description = "Степа становится одной из первых жертв вмешательства Воланда в Варьете." },
            @{ target = "Андрей Соков"; type = "пророчество"; strength = 52; tension = 65; bidirectional = $false; description = "Визит буфетчика к Воланду раскрывает мотив денег и смерти." }
        )
    },
    @{
        source = "Коровьев-Фагот"
        relations = @(
            @{ target = "Бегемот"; type = "комическая пара"; strength = 92; tension = 8; bidirectional = $true; description = "Коровьев и Бегемот образуют главную комическую пару свиты." },
            @{ target = "Бегемот"; type = "комическая пара"; strength = 92; tension = 8; bidirectional = $true; description = "Коровьев и Бегемот образуют главную комическую пару свиты." },
            @{ target = "Никанор Босой"; type = "квартирная афера"; strength = 63; tension = 74; bidirectional = $false; description = "Коровьев втягивает Никанора Босого в историю с квартирой и валютой." },
            @{ target = "Прохор Петрович"; type = "административный абсурд"; strength = 55; tension = 62; bidirectional = $false; description = "Линия комиссии показывает власть свиты над бюрократической машиной." },
            @{ target = "Арчибальд Арчибальдович"; type = "столкновение с Грибоедовым"; strength = 45; tension = 45; bidirectional = $false; description = "Коровьев и Бегемот приходят в Дом Грибоедова перед финальным хаосом." }
        )
    },
    @{
        source = "Бегемот"
        relations = @(
            @{ target = "Жорж Бенгальский"; type = "публичное наказание"; strength = 70; tension = 82; bidirectional = $false; description = "Бегемот участвует в самой гротескной части сеанса в Варьете." },
            @{ target = "Арчибальд Арчибальдович"; type = "столкновение с Грибоедовым"; strength = 45; tension = 45; bidirectional = $false; description = "Бегемот доводит ресторанную сцену до комического разрушения." }
        )
    },
    @{
        source = "Азазелло"
        relations = @(
            @{ target = "Мастер"; type = "финальный посланник"; strength = 68; tension = 34; bidirectional = $false; description = "Азазелло участвует в финальном переходе Мастера и Маргариты." },
            @{ target = "Наташа"; type = "мистическая ночь"; strength = 46; tension = 24; bidirectional = $false; description = "Через действия Азазелло и крема обычный дом Маргариты входит в мистический план." }
        )
    },
    @{
        source = "Михаил Берлиоз"
        relations = @(
            @{ target = "Воланд"; type = "идеологический конфликт"; strength = 80; tension = 92; bidirectional = $false; description = "Берлиоз спорит с Воландом и становится первой жертвой его знания." },
            @{ target = "Максимилиан Поплавский"; type = "родство и наследство"; strength = 44; tension = 58; bidirectional = $false; description = "Смерть Берлиоза запускает квартирный интерес Поплавского." }
        )
    },
    @{
        source = "Иван Бездомный"
        relations = @(
            @{ target = "Мастер"; type = "ученичество"; strength = 72; tension = 18; bidirectional = $false; description = "Встреча с Мастером меняет путь Ивана от погони к пониманию." },
            @{ target = "Михаил Берлиоз"; type = "коллеги"; strength = 62; tension = 30; bidirectional = $true; description = "Иван начинает роман рядом с Берлиозом и становится свидетелем его гибели." },
            @{ target = "Александр Рюхин"; type = "литературные коллеги"; strength = 48; tension = 42; bidirectional = $true; description = "Рюхин сопровождает Ивана и оттеняет тему поэтической несостоятельности." },
            @{ target = "Доктор Стравинский"; type = "пациент и врач"; strength = 55; tension = 20; bidirectional = $false; description = "Стравинский помогает перевести хаос Ивана в наблюдение и память." },
            @{ target = "Воланд"; type = "свидетельство"; strength = 64; tension = 68; bidirectional = $false; description = "Иван становится главным свидетелем московского появления Воланда." }
        )
    },
    @{
        source = "Степан Лиходеев"
        relations = @(
            @{ target = "Григорий Римский"; type = "руководство Варьете"; strength = 58; tension = 48; bidirectional = $true; description = "Степа и Римский связаны административной линией театра Варьете." },
            @{ target = "Иван Варенуха"; type = "руководство Варьете"; strength = 52; tension = 42; bidirectional = $true; description = "Степа и Варенуха входят в управленческий круг Варьете." }
        )
    },
    @{
        source = "Григорий Римский"
        relations = @(
            @{ target = "Иван Варенуха"; type = "коллеги по Варьете"; strength = 70; tension = 55; bidirectional = $true; description = "Римский и Варенуха вместе переживают распад рационального порядка Варьете." },
            @{ target = "Гелла"; type = "ночной ужас"; strength = 52; tension = 88; bidirectional = $false; description = "Гелла становится частью пугающей сцены с Римским." }
        )
    },
    @{
        source = "Жорж Бенгальский"
        relations = @(
            @{ target = "Аркадий Семплеяров"; type = "сцена Варьете"; strength = 45; tension = 52; bidirectional = $false; description = "Оба персонажа включены в публичное разоблачение зрительской среды." }
        )
    },
    @{
        source = "Понтий Пилат"
        relations = @(
            @{ target = "Иешуа Га-Ноцри"; type = "суд и вина"; strength = 98; tension = 95; bidirectional = $false; description = "Пилат понимает Иешуа, но не решается спасти его." },
            @{ target = "Афраний"; type = "служебная власть"; strength = 75; tension = 22; bidirectional = $false; description = "Афраний выполняет скрытые распоряжения прокуратора." },
            @{ target = "Иосиф Каифа"; type = "политический торг"; strength = 78; tension = 92; bidirectional = $false; description = "Пилат и Каифа противостоят друг другу вокруг судьбы Иешуа." },
            @{ target = "Марк Крысобой"; type = "военная власть"; strength = 58; tension = 35; bidirectional = $false; description = "Марк Крысобой представляет силовую сторону власти Пилата." },
            @{ target = "Банга"; type = "одиночество и верность"; strength = 65; tension = 4; bidirectional = $true; description = "Банга подчеркивает одиночество Пилата и его финальный покой." },
            @{ target = "Иуда из Кириафа"; type = "тайное возмездие"; strength = 62; tension = 86; bidirectional = $false; description = "После казни Иешуа Пилат связан с тайным наказанием Иуды." }
        )
    },
    @{
        source = "Иешуа Га-Ноцри"
        relations = @(
            @{ target = "Левий Матвей"; type = "учитель и ученик"; strength = 88; tension = 18; bidirectional = $true; description = "Левий Матвей хранит и искажает слова Иешуа как ученик и свидетель." },
            @{ target = "Иуда из Кириафа"; type = "предательство"; strength = 70; tension = 92; bidirectional = $false; description = "Иуда становится фигурой предательства в ершалаимской линии." },
            @{ target = "Дисмас"; type = "сцена казни"; strength = 42; tension = 70; bidirectional = $false; description = "Дисмас находится рядом с Иешуа в сцене казни." },
            @{ target = "Гестас"; type = "сцена казни"; strength = 42; tension = 70; bidirectional = $false; description = "Гестас находится рядом с Иешуа в сцене казни." }
        )
    },
    @{
        source = "Афраний"
        relations = @(
            @{ target = "Иуда из Кириафа"; type = "ликвидация"; strength = 72; tension = 95; bidirectional = $false; description = "Афраний организует тайную сторону возмездия Иуде." },
            @{ target = "Низа"; type = "тайная операция"; strength = 60; tension = 75; bidirectional = $false; description = "Низа участвует в ловушке, ведущей Иуду к гибели." }
        )
    },
    @{
        source = "Низа"
        relations = @(
            @{ target = "Иуда из Кириафа"; type = "приманка"; strength = 64; tension = 85; bidirectional = $false; description = "Низа выводит Иуду в пространство тайной расправы." }
        )
    },
    @{
        source = "Левий Матвей"
        relations = @(
            @{ target = "Воланд"; type = "послание"; strength = 70; tension = 44; bidirectional = $false; description = "Левий Матвей обращается к Воланду с просьбой о судьбе Мастера." }
        )
    }
)

foreach ($update in $updates) {
    $source = C $update.source
    $relations = @()
    foreach ($relation in $update.relations) {
        $target = C $relation.target
        $relations += New-Relation $source $target $relation.type $relation.strength $relation.tension $relation.bidirectional $relation.description
    }
    Update-CharacterRelationships $source $relations
}

$graph = Save-RelationGraphLayout

[pscustomobject]@{
    projectId = $ProjectId
    graphNodes = @($graph.nodes).Count
    graphEdges = @($graph.edges).Count
    updatedSources = $updates.Count
} | ConvertTo-Json


