namespace StoryDB.Api.Data.Entities;

public class HierarchyLink
{
    public int ParentNodeId { get; set; }
    public int ChildNodeId { get; set; }

    public HierarchyNode? ParentNode { get; set; }
    public HierarchyNode? ChildNode { get; set; }
}
