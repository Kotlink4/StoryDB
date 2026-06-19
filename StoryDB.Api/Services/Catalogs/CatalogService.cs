using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;

namespace StoryDB.Api.Services.Catalogs;

public sealed partial class CatalogService(
    StoryDbContext dbContext,
    ICacheSingleFlight cacheSingleFlight) : ICatalogService
{
    private static readonly TimeSpan CatalogCacheDuration = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan CatalogDetailCacheDuration = TimeSpan.FromSeconds(20);
    private static readonly HashSet<string> FieldTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text",
        "longText",
        "number",
        "select",
        "entryReference",
        "multipleEntryReference",
    };

    private static readonly HashSet<string> HierarchyModes = new(StringComparer.OrdinalIgnoreCase)
    {
        "entries",
        "entriesInGroup",
        "groups",
    };

    public IReadOnlySet<string> SupportedHierarchyModes => HierarchyModes;

    public IReadOnlySet<string> SupportedFieldTypes => FieldTypes;

    public async Task<IReadOnlyList<Catalog>> GetCatalogsAsync(
        int projectId,
        CancellationToken cancellationToken = default)
    {
        return await cacheSingleFlight.GetOrCreateAsync(
            ProjectCacheKeys.Catalogs(projectId),
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = CatalogCacheDuration;

                return await dbContext.Catalogs
                    .AsNoTracking()
                    .Where(catalog => catalog.ProjectId == projectId && !catalog.IsSystem)
                    .OrderBy(catalog => catalog.SortOrder)
                    .ThenBy(catalog => catalog.Name)
                    .ToListAsync(cancellationToken);
            });
    }

    public async Task<CatalogServiceResult<Catalog>> CreateCatalogAsync(
        int projectId,
        CatalogDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (!await dbContext.Projects.AnyAsync(project => project.Id == projectId, cancellationToken))
        {
            return CatalogServiceResult<Catalog>.NotFound();
        }

        var name = draft.Name.Trim();
        var hasDuplicateName = await dbContext.Catalogs.AnyAsync(catalog =>
            catalog.ProjectId == projectId && catalog.Name == name,
            cancellationToken);
        if (hasDuplicateName)
        {
            return CatalogServiceResult<Catalog>.Invalid("Catalog with this name already exists.");
        }

        var existingKeys = await dbContext.Catalogs
            .Where(catalog => catalog.ProjectId == projectId)
            .Select(catalog => catalog.Key)
            .ToListAsync(cancellationToken);
        var sortOrder = await dbContext.Catalogs
            .Where(catalog => catalog.ProjectId == projectId)
            .Select(catalog => (int?)catalog.SortOrder)
            .MaxAsync(cancellationToken) ?? 0;
        var now = DateTime.UtcNow;
        var catalog = new Catalog
        {
            ProjectId = projectId,
            Key = EnsureUniqueKey(ToCatalogKey(name), existingKeys),
            Name = name,
            Description = NormalizeOptionalText(draft.Description),
            SupportsHierarchy = draft.SupportsHierarchy,
            HierarchyMode = NormalizeHierarchyMode(draft.HierarchyMode),
            IsSystem = false,
            SortOrder = sortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Catalogs.Add(catalog);
        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult<Catalog>.Success(catalog);
    }

    public async Task<CatalogServiceResult<Catalog>> UpdateCatalogAsync(
        int projectId,
        int catalogId,
        CatalogDraft draft,
        CancellationToken cancellationToken = default)
    {
        var catalog = await dbContext.Catalogs
            .FirstOrDefaultAsync(currentCatalog =>
                currentCatalog.ProjectId == projectId &&
                currentCatalog.Id == catalogId,
                cancellationToken);
        if (catalog is null)
        {
            return CatalogServiceResult<Catalog>.NotFound();
        }

        var name = draft.Name.Trim();
        var hasDuplicateName = await dbContext.Catalogs.AnyAsync(currentCatalog =>
            currentCatalog.ProjectId == projectId &&
            currentCatalog.Id != catalogId &&
            currentCatalog.Name == name,
            cancellationToken);
        if (hasDuplicateName)
        {
            return CatalogServiceResult<Catalog>.Invalid("Catalog with this name already exists.");
        }

        catalog.Name = name;
        catalog.Description = NormalizeOptionalText(draft.Description);
        catalog.SupportsHierarchy = draft.SupportsHierarchy;
        catalog.HierarchyMode = NormalizeHierarchyMode(draft.HierarchyMode);
        catalog.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult<Catalog>.Success(catalog);
    }

    public async Task<CatalogServiceResult> DeleteCatalogAsync(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken = default)
    {
        var catalog = await dbContext.Catalogs
            .FirstOrDefaultAsync(currentCatalog =>
                currentCatalog.ProjectId == projectId &&
                currentCatalog.Id == catalogId,
                cancellationToken);
        if (catalog is null)
        {
            return CatalogServiceResult.NotFound();
        }

        if (catalog.IsSystem)
        {
            return CatalogServiceResult.Invalid("System catalogs cannot be deleted.");
        }

        var catalogUsageError = await ValidateCatalogCanBeDeleted(projectId, catalogId, cancellationToken);
        if (catalogUsageError is not null)
        {
            return CatalogServiceResult.Invalid(catalogUsageError);
        }

        var entryIds = await dbContext.CatalogEntries
            .Where(entry => entry.CatalogId == catalogId)
            .Select(entry => entry.Id)
            .ToListAsync(cancellationToken);
        if (entryIds.Count > 0)
        {
            dbContext.StoryObjectCatalogSelections.RemoveRange(
                dbContext.StoryObjectCatalogSelections.Where(selection =>
                    selection.CatalogEntryId != null && entryIds.Contains(selection.CatalogEntryId.Value)));
            dbContext.CatalogEntryHierarchyLinks.RemoveRange(
                dbContext.CatalogEntryHierarchyLinks.Where(link =>
                    entryIds.Contains(link.ParentEntryId) || entryIds.Contains(link.ChildEntryId)));
            dbContext.CatalogEntryFieldValues.RemoveRange(
                dbContext.CatalogEntryFieldValues.Where(value =>
                    value.ReferencedEntryId != null && entryIds.Contains(value.ReferencedEntryId.Value)));
        }

        var groupIds = await dbContext.CatalogEntryGroups
            .Where(group => group.CatalogId == catalogId)
            .Select(group => group.Id)
            .ToListAsync(cancellationToken);
        if (groupIds.Count > 0)
        {
            dbContext.StoryObjectCatalogSelections.RemoveRange(
                dbContext.StoryObjectCatalogSelections.Where(selection =>
                    selection.CatalogEntryGroupId != null && groupIds.Contains(selection.CatalogEntryGroupId.Value)));
            dbContext.CatalogEntryGroupHierarchyLinks.RemoveRange(
                dbContext.CatalogEntryGroupHierarchyLinks.Where(link =>
                    groupIds.Contains(link.ParentGroupId) || groupIds.Contains(link.ChildGroupId)));
        }

        dbContext.StoryObjectCatalogSelections.RemoveRange(
            dbContext.StoryObjectCatalogSelections.Where(selection => selection.CatalogId == catalogId));

        var referencingFields = await dbContext.CatalogFieldDefinitions
            .Where(definition => definition.ReferenceCatalogId == catalogId)
            .ToListAsync(cancellationToken);
        foreach (var field in referencingFields)
        {
            field.ReferenceCatalogId = null;
        }

        dbContext.Catalogs.Remove(catalog);
        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult.Success();
    }
}

