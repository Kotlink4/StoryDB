using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;

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
            .Select(storyObject => new StoryObjectDto(
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
                    .Take(3)
                    .Select(attribute => new ObjectAttributeDto(
                        attribute.Id,
                        attribute.AttributeDefinitionId,
                        attribute.AttributeDefinition!.Name,
                        attribute.Value))
                    .ToList(),
                Array.Empty<ObjectHierarchySelectionDto>(), // HierarchySelections
                Array.Empty<ObjectCatalogSelectionDto>(), // CatalogSelections
                Array.Empty<ObjectReferenceDto>(), // OwnedItems
                Array.Empty<ObjectReferenceDto>(), // Owners
                Array.Empty<ObjectReferenceDto>(), // TerritoryPlaces
                Array.Empty<ObjectReferenceDto>(), // OrganizationsOnTerritory
                Array.Empty<ObjectReferenceDto>(), // OwnerOrganizations
                Array.Empty<ObjectReferenceDto>(), // OwnedTerritories
                Array.Empty<ObjectReferenceDto>(), // HierarchyParents
                Array.Empty<ObjectReferenceDto>(), // HierarchyChildren
                Array.Empty<ObjectGalleryImageDto>(), // GalleryImages
                Array.Empty<CharacterRelationshipDto>(), // OutgoingCharacterRelationships
                Array.Empty<CharacterRelationshipDto>())) // IncomingCharacterRelationships
            .ToListAsync();

        return Ok(objects);
    }

    [HttpGet("{objectId:int}")]
    public async Task<ActionResult<StoryObjectDto>> GetObject(int projectId, int objectId)
    {
        var storyObjectExists = await dbContext.Objects
            .AsNoTracking()
            .AnyAsync(storyObject => storyObject.ProjectId == projectId && storyObject.Id == objectId);

        if (!storyObjectExists)
        {
            return NotFound();
        }

        return Ok(await GetObjectDto(projectId, objectId));
    }

    [HttpPost]
    public async Task<ActionResult<StoryObjectDto>> CreateObject(int projectId, CreateStoryObjectRequest request)
    {
        var requestError = RequestValidators.ValidateStoryObject(
            request.Name,
            request.Surname,
            request.Description,
            request.Age,
            request.Role,
            request.ImagePath);
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

        var characterRelationshipsResult = await GetValidatedCharacterRelationships(
            projectId,
            objectType.Key,
            request.CharacterRelationships);
        if (characterRelationshipsResult.Error is not null)
        {
            return BadRequest(characterRelationshipsResult.Error);
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
            ImagePath = ValidationRules.NormalizeOptionalText(request.ImagePath),
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
        storyObject.OutgoingCharacterRelationships = objectType.Key == "characters"
            ? ToCharacterRelationships(storyObject.Id, characterRelationshipsResult.Relationships)
            : [];
        await dbContext.SaveChangesAsync();
        await MarkRelationGraphLayoutsStale(projectId);

        var dto = ToSavedSummaryDto(storyObject, objectType.Key, definitionsResult.Definitions);

        return CreatedAtAction(nameof(GetObject), new { projectId, objectId = storyObject.Id }, dto);
    }

    [HttpPut("{objectId:int}")]
    public async Task<ActionResult<StoryObjectDto>> UpdateObject(
        int projectId,
        int objectId,
        UpdateStoryObjectRequest request)
    {
        var requestError = RequestValidators.ValidateStoryObject(
            request.Name,
            request.Surname,
            request.Description,
            request.Age,
            request.Role,
            request.ImagePath);
        if (requestError is not null)
        {
            return BadRequest(requestError);
        }

        var storyObject = await dbContext.Objects
            .AsSplitQuery()
            .Include(storyObject => storyObject.ObjectType)
            .Include(storyObject => storyObject.Attributes)
            .Include(storyObject => storyObject.HierarchySelections)
            .Include(storyObject => storyObject.CatalogSelections)
            .Include(storyObject => storyObject.OwnedItems)
            .Include(storyObject => storyObject.Owners)
            .Include(storyObject => storyObject.OutgoingRelations)
            .Include(storyObject => storyObject.OutgoingCharacterRelationships)
            .Include(storyObject => storyObject.IncomingCharacterRelationships)
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

        var characterRelationshipsResult = await GetValidatedCharacterRelationships(
            projectId,
            storyObject.ObjectType.Key,
            request.CharacterRelationships,
            storyObject.Id);
        if (characterRelationshipsResult.Error is not null)
        {
            return BadRequest(characterRelationshipsResult.Error);
        }

        storyObject.Name = request.Name.Trim();
        storyObject.Surname = NormalizeOptionalText(request.Surname);
        storyObject.Description = NormalizeOptionalText(request.Description);
        storyObject.Age = NormalizeOptionalText(request.Age);
        storyObject.Role = NormalizeOptionalText(request.Role);
        storyObject.ImagePath = ValidationRules.NormalizeOptionalText(request.ImagePath);
        storyObject.UpdatedAt = DateTime.UtcNow;

        SyncObjectAttributes(storyObject, ToObjectAttributes(request.Attributes, definitionsResult.Definitions));
        SyncHierarchySelections(storyObject, ToHierarchySelections(request.HierarchySelections));
        SyncCatalogSelections(storyObject, ToCatalogSelections(request.CatalogSelections));
        SyncOwnerships(storyObject, storyObject.ObjectType.Key, ownershipResult.OwnedItemIds, ownershipResult.OwnerCharacterIds);
        SyncObjectRelations(storyObject, ToObjectRelations(
            storyObject.Id,
            storyObject.ObjectType.Key,
            relationResult.TerritoryPlaceIds,
            relationResult.OwnerOrganizationIds,
            relationResult.ParentObjectIds));
        SyncCharacterRelationships(storyObject, storyObject.ObjectType.Key, characterRelationshipsResult.Relationships);

        await dbContext.SaveChangesAsync();
        await MarkRelationGraphLayoutsStale(projectId);

        var dto = ToSavedSummaryDto(storyObject, storyObject.ObjectType.Key, definitionsResult.Definitions);

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
        await MarkRelationGraphLayoutsStale(projectId);

        return NoContent();
    }

    [HttpGet("{objectId:int}/gallery")]
    public async Task<ActionResult<IReadOnlyList<ObjectGalleryImageDto>>> GetGalleryImages(
        int projectId,
        int objectId)
    {
        if (!await ObjectExists(projectId, objectId))
        {
            return NotFound();
        }

        var images = await dbContext.ObjectGalleryImages
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

        return Ok(images);
    }

    [HttpPost("{objectId:int}/gallery")]
    public async Task<ActionResult<StoryObjectDto>> AddGalleryImage(
        int projectId,
        int objectId,
        ObjectGalleryImageRequest request)
    {
        var validationError = RequestValidators.ValidateRequiredGalleryImage(request.ImagePath, request.Caption);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        if (!await ObjectExists(projectId, objectId))
        {
            return NotFound();
        }

        var sortOrder = await dbContext.ObjectGalleryImages
            .Where(image => image.StoryObjectId == objectId)
            .Select(image => (int?)image.SortOrder)
            .MaxAsync() ?? 0;
        var now = DateTime.UtcNow;

        dbContext.ObjectGalleryImages.Add(new ObjectGalleryImage
        {
            StoryObjectId = objectId,
            ImagePath = request.ImagePath.Trim(),
            Caption = NormalizeOptionalText(request.Caption),
            SortOrder = sortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await dbContext.SaveChangesAsync();

        return Ok(await GetObjectDto(projectId, objectId));
    }

    [HttpPut("{objectId:int}/gallery/{imageId:int}")]
    public async Task<ActionResult<StoryObjectDto>> UpdateGalleryImage(
        int projectId,
        int objectId,
        int imageId,
        ObjectGalleryImageRequest request)
    {
        var validationError = RequestValidators.ValidateRequiredGalleryImage(request.ImagePath, request.Caption);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var image = await dbContext.ObjectGalleryImages
            .Include(currentImage => currentImage.StoryObject)
            .FirstOrDefaultAsync(currentImage =>
                currentImage.Id == imageId &&
                currentImage.StoryObjectId == objectId &&
                currentImage.StoryObject != null &&
                currentImage.StoryObject.ProjectId == projectId);
        if (image is null)
        {
            return NotFound();
        }

        image.ImagePath = request.ImagePath.Trim();
        image.Caption = NormalizeOptionalText(request.Caption);
        image.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        return Ok(await GetObjectDto(projectId, objectId));
    }

    [HttpDelete("{objectId:int}/gallery/{imageId:int}")]
    public async Task<ActionResult<StoryObjectDto>> DeleteGalleryImage(
        int projectId,
        int objectId,
        int imageId)
    {
        var image = await dbContext.ObjectGalleryImages
            .Include(currentImage => currentImage.StoryObject)
            .FirstOrDefaultAsync(currentImage =>
                currentImage.Id == imageId &&
                currentImage.StoryObjectId == objectId &&
                currentImage.StoryObject != null &&
                currentImage.StoryObject.ProjectId == projectId);
        if (image is null)
        {
            return NotFound();
        }

        dbContext.ObjectGalleryImages.Remove(image);
        await dbContext.SaveChangesAsync();

        return Ok(await GetObjectDto(projectId, objectId));
    }

    private Task<bool> ObjectExists(int projectId, int objectId) =>
        dbContext.Objects.AnyAsync(storyObject =>
            storyObject.ProjectId == projectId &&
            storyObject.Id == objectId);

    private Task MarkRelationGraphLayoutsStale(int projectId)
    {
        var now = DateTime.UtcNow;

        return dbContext.RelationGraphLayouts
            .Where(layout => layout.ProjectId == projectId && !layout.IsStale)
            .ExecuteUpdateAsync(updates => updates
                .SetProperty(layout => layout.IsStale, true)
                .SetProperty(layout => layout.UpdatedAt, now));
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
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

    private async Task<StoryObjectDto> GetObjectDto(int projectId, int objectId)
    {
        var storyObject = await dbContext.Objects
            .AsNoTracking()
            .Where(currentObject => currentObject.ProjectId == projectId && currentObject.Id == objectId)
            .Select(currentObject => new
            {
                currentObject.Id,
                currentObject.Name,
                currentObject.Surname,
                currentObject.Description,
                currentObject.Age,
                currentObject.Role,
                currentObject.ImagePath,
                TypeKey = currentObject.ObjectType!.Key,
            })
            .FirstAsync();

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
            storyObject.Description,
            storyObject.Age,
            storyObject.Role,
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

    private static StoryObjectDto ToSavedSummaryDto(
        StoryObject storyObject,
        string typeKey,
        IReadOnlyDictionary<int, AttributeDefinition> definitionsById)
    {
        return new StoryObjectDto(
            storyObject.Id,
            storyObject.Name,
            storyObject.Surname,
            storyObject.Description,
            storyObject.Age,
            storyObject.Role,
            storyObject.ImagePath,
            typeKey,
            storyObject.Attributes
                .OrderBy(attribute => attribute.SortOrder)
                .Select(attribute =>
                {
                    definitionsById.TryGetValue(attribute.AttributeDefinitionId, out var definition);

                    return new ObjectAttributeDto(
                        attribute.Id,
                        attribute.AttributeDefinitionId,
                        definition?.Name ?? string.Empty,
                        attribute.Value);
                })
                .ToList(),
            [], // HierarchySelections
            [], // CatalogSelections
            [], // OwnedItems
            [], // Owners
            [], // TerritoryPlaces
            [], // OrganizationsOnTerritory
            [], // OwnerOrganizations
            [], // OwnedTerritories
            [], // HierarchyParents
            [], // HierarchyChildren
            [], // GalleryImages
            [], // OutgoingCharacterRelationships
            []); // IncomingCharacterRelationships
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
    IReadOnlyList<int> ParentObjectIds,
    IReadOnlyList<CharacterRelationshipRequest> CharacterRelationships);

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
    IReadOnlyList<int> ParentObjectIds,
    IReadOnlyList<CharacterRelationshipRequest> CharacterRelationships);

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
    IReadOnlyList<ObjectReferenceDto> HierarchyChildren,
    IReadOnlyList<ObjectGalleryImageDto> GalleryImages,
    IReadOnlyList<CharacterRelationshipDto> OutgoingCharacterRelationships,
    IReadOnlyList<CharacterRelationshipDto> IncomingCharacterRelationships);

public record ObjectReferenceDto(int Id, string Name, string? ImagePath, string TypeKey);

public record ObjectGalleryImageRequest(string ImagePath, string? Caption);

public record ObjectGalleryImageDto(int Id, string ImagePath, string? Caption, int SortOrder);

public record CharacterRelationshipRequest(
    int? Id,
    int? SourceCharacterId,
    int TargetCharacterId,
    string RelationType,
    int Strength,
    int Tension,
    bool IsBidirectional,
    string? Description);

public record CharacterRelationshipDto(
    int Id,
    ObjectReferenceDto Character,
    string RelationType,
    int Strength,
    int Tension,
    bool IsBidirectional,
    string? Description,
    string Direction);

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

public record CharacterRelationshipSelection(
    int? Id,
    int SourceCharacterId,
    int TargetCharacterId,
    string RelationType,
    int Strength,
    int Tension,
    bool IsBidirectional,
    string? Description,
    int SortOrder);

public record CharacterRelationshipsValidationResult(
    string? Error,
    IReadOnlyList<CharacterRelationshipSelection> Relationships);
