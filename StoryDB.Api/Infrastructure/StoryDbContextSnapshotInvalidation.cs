using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Data;

public partial class StoryDbContext
{
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await MarkChangedProjectSnapshotsStaleAsync(cancellationToken);
        return await base.SaveChangesAsync(cancellationToken);
    }

    public override async Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        await MarkChangedProjectSnapshotsStaleAsync(cancellationToken);
        return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private async Task MarkChangedProjectSnapshotsStaleAsync(CancellationToken cancellationToken)
    {
        var changed = ChangeTracker.Entries()
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();
        if (changed.Count == 0)
        {
            return;
        }

        var projectIds = new HashSet<int>();
        var dirtySections = new HashSet<string>(StringComparer.Ordinal);
        var storyObjectIds = new HashSet<int>();
        var catalogIds = new HashSet<int>();
        var catalogEntryIds = new HashSet<int>();
        var catalogEntryGroupIds = new HashSet<int>();
        var timelineIds = new HashSet<int>();
        var timelineEventIds = new HashSet<int>();
        var structureIds = new HashSet<int>();
        var structureNodeIds = new HashSet<int>();

        foreach (var entry in changed)
        {
            if (entry.Entity is ProjectSnapshot or AuditLog)
            {
                continue;
            }

            switch (entry.Entity)
            {
                case Project project:
                    AddPositive(projectIds, project.Id);
                    AddDirty(dirtySections, "project");
                    break;
                case StoryObject:
                    AddDirty(dirtySections, "objects");
                    AddDirty(dirtySections, "relations");
                    AddDirty(dirtySections, "structures");
                    AddDirty(dirtySections, "timeline");
                    break;
                case AttributeDefinition:
                case AttributeGroup:
                    AddDirty(dirtySections, "objects");
                    break;
                case ObjectAttribute:
                case StoryObjectHierarchySelection:
                case StoryObjectCatalogSelection:
                case ObjectGalleryImage:
                    AddPositive(storyObjectIds, GetInt(entry, "StoryObjectId"));
                    AddDirty(dirtySections, "objects");
                    break;
                case ObjectOwnership:
                    AddPositive(storyObjectIds, GetInt(entry, "OwnerCharacterId"));
                    AddPositive(storyObjectIds, GetInt(entry, "ItemObjectId"));
                    AddDirty(dirtySections, "objects");
                    AddDirty(dirtySections, "relations");
                    break;
                case ObjectRelation:
                    AddPositive(storyObjectIds, GetInt(entry, "SourceObjectId"));
                    AddPositive(storyObjectIds, GetInt(entry, "TargetObjectId"));
                    AddDirty(dirtySections, "relations");
                    break;
                case CharacterRelationship:
                    AddPositive(storyObjectIds, GetInt(entry, "SourceCharacterId"));
                    AddPositive(storyObjectIds, GetInt(entry, "TargetCharacterId"));
                    AddDirty(dirtySections, "relations");
                    break;
                case Catalog:
                    AddDirty(dirtySections, "catalogs");
                    break;
                case CatalogEntry:
                case CatalogEntryGroup:
                case CatalogFieldDefinition:
                case CatalogFieldGroup:
                    AddPositive(catalogIds, GetInt(entry, "CatalogId"));
                    AddDirty(dirtySections, "catalogs");
                    break;
                case CatalogEntryFieldValue:
                    AddPositive(catalogEntryIds, GetInt(entry, "CatalogEntryId"));
                    AddPositive(catalogEntryIds, GetInt(entry, "ReferencedEntryId"));
                    AddDirty(dirtySections, "catalogs");
                    break;
                case CatalogEntryHierarchyLink:
                    AddPositive(catalogEntryIds, GetInt(entry, "ParentEntryId"));
                    AddPositive(catalogEntryIds, GetInt(entry, "ChildEntryId"));
                    AddDirty(dirtySections, "catalogs");
                    break;
                case CatalogEntryGroupHierarchyLink:
                    AddPositive(catalogEntryGroupIds, GetInt(entry, "ParentGroupId"));
                    AddPositive(catalogEntryGroupIds, GetInt(entry, "ChildGroupId"));
                    AddDirty(dirtySections, "catalogs");
                    break;
                case TimelineEvent:
                    AddDirty(dirtySections, "timeline");
                    break;
                case TimelineLayout:
                    AddPositive(timelineIds, GetInt(entry, "TimelineId"));
                    AddDirty(dirtySections, "timeline");
                    break;
                case TimelineParticipant:
                case TimelineChange:
                case TimelineEventGalleryImage:
                case TimelineLayoutItem:
                    AddPositive(timelineEventIds, GetInt(entry, "TimelineEventId"));
                    AddDirty(dirtySections, "timeline");
                    break;
                case TimelineEventLink:
                    AddPositive(timelineEventIds, GetInt(entry, "SourceEventId"));
                    AddPositive(timelineEventIds, GetInt(entry, "TargetEventId"));
                    AddDirty(dirtySections, "timeline");
                    break;
                case Structure:
                    AddDirty(dirtySections, "structures");
                    break;
                case StructureNode:
                case StructureUsage:
                    AddPositive(structureIds, GetInt(entry, "StructureId"));
                    AddDirty(dirtySections, "structures");
                    break;
                case StructureEdge:
                    AddPositive(structureNodeIds, GetInt(entry, "SourceNodeId"));
                    AddPositive(structureNodeIds, GetInt(entry, "TargetNodeId"));
                    AddDirty(dirtySections, "structures");
                    break;
                case StructureAssignment:
                    AddPositive(structureNodeIds, GetInt(entry, "StructureNodeId"));
                    AddDirty(dirtySections, "structures");
                    break;
            }

            AddPositive(projectIds, GetInt(entry, "ProjectId"));
        }

        if (storyObjectIds.Count > 0)
        {
            var ids = storyObjectIds.ToArray();
            projectIds.UnionWith(await Objects
                .Where(storyObject => ids.Contains(storyObject.Id))
                .Select(storyObject => storyObject.ProjectId)
                .ToListAsync(cancellationToken));
        }

        if (catalogIds.Count > 0)
        {
            var ids = catalogIds.ToArray();
            projectIds.UnionWith(await Catalogs
                .Where(catalog => ids.Contains(catalog.Id))
                .Select(catalog => catalog.ProjectId)
                .ToListAsync(cancellationToken));
        }

        if (catalogEntryIds.Count > 0)
        {
            var ids = catalogEntryIds.ToArray();
            projectIds.UnionWith(await CatalogEntries
                .Where(entry => ids.Contains(entry.Id))
                .Select(entry => entry.Catalog!.ProjectId)
                .ToListAsync(cancellationToken));
        }

        if (catalogEntryGroupIds.Count > 0)
        {
            var ids = catalogEntryGroupIds.ToArray();
            projectIds.UnionWith(await CatalogEntryGroups
                .Where(group => ids.Contains(group.Id))
                .Select(group => group.Catalog!.ProjectId)
                .ToListAsync(cancellationToken));
        }

        if (timelineIds.Count > 0)
        {
            var ids = timelineIds.ToArray();
            projectIds.UnionWith(await Timelines
                .Where(timeline => ids.Contains(timeline.Id))
                .Select(timeline => timeline.ProjectId)
                .ToListAsync(cancellationToken));
        }

        if (timelineEventIds.Count > 0)
        {
            var ids = timelineEventIds.ToArray();
            projectIds.UnionWith(await TimelineEvents
                .Where(timelineEvent => ids.Contains(timelineEvent.Id))
                .Select(timelineEvent => timelineEvent.ProjectId)
                .ToListAsync(cancellationToken));
        }

        if (structureIds.Count > 0)
        {
            var ids = structureIds.ToArray();
            projectIds.UnionWith(await Structures
                .Where(structure => ids.Contains(structure.Id))
                .Select(structure => structure.ProjectId)
                .ToListAsync(cancellationToken));
        }

        if (structureNodeIds.Count > 0)
        {
            var ids = structureNodeIds.ToArray();
            projectIds.UnionWith(await StructureNodes
                .Where(node => ids.Contains(node.Id))
                .Select(node => node.Structure!.ProjectId)
                .ToListAsync(cancellationToken));
        }

        projectIds.RemoveWhere(projectId => projectId <= 0);
        if (projectIds.Count == 0)
        {
            return;
        }

        if (dirtySections.Count == 0)
        {
            AddDirty(dirtySections, "project");
            AddDirty(dirtySections, "objects");
            AddDirty(dirtySections, "catalogs");
            AddDirty(dirtySections, "structures");
            AddDirty(dirtySections, "relations");
            AddDirty(dirtySections, "timeline");
        }

        var snapshots = await ProjectSnapshots
            .Where(snapshot =>
                projectIds.Contains(snapshot.ProjectId) &&
                snapshot.Scope == ProjectSnapshotScope.Current &&
                (snapshot.Status == ProjectSnapshotStatus.Ready || snapshot.Status == ProjectSnapshotStatus.Stale))
            .ToListAsync(cancellationToken);

        foreach (var snapshot in snapshots)
        {
            snapshot.Status = ProjectSnapshotStatus.Stale;
            snapshot.DirtySections = MergeDirtySections(snapshot.DirtySections, dirtySections);
        }
    }

    private static int? GetInt(EntityEntry entry, string propertyName)
    {
        var property = entry.Metadata.FindProperty(propertyName);
        if (property is null)
        {
            return null;
        }

        var value = entry.State == EntityState.Deleted
            ? entry.Property(propertyName).OriginalValue
            : entry.Property(propertyName).CurrentValue;
        return value is int intValue ? intValue : null;
    }

    private static void AddPositive(ISet<int> values, int? value)
    {
        if (value is > 0)
        {
            values.Add(value.Value);
        }
    }

    private static void AddDirty(ISet<string> values, string section) => values.Add(section);

    private static string MergeDirtySections(string currentSections, IEnumerable<string> nextSections)
    {
        var merged = currentSections
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Concat(nextSections)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(section => section, StringComparer.Ordinal);
        return string.Join(',', merged);
    }
}
