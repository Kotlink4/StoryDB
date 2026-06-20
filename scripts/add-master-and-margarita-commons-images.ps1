param(
    [int]$ProjectId = 70
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding

$assets = @(
    @{
        Key = "first-edition"
        FileName = "MasterandMargaritaFirstEdition.jpg"
        LocalName = "masterandmargarita-first-edition.jpg"
        ContentType = "image/jpeg"
        Width = 2160
        Height = 2880
        Caption = "Первое книжное издание романа, YMCA Press, Париж, 1967"
    },
    @{
        Key = "parting-with-moscow"
        FileName = "Master & Margarita.jpg"
        LocalName = "master-margarita-parting-with-moscow.jpg"
        ContentType = "image/jpeg"
        Width = 836
        Height = 832
        Caption = "С. Панасенко-Михалкин, иллюстрация «Прощание с Москвой»"
    },
    @{
        Key = "margarita-woland"
        FileName = "Маргарита и Воланд.jpg"
        LocalName = "margarita-and-woland.jpg"
        ContentType = "image/jpeg"
        Width = 476
        Height = 461
        Caption = "Юлия Долгорукова, картина «Маргарита и Воланд»"
    },
    @{
        Key = "patriarch-sign"
        FileName = "Patriarch Ponds Sign.JPG"
        LocalName = "patriarch-ponds-sign.jpg"
        ContentType = "image/jpeg"
        Width = 5184
        Height = 3456
        Caption = "Памятный знак у Патриарших прудов"
    },
    @{
        Key = "berlioz-crossing"
        FileName = "Перекресток гибели Берлиоза - panoramio.jpg"
        LocalName = "berlioz-death-crossing.jpg"
        ContentType = "image/jpeg"
        Width = 2048
        Height = 1536
        Caption = "Перекресток, связанный с гибелью Берлиоза"
    },
    @{
        Key = "mind-your-head"
        FileName = "Берегите голову, а то отрежут трамваем. Патриаршие пруды. Москва. Январь 2016 - panoramio.jpg"
        LocalName = "mind-your-head-patriarch-ponds.jpg"
        ContentType = "image/jpeg"
        Width = 4608
        Height = 2592
        Caption = "Булгаковская табличка у Патриарших прудов"
    },
    @{
        Key = "bolshaya-sadovaya-10"
        FileName = "Moscow, Bolshaya Sadovaya 10 May 2009 02.jpg"
        LocalName = "bolshaya-sadovaya-10.jpg"
        ContentType = "image/jpeg"
        Width = 2000
        Height = 1223
        Caption = "Дом на Большой Садовой, 10"
    },
    @{
        Key = "bulgakov-house"
        FileName = "Bulgakov House Moscow (1).jpg"
        LocalName = "bulgakov-house-moscow.jpg"
        ContentType = "image/jpeg"
        Width = 1296
        Height = 972
        Caption = "Булгаковский дом в Москве"
    },
    @{
        Key = "apartment-sign"
        FileName = "Moscow, Bolshaya Sadovaya 10 - sign and balcony (43812408732).jpg"
        LocalName = "bolshaya-sadovaya-sign-balcony.jpg"
        ContentType = "image/jpeg"
        Width = 1024
        Height = 683
        Caption = "Мемориальная зона дома Булгакова на Садовой"
    },
    @{
        Key = "about-drawing"
        FileName = "About the Master and Margarita, drawing.jpg"
        LocalName = "about-master-and-margarita-drawing.jpg"
        ContentType = "image/jpeg"
        Width = 5272
        Height = 5240
        Caption = "Рисунок по мотивам романа «Мастер и Маргарита»"
    }
)

$publicByKey = @{}
$now = Get-Date
$year = $now.ToString("yyyy")
$month = $now.ToString("MM")

foreach ($asset in $assets) {
    $mediaId = "commons-" + $asset.Key
    $publicDirectory = "/uploads/projects/$ProjectId/images/$year/$month/$mediaId"
    $publicPath = "$publicDirectory/" + $asset.LocalName
    $containerDirectory = "/app$publicDirectory"
    $encodedFileName = [uri]::EscapeDataString($asset.FileName)
    $downloadUrl = "https://commons.wikimedia.org/wiki/Special:Redirect/file/$encodedFileName"

    docker exec storydb-api mkdir -p $containerDirectory | Out-Null
    docker exec storydb-api curl -L --fail --silent --show-error --output "/app$publicPath" $downloadUrl

    $publicByKey[$asset.Key] = $publicPath
}

$sqlValuesList = $assets | ForEach-Object {
    $key = $_.Key.Replace("'", "''")
    $path = $publicByKey[$_.Key].Replace("'", "''")
    $fileName = $_.LocalName.Replace("'", "''")
    $storageDirectory = [System.IO.Path]::GetDirectoryName($path).Replace('\', '/').Replace("'", "''")
    $contentType = $_.ContentType.Replace("'", "''")
    $caption = $_.Caption.Replace("'", "''")
    "('$key', '$fileName', '$storageDirectory', '$path', '$contentType', $($_.Width), $($_.Height), '$caption')"
}
$sqlValues = $sqlValuesList -join ("," + [Environment]::NewLine)

$sql = @"
WITH asset_source("Key", "OriginalFileName", "StorageDirectory", "PublicPath", "ContentType", "Width", "Height", "Caption") AS (
    VALUES
$sqlValues
),
upsert_assets AS (
    INSERT INTO "MediaAssets" (
        "OwnerUserId",
        "ProjectId",
        "OriginalFileName",
        "StorageDirectory",
        "OriginalPath",
        "PublicPath",
        "ContentType",
        "Width",
        "Height",
        "SizeBytes",
        "Sha256",
        "CreatedAt",
        "UpdatedAt"
    )
    SELECT
        12,
        $ProjectId,
        asset_source."OriginalFileName",
        asset_source."StorageDirectory",
        asset_source."PublicPath",
        asset_source."PublicPath",
        asset_source."ContentType",
        asset_source."Width",
        asset_source."Height",
        0,
        'commons-' || asset_source."Key",
        now() at time zone 'utc',
        now() at time zone 'utc'
    FROM asset_source
    WHERE NOT EXISTS (
        SELECT 1 FROM "MediaAssets" existing
        WHERE existing."ProjectId" = $ProjectId
          AND existing."PublicPath" = asset_source."PublicPath"
    )
    RETURNING "PublicPath"
)
UPDATE "Projects"
SET "CoverImagePath" = (SELECT "PublicPath" FROM asset_source WHERE "Key" = 'first-edition'),
    "UpdatedAt" = now() at time zone 'utc'
WHERE "Id" = $ProjectId;

WITH paths AS (
    SELECT * FROM (VALUES
        ('Мастер', 'parting-with-moscow'),
        ('Маргарита', 'margarita-woland'),
        ('Воланд', 'margarita-woland'),
        ('Рукопись романа о Пилате', 'first-edition'),
        ('Патриаршие пруды', 'patriarch-sign'),
        ('Трамвай на Патриарших', 'berlioz-crossing'),
        ('Квартира N 50', 'bolshaya-sadovaya-10'),
        ('Садовая улица', 'bolshaya-sadovaya-10'),
        ('Дом Грибоедова', 'bulgakov-house'),
        ('Подвальчик Мастера', 'apartment-sign'),
        ('Крем Азазелло', 'margarita-woland'),
        ('Свита Воланда', 'about-drawing'),
        ('Бегемот', 'about-drawing'),
        ('Коровьев-Фагот', 'about-drawing'),
        ('Азазелло', 'about-drawing'),
        ('Гелла', 'about-drawing'),
        ('Михаил', 'first-edition')
    ) AS mapping("Name", "Key")
),
asset_source("Key", "PublicPath") AS (
    VALUES
        ('first-edition', '$($publicByKey['first-edition'].Replace("'", "''"))'),
        ('parting-with-moscow', '$($publicByKey['parting-with-moscow'].Replace("'", "''"))'),
        ('margarita-woland', '$($publicByKey['margarita-woland'].Replace("'", "''"))'),
        ('patriarch-sign', '$($publicByKey['patriarch-sign'].Replace("'", "''"))'),
        ('berlioz-crossing', '$($publicByKey['berlioz-crossing'].Replace("'", "''"))'),
        ('bolshaya-sadovaya-10', '$($publicByKey['bolshaya-sadovaya-10'].Replace("'", "''"))'),
        ('bulgakov-house', '$($publicByKey['bulgakov-house'].Replace("'", "''"))'),
        ('apartment-sign', '$($publicByKey['apartment-sign'].Replace("'", "''"))'),
        ('about-drawing', '$($publicByKey['about-drawing'].Replace("'", "''"))')
)
UPDATE "Objects" story_object
SET "ImagePath" = asset_source."PublicPath",
    "UpdatedAt" = now() at time zone 'utc'
FROM paths
JOIN asset_source ON asset_source."Key" = paths."Key"
WHERE story_object."ProjectId" = $ProjectId
  AND story_object."Name" = paths."Name";

WITH paths AS (
    SELECT * FROM (VALUES
        ('Разговор на Патриарших', 'patriarch-sign'),
        ('Предсказание о масле', 'mind-your-head'),
        ('Гибель Берлиоза', 'berlioz-crossing'),
        ('Аннушка проливает масло', 'mind-your-head'),
        ('Погоня Ивана за свитой', 'patriarch-sign'),
        ('Мастер рассказывает Ивану свою историю', 'first-edition'),
        ('Маргарита получает крем Азазелло', 'margarita-woland'),
        ('Бал у сатаны', 'margarita-woland'),
        ('Рукопись возвращается', 'first-edition'),
        ('Прощание Воланда с Москвой', 'parting-with-moscow'),
        ('Полет Мастера и Маргариты', 'parting-with-moscow'),
        ('Покой Мастера и Маргариты', 'parting-with-moscow'),
        ('Эпилог Ивана Бездомного', 'first-edition')
    ) AS mapping("Title", "Key")
),
asset_source("Key", "PublicPath") AS (
    VALUES
        ('first-edition', '$($publicByKey['first-edition'].Replace("'", "''"))'),
        ('parting-with-moscow', '$($publicByKey['parting-with-moscow'].Replace("'", "''"))'),
        ('margarita-woland', '$($publicByKey['margarita-woland'].Replace("'", "''"))'),
        ('patriarch-sign', '$($publicByKey['patriarch-sign'].Replace("'", "''"))'),
        ('berlioz-crossing', '$($publicByKey['berlioz-crossing'].Replace("'", "''"))'),
        ('mind-your-head', '$($publicByKey['mind-your-head'].Replace("'", "''"))')
)
UPDATE "TimelineEvents" timeline_event
SET "ImagePath" = asset_source."PublicPath",
    "UpdatedAt" = now() at time zone 'utc'
FROM paths
JOIN asset_source ON asset_source."Key" = paths."Key"
WHERE timeline_event."ProjectId" = $ProjectId
  AND timeline_event."Title" = paths."Title";

SELECT
    (SELECT count(*) FROM "MediaAssets" WHERE "ProjectId" = $ProjectId AND "Sha256" LIKE 'commons-%') AS commons_assets,
    (SELECT count(*) FROM "Objects" WHERE "ProjectId" = $ProjectId AND "ImagePath" LIKE '/uploads/projects/$ProjectId/images/%/commons-%') AS objects_with_commons_images,
    (SELECT count(*) FROM "TimelineEvents" WHERE "ProjectId" = $ProjectId AND "ImagePath" LIKE '/uploads/projects/$ProjectId/images/%/commons-%') AS timeline_events_with_commons_images;
"@

$sql | docker exec -i storydb-postgres psql -U postgres -d storydb

