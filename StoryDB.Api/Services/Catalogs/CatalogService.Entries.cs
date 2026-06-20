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

}


