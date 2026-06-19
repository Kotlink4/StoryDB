using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.TemplatePacks;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.TemplatePacks;

public sealed partial class TemplatePackService
{
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

    private static TemplatePackSummaryDto ToSummary(TemplatePackSnapshot snapshot) =>
        new(snapshot.Attributes.Count, snapshot.Catalogs.Count, snapshot.Structures.Count);

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
            .Include(structure => structure.Nodes)
            .Include(structure => structure.Edges)
            .OrderBy(structure => structure.Name)
            .Select(structure => new StructureSnapshot(
                structure.Name,
                structure.Description,
                structure.OwnerKind,
                structure.LayoutKind,
                "none",
                "manual",
                null,
                null,
                structure.Nodes
                    .OrderBy(node => node.LevelIndex)
                    .ThenBy(node => node.SortOrder)
                    .Select(node => new StructureNodeSnapshot(
                        node.Id.ToString(),
                        node.ParentNodeId == null ? null : node.ParentNodeId.Value.ToString(),
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
        string? CatalogSyncMode,
        string? LinkedCatalogKey,
        string? LinkedCatalogName,
        IReadOnlyList<StructureNodeSnapshot> Nodes,
        IReadOnlyList<StructureEdgeSnapshot> Edges);

    private sealed record StructureNodeSnapshot(
        string ClientId,
        string? ParentClientId,
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


