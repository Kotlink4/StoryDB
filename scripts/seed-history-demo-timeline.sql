do $$
declare
  project_id int;
  timeline_id int;
begin
  select "Id" into project_id
  from "Projects"
  where lower("Name") = lower('история')
  order by "Id"
  limit 1;

  if project_id is null then
    raise notice 'Project история was not found.';
    return;
  end if;

  select "Id" into timeline_id
  from "Timelines"
  where "ProjectId" = project_id and "IsDefault"
  order by "Id"
  limit 1;

  if timeline_id is null then
    insert into "Timelines" ("ProjectId", "Name", "Mode", "IsDefault", "SortOrder", "CreatedAt", "UpdatedAt")
    values (project_id, 'История мира', 'dated', true, 0, now(), now())
    returning "Id" into timeline_id;
  end if;

  update "Timelines"
  set "Name" = 'История мира',
      "Mode" = 'dated',
      "UpdatedAt" = now()
  where "Id" = timeline_id;

  update "TimelineEvents"
  set "Title" = 'Эпоха Раскола',
      "Description" = 'Долгий период после падения старой столицы: мир распался на дома, ордена и свободные города.',
      "StartLabel" = '0 год',
      "EndLabel" = '520 год',
      "Color" = '#64748b',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 0;

  update "TimelineEvents"
  set "Title" = 'Война трех домов',
      "Description" = 'Долгая война за руины Черной башни и право хранить древнюю печать.',
      "StartLabel" = '120',
      "EndLabel" = '260',
      "Color" = '#dc2626',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 1;

  update "TimelineEvents"
  set "Title" = 'Падение Черной башни',
      "Description" = 'Башня рушится во время последней осады, а ее архив исчезает.',
      "StartLabel" = '146',
      "Color" = '#dc2626',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 2;

  update "TimelineEvents"
  set "Title" = 'Ариса находит печать',
      "Description" = 'Ариса получает предмет, который связывает ее с забытым договором старых домов.',
      "StartLabel" = '210',
      "Color" = '#059669',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 3;

  update "TimelineEvents"
  set "Title" = 'Клятва Ареса и Руфуса',
      "Description" = 'Персонажи заключают союз, который позднее меняет расстановку сил.',
      "StartLabel" = '280',
      "Color" = '#2563eb',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 4;

  update "TimelineEvents"
  set "Title" = 'Исход северян',
      "Description" = 'Несколько городов уходят за горы после слухов о пробуждении древнего механизма.',
      "StartLabel" = '300',
      "EndLabel" = '430',
      "Color" = '#7c3aed',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 5;

  update "TimelineEvents"
  set "Title" = 'Открытие врат',
      "Description" = 'На границе эпохи найден проход, который считался легендой.',
      "StartLabel" = '420',
      "Color" = '#7c3aed',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 6;

  update "TimelineEvents"
  set "Title" = 'Совет Каэля',
      "Description" = 'Каэль собирает оставшихся лидеров и предлагает новый порядок мира.',
      "StartLabel" = '500',
      "Color" = '#f59e0b',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 7;

  update "TimelineEvents"
  set "Title" = 'Глава 1: Пепельный город',
      "Description" = null,
      "StartLabel" = '80',
      "Color" = '#0f172a',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 8;

  update "TimelineEvents"
  set "Title" = 'Глава 2: Договор у моста',
      "Description" = null,
      "StartLabel" = '250',
      "Color" = '#0f172a',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 9;

  update "TimelineEvents"
  set "Title" = 'Глава 3: Возвращение Арисы',
      "Description" = null,
      "StartLabel" = '470',
      "Color" = '#0f172a',
      "UpdatedAt" = now()
  where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 10;

  update "TimelineEventLinks"
  set "Description" = 'Точечное событие внутри войны.',
      "UpdatedAt" = now()
  where "TimelineId" = timeline_id and "SortOrder" = 0;

  update "TimelineEventLinks"
  set "Description" = 'После падения башни печать выходит из тайника.',
      "UpdatedAt" = now()
  where "TimelineId" = timeline_id and "SortOrder" = 1;

  update "TimelineParticipants"
  set "Role" = 'находит печать'
  where "TimelineEventId" in (
    select "Id" from "TimelineEvents" where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 3
  );

  update "TimelineParticipants"
  set "Role" = 'возвращается к вратам'
  where "TimelineEventId" in (
    select "Id" from "TimelineEvents" where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 6
  );

  update "TimelineParticipants"
  set "Role" = 'созывает совет'
  where "TimelineEventId" in (
    select "Id" from "TimelineEvents" where "ProjectId" = project_id and "Category" = 'demo' and "SortOrder" = 7
  );
end $$;
