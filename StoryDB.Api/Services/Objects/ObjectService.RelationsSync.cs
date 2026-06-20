using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Objects;

public partial class ObjectService
{
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
}
