using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Security;

public interface IProjectAccessService
{
    int? CurrentUserId { get; }

    IQueryable<Project> GetAccessibleProjects();

    IQueryable<Project> GetEditableProjects();

    IQueryable<Project> GetOwnedProjects();

    Task<bool> HasProjectAccessAsync(int projectId, CancellationToken cancellationToken = default);

    Task<bool> HasProjectWriteAccessAsync(int projectId, CancellationToken cancellationToken = default);

    Task<bool> HasProjectManageAccessAsync(int projectId, CancellationToken cancellationToken = default);

    Task<Project?> FindAccessibleProjectAsync(int projectId, CancellationToken cancellationToken = default);

    Task<Project?> FindEditableProjectAsync(int projectId, CancellationToken cancellationToken = default);

    Task<Project?> FindOwnedProjectAsync(int projectId, CancellationToken cancellationToken = default);
}
