using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Objects;

public partial class ObjectService(
    StoryDbContext dbContext,
    ICacheSingleFlight cacheSingleFlight) : IObjectService
{
    private static readonly TimeSpan ObjectSummariesCacheDuration = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan ObjectDetailCacheDuration = TimeSpan.FromSeconds(15);
    private static readonly string?[] ObjectSummaryCacheTypeKeys = [null, "characters", "items", "places", "organizations"];

    public async Task<ObjectServiceResult<StoryObjectDto>> CreateObjectAsync(int projectId, CreateStoryObjectRequest request)
    {
        var requestError = RequestValidators.ValidateStoryObject(
            request.Name,
            request.Surname,
            request.SurnameForm,
            request.Description,
            request.Age,
            request.Role,
            request.CurrentStatus,
            request.ImagePath);
        if (requestError is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(requestError);
        }

        var objectType = await dbContext.ObjectTypes
            .FirstOrDefaultAsync(type =>
                type.ProjectId == projectId &&
                type.Key == request.TypeKey &&
                type.IsEnabled);

        if (objectType is null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid("Object type was not found or is disabled for this project.");
        }

        var definitionsResult = await GetValidatedAttributeDefinitions(projectId, objectType.Id, request.Attributes);
        if (definitionsResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(definitionsResult.Error);
        }

        var hierarchyResult = await GetValidatedHierarchySelections(projectId, request.HierarchySelections);
        if (hierarchyResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(hierarchyResult.Error);
        }

        var catalogSelectionsResult = await GetValidatedCatalogSelections(projectId, request.CatalogSelections);
        if (catalogSelectionsResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(catalogSelectionsResult.Error);
        }

        var ownershipResult = await GetValidatedOwnershipSelections(
            projectId,
            objectType.Key,
            request.OwnedItemIds,
            request.OwnerCharacterIds);
        if (ownershipResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(ownershipResult.Error);
        }

        var relationResult = await GetValidatedObjectRelations(
            projectId,
            objectType.Key,
            request.TerritoryPlaceIds,
            request.OwnerOrganizationIds,
            request.ParentObjectIds);
        if (relationResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(relationResult.Error);
        }

        var characterRelationshipsResult = await GetValidatedCharacterRelationships(
            projectId,
            objectType.Key,
            request.CharacterRelationships);
        if (characterRelationshipsResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(characterRelationshipsResult.Error);
        }

        var now = DateTime.UtcNow;
        var storyObject = new StoryObject
        {
            ProjectId = projectId,
            ObjectTypeId = objectType.Id,
            Name = request.Name.Trim(),
            Surname = NormalizeOptionalText(request.Surname),
            SurnameForm = objectType.Key == "organizations" ? NormalizeOptionalText(request.SurnameForm) : null,
            Description = NormalizeOptionalText(request.Description),
            Age = NormalizeOptionalText(request.Age),
            Role = NormalizeOptionalText(request.Role),
            CurrentStatus = NormalizeOptionalText(request.CurrentStatus),
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

        return ObjectServiceResult<StoryObjectDto>.Success(dto);
    }
    public async Task<ObjectServiceResult<StoryObjectDto>> UpdateObjectAsync(
        int projectId,
        int objectId,
        UpdateStoryObjectRequest request)
    {
        var requestError = RequestValidators.ValidateStoryObject(
            request.Name,
            request.Surname,
            request.SurnameForm,
            request.Description,
            request.Age,
            request.Role,
            request.CurrentStatus,
            request.ImagePath);
        if (requestError is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(requestError);
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
            return ObjectServiceResult<StoryObjectDto>.NotFound();
        }

        var definitionsResult = await GetValidatedAttributeDefinitions(projectId, storyObject.ObjectTypeId, request.Attributes);
        if (definitionsResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(definitionsResult.Error);
        }

        var hierarchyResult = await GetValidatedHierarchySelections(projectId, request.HierarchySelections);
        if (hierarchyResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(hierarchyResult.Error);
        }

        var catalogSelectionsResult = await GetValidatedCatalogSelections(projectId, request.CatalogSelections);
        if (catalogSelectionsResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(catalogSelectionsResult.Error);
        }

        var ownershipResult = await GetValidatedOwnershipSelections(
            projectId,
            storyObject.ObjectType!.Key,
            request.OwnedItemIds,
            request.OwnerCharacterIds);
        if (ownershipResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(ownershipResult.Error);
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
            return ObjectServiceResult<StoryObjectDto>.Invalid(relationResult.Error);
        }

        var characterRelationshipsResult = await GetValidatedCharacterRelationships(
            projectId,
            storyObject.ObjectType.Key,
            request.CharacterRelationships,
            storyObject.Id);
        if (characterRelationshipsResult.Error is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(characterRelationshipsResult.Error);
        }

        storyObject.Name = request.Name.Trim();
        storyObject.Surname = NormalizeOptionalText(request.Surname);
        storyObject.SurnameForm = storyObject.ObjectType!.Key == "organizations" ? NormalizeOptionalText(request.SurnameForm) : null;
        storyObject.Description = NormalizeOptionalText(request.Description);
        storyObject.Age = NormalizeOptionalText(request.Age);
        storyObject.Role = NormalizeOptionalText(request.Role);
        storyObject.CurrentStatus = NormalizeOptionalText(request.CurrentStatus);
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

        return ObjectServiceResult<StoryObjectDto>.Success(dto);
    }
    public async Task<ObjectServiceResult> DeleteObjectAsync(int projectId, int objectId)
    {
        var storyObject = await dbContext.Objects
            .FirstOrDefaultAsync(storyObject => storyObject.ProjectId == projectId && storyObject.Id == objectId);

        if (storyObject is null)
        {
            return ObjectServiceResult.NotFound();
        }

        dbContext.Objects.Remove(storyObject);
        await dbContext.SaveChangesAsync();
        await MarkRelationGraphLayoutsStale(projectId);

        return ObjectServiceResult.Success();
    }
}

