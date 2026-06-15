using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Projects;

public interface IProjectService
{
    Task<IReadOnlyList<ProjectListItem>> GetProjectsAsync(CancellationToken cancellationToken = default);

    Task<Project?> CreateProjectAsync(ProjectDraft draft, CancellationToken cancellationToken = default);

    Task<Project?> UpdateProjectAsync(int projectId, ProjectDraft draft, CancellationToken cancellationToken = default);

    Task<bool> DeleteProjectAsync(int projectId, CancellationToken cancellationToken = default);
}

public sealed record ProjectDraft(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys,
    IReadOnlyList<string>? PresetKeys,
    IReadOnlyList<int>? TemplatePackIds,
    string? Visibility);

public sealed record ProjectListItem(
    int Id,
    int OwnerUserId,
    string Name,
    string? CoverImagePath,
    int ObjectCount,
    DateTime UpdatedAt,
    string Visibility,
    IReadOnlyList<ProjectObjectTypeListItem> ObjectTypes);

public sealed record ProjectObjectTypeListItem(string Key, string Name, bool IsEnabled, int SortOrder);
