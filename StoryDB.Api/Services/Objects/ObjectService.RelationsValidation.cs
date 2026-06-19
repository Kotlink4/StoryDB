using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Objects;

public partial class ObjectService
{
    private async Task<OwnershipSelectionsValidationResult> GetValidatedOwnershipSelections(
        int projectId,
        string typeKey,
        IReadOnlyList<int> ownedItemIds,
        IReadOnlyList<int> ownerCharacterIds)
    {
        var normalizedOwnedItemIds = ownedItemIds
            .Where(id => id > 0)
            .Distinct()
            .ToList();
        var normalizedOwnerCharacterIds = ownerCharacterIds
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (typeKey != "characters" && normalizedOwnedItemIds.Count > 0)
        {
            return new OwnershipSelectionsValidationResult("Only characters can own items.", [], []);
        }

        if (typeKey != "items" && normalizedOwnerCharacterIds.Count > 0)
        {
            return new OwnershipSelectionsValidationResult("Only items can have owners.", [], []);
        }

        if (normalizedOwnedItemIds.Count > 0)
        {
            var validItemCount = await dbContext.Objects.CountAsync(storyObject =>
                storyObject.ProjectId == projectId &&
                storyObject.ObjectType != null &&
                storyObject.ObjectType.Key == "items" &&
                normalizedOwnedItemIds.Contains(storyObject.Id));
            if (validItemCount != normalizedOwnedItemIds.Count)
            {
                return new OwnershipSelectionsValidationResult("One or more owned items were not found.", [], []);
            }
        }

        if (normalizedOwnerCharacterIds.Count > 0)
        {
            var validOwnerCount = await dbContext.Objects.CountAsync(storyObject =>
                storyObject.ProjectId == projectId &&
                storyObject.ObjectType != null &&
                storyObject.ObjectType.Key == "characters" &&
                normalizedOwnerCharacterIds.Contains(storyObject.Id));
            if (validOwnerCount != normalizedOwnerCharacterIds.Count)
            {
                return new OwnershipSelectionsValidationResult("One or more owners were not found.", [], []);
            }
        }

        return new OwnershipSelectionsValidationResult(
            null,
            normalizedOwnedItemIds,
            normalizedOwnerCharacterIds);
    }

    private static List<ObjectOwnership> ToOwnedItemLinks(int ownerCharacterId, IReadOnlyList<int> itemIds) =>
        itemIds
            .Select((itemId, index) => new ObjectOwnership
            {
                OwnerCharacterId = ownerCharacterId,
                ItemObjectId = itemId,
                SortOrder = index,
            })
            .ToList();

    private static List<ObjectOwnership> ToOwnerLinks(int itemObjectId, IReadOnlyList<int> ownerCharacterIds) =>
        ownerCharacterIds
            .Select((ownerCharacterId, index) => new ObjectOwnership
            {
                OwnerCharacterId = ownerCharacterId,
                ItemObjectId = itemObjectId,
                SortOrder = index,
            })
            .ToList();

    private async Task<CharacterRelationshipsValidationResult> GetValidatedCharacterRelationships(
        int projectId,
        string typeKey,
        IReadOnlyList<CharacterRelationshipRequest> relationships,
        int? currentCharacterId = null)
    {
        var normalizedRelationships = relationships
            .Select((relationship, index) => new CharacterRelationshipSelection(
                relationship.Id,
                currentCharacterId is null ? 0 : relationship.SourceCharacterId ?? currentCharacterId.Value,
                relationship.TargetCharacterId,
                relationship.RelationType.Trim(),
                Math.Clamp(relationship.Strength, 0, 100),
                Math.Clamp(relationship.Tension, 0, 100),
                relationship.IsBidirectional,
                NormalizeOptionalText(relationship.Description),
                index))
            .Where(relationship =>
                (currentCharacterId is null ||
                    relationship.SourceCharacterId == currentCharacterId ||
                    relationship.TargetCharacterId == currentCharacterId) &&
                relationship.SourceCharacterId != relationship.TargetCharacterId &&
                relationship.TargetCharacterId > 0 &&
                relationship.RelationType.Length > 0)
            .ToList();

        if (typeKey != "characters" && normalizedRelationships.Count > 0)
        {
            return new CharacterRelationshipsValidationResult("Only characters can have character relationships.", []);
        }

        if (normalizedRelationships.Any(relationship => relationship.RelationType.Length > 80))
        {
            return new CharacterRelationshipsValidationResult("Relationship type is too long.", []);
        }

        if (normalizedRelationships.Any(relationship => relationship.Description?.Length > 1000))
        {
            return new CharacterRelationshipsValidationResult("Relationship description is too long.", []);
        }

        if (!await AllObjectsMatchType(
            projectId,
            normalizedRelationships
                .SelectMany(relationship => new[] { relationship.SourceCharacterId, relationship.TargetCharacterId })
                .Where(characterId => characterId > 0)
                .Distinct()
                .ToList(),
            ["characters"]))
        {
            return new CharacterRelationshipsValidationResult("One or more related characters were not found.", []);
        }

        return new CharacterRelationshipsValidationResult(null, normalizedRelationships);
    }

    private static List<CharacterRelationship> ToCharacterRelationships(
        int sourceCharacterId,
        IReadOnlyList<CharacterRelationshipSelection> relationships) =>
        relationships
            .Select((relationship, index) => new CharacterRelationship
            {
                SourceCharacterId = sourceCharacterId,
                TargetCharacterId = relationship.TargetCharacterId,
                RelationType = relationship.RelationType,
                Strength = relationship.Strength,
                Tension = relationship.Tension,
                IsBidirectional = relationship.IsBidirectional,
                Description = relationship.Description,
                SortOrder = index,
            })
            .ToList();

    private async Task<ObjectRelationsValidationResult> GetValidatedObjectRelations(
        int projectId,
        string typeKey,
        IReadOnlyList<int> territoryPlaceIds,
        IReadOnlyList<int> ownerOrganizationIds,
        IReadOnlyList<int> parentObjectIds,
        int? currentObjectId = null)
    {
        var normalizedTerritoryPlaceIds = NormalizeIds(territoryPlaceIds, currentObjectId);
        var normalizedOwnerOrganizationIds = NormalizeIds(ownerOrganizationIds, currentObjectId);
        var normalizedParentObjectIds = NormalizeIds(parentObjectIds, currentObjectId);

        if (typeKey != "organizations" && normalizedTerritoryPlaceIds.Count > 0)
        {
            return new ObjectRelationsValidationResult("Only organizations can be placed on territories.", [], [], []);
        }

        if (typeKey != "places" && normalizedOwnerOrganizationIds.Count > 0)
        {
            return new ObjectRelationsValidationResult("Only places can belong to organizations.", [], [], []);
        }

        if (typeKey != "places" && typeKey != "organizations" && normalizedParentObjectIds.Count > 0)
        {
            return new ObjectRelationsValidationResult("Hierarchy is available only for places and organizations.", [], [], []);
        }

        if (!await AllObjectsMatchType(projectId, normalizedTerritoryPlaceIds, ["places"]))
        {
            return new ObjectRelationsValidationResult("One or more territories were not found.", [], [], []);
        }

        if (!await AllObjectsMatchType(projectId, normalizedOwnerOrganizationIds, ["organizations"]))
        {
            return new ObjectRelationsValidationResult("One or more owner organizations were not found.", [], [], []);
        }

        if (!await AllObjectsMatchType(projectId, normalizedParentObjectIds, ["places", "organizations"]))
        {
            return new ObjectRelationsValidationResult("One or more hierarchy parents were not found.", [], [], []);
        }

        return new ObjectRelationsValidationResult(
            null,
            normalizedTerritoryPlaceIds,
            normalizedOwnerOrganizationIds,
            normalizedParentObjectIds);
    }

    private async Task<bool> AllObjectsMatchType(
        int projectId,
        IReadOnlyList<int> objectIds,
        IReadOnlyList<string> typeKeys)
    {
        if (objectIds.Count == 0)
        {
            return true;
        }

        var validCount = await dbContext.Objects.CountAsync(storyObject =>
            storyObject.ProjectId == projectId &&
            storyObject.ObjectType != null &&
            typeKeys.Contains(storyObject.ObjectType.Key) &&
            objectIds.Contains(storyObject.Id));

        return validCount == objectIds.Count;
    }

    private static IReadOnlyList<int> NormalizeIds(IReadOnlyList<int> ids, int? excludedId = null) =>
        ids
            .Where(id => id > 0 && id != excludedId)
            .Distinct()
            .ToList();

    private static List<ObjectRelation> ToObjectRelations(
        int sourceObjectId,
        string typeKey,
        IReadOnlyList<int> territoryPlaceIds,
        IReadOnlyList<int> ownerOrganizationIds,
        IReadOnlyList<int> parentObjectIds)
    {
        var relations = new List<ObjectRelation>();
        if (typeKey == "organizations")
        {
            relations.AddRange(ToObjectRelations(sourceObjectId, "locatedOnTerritory", territoryPlaceIds));
        }

        if (typeKey == "places")
        {
            relations.AddRange(ToObjectRelations(sourceObjectId, "territoryOwner", ownerOrganizationIds));
        }

        if (typeKey == "places" || typeKey == "organizations")
        {
            relations.AddRange(ToObjectRelations(sourceObjectId, "hierarchyParent", parentObjectIds));
        }

        return relations;
    }

    private static IEnumerable<ObjectRelation> ToObjectRelations(
        int sourceObjectId,
        string relationType,
        IReadOnlyList<int> targetObjectIds) =>
        targetObjectIds.Select((targetObjectId, index) => new ObjectRelation
        {
            SourceObjectId = sourceObjectId,
            TargetObjectId = targetObjectId,
            RelationType = relationType,
            SortOrder = index,
        });
}


