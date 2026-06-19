using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using StoryDB.Api.Contracts.Exports;
using StoryDB.Api.Data.Entities;
using Wp = DocumentFormat.OpenXml.Wordprocessing;

namespace StoryDB.Api.Services.Exports;

public sealed partial class ProjectExportService
{
    private byte[] BuildDossierDocument(
        Project project,
        IReadOnlyList<StoryObject> objects,
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
                .GroupBy(GetObjectTypeLabel)
                .Select(group => new ObjectTypeExportGroup(group.Key, group.ToList()))
                .ToList();

            AddCoverPage(body, project, groupedObjects, objects.Count);

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

                    AddObjectDossier(mainPart, body, group.Objects[index], request);
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
        StoryObject storyObject,
        ProjectDossierExportRequest request)
    {
        var objectType = GetObjectTypeLabel(storyObject);
        AddParagraph(body, GetObjectDisplayName(storyObject), "Heading1");
        AddParagraph(body, $"{objectType} · Базовое состояние", "Muted");
        AddPassportBlock(mainPart, body, storyObject, objectType);

        AddParagraph(body, "Описание", "Heading2");
        AddParagraph(body, IsBlank(storyObject.Description) ? "Описание пока не заполнено." : storyObject.Description!);

        if (request.IncludeAttributes)
        {
            AddAttributes(body, storyObject);
        }

        if (request.IncludeCatalogs)
        {
            AddCatalogSelections(body, storyObject);
        }

        if (request.IncludeStructureAssignments)
        {
            AddStructureAssignments(body, storyObject);
        }

        if (request.IncludeRelations)
        {
            AddObjectLinks(body, storyObject);
            AddCharacterRelationships(body, storyObject);
        }
    }

    private static void AddCoverPage(
        Wp.Body body,
        Project project,
        IReadOnlyList<ObjectTypeExportGroup> groupedObjects,
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
            ("Контекст", "Базовое состояние"),
            ("Доступ", project.Visibility),
        }, columns: 4);

        AddParagraph(body, "Содержание", "Heading2");
        foreach (var group in groupedObjects)
        {
            AddParagraph(body, $"{group.Label} ({group.Objects.Count})", "Heading3");
            AddSimpleList(body, group.Objects.Select(GetObjectDisplayName));
        }
    }

    private static void AddObjectTypeSection(Wp.Body body, string label, int count)
    {
        AddParagraph(body, label, "SectionTitle");
        AddParagraph(body, $"{count} {GetObjectCountWord(count)} в этом разделе", "Subtitle");
    }

    private static void AddAttributes(Wp.Body body, StoryObject storyObject)
    {
        AddParagraph(body, "Характеристики", "Heading2");
        var attributes = storyObject.Attributes
            .OrderBy(attribute => attribute.AttributeDefinition?.AttributeGroup?.SortOrder ?? int.MaxValue)
            .ThenBy(attribute => attribute.AttributeDefinition?.AttributeGroup?.Name ?? "")
            .ThenBy(attribute => attribute.SortOrder)
            .ThenBy(attribute => attribute.AttributeDefinition?.Name ?? attribute.AttributeDefinitionId.ToString())
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
                ValueOrDash(attribute.AttributeDefinition?.AttributeGroup?.Name),
                attribute.AttributeDefinition?.Name ?? $"#{attribute.AttributeDefinitionId}",
                ValueOrDash(attribute.Value),
                "-",
            }));
    }

    private static void AddCatalogSelections(Wp.Body body, StoryObject storyObject)
    {
        AddParagraph(body, "Каталоги", "Heading2");
        var selections = storyObject.CatalogSelections
            .OrderBy(selection => selection.Catalog?.SortOrder ?? int.MaxValue)
            .ThenBy(selection => selection.Catalog?.Name ?? "")
            .ThenBy(selection => selection.SortOrder)
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
                var value = selection.CatalogEntry?.Name ??
                    selection.CatalogEntryGroup?.Name ??
                    selection.TargetType;
                if (!IsBlank(selection.CatalogEntryGroup?.Name) &&
                    !string.Equals(selection.CatalogEntryGroup?.Name, value, StringComparison.Ordinal))
                {
                    value = $"{selection.CatalogEntryGroup!.Name} / {value}";
                }

                return new[]
                {
                    selection.Catalog?.Name ?? $"Каталог #{selection.CatalogId}",
                    ValueOrDash(value),
                    "Базовое состояние",
                };
            }));
    }

    private static void AddStructureAssignments(Wp.Body body, StoryObject storyObject)
    {
        AddParagraph(body, "Принадлежность к структурам", "Heading2");
        var assignments = storyObject.StructureAssignments
            .OrderBy(assignment => assignment.StructureUsage?.Structure?.Name ?? "")
            .ThenBy(assignment => assignment.StructureNode?.LevelIndex ?? 0)
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
                var structureName = assignment.StructureUsage?.DisplayName ??
                    assignment.StructureUsage?.Structure?.Name ??
                    $"Структура #{assignment.StructureIdSafe()}";
                var nodeName = assignment.StructureNode?.Name ?? $"Узел #{assignment.StructureNodeId}";
                var notes = string.Join(" · ", new[] { assignment.RoleLabel, assignment.Notes }.Where(value => !IsBlank(value)));

                return new[] { structureName, nodeName, ValueOrDash(notes) };
            }));
    }

    private static void AddObjectLinks(Wp.Body body, StoryObject storyObject)
    {
        AddParagraph(body, "Связанные объекты", "Heading2");
        var hasLinks = false;

        var rows = new List<string[]>();
        foreach (var ownership in storyObject.OwnedItems.OrderBy(link => link.SortOrder))
        {
            hasLinks = AddReferenceRow(rows, GetObjectDisplayName(storyObject), ownership.ItemObject, "Владеет", null) || hasLinks;
        }

        foreach (var ownership in storyObject.Owners.OrderBy(link => link.SortOrder))
        {
            hasLinks = AddReferenceRow(rows, GetReferenceDisplayName(ownership.OwnerCharacter), storyObject, "Владелец", null) || hasLinks;
        }

        foreach (var relation in storyObject.OutgoingRelations.OrderBy(link => link.SortOrder))
        {
            hasLinks = AddReferenceRow(rows, GetObjectDisplayName(storyObject), relation.TargetObject, relation.RelationType, null) || hasLinks;
        }

        foreach (var relation in storyObject.IncomingRelations.OrderBy(link => link.SortOrder))
        {
            hasLinks = AddReferenceRow(rows, GetReferenceDisplayName(relation.SourceObject), storyObject, relation.RelationType, null) || hasLinks;
        }

        if (!hasLinks)
        {
            AddParagraph(body, "Связанных объектов пока нет.", "Muted");
            return;
        }

        AddDataTable(body, new[] { 2200, 2200, 2100, 2860 }, new[] { "Источник", "Цель", "Тип", "Описание" }, rows);
    }

    private static void AddCharacterRelationships(Wp.Body body, StoryObject storyObject)
    {
        if (storyObject.ObjectType?.Key != "characters")
        {
            return;
        }

        AddParagraph(body, "Отношения персонажа", "Heading2");
        var hasRelationships = false;

        var rows = new List<string[]>();
        foreach (var relationship in storyObject.OutgoingCharacterRelationships.OrderBy(link => link.SortOrder))
        {
            var name = GetReferenceDisplayName(relationship.TargetCharacter);
            if (name is null)
            {
                continue;
            }

            hasRelationships = true;
            rows.Add(new[]
            {
                GetObjectDisplayName(storyObject),
                name,
                relationship.RelationType,
                $"Сила {relationship.Strength}% · напряжение {relationship.Tension}%" +
                (relationship.IsBidirectional ? " · двусторонняя" : "") +
                (IsBlank(relationship.Description) ? "" : $" · {relationship.Description}"),
            });
        }

        foreach (var relationship in storyObject.IncomingCharacterRelationships.OrderBy(link => link.SortOrder))
        {
            var name = GetReferenceDisplayName(relationship.SourceCharacter);
            if (name is null)
            {
                continue;
            }

            hasRelationships = true;
            rows.Add(new[]
            {
                name,
                GetObjectDisplayName(storyObject),
                relationship.RelationType,
                "Входящая связь",
            });
        }

        if (!hasRelationships)
        {
            AddParagraph(body, "Отношений пока нет.", "Muted");
            return;
        }

        AddDataTable(body, new[] { 2200, 2200, 2100, 2860 }, new[] { "Источник", "Цель", "Тип", "Описание" }, rows);
    }

    private static bool AddReferenceRow(
        ICollection<string[]> rows,
        string? sourceName,
        StoryObject? targetObject,
        string relationLabel,
        string? description)
    {
        var targetName = GetReferenceDisplayName(targetObject);
        if (IsBlank(sourceName) || targetName is null)
        {
            return false;
        }

        rows.Add(new[] { sourceName!, targetName, relationLabel, ValueOrDash(description) });
        return true;
    }

    private static string? GetReferenceDisplayName(StoryObject? storyObject) =>
        storyObject is null
            ? null
            : $"{GetObjectDisplayName(storyObject)} ({storyObject.ObjectType?.Name ?? storyObject.ObjectType?.Key ?? storyObject.ObjectTypeId.ToString()})";

    private static string GetObjectDisplayName(StoryObject storyObject) =>
        IsBlank(storyObject.Surname)
            ? storyObject.Name
            : $"{storyObject.Name} {storyObject.Surname}";

    private static string GetObjectTypeLabel(StoryObject storyObject)
    {
        var key = storyObject.ObjectType?.Key;
        var name = storyObject.ObjectType?.Name;
        if (!IsBlank(name) && !string.Equals(name, key, StringComparison.OrdinalIgnoreCase))
        {
            return name!;
        }

        return key switch
        {
            "characters" => "Персонажи",
            "items" => "Предметы",
            "places" => "Места",
            "organizations" => "Организации",
            _ => name ?? key ?? storyObject.ObjectTypeId.ToString(),
        };
    }

    private static string ValueOrDash(string? value) => IsBlank(value) ? "-" : value!.Trim();

    private static string GetPrimaryCatalog(StoryObject storyObject)
    {
        var selection = storyObject.CatalogSelections
            .OrderBy(currentSelection => currentSelection.Catalog?.SortOrder ?? int.MaxValue)
            .ThenBy(currentSelection => currentSelection.SortOrder)
            .FirstOrDefault();

        return selection is null
            ? "-"
            : selection.CatalogEntry?.Name ??
                selection.CatalogEntryGroup?.Name ??
                selection.Catalog?.Name ??
                "-";
    }

    private static string GetPrimaryStructure(StoryObject storyObject)
    {
        var assignment = storyObject.StructureAssignments
            .OrderBy(currentAssignment => currentAssignment.StructureUsage?.Structure?.Name ?? "")
            .ThenBy(currentAssignment => currentAssignment.StructureNode?.LevelIndex ?? 0)
            .ThenBy(currentAssignment => currentAssignment.SortOrder)
            .FirstOrDefault();

        return assignment is null
            ? "-"
            : assignment.StructureNode?.Name ??
                assignment.StructureUsage?.DisplayName ??
                assignment.StructureUsage?.Structure?.Name ??
                "-";
    }
}

internal sealed record ObjectTypeExportGroup(string Label, IReadOnlyList<StoryObject> Objects);

internal static class StructureAssignmentExportExtensions
{
    public static int StructureIdSafe(this StructureAssignment assignment) =>
        assignment.StructureUsage?.StructureId ?? assignment.StructureNode?.StructureId ?? 0;
}




