using StoryDB.Api.Data.Entities;
using Wp = DocumentFormat.OpenXml.Wordprocessing;

namespace StoryDB.Api.Services.Exports;

public sealed partial class ProjectExportService
{
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
}
