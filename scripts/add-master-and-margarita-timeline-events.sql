select set_config('storydb.project_id', :'project_id', false);

create or replace function pg_temp.mm_timeline_id(project_id int)
returns int
language sql
stable
as $fn$
    select "Id"
    from "Timelines"
    where "ProjectId" = project_id
    order by "IsDefault" desc, "Id"
    limit 1
$fn$;

create or replace function pg_temp.mm_image_path(project_id int, category_key text)
returns text
language sql
stable
as $fn$
    select coalesce(
        (select "ImagePath" from "Objects" where "ProjectId" = project_id and "ImagePath" is not null and "Name" = category_key order by "Id" limit 1),
        (select "ImagePath" from "Objects" where "ProjectId" = project_id and "ImagePath" is not null order by "Id" limit 1)
    )
$fn$;

create or replace function pg_temp.mm_event_id(timeline_id int, event_title text)
returns int
language sql
stable
as $fn$
    select "Id"
    from "TimelineEvents"
    where "TimelineId" = timeline_id and "Title" = event_title
    order by "Id"
    limit 1
$fn$;

create or replace function pg_temp.mm_add_event(
    timeline_id int,
    project_id int,
    title text,
    event_type text,
    description text,
    start_label text,
    end_label text,
    start_value numeric,
    end_value numeric,
    category text,
    color text,
    sort_order int,
    image_hint text
)
returns int
language plpgsql
as $fn$
declare
    inserted_id int;
begin
    insert into "TimelineEvents" (
        "ProjectId",
        "TimelineId",
        "Title",
        "Description",
        "StartLabel",
        "EndLabel",
        "StartValue",
        "EndValue",
        "Category",
        "Color",
        "SortOrder",
        "CreatedAt",
        "UpdatedAt",
        "EventType",
        "ParentEventId",
        "ImagePath"
    )
    select
        project_id,
        timeline_id,
        title,
        description,
        start_label,
        end_label,
        start_value,
        end_value,
        category,
        color,
        sort_order,
        now(),
        now(),
        event_type,
        null,
        pg_temp.mm_image_path(project_id, image_hint)
    where not exists (
        select 1
        from "TimelineEvents"
        where "TimelineId" = timeline_id and "Title" = title
    )
    returning "Id" into inserted_id;

    return coalesce(inserted_id, pg_temp.mm_event_id(timeline_id, title));
end
$fn$;

create or replace function pg_temp.mm_add_link(
    timeline_id int,
    source_title text,
    target_title text,
    link_type text,
    description text,
    sort_order int
)
returns void
language plpgsql
as $fn$
declare
    source_id int := pg_temp.mm_event_id(timeline_id, source_title);
    target_id int := pg_temp.mm_event_id(timeline_id, target_title);
begin
    if source_id is null then
        raise exception 'Source timeline event not found: %', source_title;
    end if;

    if target_id is null then
        raise exception 'Target timeline event not found: %', target_title;
    end if;

    insert into "TimelineEventLinks" (
        "TimelineId",
        "SourceEventId",
        "TargetEventId",
        "LinkType",
        "Description",
        "SortOrder",
        "CreatedAt",
        "UpdatedAt"
    )
    select timeline_id, source_id, target_id, link_type, description, sort_order, now(), now()
    where not exists (
        select 1
        from "TimelineEventLinks"
        where "TimelineId" = timeline_id
          and "SourceEventId" = source_id
          and "TargetEventId" = target_id
          and "LinkType" = link_type
    );
end
$fn$;

do $$
declare
    project_id int := current_setting('storydb.project_id')::int;
    timeline_id int := pg_temp.mm_timeline_id(project_id);
    layout_id int;
begin
    if timeline_id is null then
        raise exception 'Timeline not found for project %', project_id;
    end if;

    perform pg_temp.mm_add_event(timeline_id, project_id, 'Предсказание о масле', 'point', 'Воланд заранее описывает гибель Берлиоза, превращая случайность в доказательство иной логики событий.', 'Гл. 1', null, 1.4, null, 'moscow', '#0ea5e9', 14, 'Патриаршие пруды');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Аннушка проливает масло', 'point', 'Бытовая деталь запускает механизм исполнения предсказания и связывает московский абсурд с трагедией.', 'Гл. 3', null, 2.8, null, 'moscow', '#f43f5e', 18, 'Патриаршие пруды');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Погоня Ивана за свитой', 'duration', 'Иван пытается рационально догнать невозможное: погоня переводит его из литературной среды в клинику.', 'Гл. 4', 'Гл. 5', 4, 5.4, 'moscow', '#22c55e', 35, 'Патриаршие пруды');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Степа Лиходеев оказывается в Ялте', 'point', 'Первое крупное исчезновение вокруг квартиры N 50 демонстрирует власть Воланда над московской реальностью.', 'Гл. 7', null, 7, null, 'moscow', '#8b5cf6', 42, 'Ялта');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Никанор Босой получает валюту', 'duration', 'Квартирный и денежный мотивы соединяются в сатирическую линию взяток, страха и разоблачения.', 'Гл. 9', 'Гл. 9', 9, 9.5, 'moscow', '#06b6d4', 44, 'Квартира Никанора Босого');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Допрос Никанора Босого', 'point', 'Валюта превращает бытовую аферу в административный кошмар и продолжает тему московской подозрительности.', 'Гл. 15', null, 15, null, 'moscow', '#0284c7', 62, 'Квартира Никанора Босого');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Сон Никанора о валютчиках', 'duration', 'Сатирический сон сгущает мотив денег и публичного унижения до гротескного театра.', 'Гл. 15', 'Гл. 15', 15.2, 15.8, 'moscow', '#0891b2', 64, 'Квартира Никанора Босого');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Буфетчик Соков приходит к Воланду', 'point', 'Визит Сокова переводит тему денег в тему смерти и показывает, что разоблачение касается не только сцены.', 'Гл. 18', null, 18, null, 'moscow', '#7c3aed', 68, 'Квартира N 50');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'История Фриды', 'duration', 'На балу появляется частная трагедия Фриды, через которую Маргарита выбирает милосердие вместо личной выгоды.', 'Гл. 23', 'Гл. 23', 23.2, 23.5, 'ball', '#be123c', 82, 'Сцена бала');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Маргарита просит за Фриду', 'point', 'Маргарита использует возможность просьбы не для себя, а для освобождения чужой страдающей души.', 'Гл. 24', null, 24.1, null, 'ball', '#fb7185', 88, 'Сцена бала');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Мастер возвращается в квартиру N 50', 'duration', 'После бала Мастер и Маргарита вновь оказываются перед Воландом, где решается судьба рукописи и любви.', 'Гл. 24', 'Гл. 24', 24.2, 24.6, 'love', '#10b981', 92, 'Квартира N 50');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Алоизий Могарыч разоблачен', 'point', 'Доносчик возвращается в сатирический круг возмездия, а история жилья Мастера получает развязку.', 'Гл. 24', null, 24.7, null, 'love', '#14b8a6', 94, 'Подвальчик Мастера');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Пилат пытается спасти Иешуа', 'duration', 'Пилат ищет способ отменить казнь, но власть и страх оказываются сильнее его желания справедливости.', 'Гл. 25', 'Гл. 25', 25, 25.8, 'yershalaim', '#d97706', 96, 'Дворец Ирода Великого');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Левий Матвей проклинает Бога', 'point', 'Левий переживает казнь как личную катастрофу и становится хранителем слов Иешуа.', 'Гл. 26', null, 26.8, null, 'yershalaim', '#92400e', 102, 'Лысая гора');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Коровьев и Бегемот в Торгсине', 'duration', 'Свита доводит московскую линию потребления и жадности до яркого гротескного эпизода.', 'Гл. 28', 'Гл. 28', 28.2, 28.6, 'moscow', '#f97316', 112, 'Торгсин');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Левий Матвей приходит к Воланду', 'point', 'Посланник высшей воли просит Воланда дать Мастеру и Маргарите покой, но не свет.', 'Гл. 29', null, 29, null, 'finale', '#64748b', 114, 'Воробьевы горы');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Прощание Воланда с Москвой', 'duration', 'На Воробьевых горах московская линия завершается уходом свиты и переходом к финальному пути.', 'Гл. 31', 'Гл. 31', 31, 31.6, 'finale', '#475569', 116, 'Воробьевы горы');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Полет Мастера и Маргариты', 'duration', 'Герои покидают московское пространство, а реальные и мистические линии соединяются в финальном движении.', 'Гл. 32', 'Гл. 32', 32, 32.4, 'finale', '#6366f1', 118, 'Воробьевы горы');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Пилат получает освобождение', 'point', 'Мастер завершает судьбу своего героя: Пилат наконец выходит из тысячелетнего одиночества.', 'Финал', null, 32.7, null, 'yershalaim', '#f59e0b', 122, 'Ершалаим');
    perform pg_temp.mm_add_event(timeline_id, project_id, 'Эпилог Ивана Бездомного', 'duration', 'Иван сохраняет память о произошедшем как болезненное, но очищающее знание.', 'Эпилог', 'Эпилог', 33.2, 33.8, 'finale', '#64748b', 124, 'Клиника Стравинского');

    perform pg_temp.mm_add_link(timeline_id, 'Разговор на Патриарших', 'Предсказание о масле', 'causes', 'Предсказание конкретизирует угрозу и готовит гибель Берлиоза.', 12);
    perform pg_temp.mm_add_link(timeline_id, 'Предсказание о масле', 'Аннушка проливает масло', 'causes', 'Бытовая случайность становится механизмом исполнения предсказания.', 14);
    perform pg_temp.mm_add_link(timeline_id, 'Аннушка проливает масло', 'Гибель Берлиоза', 'causes', 'Пролитое масло приводит к трагедии на рельсах.', 16);
    perform pg_temp.mm_add_link(timeline_id, 'Гибель Берлиоза', 'Погоня Ивана за свитой', 'causes', 'Иван пытается догнать виновников после гибели Берлиоза.', 22);
    perform pg_temp.mm_add_link(timeline_id, 'Погоня Ивана за свитой', 'Иван попадает в клинику', 'causes', 'Погоня заканчивается изоляцией Ивана в клинике.', 24);
    perform pg_temp.mm_add_link(timeline_id, 'Степа Лиходеев оказывается в Ялте', 'Сеанс черной магии в Варьете', 'related', 'Исчезновение директора подготавливает хаос вокруг Варьете.', 46);
    perform pg_temp.mm_add_link(timeline_id, 'Никанор Босой получает валюту', 'Допрос Никанора Босого', 'causes', 'Полученная валюта приводит Никанора к расследованию.', 48);
    perform pg_temp.mm_add_link(timeline_id, 'Допрос Никанора Босого', 'Сон Никанора о валютчиках', 'causes', 'Допрос переходит в гротескный сон о деньгах и страхе.', 50);
    perform pg_temp.mm_add_link(timeline_id, 'Буфетчик Соков приходит к Воланду', 'Маргарита получает крем Азазелло', 'related', 'Визит Сокова завершает московскую денежную линию перед переходом к Маргарите.', 67);
    perform pg_temp.mm_add_link(timeline_id, 'Бал у сатаны', 'История Фриды', 'partOf', 'История Фриды раскрывается внутри баловой сцены.', 82);
    perform pg_temp.mm_add_link(timeline_id, 'История Фриды', 'Маргарита просит за Фриду', 'causes', 'Сострадание к Фриде определяет первую просьбу Маргариты.', 84);
    perform pg_temp.mm_add_link(timeline_id, 'Маргарита просит за Фриду', 'Мастер возвращается в квартиру N 50', 'causes', 'Милосердие Маргариты открывает путь к просьбе о Мастере.', 86);
    perform pg_temp.mm_add_link(timeline_id, 'Мастер возвращается в квартиру N 50', 'Рукопись возвращается', 'causes', 'Возвращение Мастера ведет к возвращению рукописи.', 88);
    perform pg_temp.mm_add_link(timeline_id, 'Рукопись возвращается', 'Алоизий Могарыч разоблачен', 'related', 'Возвращение рукописи соседствует с развязкой истории доносчика.', 90);
    perform pg_temp.mm_add_link(timeline_id, 'Допрос Иешуа у Пилата', 'Пилат пытается спасти Иешуа', 'causes', 'После допроса Пилат ищет возможность изменить исход.', 96);
    perform pg_temp.mm_add_link(timeline_id, 'Пилат пытается спасти Иешуа', 'Казнь на Лысой горе', 'causes', 'Попытка спасения терпит поражение и ведет к казни.', 98);
    perform pg_temp.mm_add_link(timeline_id, 'Казнь на Лысой горе', 'Левий Матвей проклинает Бога', 'causes', 'Казнь становится духовным переломом Левия.', 100);
    perform pg_temp.mm_add_link(timeline_id, 'Пожар в Доме Грибоедова', 'Коровьев и Бегемот в Торгсине', 'related', 'Финальные московские разрушения продолжают сатирический разгром.', 112);
    perform pg_temp.mm_add_link(timeline_id, 'Левий Матвей приходит к Воланду', 'Покой Мастера и Маргариты', 'causes', 'Просьба Левия определяет итоговую форму судьбы героев.', 114);
    perform pg_temp.mm_add_link(timeline_id, 'Прощание Воланда с Москвой', 'Полет Мастера и Маргариты', 'causes', 'Уход свиты открывает финальный путь героев.', 116);
    perform pg_temp.mm_add_link(timeline_id, 'Полет Мастера и Маргариты', 'Пилат получает освобождение', 'causes', 'Финальный путь связан с освобождением героя романа Мастера.', 118);
    perform pg_temp.mm_add_link(timeline_id, 'Покой Мастера и Маргариты', 'Эпилог Ивана Бездомного', 'related', 'Эпилог показывает остаточное действие истории на Ивана.', 120);

    select "Id" into layout_id
    from "TimelineLayouts"
    where "TimelineId" = timeline_id and "OwnerUserId" is null
    order by "IsDefault" desc, "GeneratedAt" desc, "Id" desc
    limit 1;

    if layout_id is null then
        insert into "TimelineLayouts" ("TimelineId", "OwnerUserId", "AlgorithmVersion", "IsDefault", "IsStale", "GeneratedAt", "CreatedAt", "UpdatedAt")
        values (timeline_id, null, 'timeline-manual-demo-v1', true, false, now(), now(), now())
        returning "Id" into layout_id;
    else
        update "TimelineLayouts"
        set "AlgorithmVersion" = 'timeline-manual-demo-v1',
            "IsDefault" = true,
            "IsStale" = false,
            "GeneratedAt" = now(),
            "UpdatedAt" = now()
        where "Id" = layout_id;

        delete from "TimelineLayoutItems" where "TimelineLayoutId" = layout_id;
    end if;

    insert into "TimelineLayoutItems" ("TimelineLayoutId", "TimelineEventId", "X", "Y", "Width", "Height", "Lane", "Layer", "IsPinned", "CreatedAt", "UpdatedAt")
    select
        layout_id,
        e."Id",
        96 + (coalesce(e."StartValue", e."SortOrder") - 1) / 32.8 * 960,
        case e."Category"
            when 'yershalaim' then 462
            when 'love' then 558
            when 'ball' then 654
            when 'finale' then 750
            else 366
        end,
        case when e."EventType" = 'point' then 22 else 180 end,
        case when e."EventType" = 'point' then 22 else 64 end,
        case e."Category"
            when 'yershalaim' then 1
            when 'love' then 2
            when 'ball' then 3
            when 'finale' then 4
            else 0
        end,
        0,
        false,
        now(),
        now()
    from "TimelineEvents" e
    where e."TimelineId" = timeline_id
    order by e."StartValue" nulls last, e."SortOrder", e."Id";

    raise notice 'Timeline now has % events and % layout items',
        (select count(*) from "TimelineEvents" where "TimelineId" = timeline_id),
        (select count(*) from "TimelineLayoutItems" where "TimelineLayoutId" = layout_id);
end
$$;
