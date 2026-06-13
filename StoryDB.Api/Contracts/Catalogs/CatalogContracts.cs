namespace StoryDB.Api.Contracts.Catalogs;

public record CatalogRequest(
    string Name,
    string? Description,
    bool SupportsHierarchy,
    string? HierarchyMode);

public record CatalogEntryRequest(
    string Name,
    string? Description,
    string? ImagePath,
    int? EntryGroupId,
    IReadOnlyList<int>? ParentEntryIds,
    IReadOnlyList<CatalogEntryFieldValueRequest>? FieldValues);

public record CatalogEntryFieldValueRequest(
    int FieldDefinitionId,
    string? Value,
    IReadOnlyList<int>? ReferencedEntryIds);

public record CatalogEntryGroupRequest(string Name, IReadOnlyList<int>? ParentGroupIds);

public record CatalogFieldGroupRequest(string Name);

public record CatalogFieldDefinitionRequest(
    string Name,
    string DataType,
    bool IsRequired,
    int? FieldGroupId,
    double? MinValue,
    double? MaxValue,
    IReadOnlyList<string>? Options,
    int? ReferenceCatalogId);

public record CatalogDto(
    int Id,
    string Key,
    string Name,
    string? Description,
    bool IsSystem,
    bool SupportsHierarchy,
    string HierarchyMode);

public record CatalogEntryDto(
    int Id,
    string Name,
    string? Description,
    string? ImagePath,
    int? EntryGroupId,
    string? EntryGroupName,
    IReadOnlyList<int> ParentEntryIds,
    IReadOnlyList<CatalogEntryFieldValueDto> FieldValues);

public record CatalogEntryFieldValueDto(
    int FieldDefinitionId,
    string? Value,
    IReadOnlyList<int> ReferencedEntryIds);

public record CatalogEntryGroupDto(int Id, string Name, IReadOnlyList<int> ParentGroupIds);

public record CatalogFieldGroupDto(int Id, string Name);

public record CatalogFieldDefinitionDto(
    int Id,
    string Name,
    string DataType,
    bool IsRequired,
    int? FieldGroupId,
    string? FieldGroupName,
    double? MinValue,
    double? MaxValue,
    IReadOnlyList<string> Options,
    int? ReferenceCatalogId);

