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

}
