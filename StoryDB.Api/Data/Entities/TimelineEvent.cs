namespace StoryDB.Api.Data.Entities;

public class TimelineEvent
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public string? StartLabel { get; set; }
    public string? EndLabel { get; set; }
    public decimal? StartValue { get; set; }
    public decimal? EndValue { get; set; }
    public string? Category { get; set; }
    public string? Color { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Project? Project { get; set; }
    public List<TimelineParticipant> Participants { get; set; } = [];
    public List<TimelineChange> Changes { get; set; } = [];
}
