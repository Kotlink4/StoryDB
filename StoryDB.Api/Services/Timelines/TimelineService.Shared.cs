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
    private async Task<Timeline?> EnsureDefaultTimeline(int projectId)
    {
        if (!await dbContext.Projects.AnyAsync(project => project.Id == projectId))
        {
            return null;
        }

        var timeline = await dbContext.Timelines
            .FirstOrDefaultAsync(currentTimeline => currentTimeline.ProjectId == projectId && currentTimeline.IsDefault);
        if (timeline is not null)
        {
            return timeline;
        }

        var now = DateTime.UtcNow;
        timeline = new Timeline
        {
            ProjectId = projectId,
            Name = "РћСЃРЅРѕРІРЅРѕР№ С‚Р°Р№РјР»Р°Р№РЅ",
            Mode = "chapters",
            IsDefault = true,
            SortOrder = 10,
            CreatedAt = now,
            UpdatedAt = now,
        };
        dbContext.Timelines.Add(timeline);
        await dbContext.SaveChangesAsync();

        return timeline;
    }

    private async Task<TimelineEventDto?> GetTimelineEventDto(int projectId, int eventId)
    {
        var timelineEvent = await dbContext.TimelineEvents
            .AsNoTracking()
            .Include(currentEvent => currentEvent.Participants)
            .Include(currentEvent => currentEvent.Changes)
            .Include(currentEvent => currentEvent.GalleryImages)
            .FirstOrDefaultAsync(currentEvent =>
                currentEvent.ProjectId == projectId &&
                currentEvent.Id == eventId);

        return timelineEvent is null ? null : ToDto(timelineEvent);
    }

    private static void AddCoverImageToEventGallery(TimelineEvent timelineEvent, DateTime now)
    {
        var imagePath = NormalizeOptionalText(timelineEvent.ImagePath);
        if (imagePath is null ||
            timelineEvent.GalleryImages.Any(image => image.ImagePath.Equals(imagePath, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        var sortOrder = timelineEvent.GalleryImages.Select(image => (int?)image.SortOrder).Max() ?? 0;
        timelineEvent.GalleryImages.Add(new TimelineEventGalleryImage
        {
            ImagePath = imagePath,
            Caption = "РћР±Р»РѕР¶РєР°",
            SortOrder = sortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
        });
    }
}

