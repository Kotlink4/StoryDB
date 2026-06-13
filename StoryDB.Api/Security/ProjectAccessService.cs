using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Security;

public sealed class ProjectAccessService(
    StoryDbContext dbContext,
    ICurrentUserService currentUserService) : IProjectAccessService
{
    public int? CurrentUserId => currentUserService.UserId;

    public IQueryable<Project> GetAccessibleProjects()
    {
        var userId = currentUserService.UserId;
        return userId is null
            ? dbContext.Projects.Where(project => false)
            : dbContext.Projects.Where(project => project.OwnerUserId == userId.Value);
    }

    public Task<bool> HasProjectAccessAsync(int projectId, CancellationToken cancellationToken = default) =>
        GetAccessibleProjects().AnyAsync(project => project.Id == projectId, cancellationToken);

    public Task<Project?> FindAccessibleProjectAsync(int projectId, CancellationToken cancellationToken = default) =>
        GetAccessibleProjects().FirstOrDefaultAsync(project => project.Id == projectId, cancellationToken);
}
