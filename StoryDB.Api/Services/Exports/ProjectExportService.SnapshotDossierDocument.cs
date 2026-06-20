using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using StoryDB.Api.Contracts.Exports;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Contracts.Projects;
using StoryDB.Api.Contracts.Structures;
using Wp = DocumentFormat.OpenXml.Wordprocessing;

namespace StoryDB.Api.Services.Exports;

public sealed partial class ProjectExportService
{
    private byte[] BuildDossierDocument(
        ProjectSnapshotDataDto snapshotData,
        IReadOnlyList<StoryObjectDto> objects,
        ProjectDossierExportRequest request)
    {
        using var stream = new MemoryStream();
        using (var document = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document))
        {
            var mainPart = document.AddMainDocumentPart();
            AddStyles(mainPart);

            var body = new Wp.Body();
            mainPart.Document = new Wp.Document(body);

            var groupedObjects = objects
                .GroupBy(storyObject => GetObjectTypeLabel(snapshotData, storyObject))
                .Select(group => new SnapshotObjectTypeExportGroup(group.Key, group.ToList()))
                .ToList();

            AddCoverPage(body, snapshotData.Project, groupedObjects, objects.Count);

            foreach (var group in groupedObjects)
            {
                AddPageBreak(body);
                AddObjectTypeSection(body, group.Label, group.Objects.Count);

                for (var index = 0; index < group.Objects.Count; index += 1)
                {
                    if (index > 0)
                    {
                        AddPageBreak(body);
                    }

                    AddObjectDossier(mainPart, body, snapshotData, group.Objects[index], request);
                }
            }

            body.Append(new Wp.SectionProperties(
                new Wp.PageSize { Width = 12240, Height = 15840 },
                new Wp.PageMargin
                {
                    Top = 1440,
                    Right = 1440,
                    Bottom = 1440,
                    Left = 1440,
                    Header = 720,
                    Footer = 720,
                    Gutter = 0,
                }));

            mainPart.Document.Save();
        }

        return stream.ToArray();
    }

    private void AddObjectDossier(
        MainDocumentPart mainPart,
        Wp.Body body,
        ProjectSnapshotDataDto snapshotData,
        StoryObjectDto storyObject,
        ProjectDossierExportRequest request)
    {
        var objectType = GetObjectTypeLabel(snapshotData, storyObject);
        AddParagraph(body, GetObjectDisplayName(storyObject), "Heading1");
        AddParagraph(body, $"{objectType} · Сохраненное состояние", "Muted");
        AddSnapshotPassportBlock(mainPart, body, snapshotData, storyObject, objectType);

        AddParagraph(body, "Описание", "Heading2");
        AddParagraph(body, IsBlank(storyObject.Description) ? "Описание пока не заполнено." : storyObject.Description!);

        if (request.IncludeAttributes)
        {
            AddAttributes(body, snapshotData, storyObject);
        }

        if (request.IncludeCatalogs)
        {
            AddCatalogSelections(body, storyObject);
        }

        if (request.IncludeStructureAssignments)
        {
            AddStructureAssignments(body, snapshotData, storyObject);
        }

        if (request.IncludeRelations)
        {
            AddObjectLinks(body, storyObject);
            AddCharacterRelationships(body, storyObject);
        }
    }

    private void AddSnapshotPassportBlock(
        MainDocumentPart mainPart,
        Wp.Body body,
        ProjectSnapshotDataDto snapshotData,
        StoryObjectDto storyObject,
        string objectType)
    {
        var table = CreateTable(new[] { 2500, 6860 });
        var row = new Wp.TableRow();

        var portrait = CreatePortraitParagraph(mainPart, storyObject);
        var imageChildren = portrait is null
            ? new[]
            {
                CreateParagraphWithText(
                    IsBlank(storyObject.ImagePath) ? "Портрет\nне задан" : "Портрет\nнедоступен",
                    "Muted",
                    alignment: Wp.JustificationValues.Center,
                    spacingBefore: "420",
                    spacingAfter: "420"),
            }
            : new[] { portrait };

        row.Append(
            CreateCell(imageChildren, fill: portrait is null ? LightBlueFill : "FFFFFF"),
            CreateCell(new OpenXmlElement[]
            {
                CreateParagraphWithText("ДОСЬЕ ОБЪЕКТА", "MetaLabel"),
                CreateParagraphWithText(GetObjectDisplayName(storyObject), "ObjectTitle"),
                CreateParagraphWithText(objectType, "Muted"),
                CreateFactTable(new[]
                {
                    ("Статус", ValueOrDash(storyObject.CurrentStatus)),
                    ("Возраст / время", ValueOrDash(storyObject.Age)),
                    ("Роль", ValueOrDash(storyObject.Role)),
                    ("Фамилия / дом", ValueOrDash(storyObject.Surname)),
                    ("Каталог", GetPrimaryCatalog(storyObject)),
                    ("Структура", GetPrimaryStructure(snapshotData, storyObject)),
                }),
            }));

        table.Append(row);
        body.Append(table);
    }

    private Wp.Paragraph? CreatePortraitParagraph(MainDocumentPart mainPart, StoryObjectDto storyObject) =>
        CreatePortraitParagraph(mainPart, storyObject.Id, storyObject.ImagePath, GetObjectDisplayName(storyObject));

    private static void AddCoverPage(
        Wp.Body body,
        ProjectSnapshotProjectDto project,
        IReadOnlyList<SnapshotObjectTypeExportGroup> groupedObjects,
        int objectCount)
    {
        AddParagraph(body, "StoryDB", "Kicker", alignment: Wp.JustificationValues.Center);
        AddParagraph(body, "Экспорт досье", "CoverTitle", alignment: Wp.JustificationValues.Center);
        AddParagraph(
            body,
            "Единый Word-формат для персонажей, организаций, предметов и мест",
            "Subtitle",
            alignment: Wp.JustificationValues.Center);

        var exportedAt = DateTime.UtcNow;
        AddKeyValueGrid(body, new[]
        {
            ("Проект", project.Name),
            ("Тип экспорта", "Выбранные досье"),
            ("Объектов", objectCount.ToString()),
            ("Дата", $"{exportedAt:yyyy-MM-dd HH:mm} UTC"),
            ("Автор", "StoryDB"),
            ("Версия", "1.0"),
            ("Контекст", "Сохраненное состояние"),
            ("Доступ", project.Visibility),
        }, columns: 4);

        AddParagraph(body, "Содержание", "Heading2");
        foreach (var group in groupedObjects)
        {
            AddParagraph(body, $"{group.Label} ({group.Objects.Count})", "Heading3");
            AddSimpleList(body, group.Objects.Select(GetObjectDisplayName));
        }
    }

    private static void AddAttributes(
        Wp.Body body,
        ProjectSnapshotDataDto snapshotData,
        StoryObjectDto storyObject)
    {
        AddParagraph(body, "Характеристики", "Heading2");
        var definitionsById = snapshotData.AttributeDefinitionsByType
            .Values
            .SelectMany(definitions => definitions)
            .GroupBy(definition => definition.Id)
            .ToDictionary(group => group.Key, group => group.First());
        var attributes = storyObject.Attributes
            .OrderBy(attribute => definitionsById.TryGetValue(attribute.AttributeDefinitionId, out var definition)
                ? definition.GroupName ?? ""
                : "")
            .ThenBy(attribute => attribute.Name)
            .ToList();

        if (attributes.Count == 0)
        {
            AddParagraph(body, "Характеристик пока нет.", "Muted");
            return;
        }

        AddDataTable(
            body,
            new[] { 1900, 2480, 2480, 2500 },
            new[] { "Группа", "Характеристика", "Значение", "Комментарий" },
            attributes.Select(attribute => new[]
            {
                definitionsById.TryGetValue(attribute.AttributeDefinitionId, out var definition)
                    ? ValueOrDash(definition.GroupName)
                    : "-",
                ValueOrDash(attribute.Name),
                ValueOrDash(attribute.Value),
                "-",
            }));
    }

    private static void AddCatalogSelections(Wp.Body body, StoryObjectDto storyObject)
    {
        AddParagraph(body, "Каталоги", "Heading2");
        var selections = storyObject.CatalogSelections
            .OrderBy(selection => selection.CatalogName)
            .ThenBy(selection => selection.CatalogEntryGroupName ?? "")
            .ThenBy(selection => selection.CatalogEntryName ?? "")
            .ToList();

        if (selections.Count == 0)
        {
            AddParagraph(body, "Каталожных значений пока нет.", "Muted");
            return;
        }

        AddDataTable(
            body,
            new[] { 2500, 3430, 3430 },
            new[] { "Раздел", "Запись", "Контекст" },
            selections.Select(selection =>
            {
                var value = selection.CatalogEntryName ??
                    selection.CatalogEntryGroupName ??
                    selection.TargetType;
                if (!IsBlank(selection.CatalogEntryGroupName) &&
                    !string.Equals(selection.CatalogEntryGroupName, value, StringComparison.Ordinal))
                {
                    value = $"{selection.CatalogEntryGroupName} / {value}";
                }

                return new[]
                {
                    selection.CatalogName,
                    ValueOrDash(value),
                    "Сохраненное состояние",
                };
            }));
    }

    private static void AddStructureAssignments(
        Wp.Body body,
        ProjectSnapshotDataDto snapshotData,
        StoryObjectDto storyObject)
    {
        AddParagraph(body, "Принадлежность к структурам", "Heading2");
        var assignments = GetObjectStructureAssignments(snapshotData, storyObject)
            .OrderBy(assignment => assignment.StructureName)
            .ThenBy(assignment => assignment.StructureNodeName)
            .ThenBy(assignment => assignment.SortOrder)
            .ToList();

        if (assignments.Count == 0)
        {
            AddParagraph(body, "Принадлежность к структурам пока не задана.", "Muted");
            return;
        }

        AddDataTable(
            body,
            new[] { 2500, 3430, 3430 },
            new[] { "Структура", "Узел", "Роль / заметки" },
            assignments.Select(assignment =>
            {
                var notes = string.Join(" · ", new[] { assignment.RoleLabel, assignment.Notes }.Where(value => !IsBlank(value)));
                return new[] { assignment.StructureName, assignment.StructureNodeName, ValueOrDash(notes) };
            }));
    }

    private static void AddObjectLinks(Wp.Body body, StoryObjectDto storyObject)
    {
        AddParagraph(body, "Связанные объекты", "Heading2");
        var rows = new List<string[]>();
        var sourceName = GetObjectDisplayName(storyObject);

        AddReferenceRows(rows, sourceName, storyObject.OwnedItems, "Владеет");
        AddReferenceRows(rows, sourceName, storyObject.Owners, "Владелец");
        AddReferenceRows(rows, sourceName, storyObject.TerritoryPlaces, "На территории");
        AddReferenceRows(rows, sourceName, storyObject.OrganizationsOnTerritory, "Организация на территории");
        AddReferenceRows(rows, sourceName, storyObject.OwnerOrganizations, "Организация-владелец");
        AddReferenceRows(rows, sourceName, storyObject.OwnedTerritories, "Владеет территорией");
        AddReferenceRows(rows, sourceName, storyObject.HierarchyParents, "Родитель");
        AddReferenceRows(rows, sourceName, storyObject.HierarchyChildren, "Подчиненный объект");

        if (rows.Count == 0)
        {
            AddParagraph(body, "Связанных объектов пока нет.", "Muted");
            return;
        }

        AddDataTable(body, new[] { 2200, 2200, 2100, 2860 }, new[] { "Источник", "Цель", "Тип", "Описание" }, rows);
    }

    private static void AddCharacterRelationships(Wp.Body body, StoryObjectDto storyObject)
    {
        if (!string.Equals(storyObject.TypeKey, "characters", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        AddParagraph(body, "Отношения персонажа", "Heading2");
        var rows = new List<string[]>();
        var sourceName = GetObjectDisplayName(storyObject);

        foreach (var relationship in storyObject.OutgoingCharacterRelationships)
        {
            rows.Add(new[]
            {
                sourceName,
                GetReferenceDisplayName(relationship.Character),
                relationship.RelationType,
                $"Сила {relationship.Strength}% · напряжение {relationship.Tension}%" +
                (relationship.IsBidirectional ? " · двусторонняя" : "") +
                (IsBlank(relationship.Description) ? "" : $" · {relationship.Description}"),
            });
        }

        foreach (var relationship in storyObject.IncomingCharacterRelationships)
        {
            rows.Add(new[]
            {
                GetReferenceDisplayName(relationship.Character),
                sourceName,
                relationship.RelationType,
                "Входящая связь",
            });
        }

        if (rows.Count == 0)
        {
            AddParagraph(body, "Отношений пока нет.", "Muted");
            return;
        }

        AddDataTable(body, new[] { 2200, 2200, 2100, 2860 }, new[] { "Источник", "Цель", "Тип", "Описание" }, rows);
    }

    private static void AddReferenceRows(
        ICollection<string[]> rows,
        string sourceName,
        IEnumerable<ObjectReferenceDto> targets,
        string relationLabel)
    {
        foreach (var target in targets.OrderBy(GetReferenceDisplayName))
        {
            rows.Add(new[] { sourceName, GetReferenceDisplayName(target), relationLabel, "-" });
        }
    }

    private static IReadOnlyList<StructureAssignmentDto> GetObjectStructureAssignments(
        ProjectSnapshotDataDto snapshotData,
        StoryObjectDto storyObject) =>
        snapshotData.StructureAssignments
            .Where(assignment =>
                assignment.StoryObjectId == storyObject.Id ||
                (string.Equals(assignment.TargetKind, "storyObject", StringComparison.OrdinalIgnoreCase) &&
                    assignment.TargetId == storyObject.Id))
            .ToList();

    private static string GetReferenceDisplayName(ObjectReferenceDto storyObject) =>
        $"{GetObjectDisplayName(storyObject)} ({storyObject.TypeKey})";

    private static string GetObjectDisplayName(StoryObjectDto storyObject) =>
        IsBlank(storyObject.Surname)
            ? storyObject.Name
            : $"{storyObject.Name} {storyObject.Surname}";

    private static string GetObjectDisplayName(ObjectReferenceDto storyObject) => storyObject.Name;

    private static string GetObjectTypeLabel(ProjectSnapshotDataDto snapshotData, StoryObjectDto storyObject)
    {
        var objectType = snapshotData.ObjectTypes.FirstOrDefault(type =>
            string.Equals(type.Key, storyObject.TypeKey, StringComparison.OrdinalIgnoreCase));
        if (!IsBlank(objectType?.Name) &&
            !string.Equals(objectType?.Name, storyObject.TypeKey, StringComparison.OrdinalIgnoreCase))
        {
            return objectType!.Name;
        }

        return storyObject.TypeKey switch
        {
            "characters" => "Персонажи",
            "items" => "Предметы",
            "places" => "Места",
            "organizations" => "Организации",
            _ => objectType?.Name ?? storyObject.TypeKey,
        };
    }

    private static string GetPrimaryCatalog(StoryObjectDto storyObject)
    {
        var selection = storyObject.CatalogSelections
            .OrderBy(currentSelection => currentSelection.CatalogName)
            .FirstOrDefault();

        return selection is null
            ? "-"
            : selection.CatalogEntryName ??
                selection.CatalogEntryGroupName ??
                selection.CatalogName;
    }

    private static string GetPrimaryStructure(ProjectSnapshotDataDto snapshotData, StoryObjectDto storyObject)
    {
        var assignment = GetObjectStructureAssignments(snapshotData, storyObject)
            .OrderBy(currentAssignment => currentAssignment.StructureName)
            .ThenBy(currentAssignment => currentAssignment.StructureNodeName)
            .ThenBy(currentAssignment => currentAssignment.SortOrder)
            .FirstOrDefault();

        return assignment is null
            ? "-"
            : assignment.StructureNodeName;
    }
}

internal sealed record SnapshotObjectTypeExportGroup(string Label, IReadOnlyList<StoryObjectDto> Objects);
