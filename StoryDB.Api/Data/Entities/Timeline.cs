namespace StoryDB.Api.Data.Entities;

public class Timeline
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public required string Name { get; set; }
    public required string Mode { get; set; }
    public bool IsDefault { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Project? Project { get; set; }
    public List<TimelineEvent> Events { get; set; } = [];
    public List<TimelineEventLink> EventLinks { get; set; } = [];
    public List<TimelineLayout> Layouts { get; set; } = [];
}
