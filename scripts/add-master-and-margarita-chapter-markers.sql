DO $$
DECLARE
    project_id integer := COALESCE(NULLIF(current_setting('storydb.project_id', true), '')::integer, 70);
    timeline_id integer;
    layout_id integer;
    now_utc timestamp with time zone := now() at time zone 'utc';
    min_value numeric;
    max_value numeric;
BEGIN
    SELECT "Id"
    INTO timeline_id
    FROM "Timelines"
    WHERE "ProjectId" = project_id
    ORDER BY "Id"
    LIMIT 1;

    IF timeline_id IS NULL THEN
        RAISE EXCEPTION 'Timeline for project % was not found', project_id;
    END IF;

    WITH chapter_markers("Title", "StartValue", "SortOrder", "Description") AS (
        VALUES
            ('Глава 1. Никогда не разговаривайте с неизвестными', 1.0, 1001, 'Завязка московской линии: Берлиоз, Иван и появление Воланда.'),
            ('Глава 2. Понтий Пилат', 2.0, 1002, 'Первый ершалаимский фрагмент: допрос Иешуа.'),
            ('Глава 3. Седьмое доказательство', 3.0, 1003, 'Гибель Берлиоза подтверждает пророчество Воланда.'),
            ('Глава 4. Погоня', 4.0, 1004, 'Иван пытается догнать странную компанию.'),
            ('Глава 5. Было дело в Грибоедове', 5.0, 1005, 'Московская литературная среда после смерти Берлиоза.'),
            ('Глава 6. Шизофрения, как и было сказано', 6.0, 1006, 'Ивана помещают в клинику Стравинского.'),
            ('Глава 7. Нехорошая квартира', 7.0, 1007, 'Квартира N 50 становится центром московских чудес.'),
            ('Глава 8. Поединок между профессором и поэтом', 8.0, 1008, 'Разговор Ивана с врачом и первые сомнения героя.'),
            ('Глава 9. Коровьевские штуки', 9.0, 1009, 'Никанор Босой оказывается втянут в валютную аферу.'),
            ('Глава 10. Вести из Ялты', 10.0, 1010, 'История Степы Лиходеева получает административное продолжение.'),
            ('Глава 11. Раздвоение Ивана', 11.0, 1011, 'Иван постепенно отходит от прежней роли поэта Бездомного.'),
            ('Глава 12. Черная магия и ее разоблачение', 12.0, 1012, 'Сеанс Воланда в Варьете разрушает видимость московского порядка.'),
            ('Глава 13. Явление героя', 13.0, 1013, 'Мастер рассказывает Ивану историю романа и Маргариты.'),
            ('Глава 14. Слава петуху!', 14.0, 1014, 'Последствия сеанса и ночные события вокруг квартиры N 50.'),
            ('Глава 15. Сон Никанора Ивановича', 15.0, 1015, 'Сатирическая сцена сна о валютчиках.'),
            ('Глава 16. Казнь', 16.0, 1016, 'Ершалаимская линия выходит к казни Иешуа.'),
            ('Глава 17. Беспокойный день', 17.0, 1017, 'Москва пытается объяснить последствия действий свиты Воланда.'),
            ('Глава 18. Неудачливые визитеры', 18.0, 1018, 'Буфетчик Соков и другие посетители сталкиваются с Воландом.'),
            ('Глава 19. Маргарита', 19.0, 1019, 'Маргарита входит в активное действие романа.'),
            ('Глава 20. Крем Азазелло', 20.0, 1020, 'Маргарита принимает предложение Азазелло.'),
            ('Глава 21. Полет', 21.0, 1021, 'Маргарита обретает свободу и покидает прежнюю жизнь.'),
            ('Глава 22. При свечах', 22.0, 1022, 'Маргарита оказывается в пространстве Воланда.'),
            ('Глава 23. Великий бал у сатаны', 23.0, 1023, 'Бал становится кульминацией фантастической линии.'),
            ('Глава 24. Извлечение мастера', 24.0, 1024, 'Мастер возвращается, рукопись восстановлена.'),
            ('Глава 25. Как прокуратор пытался спасти Иуду из Кириафа', 25.0, 1025, 'Пилат пытается повлиять на последствия казни.'),
            ('Глава 26. Погребение', 26.0, 1026, 'Завершение ершалаимской линии вокруг смерти Иешуа.'),
            ('Глава 27. Конец квартиры N 50', 27.0, 1027, 'Московская линия приближается к разоблачению и пожару.'),
            ('Глава 28. Последние похождения Коровьева и Бегемота', 28.0, 1028, 'Коровьев и Бегемот завершают московские проделки.'),
            ('Глава 29. Судьба мастера и Маргариты определена', 29.0, 1029, 'Левий Матвей приносит Воланду решение о судьбе героев.'),
            ('Глава 30. Пора! Пора!', 30.0, 1030, 'Герои покидают Москву.'),
            ('Глава 31. На Воробьевых горах', 31.0, 1031, 'Последний взгляд на Москву перед уходом.'),
            ('Глава 32. Прощение и вечный приют', 32.0, 1032, 'Мастер, Маргарита и Пилат получают завершение своих линий.'),
            ('Эпилог', 33.0, 1033, 'Послесловие о следах событий в жизни Ивана и Москвы.')
    )
    INSERT INTO "TimelineEvents" (
        "ProjectId",
        "TimelineId",
        "Title",
        "EventType",
        "Description",
        "StartLabel",
        "StartValue",
        "Category",
        "Color",
        "SortOrder",
        "CreatedAt",
        "UpdatedAt"
    )
    SELECT
        project_id,
        timeline_id,
        chapter_markers."Title",
        'chapter',
        chapter_markers."Description",
        CASE
            WHEN chapter_markers."Title" = 'Эпилог' THEN 'Эпилог'
            ELSE replace(split_part(chapter_markers."Title", '.', 1), 'Глава ', 'Гл. ')
        END,
        chapter_markers."StartValue",
        'Глава',
        '#7c3aed',
        chapter_markers."SortOrder",
        now_utc,
        now_utc
    FROM chapter_markers
    WHERE NOT EXISTS (
        SELECT 1
        FROM "TimelineEvents" existing
        WHERE existing."ProjectId" = project_id
          AND existing."TimelineId" = timeline_id
          AND existing."EventType" = 'chapter'
          AND existing."Title" = chapter_markers."Title"
    );

    SELECT "Id"
    INTO layout_id
    FROM "TimelineLayouts"
    WHERE "TimelineId" = timeline_id
    ORDER BY "Id" DESC
    LIMIT 1;

    IF layout_id IS NULL THEN
        INSERT INTO "TimelineLayouts" ("TimelineId", "AlgorithmVersion", "GeneratedAt", "IsStale", "CreatedAt", "UpdatedAt")
        VALUES (timeline_id, 'timeline-manual-demo-v1', now_utc, false, now_utc, now_utc)
        RETURNING "Id" INTO layout_id;
    END IF;

    SELECT
        min("StartValue"),
        max(coalesce("EndValue", "StartValue"))
    INTO min_value, max_value
    FROM "TimelineEvents"
    WHERE "TimelineId" = timeline_id;

    IF max_value <= min_value THEN
        max_value := min_value + 1;
    END IF;

    INSERT INTO "TimelineLayoutItems" (
        "TimelineLayoutId",
        "TimelineEventId",
        "X",
        "Y",
        "Width",
        "Height",
        "Lane",
        "Layer",
        "IsPinned",
        "CreatedAt",
        "UpdatedAt"
    )
    SELECT
        layout_id,
        timeline_event."Id",
        96 + (timeline_event."StartValue" - min_value) / (max_value - min_value) * 960,
        674,
        2,
        220,
        -1,
        1,
        true,
        now_utc,
        now_utc
    FROM "TimelineEvents" timeline_event
    WHERE timeline_event."ProjectId" = project_id
      AND timeline_event."TimelineId" = timeline_id
      AND timeline_event."EventType" = 'chapter'
      AND NOT EXISTS (
          SELECT 1
          FROM "TimelineLayoutItems" existing_item
          WHERE existing_item."TimelineLayoutId" = layout_id
            AND existing_item."TimelineEventId" = timeline_event."Id"
      );

    UPDATE "TimelineLayouts"
    SET "AlgorithmVersion" = 'timeline-manual-demo-v1',
        "GeneratedAt" = now_utc,
        "IsStale" = false,
        "UpdatedAt" = now_utc
    WHERE "Id" = layout_id;

    RAISE NOTICE 'Timeline % now has % chapter markers and % total events',
        timeline_id,
        (SELECT count(*) FROM "TimelineEvents" WHERE "TimelineId" = timeline_id AND "EventType" = 'chapter'),
        (SELECT count(*) FROM "TimelineEvents" WHERE "TimelineId" = timeline_id);
END $$;
