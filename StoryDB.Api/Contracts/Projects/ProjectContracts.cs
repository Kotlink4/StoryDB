namespace StoryDB.Api.Contracts.Projects;

public record CreateProjectRequest(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys,
    IReadOnlyList<string>? PresetKeys,
    IReadOnlyList<int>? TemplatePackIds,
    string? Visibility);

public record UpdateProjectRequest(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys,
    IReadOnlyList<string>? PresetKeys,
    IReadOnlyList<int>? TemplatePackIds,
    string? Visibility);

public record ProjectListItemDto(
    int Id,
    string Name,
    string? CoverImagePath,
    int ObjectCount,
    DateTime UpdatedAt,
    string Visibility,
    bool CanEdit,
    bool CanManage,
    IReadOnlyList<ObjectTypeDto> ObjectTypes);

public record ObjectTypeDto(string Key, string Name, bool IsEnabled);

