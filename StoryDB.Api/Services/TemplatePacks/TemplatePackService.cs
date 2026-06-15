using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.TemplatePacks;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Security;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.TemplatePacks;

public sealed class TemplatePackService(
    StoryDbContext dbContext,
    IProjectAccessService projectAccessService) : ITemplatePackService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false,
    };

    public async Task<IReadOnlyList<ProjectTemplatePack>> GetTemplatePacksAsync(
        string scope,
        CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null)
        {
            return [];
        }

        var normalizedScope = scope.Trim().ToLowerInvariant();
        var query = dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .Include(pack => pack.OwnerUser)
            .Include(pack => pack.SourceProject)
            .Include(pack => pack.Favorites.Where(favorite => favorite.UserId == userId.Value))
            .AsQueryable();

        query = normalizedScope switch
        {
            "public" => query.Where(pack => pack.IsPublic),
            "favorites" => query.Where(pack => pack.Favorites.Any(favorite => favorite.UserId == userId.Value)),
            _ => query.Where(pack => pack.OwnerUserId == userId.Value),
        };

        return await query
            .OrderByDescending(pack => pack.UpdatedAt)
            .ThenBy(pack => pack.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<ProjectTemplatePack?> CreateFromProjectAsync(
        CreateTemplatePackFromProjectRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null)
        {
            return null;
        }

        if (request.Name.Trim().Length == 0)
        {
            return null;
        }

        var sourceProject = await projectAccessService.FindAccessibleProjectAsync(request.ProjectId, cancellationToken);
        if (sourceProject is null)
        {
            return null;
        }

        var snapshot = await BuildSnapshotAsync(request.ProjectId, request.Options ?? new TemplatePackExportOptions(), cancellationToken);
        var now = DateTime.UtcNow;
        var pack = new ProjectTemplatePack
        {
            OwnerUserId = userId.Value,
            SourceProjectId = request.ProjectId,
            Name = request.Name.Trim(),
            Description = ValidationRules.NormalizeOptionalText(request.Description),
            IsPublic = request.IsPublic,
            SnapshotJson = JsonSerializer.Serialize(snapshot, JsonOptions),
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.ProjectTemplatePacks.Add(pack);
        await dbContext.SaveChangesAsync(cancellationToken);

        return await dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .Include(currentPack => currentPack.OwnerUser)
            .Include(currentPack => currentPack.SourceProject)
            .Include(currentPack => currentPack.Favorites.Where(favorite => favorite.UserId == userId.Value))
            .FirstAsync(currentPack => currentPack.Id == pack.Id, cancellationToken);
    }

    public async Task<ProjectTemplatePack?> UpdateAsync(
        int templatePackId,
        UpdateTemplatePackRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null || request.Name.Trim().Length == 0)
        {
            return null;
        }

        var pack = await dbContext.ProjectTemplatePacks
            .Include(currentPack => currentPack.OwnerUser)
            .Include(currentPack => currentPack.SourceProject)
            .Include(currentPack => currentPack.Favorites.Where(favorite => favorite.UserId == userId.Value))
            .FirstOrDefaultAsync(currentPack => currentPack.Id == templatePackId, cancellationToken);
        if (pack is null || pack.OwnerUserId != userId.Value)
        {
            return null;
        }

        pack.Name = request.Name.Trim();
        pack.Description = ValidationRules.NormalizeOptionalText(request.Description);
        pack.IsPublic = request.IsPublic;
        pack.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return pack;
    }

    public async Task<bool> DeleteAsync(int templatePackId, CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null)
        {
            return false;
        }

        var pack = await dbContext.ProjectTemplatePacks
            .FirstOrDefaultAsync(currentPack => currentPack.Id == templatePackId, cancellationToken);
        if (pack is null || pack.OwnerUserId != userId.Value)
        {
            return false;
        }

        dbContext.ProjectTemplatePacks.Remove(pack);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ProjectTemplatePack?> SetFavoriteAsync(
        int templatePackId,
        bool isFavorite,
        CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null)
        {
            return null;
        }

        var pack = await dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .FirstOrDefaultAsync(currentPack =>
                currentPack.Id == templatePackId &&
                (currentPack.OwnerUserId == userId.Value || currentPack.IsPublic),
                cancellationToken);
        if (pack is null)
        {
            return null;
        }

        var favorite = await dbContext.ProjectTemplatePackFavorites
            .FirstOrDefaultAsync(currentFavorite =>
                currentFavorite.UserId == userId.Value &&
                currentFavorite.TemplatePackId == templatePackId,
                cancellationToken);

        if (isFavorite && favorite is null)
        {
            dbContext.ProjectTemplatePackFavorites.Add(new ProjectTemplatePackFavorite
            {
                UserId = userId.Value,
                TemplatePackId = templatePackId,
                CreatedAt = DateTime.UtcNow,
            });
        }

        if (!isFavorite && favorite is not null)
        {
            dbContext.ProjectTemplatePackFavorites.Remove(favorite);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return await dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .Include(currentPack => currentPack.OwnerUser)
            .Include(currentPack => currentPack.SourceProject)
            .Include(currentPack => currentPack.Favorites.Where(currentFavorite => currentFavorite.UserId == userId.Value))
            .FirstAsync(currentPack => currentPack.Id == templatePackId, cancellationToken);
    }

    public async Task<bool> ApplyTemplatePackAsync(
        int projectId,
        int templatePackId,
        CancellationToken cancellationToken = default)
    {
        var pack = await FindReadablePackAsync(templatePackId, cancellationToken);
        if (pack is null)
        {
            return false;
        }

        await ApplySnapshotAsync(projectId, pack.SnapshotJson, cancellationToken);
        return true;
    }

    public async Task ApplyTemplatePacksAsync(
        int projectId,
        IReadOnlyList<int>? templatePackIds,
        CancellationToken cancellationToken = default)
    {
        var ids = (templatePackIds ?? [])
            .Where(id => id > 0)
            .Distinct()
            .Take(20)
            .ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var packs = await dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .Where(pack => ids.Contains(pack.Id))
            .ToListAsync(cancellationToken);
        foreach (var packId in ids)
        {
            var pack = packs.FirstOrDefault(currentPack => currentPack.Id == packId);
            if (pack is null || !CanReadPack(pack))
            {
                continue;
            }

            await ApplySnapshotAsync(projectId, pack.SnapshotJson, cancellationToken);
        }
    }

    private async Task<ProjectTemplatePack?> FindReadablePackAsync(int templatePackId, CancellationToken cancellationToken)
    {
        var pack = await dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .FirstOrDefaultAsync(currentPack => currentPack.Id == templatePackId, cancellationToken);
        return pack is not null && CanReadPack(pack) ? pack : null;
    }

    private bool CanReadPack(ProjectTemplatePack pack)
    {
        var userId = projectAccessService.CurrentUserId;
        return userId is not null && (pack.OwnerUserId == userId.Value || pack.IsPublic);
    }

    private async Task<TemplatePackSnapshot> BuildSnapshotAsync(
        int projectId,
        TemplatePackExportOptions options,
        CancellationToken cancellationToken)
    {
        var snapshot = new TemplatePackSnapshot(1, [], [], []);

        if (options.IncludeAttributes)
        {
            snapshot = snapshot with
            {
                Attributes = await BuildAttributeSnapshotAsync(projectId, cancellationToken),
            };
        }

        if (options.IncludeCatalogs)
        {
            snapshot = snapshot with
            {
                Catalogs = await BuildCatalogSnapshotAsync(projectId, cancellationToken),
            };
        }

        if (options.IncludeStructures)
        {
            snapshot = snapshot with
            {
                Structures = await BuildStructureSnapshotAsync(projectId, cancellationToken),
            };
        }

        return snapshot;
    }

    private async Task<IReadOnlyList<AttributeSnapshot>> BuildAttributeSnapshotAsync(
        int projectId,
        CancellationToken cancellationToken)
    {
        var objectTypes = await dbContext.ObjectTypes
            .AsNoTracking()
            .Where(type => type.ProjectId == projectId)
            .ToDictionaryAsync(type => type.Id, type => type.Key, cancellationToken);
        var groups = await dbContext.AttributeGroups
            .AsNoTracking()
            .Where(group => group.ProjectId == projectId)
            .ToListAsync(cancellationToken);
        var definitions = await dbContext.AttributeDefinitions
            .AsNoTracking()
            .Where(definition => definition.ProjectId == projectId)
            .OrderBy(definition => definition.SortOrder)
            .ThenBy(definition => definition.Name)
            .ToListAsync(cancellationToken);

        return definitions
            .Where(definition => objectTypes.ContainsKey(definition.ObjectTypeId))
            .Select(definition => new AttributeSnapshot(
                objectTypes[definition.ObjectTypeId],
                definition.AttributeGroupId == null
                    ? null
                    : groups.FirstOrDefault(group => group.Id == definition.AttributeGroupId)?.Name,
                definition.Name,
                definition.DataType,
                definition.IconKey,
                definition.MinValue,
                definition.MaxValue,
                definition.Unit,
                definition.OptionsJson,
                definition.SortOrder))
            .ToList();
    }

    private async Task<IReadOnlyList<CatalogSnapshot>> BuildCatalogSnapshotAsync(
        int projectId,
        CancellationToken cancellationToken)
    {
        var catalogs = await dbContext.Catalogs
            .AsNoTrackingWithIdentityResolution()
            .Where(catalog => catalog.ProjectId == projectId)
            .Include(catalog => catalog.EntryGroups)
            .Include(catalog => catalog.FieldGroups)
            .Include(catalog => catalog.FieldDefinitions)
            .Include(catalog => catalog.Entries)
                .ThenInclude(entry => entry.FieldValues)
                    .ThenInclude(value => value.FieldDefinition)
            .OrderBy(catalog => catalog.SortOrder)
            .ThenBy(catalog => catalog.Name)
            .ToListAsync(cancellationToken);

        return catalogs
            .Select(catalog => new CatalogSnapshot(
                catalog.Key,
                catalog.Name,
                catalog.Description,
                catalog.SupportsHierarchy,
                catalog.HierarchyMode,
                catalog.SortOrder,
                catalog.EntryGroups
                    .OrderBy(group => group.SortOrder)
                    .Select(group => new CatalogGroupSnapshot(group.Name, group.SortOrder))
                    .ToList(),
                catalog.FieldGroups
                    .OrderBy(group => group.SortOrder)
                    .Select(group => new CatalogGroupSnapshot(group.Name, group.SortOrder))
                    .ToList(),
                catalog.FieldDefinitions
                    .OrderBy(field => field.SortOrder)
                    .Select(field => new CatalogFieldSnapshot(
                        field.Name,
                        field.DataType,
                        field.IsRequired,
                        field.MinValue,
                        field.MaxValue,
                        field.OptionsJson,
                        field.FieldGroup == null ? null : field.FieldGroup.Name,
                        field.SortOrder))
                    .ToList(),
                catalog.Entries
                    .OrderBy(entry => entry.SortOrder)
                    .Select(entry => new CatalogEntrySnapshot(
                        entry.Name,
                        entry.Description,
                        entry.ImagePath,
                        entry.EntryGroup == null ? null : entry.EntryGroup.Name,
                        entry.SortOrder,
                        entry.FieldValues
                            .Where(value => value.FieldDefinition != null)
                            .Select(value => new CatalogEntryFieldValueSnapshot(
                                value.FieldDefinition!.Name,
                                value.Value))
                            .ToList()))
                    .ToList()))
            .ToList();
    }

    private async Task<IReadOnlyList<StructureSnapshot>> BuildStructureSnapshotAsync(
        int projectId,
        CancellationToken cancellationToken)
    {
        return await dbContext.Structures
            .AsNoTrackingWithIdentityResolution()
            .Where(structure => structure.ProjectId == projectId)
            .Include(structure => structure.LinkedCatalog)
            .Include(structure => structure.Nodes)
                .ThenInclude(node => node.LinkedCatalogEntry)
            .Include(structure => structure.Nodes)
                .ThenInclude(node => node.LinkedCatalogEntryGroup)
            .Include(structure => structure.Edges)
            .OrderBy(structure => structure.Name)
            .Select(structure => new StructureSnapshot(
                structure.Name,
                structure.Description,
                structure.OwnerKind,
                structure.LayoutKind,
                structure.NodeBindingMode,
                structure.LinkedCatalog == null ? null : structure.LinkedCatalog.Key,
                structure.LinkedCatalog == null ? null : structure.LinkedCatalog.Name,
                structure.Nodes
                    .OrderBy(node => node.LevelIndex)
                    .ThenBy(node => node.SortOrder)
                    .Select(node => new StructureNodeSnapshot(
                        node.Id.ToString(),
                        node.ParentNodeId == null ? null : node.ParentNodeId.Value.ToString(),
                        node.LinkedCatalogEntry == null ? null : node.LinkedCatalogEntry.Name,
                        node.LinkedCatalogEntryGroup == null ? null : node.LinkedCatalogEntryGroup.Name,
                        node.Name,
                        node.Description,
                        node.NodeType,
                        node.Color,
                        node.IconKey,
                        node.LevelIndex,
                        node.SortOrder))
                    .ToList(),
                structure.Edges
                    .OrderBy(edge => edge.SortOrder)
                    .Select(edge => new StructureEdgeSnapshot(
                        edge.SourceNodeId.ToString(),
                        edge.TargetNodeId.ToString(),
                        edge.RelationType,
                        edge.Description,
                        edge.SortOrder))
                    .ToList()))
            .ToListAsync(cancellationToken);
    }

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
                LayoutKind = structureSnapshot.LayoutKind,
                NodeBindingMode = structureSnapshot.NodeBindingMode,
                LinkedCatalogId = linkedCatalog?.Id,
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
                    LinkedCatalogEntryId = FindCatalogEntryId(linkedCatalog, nodeSnapshot.LinkedCatalogEntryName),
                    LinkedCatalogEntryGroupId = FindCatalogGroupId(linkedCatalog, nodeSnapshot.LinkedCatalogEntryGroupName),
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

    private static int? FindCatalogEntryId(Catalog? catalog, string? name)
    {
        return string.IsNullOrWhiteSpace(name)
            ? null
            : catalog?.Entries.FirstOrDefault(entry =>
                string.Equals(entry.Name, name, StringComparison.OrdinalIgnoreCase))?.Id;
    }

    private static int? FindCatalogGroupId(Catalog? catalog, string? name)
    {
        return string.IsNullOrWhiteSpace(name)
            ? null
            : catalog?.EntryGroups.FirstOrDefault(group =>
                string.Equals(group.Name, name, StringComparison.OrdinalIgnoreCase))?.Id;
    }

    private sealed record TemplatePackSnapshot(
        int SchemaVersion,
        IReadOnlyList<AttributeSnapshot> Attributes,
        IReadOnlyList<CatalogSnapshot> Catalogs,
        IReadOnlyList<StructureSnapshot> Structures);

    private sealed record AttributeSnapshot(
        string TypeKey,
        string? GroupName,
        string Name,
        string DataType,
        string? IconKey,
        double? MinValue,
        double? MaxValue,
        string? Unit,
        string? OptionsJson,
        int SortOrder);

    private sealed record CatalogSnapshot(
        string Key,
        string Name,
        string? Description,
        bool SupportsHierarchy,
        string HierarchyMode,
        int SortOrder,
        IReadOnlyList<CatalogGroupSnapshot> EntryGroups,
        IReadOnlyList<CatalogGroupSnapshot> FieldGroups,
        IReadOnlyList<CatalogFieldSnapshot> Fields,
        IReadOnlyList<CatalogEntrySnapshot> Entries);

    private sealed record CatalogGroupSnapshot(string Name, int SortOrder);

    private sealed record CatalogFieldSnapshot(
        string Name,
        string DataType,
        bool IsRequired,
        double? MinValue,
        double? MaxValue,
        string? OptionsJson,
        string? GroupName,
        int SortOrder);

    private sealed record CatalogEntrySnapshot(
        string Name,
        string? Description,
        string? ImagePath,
        string? GroupName,
        int SortOrder,
        IReadOnlyList<CatalogEntryFieldValueSnapshot> FieldValues);

    private sealed record CatalogEntryFieldValueSnapshot(string FieldName, string? Value);

    private sealed record StructureSnapshot(
        string Name,
        string? Description,
        string OwnerKind,
        string LayoutKind,
        string NodeBindingMode,
        string? LinkedCatalogKey,
        string? LinkedCatalogName,
        IReadOnlyList<StructureNodeSnapshot> Nodes,
        IReadOnlyList<StructureEdgeSnapshot> Edges);

    private sealed record StructureNodeSnapshot(
        string ClientId,
        string? ParentClientId,
        string? LinkedCatalogEntryName,
        string? LinkedCatalogEntryGroupName,
        string Name,
        string? Description,
        string? NodeType,
        string? Color,
        string? IconKey,
        int LevelIndex,
        int SortOrder);

    private sealed record StructureEdgeSnapshot(
        string SourceClientId,
        string TargetClientId,
        string RelationType,
        string? Description,
        int SortOrder);
}
