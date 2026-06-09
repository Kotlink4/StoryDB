namespace StoryDB.Api.Data.Entities;

public class StoryObjectHierarchySelection
{
    public int StoryObjectId { get; set; }
    public int HierarchyGroupId { get; set; }
    public int HierarchyNodeId { get; set; }
    public int SortOrder { get; set; }

    public StoryObject? StoryObject { get; set; }
    public HierarchyGroup? HierarchyGroup { get; set; }
    public HierarchyNode? HierarchyNode { get; set; }
}
