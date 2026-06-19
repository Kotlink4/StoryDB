using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Catalogs;

public sealed partial class CatalogService
{
    private async Task<string?> ReplaceEntryHierarchyLinks(
        int catalogId,
        int entryId,
        int? entryGroupId,
        IReadOnlyList<int>? parentEntryIds,
        CancellationToken cancellationToken)
    {
        var catalog = await dbContext.Catalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(currentCatalog => currentCatalog.Id == catalogId, cancellationToken);
        var parentIds = (parentEntryIds ?? [])
            .Where(parentId => parentId != entryId)
            .Distinct()
            .ToList();

        dbContext.CatalogEntryHierarchyLinks.RemoveRange(
            dbContext.CatalogEntryHierarchyLinks.Where(link => link.ChildEntryId == entryId));

        if (catalog is null || !catalog.SupportsHierarchy || catalog.HierarchyMode == "groups" || parentIds.Count == 0)
        {
            return null;
        }

        var parentEntries = await dbContext.CatalogEntries
            .AsNoTracking()
            .Where(entry => entry.CatalogId == catalogId && parentIds.Contains(entry.Id))
            .Select(entry => new { entry.Id, entry.EntryGroupId })
            .ToListAsync(cancellationToken);
        if (parentEntries.Count != parentIds.Count)
        {
            return "One or more parent entries were not found.";
        }

        if (catalog.HierarchyMode == "entriesInGroup" &&
            parentEntries.Any(parent => parent.EntryGroupId != entryGroupId))
        {
            return "Parent entries must belong to the same group.";
        }

        dbContext.CatalogEntryHierarchyLinks.AddRange(parentIds.Select(parentId => new CatalogEntryHierarchyLink
        {
            ParentEntryId = parentId,
            ChildEntryId = entryId,
        }));

        return null;
    }

    private async Task<string?> ReplaceGroupHierarchyLinks(
        int catalogId,
        int groupId,
        IReadOnlyList<int>? parentGroupIds,
        CancellationToken cancellationToken)
    {
        var parentIds = (parentGroupIds ?? [])
            .Where(parentId => parentId != groupId)
            .Distinct()
            .ToList();

        if (parentIds.Count == 0)
        {
            dbContext.CatalogEntryGroupHierarchyLinks.RemoveRange(
                dbContext.CatalogEntryGroupHierarchyLinks.Where(link => link.ChildGroupId == groupId));
            return null;
        }

        var validParentCount = await dbContext.CatalogEntryGroups.CountAsync(group =>
            group.CatalogId == catalogId && parentIds.Contains(group.Id),
            cancellationToken);
        if (validParentCount != parentIds.Count)
        {
            return "One or more parent groups were not found.";
        }

        if (await WouldCreateGroupHierarchyCycle(catalogId, groupId, parentIds, cancellationToken))
        {
            return "Catalog group hierarchy cannot contain cycles.";
        }

        dbContext.CatalogEntryGroupHierarchyLinks.RemoveRange(
            dbContext.CatalogEntryGroupHierarchyLinks.Where(link => link.ChildGroupId == groupId));

        dbContext.CatalogEntryGroupHierarchyLinks.AddRange(parentIds.Select(parentId => new CatalogEntryGroupHierarchyLink
        {
            ParentGroupId = parentId,
            ChildGroupId = groupId,
        }));

        return null;
    }

    private async Task<bool> WouldCreateGroupHierarchyCycle(
        int catalogId,
        int groupId,
        IReadOnlyList<int> parentIds,
        CancellationToken cancellationToken)
    {
        var catalogGroupIds = await dbContext.CatalogEntryGroups
            .AsNoTracking()
            .Where(group => group.CatalogId == catalogId)
            .Select(group => group.Id)
            .ToListAsync(cancellationToken);
        var catalogGroupIdSet = catalogGroupIds.ToHashSet();
        var links = await dbContext.CatalogEntryGroupHierarchyLinks
            .AsNoTracking()
            .Where(link =>
                link.ChildGroupId != groupId &&
                catalogGroupIdSet.Contains(link.ParentGroupId) &&
                catalogGroupIdSet.Contains(link.ChildGroupId))
            .ToListAsync(cancellationToken);
        var childrenByParentId = links
            .GroupBy(link => link.ParentGroupId)
            .ToDictionary(group => group.Key, group => group.Select(link => link.ChildGroupId).ToList());

        var proposedParentIds = parentIds.ToHashSet();
        var stack = new Stack<int>();
        var visited = new HashSet<int>();
        stack.Push(groupId);

        while (stack.Count > 0)
        {
            var currentId = stack.Pop();
            if (!visited.Add(currentId))
            {
                continue;
            }

            if (currentId != groupId && proposedParentIds.Contains(currentId))
            {
                return true;
            }

            if (!childrenByParentId.TryGetValue(currentId, out var childIds))
            {
                continue;
            }

            foreach (var childId in childIds)
            {
                stack.Push(childId);
            }
        }

        return false;
    }
}

