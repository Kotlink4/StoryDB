using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Projects;

public interface IProjectService
{
    Task<IReadOnlyList<Project>> GetProjectsAsync(CancellationToken cancellationToken = default);

    Task<Project?> CreateProjectAsync(ProjectDraft draft, CancellationToken cancellationToken = default);

    Task<Project?> UpdateProjectAsync(int projectId, ProjectDraft draft, CancellationToken cancellationToken = default);

    Task<bool> DeleteProjectAsync(int projectId, CancellationToken cancellationToken = default);
}

public sealed record ProjectDraft(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys,
    IReadOnlyList<string>? PresetKeys);
