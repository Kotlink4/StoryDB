using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Objects;

namespace StoryDB.Api.Services.Objects;

public partial class ObjectService
{
    private async Task<StoryObjectDto?> GetObjectDtoOrNull(int projectId, int objectId)
    {
        var storyObject = await dbContext.Objects
            .AsNoTracking()
            .Where(currentObject => currentObject.ProjectId == projectId && currentObject.Id == objectId)
            .Select(currentObject => new
            {
                currentObject.Id,
                currentObject.Name,
                currentObject.Surname,
                currentObject.SurnameForm,
                currentObject.Description,
                currentObject.Age,
                currentObject.Role,
                currentObject.CurrentStatus,
                currentObject.ImagePath,
                TypeKey = currentObject.ObjectType!.Key,
            })
            .FirstOrDefaultAsync();
        if (storyObject is null)
        {
            return null;
        }

        var attributes = await dbContext.ObjectAttributes
            .AsNoTracking()
            .Where(attribute => attribute.StoryObjectId == objectId)
            .OrderBy(attribute => attribute.SortOrder)
            .Select(attribute => new ObjectAttributeDto(
                attribute.Id,
                attribute.AttributeDefinitionId,
                attribute.AttributeDefinition!.Name,
                attribute.Value))
            .ToListAsync();

        var hierarchyRows = await dbContext.StoryObjectHierarchySelections
            .AsNoTracking()
            .Where(selection => selection.StoryObjectId == objectId)
            .OrderBy(selection => selection.SortOrder)
            .Select(selection => new
            {
                selection.HierarchyGroupId,
                GroupName = selection.HierarchyGroup!.Name,
                selection.HierarchyNodeId,
                NodeName = selection.HierarchyNode!.Name,
                selection.SortOrder,
            })
            .ToListAsync();

        var hierarchySelections = hierarchyRows
            .GroupBy(selection => new { selection.HierarchyGroupId, selection.GroupName })
            .OrderBy(group => group.Min(selection => selection.SortOrder))
            .Select(group => new ObjectHierarchySelectionDto(
                group.Key.HierarchyGroupId,
                group.Key.GroupName,
                group.OrderBy(selection => selection.SortOrder)
                    .Select(selection => new ObjectHierarchyNodeSelectionDto(
                        selection.HierarchyNodeId,
                        selection.NodeName))
                    .ToList()))
            .ToList();

        var catalogSelections = await dbContext.StoryObjectCatalogSelections
            .AsNoTracking()
            .Where(selection => selection.StoryObjectId == objectId)
            .OrderBy(selection => selection.SortOrder)
            .Select(selection => new ObjectCatalogSelectionDto(
                selection.TargetType,
                selection.CatalogId,
                selection.Catalog!.Name,
                selection.CatalogEntryGroupId,
                selection.CatalogEntryGroup == null ? null : selection.CatalogEntryGroup.Name,
                selection.CatalogEntryId,
                selection.CatalogEntry == null ? null : selection.CatalogEntry.Name))
            .ToListAsync();

        var ownedItems = await dbContext.ObjectOwnerships
            .AsNoTracking()
            .Where(ownership => ownership.OwnerCharacterId == objectId)
            .OrderBy(ownership => ownership.SortOrder)
            .Select(ownership => new ObjectReferenceDto(
                ownership.ItemObjectId,
                ownership.ItemObject!.Name,
                ownership.ItemObject.ImagePath,
                ownership.ItemObject.ObjectType!.Key))
            .ToListAsync();

        var owners = await dbContext.ObjectOwnerships
            .AsNoTracking()
            .Where(ownership => ownership.ItemObjectId == objectId)
            .OrderBy(ownership => ownership.SortOrder)
            .Select(ownership => new ObjectReferenceDto(
                ownership.OwnerCharacterId,
                ownership.OwnerCharacter!.Name,
                ownership.OwnerCharacter.ImagePath,
                ownership.OwnerCharacter.ObjectType!.Key))
            .ToListAsync();

        var relationRows = await dbContext.ObjectRelations
            .AsNoTracking()
            .Where(relation => relation.SourceObjectId == objectId || relation.TargetObjectId == objectId)
            .Select(relation => new
            {
                relation.RelationType,
                relation.SortOrder,
                relation.SourceObjectId,
                SourceName = relation.SourceObject!.Name,
                SourceImagePath = relation.SourceObject.ImagePath,
                SourceTypeKey = relation.SourceObject.ObjectType!.Key,
                relation.TargetObjectId,
                TargetName = relation.TargetObject!.Name,
                TargetImagePath = relation.TargetObject.ImagePath,
                TargetTypeKey = relation.TargetObject.ObjectType!.Key,
            })
            .ToListAsync();

        IReadOnlyList<ObjectReferenceDto> RelationReferences(string relationType, bool useTargetObject) =>
            relationRows
                .Where(relation => relation.RelationType == relationType)
                .OrderBy(relation => relation.SortOrder)
                .Select(relation => useTargetObject
                    ? new ObjectReferenceDto(
                        relation.TargetObjectId,
                        relation.TargetName,
                        relation.TargetImagePath,
                        relation.TargetTypeKey)
                    : new ObjectReferenceDto(
                        relation.SourceObjectId,
                        relation.SourceName,
                        relation.SourceImagePath,
                        relation.SourceTypeKey))
                .ToList();

        var galleryImages = await dbContext.ObjectGalleryImages
            .AsNoTracking()
            .Where(image => image.StoryObjectId == objectId)
            .OrderBy(image => image.SortOrder)
            .ThenBy(image => image.Id)
            .Select(image => new ObjectGalleryImageDto(
                image.Id,
                image.ImagePath,
                image.Caption,
                image.SortOrder))
            .ToListAsync();

        var outgoingCharacterRows = await dbContext.CharacterRelationships
            .AsNoTracking()
            .Where(relationship => relationship.SourceCharacterId == objectId)
            .OrderBy(relationship => relationship.SortOrder)
            .Select(relationship => new
            {
                relationship.Id,
                relationship.TargetCharacterId,
                CharacterName = relationship.TargetCharacter!.Name,
                CharacterImagePath = relationship.TargetCharacter.ImagePath,
                CharacterTypeKey = relationship.TargetCharacter.ObjectType!.Key,
                relationship.RelationType,
                relationship.Strength,
                relationship.Tension,
                relationship.IsBidirectional,
                relationship.Description,
            })
            .ToListAsync();

        var outgoingCharacterRelationships = outgoingCharacterRows
            .Select(relationship => new CharacterRelationshipDto(
                relationship.Id,
                new ObjectReferenceDto(
                    relationship.TargetCharacterId,
                    relationship.CharacterName,
                    relationship.CharacterImagePath,
                    relationship.CharacterTypeKey),
                relationship.RelationType,
                relationship.Strength,
                relationship.Tension,
                relationship.IsBidirectional,
                relationship.Description,
                "outgoing"))
            .ToList();

        var incomingCharacterRows = await dbContext.CharacterRelationships
            .AsNoTracking()
            .Where(relationship => relationship.TargetCharacterId == objectId)
            .OrderBy(relationship => relationship.SortOrder)
            .Select(relationship => new
            {
                relationship.Id,
                relationship.SourceCharacterId,
                CharacterName = relationship.SourceCharacter!.Name,
                CharacterImagePath = relationship.SourceCharacter.ImagePath,
                CharacterTypeKey = relationship.SourceCharacter.ObjectType!.Key,
                relationship.RelationType,
                relationship.Strength,
                relationship.Tension,
                relationship.IsBidirectional,
                relationship.Description,
            })
            .ToListAsync();

        var incomingCharacterRelationships = incomingCharacterRows
            .Select(relationship => new CharacterRelationshipDto(
                relationship.Id,
                new ObjectReferenceDto(
                    relationship.SourceCharacterId,
                    relationship.CharacterName,
                    relationship.CharacterImagePath,
                    relationship.CharacterTypeKey),
                relationship.RelationType,
                relationship.Strength,
                relationship.Tension,
                relationship.IsBidirectional,
                relationship.Description,
                "incoming"))
            .ToList();

        return new StoryObjectDto(
            storyObject.Id,
            storyObject.Name,
            storyObject.Surname,
            storyObject.SurnameForm,
            storyObject.Description,
            storyObject.Age,
            storyObject.Role,
            storyObject.CurrentStatus,
            storyObject.ImagePath,
            storyObject.TypeKey,
            attributes,
            hierarchySelections,
            catalogSelections,
            ownedItems,
            owners,
            RelationReferences("locatedOnTerritory", true),
            RelationReferences("locatedOnTerritory", false),
            RelationReferences("territoryOwner", true),
            RelationReferences("territoryOwner", false),
            RelationReferences("hierarchyParent", true),
            RelationReferences("hierarchyParent", false),
            galleryImages,
            outgoingCharacterRelationships,
            incomingCharacterRelationships);
    }
}

