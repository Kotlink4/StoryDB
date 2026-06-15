namespace StoryDB.Api.Contracts.TemplatePacks;

public record TemplatePackExportOptions(
    bool IncludeAttributes = true,
    bool IncludeCatalogs = true,
    bool IncludeStructures = true);

public record CreateTemplatePackFromProjectRequest(
    int ProjectId,
    string Name,
    string? Description,
    bool IsPublic,
    TemplatePackExportOptions? Options);

public record UpdateTemplatePackRequest(
    string Name,
    string? Description,
    bool IsPublic);

public record SetTemplatePackFavoriteRequest(bool IsFavorite);

public record ApplyTemplatePackRequest(IReadOnlyList<int>? TemplatePackIds);

public record TemplatePackSummaryDto(
    int AttributeCount,
    int CatalogCount,
    int StructureCount);

public record TemplatePackListItemDto(
    int Id,
    string Name,
    string? Description,
    bool IsPublic,
    bool IsFavorite,
    int OwnerUserId,
    string OwnerDisplayName,
    int? SourceProjectId,
    string? SourceProjectName,
    DateTime UpdatedAt,
    TemplatePackSummaryDto Summary);
