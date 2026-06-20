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

    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 40))
    return Invoke-RestMethod -Method $Method -Uri $uri -WebSession $session -ContentType "application/json; charset=utf-8" -Body $jsonBytes
}

function New-StoryObjectPayload {
    param(
        [string]$TypeKey,
        [string]$Name,
        [string]$Surname = $null,
        [string]$Description = $null,
        [string]$Age = $null,
        [string]$Role = $null,
        [string]$CurrentStatus = $null,
        [string]$ImagePath = $null
    )

    return @{
        typeKey = $TypeKey
        name = $Name
        surname = $Surname
        surnameForm = $null
        description = $Description
        age = $Age
        role = $Role
        currentStatus = $CurrentStatus
        imagePath = $ImagePath
        attributes = @()
        hierarchySelections = @()
        catalogSelections = @()
        ownedItemIds = @()
        ownerCharacterIds = @()
        territoryPlaceIds = @()
        ownerOrganizationIds = @()
        parentObjectIds = @()
        characterRelationships = @()
    }
}

function Add-ObjectIfMissing {
    param(
        [hashtable]$ByName,
        [hashtable]$Draft
    )

    $key = "$($Draft.typeKey):$($Draft.name)"
    if ($ByName.ContainsKey($key)) {
        return [pscustomobject]@{ created = $false; object = $ByName[$key] }
    }

    $created = Invoke-StoryDb POST "projects/$ProjectId/objects" $Draft
    $ByName[$key] = $created
    return [pscustomobject]@{ created = $true; object = $created }
}

function Get-ImagePath {
    param(
        [hashtable]$ByName,
        [string]$Key
    )

    if ($ByName.ContainsKey($Key)) {
        return $ByName[$Key].imagePath
    }

    return $null
}

Invoke-StoryDb POST "auth/login" @{
    email = $Email
    password = $Password
} | Out-Null

$byName = @{}
foreach ($typeKey in @("characters", "items", "places", "organizations")) {
    $objects = @(Invoke-StoryDb GET "projects/$ProjectId/objects?typeKey=$typeKey")
    foreach ($object in $objects) {
        $byName["$($object.typeKey):$($object.name)"] = $object
    }
}

$coverImage = Get-ImagePath $byName "characters:Воланд"
$moscowImage = Get-ImagePath $byName "places:Патриаршие пруды"
$yershalaimImage = Get-ImagePath $byName "places:Ершалаим"
$masterImage = Get-ImagePath $byName "places:Подвальчик Мастера"
$ballImage = Get-ImagePath $byName "characters:Маргарита"

$created = @{
    characters = 0
    items = 0
    places = 0
    organizations = 0
}
$skipped = @{
    characters = 0
    items = 0
    places = 0
    organizations = 0
}

$characterDrafts = @(
    New-StoryObjectPayload "characters" "Александр" "Рюхин" "Поэт из круга МАССОЛИТа, сопровождающий Ивана после событий на Патриарших." $null "Поэт" "Представитель литературной среды" $moscowImage
    New-StoryObjectPayload "characters" "Иван" "Варенуха" "Администратор Варьете, втянутый свитой Воланда в цепь московских исчезновений." $null "Администратор Варьете" "Пострадал от мистического вмешательства" $moscowImage
    New-StoryObjectPayload "characters" "Григорий" "Римский" "Финдиректор Варьете, свидетель пугающих последствий сеанса черной магии." $null "Финдиректор Варьете" "Пытается объяснить невозможное рационально" $moscowImage
    New-StoryObjectPayload "characters" "Жорж" "Бенгальский" "Конферансье Варьете, чья сцена становится частью публичного разоблачения." $null "Конферансье" "Публично унижен на сцене" $moscowImage
    New-StoryObjectPayload "characters" "Никанор" "Босой" "Председатель жилтоварищества дома на Садовой, втянутый в историю с валютой." $null "Председатель жилтоварищества" "Становится объектом квартирной сатиры" $moscowImage
    New-StoryObjectPayload "characters" "Аннушка" $null "Москвичка, чье пролитое масло становится деталью исполнения предсказания Воланда." $null "Случайная участница завязки" "Связана с гибелью Берлиоза" $moscowImage
    New-StoryObjectPayload "characters" "Фрида" $null "Гостья бала, через которую раскрывается милосердие Маргариты." $null "Гостья бала" "Получает прощение по просьбе Маргариты" $ballImage
    New-StoryObjectPayload "characters" "Наташа" $null "Домработница Маргариты, вовлеченная в мистическую ночь и полет." $null "Домработница Маргариты" "Уходит в мистическое пространство бала" $ballImage
    New-StoryObjectPayload "characters" "Николай" "Иванович" "Сосед Маргариты, комически втянутый в события после использования крема Азазелло." $null "Сосед Маргариты" "Становится участником ночного полета" $ballImage
    New-StoryObjectPayload "characters" "Латунский" $null "Критик, связанный с травлей Мастера и яростью Маргариты." $null "Критик" "Объект мести Маргариты" $masterImage
    New-StoryObjectPayload "characters" "Алоизий" "Могарыч" "Человек, занявший жилье Мастера после доноса и исчезновения автора." $null "Доносчик" "Возвращен в сатирический круг воздаяния" $masterImage
    New-StoryObjectPayload "characters" "Барон" "Майгель" "Гость бала и агент наблюдения, чья судьба показывает опасность двойной игры." $null "Гость бала" "Наказан на балу" $ballImage
    New-StoryObjectPayload "characters" "Доктор" "Стравинский" "Руководитель клиники, где Иван встречает Мастера." $null "Врач" "Сохраняет рациональный порядок в хаосе событий" $moscowImage
    New-StoryObjectPayload "characters" "Арчибальд" "Арчибальдович" "Распорядитель ресторана Дома Грибоедова, символ организованного литературного быта." $null "Распорядитель ресторана" "Связан с Домом Грибоедова" $moscowImage
    New-StoryObjectPayload "characters" "Андрей" "Соков" "Буфетчик Варьете, чей визит к Воланду раскрывает тему денег и смерти." $null "Буфетчик" "Получает пророчество о собственной судьбе" $moscowImage
    New-StoryObjectPayload "characters" "Аркадий" "Семплеяров" "Председатель акустической комиссии, участник скандала в Варьете." $null "Чиновник-зритель" "Публично разоблачен" $moscowImage
    New-StoryObjectPayload "characters" "Прохор" "Петрович" "Руководитель зрелищной комиссии, исчезновение которого показывает административный абсурд." $null "Чиновник" "Оставляет после себя говорящий костюм" $moscowImage
    New-StoryObjectPayload "characters" "Максимилиан" "Поплавский" "Дядя Берлиоза, приезжающий в Москву из-за квартиры." $null "Родственник Берлиоза" "Вовлечен в квартирную сатиру" $moscowImage
    New-StoryObjectPayload "characters" "Абадонна" $null "Молчаливый участник мистического круга Воланда, связанный с мотивом смерти." $null "Участник мистического круга" "Появляется в линии бала" $ballImage
    New-StoryObjectPayload "characters" "Иосиф" "Каифа" "Первосвященник, политически влияющий на решение о судьбе Иешуа." $null "Первосвященник" "Отстаивает казнь Иешуа" $yershalaimImage
    New-StoryObjectPayload "characters" "Марк" "Крысобой" "Римский воин в ершалаимской линии, символ грубой военной силы." $null "Кентурион" "Служит власти Ершалаима" $yershalaimImage
    New-StoryObjectPayload "characters" "Низа" $null "Женщина из ершалаимской линии, связанная с ловушкой для Иуды." $null "Участница тайной операции" "Ведет Иуду к гибели" $yershalaimImage
    New-StoryObjectPayload "characters" "Дисмас" $null "Один из казненных на Лысой горе рядом с Иешуа." $null "Осужденный" "Фигура сцены казни" $yershalaimImage
    New-StoryObjectPayload "characters" "Гестас" $null "Один из казненных на Лысой горе рядом с Иешуа." $null "Осужденный" "Фигура сцены казни" $yershalaimImage
    New-StoryObjectPayload "characters" "Банга" $null "Верный пес Понтия Пилата, важная деталь его одиночества и финального покоя." $null "Спутник Пилата" "Связан с финальным освобождением Пилата" $yershalaimImage
)

$itemDrafts = @(
    New-StoryObjectPayload "items" "Золотая подкова" $null "Подарок Воланда Маргарите и предмет финальной цепочки с потерей и возвращением." $null "Мистический подарок" "Возвращена Маргарите" $ballImage
    New-StoryObjectPayload "items" "Глобус Воланда" $null "Мистический предмет, через который Воланд показывает масштаб власти и знания." $null "Магический артефакт" "Хранится у Воланда" $coverImage
    New-StoryObjectPayload "items" "Трость Воланда" $null "Атрибут Воланда, визуально закрепляющий его образ иностранного профессора." $null "Атрибут персонажа" "При Воланде" $coverImage
    New-StoryObjectPayload "items" "Деньги из Варьете" $null "Бумажные деньги, превращающиеся в пустоту и разоблачающие жажду легкой выгоды." $null "Предмет сатиры" "Исчезают после сеанса" $moscowImage
    New-StoryObjectPayload "items" "Валюта Никанора Босого" $null "Деньги, через которые квартирная линия превращается в бюрократический кошмар." $null "Компрометирующий предмет" "Становится причиной ареста" $moscowImage
    New-StoryObjectPayload "items" "Метла Маргариты" $null "Предмет ночного полета Маргариты после превращения." $null "Магический предмет" "Использована в ночь бала" $ballImage
    New-StoryObjectPayload "items" "Папка МАССОЛИТа" $null "Обобщенный предмет литературной бюрократии: удостоверения, бумаги, пропуска и распределение благ." $null "Бюрократический предмет" "Связана с Домом Грибоедова" $moscowImage
    New-StoryObjectPayload "items" "Телеграмма Поплавского" $null "Сюжетный повод приезда родственника Берлиоза и входа в квартирную линию." $null "Документ" "Запускает визит Поплавского" $moscowImage
    New-StoryObjectPayload "items" "Костюм Прохора Петровича" $null "Комический предмет административной линии: учреждение продолжает работать без человека." $null "Абсурдный заместитель" "Продолжает подписывать бумаги" $moscowImage
    New-StoryObjectPayload "items" "Билет на сеанс Варьете" $null "Пропуск зрителя в сцену черной магии и массового соблазна." $null "Театральный предмет" "Связан с сеансом" $moscowImage
    New-StoryObjectPayload "items" "Записка Левия Матвея" $null "Записи ученика Иешуа, мотив памяти и искаженного свидетельства." $null "Текстовый предмет" "Связана с ершалаимской линией" $yershalaimImage
)

$placeDrafts = @(
    New-StoryObjectPayload "places" "Клиника Стравинского" $null "Место, где Иван встречает Мастера и где московская линия получает психологическую рамку." $null "Медицинская локация" "Принимает свидетелей московских событий" $moscowImage
    New-StoryObjectPayload "places" "Особняк Маргариты" $null "Исходная точка превращения Маргариты и ее ухода в ночь бала." $null "Дом Маргариты" "Покинут перед балом" $ballImage
    New-StoryObjectPayload "places" "Квартира Латунского" $null "Место мести Маргариты литературному критику." $null "Локация мести" "Разгромлена Маргаритой" $masterImage
    New-StoryObjectPayload "places" "Торгсин" $null "Московский магазин, где комическая линия свиты соединяется с темой валюты и потребления." $null "Городская локация" "Становится сценой хаоса" $moscowImage
    New-StoryObjectPayload "places" "Садовая улица" $null "Пространство вокруг нехорошей квартиры и московской квартирной сатиры." $null "Московская улица" "Связана с квартирой N 50" $moscowImage
    New-StoryObjectPayload "places" "Воробьевы горы" $null "Финальная московская точка перед уходом Воланда и героев." $null "Финальная локация" "Место прощания с Москвой" $coverImage
    New-StoryObjectPayload "places" "Александровский сад" $null "Городское пространство, связанное с передвижениями персонажей московской линии." $null "Московская локация" "Фон московских событий" $moscowImage
    New-StoryObjectPayload "places" "Квартира Никанора Босого" $null "Бытовое пространство квартирной линии и истории с валютой." $null "Квартирная локация" "Обыскана после аферы" $moscowImage
    New-StoryObjectPayload "places" "Ялта" $null "Пункт внезапного перемещения Степы Лиходеева." $null "Внешняя локация" "Использована как комический разрыв пространства" $moscowImage
    New-StoryObjectPayload "places" "Сцена бала" $null "Условное мистическое пространство великого бала у сатаны." $null "Мистическая локация" "Центр испытания Маргариты" $ballImage
    New-StoryObjectPayload "places" "Кедрон" $null "Пространство ершалаимской линии, связанное с тайной операцией вокруг Иуды." $null "Ершалаимская локация" "Место движения к гибели Иуды" $yershalaimImage
    New-StoryObjectPayload "places" "Гефсиманский сад" $null "Ершалаимская локация, связанная с Иудой и тайным возмездием." $null "Ершалаимская локация" "Связана с линией предательства" $yershalaimImage
)

$organizationDrafts = @(
    New-StoryObjectPayload "organizations" "Клиника Стравинского" $null "Медицинская институция, которая принимает Ивана и других свидетелей странных событий." $null "Медицинская организация" "Работает как рациональный контур романа" $moscowImage
    New-StoryObjectPayload "organizations" "Зрелищная комиссия" $null "Административная среда московской театральной линии." $null "Бюрократическая организация" "Становится объектом сатиры" $moscowImage
    New-StoryObjectPayload "organizations" "Следственная группа по делу Воланда" $null "Условная организация для демонстрации расследования последствий московских событий." $null "Следствие" "Собирает следы после исчезновения свиты" $moscowImage
    New-StoryObjectPayload "organizations" "Ресторан Дома Грибоедова" $null "Бытовая и статусная часть литературного мира МАССОЛИТа." $null "Ресторан" "Сгорает в финале московской сатиры" $moscowImage
    New-StoryObjectPayload "organizations" "Римская администрация Иудеи" $null "Политическая власть ершалаимской линии во главе с Понтием Пилатом." $null "Государственная власть" "Принимает решение о казни" $yershalaimImage
    New-StoryObjectPayload "organizations" "Синедрион" $null "Религиозно-политическая сила, влияющая на судьбу Иешуа." $null "Религиозная власть" "Добивается казни Иешуа" $yershalaimImage
)

foreach ($draft in $characterDrafts) {
    $result = Add-ObjectIfMissing $byName $draft
    if ($result.created) { $created.characters++ } else { $skipped.characters++ }
}

foreach ($draft in $itemDrafts) {
    $result = Add-ObjectIfMissing $byName $draft
    if ($result.created) { $created.items++ } else { $skipped.items++ }
}

foreach ($draft in $placeDrafts) {
    $result = Add-ObjectIfMissing $byName $draft
    if ($result.created) { $created.places++ } else { $skipped.places++ }
}

foreach ($draft in $organizationDrafts) {
    $result = Add-ObjectIfMissing $byName $draft
    if ($result.created) { $created.organizations++ } else { $skipped.organizations++ }
}

$totals = @{}
foreach ($typeKey in @("characters", "items", "places", "organizations")) {
    $totals[$typeKey] = @((Invoke-StoryDb GET "projects/$ProjectId/objects?typeKey=$typeKey")).Count
}

[pscustomobject]@{
    projectId = $ProjectId
    created = $created
    skipped = $skipped
    totals = $totals
    openUrl = "http://localhost:50201/style-preview/projects/$ProjectId/database/characters"
} | ConvertTo-Json -Depth 8



