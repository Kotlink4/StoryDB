using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Objects;

public partial class ObjectService
{
    private void SyncObjectAttributes(
        StoryObject storyObject,
        IReadOnlyList<ObjectAttribute> requestedAttributes)
    {
        var requestedByDefinitionId = requestedAttributes.ToDictionary(attribute => attribute.AttributeDefinitionId);
        foreach (var existingAttribute in storyObject.Attributes
            .Where(attribute => !requestedByDefinitionId.ContainsKey(attribute.AttributeDefinitionId))
            .ToList())
        {
            dbContext.ObjectAttributes.Remove(existingAttribute);
            storyObject.Attributes.Remove(existingAttribute);
        }

        foreach (var requestedAttribute in requestedAttributes)
        {
            var existingAttribute = storyObject.Attributes.FirstOrDefault(attribute =>
                attribute.AttributeDefinitionId == requestedAttribute.AttributeDefinitionId);
            if (existingAttribute is null)
            {
                storyObject.Attributes.Add(new ObjectAttribute
                {
                    StoryObjectId = storyObject.Id,
                    AttributeDefinitionId = requestedAttribute.AttributeDefinitionId,
                    Value = requestedAttribute.Value,
                    SortOrder = requestedAttribute.SortOrder,
                });
                continue;
            }

            existingAttribute.Value = requestedAttribute.Value;
            existingAttribute.SortOrder = requestedAttribute.SortOrder;
        }
    }

    private void SyncHierarchySelections(
        StoryObject storyObject,
        IReadOnlyList<StoryObjectHierarchySelection> requestedSelections)
    {
        var requestedKeys = requestedSelections
            .Select(selection => (selection.HierarchyGroupId, selection.HierarchyNodeId))
            .ToHashSet();

        foreach (var existingSelection in storyObject.HierarchySelections
            .Where(selection => !requestedKeys.Contains((selection.HierarchyGroupId, selection.HierarchyNodeId)))
            .ToList())
        {
            dbContext.StoryObjectHierarchySelections.Remove(existingSelection);
            storyObject.HierarchySelections.Remove(existingSelection);
        }

        foreach (var requestedSelection in requestedSelections)
        {
            var existingSelection = storyObject.HierarchySelections.FirstOrDefault(selection =>
                selection.HierarchyGroupId == requestedSelection.HierarchyGroupId &&
                selection.HierarchyNodeId == requestedSelection.HierarchyNodeId);
            if (existingSelection is null)
            {
                storyObject.HierarchySelections.Add(new StoryObjectHierarchySelection
                {
                    StoryObjectId = storyObject.Id,
                    HierarchyGroupId = requestedSelection.HierarchyGroupId,
                    HierarchyNodeId = requestedSelection.HierarchyNodeId,
                    SortOrder = requestedSelection.SortOrder,
                });
                continue;
            }

            existingSelection.SortOrder = requestedSelection.SortOrder;
        }
    }

    private void SyncCatalogSelections(
        StoryObject storyObject,
        IReadOnlyList<StoryObjectCatalogSelection> requestedSelections)
    {
        var requestedKeys = requestedSelections
            .Select(selection => (
                selection.TargetType,
                selection.CatalogId,
                selection.CatalogEntryGroupId,
                selection.CatalogEntryId))
            .ToHashSet();

        foreach (var existingSelection in storyObject.CatalogSelections
            .Where(selection => !requestedKeys.Contains((
                selection.TargetType,
                selection.CatalogId,
                selection.CatalogEntryGroupId,
                selection.CatalogEntryId)))
            .ToList())
        {
            dbContext.StoryObjectCatalogSelections.Remove(existingSelection);
            storyObject.CatalogSelections.Remove(existingSelection);
        }

        foreach (var requestedSelection in requestedSelections)
        {
            var existingSelection = storyObject.CatalogSelections.FirstOrDefault(selection =>
                selection.TargetType == requestedSelection.TargetType &&
                selection.CatalogId == requestedSelection.CatalogId &&
                selection.CatalogEntryGroupId == requestedSelection.CatalogEntryGroupId &&
                selection.CatalogEntryId == requestedSelection.CatalogEntryId);
            if (existingSelection is null)
            {
                storyObject.CatalogSelections.Add(new StoryObjectCatalogSelection
                {
                    StoryObjectId = storyObject.Id,
                    TargetType = requestedSelection.TargetType,
                    CatalogId = requestedSelection.CatalogId,
                    CatalogEntryGroupId = requestedSelection.CatalogEntryGroupId,
                    CatalogEntryId = requestedSelection.CatalogEntryId,
                    SortOrder = requestedSelection.SortOrder,
                });
                continue;
            }

            existingSelection.SortOrder = requestedSelection.SortOrder;
        }
    }

    private void SyncOwnerships(
        StoryObject storyObject,
        string typeKey,
        IReadOnlyList<int> ownedItemIds,
        IReadOnlyList<int> ownerCharacterIds)
    {
        IReadOnlyList<int> normalizedOwnedItemIds = typeKey == "characters" ? ownedItemIds : [];
        IReadOnlyList<int> normalizedOwnerCharacterIds = typeKey == "items" ? ownerCharacterIds : [];

        SyncOwnedItemLinks(storyObject, normalizedOwnedItemIds);
        SyncOwnerLinks(storyObject, normalizedOwnerCharacterIds);
    }

    private void SyncOwnedItemLinks(StoryObject storyObject, IReadOnlyList<int> itemIds)
    {
        var requestedIds = itemIds.ToHashSet();
        foreach (var existingOwnership in storyObject.OwnedItems
            .Where(ownership => !requestedIds.Contains(ownership.ItemObjectId))
            .ToList())
        {
            dbContext.ObjectOwnerships.Remove(existingOwnership);
            storyObject.OwnedItems.Remove(existingOwnership);
        }

        foreach (var item in itemIds.Select((id, index) => new { Id = id, SortOrder = index }))
        {
            var existingOwnership = storyObject.OwnedItems.FirstOrDefault(ownership => ownership.ItemObjectId == item.Id);
            if (existingOwnership is null)
            {
                storyObject.OwnedItems.Add(new ObjectOwnership
                {
                    OwnerCharacterId = storyObject.Id,
                    ItemObjectId = item.Id,
                    SortOrder = item.SortOrder,
                });
                continue;
            }

            existingOwnership.SortOrder = item.SortOrder;
        }
    }

    private void SyncOwnerLinks(StoryObject storyObject, IReadOnlyList<int> ownerCharacterIds)
    {
        var requestedIds = ownerCharacterIds.ToHashSet();
        foreach (var existingOwnership in storyObject.Owners
            .Where(ownership => !requestedIds.Contains(ownership.OwnerCharacterId))
            .ToList())
        {
            dbContext.ObjectOwnerships.Remove(existingOwnership);
            storyObject.Owners.Remove(existingOwnership);
        }

        foreach (var owner in ownerCharacterIds.Select((id, index) => new { Id = id, SortOrder = index }))
        {
            var existingOwnership = storyObject.Owners.FirstOrDefault(ownership => ownership.OwnerCharacterId == owner.Id);
            if (existingOwnership is null)
            {
                storyObject.Owners.Add(new ObjectOwnership
                {
                    OwnerCharacterId = owner.Id,
                    ItemObjectId = storyObject.Id,
                    SortOrder = owner.SortOrder,
                });
                continue;
            }

            existingOwnership.SortOrder = owner.SortOrder;
        }
    }

    private void SyncObjectRelations(
        StoryObject storyObject,
        IReadOnlyList<ObjectRelation> requestedRelations)
    {
        var requestedKeys = requestedRelations
            .Select(relation => (relation.RelationType, relation.TargetObjectId))
            .ToHashSet();

        foreach (var existingRelation in storyObject.OutgoingRelations
            .Where(relation => !requestedKeys.Contains((relation.RelationType, relation.TargetObjectId)))
            .ToList())
        {
            dbContext.ObjectRelations.Remove(existingRelation);
            storyObject.OutgoingRelations.Remove(existingRelation);
        }

        foreach (var requestedRelation in requestedRelations)
        {
            var existingRelation = storyObject.OutgoingRelations.FirstOrDefault(relation =>
                relation.RelationType == requestedRelation.RelationType &&
                relation.TargetObjectId == requestedRelation.TargetObjectId);
            if (existingRelation is null)
            {
                storyObject.OutgoingRelations.Add(new ObjectRelation
                {
                    SourceObjectId = storyObject.Id,
                    TargetObjectId = requestedRelation.TargetObjectId,
                    RelationType = requestedRelation.RelationType,
                    SortOrder = requestedRelation.SortOrder,
                });
                continue;
            }

            existingRelation.SortOrder = requestedRelation.SortOrder;
        }
    }

    private void SyncCharacterRelationships(
        StoryObject storyObject,
        string typeKey,
        IReadOnlyList<CharacterRelationshipSelection> requestedRelationships)
    {
        IReadOnlyList<CharacterRelationshipSelection> normalizedRelationships =
            typeKey == "characters" ? requestedRelationships : [];
        var existingRelationships = storyObject.OutgoingCharacterRelationships
            .Concat(storyObject.IncomingCharacterRelationships)
            .DistinctBy(relationship => relationship.Id)
            .OrderBy(relationship => relationship.SortOrder)
            .ThenBy(relationship => relationship.Id)
            .ToList();
        var requestedExistingIds = normalizedRelationships
            .Select(relationship => relationship.Id)
            .OfType<int>()
            .ToHashSet();

        foreach (var existingRelationship in existingRelationships
            .Where(relationship => !requestedExistingIds.Contains(relationship.Id))
            .ToList())
        {
            dbContext.CharacterRelationships.Remove(existingRelationship);
            storyObject.OutgoingCharacterRelationships.Remove(existingRelationship);
            storyObject.IncomingCharacterRelationships.Remove(existingRelationship);
        }

        for (var index = 0; index < normalizedRelationships.Count; index++)
        {
            var requestedRelationship = normalizedRelationships[index];
            var existingRelationship = requestedRelationship.Id is null
                ? null
                : existingRelationships.FirstOrDefault(relationship => relationship.Id == requestedRelationship.Id);
            var sourceCharacterId = requestedRelationship.SourceCharacterId > 0
                ? requestedRelationship.SourceCharacterId
                : storyObject.Id;

            if (existingRelationship is null)
            {
                dbContext.CharacterRelationships.Add(new CharacterRelationship
                {
                    SourceCharacterId = sourceCharacterId,
                    TargetCharacterId = requestedRelationship.TargetCharacterId,
                    RelationType = requestedRelationship.RelationType,
                    Strength = requestedRelationship.Strength,
                    Tension = requestedRelationship.Tension,
                    IsBidirectional = requestedRelationship.IsBidirectional,
                    Description = requestedRelationship.Description,
                    SortOrder = index,
                });
                continue;
            }

            existingRelationship.SourceCharacterId = sourceCharacterId;
            existingRelationship.TargetCharacterId = requestedRelationship.TargetCharacterId;
            existingRelationship.RelationType = requestedRelationship.RelationType;
            existingRelationship.Strength = requestedRelationship.Strength;
            existingRelationship.Tension = requestedRelationship.Tension;
            existingRelationship.IsBidirectional = requestedRelationship.IsBidirectional;
            existingRelationship.Description = requestedRelationship.Description;
            existingRelationship.SortOrder = index;
        }
    }
}
