using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Services;

namespace StoryDB.Api.Services.Objects;

public partial class ObjectService
{
    private Task<bool> ObjectExists(int projectId, int objectId) =>
        dbContext.Objects.AnyAsync(storyObject =>
            storyObject.ProjectId == projectId &&
            storyObject.Id == objectId);

    private Task<string?> GetObjectTypeKey(int projectId, int objectId) =>
        dbContext.Objects
            .Where(storyObject => storyObject.ProjectId == projectId && storyObject.Id == objectId)
            .Select(storyObject => storyObject.ObjectType == null ? null : storyObject.ObjectType.Key)
            .FirstOrDefaultAsync();

    private Task MarkRelationGraphLayoutsStale(int projectId)
    {
        var now = DateTime.UtcNow;
        cacheSingleFlight.Remove(ProjectCacheKeys.RelationGraph(projectId));
        InvalidateObjectSummariesCache(projectId);
        InvalidateProjectObjectDetailsCache(projectId);

        return dbContext.RelationGraphLayouts
            .Where(layout => layout.ProjectId == projectId && !layout.IsStale)
            .ExecuteUpdateAsync(updates => updates
                .SetProperty(layout => layout.IsStale, true)
                .SetProperty(layout => layout.UpdatedAt, now));
    }

    private void InvalidateObjectSummariesCache(int projectId)
    {
        foreach (var typeKey in ObjectSummaryCacheTypeKeys)
        {
            cacheSingleFlight.Remove(ProjectCacheKeys.ObjectSummaries(projectId, typeKey));
        }
    }

    private void InvalidateObjectDetailCache(int projectId, int objectId) =>
        cacheSingleFlight.Remove(ProjectCacheKeys.ObjectDetail(projectId, objectId));

    private void InvalidateProjectObjectDetailsCache(int projectId) =>
        cacheSingleFlight.RemoveByPrefix(ProjectCacheKeys.ObjectDetailsPrefix(projectId));

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
