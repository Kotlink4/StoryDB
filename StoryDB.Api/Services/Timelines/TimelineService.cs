using StoryDB.Api.Contracts.Timelines;
using StoryDB.Api.Data;
using StoryDB.Api.Validation;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace StoryDB.Api.Services.Timelines;

public partial class TimelineService : ITimelineService
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

    private readonly StoryDbContext dbContext;
    private readonly IWebHostEnvironment environment;
    private readonly TimelineEventValidator timelineEventValidator;

    public TimelineService(
        StoryDbContext dbContext,
        IWebHostEnvironment environment,
        TimelineEventValidator timelineEventValidator)
    {
        this.dbContext = dbContext;
        this.environment = environment;
        this.timelineEventValidator = timelineEventValidator;
    }
}
