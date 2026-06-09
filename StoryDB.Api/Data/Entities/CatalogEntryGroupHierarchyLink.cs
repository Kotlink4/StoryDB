namespace StoryDB.Api.Data.Entities;

public class CatalogEntryGroupHierarchyLink
{
    public int ParentGroupId { get; set; }
    public int ChildGroupId { get; set; }

    public CatalogEntryGroup? ParentGroup { get; set; }
    public CatalogEntryGroup? ChildGroup { get; set; }
}
