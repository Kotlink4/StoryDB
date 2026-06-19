using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;

namespace StoryDB.Api.Services.Objects;

public partial class ObjectService
{
    public async Task<IReadOnlyList<StoryObjectDto>> GetObjectsAsync(
        int projectId,
        string? typeKey)
    {
        var summaries = await GetObjectSummariesAsync(projectId, typeKey);
        return summaries.Select(ToStoryObjectListDto).ToList();
    }

    public async Task<IReadOnlyList<StoryObjectSummaryDto>> GetObjectSummariesAsync(
        int projectId,
        string? typeKey)
    {
        var normalizedTypeKey = string.IsNullOrWhiteSpace(typeKey) ? null : typeKey.Trim();
        var cacheKey = ProjectCacheKeys.ObjectSummaries(projectId, normalizedTypeKey);

        return await cacheSingleFlight.GetOrCreateAsync(
            cacheKey,
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = ObjectSummariesCacheDuration;

                var query = dbContext.Objects
                    .AsNoTracking()
                    .Where(storyObject =>
                        storyObject.ProjectId == projectId &&
                        storyObject.ObjectType != null &&
                        storyObject.ObjectType.IsEnabled);

                if (normalizedTypeKey is not null)
                {
                    query = query.Where(storyObject => storyObject.ObjectType != null && storyObject.ObjectType.Key == normalizedTypeKey);
                }

                return await query
                    .OrderBy(storyObject => storyObject.Name)
                    .Select(storyObject => new StoryObjectSummaryDto(
                        storyObject.Id,
                        storyObject.Name,
                        storyObject.Surname,
                        storyObject.SurnameForm,
                        storyObject.Description,
                        storyObject.Age,
                        storyObject.Role,
                        storyObject.CurrentStatus,
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
                            .ToList()))
                    .ToListAsync();
            });
    }

    private static StoryObjectDto ToStoryObjectListDto(StoryObjectSummaryDto summary) => new(
        summary.Id,
        summary.Name,
        summary.Surname,
        summary.SurnameForm,
        summary.Description,
        summary.Age,
        summary.Role,
        summary.CurrentStatus,
        summary.ImagePath,
        summary.TypeKey,
        summary.Attributes,
        Array.Empty<ObjectHierarchySelectionDto>(),
        Array.Empty<ObjectCatalogSelectionDto>(),
        Array.Empty<ObjectReferenceDto>(),
        Array.Empty<ObjectReferenceDto>(),
        Array.Empty<ObjectReferenceDto>(),
        Array.Empty<ObjectReferenceDto>(),
        Array.Empty<ObjectReferenceDto>(),
        Array.Empty<ObjectReferenceDto>(),
        Array.Empty<ObjectReferenceDto>(),
        Array.Empty<ObjectReferenceDto>(),
        Array.Empty<ObjectGalleryImageDto>(),
        Array.Empty<CharacterRelationshipDto>(),
        Array.Empty<CharacterRelationshipDto>());

    public async Task<ObjectServiceResult<StoryObjectDto>> GetObjectAsync(int projectId, int objectId)
    {
        var storyObject = await GetCachedObjectDto(projectId, objectId);

        if (storyObject is null)
        {
            return ObjectServiceResult<StoryObjectDto>.NotFound();
        }

        return ObjectServiceResult<StoryObjectDto>.Success(storyObject);
    }

    private async Task<StoryObjectDto?> GetCachedObjectDto(int projectId, int objectId)
    {
        var cached = await cacheSingleFlight.GetOrCreateAsync(
            ProjectCacheKeys.ObjectDetail(projectId, objectId),
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = ObjectDetailCacheDuration;

                return new ObjectDetailCacheValue(await GetObjectDtoOrNull(projectId, objectId));
            });

        return cached.Value;
    }

    private async Task<StoryObjectDto> GetObjectDto(int projectId, int objectId) =>
        await GetObjectDtoOrNull(projectId, objectId) ??
        throw new InvalidOperationException("Story object was not found after a successful mutation.");

    private static StoryObjectDto ToSavedSummaryDto(
        StoryObject storyObject,
        string typeKey,
        IReadOnlyDictionary<int, AttributeDefinition> definitionsById)
    {
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


    private sealed record ObjectDetailCacheValue(StoryObjectDto? Value);
}

