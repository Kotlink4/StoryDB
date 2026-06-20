using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.TemplatePacks;

public sealed partial class TemplatePackService
{
    private async Task ApplyCatalogsAsync(
        int projectId,
        IReadOnlyList<CatalogSnapshot> catalogs,
        CancellationToken cancellationToken)
    {
        if (catalogs.Count == 0)
        {
            return;
        }

        var existingCatalogs = await dbContext.Catalogs
            .Where(catalog => catalog.ProjectId == projectId)
            .Include(catalog => catalog.EntryGroups)
            .Include(catalog => catalog.FieldGroups)
            .Include(catalog => catalog.FieldDefinitions)
            .Include(catalog => catalog.Entries)
                .ThenInclude(entry => entry.FieldValues)
            .ToListAsync(cancellationToken);

        foreach (var catalogSnapshot in catalogs)
        {
            var now = DateTime.UtcNow;
            var catalog = existingCatalogs.FirstOrDefault(currentCatalog =>
                string.Equals(currentCatalog.Key, catalogSnapshot.Key, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(currentCatalog.Name, catalogSnapshot.Name, StringComparison.OrdinalIgnoreCase));
            if (catalog is null)
            {
                catalog = new Catalog
                {
                    ProjectId = projectId,
                    Key = catalogSnapshot.Key,
                    Name = catalogSnapshot.Name,
                    Description = catalogSnapshot.Description,
                    SupportsHierarchy = catalogSnapshot.SupportsHierarchy,
                    HierarchyMode = catalogSnapshot.HierarchyMode,
                    SortOrder = catalogSnapshot.SortOrder,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                dbContext.Catalogs.Add(catalog);
                existingCatalogs.Add(catalog);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            await ApplyCatalogGroupsAsync(catalog, catalogSnapshot, cancellationToken);
            await ApplyCatalogFieldsAsync(catalog, catalogSnapshot, cancellationToken);
            await ApplyCatalogEntriesAsync(catalog, catalogSnapshot, now, cancellationToken);
        }
    }

    private async Task ApplyCatalogGroupsAsync(
        Catalog catalog,
        CatalogSnapshot catalogSnapshot,
        CancellationToken cancellationToken)
    {
        foreach (var groupSnapshot in catalogSnapshot.EntryGroups)
        {
            if (catalog.EntryGroups.Any(group => string.Equals(group.Name, groupSnapshot.Name, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            catalog.EntryGroups.Add(new CatalogEntryGroup
            {
                CatalogId = catalog.Id,
                Name = groupSnapshot.Name,
                SortOrder = groupSnapshot.SortOrder,
            });
        }

        foreach (var groupSnapshot in catalogSnapshot.FieldGroups)
        {
            if (catalog.FieldGroups.Any(group => string.Equals(group.Name, groupSnapshot.Name, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            catalog.FieldGroups.Add(new CatalogFieldGroup
            {
                CatalogId = catalog.Id,
                Name = groupSnapshot.Name,
                SortOrder = groupSnapshot.SortOrder,
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task ApplyCatalogFieldsAsync(
        Catalog catalog,
        CatalogSnapshot catalogSnapshot,
        CancellationToken cancellationToken)
    {
        foreach (var fieldSnapshot in catalogSnapshot.Fields)
        {
            if (catalog.FieldDefinitions.Any(field => string.Equals(field.Name, fieldSnapshot.Name, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            var fieldGroupId = string.IsNullOrWhiteSpace(fieldSnapshot.GroupName)
                ? null
                : catalog.FieldGroups
                    .FirstOrDefault(group => string.Equals(group.Name, fieldSnapshot.GroupName, StringComparison.OrdinalIgnoreCase))
                    ?.Id;
            catalog.FieldDefinitions.Add(new CatalogFieldDefinition
            {
                CatalogId = catalog.Id,
                FieldGroupId = fieldGroupId,
                Name = fieldSnapshot.Name,
                DataType = fieldSnapshot.DataType,
                IsRequired = fieldSnapshot.IsRequired,
                MinValue = fieldSnapshot.MinValue,
                MaxValue = fieldSnapshot.MaxValue,
                OptionsJson = fieldSnapshot.OptionsJson,
                SortOrder = fieldSnapshot.SortOrder,
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task ApplyCatalogEntriesAsync(
        Catalog catalog,
        CatalogSnapshot catalogSnapshot,
        DateTime now,
        CancellationToken cancellationToken)
    {
        foreach (var entrySnapshot in catalogSnapshot.Entries)
        {
            if (catalog.Entries.Any(entry => string.Equals(entry.Name, entrySnapshot.Name, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            var entryGroupId = string.IsNullOrWhiteSpace(entrySnapshot.GroupName)
                ? null
                : catalog.EntryGroups
                    .FirstOrDefault(group => string.Equals(group.Name, entrySnapshot.GroupName, StringComparison.OrdinalIgnoreCase))
                    ?.Id;
            var entry = new CatalogEntry
            {
                CatalogId = catalog.Id,
                EntryGroupId = entryGroupId,
                Name = entrySnapshot.Name,
                Description = entrySnapshot.Description,
                ImagePath = entrySnapshot.ImagePath,
                SortOrder = entrySnapshot.SortOrder,
                CreatedAt = now,
                UpdatedAt = now,
            };
            catalog.Entries.Add(entry);
            dbContext.CatalogEntries.Add(entry);
            await dbContext.SaveChangesAsync(cancellationToken);

            foreach (var valueSnapshot in entrySnapshot.FieldValues)
            {
                var field = catalog.FieldDefinitions.FirstOrDefault(currentField =>
                    string.Equals(currentField.Name, valueSnapshot.FieldName, StringComparison.OrdinalIgnoreCase));
                if (field is null)
                {
                    continue;
                }

                dbContext.CatalogEntryFieldValues.Add(new CatalogEntryFieldValue
                {
                    CatalogEntryId = entry.Id,
                    FieldDefinitionId = field.Id,
                    Value = valueSnapshot.Value,
                });
            }
        }
    }
}
