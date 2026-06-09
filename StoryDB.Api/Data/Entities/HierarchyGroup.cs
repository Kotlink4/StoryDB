namespace StoryDB.Api.Data.Entities;

public class HierarchyGroup
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Project? Project { get; set; }
    public List<HierarchyNode> Nodes { get; set; } = [];
}
