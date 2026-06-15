namespace StoryDB.Api.Data.Entities;

public class RelationGraphLayout
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int? OwnerUserId { get; set; }
    public required string GraphKey { get; set; }
    public required string AlgorithmVersion { get; set; }
    public bool IsDefault { get; set; }
    public bool IsStale { get; set; }
    public DateTime GeneratedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Project? Project { get; set; }
    public AppUser? OwnerUser { get; set; }
    public List<RelationGraphLayoutItem> Items { get; set; } = [];
}
