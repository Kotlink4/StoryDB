namespace StoryDB.Api.Data.Entities;

public class TimelineParticipant
{
    public int Id { get; set; }
    public int TimelineEventId { get; set; }
    public required string TargetType { get; set; }
    public int TargetId { get; set; }
    public string? Role { get; set; }
    public int SortOrder { get; set; }

    public TimelineEvent? TimelineEvent { get; set; }
}
