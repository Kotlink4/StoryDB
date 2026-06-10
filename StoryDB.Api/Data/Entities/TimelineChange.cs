namespace StoryDB.Api.Data.Entities;

public class TimelineChange
{
    public int Id { get; set; }
    public int TimelineEventId { get; set; }
    public required string ChangeType { get; set; }
    public required string TargetType { get; set; }
    public int TargetId { get; set; }
    public string? FieldKey { get; set; }
    public string? FieldName { get; set; }
    public string? OldValueJson { get; set; }
    public string? NewValueJson { get; set; }
    public string? EffectiveFromLabel { get; set; }
    public string? EffectiveToLabel { get; set; }
    public decimal? EffectiveFromValue { get; set; }
    public decimal? EffectiveToValue { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }

    public TimelineEvent? TimelineEvent { get; set; }
}
