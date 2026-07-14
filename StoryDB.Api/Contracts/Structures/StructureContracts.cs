namespace StoryDB.Api.Contracts.Structures;

public record StructureDto(
    int Id,
    int ProjectId,
    string Name,
    string? Description,
    string OwnerKind,
    int? OwnerId,
    string ApplicationScope,
    string LayoutKind,
    string NodeBindingMode,
    string CatalogSyncMode,
    int? LinkedCatalogId,
    int TimelineReferenceCount,
    IReadOnlyList<StructureNodeDto> Nodes,
    IReadOnlyList<StructureEdgeDto> Edges);

public record StructureSummaryDto(
    int Id,
    int ProjectId,
    string Name,
    string? Description,
    string OwnerKind,
    int? OwnerId,
    string ApplicationScope,
    string LayoutKind,
    string NodeBindingMode,
    string CatalogSyncMode,
    int? LinkedCatalogId,
    int NodeCount,
    int EdgeCount,
    int UsageCount,
    int AssignmentCount,
    int TimelineReferenceCount);

public record StructureUsageDto(
    int Id,
    int ProjectId,
    int StructureId,
    string StructureName,
    string TargetKind,
    int TargetId,
    string? DisplayName,
    string? Notes,
    bool IsPrimary);

public record StructureUsageRequest(
    string TargetKind,
    int TargetId,
    string? DisplayName,
    string? Notes,
    bool IsPrimary);

public record StructureAssignmentDto(
    int Id,
    int ProjectId,
    int StructureUsageId,
    int StructureId,
    string StructureName,
    int StructureNodeId,
    string StructureNodeName,
    string TargetKind,
    int TargetId,
    string TargetName,
    string TargetTypeKey,
    int? StoryObjectId,
    string? StoryObjectName,
    string? StoryObjectTypeKey,
    string? RoleLabel,
    string? Notes,
    int SortOrder);

public record StructureAssignmentRequest(
    int StructureNodeId,
    int? StoryObjectId,
    string? TargetKind,
    int? TargetId,
    string? RoleLabel,
    string? Notes,
    int SortOrder);

public record StructureNodeDto(
    int Id,
    int? ParentNodeId,
    int? LinkedCatalogEntryId,
    int? LinkedCatalogEntryGroupId,
    string Name,
    string? Description,
    string? NodeType,
    string? Color,
    string? IconKey,
    int LevelIndex,
    int SortOrder);

public record StructureEdgeDto(
    int Id,
    int SourceNodeId,
    int TargetNodeId,
    string RelationType,
    string? Description,
    int SortOrder);

public record StructureRequest(
    string Name,
    string? Description,
    string OwnerKind,
    int? OwnerId,
    string? ApplicationScope,
    string LayoutKind,
    string NodeBindingMode,
    string? CatalogSyncMode,
    int? LinkedCatalogId,
    IReadOnlyList<StructureNodeRequest> Nodes,
    IReadOnlyList<StructureEdgeRequest> Edges);

public record StructureDetailsRequest(
    string Name,
    string? Description);

public record StructureNodeRequest(
    string ClientId,
    string? ParentClientId,
    int? LinkedCatalogEntryId,
    int? LinkedCatalogEntryGroupId,
    string Name,
    string? Description,
    string? NodeType,
    string? Color,
    string? IconKey,
    int LevelIndex,
    int SortOrder);

public record StructureNodeDetailsRequest(
    string Name,
    string? Description,
    string? NodeType,
    string? Color,
    string? IconKey);

public record StructureEdgeRequest(
    string SourceClientId,
    string TargetClientId,
    string RelationType,
    string? Description,
    int SortOrder);
