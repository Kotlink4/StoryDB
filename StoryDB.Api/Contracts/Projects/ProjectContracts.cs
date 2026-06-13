namespace StoryDB.Api.Contracts.Projects;

public record CreateProjectRequest(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys,
    IReadOnlyList<string>? PresetKeys);

public record UpdateProjectRequest(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys,
    IReadOnlyList<string>? PresetKeys);

public record ProjectListItemDto(
    int Id,
    string Name,
    string? CoverImagePath,
    int ObjectCount,
    DateTime UpdatedAt,
    IReadOnlyList<ObjectTypeDto> ObjectTypes);

public record ObjectTypeDto(string Key, string Name, bool IsEnabled);

