using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;

namespace StoryDB.Api.Services.Catalogs;

public sealed partial class CatalogService
{
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

