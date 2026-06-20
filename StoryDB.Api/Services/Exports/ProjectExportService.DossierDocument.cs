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




