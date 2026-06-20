using StoryDB.Api.Contracts.Attributes;
using StoryDB.Api.Contracts.Catalogs;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Contracts.Relations;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Contracts.Timelines;

namespace StoryDB.Api.Contracts.Projects;

public sealed record ProjectSnapshotDto(
    long Id,
    int ProjectId,
    long Revision,
    int SchemaVersion,
    string Status,
    string Scope,
    IReadOnlyList<string> DirtySections,
    DateTime BuiltAt,
    DateTime SourceUpdatedAt,
    string? Error,
    ProjectSnapshotDataDto Data);

public sealed record ProjectSnapshotDataDto(
    ProjectSnapshotProjectDto Project,
    IReadOnlyList<ObjectTypeDto> ObjectTypes,
    IReadOnlyDictionary<string, IReadOnlyList<StoryObjectSummaryDto>> ObjectSummariesByType,
    IReadOnlyDictionary<string, IReadOnlyList<StoryObjectDto>> ObjectsByType,
    IReadOnlyDictionary<string, IReadOnlyList<AttributeDefinitionDto>> AttributeDefinitionsByType,
    IReadOnlyDictionary<string, IReadOnlyList<AttributeGroupDto>> AttributeGroupsByType,
    IReadOnlyList<CatalogDto> Catalogs,
    IReadOnlyDictionary<int, IReadOnlyList<CatalogEntryDto>> CatalogEntriesByCatalogId,
    IReadOnlyDictionary<int, IReadOnlyList<CatalogEntryGroupDto>> CatalogGroupsByCatalogId,
    IReadOnlyDictionary<int, IReadOnlyList<CatalogFieldDefinitionDto>> CatalogFieldsByCatalogId,
    IReadOnlyList<StructureDto> Structures,
    IReadOnlyList<StructureUsageDto> StructureUsages,
    IReadOnlyList<StructureAssignmentDto> StructureAssignments,
    RelationGraphDto RelationGraph,
    RelationGraphLayoutDto? RelationGraphLayout,
    TimelineDto? TimelineInfo,
    IReadOnlyList<TimelineEventDto> TimelineEvents,
    IReadOnlyList<TimelineEventLinkDto> TimelineLinks,
    TimelineLayoutDto? TimelineLayout,
    TimelineLayoutRulesConfig? TimelineLayoutRules);

public sealed record ProjectSnapshotProjectDto(
    int Id,
    string Name,
    string? CoverImagePath,
    string Visibility,
    DateTime UpdatedAt);

public sealed record ProjectSnapshotRebuildRequest(IReadOnlyList<string> Sections);
