using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Caching;

namespace StoryDB.Api.Services.Catalogs;

public sealed partial class CatalogService
{
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
}
