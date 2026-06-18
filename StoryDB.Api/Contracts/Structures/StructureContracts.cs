namespace StoryDB.Api.Contracts.Structures;

public record StructureDto(
    int Id,
    int ProjectId,
    string Name,
    string? Description,
    string OwnerKind,
    int? OwnerId,
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
    string LayoutKind,
    string NodeBindingMode,
    string CatalogSyncMode,
    int? LinkedCatalogId,
    int NodeCount,
    int EdgeCount,
    int UsageCount,
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
    int StoryObjectId,
    string StoryObjectName,
    string StoryObjectTypeKey,
    string? RoleLabel,
    string? Notes,
    int SortOrder);

public record StructureAssignmentRequest(
    int StructureNodeId,
    int StoryObjectId,
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

public record StructureCatalogSyncPreviewDto(
    int StructureId,
    int? LinkedCatalogId,
    string CatalogSyncMode,
    int ExistingNodeCount,
    int MissingNodeCount,
    IReadOnlyList<StructureCatalogSyncNodeDto> Nodes);

public record StructureCatalogSyncNodeDto(
    string SourceKind,
    int SourceId,
    string Name,
    string? Description,
    int? ParentSourceId,
    string? ParentSourceKind,
    int? ExistingNodeId,
    int? ParentNodeId,
    int LevelIndex,
    int SortOrder,
    string Action);

public record StructureCatalogSyncResultDto(
    int StructureId,
    int CreatedNodeCount,
    StructureDto Structure);

public record StructureCatalogAssignmentSyncPreviewDto(
    int StructureUsageId,
    int StructureId,
    int LinkedCatalogId,
    int ExistingAssignmentCount,
    int MissingAssignmentCount,
    IReadOnlyList<StructureCatalogAssignmentSyncItemDto> Items);

public record StructureCatalogAssignmentSyncItemDto(
    int StoryObjectId,
    string StoryObjectName,
    int StructureNodeId,
    string StructureNodeName,
    string SourceKind,
    int SourceId,
    string Action);

public record StructureCatalogAssignmentSyncResultDto(
    int StructureUsageId,
    int CreatedAssignmentCount,
    IReadOnlyList<StructureAssignmentDto> Assignments);
