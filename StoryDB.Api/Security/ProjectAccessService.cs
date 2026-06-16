using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Security;

public sealed class ProjectAccessService(
    StoryDbContext dbContext,
    ICurrentUserService currentUserService) : IProjectAccessService
{
    private readonly Dictionary<int, bool> readAccessCache = [];
    private readonly Dictionary<int, bool> writeAccessCache = [];
    private readonly Dictionary<int, bool> manageAccessCache = [];

    public int? CurrentUserId => currentUserService.UserId;

    public IQueryable<Project> GetAccessibleProjects()
    {
        var userId = currentUserService.UserId;
        return userId is null
            ? dbContext.Projects.Where(project => false)
            : dbContext.Projects.Where(project =>
                project.OwnerUserId == userId.Value ||
                project.Visibility == ProjectVisibility.PublicRead ||
                project.Visibility == ProjectVisibility.PublicEdit);
    }

    public IQueryable<Project> GetEditableProjects()
    {
        var userId = currentUserService.UserId;
        return userId is null
            ? dbContext.Projects.Where(project => false)
            : dbContext.Projects.Where(project =>
                project.OwnerUserId == userId.Value ||
                project.Visibility == ProjectVisibility.PublicEdit);
    }

    public IQueryable<Project> GetOwnedProjects()
    {
        var userId = currentUserService.UserId;
        return userId is null
            ? dbContext.Projects.Where(project => false)
            : dbContext.Projects.Where(project => project.OwnerUserId == userId.Value);
    }

    public Task<bool> HasProjectAccessAsync(int projectId, CancellationToken cancellationToken = default) =>
        GetCachedAccessAsync(
            readAccessCache,
            projectId,
            () => GetAccessibleProjects().AnyAsync(project => project.Id == projectId, cancellationToken));

    public Task<bool> HasProjectWriteAccessAsync(int projectId, CancellationToken cancellationToken = default) =>
        GetCachedAccessAsync(
            writeAccessCache,
            projectId,
            () => GetEditableProjects().AnyAsync(project => project.Id == projectId, cancellationToken));

    public Task<bool> HasProjectManageAccessAsync(int projectId, CancellationToken cancellationToken = default) =>
        GetCachedAccessAsync(
            manageAccessCache,
            projectId,
            () => GetOwnedProjects().AnyAsync(project => project.Id == projectId, cancellationToken));

    public Task<Project?> FindAccessibleProjectAsync(int projectId, CancellationToken cancellationToken = default) =>
        GetAccessibleProjects().FirstOrDefaultAsync(project => project.Id == projectId, cancellationToken);

    public Task<Project?> FindEditableProjectAsync(int projectId, CancellationToken cancellationToken = default) =>
        GetEditableProjects().FirstOrDefaultAsync(project => project.Id == projectId, cancellationToken);

    public Task<Project?> FindOwnedProjectAsync(int projectId, CancellationToken cancellationToken = default) =>
        GetOwnedProjects().FirstOrDefaultAsync(project => project.Id == projectId, cancellationToken);

    private static async Task<bool> GetCachedAccessAsync(
        Dictionary<int, bool> cache,
        int projectId,
        Func<Task<bool>> factory)
    {
        if (cache.TryGetValue(projectId, out var hasAccess))
        {
            return hasAccess;
        }

        hasAccess = await factory();
        cache[projectId] = hasAccess;
        return hasAccess;
    }
}
