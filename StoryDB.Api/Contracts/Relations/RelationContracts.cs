namespace StoryDB.Api.Contracts.Relations;

public record RelationGraphDto(
    IReadOnlyList<RelationGraphNodeDto> Nodes,
    IReadOnlyList<RelationGraphEdgeDto> Edges);

public record RelationGraphNodeDto(
    int Id,
    string Name,
    string? Surname,
    string? SurnameForm,
    string? ImagePath,
    string TypeKey);

public record RelationGraphEdgeDto(
    string Id,
    int SourceId,
    int TargetId,
    string RelationType,
    string Category,
    int? Strength,
    int? Tension,
    bool IsBidirectional,
    string? Description);

public record RelationGraphLayoutDto(
    int Id,
    int ProjectId,
    string AlgorithmVersion,
    bool IsDefault,
    bool IsStale,
    DateTime GeneratedAt,
    IReadOnlyList<RelationGraphLayoutItemDto> Items);

public record RelationGraphLayoutItemDto(
    int Id,
    int StoryObjectId,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height,
    bool IsPinned);

public record RelationGraphLayoutRequest(
    IReadOnlyList<RelationGraphLayoutItemRequest> Items);

public record RelationGraphLayoutItemRequest(
    int StoryObjectId,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height,
    bool IsPinned);
