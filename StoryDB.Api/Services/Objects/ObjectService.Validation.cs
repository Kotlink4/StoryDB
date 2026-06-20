using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Objects;

public partial class ObjectService
{
    private async Task<AttributeDefinitionsValidationResult> GetValidatedAttributeDefinitions(
        int projectId,
        int objectTypeId,
        IReadOnlyList<CreateObjectAttributeRequest> attributes)
    {
        var seenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var definitionsByName = await dbContext.AttributeDefinitions
            .AsNoTracking()
            .Where(definition => definition.ProjectId == projectId && definition.ObjectTypeId == objectTypeId)
            .ToDictionaryAsync(definition => definition.Name, StringComparer.OrdinalIgnoreCase);
        var usedDefinitionsById = new Dictionary<int, AttributeDefinition>();

        foreach (var attribute in attributes)
        {
            var name = attribute.Name.Trim();
            var value = attribute.Value?.Trim();
            if (name.Length == 0 && string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            var nameError = RequestValidators.ValidateName(name, "Attribute name");
            if (nameError is not null)
            {
                return new AttributeDefinitionsValidationResult(nameError, new Dictionary<int, AttributeDefinition>());
            }

            if (!seenNames.Add(name))
            {
                return new AttributeDefinitionsValidationResult("Duplicate attributes are not allowed.", new Dictionary<int, AttributeDefinition>());
            }

            if (!definitionsByName.TryGetValue(name, out var definition))
            {
                return new AttributeDefinitionsValidationResult($"{name}: attribute definition was not found.", new Dictionary<int, AttributeDefinition>());
            }

            usedDefinitionsById[definition.Id] = definition;

            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            if (definition.DataType == "number")
            {
                if (!double.TryParse(value, out var numericValue))
                {
                    return new AttributeDefinitionsValidationResult($"{definition.Name}: value must be a number.", new Dictionary<int, AttributeDefinition>());
                }

                if (definition.MinValue is not null && numericValue < definition.MinValue)
                {
                    return new AttributeDefinitionsValidationResult($"{definition.Name}: value is below the minimum.", new Dictionary<int, AttributeDefinition>());
                }

                if (definition.MaxValue is not null && numericValue > definition.MaxValue)
                {
                    return new AttributeDefinitionsValidationResult($"{definition.Name}: value is above the maximum.", new Dictionary<int, AttributeDefinition>());
                }
            }

            if (definition.DataType == "select" && !string.IsNullOrWhiteSpace(definition.OptionsJson))
            {
                var options = JsonSerializer.Deserialize<IReadOnlyList<string>>(definition.OptionsJson) ?? [];
                if (options.Count > 0 && !options.Any(option => option.Equals(value, StringComparison.OrdinalIgnoreCase)))
                {
                    return new AttributeDefinitionsValidationResult($"{definition.Name}: choose one of the allowed values.", new Dictionary<int, AttributeDefinition>());
                }
            }
        }

        return new AttributeDefinitionsValidationResult(null, usedDefinitionsById);
    }

    private static List<ObjectAttribute> ToObjectAttributes(
        IReadOnlyList<CreateObjectAttributeRequest> attributes,
        IReadOnlyDictionary<int, AttributeDefinition> definitionsById)
    {
        var definitionsByName = definitionsById.Values.ToDictionary(
            definition => definition.Name,
            StringComparer.OrdinalIgnoreCase);

        return attributes
            .Select((attribute, index) => new { Attribute = attribute, Index = index })
            .Where(item => item.Attribute.Name.Trim().Length > 0)
            .Select(item => new ObjectAttribute
            {
                AttributeDefinitionId = definitionsByName[item.Attribute.Name.Trim()].Id,
                Value = item.Attribute.Value,
                SortOrder = item.Index,
            })
            .ToList();
    }

    private async Task<HierarchySelectionsValidationResult> GetValidatedHierarchySelections(
        int projectId,
        IReadOnlyList<ObjectHierarchySelectionRequest> selections)
    {
        var normalizedSelections = selections
            .Select(selection => new ObjectHierarchySelectionRequest(
                selection.GroupId,
                selection.NodeIds.Distinct().ToList()))
            .Where(selection => selection.NodeIds.Count > 0)
            .ToList();

        if (normalizedSelections.Count == 0)
        {
            return new HierarchySelectionsValidationResult(null);
        }

        var isHierarchyEnabled = await dbContext.ObjectTypes.AnyAsync(type =>
            type.ProjectId == projectId &&
            type.Key == "hierarchy" &&
            type.IsEnabled);
        if (!isHierarchyEnabled)
        {
            return new HierarchySelectionsValidationResult("Hierarchy module is disabled for this project.");
        }

        var seenGroups = new HashSet<int>();
        foreach (var selection in normalizedSelections)
        {
            if (!seenGroups.Add(selection.GroupId))
            {
                return new HierarchySelectionsValidationResult("Duplicate hierarchy groups are not allowed.");
            }

            var validNodeCount = await dbContext.HierarchyNodes.CountAsync(node =>
                node.GroupId == selection.GroupId &&
                node.Group!.ProjectId == projectId &&
                selection.NodeIds.Contains(node.Id));
            if (validNodeCount != selection.NodeIds.Count)
            {
                return new HierarchySelectionsValidationResult("One or more hierarchy elements were not found.");
            }
        }

        return new HierarchySelectionsValidationResult(null);
    }

    private static List<StoryObjectHierarchySelection> ToHierarchySelections(
        IReadOnlyList<ObjectHierarchySelectionRequest> selections)
    {
        return selections
            .SelectMany((selection, groupIndex) => selection.NodeIds
                .Distinct()
                .Select((nodeId, nodeIndex) => new StoryObjectHierarchySelection
                {
                    HierarchyGroupId = selection.GroupId,
                    HierarchyNodeId = nodeId,
                    SortOrder = (groupIndex * 1000) + nodeIndex,
                }))
            .ToList();
    }

    private async Task<CatalogSelectionsValidationResult> GetValidatedCatalogSelections(
        int projectId,
        IReadOnlyList<ObjectCatalogSelectionRequest> selections)
    {
        var normalizedSelections = NormalizeCatalogSelections(selections);
        if (normalizedSelections.Count == 0)
        {
            return new CatalogSelectionsValidationResult(null);
        }

        var catalogIds = normalizedSelections.Select(selection => selection.CatalogId).Distinct().ToList();
        var validCatalogCount = await dbContext.Catalogs.CountAsync(catalog =>
            catalog.ProjectId == projectId && catalogIds.Contains(catalog.Id));
        if (validCatalogCount != catalogIds.Count)
        {
            return new CatalogSelectionsValidationResult("One or more catalogs were not found.");
        }

        var groupIds = normalizedSelections
            .Where(selection => selection.TargetType == "group" && selection.CatalogEntryGroupId is not null)
            .Select(selection => selection.CatalogEntryGroupId!.Value)
            .Distinct()
            .ToList();
        if (groupIds.Count > 0)
        {
            var validGroupCount = await dbContext.CatalogEntryGroups.CountAsync(group =>
                group.Catalog!.ProjectId == projectId &&
                groupIds.Contains(group.Id));
            if (validGroupCount != groupIds.Count)
            {
                return new CatalogSelectionsValidationResult("One or more catalog groups were not found.");
            }
        }

        var entryIds = normalizedSelections
            .Where(selection => selection.TargetType == "entry" && selection.CatalogEntryId is not null)
            .Select(selection => selection.CatalogEntryId!.Value)
            .Distinct()
            .ToList();
        if (entryIds.Count > 0)
        {
            var validEntryCount = await dbContext.CatalogEntries.CountAsync(entry =>
                entry.Catalog!.ProjectId == projectId &&
                entryIds.Contains(entry.Id));
            if (validEntryCount != entryIds.Count)
            {
                return new CatalogSelectionsValidationResult("One or more catalog entries were not found.");
            }
        }

        foreach (var selection in normalizedSelections)
        {
            if (selection.TargetType == "group")
            {
                var groupMatchesCatalog = await dbContext.CatalogEntryGroups.AnyAsync(group =>
                    group.Id == selection.CatalogEntryGroupId &&
                    group.CatalogId == selection.CatalogId);
                if (!groupMatchesCatalog)
                {
                    return new CatalogSelectionsValidationResult("Catalog group does not belong to selected catalog.");
                }
            }

            if (selection.TargetType == "entry")
            {
                var entryMatchesCatalog = await dbContext.CatalogEntries.AnyAsync(entry =>
                    entry.Id == selection.CatalogEntryId &&
                    entry.CatalogId == selection.CatalogId);
                if (!entryMatchesCatalog)
                {
                    return new CatalogSelectionsValidationResult("Catalog entry does not belong to selected catalog.");
                }
            }
        }

        return new CatalogSelectionsValidationResult(null);
    }

    private static List<StoryObjectCatalogSelection> ToCatalogSelections(
        IReadOnlyList<ObjectCatalogSelectionRequest> selections)
    {
        return NormalizeCatalogSelections(selections)
            .Select((selection, index) => new StoryObjectCatalogSelection
            {
                TargetType = selection.TargetType,
                CatalogId = selection.CatalogId,
                CatalogEntryGroupId = selection.TargetType == "group" ? selection.CatalogEntryGroupId : null,
                CatalogEntryId = selection.TargetType == "entry" ? selection.CatalogEntryId : null,
                SortOrder = index,
            })
            .ToList();
    }

    private static List<ObjectCatalogSelectionRequest> NormalizeCatalogSelections(
        IReadOnlyList<ObjectCatalogSelectionRequest> selections)
    {
        var normalizedSelections = new List<ObjectCatalogSelectionRequest>();
        var seenKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var selection in selections)
        {
            var targetType = selection.TargetType.Trim();
            if (targetType != "catalog" && targetType != "group" && targetType != "entry")
            {
                continue;
            }

            if (selection.CatalogId <= 0)
            {
                continue;
            }

            var groupId = targetType == "group" ? selection.CatalogEntryGroupId : null;
            var entryId = targetType == "entry" ? selection.CatalogEntryId : null;
            if ((targetType == "group" && groupId is null) || (targetType == "entry" && entryId is null))
            {
                continue;
            }

            var key = $"{targetType}:{selection.CatalogId}:{groupId}:{entryId}";
            if (!seenKeys.Add(key))
            {
                continue;
            }

            normalizedSelections.Add(new ObjectCatalogSelectionRequest(
                targetType,
                selection.CatalogId,
                groupId,
                entryId));
        }

        return normalizedSelections;
    }
}

