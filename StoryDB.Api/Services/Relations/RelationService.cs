using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Relations;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Relations;

public sealed class RelationService(
    StoryDbContext dbContext,
    ICacheSingleFlight cacheSingleFlight) : IRelationService
{
    private const string DefaultGraphKey = "relations:all";
    private const string LayoutAlgorithmVersion = "relation-elk-v1";
    private const int StructureNodeLayoutIdBase = 1_000_000_000;
    private const int CatalogGroupLayoutIdBase = 1_100_000_000;
    private const int CatalogEntryLayoutIdBase = 1_200_000_000;
    private static readonly TimeSpan RelationGraphCacheDuration = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan RelationGraphCacheSlidingDuration = TimeSpan.FromSeconds(5);

    public async Task<RelationServiceResult<RelationGraphDto>> GetRelationGraphAsync(int projectId)
    {
        var cacheKey = ProjectCacheKeys.RelationGraph(projectId);
        var graph = await cacheSingleFlight.GetOrCreateAsync(
            cacheKey,
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = RelationGraphCacheDuration;
                cacheEntry.SlidingExpiration = RelationGraphCacheSlidingDuration;

                var nodes = await dbContext.Objects
            .AsNoTracking()
            .Where(storyObject =>
                storyObject.ProjectId == projectId &&
                storyObject.ObjectType != null &&
                storyObject.ObjectType.IsEnabled)
            .OrderBy(storyObject => storyObject.Name)
            .Select(storyObject => new RelationGraphNodeDto(
                storyObject.Id,
                storyObject.Name,
                storyObject.Surname,
                storyObject.SurnameForm,
                storyObject.ImagePath,
                storyObject.ObjectType!.Key))
            .ToListAsync();

                var edges = new List<RelationGraphEdgeDto>();
                var organizationsBySurnameForm = nodes
            .Where(node => node.TypeKey == "organizations")
            .Select(node => new { Node = node, Key = NormalizeMembershipKey(node.SurnameForm) })
            .Where(item => item.Key is not null)
            .GroupBy(item => item.Key!, StringComparer.Ordinal)
            .ToDictionary(
                group => group.Key,
                group => group.Select(item => item.Node).ToList(),
                StringComparer.Ordinal);

                var automaticMemberships = new List<RelationGraphEdgeDto>();
                foreach (var character in nodes.Where(node => node.TypeKey == "characters"))
                {
                    var characterSurnameKey = NormalizeMembershipKey(character.Surname);
                    if (characterSurnameKey is null ||
                        !organizationsBySurnameForm.TryGetValue(characterSurnameKey, out var organizations))
                    {
                        continue;
                    }

                    automaticMemberships.AddRange(organizations.Select(organization => new RelationGraphEdgeDto(
                    $"membership:{character.Id}:{organization.Id}",
                    character.Id,
                    organization.Id,
                    "organizationMembership",
                    "membership",
                    null,
                    null,
                    false,
                    null)));
                }

                edges.AddRange(automaticMemberships);

                var characterRelationships = await dbContext.CharacterRelationships
            .AsNoTracking()
            .Where(relationship =>
                relationship.SourceCharacter != null &&
                relationship.SourceCharacter.ObjectType != null &&
                relationship.SourceCharacter.ProjectId == projectId &&
                relationship.SourceCharacter.ObjectType.IsEnabled &&
                relationship.TargetCharacter != null &&
                relationship.TargetCharacter.ObjectType != null &&
                relationship.TargetCharacter.ProjectId == projectId &&
                relationship.TargetCharacter.ObjectType.IsEnabled)
            .OrderBy(relationship => relationship.SortOrder)
            .Select(relationship => new RelationGraphEdgeDto(
                $"character:{relationship.Id}",
                relationship.SourceCharacterId,
                relationship.TargetCharacterId,
                relationship.RelationType,
                "character",
                relationship.Strength,
                relationship.Tension,
                relationship.IsBidirectional,
                relationship.Description))
            .ToListAsync();
                edges.AddRange(characterRelationships);

                var ownerships = await dbContext.ObjectOwnerships
            .AsNoTracking()
            .Where(ownership =>
                ownership.OwnerCharacter != null &&
                ownership.OwnerCharacter.ObjectType != null &&
                ownership.OwnerCharacter.ProjectId == projectId &&
                ownership.OwnerCharacter.ObjectType.IsEnabled &&
                ownership.ItemObject != null &&
                ownership.ItemObject.ObjectType != null &&
                ownership.ItemObject.ProjectId == projectId &&
                ownership.ItemObject.ObjectType.IsEnabled)
            .OrderBy(ownership => ownership.SortOrder)
            .Select(ownership => new RelationGraphEdgeDto(
                $"ownership:{ownership.OwnerCharacterId}:{ownership.ItemObjectId}",
                ownership.OwnerCharacterId,
                ownership.ItemObjectId,
                "\u0432\u043b\u0430\u0434\u0435\u0435\u0442",
                "ownership",
                null,
                null,
                false,
                null))
            .ToListAsync();
                edges.AddRange(ownerships);

                var objectRelations = await dbContext.ObjectRelations
            .AsNoTracking()
            .Where(relation =>
                relation.SourceObject != null &&
                relation.SourceObject.ObjectType != null &&
                relation.SourceObject.ProjectId == projectId &&
                relation.SourceObject.ObjectType.IsEnabled &&
                relation.TargetObject != null &&
                relation.TargetObject.ObjectType != null &&
                relation.TargetObject.ProjectId == projectId &&
                relation.TargetObject.ObjectType.IsEnabled)
            .OrderBy(relation => relation.SortOrder)
            .Select(relation => new RelationGraphEdgeDto(
                $"object:{relation.Id}",
                relation.SourceObjectId,
                relation.TargetObjectId,
                relation.RelationType,
                "object",
                null,
                null,
                false,
                null))
            .ToListAsync();
                edges.AddRange(objectRelations);

                var structureAssignments = await (
            from assignment in dbContext.StructureAssignments.AsNoTracking()
            join targetObject in dbContext.Objects.AsNoTracking()
                on assignment.StructureUsage!.TargetId equals targetObject.Id
            where assignment.ProjectId == projectId &&
                  assignment.StructureUsage != null &&
                  assignment.StructureUsage.Structure != null &&
                  assignment.StructureNode != null &&
                  assignment.StructureUsage.TargetKind == "object" &&
                  assignment.StoryObject != null &&
                  assignment.StoryObject.ObjectType != null &&
                  assignment.StoryObject.ProjectId == projectId &&
                  assignment.StoryObject.ObjectType.IsEnabled &&
                  targetObject.ProjectId == projectId &&
                  targetObject.ObjectType != null &&
                  targetObject.ObjectType.IsEnabled
            orderby assignment.StructureUsage!.Structure!.Name,
                assignment.StructureNode!.LevelIndex,
                assignment.StructureNode!.SortOrder,
                assignment.SortOrder
            select new RelationGraphEdgeDto(
                $"structure:{assignment.Id}",
                assignment.StoryObjectId,
                targetObject.Id,
                string.IsNullOrWhiteSpace(assignment.RoleLabel)
                    ? assignment.StructureNode!.Name
                    : assignment.RoleLabel,
                "structure",
                null,
                null,
                false,
                assignment.StructureUsage!.Structure!.Name + " · " + assignment.StructureNode!.Name))
            .ToListAsync();
                edges.AddRange(structureAssignments);

                return new RelationGraphDto(nodes, edges);
            });

        return RelationServiceResult<RelationGraphDto>.Success(graph);
    }

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

        return RelationServiceResult<RelationGraphLayoutDto?>.Success(layout is null ? null : ToLayoutDto(layout));
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
            return RelationServiceResult<RelationGraphLayoutDto>.Invalid("Layout contains objects from another project or missing objects.");
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

        var structure = await dbContext.Structures
            .AsNoTracking()
            .Where(currentStructure => currentStructure.ProjectId == projectId && currentStructure.Id == structureId.Value)
            .Select(currentStructure => new
            {
                currentStructure.LinkedCatalogId,
                NodeIds = currentStructure.Nodes.Select(node => node.Id).ToList(),
            })
            .FirstOrDefaultAsync();
        if (structure is null)
        {
            return new HashSet<int>();
        }

        var validIds = structure.NodeIds
            .Select(ToStructureNodeLayoutId)
            .Where(requestedNodeIds.Contains)
            .ToHashSet();

        if (structure.LinkedCatalogId is null)
        {
            return validIds;
        }

        var catalogGroupIds = await dbContext.CatalogEntryGroups
            .Where(group => group.CatalogId == structure.LinkedCatalogId.Value)
            .Select(group => group.Id)
            .ToListAsync();
        foreach (var groupId in catalogGroupIds)
        {
            var layoutId = ToCatalogGroupLayoutId(groupId);
            if (requestedNodeIds.Contains(layoutId))
            {
                validIds.Add(layoutId);
            }
        }

        var catalogEntryIds = await dbContext.CatalogEntries
            .Where(entry => entry.CatalogId == structure.LinkedCatalogId.Value)
            .Select(entry => entry.Id)
            .ToListAsync();
        foreach (var entryId in catalogEntryIds)
        {
            var layoutId = ToCatalogEntryLayoutId(entryId);
            if (requestedNodeIds.Contains(layoutId))
            {
                validIds.Add(layoutId);
            }
        }

        return validIds;
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

    private static int ToCatalogGroupLayoutId(int id) => CatalogGroupLayoutIdBase + id;

    private static int ToCatalogEntryLayoutId(int id) => CatalogEntryLayoutIdBase + id;

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
