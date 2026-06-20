using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.TemplatePacks;

public sealed partial class TemplatePackService
{
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

            await ApplyStructureAsync(projectId, catalogs, structureSnapshot, cancellationToken);
            existing.Add(structureSnapshot.Name);
        }
    }

    private async Task ApplyStructureAsync(
        int projectId,
        IReadOnlyList<Catalog> catalogs,
        StructureSnapshot structureSnapshot,
        CancellationToken cancellationToken)
    {
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

        var nodeMap = await ApplyStructureNodesAsync(structure, structureSnapshot, now, cancellationToken);
        ApplyStructureEdges(structure, structureSnapshot, nodeMap, now);
    }

    private async Task<Dictionary<string, StructureNode>> ApplyStructureNodesAsync(
        Structure structure,
        StructureSnapshot structureSnapshot,
        DateTime now,
        CancellationToken cancellationToken)
    {
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

        return nodeMap;
    }

    private void ApplyStructureEdges(
        Structure structure,
        StructureSnapshot structureSnapshot,
        IReadOnlyDictionary<string, StructureNode> nodeMap,
        DateTime now)
    {
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
