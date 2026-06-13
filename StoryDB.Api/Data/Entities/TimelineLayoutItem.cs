namespace StoryDB.Api.Data.Entities;

public class TimelineLayoutItem
{
    public int Id { get; set; }
    public int TimelineLayoutId { get; set; }
    public int TimelineEventId { get; set; }
    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public int Lane { get; set; }
    public int Layer { get; set; }
    public bool IsPinned { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public TimelineLayout? TimelineLayout { get; set; }
    public TimelineEvent? TimelineEvent { get; set; }
}
