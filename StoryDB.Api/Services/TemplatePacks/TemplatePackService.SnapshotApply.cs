using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.TemplatePacks;

public sealed partial class TemplatePackService
{
    private async Task ApplySnapshotAsync(
        int projectId,
        string snapshotJson,
        CancellationToken cancellationToken)
    {
        var snapshot = JsonSerializer.Deserialize<TemplatePackSnapshot>(snapshotJson, JsonOptions);
        if (snapshot is null)
        {
            return;
        }

        await ApplyAttributesAsync(projectId, snapshot.Attributes, cancellationToken);
        await ApplyCatalogsAsync(projectId, snapshot.Catalogs, cancellationToken);
        await ApplyStructuresAsync(projectId, snapshot.Structures, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task ApplyAttributesAsync(
        int projectId,
        IReadOnlyList<AttributeSnapshot> attributes,
        CancellationToken cancellationToken)
    {
        if (attributes.Count == 0)
        {
            return;
        }

        var objectTypes = await dbContext.ObjectTypes
            .Where(type => type.ProjectId == projectId)
            .ToDictionaryAsync(type => type.Key, StringComparer.OrdinalIgnoreCase, cancellationToken);
        var existingGroups = await dbContext.AttributeGroups
            .Where(group => group.ProjectId == projectId)
            .ToListAsync(cancellationToken);
        var existingDefinitions = await dbContext.AttributeDefinitions
            .Where(definition => definition.ProjectId == projectId)
            .ToListAsync(cancellationToken);

        foreach (var attribute in attributes)
        {
            if (!objectTypes.TryGetValue(attribute.TypeKey, out var objectType))
            {
                continue;
            }

            AttributeGroup? group = null;
            if (!string.IsNullOrWhiteSpace(attribute.GroupName))
            {
                group = existingGroups.FirstOrDefault(currentGroup =>
                    currentGroup.ObjectTypeId == objectType.Id &&
                    string.Equals(currentGroup.Name, attribute.GroupName, StringComparison.OrdinalIgnoreCase));
                if (group is null)
                {
                    group = new AttributeGroup
                    {
                        ProjectId = projectId,
                        ObjectTypeId = objectType.Id,
                        Name = attribute.GroupName,
                        SortOrder = attribute.SortOrder,
                    };
                    dbContext.AttributeGroups.Add(group);
                    existingGroups.Add(group);
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            var definitionExists = existingDefinitions.Any(currentDefinition =>
                currentDefinition.ObjectTypeId == objectType.Id &&
                string.Equals(currentDefinition.Name, attribute.Name, StringComparison.OrdinalIgnoreCase));
            if (definitionExists)
            {
                continue;
            }

            var definition = new AttributeDefinition
            {
                ProjectId = projectId,
                ObjectTypeId = objectType.Id,
                AttributeGroupId = group?.Id,
                Name = attribute.Name,
                DataType = attribute.DataType,
                IconKey = attribute.IconKey,
                MinValue = attribute.MinValue,
                MaxValue = attribute.MaxValue,
                Unit = attribute.Unit,
                OptionsJson = attribute.OptionsJson,
                SortOrder = attribute.SortOrder,
            };
            dbContext.AttributeDefinitions.Add(definition);
            existingDefinitions.Add(definition);
        }
    }

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

    private async Task ApplyStructuresAsync(
        int projectId,
        IReadOnlyList<StructureSnapshot> structures,
        CancellationToken cancellationToken)
    {
        if (structures.Count == 0)
        {
            return;
        }

        var existingNames = await dbContext.Structures
            .AsNoTracking()
            .Where(structure => structure.ProjectId == projectId)
            .Select(structure => structure.Name)
            .ToListAsync(cancellationToken);
        var existing = existingNames.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var catalogs = await dbContext.Catalogs
            .AsNoTracking()
            .Where(catalog => catalog.ProjectId == projectId)
            .Include(catalog => catalog.EntryGroups)
            .Include(catalog => catalog.Entries)
            .ToListAsync(cancellationToken);

        foreach (var structureSnapshot in structures)
        {
            if (existing.Contains(structureSnapshot.Name))
            {
                continue;
            }

            var now = DateTime.UtcNow;
            var linkedCatalog = FindCatalog(catalogs, structureSnapshot.LinkedCatalogKey, structureSnapshot.LinkedCatalogName);
            var ownerKind = string.Equals(structureSnapshot.OwnerKind, "catalog", StringComparison.OrdinalIgnoreCase) &&
                linkedCatalog is not null
                    ? "catalog"
                    : "project";
            var structure = new Structure
            {
                ProjectId = projectId,
                Name = structureSnapshot.Name,
                Description = structureSnapshot.Description,
                OwnerKind = ownerKind,
                OwnerId = ownerKind == "catalog" ? linkedCatalog?.Id : null,
                ApplicationScope = "characters",
                LayoutKind = structureSnapshot.LayoutKind,
                NodeBindingMode = "none",
                CatalogSyncMode = "manual",
                LinkedCatalogId = null,
                CreatedAt = now,
                UpdatedAt = now,
            };
            dbContext.Structures.Add(structure);
            await dbContext.SaveChangesAsync(cancellationToken);

            var nodeMap = new Dictionary<string, StructureNode>(StringComparer.OrdinalIgnoreCase);
            foreach (var nodeSnapshot in structureSnapshot.Nodes)
            {
                var node = new StructureNode
                {
                    StructureId = structure.Id,
                    LinkedCatalogEntryId = null,
                    LinkedCatalogEntryGroupId = null,
                    Name = nodeSnapshot.Name,
                    Description = nodeSnapshot.Description,
                    NodeType = nodeSnapshot.NodeType,
                    Color = nodeSnapshot.Color,
                    IconKey = nodeSnapshot.IconKey,
                    LevelIndex = nodeSnapshot.LevelIndex,
                    SortOrder = nodeSnapshot.SortOrder,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                dbContext.StructureNodes.Add(node);
                nodeMap[nodeSnapshot.ClientId] = node;
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            foreach (var nodeSnapshot in structureSnapshot.Nodes.Where(node => node.ParentClientId is not null))
            {
                if (nodeMap.TryGetValue(nodeSnapshot.ClientId, out var node) &&
                    nodeSnapshot.ParentClientId is not null &&
                    nodeMap.TryGetValue(nodeSnapshot.ParentClientId, out var parentNode))
                {
                    node.ParentNodeId = parentNode.Id;
                }
            }

            foreach (var edgeSnapshot in structureSnapshot.Edges)
            {
                if (!nodeMap.TryGetValue(edgeSnapshot.SourceClientId, out var sourceNode) ||
                    !nodeMap.TryGetValue(edgeSnapshot.TargetClientId, out var targetNode))
                {
                    continue;
                }

                dbContext.StructureEdges.Add(new StructureEdge
                {
                    StructureId = structure.Id,
                    SourceNodeId = sourceNode.Id,
                    TargetNodeId = targetNode.Id,
                    RelationType = edgeSnapshot.RelationType,
                    Description = edgeSnapshot.Description,
                    SortOrder = edgeSnapshot.SortOrder,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }

            existing.Add(structureSnapshot.Name);
        }
    }

    private static Catalog? FindCatalog(
        IReadOnlyList<Catalog> catalogs,
        string? key,
        string? name)
    {
        if (!string.IsNullOrWhiteSpace(key))
        {
            var byKey = catalogs.FirstOrDefault(catalog =>
                string.Equals(catalog.Key, key, StringComparison.OrdinalIgnoreCase));
            if (byKey is not null)
            {
                return byKey;
            }
        }

        return string.IsNullOrWhiteSpace(name)
            ? null
            : catalogs.FirstOrDefault(catalog =>
                string.Equals(catalog.Name, name, StringComparison.OrdinalIgnoreCase));
    }
}


