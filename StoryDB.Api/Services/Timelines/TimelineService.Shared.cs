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
    private const string DefaultTimelineName = "Основной таймлайн";
    private const string LegacyDefaultTimelineName = "РћСЃРЅРѕРІРЅРѕР№ С‚Р°Р№РјР»Р°Р№РЅ";

    private async Task<Timeline?> EnsureDefaultTimeline(int projectId)
    {
        if (!await dbContext.Projects.AnyAsync(project => project.Id == projectId))
        {
            return null;
        }

        var timeline = await FindDefaultTimeline(projectId);
        if (timeline is not null)
        {
            if (!timeline.IsDefault)
            {
                timeline.IsDefault = true;
                timeline.UpdatedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();
            }

            return timeline;
        }

        var now = DateTime.UtcNow;
        await dbContext.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "Timelines" ("CreatedAt", "IsDefault", "Mode", "Name", "ProjectId", "SortOrder", "UpdatedAt")
            VALUES ({now}, {true}, {"chapters"}, {DefaultTimelineName}, {projectId}, {10}, {now})
            ON CONFLICT ("ProjectId", "Name") DO NOTHING
            """);

        timeline = await FindDefaultTimeline(projectId);
        if (timeline is null)
        {
            throw new InvalidOperationException($"Could not create or load default timeline for project {projectId}.");
        }

        return timeline;
    }

    private async Task<Timeline?> FindDefaultTimeline(int projectId)
    {
        return await dbContext.Timelines
            .FirstOrDefaultAsync(currentTimeline =>
                currentTimeline.ProjectId == projectId &&
                (currentTimeline.IsDefault ||
                 currentTimeline.Name == DefaultTimelineName ||
                 currentTimeline.Name == LegacyDefaultTimelineName));
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
            Caption = "Обложка",
            SortOrder = sortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
        });
    }
}

