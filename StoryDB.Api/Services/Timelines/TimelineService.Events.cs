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
    public async Task<TimelineServiceResult<IReadOnlyList<TimelineEventDto>>> GetEventsAsync(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<IReadOnlyList<TimelineEventDto>>.NotFound();
        }

        var events = await cacheSingleFlight.GetOrCreateAsync(
            global::StoryDB.Api.Services.ProjectCacheKeys.TimelineEvents(projectId),
            async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimelineReadCacheDuration;

                return await dbContext.TimelineEvents
                    .AsNoTracking()
                    .Include(timelineEvent => timelineEvent.Participants)
                    .Include(timelineEvent => timelineEvent.Changes)
                    .Include(timelineEvent => timelineEvent.GalleryImages)
                    .Where(timelineEvent => timelineEvent.ProjectId == projectId && timelineEvent.TimelineId == timeline.Id)
                    .OrderBy(timelineEvent => timelineEvent.StartValue ?? decimal.MaxValue)
                    .ThenBy(timelineEvent => timelineEvent.SortOrder)
                    .ThenBy(timelineEvent => timelineEvent.Title)
                    .Select(timelineEvent => ToDto(timelineEvent))
                    .ToListAsync();
            });

        return TimelineServiceResult<IReadOnlyList<TimelineEventDto>>.Success(events!);
    }
    public async Task<TimelineServiceResult<TimelineEventDto>> GetEventAsync(int projectId, int eventId)
    {
        var timelineEvent = await dbContext.TimelineEvents
            .AsNoTracking()
            .Include(currentEvent => currentEvent.Participants)
            .Include(currentEvent => currentEvent.Changes)
            .Include(currentEvent => currentEvent.GalleryImages)
            .FirstOrDefaultAsync(currentEvent =>
                currentEvent.ProjectId == projectId &&
                currentEvent.Id == eventId);

        if (timelineEvent is null)
        {
            return TimelineServiceResult<TimelineEventDto>.NotFound();
        }

        return TimelineServiceResult<TimelineEventDto>.Success(ToDto(timelineEvent));
    }
    public async Task<TimelineServiceResult<TimelineEventDto>> CreateEventAsync(int projectId, TimelineEventRequest request)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<TimelineEventDto>.NotFound();
        }

        var validationResult = await timelineEventValidator.ValidateEventRequest(projectId, timeline.Id, request);
        if (!validationResult.IsValid)
        {
            return TimelineServiceResult<TimelineEventDto>.Invalid(validationResult.FirstError);
        }

        var sortOrder = await dbContext.TimelineEvents
            .Where(timelineEvent => timelineEvent.ProjectId == projectId && timelineEvent.TimelineId == timeline.Id)
            .Select(timelineEvent => (int?)timelineEvent.SortOrder)
            .MaxAsync() ?? 0;
        var now = DateTime.UtcNow;
        var timelineEvent = new TimelineEvent
        {
            ProjectId = projectId,
            TimelineId = timeline.Id,
            ParentEventId = request.ParentEventId,
            Title = request.Title.Trim(),
            EventType = NormalizeEventType(request.EventType),
            Description = NormalizeOptionalText(request.Description),
            StartLabel = NormalizeOptionalText(request.StartLabel),
            EndLabel = NormalizeOptionalText(request.EndLabel),
            StartValue = request.StartValue,
            EndValue = request.EndValue,
            Category = NormalizeOptionalText(request.Category),
            Color = NormalizeOptionalText(request.Color),
            ImagePath = NormalizeOptionalText(request.ImagePath),
            SortOrder = sortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
            Participants = ToParticipants(request.Participants),
            Changes = ToChanges(request.Changes),
        };
        AddCoverImageToEventGallery(timelineEvent, now);

        dbContext.TimelineEvents.Add(timelineEvent);
        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();
        InvalidateTimelineReadCaches(projectId);

        return TimelineServiceResult<TimelineEventDto>.Success(ToDto(timelineEvent));
    }
    public async Task<TimelineServiceResult<TimelineEventDto>> UpdateEventAsync(
        int projectId,
        int eventId,
        TimelineEventRequest request)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<TimelineEventDto>.NotFound();
        }

        var validationResult = await timelineEventValidator.ValidateEventRequest(projectId, timeline.Id, request, eventId);
        if (!validationResult.IsValid)
        {
            return TimelineServiceResult<TimelineEventDto>.Invalid(validationResult.FirstError);
        }

        var timelineEvent = await dbContext.TimelineEvents
            .Include(currentEvent => currentEvent.Participants)
            .Include(currentEvent => currentEvent.Changes)
            .Include(currentEvent => currentEvent.GalleryImages)
            .FirstOrDefaultAsync(currentEvent =>
                currentEvent.ProjectId == projectId &&
                currentEvent.TimelineId == timeline.Id &&
                currentEvent.Id == eventId);
        if (timelineEvent is null)
        {
            return TimelineServiceResult<TimelineEventDto>.NotFound();
        }

        timelineEvent.ParentEventId = request.ParentEventId;
        timelineEvent.Title = request.Title.Trim();
        timelineEvent.EventType = NormalizeEventType(request.EventType);
        timelineEvent.Description = NormalizeOptionalText(request.Description);
        timelineEvent.StartLabel = NormalizeOptionalText(request.StartLabel);
        timelineEvent.EndLabel = NormalizeOptionalText(request.EndLabel);
        timelineEvent.StartValue = request.StartValue;
        timelineEvent.EndValue = request.EndValue;
        timelineEvent.Category = NormalizeOptionalText(request.Category);
        timelineEvent.Color = NormalizeOptionalText(request.Color);
        timelineEvent.ImagePath = NormalizeOptionalText(request.ImagePath);
        timelineEvent.UpdatedAt = DateTime.UtcNow;

        dbContext.TimelineParticipants.RemoveRange(timelineEvent.Participants);
        timelineEvent.Participants = ToParticipants(request.Participants);
        dbContext.TimelineChanges.RemoveRange(timelineEvent.Changes);
        timelineEvent.Changes = ToChanges(request.Changes);
        AddCoverImageToEventGallery(timelineEvent, timelineEvent.UpdatedAt);

        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();
        InvalidateTimelineReadCaches(projectId);

        return TimelineServiceResult<TimelineEventDto>.Success(ToDto(timelineEvent));
    }
    public async Task<TimelineServiceResult> DeleteEventAsync(int projectId, int eventId)
    {
        var timelineEvent = await dbContext.TimelineEvents
            .FirstOrDefaultAsync(currentEvent =>
                currentEvent.ProjectId == projectId &&
                currentEvent.Id == eventId);

        if (timelineEvent is null)
        {
            return TimelineServiceResult.NotFound();
        }

        var timelineId = timelineEvent.TimelineId;
        dbContext.TimelineEvents.Remove(timelineEvent);
        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();
        InvalidateTimelineReadCaches(projectId);

        return TimelineServiceResult.Success();
    }
}

