using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace StoryDB.Api.Services.Timelines;
public partial class TimelineService
{
    public async Task<TimelineServiceResult<TimelineEventDto>> AddGalleryImageAsync(
        int projectId,
        int eventId,
        TimelineEventGalleryImageRequest request)
    {
        var validationError = RequestValidators.ValidateRequiredGalleryImage(request.ImagePath, request.Caption);
        if (validationError is not null)
        {
            return TimelineServiceResult<TimelineEventDto>.Invalid(validationError);
        }

        var timelineEvent = await dbContext.TimelineEvents
            .Include(currentEvent => currentEvent.GalleryImages)
            .FirstOrDefaultAsync(currentEvent =>
                currentEvent.ProjectId == projectId &&
                currentEvent.Id == eventId);
        if (timelineEvent is null)
        {
            return TimelineServiceResult<TimelineEventDto>.NotFound();
        }

        var imagePath = request.ImagePath.Trim();
        if (!timelineEvent.GalleryImages.Any(image => image.ImagePath.Equals(imagePath, StringComparison.OrdinalIgnoreCase)))
        {
            var sortOrder = timelineEvent.GalleryImages.Select(image => (int?)image.SortOrder).Max() ?? 0;
            var now = DateTime.UtcNow;

            timelineEvent.GalleryImages.Add(new TimelineEventGalleryImage
            {
                ImagePath = imagePath,
                Caption = NormalizeOptionalText(request.Caption),
                SortOrder = sortOrder + 10,
                CreatedAt = now,
                UpdatedAt = now,
            });

            await dbContext.SaveChangesAsync();
        }

        return TimelineServiceResult<TimelineEventDto>.Success((await GetTimelineEventDto(projectId, eventId))!);
    }
    public async Task<TimelineServiceResult<TimelineEventDto>> UpdateGalleryImageAsync(
        int projectId,
        int eventId,
        int imageId,
        TimelineEventGalleryImageRequest request)
    {
        var validationError = RequestValidators.ValidateRequiredGalleryImage(request.ImagePath, request.Caption);
        if (validationError is not null)
        {
            return TimelineServiceResult<TimelineEventDto>.Invalid(validationError);
        }

        var image = await dbContext.TimelineEventGalleryImages
            .Include(currentImage => currentImage.TimelineEvent)
            .FirstOrDefaultAsync(currentImage =>
                currentImage.Id == imageId &&
                currentImage.TimelineEventId == eventId &&
                currentImage.TimelineEvent != null &&
                currentImage.TimelineEvent.ProjectId == projectId);
        if (image is null)
        {
            return TimelineServiceResult<TimelineEventDto>.NotFound();
        }

        image.ImagePath = request.ImagePath.Trim();
        image.Caption = NormalizeOptionalText(request.Caption);
        image.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        return TimelineServiceResult<TimelineEventDto>.Success((await GetTimelineEventDto(projectId, eventId))!);
    }
    public async Task<TimelineServiceResult<TimelineEventDto>> DeleteGalleryImageAsync(
        int projectId,
        int eventId,
        int imageId)
    {
        var image = await dbContext.TimelineEventGalleryImages
            .Include(currentImage => currentImage.TimelineEvent)
            .FirstOrDefaultAsync(currentImage =>
                currentImage.Id == imageId &&
                currentImage.TimelineEventId == eventId &&
                currentImage.TimelineEvent != null &&
                currentImage.TimelineEvent.ProjectId == projectId);
        if (image is null)
        {
            return TimelineServiceResult<TimelineEventDto>.NotFound();
        }

        dbContext.TimelineEventGalleryImages.Remove(image);
        await dbContext.SaveChangesAsync();

        return TimelineServiceResult<TimelineEventDto>.Success((await GetTimelineEventDto(projectId, eventId))!);
    }
}

