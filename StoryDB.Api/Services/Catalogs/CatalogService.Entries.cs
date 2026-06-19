using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Catalogs;

public sealed partial class CatalogService
{
    public async Task<CatalogServiceResult<IReadOnlyList<CatalogEntry>>> GetEntriesAsync(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<IReadOnlyList<CatalogEntry>>.NotFound();
        }

        var entries = await cacheSingleFlight.GetOrCreateAsync(
            ProjectCacheKeys.CatalogEntries(projectId, catalogId),
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = CatalogDetailCacheDuration;

                return await dbContext.CatalogEntries
                    .AsNoTracking()
                    .AsSplitQuery()
                    .Include(entry => entry.EntryGroup)
                    .Include(entry => entry.FieldValues)
                    .Include(entry => entry.ParentLinks)
                    .Where(entry => entry.CatalogId == catalogId)
                    .OrderBy(entry => entry.SortOrder)
                    .ThenBy(entry => entry.Name)
                    .ToListAsync(cancellationToken);
            });

        return CatalogServiceResult<IReadOnlyList<CatalogEntry>>.Success(entries);
    }

    public async Task<CatalogServiceResult<CatalogEntry>> CreateEntryAsync(
        int projectId,
        int catalogId,
        CatalogEntryDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<CatalogEntry>.NotFound();
        }

        var validationError = await ValidateEntryRequest(catalogId, draft, cancellationToken: cancellationToken);
        if (validationError is not null)
        {
            return CatalogServiceResult<CatalogEntry>.Invalid(validationError);
        }

        var strategy = dbContext.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            var sortOrder = await dbContext.CatalogEntries
                .Where(entry => entry.CatalogId == catalogId)
                .Select(entry => (int?)entry.SortOrder)
                .MaxAsync(cancellationToken) ?? 0;
            var now = DateTime.UtcNow;
            var entry = new CatalogEntry
            {
                CatalogId = catalogId,
                EntryGroupId = draft.EntryGroupId,
                Name = draft.Name.Trim(),
                Description = NormalizeOptionalText(draft.Description),
                ImagePath = ValidationRules.NormalizeOptionalText(draft.ImagePath),
                SortOrder = sortOrder + 10,
                CreatedAt = now,
                UpdatedAt = now,
            };

            dbContext.CatalogEntries.Add(entry);
            await dbContext.SaveChangesAsync(cancellationToken);

            var fieldValidationError = await ReplaceEntryFieldValues(
                catalogId,
                entry.Id,
                draft.FieldValues,
                cancellationToken);
            if (fieldValidationError is not null)
            {
                return CatalogServiceResult<CatalogEntry>.Invalid(fieldValidationError);
            }

            var hierarchyValidationError = await ReplaceEntryHierarchyLinks(
                catalogId,
                entry.Id,
                draft.EntryGroupId,
                draft.ParentEntryIds,
                cancellationToken);
            if (hierarchyValidationError is not null)
            {
                return CatalogServiceResult<CatalogEntry>.Invalid(hierarchyValidationError);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            InvalidateProjectCatalogCaches(projectId);

            return CatalogServiceResult<CatalogEntry>.Success(await LoadEntryAsync(entry.Id, cancellationToken));
        });
    }

    public async Task<CatalogServiceResult<CatalogEntry>> UpdateEntryAsync(
        int projectId,
        int catalogId,
        int entryId,
        CatalogEntryDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<CatalogEntry>.NotFound();
        }

        var entry = await dbContext.CatalogEntries
            .FirstOrDefaultAsync(currentEntry =>
                currentEntry.CatalogId == catalogId &&
                currentEntry.Id == entryId,
                cancellationToken);
        if (entry is null)
        {
            return CatalogServiceResult<CatalogEntry>.NotFound();
        }

        var validationError = await ValidateEntryRequest(catalogId, draft, entryId, cancellationToken);
        if (validationError is not null)
        {
            return CatalogServiceResult<CatalogEntry>.Invalid(validationError);
        }

        entry.EntryGroupId = draft.EntryGroupId;
        entry.Name = draft.Name.Trim();
        entry.Description = NormalizeOptionalText(draft.Description);
        entry.ImagePath = ValidationRules.NormalizeOptionalText(draft.ImagePath);
        entry.UpdatedAt = DateTime.UtcNow;

        var fieldValidationError = await ReplaceEntryFieldValues(catalogId, entry.Id, draft.FieldValues, cancellationToken);
        if (fieldValidationError is not null)
        {
            return CatalogServiceResult<CatalogEntry>.Invalid(fieldValidationError);
        }

        var hierarchyValidationError = await ReplaceEntryHierarchyLinks(
            catalogId,
            entry.Id,
            draft.EntryGroupId,
            draft.ParentEntryIds,
            cancellationToken);
        if (hierarchyValidationError is not null)
        {
            return CatalogServiceResult<CatalogEntry>.Invalid(hierarchyValidationError);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult<CatalogEntry>.Success(await LoadEntryAsync(entry.Id, cancellationToken));
    }

    public async Task<CatalogServiceResult> DeleteEntryAsync(
        int projectId,
        int catalogId,
        int entryId,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult.NotFound();
        }

        var entry = await dbContext.CatalogEntries
            .FirstOrDefaultAsync(currentEntry =>
                currentEntry.CatalogId == catalogId &&
                currentEntry.Id == entryId,
                cancellationToken);
        if (entry is null)
        {
            return CatalogServiceResult.NotFound();
        }

        dbContext.CatalogEntryHierarchyLinks.RemoveRange(
            dbContext.CatalogEntryHierarchyLinks.Where(link =>
                link.ParentEntryId == entryId || link.ChildEntryId == entryId));
        dbContext.StoryObjectCatalogSelections.RemoveRange(
            dbContext.StoryObjectCatalogSelections.Where(selection => selection.CatalogEntryId == entryId));
        dbContext.CatalogEntryFieldValues.RemoveRange(
            dbContext.CatalogEntryFieldValues.Where(value =>
                value.ReferencedEntryId == entryId));

        dbContext.CatalogEntries.Remove(entry);
        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult.Success();
    }

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


