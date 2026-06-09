namespace StoryDB.Api.Data.Entities;

public class CatalogEntryHierarchyLink
{
    public int ParentEntryId { get; set; }
    public int ChildEntryId { get; set; }

    public CatalogEntry? ParentEntry { get; set; }
    public CatalogEntry? ChildEntry { get; set; }
}
