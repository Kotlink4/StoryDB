using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Attributes;
using StoryDB.Api.Contracts.Catalogs;
using StoryDB.Api.Contracts.Projects;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Attributes;
using StoryDB.Api.Services.Catalogs;
using StoryDB.Api.Services.Objects;
using StoryDB.Api.Services.Relations;
using StoryDB.Api.Services.Structures;
using StoryDB.Api.Services.Timelines;

namespace StoryDB.Api.Services.Projects;

public sealed class ProjectSnapshotService(
    StoryDbContext dbContext,
    IObjectService objectService,
    IAttributeDefinitionService attributeDefinitionService,
    ICatalogService catalogService,
    IRelationService relationService,
    IStructureService structureService,
    ITimelineService timelineService) : IProjectSnapshotService
{
    private const int SnapshotSchemaVersion = 1;
    private static readonly JsonSerializerOptions SnapshotJsonOptions = new(JsonSerializerDefaults.Web);
    private const ProjectSnapshotBuildSections FullSnapshotBuild =
        ProjectSnapshotBuildSections.Project |
        ProjectSnapshotBuildSections.Objects |
        ProjectSnapshotBuildSections.Catalogs |
        ProjectSnapshotBuildSections.Structures |
        ProjectSnapshotBuildSections.Relations |
        ProjectSnapshotBuildSections.Timeline;

    public async Task<ProjectSnapshotServiceResult<ProjectSnapshotDto>> GetLatestSnapshotAsync(
        int projectId,
        string scope,
        CancellationToken cancellationToken = default)
    {
        var normalizedScope = NormalizeScope(scope);
        var snapshot = await dbContext.ProjectSnapshots
            .AsNoTracking()
            .Where(currentSnapshot => currentSnapshot.ProjectId == projectId && currentSnapshot.Scope == normalizedScope)
            .OrderByDescending(currentSnapshot => currentSnapshot.Revision)
            .FirstOrDefaultAsync(cancellationToken);

        return snapshot is null
            ? ProjectSnapshotServiceResult<ProjectSnapshotDto>.NotFound()
            : ProjectSnapshotServiceResult<ProjectSnapshotDto>.Success(ToDto(snapshot));
    }

    public async Task<ProjectSnapshotServiceResult<ProjectSnapshotDto>> PublishCurrentSnapshotAsync(
        int projectId,
        CancellationToken cancellationToken = default) =>
        await PublishSnapshotAsync(projectId, ProjectSnapshotScope.Current, cancellationToken);

    public async Task<ProjectSnapshotServiceResult<ProjectSnapshotDto>> PublishPublishedSnapshotAsync(
        int projectId,
        CancellationToken cancellationToken = default) =>
        await PublishSnapshotAsync(projectId, ProjectSnapshotScope.Published, cancellationToken);

    public async Task<ProjectSnapshotServiceResult<ProjectSnapshotDto>> RebuildCurrentSnapshotSectionsAsync(
        int projectId,
        IReadOnlyList<string> sections,
        CancellationToken cancellationToken = default)
    {
        var parsedSections = ParseBuildSections(sections);
        if (parsedSections is null && sections.Count == 0)
        {
            var latestCurrentSnapshot = await dbContext.ProjectSnapshots
                .AsNoTracking()
                .Where(snapshot => snapshot.ProjectId == projectId && snapshot.Scope == ProjectSnapshotScope.Current)
                .OrderByDescending(snapshot => snapshot.Revision)
                .FirstOrDefaultAsync(cancellationToken);
            parsedSections = latestCurrentSnapshot is null
                ? FullSnapshotBuild
                : ParseBuildSections(ParseDirtySections(latestCurrentSnapshot.DirtySections));
        }

        if (parsedSections is null)
        {
            return ProjectSnapshotServiceResult<ProjectSnapshotDto>.Invalid(
                "Sections must include one or more of: project, objects, catalogs, structures, relations, timeline, all.");
        }

        return await PublishSnapshotAsync(projectId, ProjectSnapshotScope.Current, parsedSections.Value, cancellationToken);
    }

    private async Task<ProjectSnapshotServiceResult<ProjectSnapshotDto>> PublishSnapshotAsync(
        int projectId,
        string scope,
        CancellationToken cancellationToken) =>
        await PublishSnapshotAsync(projectId, scope, FullSnapshotBuild, cancellationToken);

    private async Task<ProjectSnapshotServiceResult<ProjectSnapshotDto>> PublishSnapshotAsync(
        int projectId,
        string scope,
        ProjectSnapshotBuildSections sections,
        CancellationToken cancellationToken)
    {
        var project = await dbContext.Projects
            .AsNoTracking()
            .Include(currentProject => currentProject.ObjectTypes)
            .FirstOrDefaultAsync(currentProject => currentProject.Id == projectId, cancellationToken);
        if (project is null)
        {
            return ProjectSnapshotServiceResult<ProjectSnapshotDto>.NotFound();
        }

        var lastRevision = await dbContext.ProjectSnapshots
            .AsNoTracking()
            .Where(snapshot => snapshot.ProjectId == projectId)
            .MaxAsync(snapshot => (long?)snapshot.Revision, cancellationToken) ?? 0;
        var previousSnapshot = await dbContext.ProjectSnapshots
            .AsNoTracking()
            .Where(snapshot => snapshot.ProjectId == projectId && snapshot.Scope == scope)
            .OrderByDescending(snapshot => snapshot.Revision)
            .FirstOrDefaultAsync(cancellationToken);
        var previousData = previousSnapshot is null ? null : DeserializeSnapshotData(previousSnapshot);
        var builtAt = DateTime.UtcNow;
        var effectiveSections = previousData is null ? FullSnapshotBuild : sections;
        ProjectSnapshotDataDto data;
        string snapshotStatus;
        string dirtySections;
        string? error = null;
        try
        {
            data = await BuildSnapshotDataAsync(
                project,
                effectiveSections,
                previousData,
                cancellationToken);
            snapshotStatus = ProjectSnapshotStatus.Ready;
            dirtySections = "";
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            data = previousData ?? BuildEmptySnapshotData(project);
            snapshotStatus = ProjectSnapshotStatus.Failed;
            dirtySections = FormatBuildSections(effectiveSections);
            error = TruncateError(exception.Message);
        }

        var snapshot = new ProjectSnapshot
        {
            ProjectId = projectId,
            Revision = lastRevision + 1,
            SchemaVersion = SnapshotSchemaVersion,
            Status = snapshotStatus,
            Scope = scope,
            DirtySections = dirtySections,
            BuiltAt = builtAt,
            SourceUpdatedAt = project.UpdatedAt,
            DataJson = JsonSerializer.Serialize(data, SnapshotJsonOptions),
            Error = error,
        };

        dbContext.ProjectSnapshots.Add(snapshot);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ProjectSnapshotServiceResult<ProjectSnapshotDto>.Success(ToDto(snapshot));
    }

    private async Task<ProjectSnapshotDataDto> BuildSnapshotDataAsync(
        Project project,
        ProjectSnapshotBuildSections sections,
        ProjectSnapshotDataDto? previousData,
        CancellationToken cancellationToken)
    {
        var projectInfo = sections.HasFlag(ProjectSnapshotBuildSections.Project) || previousData is null
            ? BuildProjectInfo(project)
            : previousData.Project;
        var objectTypes = sections.HasFlag(ProjectSnapshotBuildSections.Project) || previousData is null
            ? BuildObjectTypes(project)
            : previousData.ObjectTypes;
        var objects = sections.HasFlag(ProjectSnapshotBuildSections.Objects) || previousData is null
            ? await BuildObjectSectionAsync(project.Id, objectTypes, cancellationToken)
            : new SnapshotObjectSection(
                previousData.ObjectSummariesByType,
                previousData.ObjectsByType,
                previousData.AttributeDefinitionsByType,
                previousData.AttributeGroupsByType);
        var catalogs = sections.HasFlag(ProjectSnapshotBuildSections.Catalogs) || previousData is null
            ? await BuildCatalogSectionAsync(project.Id, cancellationToken)
            : new SnapshotCatalogSection(
                previousData.Catalogs,
                previousData.CatalogEntriesByCatalogId,
                previousData.CatalogGroupsByCatalogId,
                previousData.CatalogFieldsByCatalogId);
        var structures = sections.HasFlag(ProjectSnapshotBuildSections.Structures) || previousData is null
            ? await BuildStructureSectionAsync(project.Id)
            : new SnapshotStructureSection(
                previousData.Structures,
                previousData.StructureUsages,
                previousData.StructureAssignments);
        var relations = sections.HasFlag(ProjectSnapshotBuildSections.Relations) || previousData is null
            ? await BuildRelationSectionAsync(project.Id)
            : new SnapshotRelationSection(previousData.RelationGraph, previousData.RelationGraphLayout);
        var timeline = sections.HasFlag(ProjectSnapshotBuildSections.Timeline) || previousData is null
            ? await BuildTimelineSectionAsync(project.Id)
            : new SnapshotTimelineSection(
                previousData.TimelineInfo,
                previousData.TimelineEvents,
                previousData.TimelineLinks,
                previousData.TimelineLayout,
                previousData.TimelineLayoutRules);

        return new ProjectSnapshotDataDto(
            projectInfo,
            objectTypes,
            objects.ObjectSummariesByType,
            objects.ObjectsByType,
            objects.AttributeDefinitionsByType,
            objects.AttributeGroupsByType,
            catalogs.Catalogs,
            catalogs.CatalogEntriesByCatalogId,
            catalogs.CatalogGroupsByCatalogId,
            catalogs.CatalogFieldsByCatalogId,
            structures.Structures,
            structures.StructureUsages,
            structures.StructureAssignments,
            relations.RelationGraph,
            relations.RelationGraphLayout,
            timeline.TimelineInfo,
            timeline.TimelineEvents,
            timeline.TimelineLinks,
            timeline.TimelineLayout,
            timeline.TimelineLayoutRules);
    }

    private static ProjectSnapshotProjectDto BuildProjectInfo(Project project) =>
        new(project.Id, project.Name, project.CoverImagePath, project.Visibility, project.UpdatedAt);

    private static IReadOnlyList<ObjectTypeDto> BuildObjectTypes(Project project) =>
        project.ObjectTypes
            .OrderBy(type => type.SortOrder)
            .Select(type => new ObjectTypeDto(type.Key, type.Name, type.IsEnabled))
            .ToList();

    private static ProjectSnapshotDataDto BuildEmptySnapshotData(Project project) =>
        new(
            BuildProjectInfo(project),
            BuildObjectTypes(project),
            new Dictionary<string, IReadOnlyList<Contracts.Objects.StoryObjectSummaryDto>>(),
            new Dictionary<string, IReadOnlyList<Contracts.Objects.StoryObjectDto>>(),
            new Dictionary<string, IReadOnlyList<AttributeDefinitionDto>>(),
            new Dictionary<string, IReadOnlyList<AttributeGroupDto>>(),
            [],
            new Dictionary<int, IReadOnlyList<CatalogEntryDto>>(),
            new Dictionary<int, IReadOnlyList<CatalogEntryGroupDto>>(),
            new Dictionary<int, IReadOnlyList<CatalogFieldDefinitionDto>>(),
            [],
            [],
            [],
            new Contracts.Relations.RelationGraphDto([], []),
            null,
            null,
            [],
            [],
            null,
            null);

    private async Task<SnapshotObjectSection> BuildObjectSectionAsync(
        int projectId,
        IReadOnlyList<ObjectTypeDto> objectTypes,
        CancellationToken cancellationToken)
    {
        var objectSummariesByType = new Dictionary<string, IReadOnlyList<Contracts.Objects.StoryObjectSummaryDto>>();
        var objectsByType = new Dictionary<string, IReadOnlyList<Contracts.Objects.StoryObjectDto>>();
        var attributeDefinitionsByType = new Dictionary<string, IReadOnlyList<AttributeDefinitionDto>>();
        var attributeGroupsByType = new Dictionary<string, IReadOnlyList<AttributeGroupDto>>();
        foreach (var typeKey in objectTypes.Where(type => type.IsEnabled).Select(type => type.Key))
        {
            var summaries = await objectService.GetObjectSummariesAsync(projectId, typeKey);
            objectSummariesByType[typeKey] = summaries;

            var objects = new List<Contracts.Objects.StoryObjectDto>();
            foreach (var summary in summaries)
            {
                var detail = await objectService.GetObjectAsync(projectId, summary.Id);
                if (detail.Status == ObjectServiceStatus.Success && detail.Value is not null)
                {
                    objects.Add(detail.Value);
                }
            }
            objectsByType[typeKey] = objects;

            var definitions = await attributeDefinitionService.GetDefinitionsAsync(projectId, typeKey);
            attributeDefinitionsByType[typeKey] = definitions.Value ?? [];

            var groups = await attributeDefinitionService.GetGroupsAsync(projectId, typeKey);
            attributeGroupsByType[typeKey] = groups.Value ?? [];
        }

        return new SnapshotObjectSection(
            objectSummariesByType,
            objectsByType,
            attributeDefinitionsByType,
            attributeGroupsByType);
    }

    private async Task<SnapshotCatalogSection> BuildCatalogSectionAsync(int projectId, CancellationToken cancellationToken)
    {
        var catalogs = (await catalogService.GetCatalogsAsync(projectId, cancellationToken))
            .Select(ToCatalogDto)
            .ToList();
        var catalogEntriesByCatalogId = new Dictionary<int, IReadOnlyList<CatalogEntryDto>>();
        var catalogGroupsByCatalogId = new Dictionary<int, IReadOnlyList<CatalogEntryGroupDto>>();
        var catalogFieldsByCatalogId = new Dictionary<int, IReadOnlyList<CatalogFieldDefinitionDto>>();

        foreach (var catalog in catalogs)
        {
            var entries = await catalogService.GetEntriesAsync(projectId, catalog.Id, cancellationToken);
            catalogEntriesByCatalogId[catalog.Id] = entries.Value?.Select(ToCatalogEntryDto).ToList() ?? [];

            var groups = await catalogService.GetEntryGroupsAsync(projectId, catalog.Id, cancellationToken);
            catalogGroupsByCatalogId[catalog.Id] = groups.Value?.Select(ToCatalogEntryGroupDto).ToList() ?? [];

            var fields = await catalogService.GetFieldDefinitionsAsync(projectId, catalog.Id, cancellationToken);
            catalogFieldsByCatalogId[catalog.Id] = fields.Value?.Select(ToCatalogFieldDefinitionDto).ToList() ?? [];
        }

        return new SnapshotCatalogSection(catalogs, catalogEntriesByCatalogId, catalogGroupsByCatalogId, catalogFieldsByCatalogId);
    }

    private async Task<SnapshotStructureSection> BuildStructureSectionAsync(int projectId)
    {
        var structures = new List<Contracts.Structures.StructureDto>();
        var structureSummaries = await structureService.GetStructuresAsync(projectId, null, null);
        foreach (var summary in structureSummaries.Value ?? [])
        {
            var structure = await structureService.GetStructureAsync(projectId, summary.Id);
            if (structure.Value is not null)
            {
                structures.Add(structure.Value);
            }
        }

        var structureUsages = await structureService.GetStructureUsagesAsync(projectId, null, null, null);
        var structureAssignments = await structureService.GetStructureAssignmentsAsync(
            projectId,
            null,
            null,
            null,
            null,
            null,
            null);

        return new SnapshotStructureSection(structures, structureUsages.Value ?? [], structureAssignments.Value ?? []);
    }

    private async Task<SnapshotRelationSection> BuildRelationSectionAsync(int projectId)
    {
        var relationGraph = await relationService.GetRelationGraphAsync(projectId);
        var relationGraphLayout = await relationService.GetDefaultLayoutAsync(projectId, null);

        return new SnapshotRelationSection(
            relationGraph.Value ?? new Contracts.Relations.RelationGraphDto([], []),
            relationGraphLayout.Value);
    }

    private async Task<SnapshotTimelineSection> BuildTimelineSectionAsync(int projectId)
    {
        var timelineInfo = await timelineService.GetTimelineAsync(projectId);
        var timelineEvents = await timelineService.GetEventsAsync(projectId);
        var timelineLinks = await timelineService.GetEventLinksAsync(projectId);
        var timelineLayout = await timelineService.GetDefaultLayoutAsync(projectId);
        var timelineLayoutRules = await timelineService.GetLayoutRulesAsync(projectId);

        return new SnapshotTimelineSection(
            timelineInfo.Value,
            timelineEvents.Value ?? [],
            timelineLinks.Value ?? [],
            timelineLayout.Value,
            timelineLayoutRules.Value);
    }

    private static ProjectSnapshotDto ToDto(ProjectSnapshot snapshot)
    {
        var data = DeserializeSnapshotData(snapshot);

        return new ProjectSnapshotDto(
            snapshot.Id,
            snapshot.ProjectId,
            snapshot.Revision,
            snapshot.SchemaVersion,
            snapshot.Status,
            snapshot.Scope,
            ParseDirtySections(snapshot.DirtySections),
            snapshot.BuiltAt,
            snapshot.SourceUpdatedAt,
            snapshot.Error,
            data);
    }

    private static ProjectSnapshotDataDto DeserializeSnapshotData(ProjectSnapshot snapshot) =>
        JsonSerializer.Deserialize<ProjectSnapshotDataDto>(snapshot.DataJson, SnapshotJsonOptions)
        ?? throw new InvalidOperationException("Project snapshot data could not be deserialized.");

    private static IReadOnlyList<string> ParseDirtySections(string dirtySections) =>
        dirtySections
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .OrderBy(section => section, StringComparer.Ordinal)
            .ToList();

    private static string NormalizeScope(string? scope) =>
        string.Equals(scope, ProjectSnapshotScope.Published, StringComparison.OrdinalIgnoreCase)
            ? ProjectSnapshotScope.Published
            : ProjectSnapshotScope.Current;

    private static ProjectSnapshotBuildSections? ParseBuildSections(IReadOnlyList<string> sections)
    {
        if (sections.Count == 0)
        {
            return null;
        }

        var parsed = (ProjectSnapshotBuildSections)0;
        foreach (var section in sections)
        {
            var currentSection = section.Trim().ToLowerInvariant() switch
            {
                "all" => FullSnapshotBuild,
                "project" => ProjectSnapshotBuildSections.Project,
                "objects" => ProjectSnapshotBuildSections.Objects,
                "catalogs" => ProjectSnapshotBuildSections.Catalogs,
                "structures" => ProjectSnapshotBuildSections.Structures,
                "relations" => ProjectSnapshotBuildSections.Relations,
                "timeline" => ProjectSnapshotBuildSections.Timeline,
                _ => (ProjectSnapshotBuildSections?)null,
            };

            if (currentSection is null)
            {
                return null;
            }

            parsed |= currentSection.Value;
        }

        return parsed == 0 ? null : parsed | ProjectSnapshotBuildSections.Project;
    }

    private static string FormatBuildSections(ProjectSnapshotBuildSections sections)
    {
        var names = new List<string>();
        AddSectionName(names, sections, ProjectSnapshotBuildSections.Project, "project");
        AddSectionName(names, sections, ProjectSnapshotBuildSections.Objects, "objects");
        AddSectionName(names, sections, ProjectSnapshotBuildSections.Catalogs, "catalogs");
        AddSectionName(names, sections, ProjectSnapshotBuildSections.Structures, "structures");
        AddSectionName(names, sections, ProjectSnapshotBuildSections.Relations, "relations");
        AddSectionName(names, sections, ProjectSnapshotBuildSections.Timeline, "timeline");
        return string.Join(',', names);
    }

    private static void AddSectionName(
        ICollection<string> names,
        ProjectSnapshotBuildSections sections,
        ProjectSnapshotBuildSections section,
        string name)
    {
        if (sections.HasFlag(section))
        {
            names.Add(name);
        }
    }

    private static string TruncateError(string error) =>
        error.Length <= 2000 ? error : error[..2000];

    private static CatalogDto ToCatalogDto(Catalog catalog) =>
        new(
            catalog.Id,
            catalog.Key,
            catalog.Name,
            catalog.Description,
            catalog.IsSystem,
            catalog.SupportsHierarchy,
            catalog.HierarchyMode);

    private static CatalogEntryDto ToCatalogEntryDto(CatalogEntry entry)
    {
        var values = entry.FieldValues
            .GroupBy(value => value.FieldDefinitionId)
            .Select(group => new CatalogEntryFieldValueDto(
                group.Key,
                group.FirstOrDefault(value => value.Value != null)?.Value,
                group
                    .Where(value => value.ReferencedEntryId != null)
                    .Select(value => value.ReferencedEntryId!.Value)
                    .OrderBy(id => id)
                    .ToList()))
            .ToList();

        return new CatalogEntryDto(
            entry.Id,
            entry.Name,
            entry.Description,
            entry.ImagePath,
            entry.EntryGroupId,
            entry.EntryGroup?.Name,
            entry.ParentLinks
                .Select(link => link.ParentEntryId)
                .OrderBy(id => id)
                .ToList(),
            values);
    }

    private static CatalogEntryGroupDto ToCatalogEntryGroupDto(CatalogEntryGroup group) =>
        new(
            group.Id,
            group.Name,
            group.ParentLinks
                .Select(link => link.ParentGroupId)
                .OrderBy(id => id)
                .ToList());

    private static CatalogFieldDefinitionDto ToCatalogFieldDefinitionDto(CatalogFieldDefinition field) =>
        new(
            field.Id,
            field.Name,
            field.DataType,
            field.IsRequired,
            field.FieldGroupId,
            field.FieldGroup?.Name,
            field.MinValue,
            field.MaxValue,
            string.IsNullOrWhiteSpace(field.OptionsJson)
                ? []
                : JsonSerializer.Deserialize<IReadOnlyList<string>>(field.OptionsJson) ?? [],
            field.ReferenceCatalogId);

    [Flags]
    private enum ProjectSnapshotBuildSections
    {
        Project = 1,
        Objects = 2,
        Catalogs = 4,
        Structures = 8,
        Relations = 16,
        Timeline = 32,
    }

    private sealed record SnapshotObjectSection(
        IReadOnlyDictionary<string, IReadOnlyList<Contracts.Objects.StoryObjectSummaryDto>> ObjectSummariesByType,
        IReadOnlyDictionary<string, IReadOnlyList<Contracts.Objects.StoryObjectDto>> ObjectsByType,
        IReadOnlyDictionary<string, IReadOnlyList<AttributeDefinitionDto>> AttributeDefinitionsByType,
        IReadOnlyDictionary<string, IReadOnlyList<AttributeGroupDto>> AttributeGroupsByType);

    private sealed record SnapshotCatalogSection(
        IReadOnlyList<CatalogDto> Catalogs,
        IReadOnlyDictionary<int, IReadOnlyList<CatalogEntryDto>> CatalogEntriesByCatalogId,
        IReadOnlyDictionary<int, IReadOnlyList<CatalogEntryGroupDto>> CatalogGroupsByCatalogId,
        IReadOnlyDictionary<int, IReadOnlyList<CatalogFieldDefinitionDto>> CatalogFieldsByCatalogId);

    private sealed record SnapshotStructureSection(
        IReadOnlyList<Contracts.Structures.StructureDto> Structures,
        IReadOnlyList<Contracts.Structures.StructureUsageDto> StructureUsages,
        IReadOnlyList<Contracts.Structures.StructureAssignmentDto> StructureAssignments);

    private sealed record SnapshotRelationSection(
        Contracts.Relations.RelationGraphDto RelationGraph,
        Contracts.Relations.RelationGraphLayoutDto? RelationGraphLayout);

    private sealed record SnapshotTimelineSection(
        Contracts.Timelines.TimelineDto? TimelineInfo,
        IReadOnlyList<Contracts.Timelines.TimelineEventDto> TimelineEvents,
        IReadOnlyList<Contracts.Timelines.TimelineEventLinkDto> TimelineLinks,
        Contracts.Timelines.TimelineLayoutDto? TimelineLayout,
        Contracts.Timelines.TimelineLayoutRulesConfig? TimelineLayoutRules);
}
