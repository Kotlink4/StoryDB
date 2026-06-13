using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/timeline/events")]
public class TimelineController(
    StoryDbContext dbContext,
    IWebHostEnvironment environment,
    TimelineEventValidator timelineEventValidator) : ControllerBase
{
    private const string LayoutAlgorithmVersion = "timeline-layout-v30";
    private const int LayoutConfigSchemaVersion = 1;
    private const string LayoutRulesFileName = "timeline-layout-rules.json";
    private const string LayoutStateFileName = "timeline-layout.json";
    private const decimal TimelineAxisY = 640;
    private const decimal TimelineDurationTitleHeight = 34;
    private const decimal TimelineDurationPointBandHeight = 30;
    private const decimal TimelineDurationHeight = TimelineDurationTitleHeight + TimelineDurationPointBandHeight;
    private const decimal TimelineDurationGap = 18;
    private const decimal TimelineLaneStep = 96;
    private const decimal TimelinePointSize = 22;
    private const decimal TimelinePointLaneStep = 48;
    private const decimal TimelinePointAxisGap = 28;

    private static readonly HashSet<string> SupportedTimelineModes = new(StringComparer.OrdinalIgnoreCase)
    {
        "chapters",
        "freeform",
        "dated",
    };

    private static readonly HashSet<string> SupportedEventLinkTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "precedes",
        "causes",
        "simultaneous",
        "partOf",
        "related",
    };

    private static readonly JsonSerializerOptions TimelineLayoutJsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    [HttpGet("~/api/projects/{projectId:int}/timeline")]
    public async Task<ActionResult<TimelineDto>> GetTimeline(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        return Ok(ToTimelineDto(timeline));
    }

    [HttpPut("~/api/projects/{projectId:int}/timeline")]
    public async Task<ActionResult<TimelineDto>> UpdateTimeline(int projectId, TimelineSettingsRequest request)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        var mode = NormalizeTimelineMode(request.Mode);
        if (!SupportedTimelineModes.Contains(mode))
        {
            return BadRequest("Unsupported timeline mode.");
        }

        timeline.Name = NormalizeOptionalText(request.Name) ?? timeline.Name;
        timeline.Mode = mode;
        timeline.UpdatedAt = DateTime.UtcNow;
        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();

        return Ok(ToTimelineDto(timeline));
    }

    [HttpGet("~/api/projects/{projectId:int}/timeline/layout")]
    public async Task<ActionResult<TimelineLayoutDto?>> GetDefaultLayout(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        var layout = await ReadTimelineLayoutState(projectId, timeline.Id);
        if (layout is null)
        {
            return Ok(null);
        }

        var isStale = layout.IsStale || !layout.AlgorithmVersion.Equals(LayoutAlgorithmVersion, StringComparison.Ordinal);
        return Ok(layout with { IsStale = isStale });
    }

    [HttpGet("~/api/projects/{projectId:int}/timeline/layout/rules")]
    public async Task<ActionResult<TimelineLayoutRulesConfig>> GetLayoutRules(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        var rules = await EnsureTimelineLayoutRules(projectId);
        return Ok(rules);
    }

    [HttpPost("~/api/projects/{projectId:int}/timeline/layout/generate")]
    public async Task<ActionResult<TimelineLayoutDto>> GenerateDefaultLayout(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
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

        return Ok(layout);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TimelineEventDto>>> GetEvents(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        var events = await dbContext.TimelineEvents
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

        return Ok(events);
    }

    [HttpGet("{eventId:int}")]
    public async Task<ActionResult<TimelineEventDto>> GetEvent(int projectId, int eventId)
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
            return NotFound();
        }

        return Ok(ToDto(timelineEvent));
    }

    [HttpPost]
    public async Task<ActionResult<TimelineEventDto>> CreateEvent(int projectId, TimelineEventRequest request)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        var validationResult = await timelineEventValidator.ValidateEventRequest(projectId, timeline.Id, request);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.FirstError);
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

        return CreatedAtAction(nameof(GetEvent), new { projectId, eventId = timelineEvent.Id }, ToDto(timelineEvent));
    }

    [HttpPut("{eventId:int}")]
    public async Task<ActionResult<TimelineEventDto>> UpdateEvent(
        int projectId,
        int eventId,
        TimelineEventRequest request)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        var validationResult = await timelineEventValidator.ValidateEventRequest(projectId, timeline.Id, request, eventId);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.FirstError);
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
            return NotFound();
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

        return Ok(ToDto(timelineEvent));
    }

    [HttpDelete("{eventId:int}")]
    public async Task<IActionResult> DeleteEvent(int projectId, int eventId)
    {
        var timelineEvent = await dbContext.TimelineEvents
            .FirstOrDefaultAsync(currentEvent =>
                currentEvent.ProjectId == projectId &&
                currentEvent.Id == eventId);

        if (timelineEvent is null)
        {
            return NotFound();
        }

        var timelineId = timelineEvent.TimelineId;
        dbContext.TimelineEvents.Remove(timelineEvent);
        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{eventId:int}/gallery")]
    public async Task<ActionResult<TimelineEventDto>> AddGalleryImage(
        int projectId,
        int eventId,
        TimelineEventGalleryImageRequest request)
    {
        var validationError = RequestValidators.ValidateRequiredGalleryImage(request.ImagePath, request.Caption);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var timelineEvent = await dbContext.TimelineEvents
            .Include(currentEvent => currentEvent.GalleryImages)
            .FirstOrDefaultAsync(currentEvent =>
                currentEvent.ProjectId == projectId &&
                currentEvent.Id == eventId);
        if (timelineEvent is null)
        {
            return NotFound();
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

        return Ok(await GetTimelineEventDto(projectId, eventId));
    }

    [HttpPut("{eventId:int}/gallery/{imageId:int}")]
    public async Task<ActionResult<TimelineEventDto>> UpdateGalleryImage(
        int projectId,
        int eventId,
        int imageId,
        TimelineEventGalleryImageRequest request)
    {
        var validationError = RequestValidators.ValidateRequiredGalleryImage(request.ImagePath, request.Caption);
        if (validationError is not null)
        {
            return BadRequest(validationError);
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
            return NotFound();
        }

        image.ImagePath = request.ImagePath.Trim();
        image.Caption = NormalizeOptionalText(request.Caption);
        image.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        return Ok(await GetTimelineEventDto(projectId, eventId));
    }

    [HttpDelete("{eventId:int}/gallery/{imageId:int}")]
    public async Task<ActionResult<TimelineEventDto>> DeleteGalleryImage(
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
            return NotFound();
        }

        dbContext.TimelineEventGalleryImages.Remove(image);
        await dbContext.SaveChangesAsync();

        return Ok(await GetTimelineEventDto(projectId, eventId));
    }

    [HttpGet("~/api/projects/{projectId:int}/timeline/links")]
    public async Task<ActionResult<IReadOnlyList<TimelineEventLinkDto>>> GetEventLinks(int projectId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        var links = await dbContext.TimelineEventLinks
            .AsNoTracking()
            .Where(link => link.TimelineId == timeline.Id)
            .OrderBy(link => link.SortOrder)
            .ThenBy(link => link.Id)
            .Select(link => ToLinkDto(link))
            .ToListAsync();

        return Ok(links);
    }

    [HttpPost("~/api/projects/{projectId:int}/timeline/links")]
    public async Task<ActionResult<TimelineEventLinkDto>> CreateEventLink(int projectId, TimelineEventLinkRequest request)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        var validationError = await ValidateTimelineEventLinkRequest(timeline.Id, request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
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

        return Ok(ToLinkDto(timelineEventLink));
    }

    [HttpPut("~/api/projects/{projectId:int}/timeline/links/{linkId:int}")]
    public async Task<ActionResult<TimelineEventLinkDto>> UpdateEventLink(
        int projectId,
        int linkId,
        TimelineEventLinkRequest request)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        var validationError = await ValidateTimelineEventLinkRequest(timeline.Id, request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var link = await dbContext.TimelineEventLinks.FirstOrDefaultAsync(currentLink =>
            currentLink.TimelineId == timeline.Id &&
            currentLink.Id == linkId);
        if (link is null)
        {
            return NotFound();
        }

        link.SourceEventId = request.SourceEventId;
        link.TargetEventId = request.TargetEventId;
        link.LinkType = NormalizeEventLinkType(request.LinkType);
        link.Description = NormalizeOptionalText(request.Description);
        link.UpdatedAt = DateTime.UtcNow;

        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();

        return Ok(ToLinkDto(link));
    }

    [HttpDelete("~/api/projects/{projectId:int}/timeline/links/{linkId:int}")]
    public async Task<IActionResult> DeleteEventLink(int projectId, int linkId)
    {
        var timeline = await EnsureDefaultTimeline(projectId);
        if (timeline is null)
        {
            return NotFound();
        }

        var link = await dbContext.TimelineEventLinks.FirstOrDefaultAsync(currentLink =>
            currentLink.TimelineId == timeline.Id &&
            currentLink.Id == linkId);
        if (link is null)
        {
            return NotFound();
        }

        dbContext.TimelineEventLinks.Remove(link);
        await MarkTimelineLayoutStateStale(projectId);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

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
            Name = "Основной таймлайн",
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
            Caption = "Обложка",
            SortOrder = sortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
        });
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
        var path = GetTimelineLayoutStatePath(projectId);
        if (!System.IO.File.Exists(path))
        {
            return null;
        }

        await using var stream = System.IO.File.OpenRead(path);
        var state = await JsonSerializer.DeserializeAsync<TimelineLayoutStateConfig>(
            stream,
            TimelineLayoutJsonOptions);
        if (state is null || (timelineId is not null && state.TimelineId != timelineId.Value))
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
    }

    private static List<TimelineLayoutItem> GenerateLayoutItems(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyList<TimelineLayoutItem> pinnedItems,
        DateTime now,
        TimelineLayoutRulesConfig rules)
    {
        var generatedItems = new List<TimelineLayoutItem>();
        var eventItems = new Dictionary<int, TimelineLayoutItem>();
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var eventIndexes = events.Select((timelineEvent, index) => new { timelineEvent.Id, Index = index })
            .ToDictionary(item => item.Id, item => item.Index);
        var parentEventIds = BuildParentEventMap(events, links);
        var minValue = events.Select(timelineEvent => timelineEvent.StartValue).OfType<decimal>().DefaultIfEmpty(0).Min();
        var maxValue = events
            .Select(timelineEvent => timelineEvent.EndValue ?? timelineEvent.StartValue)
            .OfType<decimal>()
            .DefaultIfEmpty(Math.Max(minValue + 1, 1))
            .Max();
        if (maxValue <= minValue)
        {
            maxValue = minValue + Math.Max(events.Count, 1);
        }

        foreach (var timelineEvent in events
            .Select((timelineEvent, index) => new { Event = timelineEvent, Index = index })
            .OrderBy(item => ResolveLayer(item.Event.EventType))
            .ThenBy(item => GetEventStartValue(item.Event, item.Index))
            .ThenBy(item => item.Event.SortOrder)
            .ThenBy(item => item.Event.Id))
        {
            if (!timelineEvent.Event.EventType.Equals("era", StringComparison.OrdinalIgnoreCase) &&
                !timelineEvent.Event.EventType.Equals("chapter", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            AddTimelineLayoutItem(
                timelineEvent.Event,
                timelineEvent.Index,
                timelineEvent.Event.EventType.Equals("era", StringComparison.OrdinalIgnoreCase) ? -2 : -1,
                eventsById,
                parentEventIds,
                eventItems,
                generatedItems,
                minValue,
                maxValue,
                now,
                rules);
        }

        var occupiedSegments = new List<TimelineLayoutLaneSegment>();
        var protectedSegments = new List<TimelineLayoutLaneSegment>();
        var linkedComponents = BuildLinkedTimelineComponents(events, links, parentEventIds);
        var linkedEventIds = linkedComponents
            .SelectMany(component => component.EventIds)
            .ToHashSet();

        foreach (var component in linkedComponents.OrderBy(component => component.StartValue).ThenBy(component => component.FirstSortOrder))
        {
            var laneOffsets = ResolveLinkedComponentLaneOffsets(component.EventIds, links, parentEventIds, eventsById);
            var baseLane = ResolveLinkedComponentBaseLane(
                component.EventIds,
                laneOffsets,
                eventsById,
                eventIndexes,
                parentEventIds,
                occupiedSegments,
                protectedSegments,
                minValue,
                maxValue,
                rules);

            foreach (var timelineEvent in component.EventIds
                .Select(eventId => eventsById[eventId])
                .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
                .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
                .ThenBy(timelineEvent => timelineEvent.SortOrder)
                .ThenBy(timelineEvent => timelineEvent.Id))
            {
                var lane = baseLane + laneOffsets.GetValueOrDefault(timelineEvent.Id);
                AddTimelineLayoutItem(timelineEvent, eventIndexes[timelineEvent.Id], lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
            }

            foreach (var timelineEvent in component.EventIds
                .Select(eventId => eventsById[eventId])
                .Where(timelineEvent => timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
                .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
                .ThenBy(timelineEvent => timelineEvent.SortOrder)
                .ThenBy(timelineEvent => timelineEvent.Id))
            {
                var parentEventId = parentEventIds.GetValueOrDefault(timelineEvent.Id);
                var lane = parentEventId is not null && eventItems.TryGetValue(parentEventId.Value, out var parentItem)
                    ? parentItem.Lane
                    : baseLane + laneOffsets.GetValueOrDefault(timelineEvent.Id);
                AddTimelineLayoutItem(timelineEvent, eventIndexes[timelineEvent.Id], lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
            }

            foreach (var durationEventId in component.EventIds
                .Where(eventId => eventsById[eventId].EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)))
            {
                if (!eventItems.TryGetValue(durationEventId, out var durationItem))
                {
                    continue;
                }

                foreach (var childEvent in events
                    .Where(childEvent =>
                        childEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                        parentEventIds.GetValueOrDefault(childEvent.Id) == durationEventId &&
                        !eventItems.ContainsKey(childEvent.Id))
                    .OrderBy(childEvent => GetEventStartValue(childEvent, eventIndexes[childEvent.Id]))
                    .ThenBy(childEvent => childEvent.SortOrder)
                    .ThenBy(childEvent => childEvent.Id))
                {
                    AddTimelineLayoutItem(childEvent, eventIndexes[childEvent.Id], durationItem.Lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
                }
            }

            AddOccupiedSegments(component.EventIds, eventsById, eventIndexes, parentEventIds, eventItems, occupiedSegments, minValue, maxValue, rules);
            protectedSegments = BuildTimelineProtectedLinkSegments(events, links, parentEventIds, eventItems, rules);
        }

        foreach (var timelineEvent in events
            .Where(timelineEvent =>
                timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) &&
                !eventItems.ContainsKey(timelineEvent.Id))
            .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id))
        {
            var lane = ResolveFirstFreeTimelineLane(timelineEvent, eventIndexes[timelineEvent.Id], occupiedSegments, protectedSegments, minValue, maxValue, rules, 0);
            AddTimelineLayoutItem(timelineEvent, eventIndexes[timelineEvent.Id], lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
            AddOccupiedSegments([timelineEvent.Id], eventsById, eventIndexes, parentEventIds, eventItems, occupiedSegments, minValue, maxValue, rules);

            foreach (var childEvent in events
                .Where(childEvent =>
                    childEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                    parentEventIds.GetValueOrDefault(childEvent.Id) == timelineEvent.Id &&
                    !eventItems.ContainsKey(childEvent.Id))
                .OrderBy(childEvent => GetEventStartValue(childEvent, eventIndexes[childEvent.Id]))
                .ThenBy(childEvent => childEvent.SortOrder)
                .ThenBy(childEvent => childEvent.Id))
            {
                AddTimelineLayoutItem(childEvent, eventIndexes[childEvent.Id], lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
            }
        }

        foreach (var timelineEvent in events
            .Where(timelineEvent =>
                timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                parentEventIds.GetValueOrDefault(timelineEvent.Id) is null &&
                !eventItems.ContainsKey(timelineEvent.Id))
            .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id))
        {
            var lane = ResolveFirstFreeTimelineLane(timelineEvent, eventIndexes[timelineEvent.Id], occupiedSegments, protectedSegments, minValue, maxValue, rules, 0);
            AddTimelineLayoutItem(timelineEvent, eventIndexes[timelineEvent.Id], lane, eventsById, parentEventIds, eventItems, generatedItems, minValue, maxValue, now, rules);
            AddOccupiedSegments([timelineEvent.Id], eventsById, eventIndexes, parentEventIds, eventItems, occupiedSegments, minValue, maxValue, rules);
        }

        MoveIndependentEventsAwayFromLinkSegments(
            events,
            links,
            parentEventIds,
            eventItems,
            linkedEventIds,
            minValue,
            maxValue,
            rules);

        return generatedItems;
    }

    private sealed record TimelineLinkedComponent(HashSet<int> EventIds, decimal StartValue, int FirstSortOrder);

    private readonly record struct TimelineLayoutLaneSegment(int Lane, decimal StartX, decimal EndX, int EventId);

    private readonly record struct TimelineLayoutAnchor(decimal X, int Lane);

    private static List<TimelineLinkedComponent> BuildLinkedTimelineComponents(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var layoutEventIds = events
            .Where(timelineEvent =>
                timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) ||
                timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .Select(timelineEvent => timelineEvent.Id)
            .ToHashSet();
        var adjacency = layoutEventIds.ToDictionary(eventId => eventId, _ => new HashSet<int>());

        foreach (var link in links.Where(link => !link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase)))
        {
            if (!layoutEventIds.Contains(link.SourceEventId) || !layoutEventIds.Contains(link.TargetEventId))
            {
                continue;
            }

            adjacency[link.SourceEventId].Add(link.TargetEventId);
            adjacency[link.TargetEventId].Add(link.SourceEventId);

            foreach (var eventId in new[] { link.SourceEventId, link.TargetEventId })
            {
                var parentEventId = parentEventIds.GetValueOrDefault(eventId);
                if (parentEventId is null || !layoutEventIds.Contains(parentEventId.Value))
                {
                    continue;
                }

                adjacency[eventId].Add(parentEventId.Value);
                adjacency[parentEventId.Value].Add(eventId);
            }
        }

        var visited = new HashSet<int>();
        var components = new List<TimelineLinkedComponent>();
        var eventIndexes = events.Select((timelineEvent, index) => new { timelineEvent.Id, Index = index })
            .ToDictionary(item => item.Id, item => item.Index);

        foreach (var eventId in layoutEventIds.OrderBy(eventId => GetEventStartValue(eventsById[eventId], eventIndexes[eventId])))
        {
            if (visited.Contains(eventId) || adjacency[eventId].Count == 0)
            {
                continue;
            }

            var stack = new Stack<int>();
            var componentIds = new HashSet<int>();
            stack.Push(eventId);

            while (stack.Count > 0)
            {
                var currentId = stack.Pop();
                if (!visited.Add(currentId))
                {
                    continue;
                }

                componentIds.Add(currentId);
                foreach (var nextId in adjacency[currentId])
                {
                    if (!visited.Contains(nextId))
                    {
                        stack.Push(nextId);
                    }
                }
            }

            var startValue = componentIds
                .Select(componentEventId => GetEventStartValue(eventsById[componentEventId], eventIndexes[componentEventId]))
                .DefaultIfEmpty(0)
                .Min();
            var firstSortOrder = componentIds
                .Select(componentEventId => eventsById[componentEventId].SortOrder)
                .DefaultIfEmpty(0)
                .Min();
            components.Add(new TimelineLinkedComponent(componentIds, startValue, firstSortOrder));
        }

        return components;
    }

    private static Dictionary<int, int> ResolveLinkedComponentLaneOffsets(
        IReadOnlySet<int> eventIds,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineEvent> eventsById)
    {
        var offsets = eventIds.ToDictionary(eventId => eventId, _ => 0);
        var maxPassCount = Math.Max(1, eventIds.Count * 4 + links.Count);

        for (var pass = 0; pass < maxPassCount; pass++)
        {
            var changed = false;

            foreach (var item in parentEventIds.Where(item => item.Value is not null && eventIds.Contains(item.Key) && eventIds.Contains(item.Value.Value)))
            {
                var sharedOffset = Math.Max(offsets[item.Key], offsets[item.Value!.Value]);
                if (offsets[item.Key] != sharedOffset)
                {
                    offsets[item.Key] = sharedOffset;
                    changed = true;
                }

                if (offsets[item.Value.Value] != sharedOffset)
                {
                    offsets[item.Value.Value] = sharedOffset;
                    changed = true;
                }
            }

            foreach (var link in links.Where(link => eventIds.Contains(link.SourceEventId) && eventIds.Contains(link.TargetEventId)))
            {
                if (link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (link.LinkType.Equals("simultaneous", StringComparison.OrdinalIgnoreCase))
                {
                    if (!eventsById.TryGetValue(link.SourceEventId, out var sourceEvent) ||
                        !eventsById.TryGetValue(link.TargetEventId, out var targetEvent))
                    {
                        continue;
                    }

                    var isPointDurationLink =
                        (sourceEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                         targetEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)) ||
                        (sourceEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) &&
                         targetEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase));
                    if (isPointDurationLink)
                    {
                        continue;
                    }

                    var sourceParentId = parentEventIds.GetValueOrDefault(link.SourceEventId);
                    var targetParentId = parentEventIds.GetValueOrDefault(link.TargetEventId);

                    if (sourceParentId is not null && targetParentId is null)
                    {
                        var targetOffset = offsets[link.SourceEventId] + 1;
                        if (offsets[link.TargetEventId] < targetOffset)
                        {
                            offsets[link.TargetEventId] = targetOffset;
                            changed = true;
                        }

                        continue;
                    }

                    if (targetParentId is not null && sourceParentId is null)
                    {
                        var sourceOffset = offsets[link.TargetEventId] + 1;
                        if (offsets[link.SourceEventId] < sourceOffset)
                        {
                            offsets[link.SourceEventId] = sourceOffset;
                            changed = true;
                        }

                        continue;
                    }

                    var defaultTargetOffset = offsets[link.SourceEventId] + 1;
                    if (offsets[link.TargetEventId] < defaultTargetOffset)
                    {
                        offsets[link.TargetEventId] = defaultTargetOffset;
                        changed = true;
                    }

                    continue;
                }

                var sharedOffset = Math.Max(offsets[link.SourceEventId], offsets[link.TargetEventId]);
                if (offsets[link.SourceEventId] != sharedOffset)
                {
                    offsets[link.SourceEventId] = sharedOffset;
                    changed = true;
                }

                if (offsets[link.TargetEventId] != sharedOffset)
                {
                    offsets[link.TargetEventId] = sharedOffset;
                    changed = true;
                }
            }

            if (!changed)
            {
                break;
            }
        }

        var minOffset = offsets.Values.DefaultIfEmpty(0).Min();
        foreach (var eventId in offsets.Keys.ToList())
        {
            offsets[eventId] -= minOffset;
        }

        return offsets;
    }

    private static int ResolveLinkedComponentBaseLane(
        IReadOnlySet<int> eventIds,
        IReadOnlyDictionary<int, int> laneOffsets,
        IReadOnlyDictionary<int, TimelineEvent> eventsById,
        IReadOnlyDictionary<int, int> eventIndexes,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyList<TimelineLayoutLaneSegment> occupiedSegments,
        IReadOnlyList<TimelineLayoutLaneSegment> protectedSegments,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        for (var baseLane = 0; baseLane < 48; baseLane++)
        {
            var hasConflict = eventIds.Any(eventId =>
            {
                var timelineEvent = eventsById[eventId];
                if (timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                    parentEventIds.GetValueOrDefault(eventId) is not null)
                {
                    return false;
                }

                var lane = baseLane + laneOffsets.GetValueOrDefault(eventId);
                return TimelineEventHasLaneConflict(
                    timelineEvent,
                    eventIndexes[eventId],
                    lane,
                    occupiedSegments,
                    protectedSegments,
                    minValue,
                    maxValue,
                    rules,
                    eventId);
            });

            if (!hasConflict)
            {
                return baseLane;
            }
        }

        return 48;
    }

    private static void AddTimelineLayoutItem(
        TimelineEvent timelineEvent,
        int index,
        int lane,
        IReadOnlyDictionary<int, TimelineEvent> eventsById,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        List<TimelineLayoutItem> generatedItems,
        decimal minValue,
        decimal maxValue,
        DateTime now,
        TimelineLayoutRulesConfig rules)
    {
        if (eventItems.ContainsKey(timelineEvent.Id))
        {
            return;
        }

        var start = GetEventStartValue(timelineEvent, index);
        var end = GetEventEndValue(timelineEvent, index);
        var x = GetTimelineEventX(timelineEvent, index, minValue, maxValue, rules);
        var width = GetTimelineEventWidth(timelineEvent, index, minValue, maxValue, rules);
        var height = GetTimelineEventHeight(timelineEvent, rules);
        var parentEventId = parentEventIds.GetValueOrDefault(timelineEvent.Id);
        var parentItem = parentEventId is null ? null : eventItems.GetValueOrDefault(parentEventId.Value);
        var itemLane = parentItem is not null && timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
            ? parentItem.Lane
            : lane;
        var y = ResolveY(timelineEvent.EventType, itemLane, parentItem, rules);

        if (timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) && end < start)
        {
            width = rules.MinimumDurationWidth;
        }

        var layoutItem = new TimelineLayoutItem
        {
            TimelineEventId = timelineEvent.Id,
            X = x,
            Y = y,
            Width = width,
            Height = height,
            Lane = itemLane,
            Layer = ResolveLayer(timelineEvent.EventType),
            IsPinned = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        generatedItems.Add(layoutItem);
        eventItems[timelineEvent.Id] = layoutItem;
    }

    private static void AddOccupiedSegments(
        IEnumerable<int> eventIds,
        IReadOnlyDictionary<int, TimelineEvent> eventsById,
        IReadOnlyDictionary<int, int> eventIndexes,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems,
        List<TimelineLayoutLaneSegment> occupiedSegments,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        foreach (var eventId in eventIds)
        {
            if (!eventsById.TryGetValue(eventId, out var timelineEvent) ||
                !eventItems.TryGetValue(eventId, out var layoutItem) ||
                timelineEvent.EventType.Equals("era", StringComparison.OrdinalIgnoreCase) ||
                timelineEvent.EventType.Equals("chapter", StringComparison.OrdinalIgnoreCase) ||
                (timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                 parentEventIds.GetValueOrDefault(eventId) is not null))
            {
                continue;
            }

            occupiedSegments.RemoveAll(segment => segment.EventId == eventId);
            occupiedSegments.Add(GetTimelineLayoutSegment(timelineEvent, eventIndexes[eventId], layoutItem.Lane, minValue, maxValue, rules));
        }
    }

    private static List<TimelineLayoutLaneSegment> BuildAllOccupiedSegments(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyDictionary<int, int> eventIndexes,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules,
        int? excludedEventId = null)
    {
        var segments = new List<TimelineLayoutLaneSegment>();
        AddOccupiedSegments(
            events
                .Where(timelineEvent => timelineEvent.Id != excludedEventId)
                .Select(timelineEvent => timelineEvent.Id),
            events.ToDictionary(timelineEvent => timelineEvent.Id),
            eventIndexes,
            parentEventIds,
            eventItems,
            segments,
            minValue,
            maxValue,
            rules);
        return segments;
    }

    private static int ResolveFirstFreeTimelineLane(
        TimelineEvent timelineEvent,
        int index,
        IReadOnlyList<TimelineLayoutLaneSegment> occupiedSegments,
        IReadOnlyList<TimelineLayoutLaneSegment> protectedSegments,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules,
        int preferredLane)
    {
        for (var lane = Math.Max(preferredLane, 0); lane < 64; lane++)
        {
            if (!TimelineEventHasLaneConflict(
                    timelineEvent,
                    index,
                    lane,
                    occupiedSegments,
                    protectedSegments,
                    minValue,
                    maxValue,
                    rules))
            {
                return lane;
            }
        }

        return Math.Max(preferredLane, 64);
    }

    private static bool TimelineEventHasLaneConflict(
        TimelineEvent timelineEvent,
        int index,
        int lane,
        IReadOnlyList<TimelineLayoutLaneSegment> occupiedSegments,
        IReadOnlyList<TimelineLayoutLaneSegment> protectedSegments,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules,
        int? ignoredEventId = null)
    {
        if (timelineEvent.EventType.Equals("era", StringComparison.OrdinalIgnoreCase) ||
            timelineEvent.EventType.Equals("chapter", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var segment = GetTimelineLayoutSegment(timelineEvent, index, lane, minValue, maxValue, rules);
        return occupiedSegments
            .Concat(protectedSegments)
            .Where(existingSegment => ignoredEventId is null || existingSegment.EventId != ignoredEventId.Value)
            .Any(existingSegment => TimelineSegmentsConflict(segment, existingSegment));
    }

    private static TimelineLayoutLaneSegment GetTimelineLayoutSegment(
        TimelineEvent timelineEvent,
        int index,
        int lane,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        var x = GetTimelineEventX(timelineEvent, index, minValue, maxValue, rules);
        var width = GetTimelineEventWidth(timelineEvent, index, minValue, maxValue, rules);

        if (timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
        {
            var centerX = x + width / 2;
            return new TimelineLayoutLaneSegment(lane, centerX - rules.PointSize, centerX + rules.PointSize, timelineEvent.Id);
        }

        return new TimelineLayoutLaneSegment(lane, x, x + width, timelineEvent.Id);
    }

    private static bool TimelineSegmentsConflict(TimelineLayoutLaneSegment first, TimelineLayoutLaneSegment second) =>
        first.Lane == second.Lane && RangesOverlap(first.StartX, first.EndX, second.StartX, second.EndX);

    private static List<TimelineLayoutLaneSegment> BuildTimelineProtectedLinkSegments(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var protectedSegments = new List<TimelineLayoutLaneSegment>();

        foreach (var link in links.Where(link => !link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase)))
        {
            if (!eventsById.TryGetValue(link.SourceEventId, out var sourceEvent) ||
                !eventsById.TryGetValue(link.TargetEventId, out var targetEvent) ||
                !eventItems.TryGetValue(link.SourceEventId, out var sourceItem) ||
                !eventItems.TryGetValue(link.TargetEventId, out var targetItem))
            {
                continue;
            }

            var sourceAnchor = GetTimelineLayoutAnchor(sourceEvent, sourceItem);
            var targetAnchor = GetTimelineLayoutAnchor(targetEvent, targetItem);

            if (sourceAnchor.Lane == targetAnchor.Lane)
            {
                protectedSegments.Add(new TimelineLayoutLaneSegment(
                    sourceAnchor.Lane,
                    Math.Min(sourceAnchor.X, targetAnchor.X) - rules.PointSize,
                    Math.Max(sourceAnchor.X, targetAnchor.X) + rules.PointSize,
                    0));
                continue;
            }

            if (Math.Abs(sourceAnchor.X - targetAnchor.X) < 1)
            {
                var firstLane = Math.Min(sourceAnchor.Lane, targetAnchor.Lane);
                var lastLane = Math.Max(sourceAnchor.Lane, targetAnchor.Lane);
                for (var lane = firstLane; lane <= lastLane; lane++)
                {
                    protectedSegments.Add(new TimelineLayoutLaneSegment(
                        lane,
                        sourceAnchor.X - rules.PointSize,
                        sourceAnchor.X + rules.PointSize,
                        0));
                }

                continue;
            }

            var midX = sourceAnchor.X + (targetAnchor.X - sourceAnchor.X) / 2;
            protectedSegments.Add(new TimelineLayoutLaneSegment(
                sourceAnchor.Lane,
                Math.Min(sourceAnchor.X, midX) - rules.PointSize,
                Math.Max(sourceAnchor.X, midX) + rules.PointSize,
                0));
            protectedSegments.Add(new TimelineLayoutLaneSegment(
                targetAnchor.Lane,
                Math.Min(midX, targetAnchor.X) - rules.PointSize,
                Math.Max(midX, targetAnchor.X) + rules.PointSize,
                0));

            var firstRouteLane = Math.Min(sourceAnchor.Lane, targetAnchor.Lane);
            var lastRouteLane = Math.Max(sourceAnchor.Lane, targetAnchor.Lane);
            for (var lane = firstRouteLane; lane <= lastRouteLane; lane++)
            {
                protectedSegments.Add(new TimelineLayoutLaneSegment(
                    lane,
                    midX - rules.PointSize,
                    midX + rules.PointSize,
                    0));
            }
        }

        return protectedSegments;
    }

    private static TimelineLayoutAnchor GetTimelineLayoutAnchor(TimelineEvent timelineEvent, TimelineLayoutItem item)
    {
        var x = timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)
            ? item.X + item.Width / 2
            : item.X + item.Width / 2;
        return new TimelineLayoutAnchor(x, item.Lane);
    }

    private static void MoveIndependentEventsAwayFromLinkSegments(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        IReadOnlySet<int> linkedEventIds,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        var eventIndexes = events.Select((timelineEvent, index) => new { timelineEvent.Id, Index = index })
            .ToDictionary(item => item.Id, item => item.Index);
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var movableEvents = events
            .Where(timelineEvent =>
                !linkedEventIds.Contains(timelineEvent.Id) &&
                parentEventIds.GetValueOrDefault(timelineEvent.Id) is null &&
                (timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) ||
                 timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)) &&
                eventItems.ContainsKey(timelineEvent.Id))
            .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
            .ThenBy(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id)
            .ToList();

        for (var pass = 0; pass < 20; pass++)
        {
            var changed = false;
            var protectedSegments = BuildTimelineProtectedLinkSegments(events, links, parentEventIds, eventItems, rules);

            foreach (var timelineEvent in movableEvents)
            {
                var item = eventItems[timelineEvent.Id];
                if (!TimelineEventHasLaneConflict(
                        timelineEvent,
                        eventIndexes[timelineEvent.Id],
                        item.Lane,
                        [],
                        protectedSegments,
                        minValue,
                        maxValue,
                        rules,
                        timelineEvent.Id))
                {
                    continue;
                }

                var occupiedSegments = BuildAllOccupiedSegments(events, eventIndexes, parentEventIds, eventItems, minValue, maxValue, rules, timelineEvent.Id);
                var nextLane = ResolveFirstFreeTimelineLane(
                    timelineEvent,
                    eventIndexes[timelineEvent.Id],
                    occupiedSegments,
                    protectedSegments,
                    minValue,
                    maxValue,
                    rules,
                    item.Lane + 1);

                if (nextLane == item.Lane)
                {
                    continue;
                }

                MoveTimelineEventToLane(timelineEvent, nextLane, eventsById, parentEventIds, eventItems, rules);
                changed = true;
            }

            if (!changed)
            {
                break;
            }
        }
    }

    private static void MoveTimelineEventToLane(
        TimelineEvent timelineEvent,
        int lane,
        IReadOnlyDictionary<int, TimelineEvent> eventsById,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        TimelineLayoutRulesConfig rules)
    {
        if (!eventItems.TryGetValue(timelineEvent.Id, out var item))
        {
            return;
        }

        item.Lane = lane;
        item.Y = ResolveY(timelineEvent.EventType, lane, rules);

        if (!timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        foreach (var childEventId in parentEventIds
            .Where(parent => parent.Value == timelineEvent.Id)
            .Select(parent => parent.Key))
        {
            if (!eventsById.TryGetValue(childEventId, out var childEvent) ||
                !eventItems.TryGetValue(childEventId, out var childItem))
            {
                continue;
            }

            childItem.Lane = lane;
            childItem.Y = ResolveY(childEvent.EventType, lane, item, rules);
        }
    }

    private static decimal GetTimelineEventX(
        TimelineEvent timelineEvent,
        int index,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        var start = GetEventStartValue(timelineEvent, index);
        var scaledStart = ScaleToCanvas(start, minValue, maxValue);
        return timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
            ? scaledStart - rules.PointSize / 2
            : scaledStart;
    }

    private static decimal GetTimelineEventWidth(
        TimelineEvent timelineEvent,
        int index,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        if (timelineEvent.EventType.Equals("chapter", StringComparison.OrdinalIgnoreCase))
        {
            return 2;
        }

        if (timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
        {
            return rules.PointSize;
        }

        var startX = ScaleToCanvas(GetEventStartValue(timelineEvent, index), minValue, maxValue);
        var endX = ScaleToCanvas(GetEventEndValue(timelineEvent, index), minValue, maxValue);
        return Math.Max(rules.MinimumDurationWidth, endX - startX);
    }

    private static decimal GetTimelineEventHeight(TimelineEvent timelineEvent, TimelineLayoutRulesConfig rules)
    {
        if (timelineEvent.EventType.Equals("era", StringComparison.OrdinalIgnoreCase))
        {
            return rules.EraHeight;
        }

        if (timelineEvent.EventType.Equals("chapter", StringComparison.OrdinalIgnoreCase))
        {
            return rules.ChapterHeight;
        }

        return timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
            ? rules.PointSize
            : rules.DurationHeight;
    }

    private static void AlignLinkedPointItems(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        int maxDurationLane,
        TimelineLayoutRulesConfig rules)
    {
        var pointEventIds = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
            .Select(timelineEvent => timelineEvent.Id)
            .ToHashSet();

        for (var pass = 0; pass < Math.Max(events.Count, 1); pass++)
        {
            var changed = false;
            foreach (var link in links.OrderBy(link => link.SortOrder).ThenBy(link => link.Id))
            {
                if (!pointEventIds.Contains(link.SourceEventId) ||
                    !pointEventIds.Contains(link.TargetEventId) ||
                    !eventItems.TryGetValue(link.SourceEventId, out var sourceItem) ||
                    !eventItems.TryGetValue(link.TargetEventId, out var targetItem))
                {
                    continue;
                }

                var sourceParentId = parentEventIds.GetValueOrDefault(link.SourceEventId);
                var targetParentId = parentEventIds.GetValueOrDefault(link.TargetEventId);
                var sourcePinned = pinnedEventIds.Contains(link.SourceEventId);
                var targetPinned = pinnedEventIds.Contains(link.TargetEventId);

                if (link.LinkType.Equals("simultaneous", StringComparison.OrdinalIgnoreCase))
                {
                    if (sourceParentId is null && targetParentId is null)
                    {
                        if (!targetPinned)
                        {
                            var nextLane = targetItem.Lane == sourceItem.Lane
                                ? sourceItem.Lane + 1
                                : targetItem.Lane;
                            changed |= MovePointItem(targetItem, sourceItem.X, ResolveStandalonePointY(nextLane, maxDurationLane, rules), nextLane);
                        }
                        else if (!sourcePinned)
                        {
                            var nextLane = sourceItem.Lane == targetItem.Lane
                                ? targetItem.Lane + 1
                                : sourceItem.Lane;
                            changed |= MovePointItem(sourceItem, targetItem.X, ResolveStandalonePointY(nextLane, maxDurationLane, rules), nextLane);
                        }

                        continue;
                    }

                    var sharedX = sourcePinned
                        ? sourceItem.X
                        : targetPinned
                            ? targetItem.X
                            : sourceParentId is not null
                                ? sourceItem.X
                                : targetParentId is not null
                                    ? targetItem.X
                                    : sourceItem.X;

                    if (!sourcePinned)
                    {
                        changed |= MovePointItem(sourceItem, sharedX, sourceItem.Y, sourceItem.Lane);
                    }

                    if (!targetPinned)
                    {
                        changed |= MovePointItem(targetItem, sharedX, targetItem.Y, targetItem.Lane);
                    }

                    continue;
                }

                if (targetPinned || targetParentId is not null)
                {
                    continue;
                }

                if (link.LinkType.Equals("precedes", StringComparison.OrdinalIgnoreCase) ||
                    link.LinkType.Equals("causes", StringComparison.OrdinalIgnoreCase) ||
                    link.LinkType.Equals("related", StringComparison.OrdinalIgnoreCase))
                {
                    changed |= MovePointItem(targetItem, targetItem.X, sourceItem.Y, sourceItem.Lane);
                }
            }

            if (!changed)
            {
                break;
            }
        }
    }

    private static bool MovePointItem(TimelineLayoutItem item, decimal x, decimal y, int lane)
    {
        if (item.X == x && item.Y == y && item.Lane == lane)
        {
            return false;
        }

        item.X = x;
        item.Y = y;
        item.Lane = lane;
        return true;
    }

    private static void CompactVerticalLinkedStandalonePoints(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var eventIndexes = events.Select((timelineEvent, index) => new { timelineEvent.Id, Index = index })
            .ToDictionary(item => item.Id, item => item.Index);
        var pointIds = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
            .Select(timelineEvent => timelineEvent.Id)
            .ToHashSet();
        var preferredLanes = new Dictionary<int, int>();

        foreach (var link in links.Where(link => link.LinkType.Equals("simultaneous", StringComparison.OrdinalIgnoreCase)))
        {
            if (!pointIds.Contains(link.SourceEventId) || !pointIds.Contains(link.TargetEventId))
            {
                continue;
            }

            var sourceParentId = parentEventIds.GetValueOrDefault(link.SourceEventId);
            var targetParentId = parentEventIds.GetValueOrDefault(link.TargetEventId);
            if (sourceParentId is not null && targetParentId is null && eventItems.TryGetValue(sourceParentId.Value, out var sourceParentItem))
            {
                preferredLanes[link.TargetEventId] = Math.Max(
                    preferredLanes.GetValueOrDefault(link.TargetEventId),
                    sourceParentItem.Lane + 1);
            }

            if (targetParentId is not null && sourceParentId is null && eventItems.TryGetValue(targetParentId.Value, out var targetParentItem))
            {
                preferredLanes[link.SourceEventId] = Math.Max(
                    preferredLanes.GetValueOrDefault(link.SourceEventId),
                    targetParentItem.Lane + 1);
            }
        }

        var movablePointEvents = preferredLanes.Keys
            .Where(pointId =>
                !pinnedEventIds.Contains(pointId) &&
                parentEventIds.GetValueOrDefault(pointId) is null &&
                eventsById.TryGetValue(pointId, out var timelineEvent) &&
                timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                eventItems.ContainsKey(pointId))
            .Select(pointId => eventsById[pointId])
            .OrderBy(timelineEvent => GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]))
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id)
            .ToList();
        if (movablePointEvents.Count == 0)
        {
            return;
        }

        var movablePointIds = movablePointEvents.Select(timelineEvent => timelineEvent.Id).ToHashSet();
        var fixedPointSegments = new List<TimelineLaneValueSegment>();
        var pointWindow = Math.Max(1, (maxValue - minValue) / 60);

        foreach (var timelineEvent in events)
        {
            if (!timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) ||
                movablePointIds.Contains(timelineEvent.Id) ||
                parentEventIds.GetValueOrDefault(timelineEvent.Id) is not null ||
                !eventItems.TryGetValue(timelineEvent.Id, out var pointItem))
            {
                continue;
            }

            var start = GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]);
            var occupiedEnd = start + pointWindow;
            fixedPointSegments.Add(new TimelineLaneValueSegment(pointItem.Lane, start, occupiedEnd, timelineEvent.Id));
        }

        foreach (var timelineEvent in movablePointEvents)
        {
            var pointItem = eventItems[timelineEvent.Id];
            var start = GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]);
            var occupiedEnd = start + pointWindow;
            var lane = ResolvePointLane(fixedPointSegments, start, occupiedEnd, preferredLanes[timelineEvent.Id]);

            MovePointItem(pointItem, pointItem.X, ResolveStandalonePointY(lane, 0, rules), lane);
            fixedPointSegments.Add(new TimelineLaneValueSegment(lane, start, occupiedEnd, timelineEvent.Id));
        }
    }

    private static void AlignDurationsToLinkedPointLanes(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);

        foreach (var link in links.OrderBy(link => link.SortOrder).ThenBy(link => link.Id))
        {
            if (!IsHorizontalPointLink(link) ||
                !eventsById.TryGetValue(link.SourceEventId, out var sourceEvent) ||
                !eventsById.TryGetValue(link.TargetEventId, out var targetEvent))
            {
                continue;
            }

            var pointEvent = sourceEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
                ? sourceEvent
                : targetEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
                    ? targetEvent
                    : null;
            var durationEvent = sourceEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)
                ? sourceEvent
                : targetEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)
                    ? targetEvent
                    : null;

            if (pointEvent is null ||
                durationEvent is null ||
                pinnedEventIds.Contains(durationEvent.Id) ||
                parentEventIds.GetValueOrDefault(pointEvent.Id) == durationEvent.Id ||
                !eventItems.TryGetValue(pointEvent.Id, out var pointItem) ||
                !eventItems.TryGetValue(durationEvent.Id, out var durationItem))
            {
                continue;
            }

            var nextLane = Math.Max(durationItem.Lane, pointItem.Lane);
            if (nextLane == durationItem.Lane)
            {
                continue;
            }

            durationItem.Lane = nextLane;
            durationItem.Y = ResolveY(durationEvent.EventType, nextLane, rules);
            MoveChildPointsWithDuration(durationEvent.Id, durationItem, eventsById, parentEventIds, eventItems, rules);
        }
    }

    private static void RepackDurationLanes(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var durationEvents = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .OrderBy(timelineEvent => timelineEvent.StartValue ?? 0)
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id)
            .ToList();
        var durationPreferredLanes = BuildDurationPreferredLanes(events, links, parentEventIds, eventItems);
        var pointSegments = BuildLinkedPointLaneSegments(events, links, parentEventIds, eventItems, rules);
        var placedDurationSegments = new List<TimelineLaneSegment>();

        foreach (var durationEvent in durationEvents.Where(durationEvent => pinnedEventIds.Contains(durationEvent.Id)))
        {
            if (!eventItems.TryGetValue(durationEvent.Id, out var pinnedItem))
            {
                continue;
            }

            placedDurationSegments.Add(CreateLaneSegment(
                pinnedItem.Lane,
                pinnedItem.X,
                pinnedItem.X + pinnedItem.Width,
                durationEvent.StartValue ?? 0,
                durationEvent.Id));
        }

        foreach (var durationEvent in durationEvents.Where(durationEvent => !pinnedEventIds.Contains(durationEvent.Id)))
        {
            if (!eventItems.TryGetValue(durationEvent.Id, out var durationItem))
            {
                continue;
            }

            var nextLane = durationPreferredLanes.GetValueOrDefault(durationEvent.Id);
            while (DurationLaneHasConflict(durationEvent, durationItem, nextLane, pointSegments, placedDurationSegments))
            {
                nextLane++;
            }

            durationItem.Lane = nextLane;
            durationItem.Y = ResolveY(durationEvent.EventType, nextLane, rules);
            MoveChildPointsWithDuration(durationEvent.Id, durationItem, eventsById, parentEventIds, eventItems, rules);

            placedDurationSegments.Add(CreateLaneSegment(
                durationItem.Lane,
                durationItem.X,
                durationItem.X + durationItem.Width,
                durationEvent.StartValue ?? 0,
                durationEvent.Id));
        }
    }

    private static void LiftDurationsAboveLinkedPointLanes(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var durationEvents = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .OrderBy(timelineEvent => timelineEvent.StartValue ?? 0)
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Id)
            .ToList();

        for (var pass = 0; pass < Math.Max(durationEvents.Count, 1); pass++)
        {
            var changed = false;
            var pointSegments = BuildLinkedPointLaneSegments(events, links, parentEventIds, eventItems, rules);

            foreach (var durationEvent in durationEvents)
            {
                if (pinnedEventIds.Contains(durationEvent.Id) ||
                    !eventItems.TryGetValue(durationEvent.Id, out var durationItem))
                {
                    continue;
                }

                var nextLane = durationItem.Lane;
                while (DurationLaneHasConflict(durationEvent, durationItem, nextLane, durationEvents, eventItems, pointSegments))
                {
                    nextLane++;
                }

                if (nextLane == durationItem.Lane)
                {
                    continue;
                }

                durationItem.Lane = nextLane;
                durationItem.Y = ResolveY(durationEvent.EventType, nextLane, rules);
                MoveChildPointsWithDuration(durationEvent.Id, durationItem, eventsById, parentEventIds, eventItems, rules);
                changed = true;
            }

            if (!changed)
            {
                break;
            }
        }
    }

    private static void CompactUnlinkedStandalonePoints(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        HashSet<int> pinnedEventIds,
        decimal minValue,
        decimal maxValue,
        TimelineLayoutRulesConfig rules)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var eventIndexes = events.Select((timelineEvent, index) => new { timelineEvent.Id, Index = index })
            .ToDictionary(item => item.Id, item => item.Index);
        var linkedPointIds = links
            .Where(link => !link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase))
            .SelectMany(link => new[] { link.SourceEventId, link.TargetEventId })
            .Where(eventId =>
                eventsById.TryGetValue(eventId, out var timelineEvent) &&
                timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
            .ToHashSet();
        var durationValueSegments = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .Where(timelineEvent => eventItems.ContainsKey(timelineEvent.Id))
            .Select(timelineEvent => new TimelineLaneValueSegment(
                eventItems[timelineEvent.Id].Lane,
                GetEventStartValue(timelineEvent, eventIndexes[timelineEvent.Id]),
                GetEventEndValue(timelineEvent, eventIndexes[timelineEvent.Id]),
                timelineEvent.Id))
            .ToList();
        var fixedPointSegments = new List<TimelineLaneValueSegment>();
        var movablePointEvents = events
            .Select((timelineEvent, index) => new { Event = timelineEvent, Index = index })
            .Where(item =>
                item.Event.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                parentEventIds.GetValueOrDefault(item.Event.Id) is null &&
                !linkedPointIds.Contains(item.Event.Id) &&
                !pinnedEventIds.Contains(item.Event.Id) &&
                eventItems.ContainsKey(item.Event.Id))
            .OrderBy(item => GetEventStartValue(item.Event, item.Index))
            .ThenBy(item => item.Event.SortOrder)
            .ThenBy(item => item.Event.Id)
            .ToList();
        var movablePointIds = movablePointEvents.Select(item => item.Event.Id).ToHashSet();
        var pointWindow = Math.Max(1, (maxValue - minValue) / 60);

        foreach (var item in events.Select((timelineEvent, index) => new { Event = timelineEvent, Index = index }))
        {
            if (!item.Event.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) ||
                movablePointIds.Contains(item.Event.Id) ||
                !eventItems.TryGetValue(item.Event.Id, out var pointItem))
            {
                continue;
            }

            var start = GetEventStartValue(item.Event, item.Index);
            var occupiedEnd = start + pointWindow;
            fixedPointSegments.Add(new TimelineLaneValueSegment(pointItem.Lane, start, occupiedEnd, item.Event.Id));
        }

        foreach (var pointEvent in movablePointEvents)
        {
            var pointItem = eventItems[pointEvent.Event.Id];
            var start = GetEventStartValue(pointEvent.Event, pointEvent.Index);
            var occupiedEnd = start + pointWindow;
            var nextLane = ResolveStandalonePointLane(fixedPointSegments, durationValueSegments, start, occupiedEnd, 0);

            pointItem.Lane = nextLane;
            pointItem.Y = ResolveStandalonePointY(nextLane, 0, rules);
            fixedPointSegments.Add(new TimelineLaneValueSegment(nextLane, start, occupiedEnd, pointEvent.Event.Id));
        }
    }

    private static List<TimelineLaneSegment> BuildLinkedPointLaneSegments(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems,
        TimelineLayoutRulesConfig rules)
    {
        var eventStartValues = events
            .Select((timelineEvent, index) => new { timelineEvent.Id, Value = GetEventStartValue(timelineEvent, index) })
            .ToDictionary(item => item.Id, item => item.Value);
        var pointIds = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase))
            .Select(timelineEvent => timelineEvent.Id)
            .ToHashSet();
        var durationIds = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .Select(timelineEvent => timelineEvent.Id)
            .ToHashSet();
        var linkedPointIds = links
            .Where(link =>
                !link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase) &&
                (pointIds.Contains(link.SourceEventId) || pointIds.Contains(link.TargetEventId)))
            .SelectMany(link => new[] { link.SourceEventId, link.TargetEventId })
            .Where(pointIds.Contains)
            .ToHashSet();
        var verticalProtectedPointIds = links
            .Where(link => link.LinkType.Equals("simultaneous", StringComparison.OrdinalIgnoreCase))
            .Where(link =>
                pointIds.Contains(link.SourceEventId) &&
                pointIds.Contains(link.TargetEventId) &&
                eventItems.TryGetValue(link.SourceEventId, out var sourceItem) &&
                eventItems.TryGetValue(link.TargetEventId, out var targetItem) &&
                sourceItem.Lane != targetItem.Lane)
            .SelectMany(link => new[] { link.SourceEventId, link.TargetEventId })
            .ToHashSet();
        var segments = new List<TimelineLaneSegment>();

        foreach (var pointId in linkedPointIds)
        {
            if (!eventItems.TryGetValue(pointId, out var pointItem))
            {
                continue;
            }

            var centerX = pointItem.X + pointItem.Width / 2;
            var ownerParentId = parentEventIds.GetValueOrDefault(pointId);
            segments.Add(CreateLaneSegment(
                pointItem.Lane,
                centerX - rules.PointSize,
                centerX + rules.PointSize,
                eventStartValues.GetValueOrDefault(pointId),
                ownerParentId,
                blocksDurationRegardlessOfStart: verticalProtectedPointIds.Contains(pointId)));
        }

        foreach (var link in links)
        {
            if (!IsHorizontalPointLink(link) ||
                !pointIds.Contains(link.SourceEventId) ||
                !pointIds.Contains(link.TargetEventId) ||
                !eventItems.TryGetValue(link.SourceEventId, out var sourceItem) ||
                !eventItems.TryGetValue(link.TargetEventId, out var targetItem))
            {
                continue;
            }

            var sourceCenterX = sourceItem.X + sourceItem.Width / 2;
            var targetCenterX = targetItem.X + targetItem.Width / 2;
            var segmentValue = Math.Min(
                eventStartValues.GetValueOrDefault(link.SourceEventId),
                eventStartValues.GetValueOrDefault(link.TargetEventId));
            var sourceParentId = parentEventIds.GetValueOrDefault(link.SourceEventId);
            var targetParentId = parentEventIds.GetValueOrDefault(link.TargetEventId);
            segments.Add(CreateLaneSegment(
                sourceItem.Lane,
                Math.Min(sourceCenterX, targetCenterX) - rules.PointSize,
                Math.Max(sourceCenterX, targetCenterX) + rules.PointSize,
                segmentValue,
                sourceParentId,
                targetParentId));
        }

        foreach (var link in links)
        {
            if (!link.LinkType.Equals("simultaneous", StringComparison.OrdinalIgnoreCase) ||
                !pointIds.Contains(link.SourceEventId) ||
                !pointIds.Contains(link.TargetEventId) ||
                !eventItems.TryGetValue(link.SourceEventId, out var sourceItem) ||
                !eventItems.TryGetValue(link.TargetEventId, out var targetItem))
            {
                continue;
            }

            var sourceCenterX = sourceItem.X + sourceItem.Width / 2;
            var targetCenterX = targetItem.X + targetItem.Width / 2;
            var verticalX = Math.Abs(sourceCenterX - targetCenterX) < 1
                ? sourceCenterX
                : targetCenterX;
            var firstLane = Math.Min(sourceItem.Lane, targetItem.Lane);
            var lastLane = Math.Max(sourceItem.Lane, targetItem.Lane);
            var hasVerticalSpan = firstLane != lastLane;
            var segmentValue = Math.Min(
                eventStartValues.GetValueOrDefault(link.SourceEventId),
                eventStartValues.GetValueOrDefault(link.TargetEventId));
            var sourceParentId = parentEventIds.GetValueOrDefault(link.SourceEventId);
            var targetParentId = parentEventIds.GetValueOrDefault(link.TargetEventId);

            for (var lane = firstLane; lane <= lastLane; lane++)
            {
                segments.Add(CreateLaneSegment(
                    lane,
                    verticalX - rules.PointSize,
                    verticalX + rules.PointSize,
                    segmentValue,
                    sourceParentId,
                    targetParentId,
                    hasVerticalSpan));
            }
        }

        foreach (var link in links)
        {
            if (link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase) ||
                !((pointIds.Contains(link.SourceEventId) && durationIds.Contains(link.TargetEventId)) ||
                  (pointIds.Contains(link.TargetEventId) && durationIds.Contains(link.SourceEventId))))
            {
                continue;
            }

            var pointId = pointIds.Contains(link.SourceEventId) ? link.SourceEventId : link.TargetEventId;
            var durationId = durationIds.Contains(link.SourceEventId) ? link.SourceEventId : link.TargetEventId;

            if (!eventItems.TryGetValue(pointId, out var pointItem) ||
                !eventItems.TryGetValue(durationId, out var durationItem) ||
                parentEventIds.GetValueOrDefault(pointId) == durationId)
            {
                continue;
            }

            var pointCenterX = pointItem.X + pointItem.Width / 2;
            var durationStartX = durationItem.X;
            var durationEndX = durationItem.X + durationItem.Width;
            segments.Add(CreateLaneSegment(
                pointItem.Lane,
                Math.Min(pointCenterX, durationStartX) - rules.PointSize,
                Math.Max(pointCenterX, durationEndX) + rules.PointSize,
                eventStartValues.GetValueOrDefault(pointId),
                durationId));
        }

        return segments;
    }

    private static bool DurationLaneHasConflict(
        TimelineEvent durationEvent,
        TimelineLayoutItem durationItem,
        int lane,
        IReadOnlyList<TimelineEvent> durationEvents,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems,
        IReadOnlyList<TimelineLaneSegment> pointSegments)
    {
        var durationStartX = durationItem.X;
        var durationEndX = durationItem.X + durationItem.Width;
        var durationStartValue = durationEvent.StartValue ?? 0;

        if (pointSegments.Any(segment =>
                segment.Lane == lane &&
                (segment.BlocksDurationRegardlessOfStart || segment.StartValue <= durationStartValue) &&
                segment.OwnerParentEventId != durationEvent.Id &&
                segment.SecondaryOwnerParentEventId != durationEvent.Id &&
                RangesOverlap(durationStartX, durationEndX, segment.StartX, segment.EndX)))
        {
            return true;
        }

        return durationEvents.Any(otherEvent =>
            otherEvent.Id != durationEvent.Id &&
            (otherEvent.StartValue ?? 0) <= durationStartValue &&
            eventItems.TryGetValue(otherEvent.Id, out var otherItem) &&
            otherItem.Lane == lane &&
            RangesOverlap(durationStartX, durationEndX, otherItem.X, otherItem.X + otherItem.Width));
    }

    private static bool DurationLaneHasConflict(
        TimelineEvent durationEvent,
        TimelineLayoutItem durationItem,
        int lane,
        IReadOnlyList<TimelineLaneSegment> pointSegments,
        IReadOnlyList<TimelineLaneSegment> durationSegments)
    {
        var durationStartX = durationItem.X;
        var durationEndX = durationItem.X + durationItem.Width;
        var durationStartValue = durationEvent.StartValue ?? 0;

        if (pointSegments.Any(segment =>
                segment.Lane == lane &&
                (segment.BlocksDurationRegardlessOfStart || segment.StartValue <= durationStartValue) &&
                segment.OwnerParentEventId != durationEvent.Id &&
                segment.SecondaryOwnerParentEventId != durationEvent.Id &&
                RangesOverlap(durationStartX, durationEndX, segment.StartX, segment.EndX)))
        {
            return true;
        }

        return durationSegments.Any(segment =>
            segment.Lane == lane &&
            segment.OwnerParentEventId != durationEvent.Id &&
            RangesOverlap(durationStartX, durationEndX, segment.StartX, segment.EndX));
    }

    private static void MoveChildPointsWithDuration(
        int durationEventId,
        TimelineLayoutItem durationItem,
        IReadOnlyDictionary<int, TimelineEvent> eventsById,
        IReadOnlyDictionary<int, int?> parentEventIds,
        Dictionary<int, TimelineLayoutItem> eventItems,
        TimelineLayoutRulesConfig rules)
    {
        foreach (var child in parentEventIds.Where(item => item.Value == durationEventId))
        {
            if (!eventsById.TryGetValue(child.Key, out var childEvent) ||
                !childEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) ||
                !eventItems.TryGetValue(child.Key, out var childItem))
            {
                continue;
            }

            childItem.Lane = durationItem.Lane;
            childItem.Y = ResolveY(childEvent.EventType, durationItem.Lane, durationItem, rules);
        }
    }

    private static bool IsHorizontalPointLink(TimelineEventLink link) =>
        link.LinkType.Equals("precedes", StringComparison.OrdinalIgnoreCase) ||
        link.LinkType.Equals("causes", StringComparison.OrdinalIgnoreCase) ||
        link.LinkType.Equals("related", StringComparison.OrdinalIgnoreCase);

    private static TimelineLaneSegment CreateLaneSegment(
        int lane,
        decimal startX,
        decimal endX,
        decimal startValue,
        int? ownerParentEventId,
        int? secondaryOwnerParentEventId = null,
        bool blocksDurationRegardlessOfStart = false) =>
        startX <= endX
            ? new TimelineLaneSegment(lane, startX, endX, startValue, ownerParentEventId, secondaryOwnerParentEventId, blocksDurationRegardlessOfStart)
            : new TimelineLaneSegment(lane, endX, startX, startValue, ownerParentEventId, secondaryOwnerParentEventId, blocksDurationRegardlessOfStart);

    private static bool RangesOverlap(decimal firstStart, decimal firstEnd, decimal secondStart, decimal secondEnd) =>
        firstStart < secondEnd && firstEnd > secondStart;

    private static bool ValueRangesOverlap(decimal firstStart, decimal firstEnd, decimal secondStart, decimal secondEnd) =>
        firstStart < secondEnd && firstEnd > secondStart;

    private readonly record struct TimelineLaneSegment(
        int Lane,
        decimal StartX,
        decimal EndX,
        decimal StartValue,
        int? OwnerParentEventId,
        int? SecondaryOwnerParentEventId,
        bool BlocksDurationRegardlessOfStart);

    private readonly record struct TimelineLaneValueSegment(
        int Lane,
        decimal StartValue,
        decimal EndValue,
        int EventId);

    private static Dictionary<int, int?> BuildParentEventMap(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var parentEventIds = events.ToDictionary(timelineEvent => timelineEvent.Id, timelineEvent => timelineEvent.ParentEventId);

        foreach (var link in links.Where(link => link.LinkType.Equals("partOf", StringComparison.OrdinalIgnoreCase)))
        {
            if (!eventsById.TryGetValue(link.SourceEventId, out var sourceEvent) ||
                !eventsById.TryGetValue(link.TargetEventId, out var targetEvent))
            {
                continue;
            }

            if (sourceEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                targetEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            {
                parentEventIds[link.SourceEventId] = link.TargetEventId;
                continue;
            }

            if (targetEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase) &&
                sourceEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            {
                parentEventIds[link.TargetEventId] = link.SourceEventId;
            }
        }

        return parentEventIds;
    }

    private static Dictionary<int, int> BuildPreferredLanes(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds)
    {
        return events.ToDictionary(timelineEvent => timelineEvent.Id, _ => 0);
    }

    private static Dictionary<int, int> BuildDurationPreferredLanes(
        IReadOnlyList<TimelineEvent> events,
        IReadOnlyList<TimelineEventLink> links,
        IReadOnlyDictionary<int, int?> parentEventIds,
        IReadOnlyDictionary<int, TimelineLayoutItem> eventItems)
    {
        var eventsById = events.ToDictionary(timelineEvent => timelineEvent.Id);
        var preferredLanes = events
            .Where(timelineEvent => timelineEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(timelineEvent => timelineEvent.Id, _ => 0);

        foreach (var link in links.Where(IsHorizontalPointLink))
        {
            if (!eventsById.TryGetValue(link.SourceEventId, out var sourceEvent) ||
                !eventsById.TryGetValue(link.TargetEventId, out var targetEvent))
            {
                continue;
            }

            var pointEvent = sourceEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
                ? sourceEvent
                : targetEvent.EventType.Equals("point", StringComparison.OrdinalIgnoreCase)
                    ? targetEvent
                    : null;
            var durationEvent = sourceEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)
                ? sourceEvent
                : targetEvent.EventType.Equals("duration", StringComparison.OrdinalIgnoreCase)
                    ? targetEvent
                    : null;

            if (pointEvent is null ||
                durationEvent is null ||
                parentEventIds.GetValueOrDefault(pointEvent.Id) == durationEvent.Id ||
                !eventItems.TryGetValue(pointEvent.Id, out var pointItem))
            {
                continue;
            }

            preferredLanes[durationEvent.Id] = Math.Max(
                preferredLanes.GetValueOrDefault(durationEvent.Id),
                pointItem.Lane);
        }

        return preferredLanes;
    }

    private static int ResolveLane(
        Dictionary<int, decimal> laneEndValues,
        decimal start,
        decimal end,
        string eventType,
        int preferredLane,
        TimelineLayoutItem? parentItem)
    {
        if (eventType.Equals("era", StringComparison.OrdinalIgnoreCase))
        {
            return -2;
        }

        if (eventType.Equals("chapter", StringComparison.OrdinalIgnoreCase))
        {
            return -1;
        }

        if (parentItem is not null && eventType.Equals("point", StringComparison.OrdinalIgnoreCase))
        {
            return parentItem.Lane;
        }

        for (var lane = Math.Max(preferredLane, 0); lane < 24; lane++)
        {
            if (!laneEndValues.TryGetValue(lane, out var laneEnd) || start > laneEnd)
            {
                return lane;
            }
        }

        return Math.Max(preferredLane, laneEndValues.Count);
    }

    private static int ResolveStandalonePointLane(
        Dictionary<int, decimal> laneEndValues,
        IReadOnlyList<TimelineLaneValueSegment> durationValueSegments,
        decimal start,
        decimal end,
        int preferredLane)
    {
        for (var lane = Math.Max(preferredLane, 0); lane < 24; lane++)
        {
            var pointLaneIsFree = !laneEndValues.TryGetValue(lane, out var laneEnd) || start > laneEnd;
            var durationLaneIsFree = !durationValueSegments.Any(segment =>
                segment.Lane == lane &&
                ValueRangesOverlap(start, end, segment.StartValue, segment.EndValue));

            if (pointLaneIsFree && durationLaneIsFree)
            {
                return lane;
            }
        }

        var nextDurationLane = durationValueSegments.Count == 0
            ? 0
            : durationValueSegments.Max(segment => segment.Lane) + 1;
        return Math.Max(preferredLane, Math.Max(laneEndValues.Count, nextDurationLane));
    }

    private static int ResolvePointLane(
        IReadOnlyList<TimelineLaneValueSegment> pointSegments,
        decimal start,
        decimal end,
        int preferredLane)
    {
        for (var lane = Math.Max(preferredLane, 0); lane < 24; lane++)
        {
            if (!pointSegments.Any(segment =>
                    segment.Lane == lane &&
                    ValueRangesOverlap(start, end, segment.StartValue, segment.EndValue)))
            {
                return lane;
            }
        }

        return Math.Max(preferredLane, pointSegments.Select(segment => segment.Lane).DefaultIfEmpty(-1).Max() + 1);
    }

    private static int ResolveStandalonePointLane(
        IReadOnlyList<TimelineLaneValueSegment> pointSegments,
        IReadOnlyList<TimelineLaneValueSegment> durationValueSegments,
        decimal start,
        decimal end,
        int preferredLane)
    {
        var firstLane = Math.Max(preferredLane, 0);

        for (var lane = firstLane; lane < 24; lane++)
        {
            var pointLaneIsFree = !pointSegments.Any(segment =>
                segment.Lane == lane &&
                ValueRangesOverlap(start, end, segment.StartValue, segment.EndValue));
            var durationLaneIsFree = !durationValueSegments.Any(segment =>
                segment.Lane == lane &&
                ValueRangesOverlap(start, end, segment.StartValue, segment.EndValue));

            if (pointLaneIsFree && durationLaneIsFree)
            {
                return lane;
            }
        }

        var nextPointLane = pointSegments.Select(segment => segment.Lane).DefaultIfEmpty(-1).Max() + 1;
        var nextDurationLane = durationValueSegments.Select(segment => segment.Lane).DefaultIfEmpty(-1).Max() + 1;
        return Math.Max(firstLane, Math.Max(nextPointLane, nextDurationLane));
    }

    private static decimal ResolveY(string eventType, int lane, TimelineLayoutItem? parentItem, TimelineLayoutRulesConfig rules)
    {
        if (parentItem is not null && eventType.Equals("point", StringComparison.OrdinalIgnoreCase))
        {
            return parentItem.Y + rules.DurationTitleHeight + (rules.DurationPointBandHeight - rules.PointSize) / 2;
        }

        return ResolveY(eventType, lane, rules);
    }

    private static decimal ResolveY(string eventType, int lane, TimelineLayoutRulesConfig rules) =>
        eventType switch
        {
            var value when value.Equals("era", StringComparison.OrdinalIgnoreCase) => rules.EraY,
            var value when value.Equals("chapter", StringComparison.OrdinalIgnoreCase) => rules.ChapterY,
            var value when value.Equals("duration", StringComparison.OrdinalIgnoreCase) =>
                rules.AxisY - rules.DurationGap - rules.DurationHeight - lane * rules.LaneStep,
            var value when value.Equals("point", StringComparison.OrdinalIgnoreCase) => ResolvePointY(lane, rules),
            _ => ResolvePointY(lane, rules),
        };

    private static decimal ResolvePointY(int lane, TimelineLayoutRulesConfig rules) =>
        rules.AxisY - rules.DurationGap - rules.DurationHeight + rules.DurationTitleHeight +
        rules.DurationPointBandHeight / 2 - rules.PointSize / 2 - Math.Max(lane, 0) * rules.LaneStep;

    private static decimal ResolveStandalonePointY(int lane, int maxDurationLane, TimelineLayoutRulesConfig rules)
        => ResolvePointY(lane, rules);

    private static decimal GetEventStartValue(TimelineEvent timelineEvent, int index) =>
        timelineEvent.StartValue ?? index;

    private static decimal GetEventEndValue(TimelineEvent timelineEvent, int index)
    {
        var start = GetEventStartValue(timelineEvent, index);
        return timelineEvent.EndValue is null || timelineEvent.EndValue < start
            ? start
            : timelineEvent.EndValue.Value;
    }

    private static int ResolveLayer(string eventType) =>
        eventType switch
        {
            var value when value.Equals("era", StringComparison.OrdinalIgnoreCase) => 0,
            var value when value.Equals("chapter", StringComparison.OrdinalIgnoreCase) => 1,
            var value when value.Equals("duration", StringComparison.OrdinalIgnoreCase) => 2,
            _ => 3,
        };

    private static decimal ScaleToCanvas(decimal value, decimal minValue, decimal maxValue)
    {
        var range = maxValue - minValue;
        if (range <= 0)
        {
            return 96;
        }

        return 96 + (value - minValue) / range * 960;
    }

    private static List<TimelineParticipant> ToParticipants(
        IReadOnlyList<TimelineParticipantRequest>? participants) =>
        (participants ?? Array.Empty<TimelineParticipantRequest>())
            .Where(participant =>
                !string.IsNullOrWhiteSpace(participant.TargetType) &&
                (participant.TargetType.Equals("custom", StringComparison.OrdinalIgnoreCase) || participant.TargetId > 0))
            .Select((participant, index) => new TimelineParticipant
            {
                TargetType = participant.TargetType.Trim(),
                TargetId = participant.TargetId,
                Role = NormalizeOptionalText(participant.Role),
                SortOrder = index,
            })
            .ToList();

    private static List<TimelineChange> ToChanges(IReadOnlyList<TimelineChangeRequest>? changes) =>
        (changes ?? Array.Empty<TimelineChangeRequest>())
            .Where(change =>
                !string.IsNullOrWhiteSpace(change.ChangeType) &&
                !string.IsNullOrWhiteSpace(change.TargetType) &&
                (change.TargetType.Equals("custom", StringComparison.OrdinalIgnoreCase) || change.TargetId > 0))
            .Select((change, index) => new TimelineChange
            {
                ChangeType = change.ChangeType.Trim(),
                TargetType = change.TargetType.Trim(),
                TargetId = change.TargetId,
                FieldKey = NormalizeOptionalText(change.FieldKey),
                FieldName = NormalizeOptionalText(change.FieldName),
                OldValueJson = NormalizeOptionalText(change.OldValueJson),
                NewValueJson = NormalizeOptionalText(change.NewValueJson),
                EffectiveFromLabel = NormalizeOptionalText(change.EffectiveFromLabel),
                EffectiveToLabel = NormalizeOptionalText(change.EffectiveToLabel),
                EffectiveFromValue = change.EffectiveFromValue,
                EffectiveToValue = change.EffectiveToValue,
                Notes = NormalizeOptionalText(change.Notes),
                SortOrder = index,
            })
            .ToList();

    private static TimelineDto ToTimelineDto(Timeline timeline) =>
        new(timeline.Id, timeline.ProjectId, timeline.Name, timeline.Mode, timeline.IsDefault, timeline.UpdatedAt);

    private static TimelineLayoutDto ToLayoutDto(
        int timelineId,
        DateTime generatedAt,
        IReadOnlyList<TimelineLayoutItem> items) =>
        new(
            timelineId,
            timelineId,
            LayoutAlgorithmVersion,
            false,
            generatedAt,
            items
                .OrderBy(item => item.Layer)
                .ThenBy(item => item.Lane)
                .ThenBy(item => item.X)
                .Select(item => new TimelineLayoutItemDto(
                    item.Id,
                    item.TimelineEventId,
                    item.X,
                    item.Y,
                    item.Width,
                    item.Height,
                    item.Lane,
                    item.Layer,
                    item.IsPinned))
                .ToList());

    private static List<TimelineLayoutItem> ToPinnedLayoutItems(IReadOnlyList<TimelineLayoutItemDto> items) =>
        items
            .Where(item => item.IsPinned)
            .Select(item => new TimelineLayoutItem
            {
                Id = item.Id,
                TimelineEventId = item.TimelineEventId,
                X = item.X,
                Y = item.Y,
                Width = item.Width,
                Height = item.Height,
                Lane = item.Lane,
                Layer = item.Layer,
                IsPinned = item.IsPinned,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            })
            .ToList();

    private static TimelineEventDto ToDto(TimelineEvent timelineEvent) =>
        new(
            timelineEvent.Id,
            timelineEvent.TimelineId,
            timelineEvent.ParentEventId,
            timelineEvent.Title,
            timelineEvent.EventType,
            timelineEvent.Description,
            timelineEvent.StartLabel,
            timelineEvent.EndLabel,
            timelineEvent.StartValue,
            timelineEvent.EndValue,
            timelineEvent.Category,
            timelineEvent.Color,
            timelineEvent.ImagePath,
            timelineEvent.GalleryImages
                .OrderBy(image => image.SortOrder)
                .ThenBy(image => image.Id)
                .Select(image => new TimelineEventGalleryImageDto(
                    image.Id,
                    image.ImagePath,
                    image.Caption,
                    image.SortOrder))
                .ToList(),
            timelineEvent.Participants
                .OrderBy(participant => participant.SortOrder)
                .Select(participant => new TimelineParticipantDto(
                    participant.Id,
                    participant.TargetType,
                    participant.TargetId,
                    participant.Role))
                .ToList(),
            timelineEvent.Changes
                .OrderBy(change => change.SortOrder)
                .Select(change => new TimelineChangeDto(
                    change.Id,
                    change.ChangeType,
                    change.TargetType,
                    change.TargetId,
                    change.FieldKey,
                    change.FieldName,
                    change.OldValueJson,
                    change.NewValueJson,
                    change.EffectiveFromLabel,
                    change.EffectiveToLabel,
                    change.EffectiveFromValue,
                    change.EffectiveToValue,
                    change.Notes))
                .ToList());

    private static TimelineEventLinkDto ToLinkDto(TimelineEventLink link) =>
        new(
            link.Id,
            link.SourceEventId,
            link.TargetEventId,
            link.LinkType,
            link.Description);

    private static string NormalizeTimelineMode(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? "chapters" : normalizedValue;
    }

    private static string NormalizeEventType(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? "point" : normalizedValue;
    }

    private static string NormalizeEventLinkType(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? "related" : normalizedValue;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? null : normalizedValue;
    }

}

public record TimelineSettingsRequest(string? Name, string? Mode);

public record TimelineDto(
    int Id,
    int ProjectId,
    string Name,
    string Mode,
    bool IsDefault,
    DateTime UpdatedAt);

public record TimelineLayoutDto(
    int Id,
    int TimelineId,
    string AlgorithmVersion,
    bool IsStale,
    DateTime GeneratedAt,
    IReadOnlyList<TimelineLayoutItemDto> Items);

public record TimelineLayoutItemDto(
    int Id,
    int TimelineEventId,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height,
    int Lane,
    int Layer,
    bool IsPinned);

public sealed class TimelineLayoutRulesConfig
{
    public int SchemaVersion { get; set; } = 1;
    public int ProjectId { get; set; }
    public string AlgorithmVersion { get; set; } = string.Empty;
    public string CoordinateStorage { get; set; } = "project-file";
    public string LayoutStateFile { get; set; } = "timeline-layout.json";
    public string RuleSourceFile { get; set; } = "timeline-layout-rules.json";
    public string DirectionPolicy { get; set; } = "left-to-right";
    public string EventSidePolicy { get; set; } = "above-axis-only";
    public string DurationPriorityPolicy { get; set; } = "durations-before-independent-points";
    public string DurationOverlapPolicy { get; set; } = "later-overlap-goes-one-lane-up";
    public string DurationPointPolicy { get; set; } = "part-of-points-inside-duration-point-band";
    public string IndependentPointPolicy { get; set; } = "outside-overlapping-duration-goes-one-lane-up";
    public string HorizontalLinkPolicy { get; set; } = "linked-points-share-lane-when-possible";
    public string VerticalLinkPolicy { get; set; } = "simultaneous-links-protect-their-vertical-corridor";
    public string PointLabelPolicy { get; set; } = "hidden";
    public string EraInteractionPolicy { get; set; } = "background-only";
    public decimal AxisY { get; set; } = 640;
    public decimal EraY { get; set; } = 40;
    public decimal EraHeight { get; set; } = 620;
    public decimal ChapterY { get; set; } = 36;
    public decimal ChapterHeight { get; set; } = 720;
    public decimal DurationTitleHeight { get; set; } = 34;
    public decimal DurationPointBandHeight { get; set; } = 30;
    public decimal DurationGap { get; set; } = 18;
    public decimal LaneStep { get; set; } = 96;
    public decimal PointSize { get; set; } = 22;
    public decimal MinimumDurationWidth { get; set; } = 140;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public decimal DurationHeight => DurationTitleHeight + DurationPointBandHeight;

    public bool IsCurrent(int projectId, string algorithmVersion) =>
        SchemaVersion == 1 &&
        ProjectId == projectId &&
        AlgorithmVersion.Equals(algorithmVersion, StringComparison.Ordinal) &&
        CoordinateStorage.Equals("project-file", StringComparison.OrdinalIgnoreCase);

    public static TimelineLayoutRulesConfig Default(int projectId, string algorithmVersion) =>
        new()
        {
            ProjectId = projectId,
            AlgorithmVersion = algorithmVersion,
            UpdatedAt = DateTime.UtcNow,
        };
}

public record TimelineLayoutStateConfig(
    int SchemaVersion,
    int ProjectId,
    int Id,
    int TimelineId,
    string AlgorithmVersion,
    bool IsStale,
    DateTime GeneratedAt,
    IReadOnlyList<TimelineLayoutItemDto> Items);

public record TimelineEventRequest(
    string Title,
    string? EventType,
    int? ParentEventId,
    string? Description,
    string? StartLabel,
    string? EndLabel,
    decimal? StartValue,
    decimal? EndValue,
    string? Category,
    string? Color,
    string? ImagePath,
    IReadOnlyList<TimelineParticipantRequest> Participants,
    IReadOnlyList<TimelineChangeRequest> Changes);

public record TimelineEventGalleryImageRequest(string ImagePath, string? Caption);

public record TimelineTargetRequest(string TargetType, int TargetId);

public record TimelineParticipantRequest(
    string TargetType,
    int TargetId,
    string? Role) : TimelineTargetRequest(TargetType, TargetId);

public record TimelineChangeRequest(
    string ChangeType,
    string TargetType,
    int TargetId,
    string? FieldKey,
    string? FieldName,
    string? OldValueJson,
    string? NewValueJson,
    string? EffectiveFromLabel,
    string? EffectiveToLabel,
    decimal? EffectiveFromValue,
    decimal? EffectiveToValue,
    string? Notes) : TimelineTargetRequest(TargetType, TargetId);

public record TimelineEventLinkRequest(
    int SourceEventId,
    int TargetEventId,
    string? LinkType,
    string? Description);

public record TimelineEventDto(
    int Id,
    int TimelineId,
    int? ParentEventId,
    string Title,
    string EventType,
    string? Description,
    string? StartLabel,
    string? EndLabel,
    decimal? StartValue,
    decimal? EndValue,
    string? Category,
    string? Color,
    string? ImagePath,
    IReadOnlyList<TimelineEventGalleryImageDto> GalleryImages,
    IReadOnlyList<TimelineParticipantDto> Participants,
    IReadOnlyList<TimelineChangeDto> Changes);

public record TimelineEventGalleryImageDto(int Id, string ImagePath, string? Caption, int SortOrder);

public record TimelineParticipantDto(
    int Id,
    string TargetType,
    int TargetId,
    string? Role);

public record TimelineChangeDto(
    int Id,
    string ChangeType,
    string TargetType,
    int TargetId,
    string? FieldKey,
    string? FieldName,
    string? OldValueJson,
    string? NewValueJson,
    string? EffectiveFromLabel,
    string? EffectiveToLabel,
    decimal? EffectiveFromValue,
    decimal? EffectiveToValue,
    string? Notes);

public record TimelineEventLinkDto(
    int Id,
    int SourceEventId,
    int TargetEventId,
    string LinkType,
    string? Description);
