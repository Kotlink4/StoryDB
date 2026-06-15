using System.Text.RegularExpressions;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Processing;
using StoryDB.Api.Contracts.Exports;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Files;
using A = DocumentFormat.OpenXml.Drawing;
using Pic = DocumentFormat.OpenXml.Drawing.Pictures;
using Wp = DocumentFormat.OpenXml.Wordprocessing;
using Dw = DocumentFormat.OpenXml.Drawing.Wordprocessing;

namespace StoryDB.Api.Services.Exports;

public sealed class ProjectExportService(StoryDbContext dbContext, IFileStorageService fileStorageService) : IProjectExportService
{
    private const int MaxExportedObjects = 100;
    private const string DocxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private const string Navy = "0B2545";
    private const string Blue = "2E74B5";
    private const string DarkBlue = "1F4D78";
    private const string Ink = "171F2A";
    private const string Muted = "5B6F87";
    private const string LightBlueFill = "E8EEF5";
    private const string SoftFill = "F4F6F9";
    private const string BorderColor = "CAD6E2";

    public async Task<ProjectExportServiceResult<ProjectDossierExportDocument>> ExportDossiersAsync(
        int projectId,
        ProjectDossierExportRequest request,
        CancellationToken cancellationToken = default)
    {
        var objectIds = request.ObjectIds
            .Where(id => id > 0)
            .Distinct()
            .ToArray();

        if (objectIds.Length == 0)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.Invalid(
                "Select at least one object to export.");
        }

        if (objectIds.Length > MaxExportedObjects)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.Invalid(
                $"A single Word export can include up to {MaxExportedObjects} objects.");
        }

        var project = await dbContext.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(currentProject => currentProject.Id == projectId, cancellationToken);
        if (project is null)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.NotFound();
        }

        var objects = await LoadObjects(projectId, objectIds, cancellationToken);
        if (objects.Count != objectIds.Length)
        {
            return ProjectExportServiceResult<ProjectDossierExportDocument>.NotFound();
        }

        var orderedObjects = objects
            .OrderBy(storyObject => storyObject.ObjectType?.SortOrder ?? int.MaxValue)
            .ThenBy(storyObject => storyObject.ObjectType?.Name ?? storyObject.ObjectType?.Key ?? "")
            .ThenBy(storyObject => GetObjectDisplayName(storyObject))
            .ToList();

        var content = BuildDossierDocument(project, orderedObjects, request);
        var fileName = $"{ToFileName(project.Name)}-dossiers-{DateTime.UtcNow:yyyyMMdd-HHmm}.docx";

        return ProjectExportServiceResult<ProjectDossierExportDocument>.Success(
            new ProjectDossierExportDocument(fileName, DocxContentType, content));
    }

    private async Task<List<StoryObject>> LoadObjects(
        int projectId,
        IReadOnlyCollection<int> objectIds,
        CancellationToken cancellationToken)
    {
        return await dbContext.Objects
            .AsNoTracking()
            .AsSplitQuery()
            .Where(storyObject => storyObject.ProjectId == projectId && objectIds.Contains(storyObject.Id))
            .Include(storyObject => storyObject.ObjectType)
            .Include(storyObject => storyObject.Attributes)
                .ThenInclude(attribute => attribute.AttributeDefinition)
                .ThenInclude(definition => definition!.AttributeGroup)
            .Include(storyObject => storyObject.CatalogSelections)
                .ThenInclude(selection => selection.Catalog)
            .Include(storyObject => storyObject.CatalogSelections)
                .ThenInclude(selection => selection.CatalogEntryGroup)
            .Include(storyObject => storyObject.CatalogSelections)
                .ThenInclude(selection => selection.CatalogEntry)
            .Include(storyObject => storyObject.HierarchySelections)
                .ThenInclude(selection => selection.HierarchyGroup)
            .Include(storyObject => storyObject.HierarchySelections)
                .ThenInclude(selection => selection.HierarchyNode)
            .Include(storyObject => storyObject.OwnedItems)
                .ThenInclude(link => link.ItemObject)
                .ThenInclude(item => item!.ObjectType)
            .Include(storyObject => storyObject.Owners)
                .ThenInclude(link => link.OwnerCharacter)
                .ThenInclude(owner => owner!.ObjectType)
            .Include(storyObject => storyObject.OutgoingRelations)
                .ThenInclude(relation => relation.TargetObject)
                .ThenInclude(target => target!.ObjectType)
            .Include(storyObject => storyObject.IncomingRelations)
                .ThenInclude(relation => relation.SourceObject)
                .ThenInclude(source => source!.ObjectType)
            .Include(storyObject => storyObject.OutgoingCharacterRelationships)
                .ThenInclude(relation => relation.TargetCharacter)
                .ThenInclude(target => target!.ObjectType)
            .Include(storyObject => storyObject.IncomingCharacterRelationships)
                .ThenInclude(relation => relation.SourceCharacter)
                .ThenInclude(source => source!.ObjectType)
            .Include(storyObject => storyObject.StructureAssignments)
                .ThenInclude(assignment => assignment.StructureUsage)
                .ThenInclude(usage => usage!.Structure)
            .Include(storyObject => storyObject.StructureAssignments)
                .ThenInclude(assignment => assignment.StructureNode)
            .ToListAsync(cancellationToken);
    }

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

    private void AddPassportBlock(
        MainDocumentPart mainPart,
        Wp.Body body,
        StoryObject storyObject,
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
                    ("Структура", GetPrimaryStructure(storyObject)),
                }),
            }));

        table.Append(row);
        body.Append(table);
    }

    private Wp.Paragraph? CreatePortraitParagraph(MainDocumentPart mainPart, StoryObject storyObject)
    {
        var localPath = ResolveUploadedFilePath(storyObject.ImagePath);
        if (localPath is null || !File.Exists(localPath))
        {
            return null;
        }

        try
        {
            using var image = Image.Load(localPath);
            image.Mutate(context => context
                .AutoOrient()
                .Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(560, 760),
                }));

            using var pngStream = new MemoryStream();
            image.SaveAsPng(pngStream, new PngEncoder());
            pngStream.Position = 0;

            var imagePart = mainPart.AddImagePart(ImagePartType.Png);
            imagePart.FeedData(pngStream);
            var relationshipId = mainPart.GetIdOfPart(imagePart);

            const long maxWidthEmu = 1_450_000;
            const long maxHeightEmu = 1_900_000;
            var widthScale = maxWidthEmu / (double)image.Width;
            var heightScale = maxHeightEmu / (double)image.Height;
            var scale = Math.Min(widthScale, heightScale);
            var widthEmu = Math.Max(1L, (long)Math.Round(image.Width * scale));
            var heightEmu = Math.Max(1L, (long)Math.Round(image.Height * scale));

            var paragraph = CreateParagraph(alignment: Wp.JustificationValues.Center);
            paragraph.Append(new Wp.Run(CreateImageDrawing(
                relationshipId,
                storyObject.Id,
                GetObjectDisplayName(storyObject),
                widthEmu,
                heightEmu)));
            return paragraph;
        }
        catch (InvalidImageContentException)
        {
            return null;
        }
        catch (NotSupportedException)
        {
            return null;
        }
        catch (IOException)
        {
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return null;
        }
    }

    private string? ResolveUploadedFilePath(string? requestPath)
    {
        var normalizedPath = requestPath?.Trim();
        if (!fileStorageService.IsUploadedImagePath(normalizedPath))
        {
            return null;
        }

        var relativePath = normalizedPath![FileStoragePaths.UploadsRequestPath.Length..]
            .TrimStart('/', '\\')
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar);
        var localPath = Path.GetFullPath(Path.Combine(fileStorageService.UploadsRootPath, relativePath));
        var uploadsRoot = Path.GetFullPath(fileStorageService.UploadsRootPath);
        var uploadsRootWithSeparator = uploadsRoot.EndsWith(Path.DirectorySeparatorChar)
            ? uploadsRoot
            : $"{uploadsRoot}{Path.DirectorySeparatorChar}";

        return localPath.StartsWith(uploadsRootWithSeparator, StringComparison.OrdinalIgnoreCase)
            ? localPath
            : null;
    }

    private static Wp.Drawing CreateImageDrawing(
        string relationshipId,
        int objectId,
        string name,
        long widthEmu,
        long heightEmu)
    {
        var drawingId = (uint)Math.Max(1, objectId + 1000);
        return new Wp.Drawing(
            new Dw.Inline(
                new Dw.Extent { Cx = widthEmu, Cy = heightEmu },
                new Dw.EffectExtent
                {
                    LeftEdge = 0L,
                    TopEdge = 0L,
                    RightEdge = 0L,
                    BottomEdge = 0L,
                },
                new Dw.DocProperties
                {
                    Id = drawingId,
                    Name = $"Портрет {name}",
                    Description = $"Портрет объекта {name}",
                },
                new Dw.NonVisualGraphicFrameDrawingProperties(
                    new A.GraphicFrameLocks { NoChangeAspect = true }),
                new A.Graphic(
                    new A.GraphicData(
                        new Pic.Picture(
                            new Pic.NonVisualPictureProperties(
                                new Pic.NonVisualDrawingProperties
                                {
                                    Id = 0U,
                                    Name = $"portrait-{objectId}.png",
                                    Description = $"Портрет объекта {name}",
                                },
                                new Pic.NonVisualPictureDrawingProperties()),
                            new Pic.BlipFill(
                                new A.Blip
                                {
                                    Embed = relationshipId,
                                    CompressionState = A.BlipCompressionValues.Print,
                                },
                                new A.Stretch(new A.FillRectangle())),
                            new Pic.ShapeProperties(
                                new A.Transform2D(
                                    new A.Offset { X = 0L, Y = 0L },
                                    new A.Extents { Cx = widthEmu, Cy = heightEmu }),
                                new A.PresetGeometry(new A.AdjustValueList())
                                {
                                    Preset = A.ShapeTypeValues.Rectangle,
                                })))
                    {
                        Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture",
                    }))
            {
                DistanceFromTop = 0U,
                DistanceFromBottom = 0U,
                DistanceFromLeft = 0U,
                DistanceFromRight = 0U,
            });
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

    private static void AddKeyValueGrid(Wp.Body body, IReadOnlyList<(string Label, string Value)> values, int columns)
    {
        var widths = Enumerable.Repeat(9360 / columns, columns).ToArray();
        var table = CreateTable(widths);

        for (var index = 0; index < values.Count; index += columns)
        {
            var row = new Wp.TableRow();
            foreach (var value in values.Skip(index).Take(columns))
            {
                row.Append(CreateCell(new[]
                {
                    CreateParagraphWithText(value.Label.ToUpperInvariant(), "MetaLabel"),
                    CreateParagraphWithText(value.Value, "MetaValue"),
                }, fill: SoftFill));
            }

            table.Append(row);
        }

        body.Append(table);
    }

    private static void AddSimpleList(Wp.Body body, IEnumerable<string> values)
    {
        foreach (var value in values)
        {
            AddParagraph(body, $"- {value}");
        }
    }

    private static void AddDataTable(
        Wp.Body body,
        IReadOnlyList<int> widths,
        IReadOnlyList<string> headers,
        IEnumerable<IReadOnlyList<string>> rows)
    {
        var table = CreateTable(widths);
        var headerRow = new Wp.TableRow();
        foreach (var header in headers)
        {
            headerRow.Append(CreateCell(new[] { CreateParagraphWithText(header, "TableHeader") }, fill: LightBlueFill));
        }

        table.Append(headerRow);

        foreach (var rowValues in rows)
        {
            var row = new Wp.TableRow();
            foreach (var value in rowValues)
            {
                row.Append(CreateCell(new[] { CreateParagraphWithText(ValueOrDash(value), "TableCell") }));
            }

            table.Append(row);
        }

        body.Append(table);
    }

    private static Wp.Table CreateFactTable(IReadOnlyList<(string Label, string Value)> facts)
    {
        var table = CreateTable(new[] { 2286, 2287, 2287 });
        for (var index = 0; index < facts.Count; index += 3)
        {
            var row = new Wp.TableRow();
            foreach (var fact in facts.Skip(index).Take(3))
            {
                row.Append(CreateCell(new[]
                {
                    CreateParagraphWithText(fact.Label.ToUpperInvariant(), "MetaLabel"),
                    CreateParagraphWithText(fact.Value, "MetaValue"),
                }, fill: SoftFill));
            }

            table.Append(row);
        }

        return table;
    }

    private static Wp.Table CreateTable(IReadOnlyList<int> widths)
    {
        var table = new Wp.Table();
        table.Append(new Wp.TableProperties(
            new Wp.TableWidth { Width = widths.Sum().ToString(), Type = Wp.TableWidthUnitValues.Dxa },
            new Wp.TableIndentation { Width = 120, Type = Wp.TableWidthUnitValues.Dxa },
            new Wp.TableLayout { Type = Wp.TableLayoutValues.Fixed },
            CreateTableBorders()));
        table.Append(new Wp.TableGrid(widths.Select(width => new Wp.GridColumn { Width = width.ToString() })));

        return table;
    }

    private static Wp.TableCell CreateCell(IEnumerable<OpenXmlElement> children, string fill = "FFFFFF")
    {
        var childList = children.ToList();
        var cell = new Wp.TableCell(new Wp.TableCellProperties(
            new Wp.TableCellWidth { Width = "0", Type = Wp.TableWidthUnitValues.Auto },
            new Wp.Shading { Val = Wp.ShadingPatternValues.Clear, Color = "auto", Fill = fill },
            new Wp.TableCellMargin(
                new Wp.TopMargin { Width = "80", Type = Wp.TableWidthUnitValues.Dxa },
                new Wp.BottomMargin { Width = "80", Type = Wp.TableWidthUnitValues.Dxa },
                new Wp.StartMargin { Width = "120", Type = Wp.TableWidthUnitValues.Dxa },
                new Wp.EndMargin { Width = "120", Type = Wp.TableWidthUnitValues.Dxa }),
            new Wp.TableCellBorders(
                new Wp.TopBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
                new Wp.LeftBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
                new Wp.BottomBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
                new Wp.RightBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor })));

        foreach (var child in childList)
        {
            cell.Append(child);
        }

        if (childList.Count == 0 || childList[^1] is not Wp.Paragraph)
        {
            cell.Append(new Wp.Paragraph());
        }

        return cell;
    }

    private static Wp.TableBorders CreateTableBorders() =>
        new(
            new Wp.TopBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
            new Wp.LeftBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
            new Wp.BottomBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
            new Wp.RightBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
            new Wp.InsideHorizontalBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
            new Wp.InsideVerticalBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor });

    private static void AddStyles(MainDocumentPart mainPart)
    {
        var stylesPart = mainPart.AddNewPart<StyleDefinitionsPart>();
        stylesPart.Styles = new Wp.Styles(
            ParagraphStyle("Normal", "Normal", 22),
            ParagraphStyle("Kicker", "Kicker", 24, bold: true, color: Muted, spacingAfter: 200),
            ParagraphStyle("CoverTitle", "Cover Title", 56, bold: true, color: Navy, spacingAfter: 80),
            ParagraphStyle("Title", "Title", 36, bold: true, color: Navy, spacingAfter: 220),
            ParagraphStyle("Subtitle", "Subtitle", 26, color: Muted, spacingAfter: 520),
            ParagraphStyle("SectionTitle", "Section Title", 44, bold: true, color: Navy, spacingBefore: 160, spacingAfter: 120),
            ParagraphStyle("Heading1", "Heading 1", 32, bold: true, color: Blue, spacingBefore: 360, spacingAfter: 200),
            ParagraphStyle("Heading2", "Heading 2", 26, bold: true, color: Blue, spacingBefore: 280, spacingAfter: 140),
            ParagraphStyle("Heading3", "Heading 3", 24, bold: true, color: DarkBlue, spacingBefore: 200, spacingAfter: 100),
            ParagraphStyle("Muted", "Muted", 21, color: Muted, spacingAfter: 160),
            ParagraphStyle("MetaLabel", "Meta Label", 17, bold: true, color: Muted, spacingAfter: 20),
            ParagraphStyle("MetaValue", "Meta Value", 21, bold: true, color: Navy, spacingAfter: 0),
            ParagraphStyle("ObjectTitle", "Object Title", 40, bold: true, color: Navy, spacingAfter: 120),
            ParagraphStyle("TableHeader", "Table Header", 18, bold: true, color: Navy, spacingAfter: 0),
            ParagraphStyle("TableCell", "Table Cell", 19, color: Ink, spacingAfter: 0));
        stylesPart.Styles.Save();
    }

    private static Wp.Style ParagraphStyle(
        string id,
        string name,
        int fontSize,
        bool bold = false,
        string color = "111827",
        int spacingBefore = 0,
        int spacingAfter = 120)
    {
        var runProperties = new Wp.StyleRunProperties(
            new Wp.RunFonts { Ascii = "Calibri", HighAnsi = "Calibri", ComplexScript = "Calibri" },
            new Wp.Color { Val = color },
            new Wp.FontSize { Val = fontSize.ToString() });

        if (bold)
        {
            runProperties.PrependChild(new Wp.Bold());
        }

        return new Wp.Style(
            new Wp.StyleName { Val = name },
            new Wp.BasedOn { Val = "Normal" },
            new Wp.NextParagraphStyle { Val = "Normal" },
            new Wp.StyleParagraphProperties(new Wp.SpacingBetweenLines
            {
                Before = spacingBefore.ToString(),
                After = spacingAfter.ToString(),
                Line = "276",
                LineRule = Wp.LineSpacingRuleValues.Auto,
            }),
            runProperties)
        {
            Type = Wp.StyleValues.Paragraph,
            StyleId = id,
            Default = id == "Normal",
        };
    }

    private static void AddKeyValue(Wp.Body body, string label, string? value)
    {
        var paragraph = CreateParagraph();
        paragraph.Append(
            new Wp.Run(new Wp.RunProperties(new Wp.Bold()), CreateText($"{label}: ")),
            new Wp.Run(CreateText(IsBlank(value) ? "-" : value!)));
        body.Append(paragraph);
    }

    private static void AddBullet(Wp.Body body, string text)
    {
        var paragraph = CreateParagraph();
        paragraph.Append(
            new Wp.Run(CreateText("- ")),
            new Wp.Run(CreateText(text)));
        body.Append(paragraph);
    }

    private static void AddParagraph(
        Wp.Body body,
        string text,
        string styleId = "Normal",
        Wp.JustificationValues? alignment = null)
    {
        var paragraph = CreateParagraph(styleId, alignment);
        paragraph.Append(new Wp.Run(CreateText(text)));
        body.Append(paragraph);
    }

    private static Wp.Paragraph CreateParagraph(
        string styleId = "Normal",
        Wp.JustificationValues? alignment = null,
        string? spacingBefore = null,
        string? spacingAfter = null)
    {
        var properties = new Wp.ParagraphProperties(new Wp.ParagraphStyleId { Val = styleId });
        if (alignment is not null)
        {
            properties.Append(new Wp.Justification { Val = alignment });
        }

        if (spacingBefore is not null || spacingAfter is not null)
        {
            properties.Append(new Wp.SpacingBetweenLines
            {
                Before = spacingBefore,
                After = spacingAfter,
                Line = "300",
                LineRule = Wp.LineSpacingRuleValues.Auto,
            });
        }

        return new Wp.Paragraph(properties);
    }

    private static Wp.Paragraph CreateParagraphWithText(
        string text,
        string styleId = "Normal",
        Wp.JustificationValues? alignment = null,
        string? spacingBefore = null,
        string? spacingAfter = null)
    {
        var paragraph = CreateParagraph(styleId, alignment, spacingBefore, spacingAfter);
        paragraph.Append(new Wp.Run(CreateText(text)));
        return paragraph;
    }

    private static Wp.Text CreateText(string text) =>
        new(text) { Space = SpaceProcessingModeValues.Preserve };

    private static void AddPageBreak(Wp.Body body) =>
        body.Append(new Wp.Paragraph(new Wp.Run(new Wp.Break { Type = Wp.BreakValues.Page })));

    private static bool IsBlank(string? value) => string.IsNullOrWhiteSpace(value);

    private static string GetObjectCountWord(int count)
    {
        var lastTwoDigits = count % 100;
        if (lastTwoDigits is >= 11 and <= 14)
        {
            return "объектов";
        }

        return (count % 10) switch
        {
            1 => "объект",
            >= 2 and <= 4 => "объекта",
            _ => "объектов",
        };
    }

    private static string ToFileName(string value)
    {
        var normalized = Regex.Replace(value.Trim().ToLowerInvariant(), @"[^a-z0-9а-яё]+", "-", RegexOptions.IgnoreCase);
        normalized = normalized.Trim('-');
        return normalized.Length == 0 ? "storydb-project" : normalized[..Math.Min(normalized.Length, 80)];
    }
}

internal sealed record ObjectTypeExportGroup(string Label, IReadOnlyList<StoryObject> Objects);

internal static class StructureAssignmentExportExtensions
{
    public static int StructureIdSafe(this StructureAssignment assignment) =>
        assignment.StructureUsage?.StructureId ?? assignment.StructureNode?.StructureId ?? 0;
}
