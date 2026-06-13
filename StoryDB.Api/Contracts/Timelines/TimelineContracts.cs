using System.Text.Json.Serialization;

namespace StoryDB.Api.Contracts.Timelines;

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


