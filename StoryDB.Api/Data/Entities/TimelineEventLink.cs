namespace StoryDB.Api.Data.Entities;

public class TimelineEventLink
{
    public int Id { get; set; }
    public int TimelineId { get; set; }
    public int SourceEventId { get; set; }
    public int TargetEventId { get; set; }
    public required string LinkType { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Timeline? Timeline { get; set; }
    public TimelineEvent? SourceEvent { get; set; }
    public TimelineEvent? TargetEvent { get; set; }
}
