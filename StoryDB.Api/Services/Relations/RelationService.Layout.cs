using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Relations;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Relations;

public sealed partial class RelationService
{
    public async Task<RelationServiceResult<RelationGraphLayoutDto?>> GetDefaultLayoutAsync(int projectId, string? graphKey)
    {
        var normalizedGraphKey = NormalizeGraphKey(graphKey);
        var layout = await dbContext.RelationGraphLayouts
            .AsNoTracking()
            .Include(currentLayout => currentLayout.Items)
            .Where(currentLayout =>
                currentLayout.ProjectId == projectId &&
                currentLayout.OwnerUserId == null &&
                currentLayout.GraphKey == normalizedGraphKey)
            .OrderByDescending(currentLayout => currentLayout.IsDefault)
            .ThenByDescending(currentLayout => currentLayout.GeneratedAt)
            .FirstOrDefaultAsync();

        if (layout is null)
        {
            return RelationServiceResult<RelationGraphLayoutDto?>.Success(null);
        }

        var layoutDto = ToLayoutDto(layout);
        var structureId = TryGetStructureGraphId(normalizedGraphKey);
        if (structureId is not null)
        {
            layoutDto = await NormalizeStructureLayoutAsync(projectId, structureId.Value, layoutDto);
        }

        return RelationServiceResult<RelationGraphLayoutDto?>.Success(layoutDto);
    }

    public async Task<RelationServiceResult<RelationGraphLayoutDto>> SaveDefaultLayoutAsync(
        int projectId,
        RelationGraphLayoutRequest request)
    {
        var normalizedGraphKey = NormalizeGraphKey(request.GraphKey);
        var projectExists = await dbContext.Projects.AnyAsync(project => project.Id == projectId);
        if (!projectExists)
        {
            return RelationServiceResult<RelationGraphLayoutDto>.NotFound();
        }

        var requestedItems = request.Items
            .GroupBy(item => item.StoryObjectId)
            .Select(group => group.Last())
            .ToList();

        var invalidLayoutItemError = requestedItems
            .Select(item => RequestValidators.ValidateRelationGraphLayoutItem(
                item.StoryObjectId,
                item.Width,
                item.Height,
                item.X,
                item.Y))
            .FirstOrDefault(error => error is not null);
        if (invalidLayoutItemError is not null)
        {
            return RelationServiceResult<RelationGraphLayoutDto>.Invalid(invalidLayoutItemError);
        }

        var requestedNodeIds = requestedItems
            .Select(item => item.StoryObjectId)
            .ToHashSet();
        var validNodeIds = await GetValidLayoutNodeIdsAsync(projectId, normalizedGraphKey, requestedNodeIds);

        if (validNodeIds.Count != requestedNodeIds.Count)
        {
            if (TryGetStructureGraphId(normalizedGraphKey) is null)
            {
                return RelationServiceResult<RelationGraphLayoutDto>.Invalid("Layout contains objects from another project or missing objects.");
            }

            requestedItems = requestedItems
                .Where(item => validNodeIds.Contains(item.StoryObjectId))
                .ToList();
        }

        var now = DateTime.UtcNow;
        var layout = await dbContext.RelationGraphLayouts
            .Include(currentLayout => currentLayout.Items)
            .FirstOrDefaultAsync(currentLayout =>
                currentLayout.ProjectId == projectId &&
                currentLayout.OwnerUserId == null &&
                currentLayout.GraphKey == normalizedGraphKey);

        if (layout is null)
        {
            layout = new RelationGraphLayout
            {
                ProjectId = projectId,
                OwnerUserId = null,
                GraphKey = normalizedGraphKey,
                AlgorithmVersion = LayoutAlgorithmVersion,
                IsDefault = true,
                IsStale = false,
                GeneratedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            };
            dbContext.RelationGraphLayouts.Add(layout);
        }
        else
        {
            layout.AlgorithmVersion = LayoutAlgorithmVersion;
            layout.GraphKey = normalizedGraphKey;
            layout.IsDefault = true;
            layout.IsStale = false;
            layout.GeneratedAt = now;
            layout.UpdatedAt = now;
            dbContext.RelationGraphLayoutItems.RemoveRange(layout.Items);
        }

        layout.Items = requestedItems
            .Select(item => new RelationGraphLayoutItem
            {
                StoryObjectId = item.StoryObjectId,
                X = item.X,
                Y = item.Y,
                Width = item.Width,
                Height = item.Height,
                IsPinned = item.IsPinned,
                CreatedAt = now,
                UpdatedAt = now,
            })
            .ToList();

        await dbContext.SaveChangesAsync();
        cacheSingleFlight.Remove(ProjectCacheKeys.RelationGraph(projectId));

        return RelationServiceResult<RelationGraphLayoutDto>.Success(ToLayoutDto(layout));
    }

    private static string NormalizeGraphKey(string? graphKey)
    {
        var trimmedGraphKey = graphKey?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedGraphKey))
        {
            return DefaultGraphKey;
        }

        return trimmedGraphKey.Length > 80
            ? trimmedGraphKey[..80]
            : trimmedGraphKey;
    }

    private async Task<IReadOnlySet<int>> GetValidLayoutNodeIdsAsync(
        int projectId,
        string graphKey,
        IReadOnlySet<int> requestedNodeIds)
    {
        var structureId = TryGetStructureGraphId(graphKey);
        if (structureId is null)
        {
            return (await dbContext.Objects
                .Where(storyObject => storyObject.ProjectId == projectId && requestedNodeIds.Contains(storyObject.Id))
                .Select(storyObject => storyObject.Id)
                .ToListAsync()).ToHashSet();
        }

        var structureNodeIds = await dbContext.Structures
            .AsNoTracking()
            .Where(currentStructure => currentStructure.ProjectId == projectId && currentStructure.Id == structureId.Value)
            .Select(currentStructure => currentStructure.Nodes.Select(node => node.Id).ToList())
            .FirstOrDefaultAsync();
        if (structureNodeIds is null)
        {
            return new HashSet<int>();
        }

        var validNodeIds = structureNodeIds
            .Select(ToStructureNodeLayoutId)
            .Where(requestedNodeIds.Contains)
            .ToHashSet();

        var storyObjectAssignmentNodeIds = await dbContext.StructureAssignments
            .AsNoTracking()
            .Where(assignment =>
                assignment.ProjectId == projectId &&
                assignment.StructureNode != null &&
                assignment.StructureNode.StructureId == structureId.Value &&
                assignment.TargetKind == "storyObject" &&
                assignment.StoryObjectId != null &&
                assignment.StoryObject != null &&
                assignment.StoryObject.ProjectId == projectId &&
                requestedNodeIds.Contains(assignment.StoryObjectId.Value))
            .Select(assignment => assignment.StoryObjectId!.Value)
            .ToListAsync();
        foreach (var nodeId in storyObjectAssignmentNodeIds)
        {
            validNodeIds.Add(nodeId);
        }

        var catalogEntryAssignmentNodeIds = await (
            from assignment in dbContext.StructureAssignments.AsNoTracking()
            join catalogEntry in dbContext.CatalogEntries.AsNoTracking()
                on assignment.TargetId equals catalogEntry.Id
            where assignment.ProjectId == projectId &&
                  assignment.StructureNode != null &&
                  assignment.StructureNode.StructureId == structureId.Value &&
                  assignment.TargetKind == "catalogEntry" &&
                  catalogEntry.Catalog != null &&
                  catalogEntry.Catalog.ProjectId == projectId
            select CatalogEntryAssignmentLayoutIdBase + assignment.TargetId)
            .Where(nodeId => requestedNodeIds.Contains(nodeId))
            .ToListAsync();
        foreach (var nodeId in catalogEntryAssignmentNodeIds)
        {
            validNodeIds.Add(nodeId);
        }

        return validNodeIds;
    }

    private static int? TryGetStructureGraphId(string graphKey)
    {
        const string prefix = "structure:";
        if (!graphKey.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var idEndIndex = graphKey.IndexOf(':', prefix.Length);
        var idPart = idEndIndex < 0
            ? graphKey[prefix.Length..]
            : graphKey[prefix.Length..idEndIndex];

        return int.TryParse(idPart, out var structureId) && structureId > 0
            ? structureId
            : null;
    }

    private static int ToStructureNodeLayoutId(int id) => StructureNodeLayoutIdBase + id;

    private static bool IsStructureNodeLayoutId(int id) =>
        id > StructureNodeLayoutIdBase && id < CatalogEntryAssignmentLayoutIdBase;

    private async Task<RelationGraphLayoutDto> NormalizeStructureLayoutAsync(
        int projectId,
        int structureId,
        RelationGraphLayoutDto layout)
    {
        var structureNodes = await dbContext.StructureNodes
            .AsNoTracking()
            .Where(node =>
                node.StructureId == structureId &&
                node.Structure != null &&
                node.Structure.ProjectId == projectId)
            .Select(node => new StructureLayoutNode(node.Id, node.LevelIndex, node.SortOrder, node.Name))
            .ToListAsync();
        if (structureNodes.Count == 0)
        {
            return layout;
        }

        var orderedStructureNodes = structureNodes
            .OrderBy(node => node.LevelIndex)
            .ThenBy(node => node.SortOrder)
            .ThenBy(node => node.Name)
            .ThenBy(node => node.Id)
            .ToList();
        var currentStructureLayoutIds = orderedStructureNodes
            .Select(node => ToStructureNodeLayoutId(node.Id))
            .ToHashSet();
        var currentItemsByLayoutId = layout.Items
            .Where(item => currentStructureLayoutIds.Contains(item.StoryObjectId))
            .GroupBy(item => item.StoryObjectId)
            .ToDictionary(group => group.Key, group => group.Last());
        var legacyStructureItems = layout.Items
            .Where(item => IsStructureNodeLayoutId(item.StoryObjectId) && !currentStructureLayoutIds.Contains(item.StoryObjectId))
            .OrderBy(item => item.StoryObjectId)
            .ToList();

        var wasNormalized = false;
        var legacyIndex = 0;
        var normalizedItems = new List<RelationGraphLayoutItemDto>();
        foreach (var node in orderedStructureNodes)
        {
            var currentLayoutId = ToStructureNodeLayoutId(node.Id);
            if (currentItemsByLayoutId.TryGetValue(currentLayoutId, out var currentItem))
            {
                normalizedItems.Add(currentItem);
                continue;
            }

            if (legacyIndex < legacyStructureItems.Count)
            {
                normalizedItems.Add(legacyStructureItems[legacyIndex++] with { StoryObjectId = currentLayoutId });
                wasNormalized = true;
                continue;
            }

            wasNormalized = true;
        }

        foreach (var item in layout.Items)
        {
            if (currentStructureLayoutIds.Contains(item.StoryObjectId))
            {
                continue;
            }

            if (IsStructureNodeLayoutId(item.StoryObjectId))
            {
                wasNormalized = true;
                continue;
            }

            normalizedItems.Add(item);
        }

        return layout with
        {
            IsStale = layout.IsStale || wasNormalized,
            Items = normalizedItems
                .OrderBy(item => item.StoryObjectId)
                .ToList(),
        };
    }

    private sealed record StructureLayoutNode(int Id, int LevelIndex, int SortOrder, string Name);

    private static string? NormalizeMembershipKey(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();
    }

    private static RelationGraphLayoutDto ToLayoutDto(RelationGraphLayout layout) =>
        new(
            layout.Id,
            layout.ProjectId,
            layout.GraphKey,
            layout.AlgorithmVersion,
            layout.IsDefault,
            layout.IsStale,
            layout.GeneratedAt,
            layout.Items
                .OrderBy(item => item.StoryObjectId)
                .Select(item => new RelationGraphLayoutItemDto(
                    item.Id,
                    item.StoryObjectId,
                    item.X,
                    item.Y,
                    item.Width,
                    item.Height,
                    item.IsPinned))
                .ToList());
}

