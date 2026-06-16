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
    public async Task<TimelineServiceResult<TimelineLayoutDto?>> GetDefaultLayoutAsync(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<TimelineLayoutDto?>.NotFound();
        }

        var layout = await ReadTimelineLayoutState(projectId, timeline.Id);
        if (layout is null)
        {
            return TimelineServiceResult<TimelineLayoutDto?>.Success(null);
        }

        var isStale = layout.IsStale || !layout.AlgorithmVersion.Equals(LayoutAlgorithmVersion, StringComparison.Ordinal);
        return TimelineServiceResult<TimelineLayoutDto?>.Success(layout with { IsStale = isStale });
    }
    public async Task<TimelineServiceResult<TimelineLayoutRulesConfig>> GetLayoutRulesAsync(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<TimelineLayoutRulesConfig>.NotFound();
        }

        var rules = await EnsureTimelineLayoutRules(projectId);
        return TimelineServiceResult<TimelineLayoutRulesConfig>.Success(rules);
    }
    public async Task<TimelineServiceResult<TimelineLayoutDto>> GenerateDefaultLayoutAsync(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return TimelineServiceResult<TimelineLayoutDto>.NotFound();
        }

        var events = await dbContext.TimelineEvents
            .Where(timelineEvent => timelineEvent.ProjectId == projectId && timelineEvent.TimelineId == timeline.Id)
            .OrderBy(timelineEvent => timelineEvent.StartValue ?? decimal.MaxValue)
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id)
            .ToListAsync();

        var links = await dbContext.TimelineEventLinks
            .AsNoTracking()
            .Where(link => link.TimelineId == timeline.Id)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var rules = await EnsureTimelineLayoutRules(projectId);
        var previousLayout = await ReadTimelineLayoutState(projectId, timeline.Id);
        var pinnedItems = ToPinnedLayoutItems(previousLayout?.Items ?? []);
        var generatedItems = GenerateLayoutItems(events, links, pinnedItems, now, rules);
        var layout = ToLayoutDto(timeline.Id, now, [.. pinnedItems, .. generatedItems]);

        await WriteTimelineLayoutState(projectId, layout);

        return TimelineServiceResult<TimelineLayoutDto>.Success(layout);
    }
    private async Task MarkTimelineLayoutStateStale(int projectId)
    {
        var path = GetTimelineLayoutStatePath(projectId);
        if (!System.IO.File.Exists(path))
        {
            return;
        }

        var layout = await ReadTimelineLayoutState(projectId);
        if (layout is null || layout.IsStale)
        {
            return;
        }

        await WriteTimelineLayoutState(projectId, layout with { IsStale = true });
    }

    private string GetTimelineConfigDirectory(int projectId) =>
        Path.Combine(environment.ContentRootPath, "uploads", "projects", projectId.ToString(), "timeline");

    private string GetTimelineLayoutRulesPath(int projectId) =>
        Path.Combine(GetTimelineConfigDirectory(projectId), LayoutRulesFileName);

    private string GetTimelineLayoutStatePath(int projectId) =>
        Path.Combine(GetTimelineConfigDirectory(projectId), LayoutStateFileName);

    private async Task<TimelineLayoutRulesConfig> EnsureTimelineLayoutRules(int projectId)
    {
        return await cacheSingleFlight.GetOrCreateAsync(
            global::StoryDB.Api.Services.ProjectCacheKeys.TimelineLayoutRules(projectId),
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = TimelineReadCacheDuration;
                return await ReadOrCreateTimelineLayoutRules(projectId);
            });
    }

    private async Task<TimelineLayoutRulesConfig> ReadOrCreateTimelineLayoutRules(int projectId)
    {
        var path = GetTimelineLayoutRulesPath(projectId);
        if (System.IO.File.Exists(path))
        {
            await using var readStream = System.IO.File.OpenRead(path);
            var existingRules = await JsonSerializer.DeserializeAsync<TimelineLayoutRulesConfig>(
                readStream,
                TimelineLayoutJsonOptions);
            if (existingRules is not null && existingRules.IsCurrent(projectId, LayoutAlgorithmVersion))
            {
                return existingRules;
            }
        }

        var rules = TimelineLayoutRulesConfig.Default(projectId, LayoutAlgorithmVersion);
        Directory.CreateDirectory(GetTimelineConfigDirectory(projectId));
        await using var writeStream = System.IO.File.Create(path);
        await JsonSerializer.SerializeAsync(writeStream, rules, TimelineLayoutJsonOptions);
        return rules;
    }

    private async Task<TimelineLayoutDto?> ReadTimelineLayoutState(int projectId, int? timelineId = null)
    {
        var cached = await cacheSingleFlight.GetOrCreateAsync(
            global::StoryDB.Api.Services.ProjectCacheKeys.TimelineLayoutState(projectId),
            async cacheEntry =>
            {
                cacheEntry.AbsoluteExpirationRelativeToNow = TimelineReadCacheDuration;
                return new TimelineLayoutStateCacheValue(await ReadTimelineLayoutStateFromDisk(projectId));
            });

        var layout = cached.Value;
        return layout is null || (timelineId is not null && layout.TimelineId != timelineId.Value)
            ? null
            : layout;
    }

    private async Task<TimelineLayoutDto?> ReadTimelineLayoutStateFromDisk(int projectId)
    {
        var path = GetTimelineLayoutStatePath(projectId);
        if (!System.IO.File.Exists(path))
        {
            return null;
        }

        await using var stream = System.IO.File.OpenRead(path);
        var state = await JsonSerializer.DeserializeAsync<TimelineLayoutStateConfig>(
            stream,
            TimelineLayoutJsonOptions);
        if (state is null)
        {
            return null;
        }

        return new TimelineLayoutDto(
            state.Id,
            state.TimelineId,
            state.AlgorithmVersion,
            state.IsStale,
            state.GeneratedAt,
            state.Items);
    }

    private async Task WriteTimelineLayoutState(int projectId, TimelineLayoutDto layout)
    {
        Directory.CreateDirectory(GetTimelineConfigDirectory(projectId));
        var state = new TimelineLayoutStateConfig(
            LayoutConfigSchemaVersion,
            projectId,
            layout.Id,
            layout.TimelineId,
            layout.AlgorithmVersion,
            layout.IsStale,
            layout.GeneratedAt,
            layout.Items);

        await using var stream = System.IO.File.Create(GetTimelineLayoutStatePath(projectId));
        await JsonSerializer.SerializeAsync(stream, state, TimelineLayoutJsonOptions);
        cacheSingleFlight.Remove(global::StoryDB.Api.Services.ProjectCacheKeys.TimelineLayoutState(projectId));
    }

    private sealed record TimelineLayoutStateCacheValue(TimelineLayoutDto? Value);
}

