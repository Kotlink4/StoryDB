namespace StoryDB.Api.Data.Entities;

public class TimelineLayout
{
    public int Id { get; set; }
    public int TimelineId { get; set; }
    public int? OwnerUserId { get; set; }
    public required string AlgorithmVersion { get; set; }
    public bool IsDefault { get; set; }
    public bool IsStale { get; set; }
    public DateTime GeneratedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Timeline? Timeline { get; set; }
    public AppUser? OwnerUser { get; set; }
    public List<TimelineLayoutItem> Items { get; set; } = [];
}
