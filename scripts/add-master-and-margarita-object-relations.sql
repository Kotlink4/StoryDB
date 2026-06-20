select set_config('storydb.project_id', :'project_id', false);

create or replace function pg_temp.mm_object_id(project_id int, object_name text, type_key text default null)
returns int
language sql
stable
as $fn$
    select o."Id"
    from "Objects" o
    join "ObjectTypes" ot on ot."Id" = o."ObjectTypeId"
    where o."ProjectId" = project_id
      and o."Name" = object_name
      and (type_key is null or ot."Key" = type_key)
    order by o."Id"
    limit 1
$fn$;

create or replace function pg_temp.mm_add_object_relation(
    project_id int,
    source_name text,
    source_type text,
    target_name text,
    target_type text,
    relation_type text
)
returns int
language plpgsql
as $fn$
declare
    source_id int := pg_temp.mm_object_id(project_id, source_name, source_type);
    target_id int := pg_temp.mm_object_id(project_id, target_name, target_type);
    inserted int := 0;
begin
    if source_id is null then
        raise exception 'Source object not found: % (%)', source_name, source_type;
    end if;

    if target_id is null then
        raise exception 'Target object not found: % (%)', target_name, target_type;
    end if;

    insert into "ObjectRelations" ("SourceObjectId", "TargetObjectId", "RelationType", "SortOrder")
    select source_id, target_id, relation_type, 0
    where not exists (
        select 1
        from "ObjectRelations"
        where "SourceObjectId" = source_id
          and "TargetObjectId" = target_id
          and "RelationType" = relation_type
    );

    get diagnostics inserted = row_count;
    return inserted;
end
$fn$;

create or replace function pg_temp.mm_add_ownership(project_id int, owner_name text, item_name text)
returns int
language plpgsql
as $fn$
declare
    owner_id int := pg_temp.mm_object_id(project_id, owner_name, 'characters');
    item_id int := pg_temp.mm_object_id(project_id, item_name, 'items');
    inserted int := 0;
begin
    if owner_id is null then
        raise exception 'Owner character not found: %', owner_name;
    end if;

    if item_id is null then
        raise exception 'Item not found: %', item_name;
    end if;

    insert into "ObjectOwnerships" ("OwnerCharacterId", "ItemObjectId", "SortOrder")
    select owner_id, item_id, 0
    where not exists (
        select 1
        from "ObjectOwnerships"
        where "OwnerCharacterId" = owner_id
          and "ItemObjectId" = item_id
    );

    get diagnostics inserted = row_count;
    return inserted;
end
$fn$;

do $$
declare
    inserted_object_relations int := 0;
    inserted_ownerships int := 0;
begin
    inserted_ownerships := inserted_ownerships + pg_temp.mm_add_ownership(current_setting('storydb.project_id')::int, 'Воланд', 'Глобус Воланда');
    inserted_ownerships := inserted_ownerships + pg_temp.mm_add_ownership(current_setting('storydb.project_id')::int, 'Воланд', 'Трость Воланда');
    inserted_ownerships := inserted_ownerships + pg_temp.mm_add_ownership(current_setting('storydb.project_id')::int, 'Маргарита', 'Золотая подкова');
    inserted_ownerships := inserted_ownerships + pg_temp.mm_add_ownership(current_setting('storydb.project_id')::int, 'Маргарита', 'Метла Маргариты');
    inserted_ownerships := inserted_ownerships + pg_temp.mm_add_ownership(current_setting('storydb.project_id')::int, 'Никанор', 'Валюта Никанора Босого');
    inserted_ownerships := inserted_ownerships + pg_temp.mm_add_ownership(current_setting('storydb.project_id')::int, 'Прохор', 'Костюм Прохора Петровича');
    inserted_ownerships := inserted_ownerships + pg_temp.mm_add_ownership(current_setting('storydb.project_id')::int, 'Левий', 'Записка Левия Матвея');
    inserted_ownerships := inserted_ownerships + pg_temp.mm_add_ownership(current_setting('storydb.project_id')::int, 'Максимилиан', 'Телеграмма Поплавского');
    inserted_ownerships := inserted_ownerships + pg_temp.mm_add_ownership(current_setting('storydb.project_id')::int, 'Михаил', 'Папка МАССОЛИТа');

    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Афиша сеанса черной магии', 'items', 'Театр Варьете', 'places', 'анонсирует событие');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Билет на сеанс Варьете', 'items', 'Театр Варьете', 'places', 'доступ к событию');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Деньги из Варьете', 'items', 'Театр Варьете', 'places', 'след мистификации');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Трамвай на Патриарших', 'items', 'Патриаршие пруды', 'places', 'место трагедии');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Трамвай на Патриарших', 'items', 'Аннушка', 'characters', 'причина развязки');

    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Патриаршие пруды', 'places', 'Воланд', 'characters', 'место первой встречи');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Патриаршие пруды', 'places', 'Михаил', 'characters', 'место гибели');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Подвальчик Мастера', 'places', 'Мастер', 'characters', 'убежище');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Особняк Маргариты', 'places', 'Маргарита', 'characters', 'дом героини');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Квартира Латунского', 'places', 'Латунский', 'characters', 'место мести');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Квартира Никанора Босого', 'places', 'Никанор', 'characters', 'место обыска');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Садовая улица', 'places', 'Квартира N 50', 'places', 'адрес мистического узла');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Торгсин', 'places', 'Бегемот', 'characters', 'сцена разрушения');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Ялта', 'places', 'Степан', 'characters', 'место перемещения');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Клиника Стравинского', 'places', 'Доктор', 'characters', 'место работы');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Клиника Стравинского', 'places', 'Иван', 'characters', 'место лечения');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Александровский сад', 'places', 'Маргарита', 'characters', 'место ожидания');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Воробьевы горы', 'places', 'Воланд', 'characters', 'финальная точка');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Сцена бала', 'places', 'Маргарита', 'characters', 'роль королевы бала');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Ершалаим', 'places', 'Понтий', 'characters', 'пространство власти');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Гефсиманский сад', 'places', 'Иуда', 'characters', 'место предательства');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Кедрон', 'places', 'Левий', 'characters', 'путь ершалаимской линии');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Лысая гора', 'places', 'Иешуа', 'characters', 'место казни');

    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Зрелищная комиссия', 'organizations', 'Прохор', 'characters', 'административный абсурд');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Клиника Стравинского', 'organizations', 'Доктор', 'characters', 'руководит');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Ресторан Дома Грибоедова', 'organizations', 'Арчибальд', 'characters', 'управляет рестораном');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Римская администрация Иудеи', 'organizations', 'Понтий', 'characters', 'военная власть');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Синедрион', 'organizations', 'Иосиф', 'characters', 'религиозная власть');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Следственная группа по делу Воланда', 'organizations', 'Иван', 'characters', 'свидетель расследования');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'МАССОЛИТ', 'organizations', 'Дом Грибоедова', 'places', 'расположен в');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Театр Варьете', 'organizations', 'Театр Варьете', 'places', 'занимает площадку');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Свита Воланда', 'organizations', 'Квартира N 50', 'places', 'штаб в Москве');
    inserted_object_relations := inserted_object_relations + pg_temp.mm_add_object_relation(current_setting('storydb.project_id')::int, 'Власть Ершалаима', 'organizations', 'Дворец Ирода Великого', 'places', 'центр власти');

    update "RelationGraphLayouts"
    set "IsStale" = true,
        "UpdatedAt" = now()
    where "ProjectId" = current_setting('storydb.project_id')::int;

    raise notice 'Inserted object relations: %, ownerships: %', inserted_object_relations, inserted_ownerships;
end
$$;

