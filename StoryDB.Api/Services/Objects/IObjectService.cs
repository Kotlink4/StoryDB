using StoryDB.Api.Contracts.Objects;

namespace StoryDB.Api.Services.Objects;

public interface IObjectService
{
    Task<IReadOnlyList<StoryObjectDto>> GetObjectsAsync(int projectId, string? typeKey);

    Task<IReadOnlyList<StoryObjectSummaryDto>> GetObjectSummariesAsync(int projectId, string? typeKey);

    Task<ObjectServiceResult<StoryObjectDto>> GetObjectAsync(int projectId, int objectId);

    Task<ObjectServiceResult<StoryObjectDto>> CreateObjectAsync(int projectId, CreateStoryObjectRequest request);

    Task<ObjectServiceResult<StoryObjectDto>> UpdateObjectAsync(int projectId, int objectId, UpdateStoryObjectRequest request);

    Task<ObjectServiceResult> DeleteObjectAsync(int projectId, int objectId);

    Task<ObjectServiceResult<IReadOnlyList<OrganizationStructureLevelDto>>> GetOrganizationStructureAsync(int projectId, int objectId);

    Task<ObjectServiceResult<StoryObjectDto>> UpdateOrganizationStructureAsync(
        int projectId,
        int objectId,
        OrganizationStructureRequest request);

    Task<ObjectServiceResult<IReadOnlyList<ObjectGalleryImageDto>>> GetGalleryImagesAsync(int projectId, int objectId);

    Task<ObjectServiceResult<StoryObjectDto>> AddGalleryImageAsync(int projectId, int objectId, ObjectGalleryImageRequest request);

    Task<ObjectServiceResult<StoryObjectDto>> UpdateGalleryImageAsync(int projectId, int objectId, int imageId, ObjectGalleryImageRequest request);

    Task<ObjectServiceResult<StoryObjectDto>> DeleteGalleryImageAsync(int projectId, int objectId, int imageId);
}

