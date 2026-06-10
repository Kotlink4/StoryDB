using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/objects")]
public class ObjectsController(StoryDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StoryObjectDto>>> GetObjects(
        int projectId,
        [FromQuery] string? typeKey)
    {
        var query = dbContext.Objects
            .AsNoTracking()
            .Include(storyObject => storyObject.ObjectType)
            .Include(storyObject => storyObject.Attributes)
            .ThenInclude(attribute => attribute.AttributeDefinition)
            .Include(storyObject => storyObject.HierarchySelections)
            .ThenInclude(selection => selection.HierarchyGroup)
            .Include(storyObject => storyObject.HierarchySelections)
            .ThenInclude(selection => selection.HierarchyNode)
            .Include(storyObject => storyObject.CatalogSelections)
            .ThenInclude(selection => selection.Catalog)
            .Include(storyObject => storyObject.CatalogSelections)
            .ThenInclude(selection => selection.CatalogEntryGroup)
            .Include(storyObject => storyObject.CatalogSelections)
            .ThenInclude(selection => selection.CatalogEntry)
            .Include(storyObject => storyObject.OwnedItems)
            .ThenInclude(ownership => ownership.ItemObject)
            .ThenInclude(item => item!.ObjectType)
            .Include(storyObject => storyObject.Owners)
            .ThenInclude(ownership => ownership.OwnerCharacter)
            .ThenInclude(owner => owner!.ObjectType)
            .Include(storyObject => storyObject.OutgoingRelations)
            .ThenInclude(relation => relation.TargetObject)
            .ThenInclude(target => target!.ObjectType)
            .Include(storyObject => storyObject.IncomingRelations)
            .ThenInclude(relation => relation.SourceObject)
            .ThenInclude(source => source!.ObjectType)
            .Where(storyObject =>
                storyObject.ProjectId == projectId &&
                storyObject.ObjectType != null &&
                storyObject.ObjectType.IsEnabled);

        if (!string.IsNullOrWhiteSpace(typeKey))
        {
            query = query.Where(storyObject => storyObject.ObjectType != null && storyObject.ObjectType.Key == typeKey);
        }

        var objects = await query
            .OrderBy(storyObject => storyObject.Name)
            .Select(storyObject => ToDto(storyObject))
            .ToListAsync();

        return Ok(objects);
    }

    [HttpPost]
    public async Task<ActionResult<StoryObjectDto>> CreateObject(int projectId, CreateStoryObjectRequest request)
    {
        var requestError = ValidateStoryObjectRequest(request.Name, request.Surname, request.Description, request.Age, request.Role);
        if (requestError is not null)
        {
            return BadRequest(requestError);
        }

        var objectType = await dbContext.ObjectTypes
            .FirstOrDefaultAsync(type =>
                type.ProjectId == projectId &&
                type.Key == request.TypeKey &&
                type.IsEnabled);

        if (objectType is null)
        {
            return BadRequest("Object type was not found or is disabled for this project.");
        }

        var definitionsResult = await GetValidatedAttributeDefinitions(projectId, objectType.Id, request.Attributes);
        if (definitionsResult.Error is not null)
        {
            return BadRequest(definitionsResult.Error);
        }

        var hierarchyResult = await GetValidatedHierarchySelections(projectId, request.HierarchySelections);
        if (hierarchyResult.Error is not null)
        {
            return BadRequest(hierarchyResult.Error);
        }

        var catalogSelectionsResult = await GetValidatedCatalogSelections(projectId, request.CatalogSelections);
        if (catalogSelectionsResult.Error is not null)
        {
            return BadRequest(catalogSelectionsResult.Error);
        }

        var ownershipResult = await GetValidatedOwnershipSelections(
            projectId,
            objectType.Key,
            request.OwnedItemIds,
            request.OwnerCharacterIds);
        if (ownershipResult.Error is not null)
        {
            return BadRequest(ownershipResult.Error);
        }

        var relationResult = await GetValidatedObjectRelations(
            projectId,
            objectType.Key,
            request.TerritoryPlaceIds,
            request.OwnerOrganizationIds,
            request.ParentObjectIds);
        if (relationResult.Error is not null)
        {
            return BadRequest(relationResult.Error);
        }

        var now = DateTime.UtcNow;
        var storyObject = new StoryObject
        {
            ProjectId = projectId,
            ObjectTypeId = objectType.Id,
            Name = request.Name.Trim(),
            Surname = NormalizeOptionalText(request.Surname),
            Description = NormalizeOptionalText(request.Description),
            Age = NormalizeOptionalText(request.Age),
            Role = NormalizeOptionalText(request.Role),
            ImagePath = request.ImagePath,
            CreatedAt = now,
            UpdatedAt = now,
            Attributes = ToObjectAttributes(request.Attributes, definitionsResult.Definitions),
            HierarchySelections = ToHierarchySelections(request.HierarchySelections),
            CatalogSelections = ToCatalogSelections(request.CatalogSelections),
        };

        dbContext.Objects.Add(storyObject);
        await dbContext.SaveChangesAsync();

        storyObject.OwnedItems = objectType.Key == "characters"
            ? ToOwnedItemLinks(storyObject.Id, ownershipResult.OwnedItemIds)
            : [];
        storyObject.Owners = objectType.Key == "items"
            ? ToOwnerLinks(storyObject.Id, ownershipResult.OwnerCharacterIds)
            : [];
        storyObject.OutgoingRelations = ToObjectRelations(
            storyObject.Id,
            objectType.Key,
            relationResult.TerritoryPlaceIds,
            relationResult.OwnerOrganizationIds,
            relationResult.ParentObjectIds);
        await dbContext.SaveChangesAsync();

        var dto = await GetObjectDto(projectId, storyObject.Id);

        return CreatedAtAction(nameof(GetObjects), new { projectId, typeKey = request.TypeKey }, dto);
    }

    [HttpPut("{objectId:int}")]
    public async Task<ActionResult<StoryObjectDto>> UpdateObject(
        int projectId,
        int objectId,
        UpdateStoryObjectRequest request)
    {
        var requestError = ValidateStoryObjectRequest(request.Name, request.Surname, request.Description, request.Age, request.Role);
        if (requestError is not null)
        {
            return BadRequest(requestError);
        }

        var storyObject = await dbContext.Objects
            .Include(storyObject => storyObject.ObjectType)
            .Include(storyObject => storyObject.Attributes)
            .Include(storyObject => storyObject.HierarchySelections)
            .Include(storyObject => storyObject.CatalogSelections)
            .Include(storyObject => storyObject.OwnedItems)
            .Include(storyObject => storyObject.Owners)
            .Include(storyObject => storyObject.OutgoingRelations)
            .FirstOrDefaultAsync(storyObject => storyObject.ProjectId == projectId && storyObject.Id == objectId);

        if (storyObject is null)
        {
            return NotFound();
        }

        var definitionsResult = await GetValidatedAttributeDefinitions(projectId, storyObject.ObjectTypeId, request.Attributes);
        if (definitionsResult.Error is not null)
        {
            return BadRequest(definitionsResult.Error);
        }

        var hierarchyResult = await GetValidatedHierarchySelections(projectId, request.HierarchySelections);
        if (hierarchyResult.Error is not null)
        {
            return BadRequest(hierarchyResult.Error);
        }

        var catalogSelectionsResult = await GetValidatedCatalogSelections(projectId, request.CatalogSelections);
        if (catalogSelectionsResult.Error is not null)
        {
            return BadRequest(catalogSelectionsResult.Error);
        }

        var ownershipResult = await GetValidatedOwnershipSelections(
            projectId,
            storyObject.ObjectType!.Key,
            request.OwnedItemIds,
            request.OwnerCharacterIds);
        if (ownershipResult.Error is not null)
        {
            return BadRequest(ownershipResult.Error);
        }

        var relationResult = await GetValidatedObjectRelations(
            projectId,
            storyObject.ObjectType.Key,
            request.TerritoryPlaceIds,
            request.OwnerOrganizationIds,
            request.ParentObjectIds,
            storyObject.Id);
        if (relationResult.Error is not null)
        {
            return BadRequest(relationResult.Error);
        }

        storyObject.Name = request.Name.Trim();
        storyObject.Surname = NormalizeOptionalText(request.Surname);
        storyObject.Description = NormalizeOptionalText(request.Description);
        storyObject.Age = NormalizeOptionalText(request.Age);
        storyObject.Role = NormalizeOptionalText(request.Role);
        storyObject.ImagePath = request.ImagePath;
        storyObject.UpdatedAt = DateTime.UtcNow;

        dbContext.ObjectAttributes.RemoveRange(storyObject.Attributes);
        storyObject.Attributes = ToObjectAttributes(request.Attributes, definitionsResult.Definitions);
        dbContext.StoryObjectHierarchySelections.RemoveRange(storyObject.HierarchySelections);
        storyObject.HierarchySelections = ToHierarchySelections(request.HierarchySelections);
        dbContext.StoryObjectCatalogSelections.RemoveRange(storyObject.CatalogSelections);
        storyObject.CatalogSelections = ToCatalogSelections(request.CatalogSelections);
        dbContext.ObjectOwnerships.RemoveRange(storyObject.OwnedItems);
        dbContext.ObjectOwnerships.RemoveRange(storyObject.Owners);
        storyObject.OwnedItems = storyObject.ObjectType.Key == "characters"
            ? ToOwnedItemLinks(storyObject.Id, ownershipResult.OwnedItemIds)
            : [];
        storyObject.Owners = storyObject.ObjectType.Key == "items"
            ? ToOwnerLinks(storyObject.Id, ownershipResult.OwnerCharacterIds)
            : [];
        dbContext.ObjectRelations.RemoveRange(storyObject.OutgoingRelations);
        storyObject.OutgoingRelations = ToObjectRelations(
            storyObject.Id,
            storyObject.ObjectType.Key,
            relationResult.TerritoryPlaceIds,
            relationResult.OwnerOrganizationIds,
            relationResult.ParentObjectIds);

        await dbContext.SaveChangesAsync();

        var dto = await GetObjectDto(projectId, storyObject.Id);

        return Ok(dto);
    }

    [HttpDelete("{objectId:int}")]
    public async Task<IActionResult> DeleteObject(int projectId, int objectId)
    {
        var storyObject = await dbContext.Objects
            .FirstOrDefaultAsync(storyObject => storyObject.ProjectId == projectId && storyObject.Id == objectId);

        if (storyObject is null)
        {
            return NotFound();
        }

        dbContext.Objects.Remove(storyObject);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private static string? ValidateStoryObjectRequest(string name, string? surname, string? description, string? age, string? role)
    {
        var nameError = ValidateName(name, "Object name");
        if (nameError is not null)
        {
            return nameError;
        }

        if (surname?.Trim().Length > 120)
        {
            return "Surname must be 120 characters or shorter.";
        }

        if (description?.Length > 1000)
        {
            return "Description must be 1000 characters or shorter.";
        }

        if (age?.Trim().Length > 120)
        {
            return "Age must be 120 characters or shorter.";
        }

        if (role?.Trim().Length > 120)
        {
            return "Role must be 120 characters or shorter.";
        }

        return null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? ValidateName(string name, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return $"{fieldName} is required.";
        }

        if (name.Trim().Length > 120)
        {
            return $"{fieldName} must be 120 characters or shorter.";
        }

        return null;
    }

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

            var nameError = ValidateName(name, "Attribute name");
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

    private async Task<StoryObjectDto> GetObjectDto(int projectId, int objectId)
    {
        var storyObject = await dbContext.Objects
            .AsNoTracking()
            .Include(currentObject => currentObject.ObjectType)
            .Include(currentObject => currentObject.Attributes)
            .ThenInclude(attribute => attribute.AttributeDefinition)
            .Include(currentObject => currentObject.HierarchySelections)
            .ThenInclude(selection => selection.HierarchyGroup)
            .Include(currentObject => currentObject.HierarchySelections)
            .ThenInclude(selection => selection.HierarchyNode)
            .Include(currentObject => currentObject.CatalogSelections)
            .ThenInclude(selection => selection.Catalog)
            .Include(currentObject => currentObject.CatalogSelections)
            .ThenInclude(selection => selection.CatalogEntryGroup)
            .Include(currentObject => currentObject.CatalogSelections)
            .ThenInclude(selection => selection.CatalogEntry)
            .Include(currentObject => currentObject.OwnedItems)
            .ThenInclude(ownership => ownership.ItemObject)
            .ThenInclude(item => item!.ObjectType)
            .Include(currentObject => currentObject.Owners)
            .ThenInclude(ownership => ownership.OwnerCharacter)
            .ThenInclude(owner => owner!.ObjectType)
            .Include(currentObject => currentObject.OutgoingRelations)
            .ThenInclude(relation => relation.TargetObject)
            .ThenInclude(target => target!.ObjectType)
            .Include(currentObject => currentObject.IncomingRelations)
            .ThenInclude(relation => relation.SourceObject)
            .ThenInclude(source => source!.ObjectType)
            .FirstAsync(currentObject => currentObject.ProjectId == projectId && currentObject.Id == objectId);

        return ToDto(storyObject);
    }

    private static StoryObjectDto ToDto(StoryObject storyObject)
    {
        return new StoryObjectDto(
            storyObject.Id,
            storyObject.Name,
            storyObject.Surname,
            storyObject.Description,
            storyObject.Age,
            storyObject.Role,
            storyObject.ImagePath,
            storyObject.ObjectType!.Key,
            storyObject.Attributes
                .OrderBy(attribute => attribute.SortOrder)
                .Select(attribute => new ObjectAttributeDto(
                    attribute.Id,
                    attribute.AttributeDefinitionId,
                    attribute.AttributeDefinition!.Name,
                    attribute.Value))
                .ToList(),
            storyObject.HierarchySelections
                .Where(selection => selection.HierarchyGroup is not null && selection.HierarchyNode is not null)
                .GroupBy(selection => new
                {
                    selection.HierarchyGroupId,
                    selection.HierarchyGroup!.Name,
                })
                .OrderBy(group => group.Min(selection => selection.SortOrder))
                .Select(group => new ObjectHierarchySelectionDto(
                    group.Key.HierarchyGroupId,
                    group.Key.Name,
                    group.OrderBy(selection => selection.SortOrder)
                        .Select(selection => new ObjectHierarchyNodeSelectionDto(
                            selection.HierarchyNodeId,
                            selection.HierarchyNode!.Name))
                        .ToList()))
                .ToList(),
            storyObject.CatalogSelections
                .Where(selection => selection.Catalog is not null)
                .OrderBy(selection => selection.SortOrder)
                .Select(selection => new ObjectCatalogSelectionDto(
                    selection.TargetType,
                    selection.CatalogId,
                    selection.Catalog!.Name,
                    selection.CatalogEntryGroupId,
                    selection.CatalogEntryGroup?.Name,
                    selection.CatalogEntryId,
                    selection.CatalogEntry?.Name))
                .ToList(),
            storyObject.OwnedItems
                .Where(ownership => ownership.ItemObject is not null)
                .OrderBy(ownership => ownership.SortOrder)
                .Select(ownership => new ObjectReferenceDto(
                    ownership.ItemObjectId,
                    ownership.ItemObject!.Name,
                    ownership.ItemObject.ImagePath,
                    ownership.ItemObject.ObjectType?.Key ?? "items"))
                .ToList(),
            storyObject.Owners
                .Where(ownership => ownership.OwnerCharacter is not null)
                .OrderBy(ownership => ownership.SortOrder)
                .Select(ownership => new ObjectReferenceDto(
                    ownership.OwnerCharacterId,
                    ownership.OwnerCharacter!.Name,
                    ownership.OwnerCharacter.ImagePath,
                    ownership.OwnerCharacter.ObjectType?.Key ?? "characters"))
                .ToList(),
            ToRelationReferences(storyObject.OutgoingRelations, "locatedOnTerritory", true),
            ToRelationReferences(storyObject.IncomingRelations, "locatedOnTerritory", false),
            ToRelationReferences(storyObject.OutgoingRelations, "territoryOwner", true),
            ToRelationReferences(storyObject.IncomingRelations, "territoryOwner", false),
            ToRelationReferences(storyObject.OutgoingRelations, "hierarchyParent", true),
            ToRelationReferences(storyObject.IncomingRelations, "hierarchyParent", false)
        );
    }

    private static IReadOnlyList<ObjectReferenceDto> ToRelationReferences(
        IEnumerable<ObjectRelation> relations,
        string relationType,
        bool useTargetObject)
    {
        return relations
            .Where(relation => relation.RelationType == relationType)
            .OrderBy(relation => relation.SortOrder)
            .Select(relation => useTargetObject ? relation.TargetObject : relation.SourceObject)
            .Where(storyObject => storyObject is not null)
            .Select(storyObject => new ObjectReferenceDto(
                storyObject!.Id,
                storyObject.Name,
                storyObject.ImagePath,
                storyObject.ObjectType?.Key ?? string.Empty))
            .ToList();
    }

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

public record CreateStoryObjectRequest(
    string TypeKey,
    string Name,
    string? Surname,
    string? Description,
    string? Age,
    string? Role,
    string? ImagePath,
    IReadOnlyList<CreateObjectAttributeRequest> Attributes,
    IReadOnlyList<ObjectHierarchySelectionRequest> HierarchySelections,
    IReadOnlyList<ObjectCatalogSelectionRequest> CatalogSelections,
    IReadOnlyList<int> OwnedItemIds,
    IReadOnlyList<int> OwnerCharacterIds,
    IReadOnlyList<int> TerritoryPlaceIds,
    IReadOnlyList<int> OwnerOrganizationIds,
    IReadOnlyList<int> ParentObjectIds);

public record CreateObjectAttributeRequest(string Name, string? Value);

public record ObjectHierarchySelectionRequest(int GroupId, IReadOnlyList<int> NodeIds);

public record ObjectCatalogSelectionRequest(
    string TargetType,
    int CatalogId,
    int? CatalogEntryGroupId,
    int? CatalogEntryId);

public record UpdateStoryObjectRequest(
    string Name,
    string? Surname,
    string? Description,
    string? Age,
    string? Role,
    string? ImagePath,
    IReadOnlyList<CreateObjectAttributeRequest> Attributes,
    IReadOnlyList<ObjectHierarchySelectionRequest> HierarchySelections,
    IReadOnlyList<ObjectCatalogSelectionRequest> CatalogSelections,
    IReadOnlyList<int> OwnedItemIds,
    IReadOnlyList<int> OwnerCharacterIds,
    IReadOnlyList<int> TerritoryPlaceIds,
    IReadOnlyList<int> OwnerOrganizationIds,
    IReadOnlyList<int> ParentObjectIds);

public record StoryObjectDto(
    int Id,
    string Name,
    string? Surname,
    string? Description,
    string? Age,
    string? Role,
    string? ImagePath,
    string TypeKey,
    IReadOnlyList<ObjectAttributeDto> Attributes,
    IReadOnlyList<ObjectHierarchySelectionDto> HierarchySelections,
    IReadOnlyList<ObjectCatalogSelectionDto> CatalogSelections,
    IReadOnlyList<ObjectReferenceDto> OwnedItems,
    IReadOnlyList<ObjectReferenceDto> Owners,
    IReadOnlyList<ObjectReferenceDto> TerritoryPlaces,
    IReadOnlyList<ObjectReferenceDto> OrganizationsOnTerritory,
    IReadOnlyList<ObjectReferenceDto> OwnerOrganizations,
    IReadOnlyList<ObjectReferenceDto> OwnedTerritories,
    IReadOnlyList<ObjectReferenceDto> HierarchyParents,
    IReadOnlyList<ObjectReferenceDto> HierarchyChildren);

public record ObjectReferenceDto(int Id, string Name, string? ImagePath, string TypeKey);

public record ObjectAttributeDto(int Id, int AttributeDefinitionId, string Name, string? Value);

public record ObjectHierarchySelectionDto(
    int GroupId,
    string GroupName,
    IReadOnlyList<ObjectHierarchyNodeSelectionDto> Nodes);

public record ObjectHierarchyNodeSelectionDto(int Id, string Name);

public record ObjectCatalogSelectionDto(
    string TargetType,
    int CatalogId,
    string CatalogName,
    int? CatalogEntryGroupId,
    string? CatalogEntryGroupName,
    int? CatalogEntryId,
    string? CatalogEntryName);

public record AttributeDefinitionsValidationResult(
    string? Error,
    IReadOnlyDictionary<int, AttributeDefinition> Definitions);

public record HierarchySelectionsValidationResult(string? Error);

public record CatalogSelectionsValidationResult(string? Error);

public record OwnershipSelectionsValidationResult(
    string? Error,
    IReadOnlyList<int> OwnedItemIds,
    IReadOnlyList<int> OwnerCharacterIds);

public record ObjectRelationsValidationResult(
    string? Error,
    IReadOnlyList<int> TerritoryPlaceIds,
    IReadOnlyList<int> OwnerOrganizationIds,
    IReadOnlyList<int> ParentObjectIds);
