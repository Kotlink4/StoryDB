using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Catalogs;

public interface ICatalogService
{
    IReadOnlySet<string> SupportedHierarchyModes { get; }

    IReadOnlySet<string> SupportedFieldTypes { get; }

    Task<IReadOnlyList<Catalog>> GetCatalogsAsync(int projectId, CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<Catalog>> CreateCatalogAsync(
        int projectId,
        CatalogDraft draft,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<Catalog>> UpdateCatalogAsync(
        int projectId,
        int catalogId,
        CatalogDraft draft,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult> DeleteCatalogAsync(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<IReadOnlyList<CatalogEntry>>> GetEntriesAsync(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<CatalogEntry>> CreateEntryAsync(
        int projectId,
        int catalogId,
        CatalogEntryDraft draft,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<CatalogEntry>> UpdateEntryAsync(
        int projectId,
        int catalogId,
        int entryId,
        CatalogEntryDraft draft,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult> DeleteEntryAsync(
        int projectId,
        int catalogId,
        int entryId,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<IReadOnlyList<CatalogEntryGroup>>> GetEntryGroupsAsync(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<CatalogEntryGroup>> CreateEntryGroupAsync(
        int projectId,
        int catalogId,
        CatalogEntryGroupDraft draft,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<CatalogEntryGroup>> UpdateEntryGroupAsync(
        int projectId,
        int catalogId,
        int groupId,
        CatalogEntryGroupDraft draft,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult> DeleteEntryGroupAsync(
        int projectId,
        int catalogId,
        int groupId,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<IReadOnlyList<CatalogFieldGroup>>> GetFieldGroupsAsync(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<CatalogFieldGroup>> CreateFieldGroupAsync(
        int projectId,
        int catalogId,
        CatalogFieldGroupDraft draft,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<IReadOnlyList<CatalogFieldDefinition>>> GetFieldDefinitionsAsync(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<CatalogFieldDefinition>> CreateFieldDefinitionAsync(
        int projectId,
        int catalogId,
        CatalogFieldDefinitionDraft draft,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult<CatalogFieldDefinition>> UpdateFieldDefinitionAsync(
        int projectId,
        int catalogId,
        int fieldId,
        CatalogFieldDefinitionDraft draft,
        CancellationToken cancellationToken = default);

    Task<CatalogServiceResult> DeleteFieldDefinitionAsync(
        int projectId,
        int catalogId,
        int fieldId,
        CancellationToken cancellationToken = default);
}

public sealed record CatalogDraft(
    string Name,
    string? Description,
    bool SupportsHierarchy,
    string? HierarchyMode);

public sealed record CatalogEntryDraft(
    string Name,
    string? Description,
    string? ImagePath,
    int? EntryGroupId,
    IReadOnlyList<int>? ParentEntryIds,
    IReadOnlyList<CatalogEntryFieldValueDraft>? FieldValues);

public sealed record CatalogEntryFieldValueDraft(
    int FieldDefinitionId,
    string? Value,
    IReadOnlyList<int>? ReferencedEntryIds);

public sealed record CatalogEntryGroupDraft(string Name, IReadOnlyList<int>? ParentGroupIds);

public sealed record CatalogFieldGroupDraft(string Name);

public sealed record CatalogFieldDefinitionDraft(
    string Name,
    string DataType,
    bool IsRequired,
    int? FieldGroupId,
    double? MinValue,
    double? MaxValue,
    IReadOnlyList<string>? Options,
    int? ReferenceCatalogId);
