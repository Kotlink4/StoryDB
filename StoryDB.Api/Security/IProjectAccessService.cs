using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Security;

public interface IProjectAccessService
{
    int? CurrentUserId { get; }

    IQueryable<Project> GetAccessibleProjects();

    Task<bool> HasProjectAccessAsync(int projectId, CancellationToken cancellationToken = default);

    Task<Project?> FindAccessibleProjectAsync(int projectId, CancellationToken cancellationToken = default);
}
