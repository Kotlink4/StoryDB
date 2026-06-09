namespace StoryDB.Api.Data.Entities;

public class HierarchyNode
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public HierarchyGroup? Group { get; set; }
    public List<HierarchyLink> ParentLinks { get; set; } = [];
    public List<HierarchyLink> ChildLinks { get; set; } = [];
}
