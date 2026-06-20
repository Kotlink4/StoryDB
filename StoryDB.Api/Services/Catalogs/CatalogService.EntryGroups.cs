using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Catalogs;

public sealed partial class CatalogService
{
    public async Task<CatalogServiceResult<IReadOnlyList<CatalogEntryGroup>>> GetEntryGroupsAsync(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<IReadOnlyList<CatalogEntryGroup>>.NotFound();
        }

        var groups = await cacheSingleFlight.GetOrCreateAsync(
            ProjectCacheKeys.CatalogEntryGroups(projectId, catalogId),
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = CatalogDetailCacheDuration;

                return await dbContext.CatalogEntryGroups
                    .AsNoTracking()
                    .Include(group => group.ParentLinks)
                    .Where(group => group.CatalogId == catalogId)
                    .OrderBy(group => group.SortOrder)
                    .ThenBy(group => group.Name)
                    .ToListAsync(cancellationToken);
            });

        return CatalogServiceResult<IReadOnlyList<CatalogEntryGroup>>.Success(groups);
    }

    public async Task<CatalogServiceResult<CatalogEntryGroup>> CreateEntryGroupAsync(
        int projectId,
        int catalogId,
        CatalogEntryGroupDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<CatalogEntryGroup>.NotFound();
        }

        var validationError = await ValidateEntryGroupRequest(catalogId, draft, cancellationToken: cancellationToken);
        if (validationError is not null)
        {
            return CatalogServiceResult<CatalogEntryGroup>.Invalid(validationError);
        }

        var strategy = dbContext.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            var sortOrder = await dbContext.CatalogEntryGroups
                .Where(group => group.CatalogId == catalogId)
                .Select(group => (int?)group.SortOrder)
                .MaxAsync(cancellationToken) ?? 0;
            var group = new CatalogEntryGroup
            {
                CatalogId = catalogId,
                Name = draft.Name.Trim(),
                SortOrder = sortOrder + 10,
            };

            dbContext.CatalogEntryGroups.Add(group);
            await dbContext.SaveChangesAsync(cancellationToken);

            var groupHierarchyError = await ReplaceGroupHierarchyLinks(
                catalogId,
                group.Id,
                draft.ParentGroupIds,
                cancellationToken);
            if (groupHierarchyError is not null)
            {
                return CatalogServiceResult<CatalogEntryGroup>.Invalid(groupHierarchyError);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            InvalidateProjectCatalogCaches(projectId);

            return CatalogServiceResult<CatalogEntryGroup>.Success(await LoadEntryGroupAsync(group.Id, cancellationToken));
        });
    }

    public async Task<CatalogServiceResult<CatalogEntryGroup>> UpdateEntryGroupAsync(
        int projectId,
        int catalogId,
        int groupId,
        CatalogEntryGroupDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<CatalogEntryGroup>.NotFound();
        }

        var group = await dbContext.CatalogEntryGroups
            .FirstOrDefaultAsync(currentGroup =>
                currentGroup.CatalogId == catalogId &&
                currentGroup.Id == groupId,
                cancellationToken);
        if (group is null)
        {
            return CatalogServiceResult<CatalogEntryGroup>.NotFound();
        }

        var validationError = await ValidateEntryGroupRequest(catalogId, draft, groupId, cancellationToken);
        if (validationError is not null)
        {
            return CatalogServiceResult<CatalogEntryGroup>.Invalid(validationError);
        }

        group.Name = draft.Name.Trim();
        var groupHierarchyError = await ReplaceGroupHierarchyLinks(
            catalogId,
            group.Id,
            draft.ParentGroupIds,
            cancellationToken);
        if (groupHierarchyError is not null)
        {
            return CatalogServiceResult<CatalogEntryGroup>.Invalid(groupHierarchyError);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult<CatalogEntryGroup>.Success(await LoadEntryGroupAsync(group.Id, cancellationToken));
    }

    public async Task<CatalogServiceResult> DeleteEntryGroupAsync(
        int projectId,
        int catalogId,
        int groupId,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult.NotFound();
        }

        var group = await dbContext.CatalogEntryGroups
            .FirstOrDefaultAsync(currentGroup =>
                currentGroup.CatalogId == catalogId &&
                currentGroup.Id == groupId,
                cancellationToken);
        if (group is null)
        {
            return CatalogServiceResult.NotFound();
        }

        dbContext.CatalogEntryGroupHierarchyLinks.RemoveRange(
            dbContext.CatalogEntryGroupHierarchyLinks.Where(link =>
                link.ParentGroupId == groupId || link.ChildGroupId == groupId));
        dbContext.StoryObjectCatalogSelections.RemoveRange(
            dbContext.StoryObjectCatalogSelections.Where(selection => selection.CatalogEntryGroupId == groupId));
        dbContext.CatalogEntryGroups.Remove(group);
        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult.Success();
    }
}
