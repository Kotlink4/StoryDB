using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Relations;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Relations;

public sealed partial class RelationService(
    StoryDbContext dbContext,
    ICacheSingleFlight cacheSingleFlight) : IRelationService
{
    private const string DefaultGraphKey = "relations:all";
    private const string LayoutAlgorithmVersion = "relation-elk-v1";
    private const int StructureNodeLayoutIdBase = 1_000_000_000;
    private const int CatalogEntryAssignmentLayoutIdBase = 2_000_000_000;
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
                  assignment.TargetKind == "storyObject" &&
                  assignment.StoryObjectId != null &&
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
                assignment.StoryObjectId ?? 0,
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
}

