using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Objects;

public partial class ObjectService
{
    public async Task<ObjectServiceResult<IReadOnlyList<ObjectGalleryImageDto>>> GetGalleryImagesAsync(
        int projectId,
        int objectId)
    {
        if (!await ObjectExists(projectId, objectId))
        {
            return ObjectServiceResult<IReadOnlyList<ObjectGalleryImageDto>>.NotFound();
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

        return ObjectServiceResult<IReadOnlyList<ObjectGalleryImageDto>>.Success(images);
    }

    public async Task<ObjectServiceResult<StoryObjectDto>> AddGalleryImageAsync(
        int projectId,
        int objectId,
        ObjectGalleryImageRequest request)
    {
        var validationError = RequestValidators.ValidateRequiredGalleryImage(request.ImagePath, request.Caption);
        if (validationError is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(validationError);
        }

        if (!await ObjectExists(projectId, objectId))
        {
            return ObjectServiceResult<StoryObjectDto>.NotFound();
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
        InvalidateObjectDetailCache(projectId, objectId);

        return ObjectServiceResult<StoryObjectDto>.Success(await GetObjectDto(projectId, objectId));
    }

    public async Task<ObjectServiceResult<StoryObjectDto>> UpdateGalleryImageAsync(
        int projectId,
        int objectId,
        int imageId,
        ObjectGalleryImageRequest request)
    {
        var validationError = RequestValidators.ValidateRequiredGalleryImage(request.ImagePath, request.Caption);
        if (validationError is not null)
        {
            return ObjectServiceResult<StoryObjectDto>.Invalid(validationError);
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
            return ObjectServiceResult<StoryObjectDto>.NotFound();
        }

        image.ImagePath = request.ImagePath.Trim();
        image.Caption = NormalizeOptionalText(request.Caption);
        image.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
        InvalidateObjectDetailCache(projectId, objectId);

        return ObjectServiceResult<StoryObjectDto>.Success(await GetObjectDto(projectId, objectId));
    }

    public async Task<ObjectServiceResult<StoryObjectDto>> DeleteGalleryImageAsync(
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
            return ObjectServiceResult<StoryObjectDto>.NotFound();
        }

        dbContext.ObjectGalleryImages.Remove(image);
        await dbContext.SaveChangesAsync();
        InvalidateObjectDetailCache(projectId, objectId);

        return ObjectServiceResult<StoryObjectDto>.Success(await GetObjectDto(projectId, objectId));
    }
}
