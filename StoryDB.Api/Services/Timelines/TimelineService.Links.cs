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
    public async Task<TimelineServiceResult<IReadOnlyList<TimelineEventLinkDto>>> GetEventLinksAsync(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<IReadOnlyList<TimelineEventLinkDto>>.NotFound();
        }

        var links = await dbContext.TimelineEventLinks
            .AsNoTracking()
            .Where(link => link.TimelineId == timeline.Id)
            .OrderBy(link => link.SortOrder)
            .ThenBy(link => link.Id)
            .Select(link => ToLinkDto(link))
            .ToListAsync();

        return TimelineServiceResult<IReadOnlyList<TimelineEventLinkDto>>.Success(links);
    }
    public async Task<TimelineServiceResult<TimelineEventLinkDto>> CreateEventLinkAsync(int projectId, TimelineEventLinkRequest request)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<TimelineEventLinkDto>.NotFound();
        }

        var validationError = await ValidateTimelineEventLinkRequest(timeline.Id, request);
        if (validationError is not null)
        {
            return TimelineServiceResult<TimelineEventLinkDto>.Invalid(validationError);
        }

        var sortOrder = await dbContext.TimelineEventLinks
            .Where(link => link.TimelineId == timeline.Id)
            .Select(link => (int?)link.SortOrder)
            .MaxAsync() ?? 0;
        var now = DateTime.UtcNow;
        var timelineEventLink = new TimelineEventLink
        {
            TimelineId = timeline.Id,
            SourceEventId = request.SourceEventId,
            TargetEventId = request.TargetEventId,
            LinkType = NormalizeEventLinkType(request.LinkType),
            Description = NormalizeOptionalText(request.Description),
            SortOrder = sortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.TimelineEventLinks.Add(timelineEventLink);
        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();

        return TimelineServiceResult<TimelineEventLinkDto>.Success(ToLinkDto(timelineEventLink));
    }
    public async Task<TimelineServiceResult<TimelineEventLinkDto>> UpdateEventLinkAsync(
        int projectId,
        int linkId,
        TimelineEventLinkRequest request)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<TimelineEventLinkDto>.NotFound();
        }

        var validationError = await ValidateTimelineEventLinkRequest(timeline.Id, request);
        if (validationError is not null)
        {
            return TimelineServiceResult<TimelineEventLinkDto>.Invalid(validationError);
        }

        var link = await dbContext.TimelineEventLinks.FirstOrDefaultAsync(currentLink =>
            currentLink.TimelineId == timeline.Id &&
            currentLink.Id == linkId);
        if (link is null)
        {
            return TimelineServiceResult<TimelineEventLinkDto>.NotFound();
        }

        link.SourceEventId = request.SourceEventId;
        link.TargetEventId = request.TargetEventId;
        link.LinkType = NormalizeEventLinkType(request.LinkType);
        link.Description = NormalizeOptionalText(request.Description);
        link.UpdatedAt = DateTime.UtcNow;

        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();

        return TimelineServiceResult<TimelineEventLinkDto>.Success(ToLinkDto(link));
    }
    public async Task<TimelineServiceResult> DeleteEventLinkAsync(int projectId, int linkId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult.NotFound();
        }

        var link = await dbContext.TimelineEventLinks.FirstOrDefaultAsync(currentLink =>
            currentLink.TimelineId == timeline.Id &&
            currentLink.Id == linkId);
        if (link is null)
        {
            return TimelineServiceResult.NotFound();
        }

        dbContext.TimelineEventLinks.Remove(link);
        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();

        return TimelineServiceResult.Success();
    }
    private async Task<string?> ValidateTimelineEventLinkRequest(int timelineId, TimelineEventLinkRequest request)
    {
        if (request.SourceEventId <= 0 || request.TargetEventId <= 0)
        {
            return "Timeline event link endpoints are required.";
        }

        if (request.SourceEventId == request.TargetEventId)
        {
            return "Timeline event cannot be linked to itself.";
        }

        if (!SupportedEventLinkTypes.Contains(NormalizeEventLinkType(request.LinkType)))
        {
            return "Unsupported timeline event link type.";
        }

        if (request.Description?.Trim().Length > 1000)
        {
            return "Timeline event link description is too long.";
        }

        var endpointCount = await dbContext.TimelineEvents.CountAsync(timelineEvent =>
            timelineEvent.TimelineId == timelineId &&
            (timelineEvent.Id == request.SourceEventId || timelineEvent.Id == request.TargetEventId));
        return endpointCount == 2 ? null : "One or more timeline event link endpoints were not found.";
    }
}

