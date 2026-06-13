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
    public async Task<TimelineServiceResult<TimelineDto>> GetTimelineAsync(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<TimelineDto>.NotFound();
        }

        return TimelineServiceResult<TimelineDto>.Success(ToTimelineDto(timeline));
    }
    public async Task<TimelineServiceResult<TimelineDto>> UpdateTimelineAsync(int projectId, TimelineSettingsRequest request)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<TimelineDto>.NotFound();
        }

        var mode = NormalizeTimelineMode(request.Mode);
        if (!SupportedTimelineModes.Contains(mode))
        {
            return TimelineServiceResult<TimelineDto>.Invalid("Unsupported timeline mode.");
        }

        timeline.Name = NormalizeOptionalText(request.Name) ?? timeline.Name;
        timeline.Mode = mode;
        timeline.UpdatedAt = DateTime.UtcNow;
        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();

        return TimelineServiceResult<TimelineDto>.Success(ToTimelineDto(timeline));
    }
}

