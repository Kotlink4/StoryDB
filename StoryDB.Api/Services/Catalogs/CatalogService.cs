using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Catalogs;

public sealed class CatalogService(
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

        if (await CatalogEntryIsLinkedToStructure(projectId, entryId, cancellationToken))
        {
            return CatalogServiceResult.Invalid("Catalog entry is linked to a structure node and cannot be deleted.");
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

        if (await CatalogEntryGroupIsLinkedToStructure(projectId, groupId, cancellationToken))
        {
            return CatalogServiceResult.Invalid("Catalog group is linked to a structure node and cannot be deleted.");
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

    public async Task<CatalogServiceResult<IReadOnlyList<CatalogFieldGroup>>> GetFieldGroupsAsync(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<IReadOnlyList<CatalogFieldGroup>>.NotFound();
        }

        var groups = await cacheSingleFlight.GetOrCreateAsync(
            ProjectCacheKeys.CatalogFieldGroups(projectId, catalogId),
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = CatalogDetailCacheDuration;

                return await dbContext.CatalogFieldGroups
                    .AsNoTracking()
                    .Where(group => group.CatalogId == catalogId)
                    .OrderBy(group => group.SortOrder)
                    .ThenBy(group => group.Name)
                    .ToListAsync(cancellationToken);
            });

        return CatalogServiceResult<IReadOnlyList<CatalogFieldGroup>>.Success(groups);
    }

    public async Task<CatalogServiceResult<CatalogFieldGroup>> CreateFieldGroupAsync(
        int projectId,
        int catalogId,
        CatalogFieldGroupDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<CatalogFieldGroup>.NotFound();
        }

        var name = draft.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogFieldGroups.AnyAsync(group =>
            group.CatalogId == catalogId && group.Name == name,
            cancellationToken);
        if (hasDuplicateName)
        {
            return CatalogServiceResult<CatalogFieldGroup>.Invalid("Field group with this name already exists.");
        }

        var sortOrder = await dbContext.CatalogFieldGroups
            .Where(group => group.CatalogId == catalogId)
            .Select(group => (int?)group.SortOrder)
            .MaxAsync(cancellationToken) ?? 0;
        var group = new CatalogFieldGroup
        {
            CatalogId = catalogId,
            Name = name,
            SortOrder = sortOrder + 10,
        };

        dbContext.CatalogFieldGroups.Add(group);
        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult<CatalogFieldGroup>.Success(group);
    }

    public async Task<CatalogServiceResult<IReadOnlyList<CatalogFieldDefinition>>> GetFieldDefinitionsAsync(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<IReadOnlyList<CatalogFieldDefinition>>.NotFound();
        }

        var fields = await cacheSingleFlight.GetOrCreateAsync(
            ProjectCacheKeys.CatalogFieldDefinitions(projectId, catalogId),
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = CatalogDetailCacheDuration;

                return await dbContext.CatalogFieldDefinitions
                    .AsNoTracking()
                    .Include(field => field.FieldGroup)
                    .Where(field => field.CatalogId == catalogId)
                    .OrderBy(field => field.FieldGroup == null ? "" : field.FieldGroup.Name)
                    .ThenBy(field => field.SortOrder)
                    .ThenBy(field => field.Name)
                    .ToListAsync(cancellationToken);
            });

        return CatalogServiceResult<IReadOnlyList<CatalogFieldDefinition>>.Success(fields);
    }

    public async Task<CatalogServiceResult<CatalogFieldDefinition>> CreateFieldDefinitionAsync(
        int projectId,
        int catalogId,
        CatalogFieldDefinitionDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<CatalogFieldDefinition>.NotFound();
        }

        var validationError = await ValidateFieldDefinitionRequest(projectId, catalogId, draft, cancellationToken: cancellationToken);
        if (validationError is not null)
        {
            return CatalogServiceResult<CatalogFieldDefinition>.Invalid(validationError);
        }

        var sortOrder = await dbContext.CatalogFieldDefinitions
            .Where(field => field.CatalogId == catalogId)
            .Select(field => (int?)field.SortOrder)
            .MaxAsync(cancellationToken) ?? 0;
        var field = new CatalogFieldDefinition
        {
            CatalogId = catalogId,
            FieldGroupId = draft.FieldGroupId,
            Name = draft.Name.Trim(),
            DataType = draft.DataType.Trim(),
            IsRequired = draft.IsRequired,
            MinValue = draft.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
                ? draft.MinValue
                : null,
            MaxValue = draft.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
                ? draft.MaxValue
                : null,
            OptionsJson = draft.DataType.Equals("select", StringComparison.OrdinalIgnoreCase)
                ? JsonSerializer.Serialize(NormalizeOptions(draft.Options))
                : null,
            ReferenceCatalogId = IsReferenceField(draft.DataType) ? draft.ReferenceCatalogId : null,
            SortOrder = sortOrder + 10,
        };

        dbContext.CatalogFieldDefinitions.Add(field);
        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult<CatalogFieldDefinition>.Success(await LoadFieldDefinitionAsync(field.Id, cancellationToken));
    }

    public async Task<CatalogServiceResult<CatalogFieldDefinition>> UpdateFieldDefinitionAsync(
        int projectId,
        int catalogId,
        int fieldId,
        CatalogFieldDefinitionDraft draft,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult<CatalogFieldDefinition>.NotFound();
        }

        var field = await dbContext.CatalogFieldDefinitions
            .FirstOrDefaultAsync(currentField =>
                currentField.CatalogId == catalogId &&
                currentField.Id == fieldId,
                cancellationToken);
        if (field is null)
        {
            return CatalogServiceResult<CatalogFieldDefinition>.NotFound();
        }

        var validationError = await ValidateFieldDefinitionRequest(projectId, catalogId, draft, fieldId, cancellationToken);
        if (validationError is not null)
        {
            return CatalogServiceResult<CatalogFieldDefinition>.Invalid(validationError);
        }

        field.FieldGroupId = draft.FieldGroupId;
        field.Name = draft.Name.Trim();
        field.DataType = draft.DataType.Trim();
        field.IsRequired = draft.IsRequired;
        field.MinValue = draft.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
            ? draft.MinValue
            : null;
        field.MaxValue = draft.DataType.Equals("number", StringComparison.OrdinalIgnoreCase)
            ? draft.MaxValue
            : null;
        field.OptionsJson = draft.DataType.Equals("select", StringComparison.OrdinalIgnoreCase)
            ? JsonSerializer.Serialize(NormalizeOptions(draft.Options))
            : null;
        field.ReferenceCatalogId = IsReferenceField(draft.DataType) ? draft.ReferenceCatalogId : null;

        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult<CatalogFieldDefinition>.Success(await LoadFieldDefinitionAsync(field.Id, cancellationToken));
    }

    public async Task<CatalogServiceResult> DeleteFieldDefinitionAsync(
        int projectId,
        int catalogId,
        int fieldId,
        CancellationToken cancellationToken = default)
    {
        if (!await CatalogExists(projectId, catalogId, cancellationToken))
        {
            return CatalogServiceResult.NotFound();
        }

        var field = await dbContext.CatalogFieldDefinitions
            .FirstOrDefaultAsync(currentField =>
                currentField.CatalogId == catalogId &&
                currentField.Id == fieldId,
                cancellationToken);
        if (field is null)
        {
            return CatalogServiceResult.NotFound();
        }

        dbContext.CatalogEntryFieldValues.RemoveRange(
            dbContext.CatalogEntryFieldValues.Where(value => value.FieldDefinitionId == fieldId));
        dbContext.CatalogFieldDefinitions.Remove(field);
        await dbContext.SaveChangesAsync(cancellationToken);
        InvalidateProjectCatalogCaches(projectId);

        return CatalogServiceResult.Success();
    }

    private Task<bool> CatalogExists(int projectId, int catalogId, CancellationToken cancellationToken) =>
        cacheSingleFlight.GetOrCreateAsync(
            ProjectCacheKeys.CatalogExists(projectId, catalogId),
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = CatalogDetailCacheDuration;

                return await dbContext.Catalogs.AnyAsync(catalog =>
                    catalog.ProjectId == projectId && catalog.Id == catalogId,
                    cancellationToken);
            });

    private void InvalidateProjectCatalogCaches(int projectId)
    {
        cacheSingleFlight.Remove(ProjectCacheKeys.Catalogs(projectId));
        cacheSingleFlight.RemoveByPrefix(ProjectCacheKeys.CatalogDetailsPrefix(projectId));
        cacheSingleFlight.RemoveByPrefix(ProjectCacheKeys.ObjectDetailsPrefix(projectId));
        cacheSingleFlight.Remove(ProjectCacheKeys.RelationGraph(projectId));
        cacheSingleFlight.Remove(ProjectCacheKeys.StructureSummaries(projectId));
        cacheSingleFlight.RemoveByPrefix(ProjectCacheKeys.StructureDetailsPrefix(projectId));
    }

    private async Task<string?> ValidateEntryRequest(
        int catalogId,
        CatalogEntryDraft draft,
        int? entryIdToIgnore = null,
        CancellationToken cancellationToken = default)
    {
        if (draft.EntryGroupId is not null)
        {
            var groupExists = await dbContext.CatalogEntryGroups.AnyAsync(group =>
                group.CatalogId == catalogId && group.Id == draft.EntryGroupId,
                cancellationToken);
            if (!groupExists)
            {
                return "Catalog entry group was not found.";
            }
        }

        var name = draft.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogEntries.AnyAsync(entry =>
            entry.CatalogId == catalogId &&
            entry.Name == name &&
            entry.Id != entryIdToIgnore,
            cancellationToken);
        return hasDuplicateName ? "Catalog entry with this name already exists." : null;
    }

    private async Task<string?> ValidateEntryGroupRequest(
        int catalogId,
        CatalogEntryGroupDraft draft,
        int? groupIdToIgnore = null,
        CancellationToken cancellationToken = default)
    {
        var name = draft.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogEntryGroups.AnyAsync(group =>
            group.CatalogId == catalogId &&
            group.Name == name &&
            group.Id != groupIdToIgnore,
            cancellationToken);
        return hasDuplicateName ? "Catalog entry group with this name already exists." : null;
    }

    private async Task<string?> ValidateFieldDefinitionRequest(
        int projectId,
        int catalogId,
        CatalogFieldDefinitionDraft draft,
        int? fieldIdToIgnore = null,
        CancellationToken cancellationToken = default)
    {
        var requestError = RequestValidators.ValidateCatalogFieldDefinition(
            draft.Name,
            draft.DataType,
            draft.MinValue,
            draft.MaxValue,
            draft.Options,
            draft.ReferenceCatalogId,
            FieldTypes);
        if (requestError is not null)
        {
            return requestError;
        }

        var name = draft.Name.Trim();
        var hasDuplicateName = await dbContext.CatalogFieldDefinitions.AnyAsync(field =>
            field.CatalogId == catalogId &&
            field.Name == name &&
            field.Id != fieldIdToIgnore,
            cancellationToken);
        if (hasDuplicateName)
        {
            return "Field with this name already exists.";
        }

        if (draft.FieldGroupId is not null)
        {
            var groupExists = await dbContext.CatalogFieldGroups.AnyAsync(group =>
                group.CatalogId == catalogId && group.Id == draft.FieldGroupId,
                cancellationToken);
            if (!groupExists)
            {
                return "Field group was not found.";
            }
        }

        if (IsReferenceField(draft.DataType))
        {
            var referenceCatalogExists = await dbContext.Catalogs.AnyAsync(catalog =>
                catalog.ProjectId == projectId && catalog.Id == draft.ReferenceCatalogId,
                cancellationToken);
            if (!referenceCatalogExists)
            {
                return "Reference catalog was not found.";
            }
        }

        return null;
    }

    private async Task<string?> ReplaceEntryFieldValues(
        int catalogId,
        int entryId,
        IReadOnlyList<CatalogEntryFieldValueDraft>? fieldValues,
        CancellationToken cancellationToken)
    {
        var definitions = await dbContext.CatalogFieldDefinitions
            .Where(field => field.CatalogId == catalogId)
            .ToListAsync(cancellationToken);
        var definitionsById = definitions.ToDictionary(field => field.Id);
        var requestValues = fieldValues ?? [];

        foreach (var requiredField in definitions.Where(field => field.IsRequired))
        {
            var requestValue = requestValues.FirstOrDefault(value => value.FieldDefinitionId == requiredField.Id);
            var hasValue = requestValue is not null &&
                           (!string.IsNullOrWhiteSpace(requestValue.Value) ||
                            (requestValue.ReferencedEntryIds?.Count ?? 0) > 0);
            if (!hasValue)
            {
                return $"{requiredField.Name} is required.";
            }
        }

        var valuesToAdd = new List<CatalogEntryFieldValue>();
        foreach (var requestValue in requestValues)
        {
            if (!definitionsById.TryGetValue(requestValue.FieldDefinitionId, out var definition))
            {
                return "Catalog field was not found.";
            }

            if (definition.DataType.Equals("number", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(requestValue.Value))
            {
                if (!double.TryParse(requestValue.Value, out var numericValue))
                {
                    return $"{definition.Name}: value must be a number.";
                }

                if (definition.MinValue is not null && numericValue < definition.MinValue)
                {
                    return $"{definition.Name}: value is below the minimum.";
                }

                if (definition.MaxValue is not null && numericValue > definition.MaxValue)
                {
                    return $"{definition.Name}: value is above the maximum.";
                }
            }

            if (definition.DataType.Equals("select", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(requestValue.Value))
            {
                var options = string.IsNullOrWhiteSpace(definition.OptionsJson)
                    ? []
                    : JsonSerializer.Deserialize<IReadOnlyList<string>>(definition.OptionsJson) ?? [];
                if (options.Count > 0 && !options.Contains(requestValue.Value, StringComparer.OrdinalIgnoreCase))
                {
                    return $"{definition.Name}: choose one of the allowed values.";
                }
            }

            if (IsReferenceField(definition.DataType))
            {
                var referencedIds = (requestValue.ReferencedEntryIds ?? [])
                    .Distinct()
                    .ToList();
                if (definition.DataType.Equals("entryReference", StringComparison.OrdinalIgnoreCase) && referencedIds.Count > 1)
                {
                    return $"{definition.Name}: choose one referenced entry.";
                }

                if (referencedIds.Count > 0)
                {
                    var validReferenceCount = await dbContext.CatalogEntries.CountAsync(entry =>
                        definition.ReferenceCatalogId != null &&
                        entry.CatalogId == definition.ReferenceCatalogId &&
                        referencedIds.Contains(entry.Id),
                        cancellationToken);
                    if (validReferenceCount != referencedIds.Count)
                    {
                        return $"{definition.Name}: referenced entry was not found.";
                    }
                }

                valuesToAdd.AddRange(referencedIds.Select(referencedId => new CatalogEntryFieldValue
                {
                    CatalogEntryId = entryId,
                    FieldDefinitionId = definition.Id,
                    ReferencedEntryId = referencedId,
                }));

                continue;
            }

            if (!string.IsNullOrWhiteSpace(requestValue.Value))
            {
                valuesToAdd.Add(new CatalogEntryFieldValue
                {
                    CatalogEntryId = entryId,
                    FieldDefinitionId = definition.Id,
                    Value = requestValue.Value.Trim(),
                });
            }
        }

        dbContext.CatalogEntryFieldValues.RemoveRange(
            dbContext.CatalogEntryFieldValues.Where(value => value.CatalogEntryId == entryId));
        dbContext.CatalogEntryFieldValues.AddRange(valuesToAdd);

        return null;
    }

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

        dbContext.CatalogEntryGroupHierarchyLinks.RemoveRange(
            dbContext.CatalogEntryGroupHierarchyLinks.Where(link => link.ChildGroupId == groupId));

        if (parentIds.Count == 0)
        {
            return null;
        }

        var validParentCount = await dbContext.CatalogEntryGroups.CountAsync(group =>
            group.CatalogId == catalogId && parentIds.Contains(group.Id),
            cancellationToken);
        if (validParentCount != parentIds.Count)
        {
            return "One or more parent groups were not found.";
        }

        dbContext.CatalogEntryGroupHierarchyLinks.AddRange(parentIds.Select(parentId => new CatalogEntryGroupHierarchyLink
        {
            ParentGroupId = parentId,
            ChildGroupId = groupId,
        }));

        return null;
    }

    private async Task<CatalogEntry> LoadEntryAsync(int entryId, CancellationToken cancellationToken) =>
        await dbContext.CatalogEntries
            .AsNoTracking()
            .AsSplitQuery()
            .Include(entry => entry.EntryGroup)
            .Include(entry => entry.FieldValues)
            .Include(entry => entry.ParentLinks)
            .FirstAsync(entry => entry.Id == entryId, cancellationToken);

    private async Task<CatalogEntryGroup> LoadEntryGroupAsync(int groupId, CancellationToken cancellationToken) =>
        await dbContext.CatalogEntryGroups
            .AsNoTracking()
            .Include(group => group.ParentLinks)
            .FirstAsync(group => group.Id == groupId, cancellationToken);

    private async Task<CatalogFieldDefinition> LoadFieldDefinitionAsync(int fieldId, CancellationToken cancellationToken) =>
        await dbContext.CatalogFieldDefinitions
            .AsNoTracking()
            .Include(field => field.FieldGroup)
            .FirstAsync(field => field.Id == fieldId, cancellationToken);

    private async Task<string?> ValidateCatalogCanBeDeleted(
        int projectId,
        int catalogId,
        CancellationToken cancellationToken)
    {
        if (await dbContext.Structures.AnyAsync(structure =>
            structure.ProjectId == projectId &&
            structure.LinkedCatalogId == catalogId,
            cancellationToken))
        {
            return "Catalog is linked to one or more structures and cannot be deleted.";
        }

        if (await dbContext.Structures.AnyAsync(structure =>
            structure.ProjectId == projectId &&
            structure.OwnerKind == "catalog" &&
            structure.OwnerId == catalogId,
            cancellationToken))
        {
            return "Catalog owns one or more structures and cannot be deleted.";
        }

        if (await dbContext.StructureUsages.AnyAsync(usage =>
            usage.ProjectId == projectId &&
            usage.TargetKind == "catalog" &&
            usage.TargetId == catalogId,
            cancellationToken))
        {
            return "Catalog has connected structure usages and cannot be deleted.";
        }

        if (await dbContext.CatalogFieldDefinitions.AnyAsync(definition =>
            definition.ReferenceCatalogId == catalogId &&
            definition.Catalog!.ProjectId == projectId,
            cancellationToken))
        {
            return "Catalog is used as a reference field source and cannot be deleted.";
        }

        return null;
    }

    private Task<bool> CatalogEntryIsLinkedToStructure(
        int projectId,
        int entryId,
        CancellationToken cancellationToken) =>
        dbContext.StructureNodes.AnyAsync(node =>
            node.LinkedCatalogEntryId == entryId &&
            node.Structure!.ProjectId == projectId,
            cancellationToken);

    private Task<bool> CatalogEntryGroupIsLinkedToStructure(
        int projectId,
        int groupId,
        CancellationToken cancellationToken) =>
        dbContext.StructureNodes.AnyAsync(node =>
            node.LinkedCatalogEntryGroupId == groupId &&
            node.Structure!.ProjectId == projectId,
            cancellationToken);

    private static bool IsReferenceField(string dataType) =>
        dataType.Equals("entryReference", StringComparison.OrdinalIgnoreCase) ||
        dataType.Equals("multipleEntryReference", StringComparison.OrdinalIgnoreCase);

    private static string NormalizeHierarchyMode(string? mode) =>
        string.IsNullOrWhiteSpace(mode) ? "entries" : mode.Trim();

    private static string NormalizeOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "" : value.Trim();

    private static string ToCatalogKey(string name)
    {
        var key = new string(name
            .Trim()
            .ToLowerInvariant()
            .Select(character => char.IsLetterOrDigit(character) ? character : '-')
            .ToArray());
        key = string.Join("-", key.Split('-', StringSplitOptions.RemoveEmptyEntries));

        return string.IsNullOrWhiteSpace(key) ? "catalog" : key;
    }

    private static string EnsureUniqueKey(string key, IReadOnlyCollection<string> existingKeys)
    {
        var usedKeys = existingKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (!usedKeys.Contains(key))
        {
            return key;
        }

        var index = 2;
        var nextKey = $"{key}-{index}";
        while (usedKeys.Contains(nextKey))
        {
            index += 1;
            nextKey = $"{key}-{index}";
        }

        return nextKey;
    }

    private static List<string> NormalizeOptions(IReadOnlyList<string>? options)
    {
        return (options ?? [])
            .Select(option => option.Trim())
            .Where(option => option.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
